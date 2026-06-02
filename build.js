import { copyFile, cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const dist = path.join(root, "dist");
const files = ["index.html", "styles.css", "app.js", "supabase-config.js", "lazisnu-logo.svg"];
const envLocal = path.join(root, ".env.local");
const vendorFiles = [
  ["node_modules/qrcode-generator/dist/qrcode.js", "vendor/qrcode.js"],
  ["node_modules/html5-qrcode/html5-qrcode.min.js", "vendor/html5-qrcode.min.js"]
];

if (existsSync(envLocal) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envLocal);
}

for (const file of files) {
  if (!existsSync(path.join(root, file))) {
    throw new Error(`File wajib tidak ditemukan: ${file}`);
  }
}

for (const [source] of vendorFiles) {
  if (!existsSync(path.join(root, source))) {
    throw new Error(`Dependency vendor tidak ditemukan: ${source}`);
  }
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of files) {
  await copyFile(path.join(root, file), path.join(dist, file));
}

await mkdir(path.join(dist, "vendor"), { recursive: true });
for (const [source, destination] of vendorFiles) {
  await copyFile(path.join(root, source), path.join(dist, destination));
}

const publicDir = path.join(root, "public");
if (existsSync(publicDir)) {
  await cp(publicDir, dist, { recursive: true });
}

await writeFile(path.join(dist, "supabase-config.js"), `window.KOIN_NU_SUPABASE_CONFIG = {
  url: ${JSON.stringify(process.env.VITE_SUPABASE_URL || "")},
  anonKey: ${JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || "")}
};
`, "utf8");

console.log("Build selesai. Output tersedia di dist/.");
