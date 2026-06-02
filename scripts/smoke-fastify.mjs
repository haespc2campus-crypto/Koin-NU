import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const port = 5188;
const base = `http://127.0.0.1:${port}`;
const testDataDir = path.join(root, ".tmp-smoke-fastify-data");
const testUploadsDir = path.join(root, ".tmp-smoke-fastify-uploads");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

async function waitForServer(proc) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const { response } = await request("/api/health");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Fastify tidak siap. Log: ${proc.stderrText || proc.stdoutText || "-"}`);
}

await rm(testDataDir, { recursive: true, force: true });
await rm(testUploadsDir, { recursive: true, force: true });
const proc = spawn(process.execPath, ["fastify-server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), DATA_DIR: testDataDir, UPLOADS_DIR: testUploadsDir, SESSION_TTL_MS: "1800000", MAX_BODY_BYTES: "2097152" },
  stdio: ["ignore", "pipe", "pipe"]
});
proc.stdoutText = "";
proc.stderrText = "";
proc.stdout.on("data", (chunk) => { proc.stdoutText += chunk.toString(); });
proc.stderr.on("data", (chunk) => { proc.stderrText += chunk.toString(); });

try {
  await waitForServer(proc);

  const pubDb = await request("/api/db");
  assert(pubDb.response.status === 200, "public /api/db gagal");
  assert(Array.isArray(pubDb.body.profiles) && pubDb.body.profiles.length === 0, "public profiles bocor");
  assert(!JSON.stringify(pubDb.body).includes("password_hash"), "password_hash bocor");

  const pubProfiles = await request("/api/table/profiles");
  assert(pubProfiles.response.status === 403, "public profiles table harus 403");

  const invalidDonor = await request("/api/table/donatur", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nama_kk: "" }) });
  assert(invalidDonor.response.status === 403, "unauth write harus 403");

  const login = await request("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@rantingnu.id", password: "admin123" }) });
  assert(login.response.status === 200 && login.body.token, "admin login gagal");
  const auth = { Authorization: `Bearer ${login.body.token}`, "Content-Type": "application/json" };

  const invalidPickup = await request("/api/table/pengambilan_koin", { method: "POST", headers: auth, body: JSON.stringify({ nominal: -1 }) });
  assert(invalidPickup.response.status === 400, "invalid nominal harus 400");

  const invalidNews = await request("/api/table/berita", { method: "POST", headers: auth, body: JSON.stringify({ judul: "x" }) });
  assert(invalidNews.response.status === 400, "berita incomplete harus 400");

  const adminProfiles = await request("/api/table/profiles", { headers: auth });
  assert(adminProfiles.response.status === 200, "admin profiles gagal");
  assert(!JSON.stringify(adminProfiles.body).includes("password_hash"), "admin response password_hash bocor");

  const fakePng = await request("/api/upload", { method: "POST", headers: auth, body: JSON.stringify({ type: "image/png", name: "fake.png", dataUrl: `data:image/png;base64,${Buffer.from("not-a-png").toString("base64")}` }) });
  assert(fakePng.response.status === 400, "fake png harus ditolak");

  for (let i = 0; i < 5; i += 1) await request("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@rantingnu.id", password: "salah" }) });
  const blockedLogin = await request("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@rantingnu.id", password: "salah" }) });
  assert(blockedLogin.response.status === 429, "rate limit login harus aktif");

  console.log("Fastify smoke OK");
} finally {
  proc.kill("SIGTERM");
  await rm(testDataDir, { recursive: true, force: true });
  await rm(testUploadsDir, { recursive: true, force: true });
}
