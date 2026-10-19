import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Files share one Postgres; row-count assertions require serial file execution.
    fileParallelism: false,
    include: [
      "../../tests/unit/**/*.test.ts",
      "../../tests/contract/**/*.test.ts",
      "../../tests/integration/**/*.test.ts",
      "../../tests/security/**/*.test.ts",
      "../../tests/load/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
  },
});
