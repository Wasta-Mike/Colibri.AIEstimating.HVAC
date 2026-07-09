import { Router } from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db.js";
import { referenceForStep, coreSkillText } from "../lib/skill.js";
import { callModel, imageBlockFromDataUrl, extractJsonBlock } from "../lib/anthropic.js";
import { sectionSubtotals, grandTotal } from "../lib/compute.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const capturesDir = path.join(__dirname, "..", "..", "data", "captures");

export const router = Router();

function mimeFor(filename) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return ext === "jpg" ? "image/jpeg" : `image/${ext}`;
}

function lockedStateSummary(sessionId) {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  const rows = db.prepare("SELECT * FROM grid_rows WHERE session_id = ?").all(sessionId);
  const verified = rows.filter((r) => r.status !== "proposed");
  const subtotals = sectionSubtotals(verified);
  const total = grandTotal(verified);
  const captures = db
    .prepare("SELECT id, label, capture_type, pixels_per_foot FROM captures WHERE session_id = ?")
    .all(sessionId);
  return {
    scope: session?.scope || "(not yet confirmed)",
    projectType: session?.project_type || "(not yet set)",
    verifiedRowCount: verified.length,
    proposedRowCount: rows.length - verified.length,
    sectionSubtotals: subtotals,
    verifiedTotal: total,
    captures: captures.map((c) => ({
      id: c.id,
      label: c.label,
      type: c.capture_type,
      calibrated: !!c.pixels_per_foot,
    })),
  };
}

router.post("/", async (req, res) => {
  try {
    const { sessionId, stepId, message, captureIds = [], taskTypeOverride, isHelp } = req.body;
    if (!sessionId || !stepId) {
      return res.status(400).json({ error: "sessionId, stepId required" });
    }

    if (isHelp) {
      db.prepare("INSERT INTO help_events (id, session_id, step_id) VALUES (?, ?, ?)").run(
        randomUUID(),
        sessionId,
        stepId
      );
    }

    const captures = captureIds.map((id) => db.prepare("SELECT * FROM captures WHERE id = ?").get(id)).filter(Boolean);

    // Hard rule from piloting: counting must use zoomed-region captures, never full-sheet.
    if (stepId === "counting" && captures.some((c) => c.capture_type === "full-page")) {
      const warning =
        "This capture is a full sheet. Full-sheet views downscale symbols into ambiguity — counting from " +
        "one produced a hedged range in piloting instead of a committed count. Please use the capture tool " +
        "to drag a zoomed region around the area you want counted, then try again.";
      db.prepare(
        "INSERT INTO messages (id, session_id, step_id, role, content, task_type) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(randomUUID(), sessionId, stepId, "assistant", warning, "warning");
      return res.json({ text: warning, warning: true, model: null, annotations: null });
    }

    const taskType = taskTypeOverride || (captures.length > 0 ? "vision" : "text");

    const state = lockedStateSummary(sessionId);
    const system = [
      "You are the assistant inside a training app that teaches HVAC takeoff and estimating.",
      "Follow this skill exactly:",
      coreSkillText(),
      "--- Phase reference for the current step ---",
      referenceForStep(stepId),
      "--- Non-negotiable app rules ---",
      "1. PROPOSE, then the human verifies, then proceed. Never advance past a verify gate yourself.",
      "2. You have no memory between calls. The locked state below is the complete durable record — treat it as ground truth, not your own prior turns.",
      "3. Never perform or restate arithmetic (totals, extensions, unit conversions). The app computes all figures in code. Refer to figures the app gives you; do not recompute them yourself.",
      "4. When proposing counted point items (diffusers, returns, exhaust, thermostats, equipment) from a capture, end your reply with a fenced ```json code block: an array of {id, type, room, x, y, confidence}, x/y normalized 0-1 to the capture image.",
      "5. When proposing a duct run (linear item), use kind 'polyline' and an ordered list of {x,y} points instead of a single x/y.",
      `--- Locked session state (current step: ${stepId}) ---`,
      JSON.stringify(state, null, 2),
    ].join("\n\n");

    const contentBlocks = [{ type: "text", text: message || "(no message; see attached captures)" }];
    for (const capture of captures) {
      const filePath = path.join(capturesDir, capture.image_path);
      if (fs.existsSync(filePath)) {
        const base64 = fs.readFileSync(filePath).toString("base64");
        contentBlocks.push(imageBlockFromDataUrl(`data:${mimeFor(capture.image_path)};base64,${base64}`));
        contentBlocks.push({ type: "text", text: `[capture: ${capture.label}, id: ${capture.id}]` });
      }
    }

    db.prepare(
      "INSERT INTO messages (id, session_id, step_id, role, content, task_type) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(randomUUID(), sessionId, stepId, "user", message || "(captures attached)", taskType);

    const { text, model } = await callModel({
      taskType,
      system,
      messages: [{ role: "user", content: contentBlocks }],
    });

    db.prepare(
      "INSERT INTO messages (id, session_id, step_id, role, content, task_type) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(randomUUID(), sessionId, stepId, "assistant", text, taskType);

    let annotations = null;
    const parsed = extractJsonBlock(text);
    if (Array.isArray(parsed) && captures.length > 0) {
      const captureId = captures[0].id;
      annotations = parsed.map((item) => {
        const id = randomUUID();
        const kind = item.kind === "polyline" || Array.isArray(item.points) ? "polyline" : "point";
        const points = kind === "polyline" ? item.points : [{ x: item.x, y: item.y }];
        db.prepare(
          `INSERT INTO annotations (id, session_id, capture_id, item_type, room, kind, points, confidence, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'proposed')`
        ).run(id, sessionId, captureId, item.type || "unknown", item.room || null, kind, JSON.stringify(points), item.confidence ?? null);
        return { id, captureId, itemType: item.type, room: item.room, kind, points, confidence: item.confidence };
      });
    }

    res.json({ text, model, taskType, annotations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/messages", (req, res) => {
  const { sessionId, stepId } = req.query;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  const rows = stepId
    ? db
        .prepare("SELECT * FROM messages WHERE session_id = ? AND step_id = ? ORDER BY created_at")
        .all(sessionId, stepId)
    : db.prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at").all(sessionId);
  res.json(rows);
});
