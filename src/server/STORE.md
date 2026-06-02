# Store layer

Current storage shape remains JSON-compatible:

- JSON fallback: `data/db.json`
- PostgreSQL: `koin_*` tables with `{ id, data jsonb, created_at, updated_at }`

Drizzle scaffold:

- `schema.js` defines all `koin_*` JSONB tables.
- `postgres-store.js` wraps Drizzle operations for table reads/replaces/upserts/deletes.
- `core.js` now uses `createPostgresStore()` for PostgreSQL mode.

Next migration step:

1. Replace whole-DB `writeDb()` calls with targeted `upsertRow()` / `deleteRow()` where routes mutate one table.
2. Gradually move hot tables from JSONB-only to typed relational columns.
3. Add migration files once typed columns are introduced.
