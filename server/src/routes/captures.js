import { Router } from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db.js";
import { pixelsPerFoot, areaSelfCheck } from "../lib/compute.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const capturesDir = path.join(__dirname, "..", "..", "data", "captures");

export const router = Router();

// Captures arrive as a base64 PNG data URL rendered client-side from pdf.js canvas.
router.post("/", (req, res) => {
  const { sessionId, label, pageNumber, dataUrl, width, height, captureType } = req.body;
  if (!sessionId || !label || !dataUrl) {
    return res.status(400).json({ error: "sessionId, label, dataUrl required" });
  }
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) return res.status(400).json({ error: "dataUrl must be a base64 image" });
  const id = randomUUID();
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const filename = `${id}.${ext}`;
  fs.writeFileSync(path.join(capturesDir, filename), Buffer.from(match[2], "base64"));
  db.prepare(
    `INSERT INTO captures (id, session_id, label, page_number, image_path, width, height, capture_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, sessionId, label, pageNumber || null, filename, width || null, height || null, captureType === "full-page" ? "full-page" : "region");
  res.json(db.prepare("SELECT * FROM captures WHERE id = ?").get(id));
});

router.get("/", (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  const rows = db.prepare("SELECT * FROM captures WHERE session_id = ? ORDER BY created_at").all(sessionId);
  res.json(rows);
});

router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM captures WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "not found" });
  res.json(row);
});

// Calibration: learner draws a reference line + enters its real length -> pixels-per-foot.
router.post("/:id/calibrate", (req, res) => {
  const capture = db.prepare("SELECT * FROM captures WHERE id = ?").get(req.params.id);
  if (!capture) return res.status(404).json({ error: "not found" });
  const { referencePixels, referenceFeet, overallWidthFt, overallDepthFt, statedAreaSf } = req.body;
  const ppf = pixelsPerFoot(referencePixels, referenceFeet);
  if (!ppf) return res.status(400).json({ error: "referenceFeet must be > 0" });

  let selfCheck = null;
  if (overallWidthFt && overallDepthFt) {
    selfCheck = areaSelfCheck(Number(overallWidthFt), Number(overallDepthFt), statedAreaSf ? Number(statedAreaSf) : null);
  }

  const note = selfCheck
    ? `ref ${referencePixels}px = ${referenceFeet}ft; area self-check: computed ${selfCheck.computed} SF` +
      (selfCheck.statedAreaSf ? ` vs stated ${selfCheck.statedAreaSf} SF (${selfCheck.mismatch ? "MISMATCH" : "ok"})` : "")
    : `ref ${referencePixels}px = ${referenceFeet}ft`;

  db.prepare("UPDATE captures SET pixels_per_foot = ?, calibration_note = ? WHERE id = ?").run(
    ppf,
    note,
    req.params.id
  );
  res.json({ ...db.prepare("SELECT * FROM captures WHERE id = ?").get(req.params.id), selfCheck });
});
