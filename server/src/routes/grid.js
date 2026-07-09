import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { extendRow, sectionSubtotals, grandTotal, withOverheadProfit } from "../lib/compute.js";

export const router = Router();

function withExtension(row) {
  return { ...row, extended: extendRow(row) };
}

router.get("/", (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  const rows = db
    .prepare("SELECT * FROM grid_rows WHERE session_id = ? ORDER BY section, created_at")
    .all(sessionId)
    .map(withExtension);
  res.json(rows);
});

// AI proposes rows here (status='proposed'); learner verification flips status elsewhere.
router.post("/", (req, res) => {
  const { sessionId, section, item, qty, unit, materialCost, laborCost, source, status } = req.body;
  if (!sessionId || !section || !item) {
    return res.status(400).json({ error: "sessionId, section, item required" });
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO grid_rows (id, session_id, section, item, qty, unit, material_cost, labor_cost, source, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    sessionId,
    section,
    item,
    Number(qty) || 0,
    unit || null,
    Number(materialCost) || 0,
    Number(laborCost) || 0,
    source || null,
    status || "proposed"
  );
  res.json(withExtension(db.prepare("SELECT * FROM grid_rows WHERE id = ?").get(id)));
});

router.patch("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM grid_rows WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });
  if (existing.status === "locked" && req.body.status !== undefined && req.body.status !== "locked") {
    return res.status(409).json({ error: "row is locked; cannot change status" });
  }
  const fields = ["item", "qty", "unit", "materialCost", "laborCost", "source", "status", "section"];
  const dbFieldMap = {
    item: "item",
    qty: "qty",
    unit: "unit",
    materialCost: "material_cost",
    laborCost: "labor_cost",
    source: "source",
    status: "status",
    section: "section",
  };
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${dbFieldMap[f]} = ?`);
      values.push(req.body[f]);
    }
  }
  if (updates.length) {
    values.push(req.params.id);
    db.prepare(`UPDATE grid_rows SET ${updates.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(
      ...values
    );
  }
  res.json(withExtension(db.prepare("SELECT * FROM grid_rows WHERE id = ?").get(req.params.id)));
});

router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM grid_rows WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });
  if (existing.status === "locked") return res.status(409).json({ error: "row is locked" });
  db.prepare("DELETE FROM grid_rows WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Code-computed totals. Models never produce or restate these figures.
router.get("/totals/:sessionId", (req, res) => {
  const rows = db.prepare("SELECT * FROM grid_rows WHERE session_id = ?").all(req.params.sessionId);
  const opPct = Number(req.query.opPct) || 15;
  const subtotals = sectionSubtotals(rows);
  const total = grandTotal(rows);
  const { opAmount, grandTotal: finalTotal } = withOverheadProfit(total, opPct);
  res.json({ subtotals, total, opPct, opAmount, finalTotal });
});

// Lock all verified rows in a section (phase completion).
router.post("/lock/:sessionId", (req, res) => {
  const { section } = req.body;
  const stmt = section
    ? db.prepare(
        "UPDATE grid_rows SET status = 'locked', updated_at = datetime('now') WHERE session_id = ? AND section = ? AND status = 'verified'"
      )
    : db.prepare(
        "UPDATE grid_rows SET status = 'locked', updated_at = datetime('now') WHERE session_id = ? AND status = 'verified'"
      );
  const info = section ? stmt.run(req.params.sessionId, section) : stmt.run(req.params.sessionId);
  res.json({ locked: info.changes });
});
