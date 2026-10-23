import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  api, ApiError, Beneficiary, FieldKey, FIELD_KEYS, Observations, Proposal, VisitView,
  ifMatch, logout, newIdempotencyKey,
} from "../api";
import { FIELD_LABEL, ObservationList, STATUS_LABEL, formatVisitTime, useActor } from "../fields";
import { blobToBase64, startWavRecording, WavRecorder } from "../wav";

const MAX_SECONDS = 30;

// Fixed clarification catalog (contracts ClarificationKey). Model text is never shown.
const CLARIFY: Record<string, string> = {
  ASK_FOLLOWUP_DATE: "The follow-up day wasn't clear. Enter the date, or leave it marked unclear.",
  ASK_BP_UNIT_OR_PAIR: "Blood pressure needs both numbers, top and bottom, in mmHg.",
  ASK_HB_UNIT: "Check that hemoglobin is in g/dL.",
  ASK_WHICH_READING_CURRENT: "More than one reading was heard. Enter the one taken today.",
};

type Draft = { obs: Observations; note: string };

export default function Visit() {
  const actor = useActor("worker");
  const navigate = useNavigate();
  const { visitId = "" } = useParams();
  const [visit, setVisit] = useState<VisitView | null>(null);
  const [who, setWho] = useState<Beneficiary | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [acks, setAcks] = useState<FieldKey[]>([]);
  const [error, setError] = useState<{ text: string; stale?: boolean } | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [sttMode, setSttMode] = useState<string | null>(null);
  const submitKey = useRef<{ rev: number; key: string } | null>(null);

  const load = useCallback(async (resetDraft: boolean) => {
    const v = await api<VisitView>("GET", `/visits/${visitId}`);
    setVisit(v);
    if (resetDraft && v.currentRevisionData) {
      setDraft({ obs: v.currentRevisionData.observations, note: v.currentRevisionData.note ?? "" });
      setDirty(false);
      setAcks([]);
    }
  }, [visitId]);

  useEffect(() => {
    if (!actor) return;
    load(true).catch((e) => setError({ text: e instanceof ApiError && e.status === 404 ? "This visit doesn't exist or isn't assigned to you." : e.message }));
    fetch("/health").then((r) => r.json()).then((h) => setSttMode(h.stt), () => {});
  }, [actor, load]);

  useEffect(() => {
    if (!visit) return;
    api<{ beneficiaries: Beneficiary[] }>("GET", "/beneficiaries?limit=50")
      .then((r) => setWho(r.beneficiaries.find((b) => b.id === visit.beneficiaryId) ?? null), () => {});
  }, [visit?.beneficiaryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every mutation goes through here: errors keep the on-page edits.
  async function run(label: string, fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setStatus(label);
    try {
      await fn();
    } catch (e) {
      const stale = e instanceof ApiError && e.code === "STALE_REVISION";
      setError({ text: stale ? "This visit changed since you opened it. Reload to see the latest version; your unsaved edits stay on screen until you do." : (e as Error).message, stale });
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  if (!actor) return null;
  const rev = visit?.currentRevisionData;
  const saved = rev?.observations;
  const unresolved = saved ? FIELD_KEYS.filter((k) => saved[k].status === "unknown") : [];
  const confirmed = visit?.state === "draft" && visit.confirmedRevision === visit.currentRevision;

  const header = (
    <header className="topbar">
      <Link className="brand" to="/visits/new">SakhiLine</Link>
      <span className="who">Worker <button className="linkbtn" onClick={() => logout().then(() => navigate("/sign-in"))}>Sign out</button></span>
    </header>
  );

  if (!visit || !rev || !draft) {
    return <main className="shell">{header}{error ? <div className="notice error" role="alert">{error.text}</div> : <p aria-live="polite">Loading visit…</p>}</main>;
  }

  const save = () => run("Saving…", async () => {
    const o = draft.obs;
    if (o.bloodPressure.status === "recorded" && !(o.bloodPressure.systolic >= 1 && o.bloodPressure.diastolic >= 1)) throw new Error("Enter both blood pressure numbers, or change its status.");
    if (o.hemoglobin.status === "recorded" && !/^\d{1,2}(\.\d{1,2})?$/.test(o.hemoglobin.value)) throw new Error("Enter hemoglobin as a number like 9 or 9.5, or change its status.");
    if (o.ttDose.status === "recorded" && !o.ttDose.text.trim()) throw new Error("Write what was said about the TT injection, or change its status.");
    if (o.followUpDate.status === "recorded" && !o.followUpDate.date) throw new Error("Pick a follow-up date, or change its status.");
    await api("PATCH", `/visits/${visit.id}/draft`, {
      headers: ifMatch(visit.id, visit.currentRevision),
      body: { visitAt: rev.visitAt, visitTimezone: rev.visitTimezone, observations: draft.obs, note: draft.note || undefined, transcript: rev.transcript ?? undefined },
    });
    await load(true);
    setProposal(null);
  });

  const accept = () => run("Adding proposed values…", async () => {
    if (!proposal) return;
    const fields = FIELD_KEYS.filter((k) => proposal.observations[k].status !== "not_mentioned");
    if (fields.length === 0) throw new Error("Nothing was heard for any field. Type the values instead.");
    await api("POST", `/visits/${visit.id}/proposals/${proposal.proposalId}/accept`, { headers: ifMatch(visit.id, visit.currentRevision), body: { fields } });
    setProposal(null);
    await load(true);
  });

  const confirm = () => run("Confirming…", async () => {
    await api("POST", `/visits/${visit.id}/confirm`, {
      headers: ifMatch(visit.id, visit.currentRevision),
      body: { revision: visit.currentRevision, contentHash: rev.contentHash, unresolvedAcknowledged: acks },
    });
    await load(false);
  });

  const submit = () => run("Submitting…", async () => {
    if (submitKey.current?.rev !== visit.currentRevision) submitKey.current = { rev: visit.currentRevision, key: newIdempotencyKey() };
    await api("POST", `/visits/${visit.id}/submit`, {
      headers: { ...ifMatch(visit.id, visit.currentRevision), "Idempotency-Key": submitKey.current.key },
      body: { revision: visit.currentRevision },
    });
    await load(false);
  });

  const reopen = () => run("Reopening…", async () => {
    await api("POST", `/visits/${visit.id}/reopen`, { headers: ifMatch(visit.id, visit.currentRevision) });
    await load(true);
  });

  const edit = (key: FieldKey, value: Observations[FieldKey]) => {
    setDraft({ ...draft, obs: { ...draft.obs, [key]: value } });
    setDirty(true);
  };

  return (
    <main className="shell">
      {header}
      <h1>{who ? <>{who.displayName} <span className="ref mono">{who.reference}</span></> : "Visit"}</h1>
      <p className="lede">Visit on {formatVisitTime(rev.visitAt, rev.visitTimezone)}. Version {visit.currentRevision}.</p>

      <div aria-live="polite" className="sr-only">{status}</div>
      {busy && <p aria-hidden="true" className="hint">{status}</p>}
      {error && (
        <div className="notice error" role="alert">
          {error.text}
          {error.stale && <div className="actions"><button className="secondary" onClick={() => run("Reloading…", () => load(true))}>Reload visit</button></div>}
        </div>
      )}

      {visit.state === "submitted" && (
        <div className="notice ok" role="status">
          <strong className="title">Visit submitted successfully</strong>
          Saved on the server as version {visit.currentRevision} and waiting for supervisor review. Visit ID <span className="mono">{visit.id.slice(0, 8)}</span>.
          <div className="actions"><Link className="button" to="/visits/new">Start another visit</Link></div>
        </div>
      )}
      {visit.state === "approved" && <div className="notice ok" role="status"><strong className="title">Approved by your supervisor</strong>This record is final and can't be edited.</div>}
      {visit.state === "returned" && (
        <div className="notice error" role="status">
          <strong className="title">Returned by your supervisor</strong>
          {visit.latestReturnReason ? <>Reason: “{visit.latestReturnReason}”</> : "Check the values, correct them and send again."}
          <div className="actions"><button disabled={busy} onClick={reopen}>Reopen to correct</button></div>
        </div>
      )}

      {visit.state !== "draft" ? (
        <section className="panel">
          <h2 style={{ marginTop: 0 }}>Submitted values</h2>
          <ObservationList obs={rev.observations} caption="Submitted values" />
          {rev.note && <p><strong>Note:</strong> {rev.note}</p>}
        </section>
      ) : (
        <>
          {!confirmed && (
            <Recorder
              disabled={busy || dirty}
              sttMode={sttMode}
              onClip={(wav) => run("Transcribing…", async () => {
                const r = await api<{ proposal: Proposal }>("POST", `/visits/${visit.id}/extractions`, { body: { audio: await blobToBase64(wav), mimeType: "audio/wav" } });
                setProposal(r.proposal);
              })}
              onError={(text) => setError({ text })}
              onStart={() => setError(null)}
            />
          )}
          {dirty && !confirmed && <p className="hint">Save or undo your typed changes before recording again.</p>}

          {proposal && (
            <section className="panel" aria-labelledby="proposal-h">
              <h2 id="proposal-h" style={{ marginTop: 0 }}>Proposal extracted</h2>
              <p className="hint">What was heard. Nothing is saved until you add it.</p>
              <p className="transcript">“{proposal.transcript || "(no speech heard)"}”</p>
              <ObservationList obs={proposal.observations} caption="Proposed values" />
              {proposal.issues.map((i) => <div key={i.field + i.code} className="notice info">{FIELD_LABEL[i.field]}: {CLARIFY[i.clarificationKey] ?? "Check this value."}</div>)}
              <div className="actions">
                <button disabled={busy || dirty} onClick={accept}>Accept proposed values</button>
                <button className="secondary" disabled={busy} onClick={() => setProposal(null)}>Discard</button>
              </div>
            </section>
          )}

          {!confirmed ? (
            <>
              <h2>Values for this visit</h2>
              <FieldEditor draft={draft} onChange={edit} onNote={(note) => { setDraft({ ...draft, note }); setDirty(true); }} />
              <div className="actions">
                <button disabled={busy || !dirty} onClick={save}>Save changes</button>
                <button className="secondary" disabled={busy || !dirty} onClick={() => load(true)}>Undo changes</button>
              </div>

              <h2>Confirm</h2>
              <p>Check every value above. Confirming locks in version {visit.currentRevision}; any later edit needs a new confirmation.</p>
              {unresolved.map((k) => (
                <label key={k} className="check">
                  <input type="checkbox" checked={acks.includes(k)} onChange={(e) => setAcks(e.target.checked ? [...acks, k] : acks.filter((a) => a !== k))} />
                  I couldn't get a clear value for {FIELD_LABEL[k].toLowerCase()}.
                </label>
              ))}
              <div className="actions">
                <button disabled={busy || dirty || unresolved.some((k) => !acks.includes(k))} onClick={confirm}>Confirm</button>
              </div>
              {dirty && <p className="hint">Save your changes first.</p>}
            </>
          ) : (
            <section className="panel" aria-labelledby="snap-h">
              <h2 id="snap-h" style={{ marginTop: 0 }}>Confirmed snapshot, version {visit.currentRevision}</h2>
              <ObservationList obs={rev.observations} caption="Confirmed values" />
              {rev.note && <p><strong>Note:</strong> {rev.note}</p>}
              <p className="hint">Submitting sends exactly these values to your supervisor.</p>
              <div className="actions">
                <button disabled={busy} onClick={submit}>Submit</button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Recorder({ disabled, sttMode, onClip, onError, onStart }: { disabled: boolean; sttMode: string | null; onClip: (wav: Blob) => void; onError: (t: string) => void; onStart: () => void }) {
  const rec = useRef<WavRecorder | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => () => rec.current?.cancel(), []);
  useEffect(() => {
    if (seconds === null) return;
    if (seconds >= MAX_SECONDS) { void stop(); return; }
    const t = setTimeout(() => setSeconds((s) => (s === null ? null : s + 1)), 1000);
    return () => clearTimeout(t);
  }, [seconds]); // eslint-disable-line react-hooks/exhaustive-deps

  async function begin() {
    if (!navigator.mediaDevices?.getUserMedia) return onError("This browser can't record audio. Type the values below instead.");
    try {
      rec.current = await startWavRecording();
      onStart();
      setSeconds(0);
    } catch (e) {
      onError((e as Error).name === "NotAllowedError"
        ? "Microphone access is blocked. Allow it in your browser settings, or type the values below."
        : "Couldn't start the microphone. Type the values below instead.");
    }
  }

  async function stop() {
    const r = rec.current;
    rec.current = null;
    const took = seconds ?? 0;
    setSeconds(null);
    if (!r) return;
    const wav = await r.stop();
    if (took < 1) return onError("That recording was too short. Hold on a little longer before pressing Stop.");
    onClip(wav);
  }

  const live = seconds !== null;
  const t = `0:${String(seconds ?? 0).padStart(2, "0")}`;
  return (
    <section className="recorder" aria-label="Voice recording">
      <button className={`record-btn${live ? " live" : ""}`} disabled={disabled && !live} onClick={live ? stop : begin} aria-label={live ? `Stop, ${seconds} seconds recorded` : "Record"}>
        <span>{live ? "Stop" : "Record"}</span>
        <span className="time" aria-hidden="true">{live ? t : `${MAX_SECONDS}s max`}</span>
      </button>
      <p className="hint" style={{ textAlign: "center" }}>
        Say the readings in your own words. Needs an internet connection.
        {sttMode === "mock" && <><br /><strong>Demo mode:</strong> speech is not sent anywhere; a fixed sample sentence is used.</>}
      </p>
    </section>
  );
}

function FieldEditor({ draft, onChange, onNote }: { draft: Draft; onChange: (k: FieldKey, v: Observations[FieldKey]) => void; onNote: (n: string) => void }) {
  const manual = { type: "manual" } as const;
  const statusSelect = (k: FieldKey, blank: Observations[FieldKey]) => (
    <>
      <label htmlFor={`${k}-status`}>{FIELD_LABEL[k]}</label>
      <select
        id={`${k}-status`}
        value={draft.obs[k].status}
        onChange={(e) => onChange(k, e.target.value === "recorded" ? blank : ({ status: e.target.value } as Observations[FieldKey]))}
      >
        {(["recorded", "not_measured", "unknown", "not_mentioned"] as const).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
    </>
  );
  const o = draft.obs;
  const num = (v: string) => (v === "" ? NaN : Number(v));

  return (
    <div>
      <fieldset className="fieldset">
        {statusSelect("bloodPressure", { status: "recorded", systolic: NaN, diastolic: NaN, unit: "mmHg", source: manual })}
        {o.bloodPressure.status === "recorded" && (
          <div className="pair">
            <div>
              <label htmlFor="bp-sys">Blood Pressure Systolic <span className="hint">(top, mmHg)</span></label>
              <input id="bp-sys" inputMode="numeric" value={Number.isNaN(o.bloodPressure.systolic) ? "" : o.bloodPressure.systolic}
                onChange={(e) => onChange("bloodPressure", { ...(o.bloodPressure as Extract<Observations["bloodPressure"], { status: "recorded" }>), systolic: num(e.target.value), source: manual })} />
            </div>
            <div>
              <label htmlFor="bp-dia">Blood Pressure Diastolic <span className="hint">(bottom, mmHg)</span></label>
              <input id="bp-dia" inputMode="numeric" value={Number.isNaN(o.bloodPressure.diastolic) ? "" : o.bloodPressure.diastolic}
                onChange={(e) => onChange("bloodPressure", { ...(o.bloodPressure as Extract<Observations["bloodPressure"], { status: "recorded" }>), diastolic: num(e.target.value), source: manual })} />
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="fieldset">
        {statusSelect("hemoglobin", { status: "recorded", value: "", unit: "g/dL", source: manual })}
        {o.hemoglobin.status === "recorded" && (
          <>
            <label htmlFor="hb">Hemoglobin value <span className="hint">(g/dL, e.g. 9.5)</span></label>
            <input id="hb" inputMode="decimal" value={o.hemoglobin.value} onChange={(e) => onChange("hemoglobin", { status: "recorded", value: e.target.value, unit: "g/dL", source: manual })} />
          </>
        )}
      </fieldset>

      <fieldset className="fieldset">
        {statusSelect("ttDose", { status: "recorded", text: "", source: manual })}
        {o.ttDose.status === "recorded" && (
          <>
            <label htmlFor="tt">What was said about the TT injection</label>
            <input id="tt" maxLength={120} value={o.ttDose.text} onChange={(e) => onChange("ttDose", { status: "recorded", text: e.target.value, source: manual })} />
          </>
        )}
      </fieldset>

      <fieldset className="fieldset">
        {statusSelect("followUpDate", { status: "recorded", date: "", source: manual })}
        {o.followUpDate.status === "recorded" && (
          <>
            <label htmlFor="fu">Follow-up date</label>
            <input id="fu" type="date" value={o.followUpDate.date} onChange={(e) => onChange("followUpDate", { status: "recorded", date: e.target.value, source: manual })} />
          </>
        )}
      </fieldset>

      <label htmlFor="note">Note <span className="hint">(optional, up to 2000 characters)</span></label>
      <textarea id="note" maxLength={2000} value={draft.note} onChange={(e) => onNote(e.target.value)} />
    </div>
  );
}
