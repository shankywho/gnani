import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { api, ApiError, Beneficiary, Observations, logout, newIdempotencyKey } from "../api";
import { ObservationList, formatVisitTime, useActor } from "../fields";

type HistoryVisit = { id: string; visitAt: string; visitTimezone: string; observations: Observations | null };

export default function NewVisit() {
  const actor = useActor("worker");
  const navigate = useNavigate();
  const [roster, setRoster] = useState<Beneficiary[] | null>(null);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Beneficiary | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryVisit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const createKey = useRef<string | null>(null); // same key on retry → one visit

  useEffect(() => {
    if (!actor) return;
    api<{ beneficiaries: Beneficiary[] }>("GET", "/beneficiaries?limit=50")
      .then((r) => setRoster(r.beneficiaries), (e) => setError(e.message));
  }, [actor]);

  async function select(b: Beneficiary) {
    setError(null);
    setBusy(true);
    try {
      const ctx = await api<{ contextId: string }>("POST", `/beneficiaries/${b.id}/context`);
      const h = await api<{ visits: HistoryVisit[] }>("GET", `/beneficiaries/${b.id}/history?contextId=${ctx.contextId}`);
      setChosen(b);
      setContextId(ctx.contextId);
      setHistory(h.visits);
      createKey.current = newIdempotencyKey();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (!contextId) return;
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ visit: { id: string } }>("POST", "/visits", {
        body: { contextId, visitAt: new Date().toISOString(), visitTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        headers: { "Idempotency-Key": createKey.current! },
      });
      navigate(`/visits/${r.visit.id}`);
    } catch (e) {
      const expired = e instanceof ApiError && e.status === 403;
      setError(expired ? "This confirmation expired after 10 minutes. Select the person again." : (e as Error).message);
      if (expired) reset();
      setBusy(false);
    }
  }

  function reset() {
    setChosen(null);
    setContextId(null);
    setHistory(null);
  }

  if (!actor) return null;
  const q = query.trim().toLowerCase();
  const matches = (roster ?? []).filter((b) => !q || b.displayName.toLowerCase().includes(q) || b.reference.toLowerCase().includes(q));
  const nameCount = (name: string) => (roster ?? []).filter((b) => b.displayName === name).length;

  return (
    <main className="shell">
      <header className="topbar">
        <span className="brand">SakhiLine</span>
        <span className="who">Worker <button className="linkbtn" onClick={() => logout().then(() => navigate("/sign-in"))}>Sign out</button></span>
      </header>

      {error && <div className="notice error" role="alert">{error}</div>}

      {!chosen ? (
        <>
          <h1>Who did you visit?</h1>
          <p className="lede">Only people assigned to you are listed. Check the reference number, not just the name.</p>
          <label htmlFor="search">Name or reference</label>
          <input id="search" placeholder="Search beneficiary" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          {roster === null && !error && <p aria-live="polite">Loading your list…</p>}
          {roster?.length === 0 && <p>No one is assigned to you yet. Ask your supervisor to assign beneficiaries.</p>}
          <ul className="roster">
            {matches.map((b) => (
              <li key={b.id}>
                <button disabled={busy} onClick={() => select(b)} aria-label={`Select ${b.displayName} (${b.reference})${nameCount(b.displayName) > 1 ? ", same name as another person" : ""}`}>
                  <span>{b.displayName}</span>
                  <span className="ref mono">{b.reference}</span>
                  {nameCount(b.displayName) > 1 && <span className="dup">Same name as another person. Check the reference.</span>}
                </button>
              </li>
            ))}
          </ul>
          {roster && roster.length > 0 && matches.length === 0 && <p>No match for “{query}”.</p>}
        </>
      ) : (
        <>
          <h1>{chosen.displayName} <span className="ref mono">{chosen.reference}</span></h1>
          {nameCount(chosen.displayName) > 1 && (
            <div className="notice info">You have more than one {chosen.displayName}. This is <strong className="mono">{chosen.reference}</strong>.</div>
          )}
          <h2>Previous visits</h2>
          <p className="hint">Earlier readings, for reference only. They are not copied into today's visit.</p>
          {history?.length === 0 && <p>No approved visits yet.</p>}
          {history?.map((v) => (
            <section key={v.id} className="panel history">
              <h3>Previous visit, {formatVisitTime(v.visitAt, v.visitTimezone)}</h3>
              {v.observations && <ObservationList obs={v.observations} caption="Previous visit readings" />}
            </section>
          ))}
          <div className="actions">
            <button disabled={busy} onClick={start}>Start visit for {chosen.displayName} ({chosen.reference})</button>
            <button className="secondary" disabled={busy} onClick={reset}>Choose someone else</button>
          </div>
        </>
      )}
    </main>
  );
}
