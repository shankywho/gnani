import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, Beneficiary, Revision, logout } from "../api";
import { formatVisitTime, useActor } from "../fields";

export type QueueItem = { id: string; currentRevision: number; updatedAt: string; beneficiary: Beneficiary; revisions: Revision[] };

export default function ReviewQueue() {
  const actor = useActor("supervisor");
  const navigate = useNavigate();
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [next, setNext] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  async function load(cursor?: string) {
    setError(null);
    try {
      const r = await api<{ reviews: QueueItem[]; nextCursor?: string }>("GET", `/reviews?limit=20${cursor ? `&cursor=${cursor}` : ""}`);
      setItems((prev) => (cursor ? [...(prev ?? []), ...r.reviews] : r.reviews));
      setNext(r.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => { if (actor) void load(); }, [actor]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!actor) return null;
  const open = (v: QueueItem) => navigate(`/review/${v.id}`, { state: { beneficiary: v.beneficiary } });

  return (
    <main className="shell">
      <header className="topbar">
        <span className="brand">SakhiLine</span>
        <span className="who">Supervisor <button className="linkbtn" onClick={() => logout().then(() => navigate("/sign-in"))}>Sign out</button></span>
      </header>
      <h1>Visits to review</h1>
      <p className="lede">Submitted by your assigned workers, newest first.</p>

      {error && <div className="notice error" role="alert">{error} <button className="linkbtn" onClick={() => load()}>Try again</button></div>}
      {items === null && !error && <p aria-live="polite">Loading…</p>}
      {items?.length === 0 && <div className="notice info">Nothing waiting. New submissions appear here.</div>}

      {items && items.length > 0 && (
        <table className="queue">
          <thead>
            <tr><th scope="col">Beneficiary</th><th scope="col">Visit</th><th scope="col">Version</th></tr>
          </thead>
          <tbody>
            {items.map((v) => {
              const rev = v.revisions[0];
              return (
                <tr key={v.id} onClick={() => open(v)}>
                  <td>
                    <Link to={`/review/${v.id}`} state={{ beneficiary: v.beneficiary }}>{v.beneficiary.displayName}</Link>
                    <div className="ref mono">{v.beneficiary.reference}</div>
                  </td>
                  <td>{rev ? formatVisitTime(rev.visitAt, rev.visitTimezone) : "—"}</td>
                  <td className="mono">{v.currentRevision}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {next && <div className="actions"><button className="secondary" onClick={() => load(next)}>Show more</button></div>}
    </main>
  );
}
