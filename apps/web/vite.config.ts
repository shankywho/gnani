import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Same-origin /api via proxy so the strict session cookie and CSRF header just work.
const api = `http://localhost:${process.env.API_PORT ?? 3000}`;

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": api, "/health": api } },
});
