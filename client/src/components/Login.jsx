import { useState } from "react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [cohortCode, setCohortCode] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!email || !cohortCode) return;
    onLogin({ email, cohortCode });
  }

  return (
    <div className="centered-card">
      <form className="card" onSubmit={submit}>
        <h1>Sign in</h1>
        <p className="muted">Prototype login — no password, just email + cohort code.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Cohort code
          <input
            type="text"
            value={cohortCode}
            onChange={(e) => setCohortCode(e.target.value)}
            placeholder="e.g. HVAC-2026-A"
            required
          />
        </label>
        <button type="submit" className="primary-btn">
          Continue
        </button>
      </form>
    </div>
  );
}
