import { Router } from "express";
import crypto from "node:crypto";
import { db } from "../db.js";
import { extendRow } from "../lib/compute.js";

export const router = Router();

// Stub for "web-search reference pricing" per the brief: no real web search,
// deterministic placeholder ranges by item-name hash, always clearly flagged.
// A real build would swap this for an actual pricing lookup.
const CATEGORY_RANGES = {
  equipment: { material: [1800, 6500], labor: [400, 1200] },
  "air distribution devices": { material: [12, 60], labor: [15, 45] },
  ductwork: { material: [3, 9], labor: [4, 10] },
  "scope items": { material: [50, 400], labor: [50, 300] },
};

function hashTo01(str) {
  const h = crypto.createHash("md5").update(str).digest();
  return h.readUInt32BE(0) / 0xffffffff;
}

function placeholderPrice(section, item) {
  const key = section.toLowerCase();
  const range = CATEGORY_RANGES[key] || CATEGORY_RANGES["scope items"];
  const t1 = hashTo01(`${item}-material`);
  const t2 = hashTo01(`${item}-labor`);
  const material = Math.round((range.material[0] + t1 * (range.material[1] - range.material[0])) * 100) / 100;
  const labor = Math.round((range.labor[0] + t2 * (range.labor[1] - range.labor[0])) * 100) / 100;
  return { material, labor };
}

router.post("/autofill", (req, res) => {
  const { sessionId, rowIds } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  const rows = rowIds && rowIds.length
    ? rowIds.map((id) => db.prepare("SELECT * FROM grid_rows WHERE id = ?").get(id)).filter(Boolean)
    : db.prepare("SELECT * FROM grid_rows WHERE session_id = ?").all(sessionId);

  const updated = [];
  for (const row of rows) {
    if (row.status === "locked") continue;
    const { material, labor } = placeholderPrice(row.section, row.item);
    db.prepare(
      "UPDATE grid_rows SET material_cost = ?, labor_cost = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(material, labor, row.id);
    const fresh = db.prepare("SELECT * FROM grid_rows WHERE id = ?").get(row.id);
    updated.push({ ...fresh, extended: extendRow(fresh), placeholder: true });
  }
  res.json({
    updated,
    note: "Placeholder reference prices — regional, dated, and homeowner-retail-skewed. Review and edit every line before pricing a live bid.",
  });
});
