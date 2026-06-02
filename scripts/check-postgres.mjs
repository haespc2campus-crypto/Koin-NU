import pg from "pg";

for (const envFile of [".env.local", ".env"]) {
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(envFile);
      break;
    } catch {}
  }
}

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error("DATABASE_URL belum diisi.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
try {
  await pool.query("select 1");
  await pool.query("create table if not exists app_state (id text primary key, data jsonb not null, updated_at timestamptz not null default now())");
  const result = await pool.query("select current_database() as db, current_user as user, version() as version");
  console.log(`PostgreSQL OK: db=${result.rows[0].db} user=${result.rows[0].user}`);
} catch (error) {
  console.error(`PostgreSQL ERROR: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
