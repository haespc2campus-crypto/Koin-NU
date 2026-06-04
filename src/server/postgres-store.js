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

      const profilesRanting = await client.query("select count(*)::int as count from koin_ranting_profile");
      if (!profilesRanting.rows[0].count) {
        const defaultProfile = {
          id: "default-profile",
          nama_ranting: "PRNU Karangsalam Kidul II",
          desa: "Karangsalam Kidul",
          kecamatan: "Kedungbanteng",
          kabupaten: "Banyumas",
          provinsi: "Jawa Tengah",
          alamat_sekretariat: "Jl. Lapangan Karangsalam Kidul No. 2, Kedungbanteng, Banyumas",
          phone: "0812-7000-0101",
          email: "nu.karangsalamkidul2@gmail.com",
          logo_url: "",
          masa_khidmah: "2025 - 2030"
        };
        await client.query("insert into koin_ranting_profile (id, data) values ($1, $2::jsonb) on conflict do nothing", [defaultProfile.id, JSON.stringify(defaultProfile)]);
      }

      const boardMembersCount = await client.query("select count(*)::int as count from koin_pengurus");
      if (!boardMembersCount.rows[0].count) {
        const defaultBoardMembers = [
          { id: "401", nama: "Kiai Masruri", jabatan: "Rais Syuriah", phone: "0812-8100-0011", alamat: "Grumbul Kaliputra RT 01/RW 03", foto_url: "", status: "aktif" },
          { id: "402", nama: "Kiai Ahmad Hambali", jabatan: "Katib Syuriah", phone: "0857-8100-0022", alamat: "Grumbul Karangtawang RT 02/RW 03", foto_url: "", status: "aktif" },
          { id: "403", nama: "KH. Muhammad Sholeh", jabatan: "Ketua Tanfidziyah", phone: "0812-8100-0101", alamat: "Jl. Lapangan Karangsalam Kidul No. 4", foto_url: "", status: "aktif" },
          { id: "404", nama: "M. Rasyid Ridho", jabatan: "Sekretaris", phone: "0821-8100-0303", alamat: "Jl. Lapangan Karangsalam Kidul No. 8", foto_url: "", status: "aktif" },
          { id: "405", nama: "Hj. Lailatul Badriyah", jabatan: "Bendahara", phone: "0881-8100-0505", alamat: "Gang Kenanga RT 05/RW 04", foto_url: "", status: "aktif" },
          { id: "406", nama: "Siti Maimunah", jabatan: "Wakil Bendahara", phone: "0878-8100-0606", alamat: "Jl. Lapangan Selatan RT 06/RW 05", foto_url: "", status: "aktif" },
          { id: "407", nama: "Miftahul Huda", jabatan: "Admin Sistem", phone: "0819-8100-0707", alamat: "Balai Ranting NU", foto_url: "", status: "aktif" }
        ];
        for (const item of defaultBoardMembers) {
          await client.query("insert into koin_pengurus (id, data) values ($1, $2::jsonb) on conflict do nothing", [item.id, JSON.stringify(item)]);
        }
      }

      const newsCount = await client.query("select count(*)::int as count from koin_berita");
      if (!newsCount.rows[0].count) {
        const defaultNews = [
          { id: "801", judul: "Lailatul Ijtima' PRNU Karangsalam Kidul II Perkuat Silaturahmi & Koin NU", kategori: "Kegiatan Ranting", tanggal: "2026-05-26", ringkasan: "Kegiatan rutin bulanan Lailatul Ijtima' diisi dengan Istighotsah bersama dan penyerahan Koin NU Ranting.", konten: "Lailatul Ijtima' kembali digelar oleh Pengurus Ranting Nahdlatul Ulama Karangsalam Kidul II. Bertempat di Masjid Baiturrahman RT 03/RW 03, acara ini dihadiri puluhan warga Nahdliyin. Selain Istighotsah dan yasin tahlil rutin, pertemuan ini juga dimanfaatkan untuk melaporkan secara transparan perolehan Koin NU bulan ini kepada seluruh jemaah, yang nantinya dialihkan untuk program sosial ranting.", gambar_url: "https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&w=900&q=82", status: "published" },
          { id: "802", judul: "LAZISNU Ranting Salurkan Santunan Bulanan untuk Anak Yatim dan Lansia", kategori: "Sosial", tanggal: "2026-05-20", ringkasan: "Penyaluran dana Koin NU berupa santunan sembako dan biaya sekolah untuk warga yang membutuhkan.", konten: "LAZISNU Ranting Karangsalam Kidul II mendistribusikan santunan bulanan kepada belasan anak yatim dan warga lanjut usia kurang mampu di wilayah RT 01 sampai RT 06. Bantuan ini bersumber sepenuhnya dari Koin NU kemasan kaleng yang dikumpulkan secara gotong royong oleh para donatur setia setiap bulannya.", gambar_url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=82", status: "published" },
          { id: "803", judul: "Rutinan Yasin & Tahlil IPNU IPPNU Karangsalam Kidul II Aktif Kembali", kategori: "Organisasi", tanggal: "2026-05-16", ringkasan: "Rekan-rekanita IPNU-IPPNU giatkan rutinan mingguan demi menjaga tradisi Aswaja di kalangan remaja.", konten: "Ikatan Pelajar Nahdlatul Ulama (IPNU) dan Ikatan Pelajar Putri Nahdlatul Ulama (IPPNU) Ranting Karangsalam Kidul II mengadakan rutinan yasinan dan tahlilan bertempat di rumah kader secara bergiliran. Selain memperdalam pembacaan tahlil, kegiatan ini diselingi dengan diskusi kepemimpinan organisasi untuk mempersiapkan kader muda masa depan.", gambar_url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=82", status: "published" },
          { id: "804", judul: "GP Ansor & Banser Gotong Royong Aksi Bersih Masjid & Mushola Ranting", kategori: "Kegiatan Ranting", tanggal: "2026-05-12", ringkasan: "Anggota Banser dan GP Ansor bergotong royong membersihkan tempat ibadah menyambut bulan Ramadhan.", konten: "GP Ansor Ranting Karangsalam Kidul II bersama satuan Banser bahu-membahu membersihkan area utama Masjid Baiturrahman dan beberapa mushola sekitar. Kegiatan ini bertujuan menciptakan kenyamanan ibadah bagi warga serta memupuk semangat kebersamaan pemuda NU.", gambar_url: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=900&q=82", status: "published" },
          { id: "805", judul: "SIKOINNU Resmi Diluncurkan untuk Transparansi Koin NU Ranting", kategori: "Organisasi", tanggal: "2026-05-08", ringkasan: "Digitalisasi administrasi Koin NU resmi digunakan untuk pencatatan donasi yang amanah.", konten: "Pengurus Ranting NU Karangsalam Kidul II secara resmi memperkenalkan Sistem Informasi Koin NU (SIKOINNU) sebagai langkah digitalisasi organisasi. Melalui sistem ini, setiap pengambilan koin akan tercatat dengan QR code unik, dan laporan penyalurannya dipaparkan secara berkala pada portal transparansi publik.", gambar_url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=82", status: "published" },
          { id: "806", judul: "Muslimat NU Karangsalam Kidul II Gelar Pelatihan UMKM Kuliner Halal", kategori: "Sosial", tanggal: "2026-05-02", ringkasan: "Ibu-ibu Muslimat NU dilatih membuat produk makanan olahan bernilai jual tinggi dengan sertifikasi halal.", konten: "Muslimat NU Ranting Karangsalam Kidul II mengadakan pelatihan pembuatan aneka jajanan pasar dan produk kuliner lokal di Sekretariat Ranting. Pelatihan ini juga membekali peserta dengan tata cara pengajuan sertifikasi halal mandiri, guna meningkatkan kemandirian ekonomi keluarga Nahdliyin.", gambar_url: "https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&w=900&q=82", status: "published" }
        ];
        for (const item of defaultNews) {
          await client.query("insert into koin_berita (id, data) values ($1, $2::jsonb) on conflict do nothing", [item.id, JSON.stringify(item)]);
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
