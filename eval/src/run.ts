/**
 * Evaluation runner (Johny). Runs the frozen 30-scenario manifest through the real extraction module
 * under clean + two noise conditions, scores with Shanky's exact scorer, persists to the isolated
 * evaluation tables, and writes a JSON artifact for the /evaluation screen.
 *
 * Mode FIXTURE: transcript-level noise + the deterministic mock extractor. No audio, no STT, no spend.
 * It measures pipeline/scorer behaviour, NOT speech-recognition or field accuracy.
 *
 * Mode LIVE (--live): each scenario is spoken by macOS `say` into 16 kHz WAV (cached, not committed),
 * sent through the real staging + Gnani adapter (one billed call per scenario, serial), then extracted
 * and scored. Clean condition only: audio-level noise is not implemented. Synthetic TTS, not human speech.
 *
 *   npm run eval:run                 # FIXTURE, persist to DATABASE_URL and write eval/runs/
 *   npm run eval:run -- --no-db      # artifact only
 *   npm run eval:live                # LIVE (needs STT key in .env; billed)
 */
import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPrismaClient, createEvaluationRun, recordEvaluationResult } from "@sakhiline/db";
import { Extractor } from "../../apps/api/src/extraction/index.js";
import { MockExtractionProvider } from "../../apps/api/src/extraction/mock.js";
import { stageClip } from "../../apps/api/src/media/stage.js";
import { createGnaniTranscribe } from "../../apps/api/src/providers/gnani.js";
import { loadManifest } from "./manifest.js";
import { applyNoise, scenarioSeed } from "./noise.js";
import { scoreCase } from "./scorer.js";
import { aggregateResults } from "./aggregate.js";
import type { CaseResult, FieldClassification, RunnerOutcome } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const LABELS = {
  FIXTURE: "FIXTURE (mock extractor, transcript-level noise; no speech recognition)",
  LIVE: "LIVE (macOS synthetic speech → Gnani STT → mock extractor; clean condition only)",
} as const;
type Mode = keyof typeof LABELS;

// Worst outcome first: one case gets one class for the per-case row.
const SEVERITY: FieldClassification[] = ["provider_failed", "schema_failed", "wrong", "missing", "abstained", "correct"];

export async function runEvaluation(opts: { persist: boolean; outDir?: string; mode?: Mode }) {
  const MODE: Mode = opts.mode ?? "FIXTURE";
  const LABEL = LABELS[MODE];
  const { manifest, manifestHash } = loadManifest(join(here, "../fixtures/manifest.json"));
  const provider = new MockExtractionProvider();
  const extractor = new Extractor(provider);
  const cases: CaseResult[] = [];
  const heard: { scenarioId: string; audioSha256: string; transcript: string | null; sttMs: number; code?: string }[] = [];
  const conditions = MODE === "LIVE" ? (["clean"] as const) : manifest.conditions;
  const transcribe =
    MODE === "LIVE"
      ? createGnaniTranscribe({
          apiKey: process.env.GNANI_API_KEY ?? (() => { throw new Error("LIVE mode needs GNANI_API_KEY"); })(),
          languageCode: process.env.GNANI_LANGUAGE_CODE,
        })
      : null;

  for (const scenario of manifest.scenarios) {
    for (const condition of conditions) {
      const started = performance.now();
      let outcome: RunnerOutcome | null = null;
      let transcript = applyNoise(scenario.transcript, condition, scenarioSeed(manifest.seed, scenario.id, condition));
      if (transcribe) {
        const wav = synthesize(scenario.id, scenario.transcript);
        const clip = await stageClip({ buffer: wav, mimeType: "audio/wav" });
        const t0 = performance.now();
        const stt = await transcribe(clip, "en-IN").finally(() => clip.cleanup());
        const sttMs = Math.round(performance.now() - t0);
        const audioSha256 = createHash("sha256").update(wav).digest("hex");
        if (stt.ok) {
          transcript = stt.transcript;
          heard.push({ scenarioId: scenario.id, audioSha256, transcript, sttMs });
        } else {
          outcome = { kind: "provider_failed", code: stt.code };
          heard.push({ scenarioId: scenario.id, audioSha256, transcript: null, sttMs, code: stt.code });
        }
        process.stdout.write(`${scenario.id} ${stt.ok ? "ok" : stt.code} ${sttMs}ms\n`);
      }
      if (!outcome) try {
        const p = await extractor.extract({
          transcript,
          visitAt: scenario.visitAt,
          visitTimezone: scenario.visitTimezone,
          history: scenario.history.map((h) => ({ observations: h.observations })),
          baseRevision: 1,
        });
        outcome = p.issues.some((i) => i.code === "EXTRACTION_FAILED")
          ? { kind: "schema_failed" }
          : { kind: "proposal", observations: p.observations, issues: p.issues };
      } catch (e) {
        outcome = { kind: "provider_failed", code: (e as Error).name };
      }
      outcome ??= { kind: "provider_failed", code: "UNKNOWN" };
      const latencyMs = Math.round(performance.now() - started);
      cases.push({ scenarioId: scenario.id, split: scenario.split, condition, outcome, fieldResults: scoreCase(scenario.expected, outcome), latencyMs });
    }
  }

  const meta = { manifestHash, seed: manifest.seed, mode: MODE };
  const summary = aggregateResults(cases, meta);
  const bySplit = {
    dev: aggregateResults(cases.filter((c) => c.split === "dev"), meta).overall,
    heldout: aggregateResults(cases.filter((c) => c.split === "heldout"), meta).overall,
  };
  const codeVersion = gitSha();
  const versions = { codeVersion, scorerVersion: manifest.scorerVersion, manifestVersion: manifest.version, promptVersion: provider.promptVersion, modelVersion: provider.name };

  let runId: string = `local-${Date.now()}`;
  if (opts.persist) {
    const prisma = getPrismaClient();
    try {
      const run = await createEvaluationRun(prisma, {
        manifestHash,
        codeVersion,
        promptVersion: provider.promptVersion,
        schemaVersion: manifest.version,
        modelVersion: provider.name,
        seed: manifest.seed,
        conditions: [...conditions],
        counts: JSON.parse(JSON.stringify({ mode: MODE, overall: summary.overall, conditions: summary.conditions })),
        status: "completed",
      });
      runId = run.id;
      for (const c of cases) {
        const denominators: Record<string, number> = { expectedCount: c.fieldResults.length };
        for (const f of c.fieldResults) denominators[f.classification] = (denominators[f.classification] ?? 0) + 1;
        await recordEvaluationResult(prisma, {
          runId,
          scenarioId: c.scenarioId,
          split: c.split,
          condition: c.condition,
          expected: JSON.parse(JSON.stringify(manifest.scenarios.find((s) => s.id === c.scenarioId)!.expected)),
          predicted: JSON.parse(JSON.stringify(c.outcome)),
          resultClass: SEVERITY.find((k) => c.fieldResults.some((f) => f.classification === k)) ?? "correct",
          denominators,
          latencyMs: c.latencyMs,
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  }

  // Failures per field help explain the numbers without exposing every case.
  const failures = cases.flatMap((c) =>
    c.fieldResults.filter((f) => f.classification !== "correct").map((f) => ({ scenarioId: c.scenarioId, condition: c.condition, field: f.field, classification: f.classification }))
  );

  const artifact = {
    runId,
    createdAt: new Date().toISOString(),
    mode: MODE,
    label: LABEL,
    persisted: opts.persist,
    manifestHash,
    seed: manifest.seed,
    scenarioCount: manifest.scenarios.length,
    caseCount: cases.length,
    ...versions,
    overall: summary.overall,
    conditions: summary.conditions,
    bySplit,
    failures,
    ...(MODE === "LIVE" ? { heard } : {}),
  };
  const dir = opts.outDir ?? join(here, "../runs");
  mkdirSync(dir, { recursive: true });
  const body = JSON.stringify(artifact, null, 2) + "\n";
  writeFileSync(join(dir, `${artifact.createdAt.slice(0, 19).replace(/:/g, "")}-${MODE.toLowerCase()}.json`), body);
  writeFileSync(join(dir, MODE === "LIVE" ? "latest-live.json" : "latest.json"), body);
  return artifact;
}

/** macOS `say` → 16 kHz mono PCM16 WAV, cached by scenario+text so reruns resend identical audio. */
function synthesize(id: string, text: string): Buffer {
  const voice = process.env.EVAL_TTS_VOICE ?? "Rishi";
  const dir = join(here, "../audio-cache");
  const path = join(dir, `${id}-${createHash("sha256").update(voice + text).digest("hex").slice(0, 12)}.wav`);
  if (!existsSync(path)) {
    mkdirSync(dir, { recursive: true });
    execFileSync("say", ["-v", voice, "-o", path, "--file-format=WAVE", "--data-format=LEI16@16000", text]);
  }
  return readFileSync(path);
}

function gitSha(): string {
  try {
    return execSync("git describe --always --dirty --abbrev=7", { cwd: here }).toString().trim();
  } catch {
    return "unknown";
  }
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const a = await runEvaluation({ persist: !process.argv.includes("--no-db"), mode: process.argv.includes("--live") ? "LIVE" : "FIXTURE" });
  console.log(`\n${a.label}\nrun ${a.runId} · manifest ${a.manifestHash.slice(0, 12)} · code ${a.codeVersion} · ${a.caseCount} cases\n`);
  console.table(
    Object.fromEntries(
      [...Object.entries(a.conditions), ["overall", a.overall] as const].map(([k, s]) => [
        k,
        { expected: s.expectedCount, correct: s.correct, wrong: s.wrong, missing: s.missing, abstained: s.abstained, failed: s.schemaFailed + s.providerFailed, accuracy: pct(s.accuracy), coverage: pct(s.coverage), wrongRate: pct(s.wrongRate) },
      ])
    )
  );
}
