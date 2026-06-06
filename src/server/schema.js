import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

function jsonTable(name) {
  return pgTable(`koin_${name}`, {
    id: text("id").primaryKey(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  });
}

export const profiles = jsonTable("profiles");
export const rantingProfile = jsonTable("ranting_profile");
export const pengurus = jsonTable("pengurus");
export const petugas = jsonTable("petugas");
export const donatur = jsonTable("donatur");
export const pengambilanKoin = jsonTable("pengambilan_koin");
export const verifikasiSetoran = jsonTable("verifikasi_setoran");
export const setoranPetugas = jsonTable("setoran_petugas");
export const setoranLazisnu = jsonTable("setoran_lazisnu");
export const penyaluranDana = jsonTable("penyaluran_dana");
export const dokumentasiKegiatan = jsonTable("dokumentasi_kegiatan");
export const berita = jsonTable("berita");
export const settings = jsonTable("settings");
export const pengumuman = jsonTable("pengumuman");
export const kegiatan = jsonTable("kegiatan");
export const layananKematian = jsonTable("layanan_kematian");
export const jadwalTahlil = jsonTable("jadwal_tahlil");
export const pengajuanBantuan = jsonTable("pengajuan_bantuan");
export const masjidMushola = jsonTable("masjid_mushola");
export const umkm = jsonTable("umkm");
export const produkUmkm = jsonTable("produk_umkm");
export const download = jsonTable("download");
export const downloadLog = jsonTable("download_log");
export const artikel = jsonTable("artikel");
export const kontakMasuk = jsonTable("kontak_masuk");
export const programKerja = jsonTable("program_kerja");
export const lpjKegiatan = jsonTable("lpj_kegiatan");
export const dokumenPublik = jsonTable("dokumen_publik");

export const tableSchemas = {
  profiles,
  ranting_profile: rantingProfile,
  pengurus,
  petugas,
  donatur,
  pengambilan_koin: pengambilanKoin,
  verifikasi_setoran: verifikasiSetoran,
  setoran_petugas: setoranPetugas,
  setoran_lazisnu: setoranLazisnu,
  penyaluran_dana: penyaluranDana,
  dokumentasi_kegiatan: dokumentasiKegiatan,
  berita,
  settings,
  pengumuman,
  kegiatan,
  layanan_kematian: layananKematian,
  jadwal_tahlil: jadwalTahlil,
  pengajuan_bantuan: pengajuanBantuan,
  masjid_mushola: masjidMushola,
  umkm,
  produk_umkm: produkUmkm,
  download,
  download_log: downloadLog,
  artikel,
  kontak_masuk: kontakMasuk,
  program_kerja: programKerja,
  lpj_kegiatan: lpjKegiatan,
  dokumen_publik: dokumenPublik
};
