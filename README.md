# SIKOINNU

**Sistem Informasi Koin Nahdlatul Ulama**  
Berafiliasi dengan **NU Care-LAZISNU**  
Tagline: **Transparan, Amanah, dan Berdampak**

SIKOINNU membantu ranting NU mengelola donatur, pengambilan koin, setoran petugas, setoran ke LAZISNU, penyaluran dana, laporan, dan transparansi publik.

## Mode Database

Aplikasi berjalan dengan server Fastify (`fastify-server.js`). Legacy fallback tersedia via `npm run start:legacy`.

- Jika `DATABASE_URL` diisi → memakai PostgreSQL.
- Jika `DATABASE_URL` kosong → fallback database JSON lokal (`data/db.json`).

Akun awal dibuat otomatis:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@rantingnu.id` | `admin123` |
| Bendahara | `bendahara@rantingnu.id` | `bendahara123` |
| Petugas | `petugas@rantingnu.id` | `petugas123` |
| Pengurus | `pengurus@rantingnu.id` | `pengurus123` |

Ganti password/akun demo sebelum produksi.

## Menjalankan Lokal

Persyaratan: Node.js dan npm.

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

## Environment Server

File [.env.example](./.env.example) tersedia sebagai contoh:

```env
PORT=5173
DATABASE_URL=postgres://koin_nu_user:***@localhost:5432/koin_nu
DATA_DIR=data
UPLOADS_DIR=uploads
SESSION_TTL_MS=43200000
MAX_BODY_BYTES=2097152
```

Catatan keamanan:

- `DATABASE_URL` mengaktifkan PostgreSQL.
- Jika memakai fallback lokal, `DATA_DIR` menyimpan `db.json`; backup rutin.
- `UPLOADS_DIR` menyimpan file publik `/uploads/*`; jangan arahkan ke folder kode.
- `SESSION_TTL_MS` minimum 30 menit.
- `MAX_BODY_BYTES` dibatasi 64KB sampai 10MB.
- Jangan commit `.env.local`, `data/`, `uploads/`, atau backup database.

## Build Produksi

```bash
npm run lint
npm run test:smoke
npm run test:smoke:fastify
npm run build
```

Folder `dist` berisi aset static. Untuk fitur API/login/upload, jalankan server Node.js (`npm start`). Deploy static-only tidak mendukung API internal.

## Deploy Node.js

1. Install dependency: `npm ci`.
2. Salin `.env.example` ke `.env.local` / env platform.
3. Set `DATABASE_URL` PostgreSQL Rizquna dan `UPLOADS_DIR` persisten.
4. Jalankan validasi: `npm run lint && npm run test:smoke && npm run test:smoke:fastify`.
5. Start: `PORT=5173 npm start`.
6. Pasang reverse proxy HTTPS (Nginx/Caddy/Cloudflare Tunnel) di depan Node.
7. Pastikan `/api/db`, `/login`, `/transparansi`, dan upload foto berfungsi.

## Checklist Produksi

- [ ] `npm run lint && npm run test:smoke && npm run test:smoke:fastify` lulus.
- [ ] `.env.local` tidak masuk Git.
- [ ] `DATABASE_URL` PostgreSQL aktif, atau `DATA_DIR` fallback memakai storage persisten.
- [ ] Akun/password demo diganti atau dinonaktifkan.
- [ ] HTTPS aktif melalui reverse proxy.
- [ ] Backup PostgreSQL dijadwalkan.
- [ ] Permission filesystem dibatasi untuk user proses Node.
- [ ] Public `/api/db` tidak menampilkan data sensitif.
- [ ] Public `/api/table/profiles` menghasilkan `403`.
- [ ] Login role admin/bendahara/petugas/pengurus diuji.
- [ ] Dashboard internal berhasil dibuka.
- [ ] Dashboard publik `/transparansi` berhasil dibuka.
- [ ] Logo LAZISNU tampil normal.
- [ ] Upload bukti sudah diuji.
- [ ] Setoran petugas dan setoran ke LAZISNU sudah diuji.
- [ ] Laporan dan export sudah diuji.

