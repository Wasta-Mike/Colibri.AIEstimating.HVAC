import { useEffect, useState } from "react";
import { api } from "./api.js";
import Login from "./components/Login.jsx";
import SessionSetup from "./components/SessionSetup.jsx";
import Workspace from "./components/Workspace.jsx";
import AdminCorrections from "./components/AdminCorrections.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("app"); // 'app' | 'admin'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedId = localStorage.getItem("sessionId");
    if (!savedId) {
      setLoading(false);
      return;
    }
    api
      .getSession(savedId)
      .then(setSession)
      .catch(() => localStorage.removeItem("sessionId"))
      .finally(() => setLoading(false));
  }, []);

  function handleLogin(loginInfo) {
    setSession({ _login: loginInfo });
  }

  function handleSetupComplete(fullSession) {
    localStorage.setItem("sessionId", fullSession.id);
    setSession(fullSession);
  }

  function handleLogout() {
    localStorage.removeItem("sessionId");
    setSession(null);
  }

  if (loading) return <div className="centered-loading">Loading…</div>;

  return (
    <div className="app-root">
      <header className="top-bar">
        <div className="brand">HVAC Takeoff Trainer</div>
        {session?.id && (
          <div className="top-bar-right">
            <span className="cohort-pill">{session.cohort_code}</span>
            <button className="link-btn" onClick={() => setView(view === "admin" ? "app" : "admin")}>
              {view === "admin" ? "Back to workspace" : "Admin: corrections"}
            </button>
            <button className="link-btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </header>

      {!session && <Login onLogin={handleLogin} />}
      {session && !session.id && (
        <SessionSetup login={session._login} onComplete={handleSetupComplete} />
      )}
      {session?.id && view === "app" && <Workspace session={session} setSession={setSession} />}
      {session?.id && view === "admin" && <AdminCorrections />}
    </div>
  );
}
