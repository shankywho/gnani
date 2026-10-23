import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { api, ApiError, Beneficiary, VisitView, ifMatch, newIdempotencyKey } from "../api";
import { ObservationList, formatVisitTime, useActor } from "../fields";
import type { QueueItem } from "./ReviewQueue";

export default function ReviewVisit() {
  const actor = useActor("supervisor");
  const navigate = useNavigate();
  const { visitId = "" } = useParams();
  const location = useLocation() as { state?: { beneficiary?: Beneficiary } };
  const [who, setWho] = useState<Beneficiary | null>(location.state?.beneficiary ?? null);
  const [visit, setVisit] = useState<VisitView | null>(null);
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<"approved" | "returned" | null>(null);
  const [error, setError] = useState<{ text: string; stale?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const keys = useRef<Record<string, string>>({}); // one idempotency key per action+version, reused on retry

  const load = () =>
    api<VisitView>("GET", `/visits/${visitId}`).then(setVisit, (e) =>
      setError({ text: e instanceof ApiError && e.status === 404 ? "This visit doesn't exist or isn't assigned to you." : e.message })
    );

  useEffect(() => {
    if (!actor) return;
    void load();
    if (!who) {
      // Supervisors can't read the roster; the pending queue carries the beneficiary.
      api<{ reviews: QueueItem[] }>("GET", "/reviews?limit=50")
        .then((r) => setWho(r.reviews.find((v) => v.id === visitId)?.beneficiary ?? null), () => {});
    }
  }, [actor]); // eslint-disable-line react-hooks/exhaustive-deps

  async function review(action: "approve" | "return") {
    if (!visit) return;
    const rev = visit.currentRevision;
    const keyName = `${action}:${rev}`;
    keys.current[keyName] ??= newIdempotencyKey();
    setBusy(true);
    setError(null);
    try {
      await api("POST", `/visits/${visit.id}/reviews`, {
        headers: { ...ifMatch(visit.id, rev), "Idempotency-Key": keys.current[keyName]! },
        body: action === "approve" ? { action, revision: rev } : { action, revision: rev, reason: reason.trim() },
      });
      setDone(action === "approve" ? "approved" : "returned");
      await load();
    } catch (e) {
      const stale = e instanceof ApiError && e.code === "STALE_REVISION";
      setError({ text: stale ? "This visit was already reviewed or changed. Reload to see its current state." : (e as Error).message, stale });
    } finally {
      setBusy(false);
    }
  }

  if (!actor) return null;
  const rev = visit?.currentRevisionData;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" to="/review">SakhiLine</Link>
        <Link className="who" to="/review">Back to queue</Link>
      </header>
      <h1>{who ? <>{who.displayName} <span className="ref mono">{who.reference}</span></> : "Visit review"}</h1>

      {error && (
        <div className="notice error" role="alert">
          {error.text}
          {error.stale && <div className="actions"><button className="secondary" onClick={() => { setError(null); void load(); }}>Reload visit</button></div>}
        </div>
      )}
      {done === "approved" && <div className="notice ok" role="status"><strong className="title">Visit approved</strong>This version is now final.</div>}
      {done === "returned" && <div className="notice ok" role="status"><strong className="title">Visit returned to worker</strong>They will see your reason, correct the visit and send it again.</div>}

      {!visit || !rev ? (
        !error && <p aria-live="polite">Loading…</p>
      ) : (
        <>
          <p className="lede">Visit on {formatVisitTime(rev.visitAt, rev.visitTimezone)}.</p>
          <section className="panel" aria-labelledby="snap-h">
            <h2 id="snap-h" style={{ marginTop: 0 }}>Submitted revision snapshot, version {visit.currentRevision}</h2>
            <ObservationList obs={rev.observations} caption="Submitted values" />
            {rev.note && <p><strong>Worker's note:</strong> “{rev.note}”</p>}
            {rev.transcript && (
              <>
                <h3>What the worker said</h3>
                <p className="transcript">“{rev.transcript}”</p>
              </>
            )}
          </section>

          {visit.state === "submitted" ? (
            !returning ? (
              <div className="actions">
                <button disabled={busy} onClick={() => review("approve")}>Approve version {visit.currentRevision}</button>
                <button className="secondary" disabled={busy} onClick={() => setReturning(true)}>Return</button>
              </div>
            ) : (
              <div className="panel">
                <label htmlFor="reason">Why are you returning it? <span className="hint">The worker sees this.</span></label>
                <textarea id="reason" placeholder="Reason for return" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="actions">
                  <button disabled={busy || !reason.trim()} onClick={() => review("return")}>Confirm return</button>
                  <button className="secondary" disabled={busy} onClick={() => setReturning(false)}>Cancel</button>
                </div>
              </div>
            )
          ) : (
            !done && <div className="notice info">This visit is {visit.state === "draft" ? "being corrected by the worker" : visit.state}. Nothing to review.</div>
          )}
          {done && <div className="actions"><button className="secondary" onClick={() => navigate("/review")}>Back to queue</button></div>}
        </>
      )}
    </main>
  );
}
