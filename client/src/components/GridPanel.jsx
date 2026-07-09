import { useCallback, useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { api } from "../api.js";
import { GRID_SECTIONS } from "../data/workflowSteps.js";

function StatusCell({ data, onVerify }) {
  if (data.status === "locked") return <span className="status-badge locked">locked</span>;
  if (data.status === "verified")
    return <span className="status-badge verified">verified</span>;
  return (
    <button className="status-badge proposed as-button" onClick={() => onVerify(data)}>
      proposed — click to verify
    </button>
  );
}

function ActionsCell({ data, onDelete }) {
  if (data.status === "locked") return null;
  return (
    <button className="link-btn small" onClick={() => onDelete(data)}>
      remove
    </button>
  );
}

export default function GridPanel({ session }) {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [opPct, setOpPct] = useState(15);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [r, t] = await Promise.all([api.listGrid(session.id), api.gridTotals(session.id, opPct)]);
    setRows(r);
    setTotals(t);
  }, [session.id, opPct]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function verifyRow(row) {
    await api.patchGridRow(row.id, { status: "verified" });
    refresh();
  }
  async function deleteRow(row) {
    await api.deleteGridRow(row.id);
    refresh();
  }
  async function addRow(section) {
    await api.createGridRow({ sessionId: session.id, section, item: "New item", qty: 1, unit: "ea" });
    refresh();
  }
  async function onCellValueChanged(section, params) {
    const field = params.colDef.field;
    const map = { material_cost: "materialCost", labor_cost: "laborCost" };
    const patchField = map[field] || field;
    await api.patchGridRow(params.data.id, { [patchField]: params.newValue });
    refresh();
  }
  async function lockSection(section) {
    setBusy(true);
    try {
      await api.lockGrid(session.id, section);
      refresh();
    } finally {
      setBusy(false);
    }
  }
  async function autofillSection(section) {
    setBusy(true);
    try {
      const sectionRowIds = rows.filter((r) => r.section === section).map((r) => r.id);
      await api.autofillPricing({ sessionId: session.id, rowIds: sectionRowIds });
      refresh();
    } finally {
      setBusy(false);
    }
  }

  const columnDefs = useMemo(
    () => (section) => [
      { field: "item", headerName: "Item", editable: (p) => p.data.status !== "locked", flex: 2 },
      { field: "qty", headerName: "Qty", editable: (p) => p.data.status !== "locked", width: 80 },
      { field: "unit", headerName: "Unit", editable: (p) => p.data.status !== "locked", width: 80 },
      {
        field: "material_cost",
        headerName: "Material $",
        editable: (p) => p.data.status !== "locked",
        width: 110,
        valueFormatter: (p) => Number(p.value || 0).toFixed(2),
      },
      {
        field: "labor_cost",
        headerName: "Labor $",
        editable: (p) => p.data.status !== "locked",
        width: 100,
        valueFormatter: (p) => Number(p.value || 0).toFixed(2),
      },
      {
        field: "extended",
        headerName: "Extended $",
        editable: false,
        width: 110,
        valueFormatter: (p) => Number(p.value || 0).toFixed(2),
      },
      { field: "source", headerName: "Source", editable: (p) => p.data.status !== "locked", flex: 1 },
      {
        field: "status",
        headerName: "Status",
        width: 190,
        cellRenderer: (p) => <StatusCell data={p.data} onVerify={verifyRow} />,
      },
      {
        field: "_actions",
        headerName: "",
        width: 90,
        cellRenderer: (p) => <ActionsCell data={p.data} onDelete={deleteRow} />,
      },
    ],
    [rows]
  );

  return (
    <div className="grid-panel">
      <h2>Takeoff grid</h2>
      {GRID_SECTIONS.map((section) => {
        const sectionRows = rows.filter((r) => r.section === section);
        return (
          <div key={section} className="grid-section">
            <div className="grid-section-header">
              <h3>{section}</h3>
              <div className="grid-section-actions">
                <button className="link-btn small" onClick={() => addRow(section)}>
                  + add row
                </button>
                <button className="link-btn small" onClick={() => autofillSection(section)} disabled={busy}>
                  auto-fill pricing
                </button>
                <button className="link-btn small" onClick={() => lockSection(section)} disabled={busy}>
                  lock verified rows
                </button>
              </div>
            </div>
            <div className="ag-theme-alpine" style={{ height: Math.max(120, sectionRows.length * 42 + 50), width: "100%" }}>
              <AgGridReact
                rowData={sectionRows}
                columnDefs={columnDefs(section)}
                getRowId={(p) => p.data.id}
                onCellValueChanged={(params) => onCellValueChanged(section, params)}
                domLayout="normal"
                animateRows={false}
              />
            </div>
          </div>
        );
      })}

      {totals && (
        <div className="grid-totals">
          <div className="totals-row">
            {Object.entries(totals.subtotals).map(([section, amount]) => (
              <span key={section}>
                {section}: <strong>${amount.toFixed(2)}</strong>
              </span>
            ))}
          </div>
          <div className="totals-row">
            <span>Verified total: <strong>${totals.total.toFixed(2)}</strong></span>
            <label>
              O&P %
              <input
                type="number"
                value={opPct}
                onChange={(e) => setOpPct(Number(e.target.value))}
                onBlur={refresh}
                style={{ width: 60, marginLeft: 6 }}
              />
            </label>
            <span>O&P (placeholder): <strong>${totals.opAmount.toFixed(2)}</strong></span>
            <span className="final-total">Final total: <strong>${totals.finalTotal.toFixed(2)}</strong></span>
          </div>
        </div>
      )}

      <ProposalExport session={session} opPct={opPct} rows={rows} />
    </div>
  );
}

function ProposalExport({ session, opPct, rows }) {
  const [inclusions, setInclusions] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const lockedCount = rows.filter((r) => r.status === "locked").length;

  async function generatePdf() {
    setBusy(true);
    setError(null);
    try {
      const blob = await api.generateProposalPdf(session.id, {
        opPct,
        inclusions: inclusions.split("\n").map((s) => s.trim()).filter(Boolean),
        exclusions: exclusions.split("\n").map((s) => s.trim()).filter(Boolean),
        qualifications: qualifications.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-${session.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="proposal-export">
      <h3>Proposal &amp; export</h3>
      <p className="muted small">
        The priced table in the PDF regenerates from locked rows only ({lockedCount} locked). Lock a
        section's verified rows above before generating. Inclusions/exclusions/qualifications: paste from
        the proposal step's chat draft, one per line — each must trace to a source.
      </p>
      <label>
        Inclusions (one per line)
        <textarea rows={3} value={inclusions} onChange={(e) => setInclusions(e.target.value)} />
      </label>
      <label>
        Exclusions (one per line)
        <textarea rows={3} value={exclusions} onChange={(e) => setExclusions(e.target.value)} />
      </label>
      <label>
        Qualifications (one per line)
        <textarea rows={3} value={qualifications} onChange={(e) => setQualifications(e.target.value)} />
      </label>
      {error && <div className="error-text">{error}</div>}
      <div className="proposal-export-actions">
        <a className="link-btn" href={api.exportXlsxUrl(session.id)}>
          Download XLSX
        </a>
        <button className="primary-btn" onClick={generatePdf} disabled={busy || lockedCount === 0}>
          {busy ? "Generating…" : "Generate proposal PDF"}
        </button>
      </div>
    </div>
  );
}
