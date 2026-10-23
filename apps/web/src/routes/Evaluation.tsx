import { Link } from "react-router";

type Summary = {
  expectedCount: number; suppliedCount: number; correct: number; wrong: number; missing: number; abstained: number;
  schemaFailed: number; providerFailed: number; accuracy: number; coverage: number; wrongRate: number;
  latencyP50Ms: number; latencyP95Ms: number; nLatency: number;
};
type Run = {
  runId: string; createdAt: string; mode: string; label: string; manifestHash: string; seed: number;
  scenarioCount: number; caseCount: number; codeVersion: string; scorerVersion: string; promptVersion: string; modelVersion: string;
  overall: Summary; conditions: Record<string, Summary>; bySplit: { dev: Summary; heldout: Summary };
  failures: { scenarioId: string; condition: string; field: string; classification: string }[];
  heard?: { scenarioId: string; transcript: string | null; sttMs: number; code?: string }[];
};

// The runner (eval/src/run.ts) writes these artifacts; no run yet → empty glob → honest empty state.
const found = import.meta.glob<Run>(["../../../../eval/runs/latest-live.json", "../../../../eval/runs/latest.json"], { eager: true, import: "default" });
const runs: Run[] = Object.values(found).sort((a) => (a.mode === "LIVE" ? -1 : 1));

// Validated categorical slots 1–4 (dataviz validator: CVD/normal-vision pass on light surface).
const SEGMENTS = [
  { key: "correct", label: "Correct", color: "#2a78d6", count: (s: Summary) => s.correct },
  { key: "wrong", label: "Wrong value", color: "#eb6834", count: (s: Summary) => s.wrong },
  { key: "missing", label: "Missed", color: "#1baf7a", count: (s: Summary) => s.missing },
  { key: "none", label: "Abstained or failed", color: "#eda100", count: (s: Summary) => s.abstained + s.schemaFailed + s.providerFailed },
] as const;

const CONDITION_LABEL: Record<string, string> = {
  clean: "Clean transcript",
  "noise-a": "Noise A: 10% words dropped",
  "noise-b": "Noise B: 25% dropped, digits swapped",
};
const FIELD_LABEL: Record<string, string> = { bloodPressure: "Blood pressure", hemoglobin: "Hemoglobin", ttDose: "TT injection", followUpDate: "Follow-up date" };
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function Evaluation() {
  return (
    <main className="shell wide">
      <header className="topbar">
        <Link className="brand" to="/sign-in">SakhiLine</Link>
        <span className="who">Synthetic data only</span>
      </header>
      <h1>Synthetic robustness evaluation</h1>
      <p className="lede">
        Invented visit transcripts with known answers, run through the field extraction and scored field by field.
        Wrong values and failures stay in the totals.
      </p>

      {runs.length === 0 && <div className="notice info"><strong className="title">No results yet</strong>Run <code>npm run eval:run</code> to create the first run.</div>}
      {runs.map((run) => <RunSection key={run.runId} run={run} />)}
    </main>
  );
}

function RunSection({ run }: { run: Run }) {
  const live = run.mode === "LIVE";
  const sttMs = run.heard?.map((h) => h.sttMs).sort((a, b) => a - b) ?? [];
  return (
    <section className="run" aria-label={`${run.mode} run`}>
      <h2 className="run-title">{live ? "Live run: synthetic speech through Gnani" : "Fixture run: text only"}</h2>
          <div className="notice caveat" role="note">
            {live ? (
              <>
                <strong className="title">LIVE run: synthetic speech, not real workers</strong>
                {run.label}. A computer voice read each of the {run.scenarioCount} scenarios aloud and Gnani transcribed it.
                A computer voice is not a health worker in a noisy home, and some errors come from the voice itself (it reads dates like 2026-10-27 oddly).
              </>
            ) : (
              <>
                <strong className="title">FIXTURE run: not a speech accuracy result</strong>
                {run.label}. These numbers show how the extraction and scoring behave on {run.scenarioCount} hand-written scenarios.
                They say nothing about how well real speech is recognised or about use in the field.
              </>
            )}
          </div>

          <h3>Field outcomes by condition</h3>
          <ul className="legend" aria-label="Legend">
            {SEGMENTS.map((g) => <li key={g.key}><span className="swatch" style={{ background: g.color }} aria-hidden="true" />{g.label}</li>)}
          </ul>
          <div className="bars">
            {Object.entries(run.conditions).map(([cond, s]) => (
              <div key={cond} className="bar-row">
                <div className="bar-label">{CONDITION_LABEL[cond] ?? cond}<span className="hint">, {pct(s.accuracy)} correct</span></div>
                <div className="bar" role="img" aria-label={`${CONDITION_LABEL[cond] ?? cond}: ${SEGMENTS.map((g) => `${g.label} ${g.count(s)}`).join(", ")} of ${s.expectedCount}`}>
                  {SEGMENTS.map((g) => g.count(s) > 0 && (
                    <span key={g.key} className="seg" style={{ flexGrow: g.count(s), background: g.color }} title={`${g.label}: ${g.count(s)} of ${s.expectedCount} (${pct(g.count(s) / s.expectedCount)})`} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <h3>All numbers</h3>
          <div className="table-wrap" tabIndex={0} role="region" aria-label={`${run.mode} numbers, scrolls sideways`}>
            <table className="nums">
              <thead>
                <tr><th scope="col">Condition</th><th scope="col">Fields</th><th scope="col">Correct</th><th scope="col">Wrong</th><th scope="col">Missed</th><th scope="col">Abstained</th><th scope="col">Failed</th><th scope="col">Accuracy</th><th scope="col">Coverage</th><th scope="col">Wrong rate</th></tr>
              </thead>
              <tbody>
                {[...Object.entries(run.conditions), ["Overall", run.overall] as const, ["Dev split", run.bySplit.dev] as const, ["Held-out split", run.bySplit.heldout] as const].map(([k, s]) => (
                  <tr key={k} className={k === "Overall" ? "total" : undefined}>
                    <th scope="row">{CONDITION_LABEL[k] ?? k}</th>
                    <td>{s.expectedCount}</td><td>{s.correct}</td><td>{s.wrong}</td><td>{s.missing}</td><td>{s.abstained}</td>
                    <td>{s.schemaFailed + s.providerFailed}</td><td>{pct(s.accuracy)}</td><td>{pct(s.coverage)}</td><td>{pct(s.wrongRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">Accuracy = correct ÷ fields. Coverage = fields with any answer ÷ fields. Held-out scenarios were never used to tune the extractor.</p>

          <h3>Where it went wrong</h3>
          <ul>
            {Object.entries(
              run.failures.reduce<Record<string, Record<string, number>>>((acc, f) => {
                (acc[f.field] ??= {})[f.classification] = (acc[f.field]?.[f.classification] ?? 0) + 1;
                return acc;
              }, {})
            ).map(([field, byClass]) => (
              <li key={field}><strong>{FIELD_LABEL[field] ?? field}:</strong> {Object.entries(byClass).map(([c, n]) => `${n} ${c}`).join(", ")}</li>
            ))}
          </ul>

          <h3>Speed</h3>
          <p>
            {live ? "Speech-to-text plus extraction" : "Extraction"} took {run.overall.latencyP50Ms} ms at the median and {run.overall.latencyP95Ms} ms at p95 (N = {run.overall.nLatency}).
            {live ? "This excludes uploading from a phone and the app's own request overhead." : "In this mode there is no speech recognition, so this is not the time from recording to an editable form."}
          </p>

          <h3>Where these numbers come from</h3>
          <dl className="obs prov">
            <div className="obs-row"><dt>Run</dt><dd className="mono">{run.runId}</dd></div>
            <div className="obs-row"><dt>Date</dt><dd>{new Date(run.createdAt).toLocaleString()}</dd></div>
            <div className="obs-row"><dt>Cases</dt><dd>{run.scenarioCount} scenarios, {run.caseCount / run.scenarioCount} condition(s) = {run.caseCount}</dd></div>
            <div className="obs-row"><dt>Manifest</dt><dd className="mono">{run.manifestHash.slice(0, 16)}…</dd></div>
            <div className="obs-row"><dt>Code version</dt><dd className="mono">{run.codeVersion}</dd></div>
            <div className="obs-row"><dt>Extractor</dt><dd className="mono">{run.modelVersion}, prompt {run.promptVersion}</dd></div>
            <div className="obs-row"><dt>Scorer</dt><dd className="mono">v{run.scorerVersion}, seed {run.seed}</dd></div>
          </dl>
      {live && run.heard && (
        <>
          <p>Gnani speech-to-text took {sttMs[Math.floor(sttMs.length / 2)]} ms at the median (max {sttMs[sttMs.length - 1]} ms, N = {sttMs.length}) for clips of a few seconds.</p>
          <details>
            <summary>What Gnani heard, all {run.heard.length} clips</summary>
            <ul className="heard">
              {run.heard.map((h) => <li key={h.scenarioId}><span className="mono">{h.scenarioId}</span> “{h.transcript ?? `failed: ${h.code}`}”</li>)}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
