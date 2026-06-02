# Setup PostgreSQL Koin NU Ranting

Aplikasi memakai server Fastify (`fastify-server.js`) + PostgreSQL jika `DATABASE_URL` tersedia. Jika `DATABASE_URL` kosong, server fallback ke `data/db.json`.

## 1. Buat database

Di server/SSH Rizquna:

```sql
create database koin_nu;
create user koin_nu_user with encrypted password 'GANTI_PASSWORD_KUAT';
grant all privileges on database koin_nu to koin_nu_user;
```

## 2. Konfigurasi environment

Buat `.env`/env service:

```bash
DATABASE_URL=postgres://koin_nu_user:***@localhost:5432/koin_nu
SESSION_SECRET=ganti-secret-panjang
PORT=5173
```

## 3. Jalankan

```bash
npm install
npm start
```

Saat start/request pertama, server otomatis membuat tabel:

```sql
lihat `migrations/001_postgres_tables.sql`
```

## 4. Catatan

- Supabase sudah dihapus.
- Dependency DB sekarang `pg`.
- Data aplikasi disimpan sebagai JSONB di PostgreSQL (`koin_* tables`).
- Upload foto tetap lokal di folder `uploads/`.
- Auth memakai endpoint internal `/api/login`, bukan Supabase Auth.
