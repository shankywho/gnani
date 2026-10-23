import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { fixtureLogin, loadSession } from "../api";

// Synthetic seed accounts. Fixture sign-in only works when the API runs with APP_MODE=local.
const DEMO_ACCOUNTS = [
  { id: "00000000-0000-0000-0000-000000000010", name: "Worker A", role: "ASHA worker" },
  { id: "00000000-0000-0000-0000-000000000011", name: "Worker B", role: "ASHA worker" },
  { id: "00000000-0000-0000-0000-000000000020", name: "Supervisor A", role: "Supervisor" },
  { id: "00000000-0000-0000-0000-000000000021", name: "Supervisor B", role: "Supervisor" },
];

export default function SignIn() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"local" | "live" | "down" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (role: string) => navigate(role === "supervisor" ? "/review" : "/visits/new", { replace: true });

  useEffect(() => {
    fetch("/health").then((r) => r.json()).then((h) => setMode(h.mode), () => setMode("down"));
    loadSession().then((a) => a && go(a.role));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function signIn(id: string) {
    setBusy(true);
    setError(null);
    try {
      go((await fixtureLogin(id)).role);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar"><span className="brand">SakhiLine</span></header>
      <h1>Sign in</h1>
      <p className="lede">Record a home visit by voice or by typing, then send it to your supervisor for review.</p>

      {mode === "down" && <div className="notice error" role="alert"><strong className="title">Can't reach the server.</strong>Start the API with <code>npm run dev:api</code> and reload.</div>}
      {mode === "live" && <div className="notice info">Live sign-in isn't set up yet. Demo accounts only work in local mode.</div>}
      {error && <div className="notice error" role="alert"><strong className="title">Sign-in failed.</strong>{error}</div>}

      {mode === "local" && (
        <>
          <h2>Demo accounts</h2>
          <p className="hint">Invented people and data, for local testing only.</p>
          <div className="actions" style={{ flexDirection: "column" }}>
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.id} className={a.role === "Supervisor" ? "secondary" : undefined} disabled={busy} onClick={() => signIn(a.id)}>
                Sign in as {a.name} <span className="hint">({a.role})</span>
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
