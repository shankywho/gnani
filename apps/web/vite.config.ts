import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Same-origin /api via proxy so the strict session cookie and CSRF header just work.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:3000", "/health": "http://localhost:3000" } },
});
