import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
      plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler", { target: "18" }]]
        }
      }),
      Sitemap({
        hostname: "https://eaglercraft2ck.pages.dev",
        generateRobotsTxt: false
      })
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8788",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
