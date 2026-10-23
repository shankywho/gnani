import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { STAGING_DIR } from "./stage.js";

/** Crash recovery: delete staged clips older than maxAgeMs (per-request cleanup normally handles them). */
export async function sweepStaging(maxAgeMs = 60 * 60 * 1000, now = Date.now(), dir = STAGING_DIR): Promise<number> {
  let removed = 0;
  for (const name of await readdir(dir).catch(() => [] as string[])) {
    const p = join(dir, name);
    const s = await stat(p).catch(() => null);
    if (s && now - s.mtimeMs > maxAgeMs) {
      await unlink(p).catch(() => {});
      removed++;
    }
  }
  return removed;
}
