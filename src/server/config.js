import path from "node:path";
import { existsSync } from "node:fs";

export function loadEnv(root = process.cwd()) {
  for (const envFile of [".env.local", ".env"]) {
    const envPath = path.join(root, envFile);
    if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
      process.loadEnvFile(envPath);
      break;
    }
  }
}

export function getServerConfig(root = process.cwd()) {
  loadEnv(root);
  return {
    root,
    port: Number(process.env.PORT || 5173),
    host: process.env.HOST || "0.0.0.0",
    databaseUrl: process.env.DATABASE_URL || "",
    dataDir: process.env.DATA_DIR ? path.resolve(root, process.env.DATA_DIR) : path.join(root, "data"),
    uploadsDir: process.env.UPLOADS_DIR ? path.resolve(root, process.env.UPLOADS_DIR) : path.join(root, "uploads"),
    sessionTtlMs: Math.max(30 * 60 * 1000, Number(process.env.SESSION_TTL_MS || 12 * 60 * 60 * 1000)),
    maxBodyBytes: Math.min(10 * 1024 * 1024, Math.max(64 * 1024, Number(process.env.MAX_BODY_BYTES || 2 * 1024 * 1024)))
  };
}
