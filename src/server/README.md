# Server modernization

Fastify sekarang menjadi default server (`npm start`). Legacy `server.js` tetap tersedia via `npm run start:legacy`.

Status:

1. Auth/db/upload route sudah dipindah ke Fastify.
2. Parity smoke test tersedia: `npm run test:smoke:fastify`.
3. Password verifier mendukung legacy scrypt dan scaffold Argon2.

Target berikut:

1. Pakai Zod schema untuk request validation.
2. Pakai Argon2 untuk password baru.
3. Pakai Drizzle untuk schema relational penuh.
