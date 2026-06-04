import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5174,
    proxy: {
      "/api": "http://127.0.0.1:5173",
      "/uploads": "http://127.0.0.1:5173"
    }
  },
  esbuild: {
    pure: ["console.warn", "console.log"]
  },
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return id.includes("node_modules") ? "vendor" : undefined;
        }
      }
    }
  }
});
