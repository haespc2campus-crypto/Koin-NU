import crypto from "node:crypto";
import argon2 from "argon2";
import pg from "pg";

for (const envFile of [".env.local", ".env"]) {
  if (typeof process.loadEnvFile === "function") {
    try { process.loadEnvFile(envFile); break; } catch {}
  }
}

const [emailArg, passwordArg, nameArg = "Admin"] = process.argv.slice(2);
const email = String(emailArg || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(passwordArg || process.env.ADMIN_PASSWORD || "");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diisi.");
if (!email || !password) throw new Error("Usage: npm run seed:admin -- email password [name]");

async function hashPassword(password) {
  return `argon2$${await argon2.hash(String(password))}`;
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query("create table if not exists koin_profiles (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now())");
  const existing = await pool.query("select id, data from koin_profiles where lower(data->>'email') = lower($1) limit 1", [email]);
  const id = existing.rows[0]?.id || crypto.randomUUID();
  const data = { ...(existing.rows[0]?.data || {}), id, email, password_hash: await hashPassword(password), full_name: nameArg, role: "admin", phone: "", status: "aktif", created_at: existing.rows[0]?.data?.created_at || new Date().toISOString() };
  await pool.query("insert into koin_profiles (id, data, updated_at) values ($1, $2::jsonb, now()) on conflict (id) do update set data = excluded.data, updated_at = now()", [id, JSON.stringify(data)]);
  console.log(`Admin OK: ${email}`);
} finally {
  await pool.end();
}
