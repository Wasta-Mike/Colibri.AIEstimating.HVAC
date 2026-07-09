// All arithmetic lives here. Models never produce or restate these figures.

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function extendRow(row) {
  const qty = Number(row.qty) || 0;
  const material = Number(row.material_cost) || 0;
  const labor = Number(row.labor_cost) || 0;
  return round2(qty * (material + labor));
}

export function sectionSubtotals(rows) {
  const bySection = {};
  for (const row of rows) {
    const ext = extendRow(row);
    bySection[row.section] = round2((bySection[row.section] || 0) + ext);
  }
  return bySection;
}

export function grandTotal(rows) {
  return round2(rows.reduce((sum, row) => sum + extendRow(row), 0));
}

export function withOverheadProfit(total, pct) {
  const p = Number(pct) || 0;
  const opAmount = round2(total * (p / 100));
  return { opAmount, grandTotal: round2(total + opAmount) };
}

// pixels-per-foot = reference pixels / reference feet
export function pixelsPerFoot(referencePixels, referenceFeet) {
  if (!referenceFeet || referenceFeet <= 0) return null;
  return referencePixels / referenceFeet;
}

export function pixelsToFeet(pixelLength, pxPerFoot) {
  if (!pxPerFoot || pxPerFoot <= 0) return null;
  return round2(pixelLength / pxPerFoot);
}

export function polylineLengthPixels(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

export function applyWasteFactor(lengthFt, wastePct = 10) {
  return round2(lengthFt * (1 + wastePct / 100));
}

// Self-check: overall W x D vs stated floor area (pilot example flagged a misread string)
export function areaSelfCheck(widthFt, depthFt, statedAreaSf, tolerancePct = 10) {
  const computed = round2(widthFt * depthFt);
  if (!statedAreaSf) return { computed, statedAreaSf: null, mismatch: false };
  const diffPct = Math.abs(computed - statedAreaSf) / statedAreaSf * 100;
  return {
    computed,
    statedAreaSf,
    diffPct: round2(diffPct),
    mismatch: diffPct > tolerancePct,
  };
}
