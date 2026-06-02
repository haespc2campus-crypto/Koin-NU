export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string; role: string; phone: string | null; status: string; created_at: string };
        Insert: { id: string; email: string; full_name: string; role?: string; phone?: string | null; status?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      ranting_profile: {
        Row: { id: number; nama_ranting: string; desa: string; kecamatan: string; kabupaten: string; provinsi: string; alamat_sekretariat: string; email: string | null; phone: string | null; masa_khidmah: string | null; logo_url: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["ranting_profile"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["ranting_profile"]["Row"]>;
      };
      pengurus: {
        Row: { id: number; nama: string; jabatan: string; phone: string | null; alamat: string | null; foto_url: string | null; status: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["pengurus"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["pengurus"]["Row"]>;
      };
      petugas: {
        Row: { id: number; nama: string; phone: string | null; alamat: string | null; rt: string | null; rw: string | null; username: string | null; wilayah_tugas: string | null; status: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["petugas"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["petugas"]["Row"]>;
      };
      donatur: {
        Row: { id: number; nama_kk: string; alamat: string | null; rt: string | null; rw: string | null; phone: string | null; petugas_id: number | null; status: string; catatan: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["donatur"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["donatur"]["Row"]>;
      };
      pengambilan_koin: {
        Row: { id: number; nomor_transaksi: string; tanggal: string; donatur_id: number | null; petugas_id: number | null; nominal: number; metode_pembayaran: string; catatan_petugas: string | null; bukti_foto_path: string | null; bukti_foto_url: string | null; bukti_foto_nama: string | null; status_verifikasi: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["pengambilan_koin"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["pengambilan_koin"]["Row"]>;
      };
      verifikasi_setoran: {
        Row: { id: number; pengambilan_id: number; bendahara_id: string | null; status: string; catatan_bendahara: string | null; bukti_setoran_path: string | null; bukti_setoran_url: string | null; bukti_setoran_nama: string | null; tanggal_verifikasi: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["verifikasi_setoran"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["verifikasi_setoran"]["Row"]>;
      };
      penyaluran_dana: {
        Row: { id: number; nomor_penyaluran: string; tanggal: string; nama_penerima: string; alamat: string | null; rt: string | null; rw: string | null; phone: string | null; kategori_bantuan: string; nominal: number; sumber_dana: string | null; status: string; keterangan: string | null; dokumentasi_path: string | null; dokumentasi_url: string | null; dokumentasi_nama: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["penyaluran_dana"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["penyaluran_dana"]["Row"]>;
      };
      dokumentasi_kegiatan: {
        Row: { id: number; judul: string; kategori: string; tanggal: string; foto_path: string | null; foto_url: string; foto_nama: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["dokumentasi_kegiatan"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["dokumentasi_kegiatan"]["Row"]>;
      };
      settings: {
        Row: { id: string; key: string; value: Json; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
      };
    };
  };
};
