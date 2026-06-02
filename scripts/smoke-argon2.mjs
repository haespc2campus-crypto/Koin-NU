import { rm, readFile } from "node:fs/promises";
import path from "node:path";
import { buildServer } from "../src/server/app.js";
import { getServerConfig } from "../src/server/config.js";

const root = process.cwd();
const dataDir = path.join(root, ".tmp-smoke-argon2-data");
const uploadsDir = path.join(root, ".tmp-smoke-argon2-uploads");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function inject(app, opts) {
  const response = await app.inject(opts);
  return { response, body: response.json() };
}

await rm(dataDir, { recursive: true, force: true });
await rm(uploadsDir, { recursive: true, force: true });
process.env.DATA_DIR = dataDir;
process.env.UPLOADS_DIR = uploadsDir;
process.env.SESSION_TTL_MS = "1800000";
process.env.MAX_BODY_BYTES = "2097152";

const app = await buildServer(getServerConfig(root));
try {
  const login = await inject(app, { method: "POST", url: "/api/login", payload: { email: "admin@rantingnu.id", password: "admin123" } });
  assert(login.response.statusCode === 200, "legacy scrypt login gagal");

  const upgradedDb = JSON.parse(await readFile(path.join(dataDir, "db.json"), "utf8"));
  const upgradedAdmin = upgradedDb.profiles.find((u) => u.email === "admin@rantingnu.id");
  assert(upgradedAdmin.password_hash.startsWith("argon2$"), "login belum auto-upgrade ke argon2");

  const auth = { authorization: `Bearer ${login.body.token}` };
  const change = await inject(app, { method: "POST", url: "/api/change-password", headers: auth, payload: { currentPassword: "admin123", newPassword: "admin12345" } });
  assert(change.response.statusCode === 200, "change password gagal");

  const nextLogin = await inject(app, { method: "POST", url: "/api/login", payload: { email: "admin@rantingnu.id", password: "admin12345" } });
  assert(nextLogin.response.statusCode === 200, "argon2 login gagal");

  const db = JSON.parse(await readFile(path.join(dataDir, "db.json"), "utf8"));
  const admin = db.profiles.find((u) => u.email === "admin@rantingnu.id");
  assert(admin.password_hash.startsWith("argon2$"), "password hash belum argon2");

  console.log("Argon2 smoke OK");
} finally {
  await app.close();
  await rm(dataDir, { recursive: true, force: true });
  await rm(uploadsDir, { recursive: true, force: true });
}
