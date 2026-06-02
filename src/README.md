# Modernization scaffold

Arah refactor berikutnya:

- `src/ui/` → reusable UI helpers/components.
- `src/lib/` → shared validators, formatters, API client.
- `src/server/` → modular Fastify API/db/auth.

Saat ini app utama masih `app.js` agar refactor aman bertahap.
