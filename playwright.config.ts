import { defineConfig } from "@playwright/test";

// E2E runs its own servers on spare ports, with fixture speech forced so no billed Gnani call can happen.
const API_PORT = 3100;
const WEB_PORT = 5174;

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    // The bundled headless shell has no audio capture; real Chrome provides the fake microphone.
    channel: "chrome",
    permissions: ["microphone"],
    launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  },
  // The supervisor journey reviews the visit the worker journey submits.
  projects: [
    { name: "worker", testMatch: "worker.spec.ts" },
    { name: "review", testMatch: "review.spec.ts", dependencies: ["worker"] },
    { name: "correction", testMatch: "correction.spec.ts" },
    { name: "a11y", testMatch: "a11y.spec.ts" },
  ],
  webServer: [
    {
      command: `STT_PROVIDER=mock PORT=${API_PORT} npm run dev:api`,
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: false,
    },
    {
      // Production build via `vite preview`: no dev-server dependency re-optimisation reloads mid-test.
      command: `npm run build -w @sakhiline/web && API_PORT=${API_PORT} npm run preview -w @sakhiline/web -- --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
