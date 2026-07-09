import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { polylineLengthPixels, pixelsToFeet, applyWasteFactor } from "../lib/compute.js";

export const router = Router();

router.get("/", (req, res) => {
  const { captureId } = req.query;
  if (!captureId) return res.status(400).json({ error: "captureId required" });
  const rows = db.prepare("SELECT * FROM annotations WHERE capture_id = ? ORDER BY created_at").all(captureId);
  res.json(rows.map(parseRow));
});

router.post("/", (req, res) => {
  const { sessionId, captureId, itemType, room, kind, points, confidence, status } = req.body;
  if (!sessionId || !captureId || !itemType || !points) {
    return res.status(400).json({ error: "sessionId, captureId, itemType, points required" });
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO annotations (id, session_id, capture_id, item_type, room, kind, points, confidence, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    sessionId,
    captureId,
    itemType,
    room || null,
    kind || "point",
    JSON.stringify(points),
    confidence ?? null,
    status || "proposed"
  );
  res.json(parseRow(db.prepare("SELECT * FROM annotations WHERE id = ?").get(id)));
});

// Corrections: drag/delete/add all flow through here; caller also logs a delta separately.
router.patch("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM annotations WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });
  const { points, status, room, itemType, captureId } = req.body;
  let lengthFt = existing.length_ft;
  if (points) {
    const capture = db.prepare("SELECT * FROM captures WHERE id = ?").get(captureId || existing.capture_id);
    if (capture?.pixels_per_foot) {
      const px = polylineLengthPixels(points);
      lengthFt = applyWasteFactor(pixelsToFeet(px, capture.pixels_per_foot));
    }
  }
  db.prepare(
    `UPDATE annotations SET
       points = COALESCE(?, points),
       status = COALESCE(?, status),
       room = COALESCE(?, room),
       item_type = COALESCE(?, item_type),
       length_ft = COALESCE(?, length_ft),
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    points ? JSON.stringify(points) : null,
    status || null,
    room ?? null,
    itemType || null,
    lengthFt ?? null,
    req.params.id
  );
  res.json(parseRow(db.prepare("SELECT * FROM annotations WHERE id = ?").get(req.params.id)));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM annotations WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

function parseRow(row) {
  if (!row) return row;
  return { ...row, points: JSON.parse(row.points) };
}
