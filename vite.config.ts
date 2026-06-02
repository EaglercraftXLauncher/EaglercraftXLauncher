import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, Vite runs on :5173 and `wrangler pages dev` runs on :8788.
// The proxy below forwards /api/* calls from Vite → wrangler so the
// Pages Function runs locally alongside the React dev server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8788",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
