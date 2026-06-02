# Setup Supabase Koin NU Ranting

Panduan ini mengubah aplikasi dari mode demo menjadi memakai database Supabase. Jika konfigurasi Supabase belum diisi, aplikasi tetap berjalan dengan data demo.

## 1. Buat Project Supabase

1. Buka https://supabase.com.
2. Buat project baru.
3. Simpan `Project URL` dan `anon public key` dari menu **Project Settings > API**.

## 2. Jalankan SQL Schema

1. Buka **SQL Editor** di Supabase.
2. Salin isi file `supabase-schema.sql`.
3. Jalankan SQL tersebut.
4. Pastikan tabel berikut muncul:
   - `profiles`
   - `ranting_profile`
   - `pengurus`
   - `petugas`
   - `donatur`
   - `pengambilan_koin`
   - `verifikasi_setoran`
   - `setoran_petugas`
   - `setoran_lazisnu`
   - `penyaluran_dana`
   - `dokumentasi_kegiatan`
   - `settings`

Schema juga mengaktifkan RLS dasar, view publik aman untuk transparansi, serta dua bucket Storage untuk memisahkan bukti privat dan galeri publik.

## 3. Isi Environment

Buat file `.env.local` berdasarkan `.env.example`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Untuk aplikasi static saat ini, `npm run build` akan menulis nilai tersebut ke `dist/supabase-config.js`.

Jika menjalankan langsung dengan `npm run dev`, isi juga `supabase-config.js` secara manual:

```js
window.KOIN_NU_SUPABASE_CONFIG = {
  url: "https://your-project-ref.supabase.co",
  anonKey: "your-anon-key"
};
```

## 4. Buat User Admin Pertama

1. Buka **Authentication > Users**.
2. Tambahkan user admin dengan email dan password.
3. Ambil `id` user tersebut.
4. Jalankan SQL berikut:

```sql
insert into profiles (id, email, full_name, role, phone, status)
values (
  'USER_ID_DARI_AUTH',
  'admin@rantingnu.id',
  'Admin Ranting',
  'admin',
  '081234567890',
  'aktif'
);
```

Setelah itu admin bisa login dari halaman `/login` memakai email dan password Supabase Auth.

Untuk bendahara/petugas/pengurus, isi `role` dengan:

- `admin`
- `bendahara`
- `petugas`
- `pengurus`

## 5. Autentikasi User Asli

Aplikasi memakai Supabase Auth untuk:

- login email dan password
- menyimpan session setelah refresh browser
- logout dari Supabase dan browser lokal
- reset password melalui email Supabase
- mengambil role dari tabel `profiles`

Untuk membuat user baru:

1. Buka **Authentication > Users**.
2. Buat user dengan email dan password sementara.
3. Salin `User UID`.
4. Login sebagai admin di aplikasi.
5. Buka **Kelola User**.
6. Tambahkan profil dengan `User ID Auth`, nama lengkap, email, nomor HP, role, dan status.

Password tidak disimpan di tabel `profiles`. Jangan menaruh `service_role key` di frontend; aplikasi hanya memakai `anon public key`.

## 6. Testing Koneksi

1. Isi `.env.local`.
2. Jalankan:

```bash
npm run build
npm run dev
```

3. Buka aplikasi.
4. Jika Supabase benar, data akan diambil dari tabel Supabase.
5. Jika gagal atau env kosong, aplikasi otomatis tetap berjalan dalam mode demo.

## 7. Proteksi Role

Proteksi halaman yang sudah diterapkan:

- User belum login diarahkan ke `/login`.
- User yang sudah login diarahkan dari `/login` ke dashboard.
- Admin dapat membuka semua halaman termasuk **Kelola User** dan **Pengaturan**.
- Bendahara tidak dapat membuka **Pengaturan** dan **Kelola User**.
- Petugas tidak dapat membuka halaman admin dan hanya mengelola transaksi miliknya.
- Pengurus memakai mode lihat/pantau tanpa tombol ubah data.

## 8. Catatan Integrasi Saat Ini

Aplikasi saat ini adalah static vanilla app, bukan Next.js penuh. Karena itu:

- File `lib/supabase.ts` dan `lib/database.types.ts` sudah disiapkan untuk tahap migrasi Next/TypeScript.
- App saat ini memakai adapter REST Supabase ringan di `app.js`.
- Mode demo tetap aman sebagai fallback.
- Supabase Auth sudah terhubung di frontend dengan anon key.

## 9. Data Publik Aman

Untuk transparansi publik, gunakan view:

- `public_transparansi_pengambilan`
- `public_transparansi_penyaluran`

View ini tidak memuat nomor HP donatur, alamat detail donatur, atau data sensitif.

## 10. Upload Foto dan Dokumentasi

Jika schema awal sudah pernah dijalankan sebelumnya, buka **SQL Editor** lalu jalankan file `supabase-storage-migration.sql` satu kali.

Untuk menambahkan modul **Setoran Petugas** dan **Setor ke LAZISNU** pada database lama, jalankan juga file `supabase-setoran-migration.sql` satu kali.

Schema membuat dua bucket Storage dengan batas maksimal 2 MB:

- `koin-nu-private-evidence` untuk bukti pengambilan, setoran bendahara, dan penyaluran.
- `koin-nu-public-documentation` untuk galeri transparansi yang memang boleh dilihat warga.

Tipe file yang diterima:

- `image/jpeg`
- `image/png`
- `image/webp`

Foto yang tersimpan:

- bukti pengambilan koin pada tabel `pengambilan_koin`
- bukti setoran bendahara pada tabel `verifikasi_setoran`
- dokumentasi bantuan pada tabel `penyaluran_dana`
- dokumentasi galeri transparansi pada tabel `dokumentasi_kegiatan`

Petugas dapat mengunggah bukti transaksi lapangannya. Admin dan bendahara dapat melihat seluruh foto, sedangkan dashboard publik hanya menampilkan dokumentasi kegiatan yang memang ditujukan untuk publik.
