import { scenarioSeed } from "../src/noise.js";
import { describe, it, expect } from "vitest";
import { applyNoise, createMulberry32 } from "../src/noise.js";

describe("Phase 7 Noise Unit Tests (§14)", () => {
  const sampleTranscript =
    "Sunita ka BP check kiya 120 by 80 tha, Hb 10.5 mila, TT injection agle hafte 2026-10-27 ko lena hai.";

  it("noise: deterministic for same seed", () => {
    const seed = 12345;
    const run1 = applyNoise(sampleTranscript, "noise-a", seed);
    const run2 = applyNoise(sampleTranscript, "noise-a", seed);
    expect(run1).toBe(run2);

    const runB1 = applyNoise(sampleTranscript, "noise-b", seed);
    const runB2 = applyNoise(sampleTranscript, "noise-b", seed);
    expect(runB1).toBe(runB2);
  });

  it("noise: different seed produces different degraded output", () => {
    const run1 = applyNoise(sampleTranscript, "noise-a", 100);
    const run2 = applyNoise(sampleTranscript, "noise-a", 99999);
    expect(run1).not.toBe(run2);
  });

  it("noise: clean condition preserves transcript exactly", () => {
    const clean = applyNoise(sampleTranscript, "clean", 42);
    expect(clean).toBe(sampleTranscript);
  });

  it("noise: noise-a drops words compared to clean", () => {
    const cleanWordCount = sampleTranscript.split(/\s+/).length;
    const noisyWordCount = applyNoise(sampleTranscript, "noise-a", 42).split(/\s+/).length;
    expect(noisyWordCount).toBeLessThan(cleanWordCount);
  });

  it("noise: mulberry32 generates values strictly between 0 and 1", () => {
    const rng = createMulberry32(42);
    for (let i = 0; i < 100; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("scenarioSeed is deterministic and differs per scenario and condition", () => {
    expect(scenarioSeed(42, "A", "noise-a")).toBe(scenarioSeed(42, "A", "noise-a"));
    expect(scenarioSeed(42, "A", "noise-a")).not.toBe(scenarioSeed(42, "B", "noise-a"));
    expect(scenarioSeed(42, "A", "noise-a")).not.toBe(scenarioSeed(42, "A", "noise-b"));
  });
});
