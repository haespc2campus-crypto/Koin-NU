# Audit dan Roadmap Portal Layanan Warga NU Karangsalam Kidul II

Tanggal audit: 2026-06-06

## 1. Audit Website yang Ada

Website saat ini adalah aplikasi SPA berbasis Vite dengan server Fastify. Aplikasi sudah memiliki dua wajah utama:

- Website publik PRNU Karangsalam Kidul II.
- Sistem internal SIKOINNU untuk pengelolaan Koin NU, donatur, petugas, verifikasi, laporan, berita, pengurus, dan pengaturan.

Fitur lama yang harus dipertahankan:

- Landing page PRNU dengan hero, profil, program, agenda, galeri, berita, donasi, kontak.
- Sub-portal Banom melalui `/banom/:slug`.
- Transparansi publik melalui `/transparansi` atau `/publik`.
- Login internal melalui `/login`.
- Login admin khusus melalui `/admin`.
- Dashboard internal role admin, bendahara, petugas, pengurus.
- CRUD donatur, petugas, pengambilan koin, verifikasi, setoran petugas, setoran LAZISNU, penyaluran dana.
- CRUD profil ranting, pengurus, berita, dokumentasi, pengguna, dan pengaturan.
- Upload gambar lokal ke `/uploads`.
- QR Code donatur dan scanner.
- PWA dasar melalui `manifest.json` dan `sw.js`.

Temuan teknis:

- Routing publik dan internal masih dikelola di `app.js`.
- Banyak UI admin berada dalam satu file besar `src/ui/pages/admin-features.js`.
- Database PostgreSQL saat ini memakai pola tabel JSONB per entitas, contoh `koin_berita`, `koin_donatur`, `koin_pengambilan_koin`.
- API CRUD masih generik melalui `/api/table/:table/:id?`.
- Role saat ini: `admin`, `bendahara`, `petugas`, `pengurus`.
- SEO masih terbatas pada meta dasar di `index.html` dan belum ada route SSR untuk artikel/UMKM/kegiatan.
- Belum ada `robots.txt` dan sitemap otomatis.

Risiko utama:

- SPA murni kurang ideal untuk SEO artikel, UMKM, dan kegiatan jika Google tidak mengeksekusi JavaScript secara optimal.
- API generik cocok untuk fase awal, tetapi untuk portal warga yang scalable perlu endpoint domain-specific.
- Role baru seperti Super Admin dan Editor Berita belum ada di server maupun UI.
- Struktur data JSONB fleksibel tetapi perlu indeks, validasi, dan kontrak field yang lebih ketat.

## 2. Daftar File yang Perlu Diubah

Fase fondasi:

- `app.js` - tambah route publik baru dan route admin modular.
- `src/ui/state.js` - tambah role, tabel, data publik, dan state filter.
- `src/server/core.js` - tambah tabel, role, permission, sanitasi data.
- `src/server/schema.js` - tambah definisi tabel Drizzle JSONB baru.
- `src/server/validation.js` - tambah validasi endpoint baru.
- `src/server/routes.js` - tambah endpoint publik SEO, sitemap, robots, dan endpoint domain-specific.
- `migrations/002_portal_layanan_tables.sql` - migrasi tabel portal baru.
- `styles.css` - komponen mobile-first baru.

Fase modularisasi UI:

- `src/ui/pages/landing.js` - perlu dipecah agar lebih ringan.
- `src/ui/pages/admin-features.js` - perlu dipecah per modul.
- Tambahan yang disarankan:
  - `src/ui/pages/public-home.js`
  - `src/ui/pages/profile.js`
  - `src/ui/pages/events.js`
  - `src/ui/pages/citizen-services.js`
  - `src/ui/pages/umkm.js`
  - `src/ui/pages/articles.js`
  - `src/ui/pages/downloads.js`
  - `src/ui/pages/contact.js`
  - `src/ui/admin/events-admin.js`
  - `src/ui/admin/umkm-admin.js`
  - `src/ui/admin/downloads-admin.js`
  - `src/ui/admin/citizen-services-admin.js`

SEO/PWA:

- `public/robots.txt`
- endpoint `/sitemap.xml`
- helper SEO baru: `src/server/seo.js`
- optional: `src/ui/seo.js` untuk canonical dan structured data di client.

## 3. Desain Database Baru

Tetap aman untuk fase awal: lanjutkan pola `koin_*` JSONB agar tidak merusak data lama, tetapi tambah tabel baru dan indeks.

Tabel lama yang dipertahankan:

- `koin_profiles`
- `koin_ranting_profile`
- `koin_pengurus`
- `koin_petugas`
- `koin_donatur`
- `koin_pengambilan_koin`
- `koin_verifikasi_setoran`
- `koin_setoran_petugas`
- `koin_setoran_lazisnu`
- `koin_penyaluran_dana`
- `koin_dokumentasi_kegiatan`
- `koin_berita`
- `koin_settings`

Tabel baru:

- `koin_pengumuman`
- `koin_kegiatan`
- `koin_layanan_kematian`
- `koin_jadwal_tahlil`
- `koin_pengajuan_bantuan`
- `koin_masjid_mushola`
- `koin_umkm`
- `koin_produk_umkm`
- `koin_download`
- `koin_download_log`
- `koin_artikel`
- `koin_kontak_masuk`
- `koin_program_kerja`
- `koin_lpj_kegiatan`
- `koin_dokumen_publik`

Kontrak field ringkas:

- Pengumuman: `judul`, `isi`, `tanggal_mulai`, `tanggal_selesai`, `status`, `prioritas`.
- Kegiatan: `judul`, `slug`, `kategori`, `tanggal_mulai`, `tanggal_selesai`, `lokasi`, `deskripsi`, `foto_url`, `status`, `organisasi`.
- Layanan kematian: `nama_almarhum`, `alamat`, `hari_wafat`, `rumah_duka`, `kontak_keluarga`, `status_publikasi`.
- Jadwal tahlil: `layanan_kematian_id`, `hari_ke`, `tanggal`, `waktu`, `lokasi`.
- UMKM: `nama_usaha`, `slug`, `pemilik`, `alamat`, `whatsapp`, `produk`, `foto_url`, `kategori`, `deskripsi`, `status`.
- Artikel: `judul`, `slug`, `kategori`, `konten`, `excerpt`, `meta_title`, `meta_description`, `og_image`, `status`, `published_at`, `author_id`.
- Download: `judul`, `slug`, `kategori`, `file_url`, `file_name`, `download_count`, `status`.

Indeks penting:

- `slug` untuk artikel, kegiatan, UMKM, download.
- `status` untuk konten publik.
- `kategori` untuk filter.
- `published_at` / `tanggal_mulai` untuk sorting.

## 4. Struktur Menu Baru

Publik:

- Beranda
- Profil
- Kegiatan
- Layanan Warga
- Koin NU
- UMKM Warga
- Artikel & Berita
- Transparansi
- Download
- Kontak

Internal admin:

- Dashboard
- Konten Publik
- Kegiatan
- Layanan Warga
- Koin NU
- UMKM
- Artikel & Berita
- Transparansi
- Download
- Pengurus & Banom
- Pengguna
- Pengaturan

## 5. Implementasi Bertahap

Tahap 1 - Fondasi tanpa merusak fitur lama:

- Tambah tabel portal baru.
- Tambah role `super_admin` dan `editor_berita`.
- Tambah endpoint publik untuk home, artikel, kegiatan, UMKM, download.
- Tambah `robots.txt` dan `sitemap.xml`.
- Tambah route publik baru tetapi tetap pertahankan landing lama.

Tahap 2 - Beranda portal:

- Tambah pengumuman penting.
- Tambah kegiatan terdekat.
- Tambah UMKM unggulan.
- Tambah CTA WhatsApp dan Donasi.
- Pakai data lama untuk statistik Koin NU.

Tahap 3 - Modul layanan warga:

- CRUD layanan kematian.
- CRUD jadwal tahlil.
- CRUD pengajuan bantuan.
- Direktori masjid/mushola.

Tahap 4 - UMKM warga:

- Direktori kartu responsif.
- Detail UMKM berbasis slug.
- Admin CRUD UMKM.

Tahap 5 - Artikel/berita SEO:

- Slug otomatis.
- Meta title/description.
- Open Graph.
- Breadcrumb.
- JSON-LD Article.
- Sitemap dinamis.

Tahap 6 - Refactor UI besar:

- Pecah `landing.js`.
- Pecah `admin-features.js`.
- Buat komponen card, table, form, media upload yang reusable.

## 6. Daftar Migration Database

Migration yang disarankan:

- `002_portal_layanan_tables.sql`
  - tambah tabel portal baru.
  - tambah indeks JSONB expression.
- `003_roles_permissions.sql`
  - seed role baru di data profiles jika perlu.
  - tidak mengubah password existing.
- `004_seo_indexes.sql`
  - indeks slug/status/published_at.
- `005_content_seed.sql`
  - seed kategori artikel, kategori UMKM, kategori download, kategori kegiatan.

Contoh pola migration:

```sql
create table if not exists koin_umkm (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists koin_umkm_slug_idx
  on koin_umkm ((lower(data->>'slug')));

create index if not exists koin_umkm_status_idx
  on koin_umkm ((data->>'status'));
```

## 7. Daftar API Endpoint

Endpoint lama yang dipertahankan:

- `GET /api/health`
- `POST /api/login`
- `GET|POST /api/logout`
- `GET /api/db`
- `POST /api/change-password`
- `POST /api/admin/reset-password`
- `POST /api/upload`
- `GET|POST|DELETE /api/table/:table/:id?`

Endpoint baru publik:

- `GET /api/public/home`
- `GET /api/public/articles`
- `GET /api/public/articles/:slug`
- `GET /api/public/news`
- `GET /api/public/events`
- `GET /api/public/events/:slug`
- `GET /api/public/umkm`
- `GET /api/public/umkm/:slug`
- `GET /api/public/downloads`
- `GET /api/public/transparency`
- `POST /api/public/contact`
- `GET /sitemap.xml`
- `GET /robots.txt`

Endpoint baru internal:

- `GET|POST|DELETE /api/admin/events/:id?`
- `GET|POST|DELETE /api/admin/citizen-services/death/:id?`
- `GET|POST|DELETE /api/admin/citizen-services/aid/:id?`
- `GET|POST|DELETE /api/admin/masjid-mushola/:id?`
- `GET|POST|DELETE /api/admin/umkm/:id?`
- `GET|POST|DELETE /api/admin/articles/:id?`
- `GET|POST|DELETE /api/admin/downloads/:id?`
- `GET /api/admin/contact-messages`

## 8. Kode Lengkap

Kode lengkap belum dibuat pada dokumen audit ini karena instruksi meminta analisis struktur proyek terlebih dahulu dan tidak menghapus kode lama.

Rencana kode lengkap fase pertama:

- Tambah migration `002_portal_layanan_tables.sql`.
- Tambah tabel baru di `src/server/schema.js`.
- Tambah daftar tabel baru di `src/server/core.js`.
- Tambah permission role baru.
- Tambah endpoint SEO publik.
- Tambah halaman publik minimal untuk UMKM, kegiatan, artikel, download.

## 9. Panduan Deployment

Alur deploy yang disarankan:

```bash
cd /home/rizqunaid/nukarangsalam2-koinnu
git pull origin main
npm install
npm run typecheck
npm run build
pm2 restart sikoinnu --update-env
pm2 save
```

Sebelum migration:

```bash
cp .env .env.backup-$(date +%Y%m%d-%H%M%S)
pg_dump "$DATABASE_URL" > backup-before-portal-$(date +%Y%m%d-%H%M%S).sql
```

Setelah migration:

```bash
npm run db:check
curl http://127.0.0.1:8083/api/health
curl http://127.0.0.1:8083/sitemap.xml
curl http://127.0.0.1:8083/robots.txt
```

## 10. Checklist SEO Setelah Implementasi

Wajib index:

- Halaman artikel.
- Halaman berita.
- Halaman UMKM.
- Halaman kegiatan.
- Halaman profil publik.

Wajib noindex:

- `/admin`
- `/login`
- `/dashboard`
- `/donatur`
- `/users`
- `/pengaturan`
- semua halaman data internal.

Checklist:

- `robots.txt` tersedia.
- `sitemap.xml` otomatis berisi konten published.
- Setiap halaman publik punya canonical URL.
- Artikel punya JSON-LD `Article`.
- UMKM punya JSON-LD `LocalBusiness` atau `Product` sesuai konteks.
- Kegiatan punya JSON-LD `Event`.
- Open Graph title, description, dan image tersedia.
- Gambar utama pakai alt text.
- Slug unik dan readable.
- Halaman mobile lulus tampilan dasar.
- Ukuran gambar dikompresi.
- Dashboard internal tidak masuk sitemap.

## Rekomendasi Keputusan

Mulai implementasi dari Tahap 1 dan 2:

1. Tambah migration dan tabel portal baru.
2. Tambah endpoint publik SEO (`robots.txt`, `sitemap.xml`, public articles/events/umkm).
3. Tambah blok Beranda Portal tanpa menghapus landing lama.
4. Setelah stabil, lanjut modul Layanan Warga dan UMKM.

