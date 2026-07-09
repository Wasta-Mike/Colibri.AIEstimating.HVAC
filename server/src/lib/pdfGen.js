import PDFDocument from "pdfkit";

// Regenerates the proposal PDF from locked data every time — never retyped.
export function generateProposalPdf({ session, rowsBySection, subtotals, total, opPct, opAmount, finalTotal, qualifications, inclusions, exclusions }) {
  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fontSize(20).text("HVAC Proposal", { align: "center" });
  doc.moveDown();
  doc.fontSize(10);
  doc.text("From: [Contractor Name] — [License #]");
  doc.text(`To: [General Contractor] — Project: ${session.project_type || "[Project]"}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}    Validity: 30 days from date above`);
  doc.moveDown();

  doc.fontSize(14).text("Scope of Work");
  doc.fontSize(10).text(
    session.scope || "Scope as confirmed in session setup (see qualifications for assumptions)."
  );
  doc.moveDown();

  doc.fontSize(14).text("Base Bid");
  doc.moveDown(0.5);
  for (const [section, rows] of Object.entries(rowsBySection)) {
    doc.fontSize(12).text(section, { underline: true });
    doc.fontSize(9);
    for (const row of rows) {
      doc.text(
        `${row.item}   qty ${row.qty} ${row.unit || ""}   $${row.extended.toFixed(2)}   [source: ${row.source || "n/a"}]`
      );
    }
    doc.fontSize(10).text(`Subtotal — ${section}: $${(subtotals[section] || 0).toFixed(2)}`, {
      align: "right",
    });
    doc.moveDown(0.5);
  }
  doc.fontSize(11).text(`Base bid total: $${total.toFixed(2)}`, { align: "right" });
  doc.text(`Overhead & profit (${opPct}%, placeholder): $${opAmount.toFixed(2)}`, { align: "right" });
  doc.fontSize(13).text(`Proposal total: $${finalTotal.toFixed(2)}`, { align: "right" });
  doc.moveDown();

  const section = (title, items, fallback) => {
    doc.fontSize(14).text(title);
    doc.fontSize(9);
    if (items && items.length) {
      items.forEach((i) => doc.text(`• ${i}`));
    } else {
      doc.text(fallback);
    }
    doc.moveDown();
  };

  section("Inclusions", inclusions, "None recorded.");
  section("Exclusions", exclusions, "None recorded.");
  section("Qualifications", qualifications, "None recorded.");

  doc.moveDown();
  doc.fontSize(14).text("Signatures");
  doc.moveDown(2);
  doc.fontSize(10).text("_______________________________          _______________________________");
  doc.text("Contractor                                                   General Contractor");

  doc.end();
  return done;
}
