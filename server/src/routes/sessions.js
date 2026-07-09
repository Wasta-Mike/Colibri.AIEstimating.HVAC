import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export const router = Router();

// Stub login + session setup: no real auth, just creates a session row.
router.post("/", (req, res) => {
  const { email, cohortCode, trade, projectType, scope } = req.body;
  if (!email || !cohortCode) {
    return res.status(400).json({ error: "email and cohortCode are required" });
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO sessions (id, email, cohort_code, trade, project_type, scope)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, email, cohortCode, trade || "HVAC", projectType || null, scope || null);
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
  res.json(session);
});

router.get("/:id", (req, res) => {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
  if (!session) return res.status(404).json({ error: "not found" });
  res.json(session);
});

router.patch("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });
  const { scope, projectType, currentStepId } = req.body;
  db.prepare(
    `UPDATE sessions SET scope = COALESCE(?, scope), project_type = COALESCE(?, project_type),
     current_step_id = COALESCE(?, current_step_id) WHERE id = ?`
  ).run(scope ?? null, projectType ?? null, currentStepId ?? null, req.params.id);
  res.json(db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id));
});
