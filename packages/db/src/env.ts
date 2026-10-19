import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  TEST_DATABASE_URL: z
    .string()
    .default("postgresql://sakhi:sakhi@localhost:54320/sakhiline_test"),
});

const parsed = EnvSchema.parse(process.env);

// Never silently fall back to the test database outside local/test use.
if (process.env.NODE_ENV === "production" && !parsed.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in production");
}

export const dbEnv = {
  DATABASE_URL: parsed.DATABASE_URL || parsed.TEST_DATABASE_URL,
  TEST_DATABASE_URL: parsed.TEST_DATABASE_URL,
};
