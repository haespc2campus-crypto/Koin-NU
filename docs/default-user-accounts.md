# Akun Login Bawaan

Gunakan halaman `/admin` untuk `superadmin` dan `admin`.
Gunakan halaman `/login` untuk role lainnya.

| Role | Username | Password |
| --- | --- | --- |
| Super Admin | `superadmin` | `SuperAdmin2026!` |
| Admin | `admin` | `Admin2026!` |
| Bendahara | `bendahara` | `Bendahara2026!` |
| Petugas | `petugas` | `Petugas2026!` |
| Pengurus | `pengurus` | `Pengurus2026!` |
| Editor Berita | `editor` | `Editor2026!` |

Untuk mengisi atau memperbarui akun ini ke database PostgreSQL:

```bash
npm run seed:users
```

Setelah berhasil login pertama kali, sebaiknya ganti password dari menu pengaturan.
