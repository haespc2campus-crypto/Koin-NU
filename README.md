# SIKOINNU

**Sistem Informasi Koin Nahdlatul Ulama**  
Berafiliasi dengan **NU Care-LAZISNU**  
Tagline: **Transparan, Amanah, dan Berdampak**

SIKOINNU membantu ranting NU mengelola donatur, pengambilan koin, setoran petugas, setoran ke LAZISNU, penyaluran dana, laporan, dan transparansi publik.

## Mode Demo

Jika Supabase belum dikonfigurasi, aplikasi otomatis berjalan dalam mode demo. Buka halaman login, isi email dan password bebas, lalu pilih role demo.

## Menjalankan Lokal

Persyaratan: Node.js dan npm.

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

## Environment

File [.env.example](./.env.example) tersedia sebagai contoh:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Untuk pengembangan lokal:

1. Salin `.env.example` menjadi `.env.local`.
2. Isi URL project dan anon key Supabase.
3. Jangan commit `.env.local`. File tersebut sudah masuk `.gitignore`.

Catatan: `npm run dev` membaca `supabase-config.js` dari root. Untuk menguji login asli pada server lokal, isi file tersebut secara manual. `npm run build` membaca `.env.local` dan menghasilkan `dist/supabase-config.js`.

## Setup Supabase

Checklist setup database baru:

- [ ] Buat project Supabase.
- [ ] Jalankan [supabase-schema.sql](./supabase-schema.sql) di SQL Editor.
- [ ] Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
- [ ] Buat admin pertama melalui Supabase Auth dan tabel `profiles`.
- [ ] Test login asli melalui `/login`.

Untuk database lama, jalankan migrasi tambahan:

- [supabase-storage-migration.sql](./supabase-storage-migration.sql) untuk upload foto.
- [supabase-setoran-migration.sql](./supabase-setoran-migration.sql) untuk modul setoran baru.

Panduan lebih lengkap tersedia di [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

## Build Produksi

```bash
npm run typecheck
npm run build
```

Folder `dist` adalah output siap deploy. Folder ini berisi aplikasi static, konfigurasi Supabase hasil build, logo LAZISNU, stylesheet, dan JavaScript aplikasi.

## Deploy Vercel

Cara paling sederhana untuk pemula:

1. Simpan proyek ini di repository GitHub.
2. Buka [vercel.com](https://vercel.com) dan pilih **Add New > Project**.
3. Import repository GitHub.
4. Tambahkan environment variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. Klik **Deploy**.
6. Setelah selesai, buka `/login` dan `/transparansi`.

File [vercel.json](./vercel.json) sudah mengatur perintah build, folder output `dist`, dan route SPA.

## Deploy Netlify

1. Simpan proyek ini di repository GitHub.
2. Buka [app.netlify.com](https://app.netlify.com) dan pilih **Add new site > Import an existing project**.
3. Import repository GitHub.
4. Tambahkan environment variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. Klik **Deploy site**.
6. Setelah selesai, buka `/login` dan `/transparansi`.

File [netlify.toml](./netlify.toml) sudah mengatur perintah build, folder publish `dist`, dan route SPA.

## Checklist Produksi

- [ ] Supabase project sudah dibuat.
- [ ] SQL schema sudah dijalankan.
- [ ] Env Supabase sudah diisi pada platform deploy.
- [ ] Admin pertama sudah dibuat.
- [ ] Login asli berhasil.
- [ ] Dashboard internal berhasil dibuka.
- [ ] Dashboard publik `/transparansi` berhasil dibuka.
- [ ] Logo LAZISNU tampil normal.
- [ ] Upload bukti sudah diuji.
- [ ] Setoran petugas dan setoran ke LAZISNU sudah diuji.
- [ ] Laporan dan export sudah diuji.

