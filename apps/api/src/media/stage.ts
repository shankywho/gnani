import { mkdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppError, StageClip } from "@sakhiline/contracts";

export const STAGING_DIR = join(tmpdir(), "sakhiline-staging");
export const MAX_CLIP_SECONDS = 30;

/** Reads duration from a RIFF/WAVE header. Throws UNSUPPORTED_MEDIA for anything that is not real WAV. */
export function wavSeconds(buf: Buffer): number {
  const bad = () => new AppError("UNSUPPORTED_MEDIA", "Only WAV audio is accepted");
  if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw bad();
  let byteRate = 0;
  for (let off = 12; off + 8 <= buf.length; ) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "fmt " && off + 20 <= buf.length) byteRate = buf.readUInt32LE(off + 16);
    if (id === "data") {
      if (!byteRate) throw bad();
      // Streaming recorders may write a placeholder size; trust only the bytes actually present.
      return Math.min(size, buf.length - off - 8) / byteRate;
    }
    off += 8 + size + (size % 2);
  }
  throw bad();
}

export const stageClip: StageClip = async ({ buffer, mimeType }) => {
  if (!/^audio\/(wav|x-wav|wave)$/.test(mimeType)) throw new AppError("UNSUPPORTED_MEDIA", "Only WAV audio is accepted");
  const seconds = wavSeconds(buffer); // validates the bytes, not the declared type
  if (seconds > MAX_CLIP_SECONDS) throw new AppError("TOO_LARGE", `Clip exceeds ${MAX_CLIP_SECONDS} seconds`);

  await mkdir(STAGING_DIR, { recursive: true, mode: 0o700 });
  const path = join(STAGING_DIR, `${randomUUID()}.wav`);
  await writeFile(path, buffer, { mode: 0o600 });
  return { path, mimeType: "audio/wav", seconds, cleanup: () => unlink(path).catch(() => {}) };
};
