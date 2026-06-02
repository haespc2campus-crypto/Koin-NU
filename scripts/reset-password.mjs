import argon2 from "argon2";
import pg from "pg";

for (const envFile of [".env.local", ".env"]) {
  if (typeof process.loadEnvFile === "function") {
    try { process.loadEnvFile(envFile); break; } catch {}
  }
}

const [emailArg, passwordArg] = process.argv.slice(2);
const email = String(emailArg || "").trim().toLowerCase();
const password = String(passwordArg || "");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diisi.");
if (!email || password.length < 8) throw new Error("Usage: npm run reset:password -- email passwordMinimal8");

async function hashPassword(password) {
  return `argon2$${await argon2.hash(String(password))}`;
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const result = await pool.query("select id, data from koin_profiles where lower(data->>'email') = lower($1) limit 1", [email]);
  if (!result.rows[0]) throw new Error("User tidak ditemukan.");
  const data = { ...result.rows[0].data, password_hash: await hashPassword(password), updated_at: new Date().toISOString() };
  await pool.query("update koin_profiles set data = $2::jsonb, updated_at = now() where id = $1", [result.rows[0].id, JSON.stringify(data)]);
  console.log(`Password reset OK: ${email}`);
} finally {
  await pool.end();
}
