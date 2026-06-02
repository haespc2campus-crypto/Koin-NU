import { cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

const publicDir = path.join(root, "public");
if (existsSync(publicDir)) {
  await cp(publicDir, dist, { recursive: true });
}

console.log("Server assets siap di dist/.");
