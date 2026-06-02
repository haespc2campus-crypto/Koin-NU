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
  settings
};
