import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export const router = Router();

// Every correction writes a delta record — this is the slow-loop dataset.
router.post("/deltas", (req, res) => {
  const { sessionId, stepId, captureId, itemType, proposed, corrected, errorType } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  const id = randomUUID();
  db.prepare(
    `INSERT INTO deltas (id, session_id, step_id, capture_id, item_type, proposed, corrected, error_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    sessionId,
    stepId || null,
    captureId || null,
    itemType || null,
    JSON.stringify(proposed ?? null),
    JSON.stringify(corrected ?? null),
    errorType || null
  );
  res.json(db.prepare("SELECT * FROM deltas WHERE id = ?").get(id));
});

router.post("/help-events", (req, res) => {
  const { sessionId, stepId } = req.body;
  if (!sessionId || !stepId) return res.status(400).json({ error: "sessionId, stepId required" });
  const id = randomUUID();
  db.prepare("INSERT INTO help_events (id, session_id, step_id) VALUES (?, ?, ?)").run(id, sessionId, stepId);
  res.json(db.prepare("SELECT * FROM help_events WHERE id = ?").get(id));
});

// Admin: filterable corrections table across all cohorts/sessions.
router.get("/deltas", (req, res) => {
  const { stepId, itemType } = req.query;
  let sql = `SELECT deltas.*, sessions.cohort_code, sessions.email
             FROM deltas JOIN sessions ON sessions.id = deltas.session_id WHERE 1=1`;
  const params = [];
  if (stepId) {
    sql += " AND deltas.step_id = ?";
    params.push(stepId);
  }
  if (itemType) {
    sql += " AND deltas.item_type = ?";
    params.push(itemType);
  }
  sql += " ORDER BY deltas.timestamp DESC";
  const rows = db.prepare(sql).all(...params);
  res.json(
    rows.map((r) => ({
      ...r,
      proposed: safeParse(r.proposed),
      corrected: safeParse(r.corrected),
    }))
  );
});

router.get("/help-events", (req, res) => {
  const rows = db
    .prepare(
      `SELECT help_events.*, sessions.cohort_code, sessions.email
       FROM help_events JOIN sessions ON sessions.id = help_events.session_id
       ORDER BY help_events.timestamp DESC`
    )
    .all();
  res.json(rows);
});

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
