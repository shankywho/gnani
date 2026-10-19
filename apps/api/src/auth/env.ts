import { z } from "zod";

const DEV_SESSION_SECRET = "sakhiline-development-session-secret-key-at-least-32-chars";

const AuthEnvSchema = z.object({
  APP_MODE: z.enum(["local", "live"]).default("local"),
  FIXTURE_AUTH: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? true : v === "true" || v === "1")),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters")
    .default(DEV_SESSION_SECRET),
  CONTEXT_TTL_SECONDS: z.coerce.number().int().positive().default(600),
});

export const authEnv = AuthEnvSchema.parse(process.env);

// The built-in dev secret is public (it is in git); never accept it outside local mode.
if (authEnv.APP_MODE === "live" && authEnv.SESSION_SECRET === DEV_SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set explicitly when APP_MODE=live");
}
