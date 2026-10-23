import { describe, it, expect } from "vitest";
import { access, mkdtemp, writeFile, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stageClip, wavSeconds } from "../../apps/api/src/media/stage.js";
import { sweepStaging } from "../../apps/api/src/media/cleanup.js";

/** Minimal PCM16 mono WAV of the given length. */
function wav(seconds: number, sampleRate = 16000): Buffer {
  const data = Math.round(seconds * sampleRate) * 2;
  const b = Buffer.alloc(44 + data);
  b.write("RIFF", 0); b.writeUInt32LE(36 + data, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sampleRate, 24); b.writeUInt32LE(sampleRate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(data, 40);
  return b;
}
const exists = (p: string) => access(p).then(() => true, () => false);

describe("media staging", () => {
  it("reads WAV duration from the header", () => {
    expect(wavSeconds(wav(2.5))).toBeCloseTo(2.5);
  });

  it("stages a valid clip privately and cleanup deletes it", async () => {
    const clip = await stageClip({ buffer: wav(3), mimeType: "audio/wav" });
    expect(clip.seconds).toBeCloseTo(3);
    expect(await exists(clip.path)).toBe(true);
    await clip.cleanup();
    expect(await exists(clip.path)).toBe(false);
  });

  it("rejects a non-WAV MIME type with 415", async () => {
    await expect(stageClip({ buffer: wav(1), mimeType: "audio/webm" })).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA", statusCode: 415 });
  });

  it("rejects WebM bytes labelled as WAV (renaming is not conversion)", async () => {
    const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    await expect(stageClip({ buffer: webm, mimeType: "audio/wav" })).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA" });
  });

  it("rejects clips over 30 seconds with 413", async () => {
    await expect(stageClip({ buffer: wav(31, 8000), mimeType: "audio/wav" })).rejects.toMatchObject({ code: "TOO_LARGE", statusCode: 413 });
  });

  it("sweep removes only stale staged files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sweep-"));
    const old = join(dir, "old.wav"), fresh = join(dir, "fresh.wav");
    await writeFile(old, "x"); await writeFile(fresh, "x");
    const twoHoursAgo = (Date.now() - 2 * 3600_000) / 1000;
    await utimes(old, twoHoursAgo, twoHoursAgo);
    expect(await sweepStaging(3600_000, Date.now(), dir)).toBe(1);
    expect(await exists(old)).toBe(false);
    expect(await exists(fresh)).toBe(true);
  });
});
