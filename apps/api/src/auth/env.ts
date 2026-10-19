import { z } from "zod";

const AuthEnvSchema = z.object({
  APP_MODE: z.enum(["local", "live"]).default("local"),
  FIXTURE_AUTH: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? true : v === "true" || v === "1")),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters")
    .default("sakhiline-development-session-secret-key-at-least-32-chars"),
  CONTEXT_TTL_SECONDS: z.coerce.number().int().positive().default(600),
});

export const authEnv = AuthEnvSchema.parse(process.env);
