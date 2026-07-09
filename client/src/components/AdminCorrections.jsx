import { useEffect, useState } from "react";
import { api } from "../api.js";

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(typeof row[h] === "object" ? JSON.stringify(row[h]) : row[h])).join(","));
  }
  return lines.join("\n");
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminCorrections() {
  const [deltas, setDeltas] = useState([]);
  const [helpEvents, setHelpEvents] = useState([]);
  const [stepFilter, setStepFilter] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("");

  function refresh() {
    api.listDeltas({ stepId: stepFilter || undefined, itemType: itemTypeFilter || undefined }).then(setDeltas);
    api.listHelpEvents().then(setHelpEvents);
  }

  useEffect(() => {
    refresh();
  }, [stepFilter, itemTypeFilter]);

  const stepOptions = Array.from(new Set(deltas.map((d) => d.step_id).filter(Boolean)));
  const itemTypeOptions = Array.from(new Set(deltas.map((d) => d.item_type).filter(Boolean)));

  return (
    <div className="admin-page">
      <h2>Correction dataset (monthly skill-improvement input)</h2>
      <p className="muted">
        Every learner correction and help-button event, across all sessions in this cohort's database. No
        auto-retraining — this feeds human prompt/skill revision.
      </p>

      <div className="admin-filters">
        <label>
          Step
          <select value={stepFilter} onChange={(e) => setStepFilter(e.target.value)}>
            <option value="">All</option>
            {stepOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Item type
          <select value={itemTypeFilter} onChange={(e) => setItemTypeFilter(e.target.value)}>
            <option value="">All</option>
            {itemTypeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button className="link-btn" onClick={() => download("corrections.json", JSON.stringify(deltas, null, 2), "application/json")}>
          Export JSON
        </button>
        <button className="link-btn" onClick={() => download("corrections.csv", toCsv(deltas), "text/csv")}>
          Export CSV
        </button>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Cohort</th>
            <th>Email</th>
            <th>Step</th>
            <th>Item type</th>
            <th>Error type</th>
            <th>Proposed</th>
            <th>Corrected</th>
          </tr>
        </thead>
        <tbody>
          {deltas.map((d) => (
            <tr key={d.id}>
              <td>{d.timestamp}</td>
              <td>{d.cohort_code}</td>
              <td>{d.email}</td>
              <td>{d.step_id}</td>
              <td>{d.item_type}</td>
              <td>{d.error_type}</td>
              <td className="mono-cell">{JSON.stringify(d.proposed)}</td>
              <td className="mono-cell">{JSON.stringify(d.corrected)}</td>
            </tr>
          ))}
          {deltas.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">
                No corrections logged yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Help-button events</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Cohort</th>
            <th>Email</th>
            <th>Step</th>
          </tr>
        </thead>
        <tbody>
          {helpEvents.map((h) => (
            <tr key={h.id}>
              <td>{h.timestamp}</td>
              <td>{h.cohort_code}</td>
              <td>{h.email}</td>
              <td>{h.step_id}</td>
            </tr>
          ))}
          {helpEvents.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No help events logged yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
