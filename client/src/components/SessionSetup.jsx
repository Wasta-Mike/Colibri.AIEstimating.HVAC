import { useState } from "react";
import { api } from "../api.js";

export default function SessionSetup({ login, onComplete }) {
  const [projectType, setProjectType] = useState("");
  const [scope, setScope] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await api.createSession({
        email: login.email,
        cohortCode: login.cohortCode,
        trade: "HVAC",
        projectType,
        scope,
      });
      onComplete(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="centered-card">
      <form className="card" onSubmit={submit}>
        <h1>Session setup</h1>
        <p className="muted">
          Trade is fixed to HVAC for v1. This is Step 0 of the skill — set scope from the GC's bid
          request before opening any drawings.
        </p>
        <label>
          Trade
          <input type="text" value="HVAC" disabled />
        </label>
        <label>
          Project type
          <select value={projectType} onChange={(e) => setProjectType(e.target.value)} required>
            <option value="" disabled>
              Select…
            </option>
            <option value="New construction — residential">New construction — residential</option>
            <option value="Replacement / retrofit — residential">Replacement / retrofit — residential</option>
            <option value="Light commercial">Light commercial</option>
          </select>
        </label>
        <label>
          Scope confirmation (what package are you bidding?)
          <textarea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="e.g. HVAC air-side only, per GC's bid invite. No plumbing/hydronics."
            rows={4}
            required
          />
        </label>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" className="primary-btn" disabled={busy}>
          {busy ? "Starting…" : "Start session"}
        </button>
      </form>
    </div>
  );
}
