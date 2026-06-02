import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { tableSchemas } from "./schema.js";

export function createPostgresStore(pool, tables, defaultUsers) {
  const db = drizzle(pool, { schema: tableSchemas });

  function tableFor(name) {
    const table = tableSchemas[name];
    if (!table) throw new Error("Tabel tidak dikenal");
    return table;
  }

  async function ensure() {
    const client = await pool.connect();
    try {
      await client.query("begin");
      for (const table of tables) {
        await client.query(`create table if not exists koin_${table} (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`);
      }
      const profiles = await client.query("select count(*)::int as count from koin_profiles");
      if (!profiles.rows[0].count) {
        for (const user of defaultUsers) {
          await client.query("insert into koin_profiles (id, data) values ($1, $2::jsonb) on conflict do nothing", [user.id, JSON.stringify(user)]);
        }
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async function readTable(name) {
    const table = tableFor(name);
    const rows = await db.select({ data: table.data }).from(table).orderBy(table.createdAt);
    return rows.map((row) => row.data);
  }

  async function replaceAll(dataByTable) {
    await db.transaction(async (tx) => {
      for (const name of tables) {
        const table = tableFor(name);
        await tx.delete(table);
        for (const row of dataByTable[name] || []) {
          await tx.insert(table).values({ id: String(row.id), data: row }).onConflictDoUpdate({
            target: table.id,
            set: { data: row, updatedAt: sql`now()` }
          });
        }
      }
    });
  }

  async function upsertRow(name, row) {
    const table = tableFor(name);
    await db.insert(table).values({ id: String(row.id), data: row }).onConflictDoUpdate({
      target: table.id,
      set: { data: row, updatedAt: sql`now()` }
    });
  }

  async function deleteRow(name, id) {
    const table = tableFor(name);
    await db.delete(table).where(eq(table.id, String(id)));
  }

  return { db, ensure, readTable, replaceAll, upsertRow, deleteRow };
}
