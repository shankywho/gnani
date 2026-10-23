// Fails if secrets or server-only config leak into git-tracked files or the built web bundle.
// Usage: node scripts/check-secrets.mjs   (run after `npm run build`)
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PATTERNS = [
  [/vach_[A-Za-z0-9_]{20,}/, "Gnani API key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/postgres(ql)?:\/\/[^:\s"]+:(?!sakhi@)[^@\s"]+@/, "database URL with a non-local password"],
];
// The browser bundle must not even mention server-only variable names.
const BUNDLE_ONLY = [[/GNANI_API_KEY|SESSION_SECRET|DATABASE_URL|api\.vachana\.ai/, "server-only config"]];

const problems = [];
const scan = (file, text, patterns) => {
  for (const [re, what] of patterns) if (re.test(text)) problems.push(`${file}: ${what}`);
};

const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
for (const f of tracked) {
  if (!existsSync(f) || statSync(f).size > 2_000_000 || /\.(pdf|png|jpg|lock)$/.test(f)) continue;
  scan(f, readFileSync(f, "utf8"), PATTERNS);
}

const dist = "apps/web/dist";
if (!existsSync(dist)) problems.push(`${dist} missing: run npm run build first`);
else {
  const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  for (const f of walk(dist)) scan(f, readFileSync(f, "utf8"), [...PATTERNS, ...BUNDLE_ONLY]);
}

if (problems.length) {
  console.error("Secret check FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`Secret check passed (${tracked.length} tracked files + web bundle).`);
