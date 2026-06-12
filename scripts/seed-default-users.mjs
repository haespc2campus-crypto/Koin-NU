import { readFileSync, existsSync } from "node:fs";
import crypto from "node:crypto";
import pg from "pg";
import { hashPassword } from "../src/server/password.js";

for (const envFile of [".env.local", ".env"]) {
  if (existsSync(envFile)) {
    const lines = readFileSync(envFile, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
  }
}

const users = [
  { username: "superadmin", email: "superadmin@rantingnu.id", password: "SuperAdmin2026!", full_name: "Super Admin", role: "super_admin", phone: "0812-9000-0001" },
  { username: "admin", email: "admin@rantingnu.id", password: "Admin2026!", full_name: "Admin Ranting", role: "admin", phone: "0812-9000-1111" },
  { username: "bendahara", email: "bendahara@rantingnu.id", password: "Bendahara2026!", full_name: "Bendahara", role: "bendahara", phone: "" },
  { username: "petugas", email: "petugas@rantingnu.id", password: "Petugas2026!", full_name: "Petugas", role: "petugas", phone: "0812-7000-0101" },
  { username: "pengurus", email: "pengurus@rantingnu.id", password: "Pengurus2026!", full_name: "Pengurus", role: "pengurus", phone: "" },
  { username: "editor", email: "editor@rantingnu.id", password: "Editor2026!", full_name: "Editor Berita", role: "editor_berita", phone: "" }
];

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diisi.");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query("create table if not exists koin_profiles (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now())");
  for (const user of users) {
    const existing = await pool.query(
      "select id, data from koin_profiles where lower(data->>'username') = lower($1) or lower(data->>'email') = lower($2) limit 1",
      [user.username, user.email]
    );
    const id = existing.rows[0]?.id || crypto.randomUUID();
    const data = {
      ...(existing.rows[0]?.data || {}),
      id,
      username: user.username,
      email: user.email,
      password_hash: await hashPassword(user.password),
      full_name: user.full_name,
      role: user.role,
      phone: user.phone,
      status: "aktif",
      created_at: existing.rows[0]?.data?.created_at || new Date().toISOString()
    };
    await pool.query(
      "insert into koin_profiles (id, data, updated_at) values ($1, $2::jsonb, now()) on conflict (id) do update set data = excluded.data, updated_at = now()",
      [id, JSON.stringify(data)]
    );
    console.log(`OK ${user.role}: ${user.username}`);
  }
} finally {
  await pool.end();
}
