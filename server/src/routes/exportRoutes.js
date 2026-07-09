import { Router } from "express";
import * as XLSX from "xlsx";
import { db } from "../db.js";
import { extendRow, sectionSubtotals, grandTotal, withOverheadProfit } from "../lib/compute.js";
import { generateProposalPdf } from "../lib/pdfGen.js";

export const router = Router();

function getRows(sessionId) {
  return db
    .prepare("SELECT * FROM grid_rows WHERE session_id = ? ORDER BY section, created_at")
    .all(sessionId)
    .map((r) => ({ ...r, extended: extendRow(r) }));
}

router.get("/xlsx/:sessionId", (req, res) => {
  const rows = getRows(req.params.sessionId);
  const sheetRows = rows.map((r) => ({
    Section: r.section,
    Item: r.item,
    Qty: r.qty,
    Unit: r.unit,
    "Material $": r.material_cost,
    "Labor $": r.labor_cost,
    "Extended $": r.extended,
    Source: r.source,
    Status: r.status,
  }));
  const subtotals = sectionSubtotals(rows);
  for (const [section, amount] of Object.entries(subtotals)) {
    sheetRows.push({ Section: `${section} subtotal`, Extended$: amount });
  }
  sheetRows.push({ Section: "GRAND TOTAL", "Extended $": grandTotal(rows) });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  XLSX.utils.book_append_sheet(wb, ws, "Takeoff");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="takeoff-${req.params.sessionId}.xlsx"`);
  res.send(buf);
});

router.post("/proposal-pdf/:sessionId", async (req, res) => {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "session not found" });
  const rows = getRows(req.params.sessionId).filter((r) => r.status === "locked");
  if (!rows.length) {
    return res.status(400).json({ error: "no locked rows — lock the verified takeoff before generating a proposal" });
  }
  const rowsBySection = {};
  for (const r of rows) {
    rowsBySection[r.section] = rowsBySection[r.section] || [];
    rowsBySection[r.section].push(r);
  }
  const subtotals = sectionSubtotals(rows);
  const total = grandTotal(rows);
  const opPct = Number(req.body.opPct) || 15;
  const { opAmount, grandTotal: finalTotal } = withOverheadProfit(total, opPct);

  const pdfBuffer = await generateProposalPdf({
    session,
    rowsBySection,
    subtotals,
    total,
    opPct,
    opAmount,
    finalTotal,
    qualifications: req.body.qualifications || [],
    inclusions: req.body.inclusions || [],
    exclusions: req.body.exclusions || [],
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="proposal-${req.params.sessionId}.pdf"`);
  res.send(pdfBuffer);
});
