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

      const defaultBoardMembers = [
        { id: "401", nama: "Kiai Masruri", jabatan: "Rais Syuriah", phone: "0812-8100-0011", alamat: "Grumbul Kaliputra RT 01/RW 03", foto_url: "", status: "aktif", organisasi: "ranting", term: "2025 - 2030" },
        { id: "402", nama: "Kiai Ahmad Hambali", jabatan: "Katib Syuriah", phone: "0857-8100-0022", alamat: "Grumbul Karangtawang RT 02/RW 03", foto_url: "", status: "aktif", organisasi: "ranting", term: "2025 - 2030" },
        { id: "403", nama: "KH. Muhammad Sholeh", jabatan: "Ketua Tanfidziyah", phone: "0812-8100-0101", alamat: "Jl. Lapangan Karangsalam Kidul No. 4", foto_url: "", status: "aktif", organisasi: "ranting", term: "2025 - 2030" },
        { id: "404", nama: "M. Rasyid Ridho", jabatan: "Sekretaris", phone: "0821-8100-0303", alamat: "Jl. Lapangan Karangsalam Kidul No. 8", foto_url: "", status: "aktif", organisasi: "ranting", term: "2025 - 2030" },
        { id: "405", nama: "Hj. Lailatul Badriyah", jabatan: "Bendahara", phone: "0881-8100-0505", alamat: "Gang Kenanga RT 05/RW 04", foto_url: "", status: "aktif", organisasi: "ranting", term: "2025 - 2030" },
        { id: "406", nama: "Siti Maimunah", jabatan: "Wakil Bendahara", phone: "0878-8100-0606", alamat: "Jl. Lapangan Selatan RT 06/RW 05", foto_url: "", status: "aktif", organisasi: "ranting", term: "2025 - 2030" },
        { id: "407", nama: "Miftahul Huda", jabatan: "Admin Sistem", phone: "0819-8100-0707", alamat: "Balai Ranting NU", foto_url: "", status: "aktif", organisasi: "ranting", term: "2025 - 2030" },
        { id: "408", nama: "Hj. Aminah Zahra", jabatan: "Ketua", phone: "0812-8200-0101", alamat: "Grumbul Kaliputra RT 02", foto_url: "", status: "aktif", organisasi: "muslimat", term: "2025 - 2030" },
        { id: "409", nama: "Ibu Siti Rohmah", jabatan: "Sekretaris", phone: "0821-8200-0202", alamat: "RT 03 RW 03", foto_url: "", status: "aktif", organisasi: "muslimat", term: "2025 - 2030" },
        { id: "410", nama: "Sahabat Nisa Aulia", jabatan: "Ketua", phone: "0857-8200-0303", alamat: "Gang Melati RT 01", foto_url: "", status: "aktif", organisasi: "fatayat", term: "2025 - 2030" },
        { id: "411", nama: "Sahabat Faris Maulana", jabatan: "Ketua PAC/Ranting", phone: "0812-8200-0404", alamat: "Jl. Lapangan Barat RT 04", foto_url: "", status: "aktif", organisasi: "gp-ansor", term: "2025 - 2030" },
        { id: "412", nama: "Komandan Joko Prasetyo", jabatan: "Kasatkoryan Banser", phone: "0856-8200-0505", alamat: "RT 06 RW 05", foto_url: "", status: "aktif", organisasi: "gp-ansor", term: "2025 - 2030" },
        { id: "413", nama: "Rekan Fahmi Hidayat", jabatan: "Ketua", phone: "0813-8200-0606", alamat: "RT 05 RW 04", foto_url: "", status: "aktif", organisasi: "ipnu", term: "2026 - 2028" },
        { id: "414", nama: "Rekanita Aulia Rahma", jabatan: "Ketua", phone: "0877-8200-0707", alamat: "RT 02 RW 03", foto_url: "", status: "aktif", organisasi: "ippnu", term: "2026 - 2028" },
        { id: "415", nama: "Kang Ahmad Fauzan", jabatan: "Ketua / Pendekar", phone: "0819-8200-0808", alamat: "Padepokan Silat RT 01", foto_url: "", status: "aktif", organisasi: "pagar-nusa", term: "2025 - 2030" },
        { id: "416", nama: "Kiai M. Hamid", jabatan: "Mursyid / Ketua", phone: "0812-8200-0909", alamat: "Pesantren Al-Muttaqin RT 03", foto_url: "", status: "aktif", organisasi: "jatman", term: "2025 - 2030" },
        { id: "417", nama: "Ustadz H. Syarifuddin", jabatan: "Ketua Jam'iyyah", phone: "0821-8200-1010", alamat: "Masjid Baiturrahman RT 03", foto_url: "", status: "aktif", organisasi: "jqh", term: "2025 - 2030" },
        { id: "418", nama: "Bapak Wahyudi, M.Pd.", jabatan: "Ketua", phone: "0852-8200-1111", alamat: "Perum Guru Indah RT 05", foto_url: "", status: "aktif", organisasi: "pergunu", term: "2025 - 2030" }
      ];
      for (const item of defaultBoardMembers) {
        await client.query("insert into koin_pengurus (id, data) values ($1, $2::jsonb) on conflict do nothing", [item.id, JSON.stringify(item)]);
      }

      const defaultNews = [
        { id: "801", judul: "Lailatul Ijtima' PRNU Karangsalam Kidul II Perkuat Silaturahmi & Koin NU", kategori: "Kegiatan Ranting", tanggal: "2026-05-26", ringkasan: "Kegiatan rutin bulanan Lailatul Ijtima' diisi dengan Istighotsah bersama dan penyerahan Koin NU Ranting.", konten: "Lailatul Ijtima' kembali digelar oleh Pengurus Ranting Nahdlatul Ulama Karangsalam Kidul II. Bertempat di Masjid Baiturrahman RT 03/RW 03, acara ini dihadiri puluhan warga Nahdliyin. Selain Istighotsah dan yasin tahlil rutin, pertemuan ini juga dimanfaatkan untuk melaporkan secara transparan perolehan Koin NU bulan ini kepada seluruh jemaah, yang nantinya dialihkan untuk program sosial ranting.", gambar_url: "/galeri-pengajian-selapanan.jpg", status: "published", organisasi: "ranting" },
        { id: "802", judul: "LAZISNU Ranting Salurkan Santunan Bulanan untuk Anak Yatim dan Lansia", kategori: "Sosial", tanggal: "2026-05-20", ringkasan: "Penyaluran dana Koin NU berupa santunan sembako dan biaya sekolah untuk warga yang membutuhkan.", konten: "LAZISNU Ranting Karangsalam Kidul II mendistribusikan santunan bulanan kepada belasan anak yatim dan warga lanjut usia kurang mampu di wilayah RT 01 sampai RT 06. Bantuan ini bersumber sepenuhnya dari Koin NU kemasan kaleng yang dikumpulkan secara gotong royong oleh para donatur setia setiap bulannya.", gambar_url: "/galeri-santunan-dhuafa.jpg", status: "published", organisasi: "ranting" },
        { id: "803", judul: "Rutinan Yasin & Tahlil IPNU IPPNU Karangsalam Kidul II Aktif Kembali", kategori: "Organisasi", tanggal: "2026-05-16", ringkasan: "Rekan-rekanita IPNU-IPPNU giatkan rutinan mingguan demi menjaga tradisi Aswaja di kalangan remaja.", konten: "Ikatan Pelajar Nahdlatul Ulama (IPNU) dan Ikatan Pelajar Putri Nahdlatul Ulama (IPPNU) Ranting Karangsalam Kidul II mengadakan rutinan yasinan dan tahlilan bertempat di rumah kader secara bergiliran. Selain memperdalam pembacaan tahlil, kegiatan ini diselingi dengan diskusi kepemimpinan organisasi untuk mempersiapkan kader muda masa depan.", gambar_url: "/galeri-ipnu-ippnu.jpg", status: "published", organisasi: "ipnu" },
        { id: "804", judul: "GP Ansor & Banser Gotong Royong Aksi Bersih Masjid & Mushola Ranting", kategori: "Kegiatan Ranting", tanggal: "2026-05-12", ringkasan: "Anggota Banser dan GP Ansor bergotong royong membersihkan tempat ibadah menyambut bulan Ramadhan.", konten: "GP Ansor Ranting Karangsalam Kidul II bersama satuan Banser bahu-membahu membersihkan area utama Masjid Baiturrahman dan beberapa mushola sekitar. Kegiatan ini bertujuan menciptakan kenyamanan ibadah bagi warga serta memupuk semangat kebersamaan pemuda NU.", gambar_url: "/galeri-bakti-sosial-ansor.jpg", status: "published", organisasi: "gp-ansor" },
        { id: "805", judul: "SIKOINNU Resmi Diluncurkan untuk Transparansi Koin NU Ranting", kategori: "Organisasi", tanggal: "2026-05-08", ringkasan: "Digitalisasi administrasi Koin NU resmi digunakan untuk pencatatan donasi yang amanah.", konten: "Pengurus Ranting NU Karangsalam Kidul II secara resmi memperkenalkan Sistem Informasi Koin NU (SIKOINNU) sebagai langkah digitalisasi organisasi. Melalui sistem ini, setiap pengambilan koin akan tercatat dengan QR code unik, dan laporan penyalurannya dipaparkan secara berkala pada portal transparansi publik.", gambar_url: "/galeri-koin-nu-collection.jpg", status: "published", organisasi: "ranting" },
        { id: "806", judul: "Muslimat NU Karangsalam Kidul II Gelar Pelatihan UMKM Kuliner Halal", kategori: "Sosial", tanggal: "2026-05-02", ringkasan: "Ibu-ibu Muslimat NU dilatih membuat produk makanan olahan bernilai jual tinggi dengan sertifikasi halal.", konten: "Muslimat NU Ranting Karangsalam Kidul II mengadakan pelatihan pembuatan aneka jajanan pasar dan produk kuliner lokal di Sekretariat Ranting. Pelatihan ini juga membekali peserta dengan tata cara pengajuan sertifikasi halal mandiri, guna meningkatkan kemandirian ekonomi keluarga Nahdliyin.", gambar_url: "/galeri-pengajian-selapanan.jpg", status: "published", organisasi: "muslimat" },
        { id: "807", judul: "Fatayat NU Karangsalam Kidul II Gelar Penyuluhan Pencegahan Stunting", kategori: "Kesehatan & Sosial", tanggal: "2026-05-24", ringkasan: "Upaya preventif menekan angka stunting dengan memberikan edukasi gizi seimbang bagi ibu hamil dan balita.", konten: "Fatayat NU Ranting Karangsalam Kidul II bekerja sama dengan bidan desa setempat menggelar penyuluhan gizi buruk dan stunting bagi ibu muda serta calon pengantin Nahdliyin. Acara ini membagikan tips menu MPASI sehat ekonomis dengan memanfaatkan hasil kebun sendiri. Ketua Fatayat Sahabat Nisa Aulia menegaskan bahwa kesehatan anak adalah pilar utama kemajuan generasi Nahdliyin masa depan.", gambar_url: "/galeri-santunan-dhuafa.jpg", status: "published", organisasi: "fatayat" },
        { id: "808", judul: "Latihan Kepemimpinan IPPNU Ranting Lahirkan Kader Putri yang Mandiri & Agamis", kategori: "Kaderisasi", tanggal: "2026-05-18", ringkasan: "Kegiatan LAKMUD melatih kecerdasan berorganisasi dan keteguhan memegang ajaran Aswaja.", konten: "Ikatan Pelajar Putri Nahdlatul Ulama (IPPNU) Karangsalam Kidul II sukses menyelenggarakan Latihan Kader Muda (LAKMUD) selama dua hari di madrasah Ranting. Kegiatan ini diisi dengan pelatihan public speaking, tata kelola sidang, serta penguatan wawasan kepemimpinan perempuan dalam Islam. Rekanita Aulia Rahma menyatakan harapannya agar lulusan LAKMUD dapat menjadi pelopor literasi dan akhlak mulia.", gambar_url: "/galeri-ipnu-ippnu.jpg", status: "published", organisasi: "ippnu" },
        { id: "809", judul: "Pagar Nusa Ranting Karangsalam Kidul II Gelar Ujian Kenaikan Tingkat Sabuk", kategori: "Seni Bela Diri & Olahraga", tanggal: "2026-05-15", ringkasan: "Sebanyak 35 santri pesilat mengikuti ujian kenaikan tingkat dengan materi ketahanan fisik dan jurus aswaja.", konten: "Pagar Nusa Ranting Karangsalam Kidul II menyelenggarakan Ujian Kenaikan Tingkat (UKT) bagi 35 santri binaannya di halaman Balai Ranting. Ujian ini menguji penguasaan jurus bela diri, ketahanan fisik, serta kedisiplinan mental dan pemahaman bela negara. Kang Ahmad Fauzan selaku ketua menekankan bahwa pesilat Pagar Nusa tidak hanya tangguh secara fisik tapi juga santun secara akhlak dan setia mengawal para kiai.", gambar_url: "/galeri-bakti-sosial-ansor.jpg", status: "published", organisasi: "pagar-nusa" },
        { id: "810", judul: "Rutinan Istighotsah & Dzikir Ghofilin JATMAN Ranting Pererat Ukhuwah Bathiniyah", kategori: "Keagamaan", tanggal: "2026-05-10", ringkasan: "Jamaah tarekat berkumpul melantunkan dzikir bersama demi kedamaian bangsa dan keselamatan umat.", konten: "Jam'iyyah Ahli Thariqah al-Mu'tabarah an-Nahdliyyah (JATMAN) Ranting Karangsalam Kidul II mengadakan pengajian rutinan Istighotsah dan Dzikir Ghofilin di Masjid Baiturrahman. Acara ini dipimpin langsung oleh Kiai M. Hamid dan dihadiri ratusan jamaah. Pengajian tarekat ini bertujuan membersihkan hati (tazkiyatun nafs) serta mendoakan kedamaian umat, kemakmuran desa, dan kelancaran program Koin NU.", gambar_url: "/galeri-pengajian-selapanan.jpg", status: "published", organisasi: "jatman" },
        { id: "811", judul: "JQH NU Karangsalam Kidul II Wisuda 15 Santri Hafizh Juz Amma Metode Murottal", kategori: "Pendidikan & Keagamaan", tanggal: "2026-05-05", ringkasan: "Jam'iyyatul Qurra wal Huffazh apresiasi pencapaian santri TPQ penghafal Al-Qur'an tingkat Ranting.", konten: "Jam'iyyatul Qurra wal Huffazh (JQH) Ranting Karangsalam Kidul II menggelar wisuda tahfizh Juz Amma bagi 15 santri cilik dari TPQ Al-Hikmah. Prosesi wisuda diawali dengan semaan Al-Qur'an bil ghoib oleh pengurus JQH. Ustadz H. Syarifuddin menyatakan wisuda ini bagian dari program jangka panjang melahirkan satu hafidz Al-Qur'an di setiap keluarga Nahdliyin.", gambar_url: "/galeri-rapat-pengurus.jpg", status: "published", organisasi: "jqh" },
        { id: "812", judul: "Pergunu Ranting Sukses Selenggarakan Workshop Media Pembelajaran Interaktif Guru", kategori: "Pendidikan", tanggal: "2026-04-28", ringkasan: "Pelatihan pemanfaatan teknologi digital untuk guru-guru madrasah ibtidaiyah dan diniyah di lingkungan NU.", konten: "Persatuan Guru Nahdlatul Ulama (Pergunu) Ranting Karangsalam Kidul II mengadakan workshop peningkatan kompetensi guru bertema pembelajaran interaktif berbasis multimedia. Diikuti oleh 20 pendidik dari TPQ dan Madrasah Diniyah sekitar, workshop ini membedah metode presentasi inovatif dan kuis interaktif kelas. Bapak Wahyudi, M.Pd. berharap dengan penguasaan teknologi ini, guru-guru NU makin kreatif mendidik santri.", gambar_url: "/galeri-rapat-pengurus.jpg", status: "published", organisasi: "pergunu" }
      ];
      for (const item of defaultNews) {
        await client.query("insert into koin_berita (id, data) values ($1, $2::jsonb) on conflict do nothing", [item.id, JSON.stringify(item)]);
      }

      const defaultGallery = [
        { id: "501", judul: "Pengajian Selapanan & Kajian Aswaja", kategori: "Pengajian", tanggal: "2026-05-26", foto_nama: "galeri-pengajian-selapanan.jpg", foto_url: "/galeri-pengajian-selapanan.jpg", organisasi: "ranting" },
        { id: "502", judul: "Penyaluran Sembako & Santunan Dhuafa", kategori: "Bakti Sosial", tanggal: "2026-05-20", foto_nama: "galeri-santunan-dhuafa.jpg", foto_url: "/galeri-santunan-dhuafa.jpg", organisasi: "ranting" },
        { id: "503", judul: "Bakti Sosial GP Ansor — Bersih Masjid", kategori: "Kepemudaan", tanggal: "2026-05-12", foto_nama: "galeri-bakti-sosial-ansor.jpg", foto_url: "/galeri-bakti-sosial-ansor.jpg", organisasi: "gp-ansor" },
        { id: "504", judul: "Rapat Pleno Pengurus Ranting 2026", kategori: "Kegiatan Ranting", tanggal: "2026-05-16", foto_nama: "galeri-rapat-pengurus.jpg", foto_url: "/galeri-rapat-pengurus.jpg", organisasi: "ranting" },
        { id: "505", judul: "Halal Bihalal & Silaturahim Warga Nahdliyin", kategori: "Kegiatan Ranting", tanggal: "2026-04-10", foto_nama: "galeri-halal-bihalal.jpg", foto_url: "/galeri-halal-bihalal.jpg", organisasi: "ranting" },
        { id: "506", judul: "Santunan Anak Yatim Bulanan — Mei 2026", kategori: "Santunan", tanggal: "2026-05-30", foto_nama: "galeri-santunan-yatim.jpg", foto_url: "/galeri-santunan-yatim.jpg", organisasi: "ranting" },
        { id: "507", judul: "Kajian Kitab & Rutinan IPNU-IPPNU", kategori: "Kepemudaan", tanggal: "2026-04-28", foto_nama: "galeri-ipnu-ippnu.jpg", foto_url: "/galeri-ipnu-ippnu.jpg", organisasi: "ipnu" },
        { id: "508", judul: "Pengambilan Koin NU dari Rumah Warga", kategori: "Operasional", tanggal: "2026-05-19", foto_nama: "galeri-koin-nu-collection.jpg", foto_url: "/galeri-koin-nu-collection.jpg", organisasi: "ranting" },
        { id: "509", judul: "Pelatihan Kewirausahaan Ibu-ibu Muslimat", kategori: "Pemberdayaan", tanggal: "2026-05-02", foto_nama: "galeri-pengajian-selapanan.jpg", foto_url: "/galeri-pengajian-selapanan.jpg", organisasi: "muslimat" },
        { id: "510", judul: "Penyaluran Sembako & Santunan Fatayat", kategori: "Sosial", tanggal: "2026-05-24", foto_nama: "galeri-santunan-dhuafa.jpg", foto_url: "/galeri-santunan-dhuafa.jpg", organisasi: "fatayat" },
        { id: "511", judul: "Rutinan Majelis Yasin IPPNU Ranting", kategori: "Keagamaan", tanggal: "2026-05-16", foto_nama: "galeri-ipnu-ippnu.jpg", foto_url: "/galeri-ipnu-ippnu.jpg", organisasi: "ippnu" },
        { id: "512", judul: "Latihan Rutin Pencak Silat Pagar Nusa", kategori: "Olahraga", tanggal: "2026-05-15", foto_nama: "galeri-bakti-sosial-ansor.jpg", foto_url: "/galeri-bakti-sosial-ansor.jpg", organisasi: "pagar-nusa" },
        { id: "513", judul: "Rutinan Istighotsah JATMAN", kategori: "Keagamaan", tanggal: "2026-05-10", foto_nama: "galeri-pengajian-selapanan.jpg", foto_url: "/galeri-pengajian-selapanan.jpg", organisasi: "jatman" },
        { id: "514", judul: "Wisuda Tahfizh Al-Qur'an Juz Amma JQH", kategori: "Keagamaan", tanggal: "2026-05-05", foto_nama: "galeri-rapat-pengurus.jpg", foto_url: "/galeri-rapat-pengurus.jpg", organisasi: "jqh" },
        { id: "515", judul: "Workshop Guru Aswaja Ranting NU", kategori: "Pendidikan", tanggal: "2026-04-28", foto_nama: "galeri-rapat-pengurus.jpg", foto_url: "/galeri-rapat-pengurus.jpg", organisasi: "pergunu" }
      ];
      for (const item of defaultGallery) {
        await client.query("insert into koin_dokumentasi_kegiatan (id, data) values ($1, $2::jsonb) on conflict do nothing", [item.id, JSON.stringify(item)]);
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
