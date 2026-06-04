import qrcode from "qrcode-generator";
import MicroModal from "micromodal";
import { z } from "zod";
import { nanoid } from "nanoid";
import { changePasswordSchema } from "./src/lib/validators.js";
import { initModals } from "./src/ui/modal.js";
import confetti from "canvas-confetti";

initModals();

// === Utility: Debounce ===
function debounce(fn, delay = 250) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// === Utility: Wrap Form Submit (Loading & Double Click Prevention) ===
async function wrapFormSubmit(event, syncFn) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitBtn = form.querySelector('button[type="submit"]');
  const errorEl = form.querySelector('.form-error') || form.querySelector('#' + form.id + 'Error');

  if (submitBtn) {
    if (submitBtn.classList.contains("btn-loading")) return false;
    submitBtn.classList.add("btn-loading");
    submitBtn.disabled = true;
  }

  try {
    const ok = await syncFn();
    return ok;
  } catch (error) {
    console.error("Submit error:", error);
    if (errorEl) {
      errorEl.textContent = "Terjadi kesalahan sistem. Coba lagi.";
    }
    return false;
  } finally {
    if (submitBtn) {
      submitBtn.classList.remove("btn-loading");
      submitBtn.disabled = false;
    }
  }
}

// === Utility: Load Leaflet.js Dynamically ===
function loadLeaflet(callback) {
  if (window.L) {
    callback();
    return;
  }

  if (document.getElementById("leaflet-js")) {
    const timer = setInterval(() => {
      if (window.L) {
        clearInterval(timer);
        callback();
      }
    }, 100);
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
  link.crossOrigin = "";
  document.head.appendChild(link);

  const script = document.createElement("script");
  script.id = "leaflet-js";
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
  script.crossOrigin = "";
  script.onload = callback;
  document.head.appendChild(script);
}

// === Toast Notification System ===
let _toastContainer = null;
function getToastContainer() {
  if (!_toastContainer || !_toastContainer.isConnected) {
    _toastContainer = document.createElement("div");
    _toastContainer.className = "toast-container";
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}
function showToast(message, type = "info") {
  const icons = { error: "❌", success: "✅", warning: "⚠️", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-message">${message}</span><button class="toast-close" aria-label="Tutup">&times;</button>`;
  toast.querySelector(".toast-close").addEventListener("click", () => toast.remove());
  getToastContainer().appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

const sessionKey = "koin-nu-demo-session";
const authSessionKey = "koin-nu-postgres-auth-session";
const roles = ["admin", "bendahara", "petugas", "pengurus"];

const app = document.querySelector("#app");

const demoData = {
  totals: {
    monthlyCoins: 18450000,
    activeDonors: 326,
    officers: 18,
    pendingDeposits: 7,
    distributedFunds: 12600000
  },
  income: [
    { month: "Des", amount: 10200000 },
    { month: "Jan", amount: 11850000 },
    { month: "Feb", amount: 13200000 },
    { month: "Mar", amount: 14900000 },
    { month: "Apr", amount: 16750000 },
    { month: "Mei", amount: 18450000 }
  ],
  activities: [
    { time: "Hari ini, 09.20", actor: "Siti Aminah", type: "Setoran", detail: "Setoran RT 03 menunggu verifikasi", amount: 1250000, status: "Menunggu" },
    { time: "Hari ini, 08.45", actor: "Ahmad Fauzi", type: "Pengambilan", detail: "Input koin warga RT 06", amount: 680000, status: "Tercatat" },
    { time: "Kemarin, 16.10", actor: "Bendahara", type: "Verifikasi", detail: "Setoran RT 01 disetujui", amount: 940000, status: "Selesai" },
    { time: "Kemarin, 13.30", actor: "Admin", type: "Penyaluran", detail: "Bantuan pendidikan santri", amount: 3200000, status: "Tersalur" },
    { time: "26 Mei, 10.05", actor: "Nur Hasan", type: "Pengambilan", detail: "Jemput koin area musholla", amount: 510000, status: "Tercatat" }
  ],
  donors: [
    { id: 1, name: "KH. Abdul Wahid", address: "Jl. Masjid Al-Hikmah No. 12", rt: "01", rw: "03", phone: "0812-3456-7701", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", active: true, note: "Donatur tetap, kotak di teras depan." },
    { id: 2, name: "Ibu Siti Aminah", address: "Gang Melati RT 02 dekat musholla", rt: "02", rw: "03", phone: "0857-1122-3302", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id", active: true, note: "Pengambilan setiap Jumat sore." },
    { id: 3, name: "Bapak H. Munir", address: "Perum Ranting Indah Blok C4", rt: "03", rw: "03", phone: "0821-9090-1203", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id", active: false, note: "Sementara pindah rumah, konfirmasi ulang bulan depan." },
    { id: 4, name: "Ibu Fatimah Zahra", address: "Jl. Pesantren Barat No. 8", rt: "04", rw: "04", phone: "0813-7766-4504", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", active: true, note: "Titip ke anak jika rumah kosong." },
    { id: 5, name: "Bapak Slamet Riyadi", address: "Gang Kenanga ujung utara", rt: "05", rw: "04", phone: "0852-6666-5505", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", active: true, note: "Kotak diganti bulan lalu." },
    { id: 6, name: "Ibu Lailatul Fitriyah", address: "Jl. Lapangan Selatan No. 21", rt: "06", rw: "05", phone: "0881-2345-9906", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id", active: true, note: "Butuh kuitansi saat pengambilan." },
    { id: 7, name: "Bapak M. Ridwan", address: "Kontrakan Pak Harjo pintu dua", rt: "04", rw: "05", phone: "0819-1010-4107", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id", active: false, note: "Nonaktif atas permintaan keluarga." },
    { id: 8, name: "Ibu Nur Khasanah", address: "Jl. Makam Wali No. 5", rt: "01", rw: "04", phone: "0878-2221-1108", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", active: true, note: "Area prioritas petugas demo." }
  ],
  pickups: [
    { id: 101, transactionNo: "TRX-20260530-001", donorId: 1, donorName: "KH. Abdul Wahid", donorAddress: "Jl. Masjid Al-Hikmah No. 12", date: "2026-05-30", amount: 175000, method: "Tunai", status: "Menunggu Verifikasi", note: "Kotak penuh, diterima langsung.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", proofPhotoUrl: "", proofPhotoName: "" },
    { id: 102, transactionNo: "TRX-20260530-002", donorId: 4, donorName: "Ibu Fatimah Zahra", donorAddress: "Jl. Pesantren Barat No. 8", date: "2026-05-30", amount: 125000, method: "QRIS", status: "Disetujui Bendahara", note: "QRIS dari anak beliau.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 103, transactionNo: "TRX-20260529-001", donorId: 2, donorName: "Ibu Siti Aminah", donorAddress: "Gang Melati RT 02 dekat musholla", date: "2026-05-29", amount: 98000, method: "Tunai", status: "Menunggu Verifikasi", note: "Pengambilan rutin Jumat.", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id" },
    { id: 104, transactionNo: "TRX-20260528-001", donorId: 6, donorName: "Ibu Lailatul Fitriyah", donorAddress: "Jl. Lapangan Selatan No. 21", date: "2026-05-28", amount: 150000, method: "Transfer", status: "Disetujui Bendahara", note: "Transfer ke rekening ranting.", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id" },
    { id: 105, transactionNo: "TRX-20260527-001", donorId: 8, donorName: "Ibu Nur Khasanah", donorAddress: "Jl. Makam Wali No. 5", date: "2026-05-27", amount: 87000, method: "Tunai", status: "Ditolak", note: "Nominal perlu dicek ulang.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 106, transactionNo: "TRX-20260526-001", donorId: 5, donorName: "Bapak Slamet Riyadi", donorAddress: "Gang Kenanga ujung utara", date: "2026-05-26", amount: 112000, method: "Tunai", status: "Disetujui Bendahara", note: "Kotak diganti kondisi baik.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 107, transactionNo: "TRX-20260525-001", donorId: 1, donorName: "KH. Abdul Wahid", donorAddress: "Jl. Masjid Al-Hikmah No. 12", date: "2026-05-25", amount: 164000, method: "Transfer", status: "Disetujui Bendahara", note: "Transfer setelah pengambilan.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 108, transactionNo: "TRX-20260524-001", donorId: 2, donorName: "Ibu Siti Aminah", donorAddress: "Gang Melati RT 02 dekat musholla", date: "2026-05-24", amount: 73000, method: "Tunai", status: "Menunggu Verifikasi", note: "Rumah sedang ramai pengajian.", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id" },
    { id: 109, transactionNo: "TRX-20260523-001", donorId: 4, donorName: "Ibu Fatimah Zahra", donorAddress: "Jl. Pesantren Barat No. 8", date: "2026-05-23", amount: 99000, method: "QRIS", status: "Disetujui Bendahara", note: "Dibayar via QRIS.", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id" },
    { id: 110, transactionNo: "TRX-20260522-001", donorId: 6, donorName: "Ibu Lailatul Fitriyah", donorAddress: "Jl. Lapangan Selatan No. 21", date: "2026-05-22", amount: 141000, method: "Tunai", status: "Disetujui Bendahara", note: "Butuh kuitansi.", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id" },
    { id: 111, transactionNo: "TRX-20260521-001", donorId: 8, donorName: "Ibu Nur Khasanah", donorAddress: "Jl. Makam Wali No. 5", date: "2026-05-21", amount: 88000, method: "Tunai", status: "Menunggu Verifikasi", note: "Titip keluarga.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 112, transactionNo: "TRX-20260520-001", donorId: 5, donorName: "Bapak Slamet Riyadi", donorAddress: "Gang Kenanga ujung utara", date: "2026-05-20", amount: 106000, method: "Transfer", status: "Ditolak", note: "Bukti transfer belum sesuai.", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id" },
    { id: 113, transactionNo: "TRX-20260519-001", donorId: 1, donorName: "KH. Abdul Wahid", donorAddress: "Jl. Masjid Al-Hikmah No. 12", date: "2026-05-19", amount: 153000, method: "Tunai", status: "Disetujui Bendahara", note: "Diterima langsung.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 114, transactionNo: "TRX-20260518-001", donorId: 2, donorName: "Ibu Siti Aminah", donorAddress: "Gang Melati RT 02 dekat musholla", date: "2026-05-18", amount: 66000, method: "QRIS", status: "Disetujui Bendahara", note: "QRIS lancar.", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id" },
    { id: 115, transactionNo: "TRX-20260517-001", donorId: 4, donorName: "Ibu Fatimah Zahra", donorAddress: "Jl. Pesantren Barat No. 8", date: "2026-05-17", amount: 132000, method: "Tunai", status: "Menunggu Verifikasi", note: "Input sore hari.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 116, transactionNo: "TRX-20260516-001", donorId: 6, donorName: "Ibu Lailatul Fitriyah", donorAddress: "Jl. Lapangan Selatan No. 21", date: "2026-05-16", amount: 97000, method: "Tunai", status: "Disetujui Bendahara", note: "Setoran rutin.", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id" },
    { id: 117, transactionNo: "TRX-20260515-001", donorId: 8, donorName: "Ibu Nur Khasanah", donorAddress: "Jl. Makam Wali No. 5", date: "2026-05-15", amount: 79000, method: "Transfer", status: "Disetujui Bendahara", note: "Transfer malam.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 118, transactionNo: "TRX-20260514-001", donorId: 5, donorName: "Bapak Slamet Riyadi", donorAddress: "Gang Kenanga ujung utara", date: "2026-05-14", amount: 115000, method: "Tunai", status: "Menunggu Verifikasi", note: "Perlu dicek bendahara.", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id" },
    { id: 119, transactionNo: "TRX-20260513-001", donorId: 1, donorName: "KH. Abdul Wahid", donorAddress: "Jl. Masjid Al-Hikmah No. 12", date: "2026-05-13", amount: 121000, method: "QRIS", status: "Disetujui Bendahara", note: "Pembayaran non tunai.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 120, transactionNo: "TRX-20260512-001", donorId: 2, donorName: "Ibu Siti Aminah", donorAddress: "Gang Melati RT 02 dekat musholla", date: "2026-05-12", amount: 84000, method: "Tunai", status: "Disetujui Bendahara", note: "Aman.", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id" }
  ],
  officerDeposits: [
    { id: 601, depositNo: "STP-20260530-001", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", date: "2026-05-30", periodStart: "2026-05-25", periodEnd: "2026-05-30", amount: 4880000, transactionCount: 42, method: "Tunai", status: "Menunggu Verifikasi", note: "Setoran pengambilan akhir bulan.", proofPhotoName: "" },
    { id: 602, depositNo: "STP-20260529-001", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id", date: "2026-05-29", periodStart: "2026-05-22", periodEnd: "2026-05-29", amount: 8462000, transactionCount: 71, method: "Transfer", status: "Diterima Bendahara", note: "Transfer diterima rekening ranting.", proofPhotoName: "transfer-siti.jpg" },
    { id: 603, depositNo: "STP-20260525-001", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id", date: "2026-05-25", periodStart: "2026-05-12", periodEnd: "2026-05-25", amount: 7386000, transactionCount: 64, method: "Tunai", status: "Diterima Bendahara", note: "Sudah dihitung bersama bendahara.", proofPhotoName: "" },
    { id: 604, depositNo: "STP-20260521-001", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", date: "2026-05-21", periodStart: "2026-05-13", periodEnd: "2026-05-21", amount: 3441000, transactionCount: 31, method: "QRIS", status: "Dikembalikan Revisi", note: "Mohon unggah ulang bukti QRIS.", proofPhotoName: "" }
  ],
  lazisnuDeposits: [
    { id: 701, depositNo: "LAZ-20260530-001", date: "2026-05-30", destination: "MWC LAZISNU", recipientName: "H. M. Zainuddin", amount: 5500000, method: "Transfer", receiptNo: "KW-MWC-2026-0530", status: "Sudah Disetor", note: "Setoran rutin akhir bulan.", proofPhotoName: "kwitansi-mwc.jpg" },
    { id: 702, depositNo: "LAZ-20260518-001", date: "2026-05-18", destination: "LAZISNU Ranting", recipientName: "Hj. Lailatul Badriyah", amount: 2250000, method: "Tunai", receiptNo: "KW-RANTING-2026-0518", status: "Sudah Disetor", note: "Setoran kas program.", proofPhotoName: "" },
    { id: 703, depositNo: "LAZ-20260531-001", date: "2026-05-31", destination: "PC LAZISNU", recipientName: "Petugas PC LAZISNU", amount: 3000000, method: "Transfer", receiptNo: "", status: "Draft", note: "Menunggu konfirmasi jadwal transfer.", proofPhotoName: "" }
  ],
  distributions: [
    { id: 201, distributionNo: "SLR-20260530-001", date: "2026-05-30", recipientName: "Ananda Fikri Maulana", address: "Gang Melati RT 02", rt: "02", rw: "03", phone: "0812-1111-2301", category: "Santunan Yatim", amount: 750000, source: "Kas Koin NU", status: "Disalurkan", note: "Santunan pendidikan bulanan.", documentationName: "santunan-fikri.jpg", documentationUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80" },
    { id: 202, distributionNo: "SLR-20260529-001", date: "2026-05-29", recipientName: "Ibu Salamah", address: "Jl. Makam Wali No. 17", rt: "01", rw: "04", phone: "0857-2222-9902", category: "Bantuan Dhuafa", amount: 500000, source: "Kas Koin NU", status: "Disalurkan", note: "Bantuan sembako dan tunai.", documentationName: "dhuafa-salamah.jpg", documentationUrl: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80" },
    { id: 203, distributionNo: "SLR-20260528-001", date: "2026-05-28", recipientName: "TPQ Al-Hikmah", address: "Kompleks Masjid Al-Hikmah", rt: "01", rw: "03", phone: "0813-3333-4403", category: "Pendidikan", amount: 1200000, source: "Kas Pendidikan", status: "Draft", note: "Rencana pembelian kitab dan alat tulis.", documentationName: "" },
    { id: 204, distributionNo: "SLR-20260525-001", date: "2026-05-25", recipientName: "Bapak M. Ridwan", address: "Kontrakan Pak Harjo pintu dua", rt: "04", rw: "05", phone: "0821-4444-5504", category: "Kesehatan", amount: 900000, source: "Kas Koin NU", status: "Disalurkan", note: "Bantuan biaya pemeriksaan.", documentationName: "kesehatan-ridwan.jpg" },
    { id: 205, distributionNo: "SLR-20260523-001", date: "2026-05-23", recipientName: "Keluarga Alm. Pak Hasan", address: "Jl. Pesantren Barat No. 3", rt: "04", rw: "04", phone: "0881-5555-6605", category: "Kematian", amount: 1000000, source: "Kas Sosial", status: "Disalurkan", note: "Takziah dan bantuan keluarga.", documentationName: "" },
    { id: 206, distributionNo: "SLR-20260520-001", date: "2026-05-20", recipientName: "Warga Terdampak Angin", address: "Gang Kenanga ujung utara", rt: "05", rw: "04", phone: "0878-6666-7706", category: "Bencana", amount: 1500000, source: "Kas Darurat", status: "Disalurkan", note: "Perbaikan atap rumah.", documentationName: "bencana-kenanga.jpg" },
    { id: 207, distributionNo: "SLR-20260518-001", date: "2026-05-18", recipientName: "Panitia Maulid Ranting", address: "Balai Ranting NU", rt: "03", rw: "03", phone: "0819-7777-8807", category: "Kegiatan Keagamaan", amount: 800000, source: "Kas Kegiatan", status: "Disalurkan", note: "Dukungan konsumsi pengajian.", documentationName: "" },
    { id: 208, distributionNo: "SLR-20260515-001", date: "2026-05-15", recipientName: "Sekretariat Ranting", address: "Balai Ranting NU", rt: "03", rw: "03", phone: "0852-8888-9908", category: "Operasional Ranting", amount: 650000, source: "Kas Operasional", status: "Disalurkan", note: "ATK dan administrasi.", documentationName: "operasional.jpg" },
    { id: 209, distributionNo: "SLR-20260512-001", date: "2026-05-12", recipientName: "Ibu Nur Khasanah", address: "Jl. Makam Wali No. 5", rt: "01", rw: "04", phone: "0878-2221-1108", category: "Lainnya", amount: 300000, source: "Kas Koin NU", status: "Dibatalkan", note: "Data penerima dialihkan ke program lain.", documentationName: "" },
    { id: 210, distributionNo: "SLR-20260428-001", date: "2026-04-28", recipientName: "Ananda Salsabila", address: "Jl. Lapangan Selatan No. 7", rt: "06", rw: "05", phone: "0812-9999-0010", category: "Pendidikan", amount: 700000, source: "Kas Pendidikan", status: "Disalurkan", note: "Bantuan perlengkapan sekolah.", documentationName: "pendidikan-salsa.jpg" }
  ],
  publicDocumentation: [
    { id: 501, title: "Pengajian Selapanan & Kajian Aswaja", category: "Pengajian", date: "2026-05-26", photoName: "galeri-pengajian-selapanan.jpg", photoUrl: "/galeri-pengajian-selapanan.jpg" },
    { id: 502, title: "Penyaluran Sembako & Santunan Dhuafa", category: "Bakti Sosial", date: "2026-05-20", photoName: "galeri-santunan-dhuafa.jpg", photoUrl: "/galeri-santunan-dhuafa.jpg" },
    { id: 503, title: "Bakti Sosial GP Ansor — Bersih Masjid", category: "Kepemudaan", date: "2026-05-12", photoName: "galeri-bakti-sosial-ansor.jpg", photoUrl: "/galeri-bakti-sosial-ansor.jpg" },
    { id: 504, title: "Rapat Pleno Pengurus Ranting 2026", category: "Kegiatan Ranting", date: "2026-05-16", photoName: "galeri-rapat-pengurus.jpg", photoUrl: "/galeri-rapat-pengurus.jpg" },
    { id: 505, title: "Halal Bihalal & Silaturahim Warga Nahdliyin", category: "Kegiatan Ranting", date: "2026-04-10", photoName: "galeri-halal-bihalal.jpg", photoUrl: "/galeri-halal-bihalal.jpg" },
    { id: 506, title: "Santunan Anak Yatim Bulanan — Mei 2026", category: "Santunan", date: "2026-05-30", photoName: "galeri-santunan-yatim.jpg", photoUrl: "/galeri-santunan-yatim.jpg" },
    { id: 507, title: "Kajian Kitab & Rutinan IPNU-IPPNU", category: "Kepemudaan", date: "2026-04-28", photoName: "galeri-ipnu-ippnu.jpg", photoUrl: "/galeri-ipnu-ippnu.jpg" },
    { id: 508, title: "Pengambilan Koin NU dari Rumah Warga", category: "Operasional", date: "2026-05-19", photoName: "galeri-koin-nu-collection.jpg", photoUrl: "/galeri-koin-nu-collection.jpg" }
  ],
  news: [
    { id: 801, title: "Lailatul Ijtima' PRNU Karangsalam Kidul II Perkuat Silaturahmi & Koin NU", category: "Kegiatan Ranting", date: "2026-05-26", excerpt: "Kegiatan rutin bulanan Lailatul Ijtima' diisi dengan Istighotsah bersama dan penyerahan Koin NU Ranting.", content: "Lailatul Ijtima' kembali digelar oleh Pengurus Ranting Nahdlatul Ulama Karangsalam Kidul II. Bertempat di Masjid Baiturrahman RT 03/RW 03, acara ini dihadiri puluhan warga Nahdliyin. Selain Istighotsah dan yasin tahlil rutin, pertemuan ini juga dimanfaatkan untuk melaporkan secara transparan perolehan Koin NU bulan ini kepada seluruh jemaah. Total perolehan koin bulan ini mencapai Rp 18.450.000 yang nantinya sebagian dialihkan untuk program sosial ranting dan disetor ke LAZISNU MWC.", imageName: "galeri-pengajian-selapanan.jpg", imageUrl: "/galeri-pengajian-selapanan.jpg", status: "published" },
    { id: 802, title: "LAZISNU Ranting Salurkan Santunan Bulanan untuk Anak Yatim dan Lansia", category: "Sosial", date: "2026-05-20", excerpt: "Penyaluran dana Koin NU berupa santunan sembako dan biaya sekolah untuk warga yang membutuhkan.", content: "LAZISNU Ranting Karangsalam Kidul II mendistribusikan santunan bulanan kepada belasan anak yatim dan warga lanjut usia kurang mampu di wilayah RT 01 sampai RT 06. Bantuan berupa uang tunai dan paket sembako ini bersumber sepenuhnya dari Koin NU kemasan kaleng yang dikumpulkan secara gotong royong oleh para donatur setia setiap bulannya. Penyaluran dilaksanakan secara langsung dengan disaksikan ketua RT masing-masing demi menjaga transparansi.", imageName: "galeri-santunan-yatim.jpg", imageUrl: "/galeri-santunan-yatim.jpg", status: "published" },
    { id: 803, title: "Rutinan Yasin & Tahlil IPNU-IPPNU Karangsalam Kidul II Semakin Semarak", category: "Kepemudaan", date: "2026-05-16", excerpt: "Rekan-rekanita IPNU-IPPNU giatkan rutinan mingguan demi menjaga tradisi Aswaja di kalangan remaja.", content: "Ikatan Pelajar Nahdlatul Ulama (IPNU) dan Ikatan Pelajar Putri Nahdlatul Ulama (IPPNU) Ranting Karangsalam Kidul II mengadakan rutinan yasinan dan tahlilan bertempat di rumah kader secara bergiliran setiap Sabtu malam. Selain memperdalam pembacaan tahlil dan ratibul hadad, kegiatan ini diselingi dengan diskusi kepemimpinan organisasi serta kajian kitab Safinah untuk mempersiapkan kader muda masa depan yang berilmu dan berakhlak.", imageName: "galeri-ipnu-ippnu.jpg", imageUrl: "/galeri-ipnu-ippnu.jpg", status: "published" },
    { id: 804, title: "GP Ansor & Banser Gotong Royong Aksi Bersih Masjid & Mushola Ranting", category: "Kepemudaan", date: "2026-05-12", excerpt: "Anggota Banser dan GP Ansor bergotong royong membersihkan tempat ibadah menyambut hari-hari besar Islam.", content: "GP Ansor Ranting Karangsalam Kidul II bersama satuan Banser bahu-membahu membersihkan area utama Masjid Baiturrahman dan lima mushola di sekitar wilayah ranting. Mulai dari pengecatan pagar, pembersihan kolam wudhu, hingga penataan taman masjid — semua dikerjakan secara sukarela. Kegiatan ini mencerminkan semangat khidmah pemuda NU yang tidak hanya bergerak di bidang keagamaan, tetapi juga dalam kepedulian terhadap lingkungan ibadah umat.", imageName: "galeri-bakti-sosial-ansor.jpg", imageUrl: "/galeri-bakti-sosial-ansor.jpg", status: "published" },
    { id: 805, title: "SIKOINNU Resmi Diluncurkan: Transparansi Digital Koin NU Ranting", category: "Organisasi", date: "2026-05-08", excerpt: "Digitalisasi administrasi Koin NU resmi digunakan untuk pencatatan donasi yang amanah, transparan, dan akuntabel.", content: "Pengurus Ranting NU Karangsalam Kidul II secara resmi memperkenalkan Sistem Informasi Koin NU (SIKOINNU) sebagai langkah nyata digitalisasi organisasi tingkat ranting. Melalui sistem ini, setiap pengambilan koin akan tercatat digital dengan QR code unik per donatur, laporan keuangan bulanan terupdate otomatis, dan penyaluran dana dapat dipantau secara real-time oleh seluruh warga melalui portal transparansi publik di nukarangsalam2.com.", imageName: "galeri-rapat-pengurus.jpg", imageUrl: "/galeri-rapat-pengurus.jpg", status: "published" },
    { id: 806, title: "Muslimat NU Karangsalam Kidul II Gelar Pelatihan UMKM Kuliner Halal", category: "Sosial & Ekonomi", date: "2026-05-02", excerpt: "Ibu-ibu Muslimat NU dilatih membuat produk makanan olahan bernilai jual tinggi dengan pemahaman sertifikasi halal.", content: "Muslimat NU Ranting Karangsalam Kidul II mengadakan pelatihan pembuatan aneka jajanan pasar dan produk kuliner lokal di Sekretariat Ranting. Pelatihan ini dipandu oleh narasumber dari Dinas Perindustrian Kabupaten Banyumas dan juga membekali peserta dengan tata cara pengajuan sertifikasi halal mandiri melalui platform SI Halal Kemenag, guna meningkatkan nilai jual produk dan kemandirian ekonomi keluarga Nahdliyin.", imageName: "galeri-santunan-dhuafa.jpg", imageUrl: "/galeri-santunan-dhuafa.jpg", status: "published" },
    { id: 807, title: "Halal Bihalal & Silaturahim Akbar Warga Nahdliyin Karangsalam Kidul II", category: "Kegiatan Ranting", date: "2026-04-10", excerpt: "Ribuan warga Nahdliyin berkumpul dalam momentum Halal Bihalal pasca Idul Fitri 1447 H mempererat ukhuwah.", content: "Ribuan warga Nahdliyin dari berbagai RT/RW di wilayah Karangsalam Kidul II memadati Lapangan Karangsalam dalam acara Halal Bihalal & Silaturahim Akbar yang diselenggarakan oleh PRNU Karangsalam Kidul II. Acara diisi dengan tausiyah oleh Kiai Masruri tentang makna silaturahim dan pentingnya ukhuwah islamiyah, dilanjutkan dengan saling bersalaman antar warga. Ketua Tanfidziyah KH. Muhammad Sholeh juga menyampaikan laporan kegiatan dan pencapaian ranting selama setahun terakhir.", imageName: "galeri-halal-bihalal.jpg", imageUrl: "/galeri-halal-bihalal.jpg", status: "published" },
    { id: 808, title: "PRNU Karangsalam Kidul II Distribusikan 150 Paket Sembako Ramadhan 1447 H", category: "Sosial", date: "2026-03-25", excerpt: "Sebanyak 150 paket sembako didistribusikan kepada warga kurang mampu menyambut Ramadhan dan Idul Fitri.", content: "Dalam rangka menyambut bulan suci Ramadhan 1447 H, PRNU Karangsalam Kidul II bersama LAZISNU Ranting mendistribusikan 150 paket sembako lengkap kepada warga kurang mampu di seluruh wilayah RT 01 hingga RT 06. Setiap paket berisi beras 5 kg, minyak goreng 2 liter, gula pasir, mi instan, dan beberapa kebutuhan pokok lainnya. Kegiatan ini didanai dari hasil Koin NU yang terkumpul selama dua bulan, serta donasi tambahan dari para dermawan warga sekitar.", imageName: "galeri-santunan-dhuafa.jpg", imageUrl: "/galeri-santunan-dhuafa.jpg", status: "published" },
    { id: 809, title: "Pelantikan Pengurus Baru IPNU-IPPNU Ranting Karangsalam Kidul II", category: "Kepemudaan", date: "2026-04-28", excerpt: "Pengurus baru IPNU-IPPNU resmi dilantik dalam sebuah prosesi yang khidmat dan penuh semangat kaderisasi.", content: "Pengurus Ranting Nahdlatul Ulama Karangsalam Kidul II melantik kepengurusan baru IPNU dan IPPNU Ranting periode 2026-2028 dalam sebuah prosesi yang dihadiri oleh pengurus MWC NU Kedungbanteng. Ketua IPNU terpilih, Saudara Faris Maulana, dan Ketua IPPNU terpilih, Saudari Nisa Aulia, menyampaikan tekad untuk memperkuat kaderisasi dan kegiatan sosial kepemudaan NU di tingkat ranting.", imageName: "galeri-ipnu-ippnu.jpg", imageUrl: "/galeri-ipnu-ippnu.jpg", status: "published" },
    { id: 810, title: "Musyawarah Tahunan PRNU: Evaluasi Program & Penyusunan Rencana Kerja 2026", category: "Organisasi", date: "2026-03-10", excerpt: "Musyawarah tahunan menghasilkan program kerja prioritas PRNU Karangsalam Kidul II untuk tahun 2026.", content: "Pengurus Ranting NU Karangsalam Kidul II menggelar Musyawarah Tahunan di Sekretariat Ranting. Musyawarah dipimpin langsung oleh Rais Syuriah, Kiai Masruri, dan dihadiri seluruh unsur pengurus serta perwakilan lembaga otonom NU. Agenda utama meliputi evaluasi program kerja tahun lalu, penyusunan rencana kerja 2026, dan penetapan target Koin NU senilai Rp 20 juta per bulan. Musyawarah juga membahas rencana renovasi sekretariat ranting dan pengadaan perlengkapan SIKOINNU.", imageName: "galeri-rapat-pengurus.jpg", imageUrl: "/galeri-rapat-pengurus.jpg", status: "published" },
    { id: 811, title: "Pengajian Selapanan Perdana 2026: Kajian Kitab Nashaihul Ibad", category: "Keagamaan", date: "2026-01-16", excerpt: "Pengajian selapanan perdana tahun 2026 mengkaji Kitab Nashaihul Ibad tentang nasihat-nasihat untuk hamba Allah.", content: "PRNU Karangsalam Kidul II membuka tahun 2026 dengan pengajian selapanan perdana yang mengkaji Kitab Nashaihul Ibad karya Syaikh Nawawi Al-Bantani. Pengajian dipimpin langsung oleh Kiai Masruri selaku Rais Syuriah Ranting dan dihadiri ratusan jamaah dari berbagai grumbul di Karangsalam Kidul. Usai pengajian, panitia juga membagikan hasil laporan perolehan Koin NU bulan Desember 2025 kepada jamaah sebagai bentuk transparansi keuangan ranting.", imageName: "galeri-pengajian-selapanan.jpg", imageUrl: "/galeri-pengajian-selapanan.jpg", status: "published" },
    { id: 812, title: "Banser Ranting Ikuti Apel Hari Santri Nasional di Purwokerto", category: "Kepemudaan", date: "2025-10-22", excerpt: "Puluhan anggota Banser Ranting Karangsalam Kidul II ikut serta dalam Apel Hari Santri Nasional 22 Oktober di Purwokerto.", content: "Dalam rangka memperingati Hari Santri Nasional 22 Oktober 2025, puluhan anggota Banser Satuan Koordinasi Ranting Karangsalam Kidul II mengikuti Apel Besar yang dipusatkan di Alun-alun Purwokerto. Para anggota Banser hadir dengan mengenakan seragam resmi dan berparade bersama ribuan anggota NU se-Banyumas. Momentum ini menjadi pengingat perjuangan para santri dan ulama dalam mempertahankan kemerdekaan Indonesia, serta memperkuat semangat khidmah pemuda NU.", imageName: "galeri-bakti-sosial-ansor.jpg", imageUrl: "/galeri-bakti-sosial-ansor.jpg", status: "published" }
  ],
  officers: [
    { id: 301, name: "Ahmad Fauzi", phone: "0812-7000-0101", address: "Jl. Masjid Al-Hikmah No. 4", rt: "01", rw: "03", area: "RT 01/RW 03, RT 04/RW 04, RT 05/RW 04", donorCount: 4, username: "petugas@rantingnu.id", role: "petugas", active: true, note: "Petugas demo utama." },
    { id: 302, name: "Siti Aminah", phone: "0857-7000-0202", address: "Gang Melati Tengah", rt: "02", rw: "03", area: "RT 02/RW 03, RT 06/RW 05", donorCount: 2, username: "siti@rantingnu.id", role: "petugas", active: true, note: "Koordinator area musholla." },
    { id: 303, name: "Nur Hasan", phone: "0821-7000-0303", address: "Perum Ranting Indah Blok A2", rt: "03", rw: "03", area: "RT 03/RW 03, RT 04/RW 05", donorCount: 2, username: "nur@rantingnu.id", role: "petugas", active: true, note: "Aktif pengambilan akhir pekan." },
    { id: 304, name: "Miftahul Huda", phone: "0813-7000-0404", address: "Jl. Pesantren Timur", rt: "04", rw: "04", area: "RT 04/RW 04", donorCount: 18, username: "miftah@rantingnu.id", role: "petugas", active: true, note: "Cadangan verifikasi lapangan." },
    { id: 305, name: "Laili Rohmah", phone: "0881-7000-0505", address: "Gang Kenanga Selatan", rt: "05", rw: "04", area: "RT 05/RW 04", donorCount: 21, username: "laili@rantingnu.id", role: "petugas", active: false, note: "Sementara nonaktif karena pindah domisili." },
    { id: 306, name: "Abdul Karim", phone: "0878-7000-0606", address: "Jl. Lapangan Selatan", rt: "06", rw: "05", area: "RT 06/RW 05", donorCount: 17, username: "karim@rantingnu.id", role: "petugas", active: true, note: "Membantu input data malam hari." },
    { id: 307, name: "Halimatus Sa'diyah", phone: "0852-7000-0707", address: "Jl. Makam Wali", rt: "01", rw: "04", area: "RT 01/RW 04", donorCount: 15, username: "halimah@rantingnu.id", role: "petugas", active: true, note: "Pendamping area ibu muslimat." },
    { id: 308, name: "Rofiq Hidayat", phone: "0819-7000-0808", address: "Kontrakan Pak Harjo", rt: "04", rw: "05", area: "RT 04/RW 05", donorCount: 12, username: "rofiq@rantingnu.id", role: "petugas", active: false, note: "Menunggu pembaruan wilayah tugas." }
  ],
  branchProfile: {
    branchName: "PRNU Karangsalam Kidul II",
    village: "Karangsalam Kidul",
    district: "Kedungbanteng",
    regency: "Banyumas",
    province: "Jawa Tengah",
    secretariatAddress: "Jl. Lapangan Karangsalam Kidul No. 2, Kedungbanteng, Banyumas",
    phone: "0812-7000-0101",
    email: "nu.karangsalamkidul2@gmail.com",
    branchLogo: "",
    nuLogo: "logo-nu-demo.png",
    servicePeriod: "2025 - 2030"
  },
  boardMembers: [
    { id: 401, position: "Rais Syuriah", name: "Kiai Masruri", phone: "0812-8100-0011", address: "Grumbul Kaliputra RT 01/RW 03", photo: "", term: "2025 - 2030", active: true },
    { id: 402, position: "Katib Syuriah", name: "Kiai Ahmad Hambali", phone: "0857-8100-0022", address: "Grumbul Karangtawang RT 02/RW 03", photo: "", term: "2025 - 2030", active: true },
    { id: 403, position: "Ketua Tanfidziyah", name: "KH. Muhammad Sholeh", phone: "0812-8100-0101", address: "Jl. Lapangan Karangsalam Kidul No. 4", photo: "", term: "2025 - 2030", active: true },
    { id: 404, position: "Sekretaris", name: "M. Rasyid Ridho", phone: "0821-8100-0303", address: "Jl. Lapangan Karangsalam Kidul No. 8", photo: "", term: "2025 - 2030", active: true },
    { id: 405, position: "Bendahara", name: "Hj. Lailatul Badriyah", phone: "0881-8100-0505", address: "Gang Kenanga RT 05/RW 04", photo: "", term: "2025 - 2030", active: true },
    { id: 406, position: "Wakil Bendahara", name: "Siti Maimunah", phone: "0878-8100-0606", address: "Jl. Lapangan Selatan RT 06/RW 05", photo: "", term: "2025 - 2030", active: true },
    { id: 407, position: "Admin Sistem", name: "Miftahul Huda", phone: "0819-8100-0707", address: "Balai Ranting NU", photo: "", term: "2025 - 2030", active: true }
  ],
  systemSettings: {
    appName: "SIKOINNU",
    appSlogan: "Transparan, Amanah, dan Berdampak",
    branchName: "PRNU Karangsalam Kidul II",
    appLogo: "/logo-lazisnu.png",
    primaryColor: "#0b6b3a",
    secretariatAddress: "Jl. Lapangan Karangsalam Kidul No. 2, Kedungbanteng, Banyumas",
    email: "nu.karangsalamkidul2@gmail.com",
    adminPhone: "0812-7000-0101",
    activeYear: "2026",
    activePeriod: "Januari - Desember 2026",
    monthlyCoinTarget: 20000000,
    activeDonorTarget: 350,
    distributionTarget: 8000000,
    safeCashTarget: 5000000,
    pickupNumberFormat: "KOIN-{YYYY}-{0001}",
    distributionNumberFormat: "SALUR-{YYYY}-{0001}",
    reportChairName: "KH. Muhammad Sholeh",
    reportTreasurerName: "Hj. Lailatul Badriyah",
    reportHeaderFormat: "Kop resmi NU Ranting lengkap dengan alamat sekretariat",
    showNuLogo: true,
    showBranchLogo: true,
    reportFooter: "Dikembangkan untuk mendukung pengelolaan Koin NU yang profesional, transparan, dan akuntabel.",
    greenMode: true,
    themeMode: "Terang",
    fontSizeMode: "Normal",
    simpleOfficerMode: true
  }
};

const appState = {
  donors: [...demoData.donors],
  officers: [...demoData.officers],
  branchProfile: { ...demoData.branchProfile },
  boardMembers: [...demoData.boardMembers],
  systemSettings: { ...demoData.systemSettings },
  distributions: [...demoData.distributions],
  officerDeposits: [...demoData.officerDeposits],
  lazisnuDeposits: [...demoData.lazisnuDeposits],
  publicDocumentation: [...demoData.publicDocumentation],
  news: [...demoData.news],
  pickups: demoData.pickups.map((pickup) => ({
    ...pickup,
    verificationAudit: pickup.status === "Menunggu Verifikasi" ? [] : [{
      treasurer: "Bendahara Demo",
      verifiedAt: pickup.date,
      status: pickup.status,
      note: pickup.status === "Ditolak" ? "Perlu perbaikan data transaksi." : "Transaksi sudah sesuai."
    }]
  })),
  donorSearch: "",
  donorRt: "all",
  donorRw: "all",
  donorStatus: "all",
  selectedDonorId: null,
  modalMode: null,
  donorImportRows: [],
  donorImportFileName: "",
  donorImportModalOpen: false,
  pickupDonor: "all",
  pickupSearch: "",
  pickupDate: "",
  pickupOfficer: "all",
  pickupMethod: "all",
  pickupNotificationStatus: "all",
  selectedPickupId: null,
  pickupModalMode: null,
  pickupPresetDonorId: null,
  pickupScannerOpen: false,
  pickupSuccessId: null,
  verificationTab: "Menunggu Verifikasi",
  verificationSearch: "",
  verificationDate: "",
  verificationOfficer: "all",
  verificationMethod: "all",
  selectedVerificationId: null,
  verificationAction: null,
  reportMonth: String(new Date().getMonth() + 1).padStart(2, "0"),
  reportYear: String(new Date().getFullYear()),
  reportRt: "all",
  reportRw: "all",
  reportOfficer: "all",
  reportStatus: "all",
  reportMethod: "all",
  distributionSearch: "",
  distributionCategory: "all",
  distributionDate: "",
  distributionStatus: "all",
  selectedDistributionId: null,
  distributionModalMode: null,
  officerDepositSearch: "",
  officerDepositOfficer: "all",
  officerDepositDate: "",
  officerDepositStatus: "all",
  selectedOfficerDepositId: null,
  officerDepositModalMode: null,
  lazisnuDepositSearch: "",
  lazisnuDepositDestination: "all",
  lazisnuDepositDate: "",
  lazisnuDepositStatus: "all",
  selectedLazisnuDepositId: null,
  lazisnuDepositModalMode: null,
  officerSearch: "",
  officerArea: "all",
  officerStatus: "all",
  selectedOfficerId: null,
  officerModalMode: null,
  profileEditMode: false,
  boardSearch: "",
  boardPosition: "all",
  boardStatus: "all",
  selectedBoardId: null,
  boardModalMode: null,
  settingsEditMode: false,
  passwordEditMode: false,
  users: [
    { id: "demo-admin", email: "admin@rantingnu.id", fullName: "Admin Ranting", role: "admin", phone: "0812-9000-1111", status: "aktif", createdAt: "2026-05-01T08:00:00.000Z" },
    { id: "demo-bendahara", email: "bendahara@rantingnu.id", fullName: "Hj. Lailatul Badriyah", role: "bendahara", phone: "0881-8100-0505", status: "aktif", createdAt: "2026-05-01T08:10:00.000Z" },
    { id: "demo-petugas", email: "petugas@rantingnu.id", fullName: "Ahmad Fauzi", role: "petugas", phone: "0812-7000-0101", status: "aktif", createdAt: "2026-05-01T08:20:00.000Z" },
    { id: "demo-pengurus", email: "pengurus@rantingnu.id", fullName: "KH. Muhammad Sholeh", role: "pengurus", phone: "0812-8100-0101", status: "aktif", createdAt: "2026-05-01T08:30:00.000Z" }
  ],
  userSearch: "",
  userRole: "all",
  userStatus: "all",
  selectedUserId: null,
  userModalMode: null,
  dataSource: "demo",
  postgresReady: false,
  isOffline: !navigator.onLine,
  syncingOffline: false,
  pendingSyncCount: 0
};

// === IndexedDB & Offline Helpers ===
function isNetworkError(error) {
  if (error instanceof TypeError || 
      error.message?.includes("Failed to fetch") || 
      error.message?.includes("NetworkError") || 
      error.message?.includes("Load failed") ||
      error.message?.includes("API 502") ||
      error.message?.includes("API 503") ||
      error.message?.includes("API 504") ||
      error.message?.includes("API 500")) { // Handle major gateway or server crash errors as offline fallback
    return true;
  }
  return false;
}

function initOfflineDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("sikoinnu_offline_db", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("db_cache")) {
        db.createObjectStore("db_cache");
      }
      if (!db.objectStoreNames.contains("pending_sync")) {
        db.createObjectStore("pending_sync", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function saveDbCache(data) {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("db_cache", "readwrite");
      const store = tx.objectStore("db_cache");
      store.put(data, "db_data");
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Gagal menyimpan cache ke IndexedDB:", err);
    return false;
  }
}

async function getDbCache() {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("db_cache", "readonly");
      const store = tx.objectStore("db_cache");
      const req = store.get("db_data");
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Gagal mengambil cache dari IndexedDB:", err);
    return null;
  }
}

async function queueOfflineAction(table, action, data) {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pending_sync", "readwrite");
      const store = tx.objectStore("pending_sync");
      store.add({
        table,
        action,
        data,
        timestamp: new Date().toISOString()
      });
      tx.oncomplete = async () => {
        await updatePendingSyncCount();
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Gagal menambahkan antrean offline:", err);
    return false;
  }
}

async function getOfflineQueue() {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pending_sync", "readonly");
      const store = tx.objectStore("pending_sync");
      const req = store.getAll();
      tx.oncomplete = () => resolve(req.result || []);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Gagal mengambil antrean offline:", err);
    return [];
  }
}

async function deleteOfflineQueueItem(id) {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pending_sync", "readwrite");
      const store = tx.objectStore("pending_sync");
      store.delete(id);
      tx.oncomplete = async () => {
        await updatePendingSyncCount();
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Gagal menghapus antrean offline:", err);
    return false;
  }
}

async function updatePendingSyncCount() {
  const queue = await getOfflineQueue();
  appState.pendingSyncCount = queue.length;
  updateOfflineIndicator();
}

async function syncOfflineData() {
  if (appState.syncingOffline) return;
  const queue = await getOfflineQueue();
  if (queue.length === 0) {
    appState.isOffline = false;
    updateOfflineIndicator();
    return;
  }

  if (!navigator.onLine) {
    showToast("Gagal sinkronisasi. Perangkat masih offline.", "error");
    return;
  }

  appState.syncingOffline = true;
  updateOfflineIndicator();
  showToast(`Sedang menyelaraskan ${queue.length} transaksi offline...`, "info");

  let successCount = 0;
  let failCount = 0;

  for (const item of queue) {
    try {
      if (item.action === "POST") {
        await internalRequest(`table/${item.table}`, {
          method: "POST",
          body: JSON.stringify(item.data)
        });
      } else if (item.action === "DELETE") {
        await internalRequest(`table/${item.table}/${encodeURIComponent(item.data.id)}`, {
          method: "DELETE"
        });
      }
      await deleteOfflineQueueItem(item.id);
      successCount++;
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn("Koneksi terputus saat sinkronisasi offline:", err);
        failCount = queue.length - successCount;
        break;
      } else {
        console.error("Gagal sinkronisasi item, dilewati:", err);
        await deleteOfflineQueueItem(item.id);
        showToast(`Item dilewati karena error: ${err.message}`, "error");
      }
    }
  }

  appState.syncingOffline = false;
  appState.isOffline = !navigator.onLine;

  if (successCount > 0) {
    showToast(`Berhasil menyelaraskan ${successCount} transaksi offline.`, "success");
    await loadInternalData();
    render();
  } else if (failCount > 0) {
    showToast(`Gagal menyelaraskan ${failCount} transaksi. Periksa koneksi Anda.`, "error");
    updateOfflineIndicator();
  } else {
    updateOfflineIndicator();
  }
}

function updateOfflineIndicator() {
  const badge = document.querySelector("#networkStatusBadge");
  if (!badge) return;

  badge.className = "network-badge";
  const label = badge.querySelector("span:not(.dot)");
  
  if (appState.syncingOffline) {
    badge.classList.add("syncing");
    if (label) label.textContent = "Menyelaraskan...";
  } else if (appState.isOffline) {
    badge.classList.add("offline");
    if (label) label.textContent = `Offline (${appState.pendingSyncCount || 0} tertunda)`;
  } else {
    badge.classList.add("online");
    if (label) label.textContent = "Online";
  }

  updateOfflineAlertBanner();
}

function renderOfflineAlertBanner() {
  if (appState.pendingSyncCount > 0) {
    return `
      <div class="offline-alert-banner">
        <div>
          <strong>${appState.pendingSyncCount} transaksi disimpan secara lokal</strong>
          <p>Koneksi internet Anda sedang terganggu. Transaksi akan disinkronkan otomatis ketika online, atau klik "Sinkronkan Sekarang".</p>
        </div>
        <button class="primary-button compact" id="syncOfflineNowButton" type="button" ${appState.syncingOffline ? "disabled" : ""}>
          ${appState.syncingOffline ? "Menghubungkan..." : "Sinkronkan Sekarang"}
        </button>
      </div>
    `;
  }
  return "";
}

function updateOfflineAlertBanner() {
  const container = document.querySelector("#offlineAlertBannerContainer");
  if (container) {
    container.innerHTML = renderOfflineAlertBanner();
    document.querySelector("#syncOfflineNowButton")?.addEventListener("click", () => {
      syncOfflineData();
    });
  }
}

function getPostgresConfig() { return { url: '', anonKey: '' }; }
function hasPostgresConfig() { return false; }
function getAuthSession() { return getSession(); }
function setAuthSession(session) { setSession(session); }
function clearAuthSession() {}
function isPostgresSessionValid(session) { return Boolean(session?.token); }
function getApiToken() { return getSession()?.token || ''; }
async function internalRequest(path, options = {}) {
  const response = await fetch(`/api/${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(getApiToken() ? { Authorization: `Bearer ${getApiToken()}` } : {}), ...(options.headers || {}) } });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `API ${response.status}`);
  return response.status === 204 ? null : response.json();
}
const privateEvidenceBucket = 'local-private-evidence';
const publicDocumentationBucket = 'local-public-documentation';
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
const maxImageSize = 2 * 1024 * 1024;
function validateImageFile(file) { if (!file) return ''; const extension = file.name.split('.').pop()?.toLowerCase() || ''; if (!allowedImageExtensions.includes(extension) || !allowedImageTypes.includes(file.type)) return 'Format foto harus JPG, PNG, atau WEBP.'; if (file.size > maxImageSize) return 'Ukuran foto maksimal 2 MB.'; return ''; }
function sanitizeStorageName(name) { return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, ''); }
function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Preview foto gagal dibuat.')); reader.readAsDataURL(file); }); }
async function uploadDocumentationPhoto(file, folder = "dokumentasi") { const validationError = validateImageFile(file); if (validationError) throw new Error(validationError); if (!file) return null; const dataUrl = await fileToDataUrl(file); return internalRequest("upload", { method: "POST", body: JSON.stringify({ name: file.name, type: file.type, folder, dataUrl }) }); }
async function createSignedPhotoUrl(bucket, path) { return path || ''; }
async function hydratePrivatePhotoUrls() {}
function renderPhotoPreview(url, alt, emptyText = 'Belum ada foto.') { return url ? `<figure class="photo-preview"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" /><figcaption>${escapeHtml(alt)}</figcaption></figure>` : `<div class="photo-empty">${emptyText}</div>`; }
function getNameInitials(name = '') { return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'; }
function isDisplayablePhotoUrl(url = '') { return /^(https?:\/\/|data:image\/|blob:|\/)/i.test(String(url).trim()); }
function renderBoardAvatar(member, size = '') { const name = member?.name || 'Pengurus'; const photo = isDisplayablePhotoUrl(member?.photo) ? String(member.photo).trim() : ''; return `<span class="board-avatar ${size}" aria-label="Foto ${escapeHtml(name)}"><span class="board-avatar-fallback">${escapeHtml(getNameInitials(name))}</span>${photo ? `<img src="${escapeHtml(photo)}" alt="Foto ${escapeHtml(name)}" loading="lazy" onerror="this.remove()" />` : ''}</span>`; }
function renderBoardPhotoPreview(member) { return `<div class="board-photo-preview">${renderBoardAvatar(member, 'large')}<span>${member?.photo && isDisplayablePhotoUrl(member.photo) ? 'Foto pengurus saat ini' : 'Avatar inisial digunakan jika foto belum tersedia.'}</span></div>`; }
function bindImagePreview(inputSelector, previewSelector, errorSelector) { document.querySelector(inputSelector)?.addEventListener('change', (event) => { const file = event.target.files?.[0]; const preview = document.querySelector(previewSelector); const error = document.querySelector(errorSelector); const message = validateImageFile(file); if (error) error.textContent = message; if (!preview || !file || message) { if (message) event.target.value = ''; return; } const prevImg = preview.querySelector('img[src^="blob:"]'); if (prevImg) URL.revokeObjectURL(prevImg.src); const blobUrl = URL.createObjectURL(file); preview.innerHTML = renderPhotoPreview(blobUrl, file.name); }); }
async function postgresAuthRequest() { throw new Error('Reset password belum tersedia di auth internal.'); }
async function fetchProfileForAuthUser(authUser) { return authUser; }
async function restorePostgresSession() { const session = getSession(); if (session?.token) await loadInternalData(); return session; }
function mapStatusToActive(status) {
  return status === true || status === "aktif" || status === "active";
}

function mapActiveToStatus(active) {
  return active ? "aktif" : "tidak_aktif";
}

function mapDbToAppState(data) {
  const petugasById = new Map((data.petugas || []).map((item) => [item.id, item]));
  const donaturById = new Map((data.donatur || []).map((item) => [item.id, item]));
  const settings = { ...demoData.systemSettings };

  (data.settings || []).forEach((item) => {
    try {
      settings[item.key] = JSON.parse(item.value);
    } catch {
      settings[item.key] = item.value;
    }
  });

  if (data.ranting_profile?.[0]) {
    const profile = data.ranting_profile[0];
    appState.branchProfile = {
      branchName: profile.nama_ranting || "",
      village: profile.desa || "",
      district: profile.kecamatan || "",
      regency: profile.kabupaten || "",
      province: profile.provinsi || "",
      secretariatAddress: profile.alamat_sekretariat || "",
      phone: profile.phone || "",
      email: profile.email || "",
      branchLogo: profile.logo_url || "",
      nuLogo: appState.branchProfile.nuLogo,
      servicePeriod: profile.masa_khidmah || ""
    };
  }

  appState.users = (data.profiles || []).map((item) => ({
    id: item.id,
    email: item.email,
    fullName: item.full_name,
    role: item.role,
    phone: item.phone || "",
    status: item.status,
    createdAt: item.created_at
  }));
  appState.systemSettings = settings;
  appState.officers = (data.petugas || []).map((item) => ({
    id: item.id,
    name: item.nama,
    phone: item.phone || "",
    address: item.alamat || "",
    rt: item.rt || "",
    rw: item.rw || "",
    area: item.wilayah_tugas || "",
    donorCount: 0,
    username: item.username || item.email || "",
    role: "petugas",
    active: mapStatusToActive(item.status),
    note: ""
  }));
  appState.donors = (data.donatur || []).map((item) => {
    const officer = petugasById.get(item.petugas_id);
    return {
      id: item.id,
      name: item.nama_kk,
      address: item.alamat || "",
      rt: item.rt || "",
      rw: item.rw || "",
      phone: item.phone || "",
      officer: officer?.nama || "",
      officerEmail: officer?.username || officer?.email || "",
      active: mapStatusToActive(item.status),
      note: item.catatan || "",
      donorCode: item.kode_donatur || "",
      qrCodeValue: item.qr_code_value || "",
      qrCodeImage: item.qr_code_image || ""
    };
  });
  appState.pickups = (data.pengambilan_koin || []).map((item) => {
    const donor = donaturById.get(item.donatur_id);
    const officer = petugasById.get(item.petugas_id);
    const audits = (data.verifikasi_setoran || [])
      .filter((audit) => audit.pengambilan_id === item.id)
      .map((audit) => ({
        treasurer: "Bendahara",
        verifiedAt: audit.tanggal_verifikasi || audit.created_at?.slice(0, 10) || item.tanggal,
        status: audit.status,
        note: audit.catatan_bendahara || "",
        depositPhotoPath: audit.bukti_setoran_path || "",
        depositPhotoUrl: audit.bukti_setoran_url || "",
        depositPhotoName: audit.bukti_setoran_nama || ""
      }));
    return {
      id: item.id,
      transactionNo: item.nomor_transaksi,
      donorId: item.donatur_id,
      donorName: donor?.nama_kk || "",
      donorAddress: donor?.alamat || "",
      date: item.tanggal,
      amount: Number(item.nominal || 0),
      method: item.metode_pembayaran,
      status: item.status_verifikasi,
      note: item.catatan_petugas || "",
      proofPhotoPath: item.bukti_foto_path || "",
      proofPhotoUrl: item.bukti_foto_url || "",
      proofPhotoName: item.bukti_foto_nama || "",
      officer: officer?.nama || "",
      officerEmail: officer?.username || officer?.email || "",
      verificationAudit: audits,
      notificationStatus: item.status_notifikasi || "belum_dikirim",
      notificationAt: item.waktu_notifikasi || "",
      notificationNote: item.catatan_notifikasi || "",
      notificationHistory: item.riwayat_notifikasi || []
    };
  });
  appState.distributions = (data.penyaluran_dana || []).map((item) => ({
    id: item.id,
    distributionNo: item.nomor_penyaluran,
    date: item.tanggal,
    recipientName: item.nama_penerima,
    address: item.alamat || "",
    rt: item.rt || "",
    rw: item.rw || "",
    phone: item.phone || "",
    category: item.kategori_bantuan,
    amount: Number(item.nominal || 0),
    source: item.sumber_dana || "",
    status: item.status,
    note: item.keterangan || "",
    documentationPath: item.dokumentasi_path || "",
    documentationName: item.dokumentasi_nama || "",
    documentationUrl: item.dokumentasi_url || ""
  }));
  appState.officerDeposits = (data.setoran_petugas || []).map((item) => {
    const officer = petugasById.get(item.petugas_id);
    return {
      id: item.id,
      depositNo: item.nomor_setoran,
      officer: officer?.nama || "",
      officerEmail: officer?.username || officer?.email || "",
      date: item.tanggal_setor,
      periodStart: item.periode_mulai,
      periodEnd: item.periode_selesai,
      amount: Number(item.nominal || 0),
      transactionCount: Number(item.jumlah_transaksi || 0),
      method: item.metode_setor,
      status: item.status,
      note: item.catatan_petugas || "",
      proofPhotoPath: item.bukti_setor_path || "",
      proofPhotoUrl: item.bukti_setor_url || "",
      proofPhotoName: item.bukti_setor_nama || ""
    };
  });
  appState.lazisnuDeposits = (data.setoran_lazisnu || []).map((item) => ({
    id: item.id,
    depositNo: item.nomor_setoran,
    date: item.tanggal_setor,
    destination: item.tujuan_setoran,
    recipientName: item.nama_penerima || "",
    amount: Number(item.nominal || 0),
    method: item.metode_setor,
    receiptNo: item.nomor_bukti || "",
    status: item.status,
    note: item.catatan || "",
    proofPhotoPath: item.bukti_setor_path || "",
    proofPhotoUrl: item.bukti_setor_url || "",
    proofPhotoName: item.bukti_setor_nama || ""
  }));
  appState.publicDocumentation = (data.dokumentasi_kegiatan || []).map((item) => ({
    id: item.id,
    title: item.judul,
    category: item.kategori,
    date: item.tanggal,
    photoPath: item.foto_path || "",
    photoName: item.foto_nama || "",
    photoUrl: item.foto_url || ""
  }));
  appState.news = (data.berita?.length ? data.berita : demoData.news).map((item) => ({
    id: item.id,
    title: item.judul || item.title || "",
    category: item.kategori || item.category || "Kegiatan Ranting",
    date: item.tanggal || item.date || getLocalDateString(),
    excerpt: item.ringkasan || item.excerpt || "",
    content: item.konten || item.content || "",
    imagePath: item.gambar_path || item.imagePath || "",
    imageName: item.gambar_nama || item.imageName || "",
    imageUrl: item.gambar_url || item.imageUrl || "",
    status: item.status || "draft"
  }));
  appState.boardMembers = (data.pengurus || []).map((item) => ({
    id: item.id,
    position: item.jabatan,
    name: item.nama,
    phone: item.phone || "",
    address: item.alamat || "",
    photo: item.foto_url || "",
    term: appState.branchProfile.servicePeriod,
    active: mapStatusToActive(item.status)
  }));
}

async function loadInternalData() {
  try {
    const data = await internalRequest("db");
    mapDbToAppState(data);
    await hydratePrivatePhotoUrls();
    appState.dataSource = "internal";
    appState.postgresReady = true;
    appState.isOffline = false;
    
    // Save to offline cache
    await saveDbCache(data);
    
    // Process pending sync in the background if we have any
    const queue = await getOfflineQueue();
    if (queue.length > 0) {
      syncOfflineData();
    }
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn("Koneksi offline, mencoba memuat database dari cache IndexedDB.");
      const cached = await getDbCache();
      if (cached) {
        mapDbToAppState(cached);
        await hydratePrivatePhotoUrls();
        appState.dataSource = "internal";
        appState.postgresReady = true;
        appState.isOffline = true;
        
        // Merge offline pending pickups and filter out offline deleted pickups
        const queue = await getOfflineQueue();
        const pendingPickups = queue.filter((x) => x.table === "pengambilan_koin" && x.action === "POST");
        const deletedIds = new Set(queue.filter((x) => x.table === "pengambilan_koin" && x.action === "DELETE").map((x) => x.data.id));
        
        if (deletedIds.size > 0) {
          appState.pickups = appState.pickups.filter((p) => !deletedIds.has(p.id));
        }
        
        if (pendingPickups.length > 0) {
          const pet = new Map(appState.officers.map((o) => [o.id, o]));
          const don = new Map(appState.donors.map((d) => [d.id, d]));
          const mappedPending = pendingPickups.map((p) => {
            const item = p.data;
            const donor = don.get(item.donatur_id);
            const officer = pet.get(item.petugas_id);
            return {
              id: item.id,
              transactionNo: item.nomor_transaksi,
              donorId: item.donatur_id,
              donorName: donor?.name || "Donatur",
              donorAddress: donor?.address || "",
              date: item.tanggal,
              amount: Number(item.nominal || 0),
              method: item.metode_pembayaran,
              status: item.status_verifikasi,
              note: item.catatan_petugas || "",
              proofPhotoPath: item.bukti_foto_path || "",
              proofPhotoUrl: item.bukti_foto_path ? null : item.bukti_foto_url || null,
              proofPhotoName: item.bukti_foto_nama || "",
              officer: officer?.name || "",
              officerEmail: officer?.username || "",
              verificationAudit: [],
              notificationStatus: item.status_notifikasi || "belum_dikirim",
              notificationAt: item.waktu_notifikasi || "",
              notificationNote: item.catatan_notifikasi || "",
              notificationHistory: item.riwayat_notifikasi || [],
              _offline: true
            };
          });
          appState.pickups = [...mappedPending, ...appState.pickups];
        }
        
        showToast("Mode Offline: Menggunakan data lokal terakhir.", "warning");
        return;
      }
    }
    console.warn("Gagal memuat database internal, memakai mode demo.", error);
    appState.dataSource = "demo";
    appState.postgresReady = false;
  }
}


function toDbRows(table) {
  const officerIdByEmail = new Map(appState.officers.map((officer) => [officer.username, officer.id]));

  if (table === "donatur") {
    return appState.donors.map((item) => ({
      id: item.id,
      nama_kk: item.name,
      alamat: item.address,
      rt: item.rt,
      rw: item.rw,
      phone: item.phone,
      petugas_id: officerIdByEmail.get(item.officerEmail) || null,
      status: mapActiveToStatus(item.active),
      catatan: item.note,
      kode_donatur: ensureDonorQr(item).donorCode,
      qr_code_value: item.qrCodeValue,
      qr_code_image: item.qrCodeImage || null
    }));
  }

  if (table === "petugas") {
    return appState.officers.map((item) => ({
      id: item.id,
      nama: item.name,
      phone: item.phone,
      alamat: item.address,
      rt: item.rt,
      rw: item.rw,
      username: item.username,
      wilayah_tugas: item.area,
      status: mapActiveToStatus(item.active)
    }));
  }

  if (table === "pengurus") {
    return appState.boardMembers.map((item) => ({
      id: item.id,
      nama: item.name,
      jabatan: item.position,
      phone: item.phone,
      alamat: item.address,
      foto_url: item.photo,
      status: mapActiveToStatus(item.active)
    }));
  }

  if (table === "penyaluran_dana") {
    return appState.distributions.map((item) => ({
      id: item.id,
      nomor_penyaluran: item.distributionNo,
      tanggal: item.date,
      nama_penerima: item.recipientName,
      alamat: item.address,
      rt: item.rt,
      rw: item.rw,
      phone: item.phone,
      kategori_bantuan: item.category,
      nominal: item.amount,
      sumber_dana: item.source,
      status: item.status,
      keterangan: item.note,
      dokumentasi_path: item.documentationPath || null,
      dokumentasi_url: item.documentationPath ? null : item.documentationUrl || null,
      dokumentasi_nama: item.documentationName || null
    }));
  }

  if (table === "pengambilan_koin") {
    return appState.pickups.map((item) => ({
      id: item.id,
      nomor_transaksi: item.transactionNo,
      tanggal: item.date,
      donatur_id: item.donorId,
      petugas_id: officerIdByEmail.get(item.officerEmail) || null,
      nominal: item.amount,
      metode_pembayaran: item.method,
      catatan_petugas: item.note,
      bukti_foto_path: item.proofPhotoPath || null,
      bukti_foto_url: item.proofPhotoPath ? null : item.proofPhotoUrl || null,
      bukti_foto_nama: item.proofPhotoName || null,
      status_verifikasi: item.status,
      status_notifikasi: item.notificationStatus || "belum_dikirim",
      waktu_notifikasi: item.notificationAt || null,
      catatan_notifikasi: item.notificationNote || null,
      riwayat_notifikasi: item.notificationHistory || []
    }));
  }

  if (table === "setoran_petugas") {
    return appState.officerDeposits.map((item) => ({
      id: item.id,
      nomor_setoran: item.depositNo,
      petugas_id: officerIdByEmail.get(item.officerEmail) || null,
      tanggal_setor: item.date,
      periode_mulai: item.periodStart,
      periode_selesai: item.periodEnd,
      nominal: item.amount,
      jumlah_transaksi: item.transactionCount,
      metode_setor: item.method,
      catatan_petugas: item.note,
      bukti_setor_path: item.proofPhotoPath || null,
      bukti_setor_url: item.proofPhotoPath ? null : item.proofPhotoUrl || null,
      bukti_setor_nama: item.proofPhotoName || null,
      status: item.status
    }));
  }

  if (table === "setoran_lazisnu") {
    return appState.lazisnuDeposits.map((item) => ({
      id: item.id,
      nomor_setoran: item.depositNo,
      tanggal_setor: item.date,
      tujuan_setoran: item.destination,
      nama_penerima: item.recipientName,
      nominal: item.amount,
      metode_setor: item.method,
      nomor_bukti: item.receiptNo,
      catatan: item.note,
      bukti_setor_path: item.proofPhotoPath || null,
      bukti_setor_url: item.proofPhotoPath ? null : item.proofPhotoUrl || null,
      bukti_setor_nama: item.proofPhotoName || null,
      status: item.status
    }));
  }

  if (table === "dokumentasi_kegiatan") {
    return appState.publicDocumentation.map((item) => ({
      id: item.id,
      judul: item.title,
      kategori: item.category,
      tanggal: item.date,
      foto_path: item.photoPath || null,
      foto_url: item.photoUrl,
      foto_nama: item.photoName
    }));
  }

  if (table === "berita") {
    return appState.news.map((item) => ({
      id: item.id,
      judul: item.title,
      kategori: item.category,
      tanggal: item.date,
      ringkasan: item.excerpt,
      konten: item.content,
      gambar_path: item.imagePath || null,
      gambar_url: item.imageUrl,
      gambar_nama: item.imageName,
      status: item.status || "draft"
    }));
  }

  if (table === "profiles") {
    return appState.users.map((item) => ({
      id: item.id,
      email: item.email,
      full_name: item.fullName,
      role: item.role,
      phone: item.phone,
      status: item.status
    }));
  }

  return [];
}

async function syncTableToPostgres(table) {
  if (!appState.postgresReady) {
    return true;
  }

  const rows = toDbRows(table);
  if (!rows.length) {
    return true;
  }

  try {
    await internalRequest(`table/${table}`, { method: "POST", body: JSON.stringify(rows) });
    return true;
  } catch (error) {
    console.warn(`Gagal sinkron ${table}`, error);
    showToast(`Gagal menyimpan data ${table}. Perubahan mungkin belum tersimpan.`, "error");
    return false;
  }
}

async function syncRowToPostgres(table, item) {
  if (!appState.postgresReady && !appState.isOffline) {
    return true;
  }
  const rows = toDbRows(table);
  const dbRow = rows.find((r) => String(r.id) === String(item.id));
  if (!dbRow) {
    return true;
  }

  // If already offline, queue and return true immediately
  if (appState.isOffline) {
    await queueOfflineAction(table, "POST", dbRow);
    showToast(`Offline: Transaksi disimpan secara lokal.`, "warning");
    return true;
  }

  try {
    await internalRequest(`table/${table}`, { method: "POST", body: JSON.stringify(dbRow) });
    return true;
  } catch (error) {
    if (isNetworkError(error)) {
      appState.isOffline = true;
      await queueOfflineAction(table, "POST", dbRow);
      showToast(`Koneksi terputus. Transaksi disimpan secara lokal.`, "warning");
      return true;
    }
    console.warn(`Gagal sinkron baris ${table} id ${item.id}`, error);
    showToast(`Gagal menyimpan perubahan: ${error.message}`, "error");
    return false;
  }
}

async function deleteRowFromPostgres(table, id) {
  if (!appState.postgresReady && !appState.isOffline) {
    return true;
  }

  if (appState.isOffline) {
    await queueOfflineAction(table, "DELETE", { id });
    showToast(`Offline: Penghapusan disimpan secara lokal.`, "warning");
    return true;
  }

  try {
    await internalRequest(`table/${table}/${encodeURIComponent(id)}`, { method: "DELETE" });
    return true;
  } catch (error) {
    if (isNetworkError(error)) {
      appState.isOffline = true;
      await queueOfflineAction(table, "DELETE", { id });
      showToast(`Koneksi terputus. Penghapusan disimpan secara lokal.`, "warning");
      return true;
    }
    console.warn(`Gagal menghapus ${table}`, error);
    showToast(`Gagal menghapus data: ${error.message}`, "error");
    return false;
  }
}


async function syncVerificationAuditToPostgres(pickupId, audit, session) {
  if (!appState.postgresReady) {
    return true;
  }
  try {
    await internalRequest("table/verifikasi_setoran", {
      method: "POST",
      body: JSON.stringify([{
        pengambilan_id: pickupId,
        bendahara_id: session.id || null,
        status: audit.status,
        catatan_bendahara: audit.note,
        tanggal_verifikasi: audit.verifiedAt,
        bukti_setoran_path: audit.depositPhotoPath || null,
        bukti_setoran_url: audit.depositPhotoPath ? null : audit.depositPhotoUrl || null,
        bukti_setoran_nama: audit.depositPhotoName || null
      }])
    });
    return true;
  } catch (error) {
    console.warn("Gagal menyimpan audit verifikasi", error);
    return false;
  }
}

async function syncProfileToPostgres() {
  if (!appState.postgresReady) {
    return;
  }

  const profile = appState.branchProfile;
  try {
    await internalRequest("table/ranting_profile", {
      method: "POST",
      body: JSON.stringify([{
        id: 1,
        nama_ranting: profile.branchName,
        desa: profile.village,
        kecamatan: profile.district,
        kabupaten: profile.regency,
        provinsi: profile.province,
        alamat_sekretariat: profile.secretariatAddress,
        email: profile.email,
        phone: profile.phone,
        masa_khidmah: profile.servicePeriod,
        logo_url: profile.branchLogo
      }])
    });
  } catch (error) {
    console.warn("Gagal sinkron profil ranting", error);
  }
}

async function syncSettingsToPostgres() {
  if (!appState.postgresReady) {
    return;
  }

  const now = new Date().toISOString();
  const rows = Object.entries(appState.systemSettings).map(([key, value]) => ({
    id: key,
    key,
    value: JSON.stringify(value),
    updated_at: now
  }));

  try {
    await internalRequest("table/settings", {
      method: "POST",
      body: JSON.stringify(rows)
    });
  } catch (error) {
    console.warn("Gagal sinkron settings", error);
  }
}

const roleContent = {
  admin: {
    title: "Pantau seluruh gerak Koin NU melalui SIKOINNU",
    description: "Semua ringkasan, pemasukan, petugas, setoran, dan penyaluran dana tampil lengkap untuk pengawasan ranting.",
    quickActions: ["Kelola Donatur", "Kelola Petugas", "Lihat Laporan"]
  },
  bendahara: {
    title: "Fokus verifikasi setoran dan arus dana",
    description: "Ringkasan ditata untuk mengecek setoran masuk, status verifikasi, dan dana tersalurkan.",
    quickActions: ["Verifikasi Setoran", "Catat Penyaluran", "Unduh Rekap"]
  },
  petugas: {
    title: "Input pengambilan koin lebih cepat",
    description: "Tampilan petugas menonjolkan aksi input pengambilan, aktivitas lapangan, dan setoran yang perlu dikirim.",
    quickActions: ["Input Pengambilan", "Lihat Rute", "Kirim Setoran"]
  },
  pengurus: {
    title: "Pantau gerakan Koin NU secara ringkas",
    description: "Mode pemantau menampilkan laporan, profil ranting, dan perkembangan program tanpa akses ubah data.",
    quickActions: ["Lihat Laporan", "Profil Ranting", "Transparansi Publik"]
  }
};

const quickActionRoutes = {
  "Kelola Donatur": "/donatur",
  "Kelola Petugas": "/petugas",
  "Lihat Laporan": "/laporan",
  "Verifikasi Setoran": "/verifikasi",
  "Catat Penyaluran": "/penyaluran-dana",
  "Unduh Rekap": "/laporan",
  "Input Pengambilan": "/pengambilan-koin",
  "Lihat Rute": "/donatur",
  "Kirim Setoran": "/verifikasi",
  "Profil Ranting": "/profil-ranting",
  "Transparansi Publik": "/transparansi"
};

const brand = {
  name: "SIKOINNU",
  subtitle: "Sistem Informasi Koin Nahdlatul Ulama",
  tagline: "Transparan, Amanah, dan Berdampak",
  footer: "Dikembangkan untuk mendukung pengelolaan Koin NU yang profesional, transparan, dan akuntabel.",
  logo: "/logo-lazisnu.png",
  fallbackLogo: "/lazisnu-logo.svg"
};

const navigationItems = [
  { label: "Dashboard", path: "/dashboard", icon: "grid" },
  { label: "Profil Ranting", path: "/profil-ranting", icon: "report" },
  { label: "Data Pengurus", path: "/pengurus", icon: "users" },
  { label: "Donatur", path: "/donatur", icon: "users" },
  { label: "Data Petugas", path: "/petugas", icon: "users" },
  { label: "Pengambilan Koin", path: "/pengambilan-koin", icon: "coin" },
  { label: "Verifikasi", path: "/verifikasi", icon: "check" },
  { label: "Setoran Petugas", path: "/setoran-petugas", icon: "coin" },
  { label: "Setor ke LAZISNU", path: "/setor-lazisnu", icon: "report" },
  { label: "Penyaluran Dana", path: "/penyaluran-dana", icon: "report" },
  { label: "Berita", path: "/berita", icon: "report" },
  { label: "Laporan", path: "/laporan", icon: "report" },
  { label: "Kelola User", path: "/users", icon: "users" },
  { label: "Pengaturan", path: "/pengaturan", icon: "check" }
];

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionKey));
  } catch {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(sessionKey);
}

async function logout() {
  if (getSession()?.token) {
    try {
      await internalRequest("logout", { method: "POST" });
    } catch (error) {
      console.warn("Logout server gagal, session lokal tetap dibersihkan.", error);
    }
  }
  clearAuthSession();
  clearSession();
}

function isReadOnlyRole(role) {
  return role === "pengurus";
}

function canManagePublicContent(role) {
  return role === "admin" || role === "bendahara" || role === "pengurus";
}

function canManageUsers(role) {
  return role === "admin";
}

function canAccessPath(session, path) {
  if (!session?.role) {
    return false;
  }

  if (path === "/users") {
    return session.role === "admin";
  }

  if (path === "/pengaturan") {
    return session.role === "admin";
  }

  if (session.role === "pengurus") {
    return ["/dashboard", "/profil-ranting", "/pengurus", "/donatur", "/petugas", "/pengambilan-koin", "/verifikasi", "/setoran-petugas", "/setor-lazisnu", "/penyaluran-dana", "/berita", "/laporan"].includes(path);
  }

  return true;
}

function navigate(path) {
  window.history.pushState({}, "", path);
  render();
}

function labelRole(role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function canManageDonors(role) {
  if (isReadOnlyRole(role)) {
    return false;
  }
  return role === "admin" || role === "bendahara";
}

function canManagePickup(session, pickup = null) {
  if (isReadOnlyRole(session.role) || session.role === "bendahara") {
    return false;
  }
  if (session.role === "admin") {
    return true;
  }

  return !pickup || pickup.officerEmail === session.email || pickup.officerEmail === "petugas@rantingnu.id";
}

function canEditPickup(session, pickup = null) {
  return session.role === "admin" || (session.role === "petugas" && canManagePickup(session, pickup));
}

function canDeletePickup(session) {
  return session.role === "admin";
}

function renderLazisnuLogo(className = "") {
  return `<img class="lazisnu-logo ${className}" src="${brand.logo}" data-fallback-src="${brand.fallbackLogo}" onerror="if(this.src.endsWith('${brand.fallbackLogo}'))return;this.src=this.dataset.fallbackSrc;" alt="Logo NU Care LAZISNU" />`;
}

function renderBrandFooter(className = "") {
  return `<footer class="brand-footer ${className}">${brand.footer}</footer>`;
}

function getOfficerByName(name) {
  return appState.officers.find((officer) => officer.name === name);
}

function getOfficerByEmail(email) {
  return appState.officers.find((officer) => officer.username === email);
}

function getDefaultOfficer(session) {
  return getOfficerByEmail(session?.email) || appState.officers.find((officer) => officer.active) || appState.officers[0];
}

function resolveOfficerEmail(name, fallback = "") {
  return getOfficerByName(name)?.username || fallback;
}

function renderOfficerOptions(selectedName = "") {
  return appState.officers.map((officer) => `
    <option value="${escapeHtml(officer.name)}" ${officer.name === selectedName ? "selected" : ""}>
      ${escapeHtml(officer.name)} - ${escapeHtml(officer.area)}
    </option>
  `).join("");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function generateDonorCode(donor) {
  return `DON-${String(donor.rt || "0").padStart(3, "0")}-${String(donor.rw || "0").padStart(3, "0")}-${String(donor.id || "0").padStart(4, "0")}`;
}

function createDonorQrPng(value, cellSize = 6, margin = 3) {
  if (typeof window.qrcode !== "function") return "";
  const qr = window.qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const moduleCount = qr.getModuleCount();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = (moduleCount + margin * 2) * cellSize;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#000000";
  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (qr.isDark(row, column)) {
        context.fillRect((column + margin) * cellSize, (row + margin) * cellSize, cellSize, cellSize);
      }
    }
  }
  return canvas.toDataURL("image/png");
}

function ensureDonorQr(donor, force = false) {
  donor.donorCode = force || !donor.donorCode ? generateDonorCode(donor) : donor.donorCode;
  donor.qrCodeValue = force || !donor.qrCodeValue ? donor.donorCode : donor.qrCodeValue;
  donor.qrCodeImage = force || !donor.qrCodeImage ? createDonorQrPng(donor.qrCodeValue) : donor.qrCodeImage;
  return donor;
}

function generateAllDonorQrs(force = false) {
  let generatedCount = 0;
  appState.donors.forEach((donor) => {
    const previousImage = donor.qrCodeImage;
    ensureDonorQr(donor, force);
    if (!previousImage && donor.qrCodeImage) generatedCount += 1;
  });
  return generatedCount;
}

function getDonorQrDataUrl(donor) {
  return ensureDonorQr(donor).qrCodeImage || "";
}

function renderDonorQr(donor, className = "") {
  const dataUrl = getDonorQrDataUrl(donor);
  return dataUrl
    ? `<img class="donor-qr ${className}" src="${dataUrl}" alt="QR ${escapeHtml(donor.donorCode)}" />`
    : `<div class="qr-placeholder">QR belum tersedia</div>`;
}

function downloadDonorQr(donor) {
  const link = document.createElement("a");
  link.href = ensureDonorQr(donor, true).qrCodeImage;
  link.download = `${donor.donorCode}.png`;
  link.click();
}

function renderDonorLabel(donor) {
  return `
    <article class="qr-label">
      <header>${renderLazisnuLogo("qr-label-logo")}<strong>SIKOINNU</strong></header>
      ${renderDonorQr(donor, "large")}
      <h2>${escapeHtml(donor.name)}</h2>
      <p>RT ${escapeHtml(donor.rt)} / RW ${escapeHtml(donor.rw)}</p>
      <p>${escapeHtml(donor.address)}</p>
      <strong>${escapeHtml(donor.donorCode)}</strong>
    </article>
  `;
}

function printDonorQrLabels(donors) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup cetak diblokir browser. Izinkan popup lalu coba lagi.");
    return;
  }
  printWindow.opener = null;
  printWindow.document.write(`<!doctype html><html><head><title>Cetak QR Donatur</title><style>
    body{font-family:Arial,sans-serif;margin:16px;color:#123d29}.labels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .qr-label{break-inside:avoid;text-align:center;border:1px solid #bad7c4;border-radius:12px;padding:14px}.qr-label header{display:flex;align-items:center;justify-content:center;gap:8px}.qr-label-logo{width:42px;height:42px;object-fit:contain}.donor-qr{width:160px;height:160px;margin:8px auto;image-rendering:pixelated}.qr-label h2{font-size:16px;margin:6px 0}.qr-label p{font-size:12px;margin:4px 0}@media print{body{margin:0}}
  </style></head><body><main class="labels">${donors.map(renderDonorLabel).join("")}</main><script>window.onload=()=>window.print()<\/script></body></html>`);
  printWindow.document.close();
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatCompactRupiah(value) {
  return `Rp${new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value)}`;
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateTransactionNo(date) {
  const normalizedDate = (date || getLocalDateString()).replaceAll("-", "");
  const sameDateCount = appState.pickups.filter((pickup) => pickup.date === date).length + 1;
  return `TRX-${normalizedDate}-${String(sameDateCount).padStart(3, "0")}`;
}

const distributionCategories = [
  "Santunan Yatim",
  "Bantuan Dhuafa",
  "Pendidikan",
  "Kesehatan",
  "Kematian",
  "Bencana",
  "Kegiatan Keagamaan",
  "Operasional Ranting",
  "Lainnya"
];

function generateDistributionNo(date) {
  const normalizedDate = (date || getLocalDateString()).replaceAll("-", "");
  const sameDateCount = appState.distributions.filter((distribution) => distribution.date === date).length + 1;
  return `SLR-${normalizedDate}-${String(sameDateCount).padStart(3, "0")}`;
}

function generateOfficerDepositNo(date) {
  const normalizedDate = (date || getLocalDateString()).replaceAll("-", "");
  const sameDateCount = appState.officerDeposits.filter((item) => item.date === date).length + 1;
  return `STP-${normalizedDate}-${String(sameDateCount).padStart(3, "0")}`;
}

function generateLazisnuDepositNo(date) {
  const normalizedDate = (date || getLocalDateString()).replaceAll("-", "");
  const sameDateCount = appState.lazisnuDeposits.filter((item) => item.date === date).length + 1;
  return `LAZ-${normalizedDate}-${String(sameDateCount).padStart(3, "0")}`;
}

function formatDateId(value) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTimeId(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getVisibleDonors(session) {
  let donors = [...appState.donors];

  if (session.role === "petugas") {
    donors = donors.filter((donor) => donor.officerEmail === session.email || donor.officerEmail === "petugas@rantingnu.id");
  }

  const search = appState.donorSearch.trim().toLowerCase();
  if (search) {
    donors = donors.filter((donor) => donor.name.toLowerCase().includes(search));
  }

  if (appState.donorRt !== "all") {
    donors = donors.filter((donor) => donor.rt === appState.donorRt);
  }

  if (appState.donorRw !== "all") {
    donors = donors.filter((donor) => donor.rw === appState.donorRw);
  }

  if (appState.donorStatus !== "all") {
    donors = donors.filter((donor) => donor.active === (appState.donorStatus === "active"));
  }

  return donors;
}

function getPickupDonorOptions(session) {
  const donors = session.role === "petugas"
    ? appState.donors.filter((donor) => donor.officerEmail === session.email || donor.officerEmail === "petugas@rantingnu.id")
    : appState.donors;

  return donors.filter((donor) => donor.active);
}

function getVisiblePickups(session) {
  let pickups = [...appState.pickups];

  if (session.role === "petugas") {
    pickups = pickups.filter((pickup) => pickup.officerEmail === session.email || pickup.officerEmail === "petugas@rantingnu.id");
  }

  if (appState.pickupDonor !== "all") {
    pickups = pickups.filter((pickup) => pickup.donorId === Number(appState.pickupDonor));
  }

  const search = appState.pickupSearch.trim().toLowerCase();
  if (search) {
    pickups = pickups.filter((pickup) => pickup.donorName.toLowerCase().includes(search));
  }

  if (appState.pickupDate) {
    pickups = pickups.filter((pickup) => pickup.date === appState.pickupDate);
  }

  if (appState.pickupOfficer !== "all") {
    pickups = pickups.filter((pickup) => pickup.officer === appState.pickupOfficer);
  }

  if (appState.pickupMethod !== "all") {
    pickups = pickups.filter((pickup) => pickup.method === appState.pickupMethod);
  }

  if (appState.pickupNotificationStatus !== "all") {
    pickups = pickups.filter((pickup) => pickup.notificationStatus === appState.pickupNotificationStatus);
  }

  return pickups.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function getSummaryCards(role) {
  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 1. Total koin bulan ini
  let monthlyCoins = appState.pickups
    .filter((p) => p.date.startsWith(currentYm) && p.status === "Disetujui Bendahara")
    .reduce((sum, p) => sum + p.amount, 0);
  
  if (monthlyCoins === 0) {
    const months = [...new Set(appState.pickups.map((p) => p.date.substring(0, 7)))].sort();
    if (months.length > 0) {
      const latestMonth = months[months.length - 1];
      monthlyCoins = appState.pickups
        .filter((p) => p.date.startsWith(latestMonth) && p.status === "Disetujui Bendahara")
        .reduce((sum, p) => sum + p.amount, 0);
    }
  }

  // 2. Donatur aktif
  const activeDonors = appState.donors.filter((d) => d.active).length;

  // 3. Total petugas
  const totalOfficers = appState.officers.filter((o) => o.active).length;

  // 4. Setoran menunggu verifikasi
  const pendingDeposits = appState.officerDeposits.filter((d) => d.status === "Menunggu Verifikasi").length;

  // 5. Dana tersalurkan
  const distributedFunds = appState.distributions
    .filter((d) => d.status === "Disalurkan")
    .reduce((sum, d) => sum + d.amount, 0);

  const cards = [
    { label: "Total koin bulan ini", value: formatRupiah(monthlyCoins), hint: "Tervalidasi Bendahara", accent: "green" },
    { label: "Donatur aktif", value: activeDonors.toLocaleString("id-ID"), hint: "Basis data ranting", accent: "blue" },
    { label: "Total petugas", value: totalOfficers.toLocaleString("id-ID"), hint: "Petugas aktif lapangan", accent: "teal" },
    { label: "Setoran menunggu verifikasi", value: pendingDeposits.toLocaleString("id-ID"), hint: "Perlu cek Bendahara", accent: "amber" },
    { label: "Dana tersalurkan", value: formatRupiah(distributedFunds), hint: "Penyaluran aktif", accent: "emerald" }
  ];

  if (role === "bendahara") {
    return [cards[3], cards[0], cards[4], cards[1]];
  }

  if (role === "petugas") {
    const session = getSession();
    const myEmail = session?.email || "petugas@rantingnu.id";
    const myName = appState.officers.find((o) => o.username === myEmail)?.name || "Petugas Demo";

    // Koin diambil bulan ini oleh petugas ini
    let myMonthlyCoins = appState.pickups
      .filter((p) => p.officer === myName && p.date.startsWith(currentYm) && p.status === "Disetujui Bendahara")
      .reduce((sum, p) => sum + p.amount, 0);
    if (myMonthlyCoins === 0) {
      const months = [...new Set(appState.pickups.map((p) => p.date.substring(0, 7)))].sort();
      if (months.length > 0) {
        const latestMonth = months[months.length - 1];
        myMonthlyCoins = appState.pickups
          .filter((p) => p.officer === myName && p.date.startsWith(latestMonth) && p.status === "Disetujui Bendahara")
          .reduce((sum, p) => sum + p.amount, 0);
      }
    }

    // Donatur aktif area petugas ini
    const myDonors = appState.donors.filter((d) => d.officer === myName && d.active).length;

    // Setoran belum diverifikasi
    const myPendingPickups = appState.pickups.filter((p) => p.officer === myName && p.status === "Menunggu Verifikasi").length;

    return [
      { label: "Koin diambil bulan ini", value: formatRupiah(myMonthlyCoins), hint: "Area dampingan saya", accent: "green" },
      { label: "Donatur aktif area saya", value: myDonors.toLocaleString("id-ID"), hint: "Tanggung jawab saya", accent: "blue" },
      { label: "Setoran belum diverifikasi", value: myPendingPickups.toLocaleString("id-ID"), hint: "Menunggu bendahara", accent: "amber" },
      { label: "Total petugas ranting", value: totalOfficers.toLocaleString("id-ID"), hint: "Koordinasi aktif", accent: "teal" }
    ];
  }

  return cards;
}

function getVisibleActivities(role) {
  if (role === "bendahara") {
    return demoData.activities.filter((activity) => ["Setoran", "Verifikasi", "Penyaluran"].includes(activity.type));
  }

  if (role === "petugas") {
    return demoData.activities.filter((activity) => ["Pengambilan", "Setoran"].includes(activity.type));
  }

  return demoData.activities;
}

function renderIcon(name) {
  const icons = {
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20.5c.8-4.1 3-6.5 5.5-6.5s4.7 2.4 5.5 6.5H2.5Zm10.2-5c.9-.9 2-1.5 3.3-1.5 2.4 0 4.5 2.3 5.3 6.5h-5.7a11 11 0 0 0-2.9-5Z"/></svg>',
    coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C7 3 3 5 3 7.5v9C3 19 7 21 12 21s9-2 9-4.5v-9C21 5 17 3 12 3Zm0 2c4.1 0 7 1.4 7 2.5S16.1 10 12 10 5 8.6 5 7.5 7.9 5 12 5Zm0 14c-4.1 0-7-1.4-7-2.5v-1.8C6.6 15.7 9.1 16.4 12 16.4s5.4-.7 7-1.7v1.8c0 1.1-2.9 2.5-7 2.5Zm0-4.6c-4.1 0-7-1.4-7-2.5v-1.7c1.6 1 4.1 1.8 7 1.8s5.4-.8 7-1.8v1.7c0 1.1-2.9 2.5-7 2.5Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.2 16.6-4.1-4.1-1.5 1.5 5.6 5.6L20.7 8.1l-1.5-1.5z"/></svg>',
    report: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6V3Zm8 1.8V8h3.2L14 4.8ZM8 11v2h8v-2H8Zm0 4v2h8v-2H8Zm0-8v2h4V7H8Z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h8v2H7v12h6v2H5V4Zm10.6 4.4L19.2 12l-3.6 3.6-1.4-1.4 1.2-1.2H10v-2h5.4l-1.2-1.2 1.4-1.4Z"/></svg>'
  };

  return icons[name] || icons.grid;
}

function renderSummaryCards(role) {
  return getSummaryCards(role).map((card) => `
    <article class="metric-card accent-${card.accent}">
      <span>${card.label}</span>
      <strong>${card.value}</strong>
      <small>${card.hint}</small>
    </article>
  `).join("");
}

function getIncomeHistory() {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const now = new Date();
  const history = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const amount = appState.pickups
      .filter((p) => p.date.startsWith(ym) && p.status === "Disetujui Bendahara")
      .reduce((sum, p) => sum + p.amount, 0);
    
    history.push({
      ym,
      month: monthNames[d.getMonth()],
      amount
    });
  }

  const totalAmount = history.reduce((sum, item) => sum + item.amount, 0);
  if (totalAmount === 0) {
    return demoData.income;
  }

  return history;
}

function renderIncomeChart() {
  const history = getIncomeHistory();
  const max = Math.max(...history.map((item) => item.amount)) || 1;

  return history.map((item) => `
    <div class="chart-column">
      <div class="bar-track">
        <span class="bar-fill" style="height: ${Math.round((item.amount / max) * 100)}%"></span>
      </div>
      <strong>${item.month}</strong>
      <small>${formatCompactRupiah(item.amount)}</small>
    </div>
  `).join("");
}

function renderActivities(role) {
  return getVisibleActivities(role).map((activity) => `
    <tr>
      <td>
        <strong>${activity.type}</strong>
        <span>${activity.time}</span>
      </td>
      <td>${activity.actor}</td>
      <td>${activity.detail}</td>
      <td>${formatRupiah(activity.amount)}</td>
      <td><span class="status-pill">${activity.status}</span></td>
    </tr>
  `).join("");
}

function renderQuickActions(role) {
  return (roleContent[role] || roleContent.admin).quickActions.map((action) => `
    <button class="action-button" data-quick-nav="${quickActionRoutes[action] || "/dashboard"}" type="button">${action}</button>
  `).join("");
}

function renderShell(content) {
  document.title = `${brand.name} | Login`;
  app.innerHTML = `
    <section class="page-shell">
      <div class="brand-panel" aria-label="${brand.name}">
        ${renderLazisnuLogo("login-logo")}
        <p class="eyebrow">${brand.subtitle}</p>
        <h1>${brand.name}</h1>
        <p class="brand-tagline">${brand.tagline}</p>
        <p class="brand-copy">Kelola koin warga dengan rapi, ringan, dan mudah dipakai.</p>
        ${renderBrandFooter("brand-footer-light")}
      </div>
      ${content}
    </section>
  `;
}

function renderAppShell(session, title, content) {
  const path = window.location.pathname;
  document.title = `${brand.name} | ${title}`;

  // Preserve focus and cursor position
  const activeId = document.activeElement ? document.activeElement.id : null;
  const selectionStart = document.activeElement ? document.activeElement.selectionStart : null;
  const selectionEnd = document.activeElement ? document.activeElement.selectionEnd : null;

  app.innerHTML = `
    <section class="app-layout">
      <aside class="sidebar" aria-label="Navigasi utama">
        <div class="sidebar-brand">
          ${renderLazisnuLogo("sidebar-logo")}
          <div>
            <strong>${brand.name}</strong>
            <span>${brand.subtitle}</span>
          </div>
        </div>
        <nav class="sidebar-nav">
          ${navigationItems.filter((item) => canAccessPath(session, item.path)).map((item) => `
            <button class="nav-item ${path === item.path ? "active" : ""}" data-nav="${item.path}" type="button">
              ${renderIcon(item.icon)}
              <span>${item.label}</span>
            </button>
          `).join("")}
        </nav>
        <button class="nav-item logout-nav" id="logoutButton" type="button">
          ${renderIcon("logout")}
          <span>Logout</span>
        </button>
      </aside>

      <section class="content-shell">
        <header class="topbar">
          <div>
            <p class="eyebrow">${brand.name} | ${brand.tagline}</p>
            <h1>${title}</h1>
          </div>
          <div class="topbar-user">
            <button id="networkStatusBadge" class="network-badge ${appState.syncingOffline ? "syncing" : appState.isOffline ? "offline" : "online"}" type="button" title="Klik untuk sinkronisasi manual">
              <span class="dot"></span>
              <span>
                ${appState.syncingOffline 
                  ? "Menyelaraskan..." 
                  : appState.isOffline 
                    ? `Offline (${appState.pendingSyncCount || 0})` 
                    : "Online"
                }
              </span>
            </button>
            <span>${labelRole(session.role)}</span>
            <strong>${escapeHtml(session.email)}</strong>
          </div>
        </header>
        ${content}
        ${renderBrandFooter("content-footer")}
      </section>
    </section>
  `;

  // Restore focus and cursor position
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) {
      el.focus();
      if (selectionStart !== null && selectionEnd !== null && (el.type === "text" || el.type === "search" || el.type === "textarea")) {
        el.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }

  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.nav));
  });

  document.querySelector("#logoutButton").addEventListener("click", async () => {
    await logout();
    navigate("/login");
  });
}

function renderLogin() {
  const saved = getSession();
  if (saved?.role) {
    navigate("/dashboard");
    return;
  }

  const postgresMode = true;

  renderShell(`
    <form class="login-card" id="loginForm" novalidate>
      <div class="form-heading">
        <p class="eyebrow">${postgresMode ? "database internal" : "Mode Demo"}</p>
        <h2>Masuk ${brand.name}</h2>
        <strong class="login-subtitle">${brand.subtitle}</strong>
        <p>${postgresMode ? "Gunakan akun database internal." : "Database internal aktif."}</p>
      </div>

      <label class="field">
        <span>Email</span>
        <input id="email" type="email" autocomplete="email" placeholder="nama@rantingnu.id" />
        <small class="error" id="emailError"></small>
      </label>

      <label class="field">
        <span>Password</span>
        <input id="password" type="password" autocomplete="current-password" placeholder="Masukkan password" />
        <small class="error" id="passwordError"></small>
      </label>

      <fieldset class="role-group ${postgresMode ? "is-hidden" : ""}">
        <legend>Role Demo</legend>
        <div class="role-options">
          ${roles.map((role, index) => `
            <label class="role-option">
              <input type="radio" name="role" value="${role}" ${index === 0 ? "checked" : ""} />
              <span>${labelRole(role)}</span>
            </label>
          `).join("")}
        </div>
        <small class="error" id="roleError"></small>
      </fieldset>

      <p class="form-error" id="formError" role="alert"></p>
      <p class="form-success" id="formSuccess" role="status"></p>
      <button class="primary-button" id="loginButton" type="submit">Masuk</button>
      <button class="link-button" id="forgotPasswordButton" type="button">Lupa password?</button>
    </form>
  `);

  document.querySelector("#loginForm").addEventListener("submit", handleLogin);
  document.querySelector("#forgotPasswordButton").addEventListener("click", handleForgotPassword);
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document.querySelector("#email");
  const password = document.querySelector("#password");
  const role = document.querySelector("input[name='role']:checked");
  const postgresMode = true;
  const errors = {
    email: email.value.trim() ? "" : "Email wajib diisi.",
    password: password.value.trim() ? "" : "Password wajib diisi.",
    role: postgresMode || role ? "" : "Pilih role terlebih dahulu."
  };

  document.querySelector("#emailError").textContent = errors.email;
  document.querySelector("#passwordError").textContent = errors.password;
  document.querySelector("#roleError").textContent = errors.role;
  document.querySelector("#formSuccess").textContent = "";

  if (errors.email || errors.password || errors.role) {
    document.querySelector("#formError").textContent = "Lengkapi data masuk terlebih dahulu.";
    return;
  }

  const button = document.querySelector("#loginButton");
  button.disabled = true;
  button.textContent = "Memeriksa akun...";
  document.querySelector("#formError").textContent = "";

  try {
    if (postgresMode) {
      const auth = await internalRequest("login", { method: "POST", body: JSON.stringify({ email: email.value.trim(), password: password.value }) });
      const appSession = { ...auth.user, id: auth.user.id, email: auth.user.email, name: auth.user.fullName || auth.user.full_name || auth.user.email, role: auth.user.role, phone: auth.user.phone || "", token: auth.token, authProvider: "internal", loggedInAt: new Date().toISOString() };
      setSession(appSession);
      await loadInternalData();
    } else {
      setSession({
        id: `demo-${role.value}`,
        email: email.value.trim(),
        name: labelRole(role.value),
        role: role.value,
        authProvider: "demo",
        loggedInAt: new Date().toISOString()
      });
    }
    navigate("/dashboard");
  } catch (error) {
    clearAuthSession();
    clearSession();
    document.querySelector("#formError").textContent = parseAuthError(error);
  } finally {
    button.disabled = false;
    button.textContent = "Masuk";
  }
}

function parseAuthError(error) {
  const message = String(error?.message || error || "");
  if (message.includes("Invalid login credentials")) {
    return "Email atau password tidak sesuai.";
  }
  if (message.includes("Email not confirmed")) {
    return "Email belum dikonfirmasi.";
  }
  if (message.includes("profil belum dibuat") || message.includes("Akun belum aktif")) {
    return "Akun sudah ada, tetapi profil aplikasi belum aktif. Hubungi admin.";
  }
  return "Login belum berhasil. Periksa email, password, atau koneksi server.";
}

async function handleForgotPassword() {
  const email = document.querySelector("#email").value.trim();
  const error = document.querySelector("#formError");
  const success = document.querySelector("#formSuccess");
  error.textContent = "";
  success.textContent = "";

  if (!email) {
    error.textContent = "Isi email terlebih dahulu untuk reset password.";
    return;
  }

  if (!hasPostgresConfig()) {
    success.textContent = "Reset password belum tersedia di auth internal. Hubungi admin.";
    return;
  }

  try {
    await postgresAuthRequest("recover", {
      method: "POST",
      body: JSON.stringify({ email })
    });
    success.textContent = "Instruksi reset password sudah dikirim jika email terdaftar.";
  } catch {
    error.textContent = "Instruksi reset belum bisa dikirim. Hubungi admin.";
  }
}

function renderDashboard() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }

  const content = roleContent[session.role] || roleContent.admin;

  renderAppShell(session, "Dashboard", `
    <section class="welcome-panel role-${session.role}">
      <div class="welcome-copy">
        <div class="dashboard-brand">
          ${renderLazisnuLogo("dashboard-logo")}
          <div>
            <p class="eyebrow">${brand.name}</p>
            <strong>${brand.tagline}</strong>
          </div>
        </div>
        <h2>${content.title}</h2>
        <p>${content.description}</p>
        <div class="identity-row">
          <span>${labelRole(session.role)}</span>
          <span>${escapeHtml(session.email)}</span>
        </div>
      </div>
      <div class="quick-actions" aria-label="Aksi cepat">
        ${renderQuickActions(session.role)}
      </div>
    </section>

    <section class="summary-grid" aria-label="Ringkasan dashboard">
      ${renderSummaryCards(session.role)}
    </section>

    <section class="dashboard-grid">
      <article class="panel chart-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Pemasukan</p>
            <h2>6 bulan terakhir</h2>
          </div>
          <span>${formatRupiah(demoData.totals.monthlyCoins)}</span>
        </div>
        <div class="income-chart" aria-label="Grafik pemasukan 6 bulan terakhir">
          ${renderIncomeChart()}
        </div>
      </article>

      <article class="panel focus-panel">
        <p class="eyebrow">Prioritas ${labelRole(session.role)}</p>
        <h2>${session.role === "petugas" ? "Pengambilan hari ini" : session.role === "bendahara" ? "Antrian verifikasi" : "Status operasional"}</h2>
        <div class="focus-list">
          <div>
            <strong>${session.role === "petugas" ? "14" : session.role === "bendahara" ? "7" : "31"}</strong>
            <span>${session.role === "petugas" ? "rumah target" : session.role === "bendahara" ? "setoran perlu dicek" : "aktivitas minggu ini"}</span>
          </div>
          <div>
            <strong>${session.role === "petugas" ? formatRupiah(850000) : session.role === "bendahara" ? formatRupiah(4150000) : "96%"}</strong>
            <span>${session.role === "petugas" ? "estimasi koin" : session.role === "bendahara" ? "nominal menunggu" : "data sudah lengkap"}</span>
          </div>
        </div>
      </article>
    </section>

    <section class="panel activity-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Aktivitas</p>
          <h2>Terbaru</h2>
        </div>
        <span>${getVisibleActivities(session.role).length} catatan</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Petugas</th>
              <th>Detail</th>
              <th>Nominal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${renderActivities(session.role)}
          </tbody>
        </table>
      </div>
    </section>
  `);

  document.querySelectorAll("[data-quick-nav]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.quickNav));
  });
}

function getFilterOptions(key, session) {
  return [...new Set(getVisibleDonors({ ...session, role: session.role }).map((donor) => donor[key]))].sort();
}

function renderDonorStats(donors) {
  const active = donors.filter((donor) => donor.active).length;
  const inactive = donors.length - active;
  const areas = new Set(donors.map((donor) => `${donor.rt}/${donor.rw}`)).size;

  return `
    <section class="donor-stats">
      <article><span>Total terlihat</span><strong>${donors.length}</strong></article>
      <article><span>Aktif</span><strong>${active}</strong></article>
      <article><span>Tidak aktif</span><strong>${inactive}</strong></article>
      <article><span>Wilayah</span><strong>${areas}</strong></article>
    </section>
  `;
}

const donorImportColumns = ["nama_kk", "alamat", "rt", "rw", "phone", "petugas_penanggung_jawab", "status", "catatan"];
const requiredDonorImportColumns = ["nama_kk", "alamat", "rt", "rw"];

function normalizeImportValue(value) {
  return String(value ?? "").trim();
}

function normalizeAreaValue(value) {
  return normalizeImportValue(value).padStart(2, "0");
}

function normalizeDonorStatus(value) {
  return !["tidak aktif", "tidak_aktif", "nonaktif", "inactive", "false", "0"].includes(normalizeImportValue(value).toLowerCase());
}

function getDonorDuplicateKey(name, rt, rw) {
  return `${normalizeImportValue(name).toLowerCase()}|${normalizeAreaValue(rt)}|${normalizeAreaValue(rw)}`;
}

function downloadDonorTemplate() {
  const rows = [
    donorImportColumns,
    ["Bapak Ahmad Hasyim", "Jl. Melati No. 10", "01", "03", "081234567890", "Ahmad Fauzi", "aktif", "Contoh donatur aktif"],
    ["Ibu Nur Faizah", "Gang Kenanga RT 02", "02", "03", "085712345678", "Siti Aminah", "aktif", "Contoh pengambilan Jumat sore"]
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-import-donatur.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => normalizeImportValue(cell))) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  row.push(value);
  if (row.some((cell) => normalizeImportValue(cell))) rows.push(row);
  return rows;
}

async function readDonorImportFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    return parseCsvText(await file.text());
  }
  if (extension === "xlsx") {
    return readFirstXlsxSheet(await file.arrayBuffer());
  }
  throw new Error("Pilih file dengan format .xlsx atau .csv.");
}

async function inflateZipEntry(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocdOffset = bytes.length - 22;
  while (eocdOffset >= 0 && view.getUint32(eocdOffset, true) !== 0x06054b50) eocdOffset -= 1;
  if (eocdOffset < 0) throw new Error("File XLSX tidak valid.");
  const entryCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map();
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Struktur XLSX tidak dapat dibaca.");
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(start, start + compressedSize);
    entries.set(name, method === 8 ? await inflateZipEntry(compressed) : compressed);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function parseXml(bytes, fileName) {
  if (!bytes) throw new Error(`Bagian ${fileName} tidak ditemukan pada file XLSX.`);
  return new DOMParser().parseFromString(new TextDecoder().decode(bytes), "application/xml");
}

function getExcelColumnIndex(reference = "") {
  return [...reference.replace(/\d/g, "")].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function readFirstXlsxSheet(buffer) {
  const entries = await readZipEntries(buffer);
  const sharedStringsXml = entries.get("xl/sharedStrings.xml");
  const sharedStrings = sharedStringsXml
    ? [...parseXml(sharedStringsXml, "sharedStrings.xml").querySelectorAll("si")].map((node) => node.textContent || "")
    : [];
  const workbook = parseXml(entries.get("xl/workbook.xml"), "workbook.xml");
  const relationships = parseXml(entries.get("xl/_rels/workbook.xml.rels"), "workbook.xml.rels");
  const relationshipId = workbook.querySelector("sheets sheet")?.getAttribute("r:id");
  const target = [...relationships.querySelectorAll("Relationship")]
    .find((relationship) => relationship.getAttribute("Id") === relationshipId)
    ?.getAttribute("Target");
  const sheetPath = target ? `xl/${target.replace(/^\/?xl\//, "")}` : "xl/worksheets/sheet1.xml";
  const document = parseXml(entries.get(sheetPath), sheetPath);
  return [...document.querySelectorAll("sheetData row")].map((row) => {
    const values = [];
    row.querySelectorAll("c").forEach((cell) => {
      const index = getExcelColumnIndex(cell.getAttribute("r") || "");
      const type = cell.getAttribute("t");
      const raw = cell.querySelector("v")?.textContent || cell.querySelector("is")?.textContent || "";
      values[index] = type === "s" ? sharedStrings[Number(raw)] || "" : raw;
    });
    return values;
  });
}

function validateDonorImportRows(matrix) {
  const [headerRow = [], ...dataRows] = matrix;
  const headers = headerRow.map((header) => normalizeImportValue(header).replace(/^\uFEFF/, "").toLowerCase());
  const missingColumns = requiredDonorImportColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    throw new Error(`Kolom wajib belum tersedia: ${missingColumns.join(", ")}.`);
  }
  const indexByColumn = Object.fromEntries(donorImportColumns.map((column) => [column, headers.indexOf(column)]));
  const existingKeys = new Set(appState.donors.map((donor) => getDonorDuplicateKey(donor.name, donor.rt, donor.rw)));
  const fileKeys = new Set();
  return dataRows
    .filter((row) => row.some((cell) => normalizeImportValue(cell)))
    .map((row, index) => {
      const get = (column) => indexByColumn[column] >= 0 ? normalizeImportValue(row[indexByColumn[column]]) : "";
      const officerName = get("petugas_penanggung_jawab");
      const officer = getOfficerByName(officerName);
      const donor = {
        name: get("nama_kk"),
        address: get("alamat"),
        rt: normalizeAreaValue(get("rt")),
        rw: normalizeAreaValue(get("rw")),
        phone: get("phone"),
        officer: officerName,
        officerEmail: officer?.username || "",
        active: normalizeDonorStatus(get("status")),
        note: get("catatan")
      };
      const errors = requiredDonorImportColumns.filter((column) => !get(column)).map((column) => `${column} wajib diisi`);
      const warnings = [];
      const duplicateKey = getDonorDuplicateKey(donor.name, donor.rt, donor.rw);
      if (existingKeys.has(duplicateKey) || fileKeys.has(duplicateKey)) warnings.push("Kemungkinan duplikat nama_kk + RT + RW");
      if (officerName && !officer) warnings.push(`Petugas "${officerName}" belum cocok`);
      if (!officerName) warnings.push("Petugas penanggung jawab belum diisi");
      fileKeys.add(duplicateKey);
      if (officerName && !officer) donor.note = [donor.note, `Petugas impor belum cocok: ${officerName}`].filter(Boolean).join(" | ");
      return { rowNumber: index + 2, donor, errors, warnings };
    });
}

function renderDonorImportModal() {
  if (!appState.donorImportModalOpen) return "";
  const rows = appState.donorImportRows;
  const invalidRows = rows.filter((row) => row.errors.length);
  const validRows = rows.filter((row) => !row.errors.length);
  const warningCount = rows.filter((row) => row.warnings.length).length;
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="donorImportTitle">
      <section class="donor-import-modal">
        <div class="modal-heading">
          <div><p class="eyebrow">Import Excel Donatur</p><h2 id="donorImportTitle">Preview ${escapeHtml(appState.donorImportFileName)}</h2></div>
          <button class="close-button" data-close-donor-import type="button" aria-label="Tutup">x</button>
        </div>
        <div class="import-summary">
          <article><span>Total baris</span><strong>${rows.length}</strong></article>
          <article class="valid"><span>Data valid</span><strong>${validRows.length}</strong></article>
          <article class="${invalidRows.length ? "invalid" : ""}"><span>Bermasalah</span><strong>${invalidRows.length}</strong></article>
          <article class="${warningCount ? "warning" : ""}"><span>Warning</span><strong>${warningCount}</strong></article>
        </div>
        <p class="import-help">Warning tetap dapat disimpan. Baris dengan error wajib diperbaiki di file lalu diunggah ulang.</p>
        <div class="table-wrap import-preview-table">
          <table>
            <thead><tr><th>Baris</th><th>Nama KK</th><th>Alamat</th><th>RT/RW</th><th>Petugas</th><th>Status</th><th>Catatan validasi</th></tr></thead>
            <tbody>${rows.map((row) => `
              <tr class="${row.errors.length ? "import-row-error" : row.warnings.length ? "import-row-warning" : ""}">
                <td>${row.rowNumber}</td>
                <td>${escapeHtml(row.donor.name || "-")}</td>
                <td>${escapeHtml(row.donor.address || "-")}</td>
                <td>${escapeHtml(row.donor.rt || "-")}/${escapeHtml(row.donor.rw || "-")}</td>
                <td>${escapeHtml(row.donor.officer || "-")}</td>
                <td>${row.donor.active ? "Aktif" : "Tidak aktif"}</td>
                <td>${escapeHtml([...row.errors, ...row.warnings].join("; ") || "Siap diimpor")}</td>
              </tr>
            `).join("")}</tbody>
          </table>
        </div>
        <p class="form-error" id="donorImportError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" data-close-donor-import type="button">Batal</button>
          <button class="primary-button compact" id="saveDonorImportButton" type="button" ${!rows.length || invalidRows.length ? "disabled" : ""}>Simpan Import (${validRows.length})</button>
        </div>
      </section>
    </div>
  `;
}

function renderDonorActions(donor, session) {
  const manageButtons = canManageDonors(session.role) ? `
    <button class="icon-button" data-action="edit" data-id="${donor.id}" type="button" aria-label="Edit ${escapeHtml(donor.name)}">Edit</button>
    <button class="icon-button danger" data-action="delete" data-id="${donor.id}" type="button" aria-label="Hapus ${escapeHtml(donor.name)}">Hapus</button>
  ` : "";

  return `
    <div class="row-actions">
      <button class="icon-button soft" data-action="detail" data-id="${donor.id}" type="button" aria-label="Detail ${escapeHtml(donor.name)}">Detail</button>
      <button class="icon-button soft" data-donor-qr-action="download" data-id="${donor.id}" type="button">Download QR</button>
      <button class="icon-button soft" data-donor-qr-action="print" data-id="${donor.id}" type="button">Print QR</button>
      <button class="icon-button soft" data-donor-qr-action="regenerate" data-id="${donor.id}" type="button">Generate Ulang QR</button>
      ${manageButtons}
    </div>
  `;
}

function renderDonorTable(donors, session) {
  if (!donors.length) {
    return `<div class="empty-state">Data donatur tidak ditemukan. Coba ubah pencarian atau filter wilayah.</div>`;
  }

  const rows = donors.map((donor) => `
    <tr>
      <td>
        <strong>${escapeHtml(donor.name)}</strong>
        <span>${escapeHtml(donor.phone)}</span>
      </td>
      <td>${escapeHtml(donor.address)}</td>
      <td>RT ${donor.rt} / RW ${donor.rw}</td>
      <td>${escapeHtml(donor.officer)}</td>
      <td>${renderDonorQr(donor, "small")}<span>${escapeHtml(ensureDonorQr(donor).donorCode)}</span></td>
      <td><span class="status-pill ${donor.active ? "active" : "inactive"}">${donor.active ? "Aktif" : "Tidak aktif"}</span></td>
      <td>${renderDonorActions(donor, session)}</td>
    </tr>
  `).join("");

  const cards = donors.map((donor) => `
    <article class="donor-card">
      <div>
        <strong>${escapeHtml(donor.name)}</strong>
        <span>${escapeHtml(donor.address)}</span>
      </div>
      <div class="donor-card-meta">
        <span>RT ${donor.rt}/RW ${donor.rw}</span>
        <span>${escapeHtml(donor.officer)}</span>
        <span class="status-pill ${donor.active ? "active" : "inactive"}">${donor.active ? "Aktif" : "Tidak aktif"}</span>
      </div>
      <div class="donor-card-qr">${renderDonorQr(donor, "small")}<strong>${escapeHtml(ensureDonorQr(donor).donorCode)}</strong></div>
      ${renderDonorActions(donor, session)}
    </article>
  `).join("");

  return `
    <div class="table-wrap donor-table">
      <table>
        <thead>
          <tr>
            <th>Nama</th>
            <th>Alamat</th>
            <th>RT/RW</th>
            <th>Petugas</th>
            <th>QR Donatur</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="donor-card-list">${cards}</div>
  `;
}

function renderDonorModal(session) {
  if (!appState.modalMode) {
    return "";
  }

  const donor = appState.donors.find((item) => item.id === appState.selectedDonorId);
  const mode = appState.modalMode;
  const isReadonly = mode === "detail";
  const title = mode === "add" ? "Tambah Donatur" : mode === "edit" ? "Edit Donatur" : mode === "delete" ? "Hapus Donatur" : "Detail Donatur";

  if (mode === "delete") {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="donorModalTitle">
        <section class="confirm-modal">
          <h2 id="donorModalTitle">${title}</h2>
          <p>Yakin ingin menghapus data <strong>${escapeHtml(donor?.name || "donatur ini")}</strong>? Data demo ini akan hilang dari daftar saat ini.</p>
          <div class="modal-actions">
            <button class="ghost-button" data-close-modal type="button">Batal</button>
            <button class="danger-button" id="confirmDeleteButton" type="button">Hapus</button>
          </div>
        </section>
      </div>
    `;
  }

  const defaultOfficer = getDefaultOfficer(session);
  const values = donor || {
    name: "",
    address: "",
    rt: "",
    rw: "",
    phone: "",
    officer: defaultOfficer?.name || "",
    active: true,
    note: ""
  };

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="donorModalTitle">
      <form class="donor-form-modal" id="donorForm" novalidate>
        <div class="modal-heading">
          <div>
            <p class="eyebrow">Data Donatur</p>
            <h2 id="donorModalTitle">${title}</h2>
          </div>
          <button class="close-button" data-close-modal type="button" aria-label="Tutup">x</button>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>Nama kepala keluarga</span>
            <input name="name" value="${escapeHtml(values.name)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field">
            <span>Nomor HP</span>
            <input name="phone" value="${escapeHtml(values.phone)}" ${isReadonly ? "readonly" : ""} />
          </label>
          <label class="field full">
            <span>Alamat lengkap</span>
            <input name="address" value="${escapeHtml(values.address)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field">
            <span>RT</span>
            <input name="rt" value="${escapeHtml(values.rt)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field">
            <span>RW</span>
            <input name="rw" value="${escapeHtml(values.rw)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field">
            <span>Petugas penanggung jawab</span>
            <select name="officer" ${isReadonly ? "disabled" : ""} required>
              ${renderOfficerOptions(values.officer)}
            </select>
            ${isReadonly ? `<input type="hidden" name="officer" value="${escapeHtml(values.officer)}" />` : ""}
          </label>
          <label class="field">
            <span>Status</span>
            <select name="active" ${isReadonly ? "disabled" : ""}>
              <option value="true" ${values.active ? "selected" : ""}>Aktif</option>
              <option value="false" ${!values.active ? "selected" : ""}>Tidak aktif</option>
            </select>
          </label>
          <label class="field full">
            <span>Catatan</span>
            <textarea name="note" ${isReadonly ? "readonly" : ""}>${escapeHtml(values.note)}</textarea>
          </label>
          ${isReadonly ? `<div class="full donor-detail-qr">${renderDonorQr(ensureDonorQr(values), "large")}<div><span>Kode donatur</span><strong>${escapeHtml(values.donorCode)}</strong></div></div>` : ""}
        </div>

        <p class="form-error" id="donorFormError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" data-close-modal type="button">${isReadonly ? "Tutup" : "Batal"}</button>
          ${isReadonly ? "" : `<button class="primary-button compact" type="submit">${mode === "add" ? "Simpan Donatur" : "Simpan Perubahan"}</button>`}
        </div>
      </form>
    </div>
  `;
}

function renderDonors() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }

  const donors = getVisibleDonors(session);
  if (generateAllDonorQrs()) {
    syncTableToPostgres("donatur");
  }
  const rtOptions = [...new Set(appState.donors.map((donor) => donor.rt))].sort();
  const rwOptions = [...new Set(appState.donors.map((donor) => donor.rw))].sort();

  renderAppShell(session, "Data Donatur", `
    <section class="donor-hero">
      <div>
        <p class="eyebrow">Basis Data Ranting</p>
        <h2>Kelola donatur Koin NU per wilayah RT/RW.</h2>
        <p>${session.role === "petugas" ? "Petugas hanya melihat donatur wilayah tanggung jawabnya pada data demo." : "Admin dan bendahara dapat menambah, mengubah, serta menghapus data donatur."}</p>
      </div>
      ${canManageDonors(session.role) ? `
        <div class="donor-import-actions">
          <button class="ghost-button" id="downloadDonorTemplateButton" type="button">Download Template Excel</button>
          <button class="ghost-button" id="importDonorButton" type="button">Import Excel Donatur</button>
          <button class="ghost-button" id="printAllDonorQrButton" type="button">Cetak Semua QR Donatur</button>
          <button class="ghost-button" id="generateAllDonorQrButton" type="button">Generate Semua QR Donatur</button>
          <button class="primary-button compact" id="addDonorButton" type="button">Tambah Donatur</button>
          <input class="is-hidden" id="donorImportFile" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" />
        </div>
      ` : ""}
    </section>

    ${renderDonorStats(donors)}

    <section class="panel donor-panel">
      <div class="donor-toolbar">
        <label class="search-field">
          <span>Cari nama</span>
          <input id="donorSearch" type="search" value="${escapeHtml(appState.donorSearch)}" placeholder="Cari kepala keluarga" />
        </label>
        <label>
          <span>RT</span>
          <select id="donorRt">
            <option value="all">Semua RT</option>
            ${rtOptions.map((rt) => `<option value="${rt}" ${appState.donorRt === rt ? "selected" : ""}>RT ${rt}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>RW</span>
          <select id="donorRw">
            <option value="all">Semua RW</option>
            ${rwOptions.map((rw) => `<option value="${rw}" ${appState.donorRw === rw ? "selected" : ""}>RW ${rw}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select id="donorStatus">
            <option value="all" ${appState.donorStatus === "all" ? "selected" : ""}>Semua status</option>
            <option value="active" ${appState.donorStatus === "active" ? "selected" : ""}>Aktif</option>
            <option value="inactive" ${appState.donorStatus === "inactive" ? "selected" : ""}>Tidak aktif</option>
          </select>
        </label>
      </div>
      ${renderDonorTable(donors, session)}
    </section>
    ${renderDonorModal(session)}
    ${renderDonorImportModal()}
  `);

  bindDonorEvents(session);
}

function bindDonorEvents(session) {
  const addButton = document.querySelector("#addDonorButton");
  if (addButton) {
    addButton.addEventListener("click", () => openDonorModal("add"));
  }
  document.querySelector("#downloadDonorTemplateButton")?.addEventListener("click", downloadDonorTemplate);
  document.querySelector("#importDonorButton")?.addEventListener("click", () => document.querySelector("#donorImportFile")?.click());
  document.querySelector("#printAllDonorQrButton")?.addEventListener("click", () => printDonorQrLabels(getVisibleDonors(session)));
  document.querySelector("#generateAllDonorQrButton")?.addEventListener("click", () => {
    generateAllDonorQrs(true);
    syncTableToPostgres("donatur");
    renderDonors();
  });
  document.querySelector("#donorImportFile")?.addEventListener("change", handleDonorImportFile);
  document.querySelectorAll("[data-close-donor-import]").forEach((button) => button.addEventListener("click", closeDonorImportModal));
  document.querySelector("#saveDonorImportButton")?.addEventListener("click", saveDonorImport);

  const search = document.querySelector("#donorSearch");
  const rt = document.querySelector("#donorRt");
  const rw = document.querySelector("#donorRw");
  const status = document.querySelector("#donorStatus");

  search?.addEventListener("input", debounce((event) => {
    appState.donorSearch = event.target.value;
    renderDonors();
  }, 250));
  rt?.addEventListener("change", (event) => {
    appState.donorRt = event.target.value;
    renderDonors();
  });
  rw?.addEventListener("change", (event) => {
    appState.donorRw = event.target.value;
    renderDonors();
  });
  status?.addEventListener("change", (event) => {
    appState.donorStatus = event.target.value;
    renderDonors();
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const action = button.dataset.action;
      if ((action === "edit" || action === "delete") && !canManageDonors(session.role)) {
        return;
      }
      openDonorModal(action, id);
    });
  });
  document.querySelectorAll("[data-donor-qr-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const donor = appState.donors.find((item) => item.id === Number(button.dataset.id));
      if (!donor) return;
      if (button.dataset.donorQrAction === "download") downloadDonorQr(donor);
      if (button.dataset.donorQrAction === "print") printDonorQrLabels([donor]);
      if (button.dataset.donorQrAction === "regenerate") {
        ensureDonorQr(donor, true);
        syncRowToPostgres("donatur", donor);
        renderDonors();
      }
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeDonorModal);
  });

  document.querySelector("#donorForm")?.addEventListener("submit", handleDonorSubmit);
  document.querySelector("#confirmDeleteButton")?.addEventListener("click", handleDonorDelete);
}

async function handleDonorImportFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    appState.donorImportRows = validateDonorImportRows(await readDonorImportFile(file));
    appState.donorImportFileName = file.name;
    appState.donorImportModalOpen = true;
    renderDonors();
  } catch (error) {
    alert(error.message);
  }
}

function closeDonorImportModal() {
  appState.donorImportRows = [];
  appState.donorImportFileName = "";
  appState.donorImportModalOpen = false;
  renderDonors();
}

function saveDonorImport() {
  const invalidRows = appState.donorImportRows.filter((row) => row.errors.length);
  if (!appState.donorImportRows.length || invalidRows.length) return;
  const imported = appState.donorImportRows.map((row, index) => ({
    id: Date.now() + index,
    ...row.donor
  })).map(ensureDonorQr);
  appState.donors = [...imported, ...appState.donors];
  syncTableToPostgres("donatur");
  closeDonorImportModal();
}

function openDonorModal(mode, id = null) {
  appState.modalMode = mode;
  appState.selectedDonorId = id;
  renderDonors();
}

function closeDonorModal() {
  appState.modalMode = null;
  appState.selectedDonorId = null;
  renderDonors();
}

async function handleDonorSubmit(event) {
  event.preventDefault();

  const form = new FormData(event.currentTarget);
  const payload = {
    name: String(form.get("name") || "").trim(),
    address: String(form.get("address") || "").trim(),
    rt: String(form.get("rt") || "").trim().padStart(2, "0"),
    rw: String(form.get("rw") || "").trim().padStart(2, "0"),
    phone: String(form.get("phone") || "").trim(),
    officer: String(form.get("officer") || "").trim(),
    officerEmail: resolveOfficerEmail(String(form.get("officer") || "").trim(), "petugas@rantingnu.id"),
    active: form.get("active") === "true",
    note: String(form.get("note") || "").trim()
  };

  if (!payload.name || !payload.address || !payload.rt || !payload.rw || !payload.officer) {
    document.querySelector("#donorFormError").textContent = "Nama, alamat, RT, RW, dan petugas wajib diisi.";
    return;
  }

  let targetDonor = null;
  if (appState.modalMode === "edit") {
    appState.donors = appState.donors.map((donor) => {
      if (donor.id === appState.selectedDonorId) {
        targetDonor = ensureDonorQr({ ...donor, ...payload, officerEmail: donor.officerEmail });
        return targetDonor;
      }
      return donor;
    });
  } else {
    targetDonor = ensureDonorQr({ id: Date.now(), ...payload });
    appState.donors = [
      targetDonor,
      ...appState.donors
    ];
  }

  const ok = await wrapFormSubmit(event, () => syncRowToPostgres("donatur", targetDonor));
  if (ok) {
    closeDonorModal();
  }
}

async function handleDonorDelete() {
  if (!await deleteRowFromPostgres("donatur", appState.selectedDonorId)) {
    return;
  }
  appState.donors = appState.donors.filter((donor) => donor.id !== appState.selectedDonorId);
  closeDonorModal();
}

function renderPickupStats(pickups) {
  const today = getLocalDateString();
  const month = today.slice(0, 7);
  const totalToday = pickups
    .filter((pickup) => pickup.date === today)
    .reduce((sum, pickup) => sum + pickup.amount, 0);
  const totalMonth = pickups
    .filter((pickup) => pickup.date.startsWith(month))
    .reduce((sum, pickup) => sum + pickup.amount, 0);
  const waiting = pickups.filter((pickup) => pickup.status === "Menunggu Verifikasi").length;

  return `
    <section class="pickup-stats">
      <article><span>Total hari ini</span><strong>${formatRupiah(totalToday)}</strong></article>
      <article><span>Total bulan ini</span><strong>${formatRupiah(totalMonth)}</strong></article>
      <article><span>Jumlah transaksi</span><strong>${pickups.length}</strong></article>
      <article><span>Menunggu verifikasi</span><strong>${waiting}</strong></article>
    </section>
  `;
}

function renderPickupActions(pickup, session) {
  const verifyButtons = (session.role === "bendahara" || session.role === "admin") && pickup.status === "Menunggu Verifikasi" ? `
    <button class="icon-button approve" data-pickup-action="approve" data-id="${pickup.id}" type="button">Setujui</button>
    <button class="icon-button warning" data-pickup-action="reject" data-id="${pickup.id}" type="button">Tolak</button>
  ` : "";
  const editButton = canEditPickup(session, pickup) ? `
    <button class="icon-button" data-pickup-action="edit" data-id="${pickup.id}" type="button" aria-label="Edit pengambilan ${escapeHtml(pickup.donorName)}">Edit</button>
  ` : "";
  const deleteButton = canDeletePickup(session) ? `
    <button class="icon-button danger" data-pickup-action="delete" data-id="${pickup.id}" type="button" aria-label="Hapus pengambilan ${escapeHtml(pickup.donorName)}">Hapus</button>
  ` : "";

  return `
    <div class="row-actions">
      <button class="icon-button soft" data-pickup-action="detail" data-id="${pickup.id}" type="button" aria-label="Detail pengambilan ${escapeHtml(pickup.donorName)}">Detail</button>
      ${verifyButtons}
      ${editButton}
      ${deleteButton}
    </div>
  `;
}

function getPickupStatusClass(status) {
  if (status === "Disetujui Bendahara") {
    return "approved";
  }

  if (status === "Ditolak") {
    return "rejected";
  }

  if (status === "Perlu Revisi") {
    return "revision";
  }

  return "waiting";
}

function renderPickupTable(pickups, session) {
  if (!pickups.length) {
    return `<div class="empty-state">Riwayat pengambilan belum ditemukan. Coba ubah filter atau tambah data baru.</div>`;
  }

  const rows = pickups.map((pickup) => `
    <tr>
      <td>
        <strong>${escapeHtml(pickup.transactionNo)} ${pickup._offline ? `<span class="offline-sync-indicator" title="Disimpan secara lokal, belum disinkronkan">Lokal</span>` : ""}</strong>
        <span>${formatDateId(pickup.date)}</span>
      </td>
      <td>
        <strong>${escapeHtml(pickup.donorName)}</strong>
        <span>${escapeHtml(pickup.donorAddress || "-")}</span>
      </td>
      <td>${formatRupiah(pickup.amount)}</td>
      <td><span class="status-pill active">${escapeHtml(pickup.method)}</span></td>
      <td>${escapeHtml(pickup.officer)}</td>
      <td><span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span></td>
      <td><span class="status-pill ${getPickupNotificationClass(pickup.notificationStatus)}">${escapeHtml(getPickupNotificationLabel(pickup.notificationStatus))}</span></td>
      <td>${renderPickupActions(pickup, session)}</td>
    </tr>
  `).join("");

  const cards = pickups.map((pickup) => `
    <article class="pickup-card">
      <div>
        <strong>${escapeHtml(pickup.donorName)} ${pickup._offline ? `<span class="offline-sync-indicator" title="Disimpan secara lokal, belum disinkronkan">Lokal</span>` : ""}</strong>
        <span>${escapeHtml(pickup.transactionNo)} - ${formatDateId(pickup.date)}</span>
      </div>
      <div class="pickup-card-meta">
        <span>${formatRupiah(pickup.amount)}</span>
        <span>${escapeHtml(pickup.method)}</span>
        <span>${escapeHtml(pickup.officer)}</span>
        <span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span>
        <span class="status-pill ${getPickupNotificationClass(pickup.notificationStatus)}">${escapeHtml(getPickupNotificationLabel(pickup.notificationStatus))}</span>
      </div>
      <p>${pickup.note ? escapeHtml(pickup.note) : "Tidak ada catatan."}</p>
      ${renderPickupActions(pickup, session)}
    </article>
  `).join("");

  return `
    <div class="table-wrap pickup-table">
      <table>
        <thead>
          <tr>
            <th>No. Transaksi</th>
            <th>Donatur</th>
            <th>Nominal</th>
            <th>Metode</th>
            <th>Petugas</th>
            <th>Status</th>
            <th>Notifikasi</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="pickup-card-list">${cards}</div>
  `;
}

function normalizeWhatsappNumber(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

function getPickupNotificationLabel(status = "belum_dikirim") {
  return {
    belum_dikirim: "Belum dikirim",
    terkirim_wa: "WA Terkirim",
    nomor_kosong: "Nomor kosong",
    cetak_bukti: "Cetak bukti",
    konfirmasi_manual: "Perlu konfirmasi manual"
  }[status] || status;
}

function getPickupNotificationClass(status = "") {
  if (status === "terkirim_wa") return "approved";
  if (status === "nomor_kosong") return "rejected";
  if (status === "cetak_bukti") return "revision";
  if (status === "konfirmasi_manual") return "waiting";
  return "inactive";
}

function getWhatsappMessage(pickup) {
  return `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu ${pickup.donorName}

Terima kasih. Koin NU/Infaq atas nama ${pickup.donorName} telah diterima oleh petugas SIKOINNU.

Nomor Transaksi: ${pickup.transactionNo}
Tanggal: ${formatDateId(pickup.date)}
Nominal: ${formatRupiah(pickup.amount)}
Metode: ${pickup.method}
Petugas: ${pickup.officer}
Status: Menunggu Verifikasi Bendahara

Dana akan dikelola melalui LAZISNU/Ranting NU secara amanah, transparan, dan berdampak.

Wassalamu'alaikum Wr. Wb.
SIKOINNU
Sistem Informasi Koin Nahdlatul Ulama`;
}

function addPickupNotificationHistory(pickup, status, note = "") {
  const timestamp = new Date().toISOString();
  pickup.notificationStatus = status;
  pickup.notificationAt = timestamp;
  pickup.notificationNote = note;
  pickup.notificationHistory = [...(pickup.notificationHistory || []), { status, timestamp, note }];
  syncRowToPostgres("pengambilan_koin", pickup);
}

function renderPickupNotificationHistory(pickup) {
  const history = pickup.notificationHistory || [];
  return `
    <section class="notification-history">
      <div class="notification-history-heading">
        <div>
          <p class="eyebrow">Riwayat Notifikasi</p>
          <h3>Informasi WhatsApp dan bukti transaksi</h3>
        </div>
        <span class="status-pill ${getPickupNotificationClass(pickup.notificationStatus)}">${escapeHtml(getPickupNotificationLabel(pickup.notificationStatus))}</span>
      </div>
      ${pickup.notificationNote ? `<p class="muted">${escapeHtml(pickup.notificationNote)}</p>` : ""}
      ${history.length ? `
        <div class="notification-history-list">
          ${history.slice().reverse().map((item) => `
            <article>
              <strong>${escapeHtml(getPickupNotificationLabel(item.status))}</strong>
              <span>${formatDateTimeId(item.timestamp)}</span>
              ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
            </article>
          `).join("")}
        </div>
      ` : `<p class="muted">Belum ada aktivitas notifikasi.</p>`}
    </section>
  `;
}

function printPickupReceipt(pickup) {
  const donor = appState.donors.find((item) => item.id === pickup.donorId) || {};
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup cetak diblokir browser. Izinkan popup lalu coba lagi.");
    return;
  }
  printWindow.opener = null;
  printWindow.document.write(`<!doctype html><html><head><title>Bukti ${escapeHtml(pickup.transactionNo)}</title><style>
    body{font-family:Arial,sans-serif;color:#123d29;margin:24px}.receipt{max-width:560px;margin:auto;border:1px solid #bad7c4;border-radius:12px;padding:20px}.brand{display:flex;align-items:center;gap:10px;border-bottom:2px solid #d8ad45;padding-bottom:12px}.brand img{width:54px}.grid{display:grid;grid-template-columns:160px 1fr;gap:8px;margin-top:18px}.footer{margin-top:20px;color:#587363;font-size:12px}@media print{body{margin:0}.receipt{border:0}}
  </style></head><body><main class="receipt"><div class="brand">${renderLazisnuLogo()}<div><strong>SIKOINNU</strong><br><span>Bukti Pengambilan Koin NU</span></div></div><div class="grid">
    <span>Nomor transaksi</span><strong>${escapeHtml(pickup.transactionNo)}</strong>
    <span>Nama donatur</span><strong>${escapeHtml(pickup.donorName)}</strong>
    <span>Alamat</span><strong>${escapeHtml(donor.address || pickup.donorAddress || "-")}</strong>
    <span>Tanggal</span><strong>${formatDateId(pickup.date)}</strong>
    <span>Nominal</span><strong>${formatRupiah(pickup.amount)}</strong>
    <span>Metode</span><strong>${escapeHtml(pickup.method)}</strong>
    <span>Petugas</span><strong>${escapeHtml(pickup.officer)}</strong>
    <span>Status</span><strong>${escapeHtml(pickup.status)}</strong>
  </div><p class="footer">Dana dikelola melalui LAZISNU/Ranting NU secara amanah, transparan, dan berdampak.</p></main><script>window.onload=()=>window.print()<\/script></body></html>`);
  printWindow.document.close();
  addPickupNotificationHistory(pickup, "cetak_bukti", "Bukti transaksi dicetak.");
  renderPickups();
}

function renderPickupSuccessModal() {
  const pickup = appState.pickups.find((item) => item.id === appState.pickupSuccessId);
  if (!pickup) return "";
  const donor = appState.donors.find((item) => item.id === pickup.donorId) || {};
  const whatsappNumber = normalizeWhatsappNumber(donor.phone);
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pickupSuccessTitle">
      <section class="pickup-success-modal">
        <div class="modal-heading"><div><p class="eyebrow">Transaksi Tersimpan</p><h2 id="pickupSuccessTitle">Pengambilan Berhasil</h2></div></div>
        <div class="detail-grid">
          <div><span>Nama donatur</span><strong>${escapeHtml(pickup.donorName)}</strong></div>
          <div><span>Tanggal</span><strong>${formatDateId(pickup.date)}</strong></div>
          <div><span>Nominal</span><strong>${formatRupiah(pickup.amount)}</strong></div>
          <div><span>Metode pembayaran</span><strong>${escapeHtml(pickup.method)}</strong></div>
          <div><span>Petugas</span><strong>${escapeHtml(pickup.officer)}</strong></div>
          <div><span>Nomor transaksi</span><strong>${escapeHtml(pickup.transactionNo)}</strong></div>
          <div class="full"><span>Status verifikasi</span><strong>${escapeHtml(pickup.status)}</strong></div>
          <div class="full"><span>Status notifikasi</span><strong><span class="status-pill ${getPickupNotificationClass(pickup.notificationStatus)}">${escapeHtml(getPickupNotificationLabel(pickup.notificationStatus))}</span></strong></div>
        </div>
        ${whatsappNumber ? "" : `<p class="form-error">Nomor WhatsApp donatur belum tersedia.</p>`}
        <div class="modal-actions pickup-success-actions">
          <button class="primary-button compact" id="sendPickupWhatsappButton" type="button" ${whatsappNumber ? "" : "disabled"}>Kirim WhatsApp</button>
          <button class="ghost-button" id="printPickupReceiptButton" type="button">Cetak Bukti</button>
          ${whatsappNumber ? "" : `<button class="ghost-button" id="manualPickupConfirmationButton" type="button">Tandai Perlu Konfirmasi Manual</button><button class="ghost-button" id="sendPickupToOfficerButton" type="button">Kirim ke Petugas/Pengurus</button>`}
          <button class="ghost-button" data-close-pickup-success type="button">Tutup</button>
        </div>
      </section>
    </div>
  `;
}

let donorQrScanner = null;

function renderPickupScannerModal() {
  if (!appState.pickupScannerOpen) return "";
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pickupScannerTitle">
      <section class="qr-scanner-modal">
        <div class="modal-heading">
          <div><p class="eyebrow">Scan QR Donatur</p><h2 id="pickupScannerTitle">Arahkan kamera ke QR donatur</h2></div>
          <button class="close-button" data-close-pickup-scanner type="button" aria-label="Tutup">x</button>
        </div>
        <div id="donorQrReader" class="qr-reader"></div>
        <p class="import-help">Izinkan akses kamera saat diminta. Jika kamera tidak tersedia, masukkan kode donatur secara manual.</p>
        <div class="qr-manual-search">
          <label class="field"><span>Kode donatur</span><input id="manualDonorCode" placeholder="Contoh: DON-001-003-0001" /></label>
          <button class="primary-button compact" id="findDonorByCodeButton" type="button">Cari Donatur</button>
        </div>
        <p class="form-error" id="pickupScannerError" role="alert"></p>
      </section>
    </div>
  `;
}

function loadQrScannerLibrary() {
  if (window.Html5Qrcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-html5-qrcode]");
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "/vendor/html5-qrcode.min.js";
    script.dataset.html5Qrcode = "true";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Pemindai QR gagal dimuat."));
    document.head.append(script);
  });
}

function findScannableDonor(value, session) {
  const normalized = String(value || "").trim();
  const donor = appState.donors.map(ensureDonorQr).find((item) => item.qrCodeValue === normalized || item.donorCode === normalized);
  if (!donor) throw new Error("Donatur tidak ditemukan");
  if (session.role === "petugas" && donor.officerEmail !== session.email && donor.officerEmail !== "petugas@rantingnu.id") {
    throw new Error("Donatur berada di luar wilayah tugas Anda.");
  }
  if (!donor.active) throw new Error("Donatur tidak aktif. Periksa data donatur sebelum mencatat pengambilan.");
  return donor;
}

async function stopDonorQrScanner() {
  if (!donorQrScanner) return;
  try {
    if (donorQrScanner.isScanning) await donorQrScanner.stop();
    await donorQrScanner.clear();
  } catch {
    // Scanner may already be stopped when the modal closes.
  }
  donorQrScanner = null;
}

async function selectDonorFromQr(value, session) {
  const error = document.querySelector("#pickupScannerError");
  try {
    const donor = findScannableDonor(value, session);
    await stopDonorQrScanner();
    appState.pickupScannerOpen = false;
    appState.pickupPresetDonorId = donor.id;
    openPickupModal("add");
  } catch (scanError) {
    if (error) error.textContent = scanError.message;
  }
}

async function startDonorQrScanner(session) {
  const error = document.querySelector("#pickupScannerError");
  try {
    await loadQrScannerLibrary();
    donorQrScanner = new window.Html5Qrcode("donorQrReader");
    await donorQrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => selectDonorFromQr(decodedText, session),
      () => {}
    );
  } catch {
    if (error) error.textContent = "Kamera tidak tersedia atau izin kamera belum diberikan. Gunakan pencarian kode manual.";
  }
}

function openPickupScanner(session) {
  appState.pickupScannerOpen = true;
  renderPickups();
  startDonorQrScanner(session);
}

async function closePickupScanner() {
  await stopDonorQrScanner();
  appState.pickupScannerOpen = false;
  renderPickups();
}

function renderPickupModal(session) {
  if (!appState.pickupModalMode) {
    return "";
  }

  const pickup = appState.pickups.find((item) => item.id === appState.selectedPickupId);
  const mode = appState.pickupModalMode;
  const isReadonly = mode === "detail";
  const title = mode === "add" ? "Tambah Pengambilan" : mode === "edit" ? "Edit Pengambilan" : mode === "delete" ? "Hapus Pengambilan" : "Detail Pengambilan";

  if (mode === "delete") {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pickupModalTitle">
        <section class="confirm-modal">
          <h2 id="pickupModalTitle">${title}</h2>
          <p>Yakin ingin menghapus pengambilan dari <strong>${escapeHtml(pickup?.donorName || "donatur ini")}</strong> sebesar <strong>${formatRupiah(pickup?.amount || 0)}</strong>?</p>
          <div class="modal-actions">
            <button class="ghost-button" data-close-pickup-modal type="button">Batal</button>
            <button class="danger-button" id="confirmPickupDeleteButton" type="button">Hapus</button>
          </div>
        </section>
      </div>
    `;
  }

  const donors = getPickupDonorOptions(session);
  const selectedDonor = donors.find((donor) => donor.id === (appState.pickupPresetDonorId || pickup?.donorId)) || donors[0] || appState.donors[0];
  const defaultOfficer = getDefaultOfficer(session);
  const values = pickup || {
    transactionNo: generateTransactionNo(getLocalDateString()),
    donorId: selectedDonor?.id || "",
    donorName: selectedDonor?.name || "",
    donorAddress: selectedDonor?.address || "",
    date: getLocalDateString(),
    amount: "",
    method: "Tunai",
    status: "Menunggu Verifikasi",
    note: "",
    proofPhotoUrl: "",
    proofPhotoName: "",
    officer: selectedDonor?.officer || defaultOfficer?.name || ""
  };

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pickupModalTitle">
      <form class="donor-form-modal" id="pickupForm" novalidate>
        <div class="modal-heading">
          <div>
            <p class="eyebrow">Pengambilan Koin</p>
            <h2 id="pickupModalTitle">${title}</h2>
          </div>
          <button class="close-button" data-close-pickup-modal type="button" aria-label="Tutup">x</button>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>Nomor transaksi otomatis</span>
            <input name="transactionNo" id="pickupTransactionNo" value="${escapeHtml(values.transactionNo)}" readonly />
          </label>
          <label class="field">
            <span>Tanggal pengambilan</span>
            <input name="date" id="pickupDateInput" type="date" value="${escapeHtml(values.date)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field full">
            <span>Nama donatur</span>
            <select name="donorId" id="pickupDonorSelect" ${isReadonly ? "disabled" : ""} required>
              ${donors.map((donor) => `<option value="${donor.id}" ${Number(values.donorId) === donor.id ? "selected" : ""}>${escapeHtml(donor.name)} - RT ${donor.rt}/RW ${donor.rw}</option>`).join("")}
            </select>
          </label>
          <label class="field full">
            <span>Alamat otomatis</span>
            <input name="donorAddress" id="pickupDonorAddress" value="${escapeHtml(values.donorAddress || "")}" readonly />
          </label>
          <label class="field">
            <span>RT/RW otomatis</span>
            <input id="pickupDonorArea" value="RT ${escapeHtml(selectedDonor?.rt || "-")} / RW ${escapeHtml(selectedDonor?.rw || "-")}" readonly />
          </label>
          <label class="field">
            <span>Petugas pengambil</span>
            <select name="officer" ${session.role === "petugas" || isReadonly ? "disabled" : ""} required>
              ${renderOfficerOptions(values.officer)}
            </select>
            ${session.role === "petugas" || isReadonly ? `<input type="hidden" name="officer" value="${escapeHtml(values.officer)}" />` : ""}
          </label>
          <label class="field">
            <span>Nominal yang diterima</span>
            <input name="amount" type="number" min="0" step="1000" value="${escapeHtml(values.amount)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field">
            <span>Metode pembayaran</span>
            <select name="method" ${isReadonly ? "disabled" : ""}>
              ${["Tunai", "Transfer", "QRIS"].map((method) => `<option value="${method}" ${values.method === method ? "selected" : ""}>${method}</option>`).join("")}
            </select>
          </label>
          <label class="field">
            <span>Status transaksi</span>
            <select name="status" ${session.role === "petugas" || isReadonly ? "disabled" : ""}>
              ${["Menunggu Verifikasi", "Disetujui Bendahara", "Ditolak"].map((status) => `<option value="${status}" ${values.status === status ? "selected" : ""}>${status}</option>`).join("")}
            </select>
          </label>
          <label class="field full">
            <span>Catatan</span>
            <textarea name="note" ${isReadonly ? "readonly" : ""}>${escapeHtml(values.note)}</textarea>
          </label>
          <label class="field full">
            <span>Bukti pengambilan koin</span>
            ${isReadonly ? "" : `<input name="proofPhoto" id="pickupProofPhoto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />`}
            <small>Opsional. Format JPG, PNG, atau WEBP. Maksimal 2 MB.</small>
          </label>
          <div class="full" id="pickupProofPreview">${renderPhotoPreview(values.proofPhotoUrl, values.proofPhotoName || "Bukti pengambilan koin")}</div>
        </div>

        ${isReadonly ? renderPickupNotificationHistory(values) : ""}
        <p class="form-error" id="pickupFormError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" data-close-pickup-modal type="button">${isReadonly ? "Tutup" : "Batal"}</button>
          ${isReadonly ? "" : `<button class="primary-button compact" type="submit">${mode === "add" ? "Simpan Pengambilan" : "Simpan Perubahan"}</button>`}
        </div>
      </form>
    </div>
  `;
}

function renderPickups() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }

  const pickups = getVisiblePickups(session);
  const donors = getPickupDonorOptions(session);
  const officers = [...new Set((session.role === "petugas" ? pickups : appState.pickups).map((pickup) => pickup.officer))].sort();

  renderAppShell(session, "Pengambilan Koin", `
    <section class="pickup-hero">
      <div>
        <p class="eyebrow">Operasional Lapangan</p>
        <h2>Catat pengambilan koin dari donatur dengan cepat.</h2>
        <p>${session.role === "petugas" ? "Petugas hanya melihat dan mengelola riwayat pengambilan miliknya pada data demo." : "Admin dan bendahara dapat memantau seluruh riwayat pengambilan petugas."}</p>
      </div>
      <div class="pickup-hero-actions">
        ${!isReadOnlyRole(session.role) ? `<button class="ghost-button" id="scanDonorQrButton" type="button">Scan QR Donatur</button>` : ""}
        ${canEditPickup(session) ? `<button class="primary-button compact" id="addPickupButton" type="button">Tambah Pengambilan</button>` : ""}
      </div>
    </section>

    <div id="offlineAlertBannerContainer">
      ${renderOfflineAlertBanner()}
    </div>

    ${renderPickupStats(pickups)}

    <section class="panel pickup-panel">
      <div class="pickup-toolbar">
        <label class="search-field">
          <span>Cari nama donatur</span>
          <input id="pickupSearch" type="search" value="${escapeHtml(appState.pickupSearch)}" placeholder="Cari donatur" />
        </label>
        <label>
          <span>Tanggal</span>
          <input id="pickupDate" type="date" value="${escapeHtml(appState.pickupDate)}" />
        </label>
        <label>
          <span>Donatur</span>
          <select id="pickupDonor">
            <option value="all">Semua donatur</option>
            ${donors.map((donor) => `<option value="${donor.id}" ${appState.pickupDonor === String(donor.id) ? "selected" : ""}>${escapeHtml(donor.name)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Petugas</span>
          <select id="pickupOfficer">
            <option value="all">Semua petugas</option>
            ${officers.map((officer) => `<option value="${escapeHtml(officer)}" ${appState.pickupOfficer === officer ? "selected" : ""}>${escapeHtml(officer)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Metode</span>
          <select id="pickupMethod">
            <option value="all" ${appState.pickupMethod === "all" ? "selected" : ""}>Semua metode</option>
            ${["Tunai", "Transfer", "QRIS"].map((method) => `<option value="${method}" ${appState.pickupMethod === method ? "selected" : ""}>${method}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Notifikasi</span>
          <select id="pickupNotificationStatus">
            <option value="all" ${appState.pickupNotificationStatus === "all" ? "selected" : ""}>Semua</option>
            <option value="terkirim_wa" ${appState.pickupNotificationStatus === "terkirim_wa" ? "selected" : ""}>WA Terkirim</option>
            <option value="nomor_kosong" ${appState.pickupNotificationStatus === "nomor_kosong" ? "selected" : ""}>Nomor Kosong</option>
            <option value="konfirmasi_manual" ${appState.pickupNotificationStatus === "konfirmasi_manual" ? "selected" : ""}>Perlu Konfirmasi Manual</option>
            <option value="cetak_bukti" ${appState.pickupNotificationStatus === "cetak_bukti" ? "selected" : ""}>Cetak Bukti</option>
          </select>
        </label>
      </div>
      ${renderPickupTable(pickups, session)}
    </section>
    ${renderPickupModal(session)}
    ${renderPickupScannerModal()}
    ${renderPickupSuccessModal()}
  `);

  bindPickupEvents(session);
}

function bindPickupEvents(session) {
  document.querySelector("#syncOfflineNowButton")?.addEventListener("click", () => {
    syncOfflineData();
  });
  document.querySelector("#addPickupButton")?.addEventListener("click", () => {
    appState.pickupPresetDonorId = null;
    openPickupModal("add");
  });
  document.querySelector("#scanDonorQrButton")?.addEventListener("click", () => openPickupScanner(session));
  document.querySelectorAll("[data-close-pickup-scanner]").forEach((button) => button.addEventListener("click", closePickupScanner));
  document.querySelector("#findDonorByCodeButton")?.addEventListener("click", () => selectDonorFromQr(document.querySelector("#manualDonorCode")?.value, session));

  document.querySelector("#pickupSearch")?.addEventListener("input", debounce((event) => {
    appState.pickupSearch = event.target.value;
    renderPickups();
  }, 250));

  document.querySelector("#pickupDate")?.addEventListener("change", (event) => {
    appState.pickupDate = event.target.value;
    renderPickups();
  });

  document.querySelector("#pickupDonor")?.addEventListener("change", (event) => {
    appState.pickupDonor = event.target.value;
    renderPickups();
  });

  document.querySelector("#pickupOfficer")?.addEventListener("change", (event) => {
    appState.pickupOfficer = event.target.value;
    renderPickups();
  });

  document.querySelector("#pickupMethod")?.addEventListener("change", (event) => {
    appState.pickupMethod = event.target.value;
    renderPickups();
  });
  document.querySelector("#pickupNotificationStatus")?.addEventListener("change", (event) => {
    appState.pickupNotificationStatus = event.target.value;
    renderPickups();
  });
  document.querySelectorAll("[data-close-pickup-success]").forEach((button) => button.addEventListener("click", closePickupSuccessModal));
  document.querySelector("#sendPickupWhatsappButton")?.addEventListener("click", sendPickupWhatsapp);
  document.querySelector("#printPickupReceiptButton")?.addEventListener("click", () => {
    const pickup = appState.pickups.find((item) => item.id === appState.pickupSuccessId);
    if (pickup) printPickupReceipt(pickup);
  });
  document.querySelector("#manualPickupConfirmationButton")?.addEventListener("click", () => updatePickupSuccessNotification("konfirmasi_manual", "Perlu konfirmasi manual karena nomor WhatsApp belum tersedia."));
  document.querySelector("#sendPickupToOfficerButton")?.addEventListener("click", sendPickupToOfficer);

  document.querySelectorAll("[data-pickup-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const pickup = appState.pickups.find((item) => item.id === id);
      const action = button.dataset.pickupAction;
      if (action === "approve" || action === "reject") {
        updatePickupStatus(id, action === "approve" ? "Disetujui Bendahara" : "Ditolak", session);
        return;
      }
      if (action === "edit" && !canEditPickup(session, pickup)) {
        return;
      }
      if (action === "delete" && !canDeletePickup(session)) {
        return;
      }
      openPickupModal(action, id);
    });
  });

  document.querySelectorAll("[data-close-pickup-modal]").forEach((button) => {
    button.addEventListener("click", closePickupModal);
  });

  document.querySelector("#pickupForm")?.addEventListener("submit", (event) => handlePickupSubmit(event, session));
  bindImagePreview("#pickupProofPhoto", "#pickupProofPreview", "#pickupFormError");
  document.querySelector("#confirmPickupDeleteButton")?.addEventListener("click", handlePickupDelete);
  document.querySelector("#pickupDonorSelect")?.addEventListener("change", (event) => {
    const donor = appState.donors.find((item) => item.id === Number(event.target.value));
    const address = document.querySelector("#pickupDonorAddress");
    if (address) {
      address.value = donor?.address || "";
    }
    const area = document.querySelector("#pickupDonorArea");
    if (area) {
      area.value = `RT ${donor?.rt || "-"} / RW ${donor?.rw || "-"}`;
    }
  });
  document.querySelector("#pickupDateInput")?.addEventListener("change", (event) => {
    if (appState.pickupModalMode !== "add") {
      return;
    }
    const transactionNo = document.querySelector("#pickupTransactionNo");
    if (transactionNo) {
      transactionNo.value = generateTransactionNo(event.target.value);
    }
  });
}

function openPickupModal(mode, id = null) {
  appState.pickupModalMode = mode;
  appState.selectedPickupId = id;
  renderPickups();
}

function closePickupModal() {
  appState.pickupModalMode = null;
  appState.selectedPickupId = null;
  appState.pickupPresetDonorId = null;
  renderPickups();
}

function closePickupSuccessModal() {
  appState.pickupSuccessId = null;
  renderPickups();
}

function updatePickupSuccessNotification(status, note) {
  const pickup = appState.pickups.find((item) => item.id === appState.pickupSuccessId);
  if (!pickup) return;
  addPickupNotificationHistory(pickup, status, note);
  renderPickups();
}

function sendPickupWhatsapp() {
  const pickup = appState.pickups.find((item) => item.id === appState.pickupSuccessId);
  const donor = appState.donors.find((item) => item.id === pickup?.donorId);
  const whatsappNumber = normalizeWhatsappNumber(donor?.phone);
  if (!pickup || !whatsappNumber) return;
  addPickupNotificationHistory(pickup, "terkirim_wa", `WhatsApp dibuka untuk ${whatsappNumber}.`);
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(getWhatsappMessage(pickup))}`, "_blank", "noopener,noreferrer");
  renderPickups();
}

function sendPickupToOfficer() {
  const pickup = appState.pickups.find((item) => item.id === appState.pickupSuccessId);
  if (!pickup) return;
  const officer = appState.officers.find((item) => item.name === pickup.officer && item.active);
  const boardMember = appState.boardMembers.find((item) => item.active && normalizeWhatsappNumber(item.phone));
  const recipient = officer && normalizeWhatsappNumber(officer.phone) ? officer : boardMember;
  const whatsappNumber = normalizeWhatsappNumber(recipient?.phone);
  if (!whatsappNumber) {
    alert("Nomor WhatsApp petugas atau pengurus belum tersedia.");
    return;
  }
  const message = `Mohon konfirmasi manual pengambilan Koin NU.

Nomor Transaksi: ${pickup.transactionNo}
Donatur: ${pickup.donorName}
Tanggal: ${formatDateId(pickup.date)}
Nominal: ${formatRupiah(pickup.amount)}

Nomor WhatsApp donatur belum tersedia. Mohon petugas/pengurus melakukan konfirmasi manual.`;
  addPickupNotificationHistory(pickup, "konfirmasi_manual", `Permintaan konfirmasi manual dibuka untuk ${recipient.name}.`);
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  renderPickups();
}

async function handlePickupSubmit(event, session) {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);
  const donorId = Number(data.get("donorId"));
  const donor = appState.donors.find((item) => item.id === donorId);
  const existing = appState.pickups.find((item) => item.id === appState.selectedPickupId);
  const proofPhoto = form.elements.proofPhoto?.files?.[0];
  const photoError = validateImageFile(proofPhoto);
  if (photoError) {
    document.querySelector("#pickupFormError").textContent = photoError;
    return;
  }
  let uploadedPhoto = null;
  try {
    uploadedPhoto = proofPhoto ? await uploadDocumentationPhoto(proofPhoto, "pengambilan") : null;
  } catch (error) {
    document.querySelector("#pickupFormError").textContent = error.message;
    return;
  }
  const payload = {
    transactionNo: String(data.get("transactionNo") || "").trim() || generateTransactionNo(String(data.get("date") || getLocalDateString())),
    donorId,
    donorName: donor?.name || "",
    donorAddress: donor?.address || "",
    date: String(data.get("date") || ""),
    amount: Number(data.get("amount") || 0),
    method: String(data.get("method") || "Tunai"),
    status: session.role === "petugas" ? (existing?.status || "Menunggu Verifikasi") : String(data.get("status") || "Menunggu Verifikasi"),
    note: String(data.get("note") || "").trim(),
    officer: String(data.get("officer") || existing?.officer || getDefaultOfficer(session)?.name || "").trim(),
    officerEmail: resolveOfficerEmail(String(data.get("officer") || existing?.officer || "").trim(), session.role === "petugas" ? session.email : existing?.officerEmail || "petugas@rantingnu.id"),
    proofPhotoPath: uploadedPhoto?.path || existing?.proofPhotoPath || "",
    proofPhotoUrl: uploadedPhoto?.url || existing?.proofPhotoUrl || "",
    proofPhotoName: uploadedPhoto?.name || existing?.proofPhotoName || ""
  };

  if (!payload.donorId || !payload.date || !payload.officer || payload.amount <= 0) {
    document.querySelector("#pickupFormError").textContent = "Pilih donatur, tanggal, petugas, dan nominal yang valid.";
    return;
  }

  const isNewPickup = appState.pickupModalMode !== "edit";
  let savedPickupId = appState.selectedPickupId;
  let targetPickup = null;
  if (!isNewPickup) {
    appState.pickups = appState.pickups.map((pickup) => {
      if (pickup.id === appState.selectedPickupId) {
        targetPickup = { ...pickup, ...payload };
        return targetPickup;
      }
      return pickup;
    });
  } else {
    savedPickupId = Date.now();
    const notificationStatus = normalizeWhatsappNumber(donor?.phone) ? "belum_dikirim" : "nomor_kosong";
    targetPickup = {
      id: savedPickupId,
      ...payload,
      notificationStatus,
      notificationAt: notificationStatus === "nomor_kosong" ? new Date().toISOString() : "",
      notificationNote: notificationStatus === "nomor_kosong" ? "Nomor WhatsApp donatur belum tersedia." : "",
      notificationHistory: notificationStatus === "nomor_kosong" ? [{ status: "nomor_kosong", timestamp: new Date().toISOString(), note: "Nomor WhatsApp donatur belum tersedia." }] : []
    };
    appState.pickups = [
      targetPickup,
      ...appState.pickups
    ];
  }

  const ok = await wrapFormSubmit(event, () => syncRowToPostgres("pengambilan_koin", targetPickup));
  if (ok) {
    appState.pickupModalMode = null;
    appState.selectedPickupId = null;
    appState.pickupPresetDonorId = null;
    appState.pickupSuccessId = isNewPickup ? savedPickupId : null;
    renderPickups();
  }
}

async function handlePickupDelete() {
  if (!await deleteRowFromPostgres("pengambilan_koin", appState.selectedPickupId)) {
    return;
  }
  appState.pickups = appState.pickups.filter((pickup) => pickup.id !== appState.selectedPickupId);
  closePickupModal();
}

function updatePickupStatus(id, status, session) {
  const audit = {
    treasurer: session?.role === "admin" ? "Admin Demo" : "Bendahara Demo",
    verifiedAt: getLocalDateString(),
    status,
    note: status === "Ditolak" ? "Ditolak dari daftar pengambilan." : "Disetujui dari daftar pengambilan."
  };

  let targetPickup = null;
  appState.pickups = appState.pickups.map((pickup) => {
    if (pickup.id === id) {
      targetPickup = {
        ...pickup,
        status,
        verificationAudit: [...(pickup.verificationAudit || []), audit]
      };
      return targetPickup;
    }
    return pickup;
  });
  syncRowToPostgres("pengambilan_koin", targetPickup);
  renderPickups();
}

function canVerifyTransactions(session) {
  return session.role === "bendahara" || session.role === "admin";
}

function getPickupDonor(pickup) {
  return appState.donors.find((donor) => donor.id === pickup.donorId) || {};
}

function getVerificationBasePickups(session) {
  if (session.role === "petugas") {
    return appState.pickups.filter((pickup) => pickup.officerEmail === session.email || pickup.officerEmail === "petugas@rantingnu.id");
  }

  return [...appState.pickups];
}

function getVisibleVerifications(session) {
  let pickups = getVerificationBasePickups(session);

  if (appState.verificationTab !== "all") {
    pickups = pickups.filter((pickup) => pickup.status === appState.verificationTab);
  }

  const search = appState.verificationSearch.trim().toLowerCase();
  if (search) {
    pickups = pickups.filter((pickup) => pickup.donorName.toLowerCase().includes(search));
  }

  if (appState.verificationDate) {
    pickups = pickups.filter((pickup) => pickup.date === appState.verificationDate);
  }

  if (appState.verificationOfficer !== "all") {
    pickups = pickups.filter((pickup) => pickup.officer === appState.verificationOfficer);
  }

  if (appState.verificationMethod !== "all") {
    pickups = pickups.filter((pickup) => pickup.method === appState.verificationMethod);
  }

  return pickups.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function renderVerificationStats(session) {
  const pickups = getVerificationBasePickups(session);
  const month = getLocalDateString().slice(0, 7);
  const approvedThisMonth = pickups.filter((pickup) => pickup.status === "Disetujui Bendahara" && pickup.date.startsWith(month));
  const rejectedThisMonth = pickups.filter((pickup) => pickup.status === "Ditolak" && pickup.date.startsWith(month));
  const verifiedTotal = approvedThisMonth.reduce((sum, pickup) => sum + pickup.amount, 0);

  return `
    <section class="verification-stats">
      <article><span>Menunggu verifikasi</span><strong>${pickups.filter((pickup) => pickup.status === "Menunggu Verifikasi").length}</strong></article>
      <article><span>Disetujui bulan ini</span><strong>${approvedThisMonth.length}</strong></article>
      <article><span>Ditolak bulan ini</span><strong>${rejectedThisMonth.length}</strong></article>
      <article><span>Nominal terverifikasi</span><strong>${formatRupiah(verifiedTotal)}</strong></article>
    </section>
  `;
}

function renderVerificationTabs(session) {
  const pickups = getVerificationBasePickups(session);
  const tabs = [
    { label: "Menunggu", value: "Menunggu Verifikasi" },
    { label: "Disetujui", value: "Disetujui Bendahara" },
    { label: "Ditolak", value: "Ditolak" },
    { label: "Revisi", value: "Perlu Revisi" }
  ];

  return `
    <div class="verification-tabs" role="tablist" aria-label="Status verifikasi">
      ${tabs.map((tab) => `
        <button class="${appState.verificationTab === tab.value ? "active" : ""}" data-verification-tab="${tab.value}" type="button">
          <span>${tab.label}</span>
          <strong>${pickups.filter((pickup) => pickup.status === tab.value).length}</strong>
        </button>
      `).join("")}
    </div>
  `;
}

function renderVerificationActions(pickup, session) {
  if (!canVerifyTransactions(session) || pickup.status !== "Menunggu Verifikasi") {
    return `<button class="icon-button soft" data-verification-action="detail" data-id="${pickup.id}" type="button">Detail</button>`;
  }

  return `
    <div class="row-actions">
      <button class="icon-button soft" data-verification-action="detail" data-id="${pickup.id}" type="button">Detail</button>
      <button class="icon-button approve" data-verification-action="approve" data-id="${pickup.id}" type="button">Setujui</button>
      <button class="icon-button warning" data-verification-action="revise" data-id="${pickup.id}" type="button">Revisi</button>
      <button class="icon-button danger" data-verification-action="reject" data-id="${pickup.id}" type="button">Tolak</button>
    </div>
  `;
}

function renderVerificationList(pickups, session) {
  if (!pickups.length) {
    return `<div class="empty-state">Tidak ada transaksi pada tab dan filter ini.</div>`;
  }

  const rows = pickups.map((pickup) => {
    const donor = getPickupDonor(pickup);
    return `
      <tr class="clickable-row" data-verification-action="detail" data-id="${pickup.id}">
        <td>
          <strong>${escapeHtml(pickup.transactionNo)}</strong>
          <span>${formatDateId(pickup.date)}</span>
        </td>
        <td>
          <strong>${escapeHtml(pickup.donorName)}</strong>
          <span>RT ${escapeHtml(donor.rt || "-")} / RW ${escapeHtml(donor.rw || "-")}</span>
        </td>
        <td>${escapeHtml(pickup.officer)}</td>
        <td>${formatRupiah(pickup.amount)}</td>
        <td><span class="status-pill active">${escapeHtml(pickup.method)}</span></td>
        <td><span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span></td>
        <td onclick="event.stopPropagation()">${renderVerificationActions(pickup, session)}</td>
      </tr>
    `;
  }).join("");

  const cards = pickups.map((pickup) => {
    const donor = getPickupDonor(pickup);
    return `
      <article class="verification-card" data-verification-action="detail" data-id="${pickup.id}">
        <div>
          <strong>${escapeHtml(pickup.donorName)}</strong>
          <span>${escapeHtml(pickup.transactionNo)} - ${formatDateId(pickup.date)}</span>
        </div>
        <div class="pickup-card-meta">
          <span>${formatRupiah(pickup.amount)}</span>
          <span>${escapeHtml(pickup.method)}</span>
          <span>RT ${escapeHtml(donor.rt || "-")}/RW ${escapeHtml(donor.rw || "-")}</span>
          <span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span>
        </div>
        <p>${escapeHtml(pickup.officer)} - ${pickup.note ? escapeHtml(pickup.note) : "Tidak ada catatan."}</p>
        <div onclick="event.stopPropagation()">${renderVerificationActions(pickup, session)}</div>
      </article>
    `;
  }).join("");

  return `
    <div class="table-wrap verification-table">
      <table>
        <thead>
          <tr>
            <th>No. Transaksi</th>
            <th>Donatur</th>
            <th>Petugas</th>
            <th>Nominal</th>
            <th>Metode</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="verification-card-list">${cards}</div>
  `;
}

function renderVerificationDetailModal(session) {
  const pickup = appState.pickups.find((item) => item.id === appState.selectedVerificationId);
  if (!pickup) {
    return "";
  }

  const donor = getPickupDonor(pickup);
  const auditItems = pickup.verificationAudit?.length ? pickup.verificationAudit : [];
  const actionForm = appState.verificationAction && appState.verificationAction !== "detail";
  const actionTitle = appState.verificationAction === "approve" ? "Setujui transaksi" : appState.verificationAction === "reject" ? "Tolak transaksi" : "Kembalikan untuk revisi";

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="verificationModalTitle">
      <section class="verification-modal">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">Detail Transaksi</p>
            <h2 id="verificationModalTitle">${escapeHtml(pickup.transactionNo)}</h2>
          </div>
          <button class="close-button" data-close-verification-modal type="button" aria-label="Tutup">x</button>
        </div>

        <div class="detail-grid">
          <div><span>Tanggal</span><strong>${formatDateId(pickup.date)}</strong></div>
          <div><span>Nama donatur</span><strong>${escapeHtml(pickup.donorName)}</strong></div>
          <div class="full"><span>Alamat</span><strong>${escapeHtml(pickup.donorAddress || donor.address || "-")}</strong></div>
          <div><span>RT/RW</span><strong>RT ${escapeHtml(donor.rt || "-")} / RW ${escapeHtml(donor.rw || "-")}</strong></div>
          <div><span>Petugas</span><strong>${escapeHtml(pickup.officer)}</strong></div>
          <div><span>Nominal</span><strong>${formatRupiah(pickup.amount)}</strong></div>
          <div><span>Metode</span><strong>${escapeHtml(pickup.method)}</strong></div>
          <div class="full"><span>Catatan petugas</span><strong>${pickup.note ? escapeHtml(pickup.note) : "-"}</strong></div>
          <div class="full"><span>Status transaksi</span><strong><span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span></strong></div>
        </div>
        <section class="evidence-panel">
          <h3>Bukti Pengambilan Koin</h3>
          ${renderPhotoPreview(pickup.proofPhotoUrl, pickup.proofPhotoName || "Bukti pengambilan koin")}
        </section>

        ${renderPickupNotificationHistory(pickup)}
        <section class="audit-panel">
          <h3>Catatan Audit</h3>
          ${auditItems.length ? auditItems.map((audit) => `
            <article>
              <strong>${escapeHtml(audit.status)}</strong>
              <span>${escapeHtml(audit.treasurer)} - ${formatDateId(audit.verifiedAt)}</span>
              <p>${escapeHtml(audit.note)}</p>
              ${audit.depositPhotoUrl ? renderPhotoPreview(audit.depositPhotoUrl, audit.depositPhotoName || "Bukti setoran bendahara") : ""}
            </article>
          `).join("") : `<p>Belum ada catatan verifikasi.</p>`}
        </section>

        ${actionForm ? `
          <form class="verification-note-form" id="verificationNoteForm">
            <h3>${actionTitle}</h3>
            <label class="field">
              <span>Catatan bendahara${appState.verificationAction === "approve" ? "" : " wajib"}</span>
              <textarea name="treasurerNote" placeholder="Tulis catatan hasil verifikasi"></textarea>
            </label>
            <label class="field">
              <span>Bukti setoran bendahara</span>
              <input name="depositPhoto" id="verificationDepositPhoto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />
              <small>Opsional. Format JPG, PNG, atau WEBP. Maksimal 2 MB.</small>
            </label>
            <div id="verificationDepositPreview">${renderPhotoPreview("", "Bukti setoran bendahara")}</div>
            <p class="form-error" id="verificationFormError" role="alert"></p>
            <div class="modal-actions">
              <button class="ghost-button" data-cancel-verification-action type="button">Batal</button>
              <button class="primary-button compact" type="submit">Simpan Verifikasi</button>
            </div>
          </form>
        ` : `
          <div class="modal-actions">
            <button class="ghost-button" data-close-verification-modal type="button">Tutup</button>
            ${canVerifyTransactions(session) && pickup.status === "Menunggu Verifikasi" ? `
              <button class="icon-button approve" data-verification-action="approve" data-id="${pickup.id}" type="button">Setujui</button>
              <button class="icon-button warning" data-verification-action="revise" data-id="${pickup.id}" type="button">Kembalikan untuk Revisi</button>
              <button class="danger-button" data-verification-action="reject" data-id="${pickup.id}" type="button">Tolak</button>
            ` : ""}
          </div>
        `}
      </section>
    </div>
  `;
}

function renderVerification() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }

  const pickups = getVisibleVerifications(session);
  const basePickups = getVerificationBasePickups(session);
  const officers = [...new Set(basePickups.map((pickup) => pickup.officer))].sort();

  renderAppShell(session, "Verifikasi", `
    <section class="verification-hero">
      <div>
        <p class="eyebrow">Bendahara Ranting</p>
        <h2>Periksa transaksi pengambilan sebelum masuk laporan resmi.</h2>
        <p>${canVerifyTransactions(session) ? "Setujui, tolak, atau kembalikan transaksi kepada petugas dengan catatan audit yang rapi." : "Petugas dapat memantau status transaksi miliknya tanpa akses verifikasi."}</p>
      </div>
    </section>

    ${renderVerificationStats(session)}

    <section class="panel verification-panel">
      ${renderVerificationTabs(session)}
      <div class="verification-toolbar">
        <label class="search-field">
          <span>Cari nama donatur</span>
          <input id="verificationSearch" type="search" value="${escapeHtml(appState.verificationSearch)}" placeholder="Cari donatur" />
        </label>
        <label>
          <span>Tanggal</span>
          <input id="verificationDate" type="date" value="${escapeHtml(appState.verificationDate)}" />
        </label>
        <label>
          <span>Petugas</span>
          <select id="verificationOfficer">
            <option value="all">Semua petugas</option>
            ${officers.map((officer) => `<option value="${escapeHtml(officer)}" ${appState.verificationOfficer === officer ? "selected" : ""}>${escapeHtml(officer)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Metode</span>
          <select id="verificationMethod">
            <option value="all">Semua metode</option>
            ${["Tunai", "Transfer", "QRIS"].map((method) => `<option value="${method}" ${appState.verificationMethod === method ? "selected" : ""}>${method}</option>`).join("")}
          </select>
        </label>
      </div>
      ${renderVerificationList(pickups, session)}
    </section>
    ${renderVerificationDetailModal(session)}
  `);

  bindVerificationEvents(session);
}

function bindVerificationEvents(session) {
  document.querySelectorAll("[data-verification-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.verificationTab = button.dataset.verificationTab;
      renderVerification();
    });
  });

  document.querySelector("#verificationSearch")?.addEventListener("input", debounce((event) => {
    appState.verificationSearch = event.target.value;
    renderVerification();
  }, 250));

  document.querySelector("#verificationDate")?.addEventListener("change", (event) => {
    appState.verificationDate = event.target.value;
    renderVerification();
  });

  document.querySelector("#verificationOfficer")?.addEventListener("change", (event) => {
    appState.verificationOfficer = event.target.value;
    renderVerification();
  });

  document.querySelector("#verificationMethod")?.addEventListener("change", (event) => {
    appState.verificationMethod = event.target.value;
    renderVerification();
  });

  document.querySelectorAll("[data-verification-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const action = button.dataset.verificationAction;
      if (action !== "detail" && !canVerifyTransactions(session)) {
        return;
      }
      appState.selectedVerificationId = id;
      appState.verificationAction = action;
      renderVerification();
    });
  });

  document.querySelectorAll("[data-close-verification-modal]").forEach((button) => {
    button.addEventListener("click", closeVerificationModal);
  });

  document.querySelector("[data-cancel-verification-action]")?.addEventListener("click", () => {
    appState.verificationAction = "detail";
    renderVerification();
  });

  document.querySelector("#verificationNoteForm")?.addEventListener("submit", (event) => handleVerificationSubmit(event, session));
  bindImagePreview("#verificationDepositPhoto", "#verificationDepositPreview", "#verificationFormError");
}

function closeVerificationModal() {
  appState.selectedVerificationId = null;
  appState.verificationAction = null;
  renderVerification();
}

async function handleVerificationSubmit(event, session) {
  event.preventDefault();

  const form = event.currentTarget;
  const note = String(new FormData(form).get("treasurerNote") || "").trim();
  if ((appState.verificationAction === "reject" || appState.verificationAction === "revise") && !note) {
    document.querySelector("#verificationFormError").textContent = "Catatan bendahara wajib diisi.";
    return;
  }

  const statusMap = {
    approve: "Disetujui Bendahara",
    reject: "Ditolak",
    revise: "Perlu Revisi"
  };
  const nextStatus = statusMap[appState.verificationAction];
  const depositPhoto = form.elements.depositPhoto?.files?.[0];
  const photoError = validateImageFile(depositPhoto);
  if (photoError) {
    document.querySelector("#verificationFormError").textContent = photoError;
    return;
  }
  let uploadedPhoto = null;
  try {
    uploadedPhoto = depositPhoto ? await uploadDocumentationPhoto(depositPhoto, "setoran-bendahara") : null;
  } catch (error) {
    document.querySelector("#verificationFormError").textContent = error.message;
    return;
  }
  const audit = {
    treasurer: session.role === "admin" ? "Admin Demo" : "Bendahara Demo",
    verifiedAt: getLocalDateString(),
    status: nextStatus,
    note: note || "Disetujui setelah pengecekan bendahara.",
    depositPhotoPath: uploadedPhoto?.path || "",
    depositPhotoUrl: uploadedPhoto?.url || "",
    depositPhotoName: uploadedPhoto?.name || ""
  };

  appState.pickups = appState.pickups.map((pickup) => pickup.id === appState.selectedVerificationId ? {
    ...pickup,
    status: nextStatus,
    verificationAudit: [...(pickup.verificationAudit || []), audit]
  } : pickup);

  const updatedPickup = appState.pickups.find((p) => p.id === appState.selectedVerificationId);
  const ok = await wrapFormSubmit(event, async () => {
    let success = true;
    if (updatedPickup) {
      success = await syncRowToPostgres("pengambilan_koin", updatedPickup);
    }
    if (success) {
      success = await syncVerificationAuditToPostgres(appState.selectedVerificationId, audit, session);
    }
    return success;
  });

  if (ok) {
    appState.verificationTab = nextStatus;
    closeVerificationModal();
  }
}

function getReportBasePickups(session) {
  if (session.role === "petugas") {
    return appState.pickups.filter((pickup) => pickup.officerEmail === session.email || pickup.officerEmail === "petugas@rantingnu.id");
  }

  return [...appState.pickups];
}

function enrichReportPickup(pickup) {
  const donor = getPickupDonor(pickup);
  return {
    ...pickup,
    rt: donor.rt || "-",
    rw: donor.rw || "-",
    donorAddress: pickup.donorAddress || donor.address || "-"
  };
}

function getVisibleReportPickups(session) {
  return getReportBasePickups(session)
    .map(enrichReportPickup)
    .filter((pickup) => {
      const [year, month] = pickup.date.split("-");
      return appState.reportMonth === month &&
        appState.reportYear === year &&
        (appState.reportRt === "all" || pickup.rt === appState.reportRt) &&
        (appState.reportRw === "all" || pickup.rw === appState.reportRw) &&
        (appState.reportOfficer === "all" || pickup.officer === appState.reportOfficer) &&
        (appState.reportStatus === "all" || pickup.status === appState.reportStatus) &&
        (appState.reportMethod === "all" || pickup.method === appState.reportMethod);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function groupReportBy(items, getKey) {
  const groups = new Map();
  items.forEach((item) => {
    const key = getKey(item);
    const current = groups.get(key) || { key, count: 0, amount: 0 };
    current.count += 1;
    current.amount += item.amount;
    groups.set(key, current);
  });
  return [...groups.values()].sort((a, b) => b.amount - a.amount || a.key.localeCompare(b.key));
}

function getReportPeriodLabel() {
  const date = new Date(`${appState.reportYear}-${appState.reportMonth}-01T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date);
}

function renderReportSummary(pickups, session) {
  const activeDonorIds = new Set(appState.donors.filter((donor) => {
    if (!donor.active) {
      return false;
    }
    if (session.role !== "petugas") {
      return true;
    }
    return donor.officerEmail === session.email || donor.officerEmail === "petugas@rantingnu.id";
  }).map((donor) => donor.id));
  const totalIncome = pickups
    .filter((pickup) => pickup.status === "Disetujui Bendahara")
    .reduce((sum, pickup) => sum + pickup.amount, 0);
  const waiting = pickups.filter((pickup) => pickup.status === "Menunggu Verifikasi").length;
  const approved = pickups.filter((pickup) => pickup.status === "Disetujui Bendahara").length;
  const rejected = pickups.filter((pickup) => pickup.status === "Ditolak").length;
  const totalDistribution = appState.distributions
    .filter((item) => item.status === "Disalurkan" && item.date.startsWith(`${appState.reportYear}-${appState.reportMonth}`))
    .reduce((sum, item) => sum + item.amount, 0);
  const officerDepositTotal = appState.officerDeposits
    .filter((item) => item.status === "Diterima Bendahara" && item.date.startsWith(`${appState.reportYear}-${appState.reportMonth}`))
    .reduce((sum, item) => sum + item.amount, 0);
  const lazisnuDepositTotal = appState.lazisnuDeposits
    .filter((item) => item.status === "Sudah Disetor" && item.date.startsWith(`${appState.reportYear}-${appState.reportMonth}`))
    .reduce((sum, item) => sum + item.amount, 0);

  return `
    <section class="report-summary">
      <article><span>Pemasukan pengambilan koin</span><strong>${formatRupiah(totalIncome)}</strong></article>
      <article><span>Setoran petugas ke bendahara</span><strong>${formatRupiah(officerDepositTotal)}</strong></article>
      <article><span>Setoran ke LAZISNU</span><strong>${formatRupiah(lazisnuDepositTotal)}</strong></article>
      <article><span>Penyaluran dana</span><strong>${formatRupiah(totalDistribution)}</strong></article>
      <article><span>Saldo akhir kas ranting</span><strong>${formatRupiah(officerDepositTotal - lazisnuDepositTotal - totalDistribution)}</strong></article>
      <article><span>Total transaksi</span><strong>${pickups.length}</strong></article>
      <article><span>Donatur aktif</span><strong>${activeDonorIds.size}</strong></article>
      <article><span>Menunggu verifikasi</span><strong>${waiting}</strong></article>
      <article><span>Total disetujui</span><strong>${approved}</strong></article>
      <article><span>Total ditolak</span><strong>${rejected}</strong></article>
    </section>
  `;
}

function renderReportRecap(title, groups) {
  return `
    <article class="recap-panel">
      <h3>${title}</h3>
      ${groups.length ? groups.map((group) => `
        <div>
          <span>${escapeHtml(group.key)}</span>
          <strong>${formatRupiah(group.amount)}</strong>
          <small>${group.count} transaksi</small>
        </div>
      `).join("") : `<p>Belum ada data.</p>`}
    </article>
  `;
}

function renderReportTable(pickups) {
  if (!pickups.length) {
    return `<div class="empty-state">Data laporan tidak ditemukan untuk filter ini.</div>`;
  }

  const rows = pickups.map((pickup) => `
    <tr>
      <td>${formatDateId(pickup.date)}</td>
      <td>${escapeHtml(pickup.transactionNo)}</td>
      <td>${escapeHtml(pickup.donorName)}</td>
      <td>RT ${escapeHtml(pickup.rt)} / RW ${escapeHtml(pickup.rw)}</td>
      <td>${escapeHtml(pickup.officer)}</td>
      <td>${formatRupiah(pickup.amount)}</td>
      <td>${escapeHtml(pickup.method)}</td>
      <td><span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span></td>
    </tr>
  `).join("");

  const cards = pickups.map((pickup) => `
    <article class="report-card">
      <div>
        <strong>${escapeHtml(pickup.donorName)}</strong>
        <span>${escapeHtml(pickup.transactionNo)} - ${formatDateId(pickup.date)}</span>
      </div>
      <div class="pickup-card-meta">
        <span>${formatRupiah(pickup.amount)}</span>
        <span>RT ${escapeHtml(pickup.rt)}/RW ${escapeHtml(pickup.rw)}</span>
        <span>${escapeHtml(pickup.officer)}</span>
        <span>${escapeHtml(pickup.method)}</span>
        <span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span>
      </div>
    </article>
  `).join("");

  return `
    <div class="table-wrap report-table">
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>No. Transaksi</th>
            <th>Nama Donatur</th>
            <th>RT/RW</th>
            <th>Petugas</th>
            <th>Nominal</th>
            <th>Metode</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="report-card-list">${cards}</div>
  `;
}

function renderPrintReport(pickups) {
  const printDate = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());
  const totalApproved = pickups
    .filter((pickup) => pickup.status === "Disetujui Bendahara")
    .reduce((sum, pickup) => sum + pickup.amount, 0);
  const cash = getCashSummary();

  return `
    <section class="print-report" aria-label="Format cetak laporan">
      <header>
        ${renderLazisnuLogo("print-logo")}
        <h1>Laporan ${brand.name}</h1>
        <p>${brand.subtitle}</p>
        <strong>${brand.tagline}</strong>
        <p>Periode laporan: ${getReportPeriodLabel()}</p>
        <p>Tanggal cetak: ${printDate}</p>
      </header>
      <div class="print-summary">
        <span>Pemasukan pengambilan koin: ${formatRupiah(totalApproved)}</span>
        <span>Setoran petugas ke bendahara: ${formatRupiah(cash.collected)}</span>
        <span>Setoran ke LAZISNU: ${formatRupiah(cash.sentToLazisnu)}</span>
        <span>Penyaluran dana: ${formatRupiah(appState.distributions.filter((item) => item.status === "Disalurkan").reduce((sum, item) => sum + item.amount, 0))}</span>
        <span>Saldo akhir kas ranting: ${formatRupiah(cash.cashBalance)}</span>
      </div>
      ${renderReportTable(pickups)}
      <footer class="signature-grid">
        <div>
          <span>Ketua Ranting</span>
          <strong>( ................................ )</strong>
        </div>
        <div>
          <span>Bendahara</span>
          <strong>( ................................ )</strong>
        </div>
      </footer>
      ${renderBrandFooter("print-footer")}
    </section>
  `;
}

function renderReports() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }

  const pickups = getVisibleReportPickups(session);
  const base = getReportBasePickups(session).map(enrichReportPickup);
  const rtOptions = [...new Set(base.map((pickup) => pickup.rt))].sort();
  const rwOptions = [...new Set(base.map((pickup) => pickup.rw))].sort();
  const officerOptions = [...new Set(base.map((pickup) => pickup.officer))].sort();
  const years = [...new Set(base.map((pickup) => pickup.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  const rtGroups = groupReportBy(pickups, (pickup) => `RT ${pickup.rt} / RW ${pickup.rw}`);
  const officerGroups = groupReportBy(pickups, (pickup) => pickup.officer);
  const methodGroups = groupReportBy(pickups, (pickup) => pickup.method);

  renderAppShell(session, "Laporan", `
    <section class="report-hero">
      <div>
        <p class="eyebrow">Rekap Ranting</p>
        <h2>Laporan pemasukan dan status transaksi ${brand.name}.</h2>
        <p>${session.role === "petugas" ? "Petugas hanya melihat laporan transaksi miliknya." : "Admin dan bendahara dapat melihat seluruh laporan transaksi ranting."}</p>
      </div>
      <div class="report-actions">
        <button class="ghost-button" id="exportExcelButton" type="button">Export Excel</button>
        <button class="primary-button compact" id="printReportButton" type="button">Print laporan</button>
      </div>
    </section>

    <section class="panel report-filter-panel">
      <div class="report-toolbar">
        <label>
          <span>Bulan</span>
          <select id="reportMonth">
            ${Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((month) => `<option value="${month}" ${appState.reportMonth === month ? "selected" : ""}>${new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(`2026-${month}-01T00:00:00`))}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Tahun</span>
          <select id="reportYear">
            ${years.map((year) => `<option value="${year}" ${appState.reportYear === year ? "selected" : ""}>${year}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>RT</span>
          <select id="reportRt">
            <option value="all">Semua RT</option>
            ${rtOptions.map((rt) => `<option value="${escapeHtml(rt)}" ${appState.reportRt === rt ? "selected" : ""}>RT ${escapeHtml(rt)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>RW</span>
          <select id="reportRw">
            <option value="all">Semua RW</option>
            ${rwOptions.map((rw) => `<option value="${escapeHtml(rw)}" ${appState.reportRw === rw ? "selected" : ""}>RW ${escapeHtml(rw)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Petugas</span>
          <select id="reportOfficer">
            <option value="all">Semua petugas</option>
            ${officerOptions.map((officer) => `<option value="${escapeHtml(officer)}" ${appState.reportOfficer === officer ? "selected" : ""}>${escapeHtml(officer)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select id="reportStatus">
            <option value="all">Semua status</option>
            ${["Menunggu Verifikasi", "Disetujui Bendahara", "Ditolak", "Perlu Revisi"].map((status) => `<option value="${status}" ${appState.reportStatus === status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Metode</span>
          <select id="reportMethod">
            <option value="all">Semua metode</option>
            ${["Tunai", "Transfer", "QRIS"].map((method) => `<option value="${method}" ${appState.reportMethod === method ? "selected" : ""}>${method}</option>`).join("")}
          </select>
        </label>
      </div>
    </section>

    ${renderReportSummary(pickups, session)}

    <section class="report-grid">
      ${renderReportRecap("Rekap per RT/RW", rtGroups)}
      ${renderReportRecap("Rekap per Petugas", officerGroups)}
      ${renderReportRecap("Rekap per Metode", methodGroups)}
    </section>

    <section class="panel report-detail-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Detail Laporan</p>
          <h2>${getReportPeriodLabel()}</h2>
        </div>
        <span>${pickups.length} transaksi</span>
      </div>
      ${renderReportTable(pickups)}
    </section>

    ${renderPrintReport(pickups)}
  `);

  bindReportEvents(session);
}

function bindReportEvents(session) {
  [
    ["#reportMonth", "reportMonth"],
    ["#reportYear", "reportYear"],
    ["#reportRt", "reportRt"],
    ["#reportRw", "reportRw"],
    ["#reportOfficer", "reportOfficer"],
    ["#reportStatus", "reportStatus"],
    ["#reportMethod", "reportMethod"]
  ].forEach(([selector, key]) => {
    document.querySelector(selector)?.addEventListener("change", (event) => {
      appState[key] = event.target.value;
      renderReports();
    });
  });

  document.querySelector("#exportExcelButton")?.addEventListener("click", () => exportReportExcel(session));
  document.querySelector("#printReportButton")?.addEventListener("click", () => window.print());
}

function exportReportExcel(session) {
  const pickups = getVisibleReportPickups(session);
  const header = ["Tanggal", "Nomor Transaksi", "Nama Donatur", "RT/RW", "Petugas", "Nominal", "Metode Pembayaran", "Status"];
  const approvedTotal = pickups
    .filter((pickup) => pickup.status === "Disetujui Bendahara")
    .reduce((sum, pickup) => sum + pickup.amount, 0);
  const distributionTotal = appState.distributions
    .filter((item) => item.status === "Disalurkan" && item.date.startsWith(`${appState.reportYear}-${appState.reportMonth}`))
    .reduce((sum, item) => sum + item.amount, 0);
  const officerDepositTotal = appState.officerDeposits
    .filter((item) => item.status === "Diterima Bendahara" && item.date.startsWith(`${appState.reportYear}-${appState.reportMonth}`))
    .reduce((sum, item) => sum + item.amount, 0);
  const lazisnuDepositTotal = appState.lazisnuDeposits
    .filter((item) => item.status === "Sudah Disetor" && item.date.startsWith(`${appState.reportYear}-${appState.reportMonth}`))
    .reduce((sum, item) => sum + item.amount, 0);
  const printDate = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());
  const tableRows = pickups.map((pickup, index) => `
    <tr class="${index % 2 === 0 ? "even" : "odd"}">
      <td class="date">${formatDateId(pickup.date)}</td>
      <td class="trx">${escapeHtml(pickup.transactionNo)}</td>
      <td class="donor">${escapeHtml(pickup.donorName)}</td>
      <td class="area">RT ${escapeHtml(pickup.rt)} / RW ${escapeHtml(pickup.rw)}</td>
      <td class="officer">${escapeHtml(pickup.officer)}</td>
      <td class="money">${pickup.amount}</td>
      <td class="method">${escapeHtml(pickup.method)}</td>
      <td class="status ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</td>
    </tr>
  `).join("");
  const excelHtml = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #10251b; }
          table { border-collapse: collapse; width: 100%; }
          .brand { font-size: 13px; color: #0b6b3a; font-weight: 700; text-align: center; }
          .title { font-size: 22px; font-weight: 700; color: #0b6b3a; text-align: center; }
          .subtitle { font-size: 12px; color: #466354; text-align: center; }
          .summary-label { background: #e8f7ed; color: #0b5f37; font-weight: 700; border: 1px solid #9fb7a8; }
          .summary-value { font-weight: 700; border: 1px solid #9fb7a8; }
          th { background: #0b6b3a; color: #ffffff; font-weight: 700; border: 1px solid #7da98e; padding: 10px; text-align: center; }
          td { border: 1px solid #b8c9bf; padding: 8px; vertical-align: top; }
          .even td { background: #f7fcf8; }
          .odd td { background: #ffffff; }
          .date { width: 110px; text-align: center; }
          .trx { width: 150px; }
          .donor { width: 190px; font-weight: 700; }
          .area { width: 95px; text-align: center; }
          .officer { width: 135px; }
          .money { width: 130px; text-align: right; mso-number-format:"Rp #,##0"; }
          .method { width: 110px; text-align: center; }
          .status { width: 150px; text-align: center; font-weight: 700; }
          .approved { color: #0f6d3e; background: #e8f7ed; }
          .waiting { color: #8a3d08; background: #fff3d6; }
          .rejected { color: #9f1d1d; background: #ffe5e5; }
          .revision { color: #17406d; background: #eaf3ff; }
          .signature td { border: 0; height: 90px; text-align: center; vertical-align: bottom; }
        </style>
      </head>
      <body>
        <table>
          <tr><td class="brand" colspan="8">NU CARE-LAZISNU</td></tr>
          <tr><td class="title" colspan="8">Laporan ${brand.name}</td></tr>
          <tr><td class="subtitle" colspan="8">${brand.subtitle} | ${brand.tagline}</td></tr>
          <tr><td class="subtitle" colspan="8">Periode: ${getReportPeriodLabel()} | Tanggal cetak: ${printDate}</td></tr>
          <tr><td colspan="8"></td></tr>
          <tr>
            <td class="summary-label" colspan="2">Total transaksi</td>
            <td class="summary-value" colspan="2">${pickups.length}</td>
            <td class="summary-label" colspan="2">Total terverifikasi</td>
            <td class="summary-value money" colspan="2">${approvedTotal}</td>
          </tr>
          <tr>
            <td class="summary-label" colspan="2">Menunggu verifikasi</td>
            <td class="summary-value" colspan="2">${pickups.filter((pickup) => pickup.status === "Menunggu Verifikasi").length}</td>
            <td class="summary-label" colspan="2">Total penyaluran</td>
            <td class="summary-value money" colspan="2">${distributionTotal}</td>
          </tr>
          <tr>
            <td class="summary-label" colspan="2">Saldo akhir</td>
            <td class="summary-value money" colspan="6">${officerDepositTotal - lazisnuDepositTotal - distributionTotal}</td>
          </tr>
          <tr>
            <td class="summary-label" colspan="2">Setoran petugas ke bendahara</td>
            <td class="summary-value money" colspan="2">${officerDepositTotal}</td>
            <td class="summary-label" colspan="2">Setoran ke LAZISNU</td>
            <td class="summary-value money" colspan="2">${lazisnuDepositTotal}</td>
          </tr>
          <tr><td colspan="8"></td></tr>
          <tr>${header.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
          ${tableRows || `<tr><td colspan="8" style="text-align:center;">Tidak ada data laporan.</td></tr>`}
          <tr><td colspan="8"></td></tr>
          <tr class="signature">
            <td colspan="4">Ketua Ranting<br /><br /><br />( ................................ )</td>
            <td colspan="4">Bendahara<br /><br /><br />( ................................ )</td>
          </tr>
          <tr><td class="subtitle" colspan="8">${brand.footer}</td></tr>
        </table>
      </body>
    </html>
  `;
  const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `laporan-sikoinnu-${appState.reportYear}-${appState.reportMonth}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getCashSummary() {
  const collected = appState.officerDeposits
    .filter((item) => item.status === "Diterima Bendahara")
    .reduce((sum, item) => sum + item.amount, 0);
  const sentToLazisnu = appState.lazisnuDeposits
    .filter((item) => item.status === "Sudah Disetor")
    .reduce((sum, item) => sum + item.amount, 0);
  const distributed = appState.distributions
    .filter((item) => item.status === "Disalurkan")
    .reduce((sum, item) => sum + item.amount, 0);
  return { collected, sentToLazisnu, notSent: collected - sentToLazisnu, cashBalance: collected - sentToLazisnu - distributed };
}

function renderCashSummary() {
  const summary = getCashSummary();
  return `
    <section class="cash-summary">
      <article><span>Total terkumpul dari petugas</span><strong>${formatRupiah(summary.collected)}</strong></article>
      <article><span>Total sudah disetor ke LAZISNU</span><strong>${formatRupiah(summary.sentToLazisnu)}</strong></article>
      <article><span>Total belum disetor</span><strong>${formatRupiah(summary.notSent)}</strong></article>
      <article><span>Saldo kas ranting</span><strong>${formatRupiah(summary.cashBalance)}</strong></article>
    </section>
  `;
}

function getDepositStatusClass(status) {
  if (status === "Diterima Bendahara" || status === "Sudah Disetor") return "approved";
  if (status === "Ditolak" || status === "Batal") return "rejected";
  if (status === "Dikembalikan Revisi") return "revision";
  return "waiting";
}

function canCreateOfficerDeposit(session) {
  return session.role === "admin" || session.role === "petugas";
}

function canEditOfficerDeposit(session, item) {
  return session.role === "admin" || session.role === "bendahara" || (session.role === "petugas" && item?.officerEmail === session.email && item?.status !== "Diterima Bendahara");
}

function getVisibleOfficerDeposits(session) {
  let items = session.role === "petugas"
    ? appState.officerDeposits.filter((item) => item.officerEmail === session.email || item.officerEmail === "petugas@rantingnu.id")
    : [...appState.officerDeposits];
  const search = appState.officerDepositSearch.trim().toLowerCase();
  if (search) items = items.filter((item) => item.depositNo.toLowerCase().includes(search) || item.officer.toLowerCase().includes(search));
  if (appState.officerDepositOfficer !== "all") items = items.filter((item) => item.officer === appState.officerDepositOfficer);
  if (appState.officerDepositDate) items = items.filter((item) => item.date === appState.officerDepositDate);
  if (appState.officerDepositStatus !== "all") items = items.filter((item) => item.status === appState.officerDepositStatus);
  return items.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function renderOfficerDepositActions(item, session) {
  return `<div class="row-actions">
    <button class="icon-button soft" data-officer-deposit-action="detail" data-id="${item.id}" type="button">Detail</button>
    ${canEditOfficerDeposit(session, item) ? `<button class="icon-button" data-officer-deposit-action="edit" data-id="${item.id}" type="button">${session.role === "bendahara" ? "Verifikasi" : "Edit"}</button>` : ""}
    ${session.role === "admin" ? `<button class="icon-button danger" data-officer-deposit-action="delete" data-id="${item.id}" type="button">Hapus</button>` : ""}
  </div>`;
}

function renderOfficerDepositList(items, session) {
  if (!items.length) return `<div class="empty-state">Data setoran petugas tidak ditemukan.</div>`;
  const rows = items.map((item) => `<tr>
    <td><strong>${escapeHtml(item.depositNo)}</strong><span>${formatDateId(item.date)}</span></td>
    <td>${escapeHtml(item.officer)}</td>
    <td>${formatDateId(item.periodStart)} - ${formatDateId(item.periodEnd)}</td>
    <td>${item.transactionCount} transaksi</td>
    <td>${formatRupiah(item.amount)}</td>
    <td>${escapeHtml(item.method)}</td>
    <td><span class="status-pill ${getDepositStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
    <td>${renderOfficerDepositActions(item, session)}</td>
  </tr>`).join("");
  const cards = items.map((item) => `<article class="officer-deposit-card">
    <div><strong>${escapeHtml(item.officer)}</strong><span>${escapeHtml(item.depositNo)} - ${formatDateId(item.date)}</span></div>
    <div class="pickup-card-meta"><span>${formatRupiah(item.amount)}</span><span>${item.transactionCount} transaksi</span><span>${escapeHtml(item.method)}</span><span class="status-pill ${getDepositStatusClass(item.status)}">${escapeHtml(item.status)}</span></div>
    <p>${formatDateId(item.periodStart)} - ${formatDateId(item.periodEnd)}</p>${renderOfficerDepositActions(item, session)}
  </article>`).join("");
  return `<div class="table-wrap officer-deposit-table"><table><thead><tr><th>No. Setoran</th><th>Petugas</th><th>Periode</th><th>Transaksi</th><th>Nominal</th><th>Metode</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div><div class="officer-deposit-card-list">${cards}</div>`;
}

function renderOfficerDepositModal(session) {
  const mode = appState.officerDepositModalMode;
  if (!mode) return "";
  const item = appState.officerDeposits.find((entry) => entry.id === appState.selectedOfficerDepositId);
  const isReadonly = mode === "detail";
  if (mode === "delete") return `<div class="modal-backdrop"><section class="confirm-modal"><h2>Hapus Setoran Petugas</h2><p>Yakin ingin menghapus <strong>${escapeHtml(item?.depositNo || "setoran ini")}</strong>?</p><div class="modal-actions"><button class="ghost-button" data-close-officer-deposit-modal type="button">Batal</button><button class="danger-button" id="confirmOfficerDepositDeleteButton" type="button">Hapus</button></div></section></div>`;
  const officer = getDefaultOfficer(session);
  const values = item || { depositNo: generateOfficerDepositNo(getLocalDateString()), officer: officer?.name || "", date: getLocalDateString(), periodStart: getLocalDateString(), periodEnd: getLocalDateString(), amount: "", transactionCount: "", method: "Tunai", status: "Menunggu Verifikasi", note: "", proofPhotoUrl: "", proofPhotoName: "" };
  const officerLocked = session.role === "petugas" || isReadonly;
  return `<div class="modal-backdrop" role="dialog" aria-modal="true"><form class="donor-form-modal" id="officerDepositForm" novalidate>
    <div class="modal-heading"><div><p class="eyebrow">Setoran Petugas</p><h2>${mode === "add" ? "Tambah Setoran" : isReadonly ? "Detail Setoran" : session.role === "bendahara" ? "Verifikasi Setoran" : "Edit Setoran"}</h2></div><button class="close-button" data-close-officer-deposit-modal type="button">x</button></div>
    <div class="form-grid">
      <label class="field"><span>Nomor setoran</span><input name="depositNo" value="${escapeHtml(values.depositNo)}" readonly /></label>
      <label class="field"><span>Petugas</span><select name="officer" ${officerLocked ? "disabled" : ""}>${renderOfficerOptions(values.officer)}</select>${officerLocked ? `<input type="hidden" name="officer" value="${escapeHtml(values.officer)}" />` : ""}</label>
      <label class="field"><span>Tanggal setor</span><input name="date" type="date" value="${escapeHtml(values.date)}" ${isReadonly ? "readonly" : ""} required /></label>
      <label class="field"><span>Periode mulai</span><input name="periodStart" type="date" value="${escapeHtml(values.periodStart)}" ${isReadonly ? "readonly" : ""} required /></label>
      <label class="field"><span>Periode selesai</span><input name="periodEnd" type="date" value="${escapeHtml(values.periodEnd)}" ${isReadonly ? "readonly" : ""} required /></label>
      <label class="field"><span>Jumlah transaksi terkait</span><input name="transactionCount" type="number" min="1" value="${escapeHtml(values.transactionCount)}" ${isReadonly ? "readonly" : ""} required /></label>
      <label class="field"><span>Total nominal disetor</span><input name="amount" type="number" min="1" step="1000" value="${escapeHtml(values.amount)}" ${isReadonly ? "readonly" : ""} required /></label>
      <label class="field"><span>Metode setor</span><select name="method" ${isReadonly ? "disabled" : ""}>${["Tunai", "Transfer", "QRIS"].map((value) => `<option ${values.method === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      <label class="field"><span>Status</span><select name="status" ${session.role === "petugas" || isReadonly ? "disabled" : ""}>${["Menunggu Verifikasi", "Diterima Bendahara", "Dikembalikan Revisi", "Ditolak"].map((value) => `<option ${values.status === value ? "selected" : ""}>${value}</option>`).join("")}</select>${session.role === "petugas" || isReadonly ? `<input type="hidden" name="status" value="${escapeHtml(values.status)}" />` : ""}</label>
      <label class="field full"><span>Catatan petugas</span><textarea name="note" ${isReadonly ? "readonly" : ""}>${escapeHtml(values.note)}</textarea></label>
      <label class="field full"><span>Foto bukti setor</span>${isReadonly ? "" : `<input name="proofPhoto" id="officerDepositProof" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />`}<small>Opsional. Maksimal 2 MB.</small></label>
      <div class="full" id="officerDepositPreview">${renderPhotoPreview(values.proofPhotoUrl, values.proofPhotoName || "Bukti setoran petugas")}</div>
    </div><p class="form-error" id="officerDepositFormError"></p><div class="modal-actions"><button class="ghost-button" data-close-officer-deposit-modal type="button">${isReadonly ? "Tutup" : "Batal"}</button>${isReadonly ? "" : `<button class="primary-button compact" type="submit">Simpan Setoran</button>`}</div>
  </form></div>`;
}

function renderOfficerDeposits() {
  const session = getSession(); if (!session?.role) return navigate("/login");
  const items = getVisibleOfficerDeposits(session);
  const officers = [...new Set(appState.officerDeposits.map((item) => item.officer))].sort();
  renderAppShell(session, "Setoran Petugas", `<section class="officer-deposit-hero"><div><p class="eyebrow">Kas Ranting</p><h2>Catat penyerahan hasil pengambilan petugas ke bendahara.</h2><p>Petugas membuat setoran miliknya. Bendahara memverifikasi penerimaan. Admin dapat mengelola seluruh data.</p></div>${canCreateOfficerDeposit(session) ? `<button class="primary-button compact" id="addOfficerDepositButton" type="button">Tambah Setoran</button>` : ""}</section>${renderCashSummary()}<section class="panel officer-deposit-panel"><div class="officer-deposit-toolbar"><label class="search-field"><span>Cari setoran</span><input id="officerDepositSearch" value="${escapeHtml(appState.officerDepositSearch)}" placeholder="Nomor setoran atau petugas" /></label><label><span>Petugas</span><select id="officerDepositOfficer"><option value="all">Semua petugas</option>${officers.map((value) => `<option ${appState.officerDepositOfficer === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label><label><span>Tanggal</span><input id="officerDepositDate" type="date" value="${escapeHtml(appState.officerDepositDate)}" /></label><label><span>Status</span><select id="officerDepositStatus"><option value="all">Semua status</option>${["Menunggu Verifikasi", "Diterima Bendahara", "Dikembalikan Revisi", "Ditolak"].map((value) => `<option ${appState.officerDepositStatus === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></div>${renderOfficerDepositList(items, session)}</section>${renderOfficerDepositModal(session)}`);
  bindOfficerDepositEvents(session);
}

function bindOfficerDepositEvents(session) {
  document.querySelector("#addOfficerDepositButton")?.addEventListener("click", () => { appState.officerDepositModalMode = "add"; renderOfficerDeposits(); });
  [["#officerDepositSearch","officerDepositSearch","input"],["#officerDepositOfficer","officerDepositOfficer","change"],["#officerDepositDate","officerDepositDate","change"],["#officerDepositStatus","officerDepositStatus","change"]].forEach(([selector,key,event]) => document.querySelector(selector)?.addEventListener(event, event === "input" ? debounce((e) => { appState[key] = e.target.value; renderOfficerDeposits(); }, 250) : (e) => { appState[key] = e.target.value; renderOfficerDeposits(); }));
  document.querySelectorAll("[data-officer-deposit-action]").forEach((button) => button.addEventListener("click", () => { appState.officerDepositModalMode = button.dataset.officerDepositAction; appState.selectedOfficerDepositId = Number(button.dataset.id); renderOfficerDeposits(); }));
  document.querySelectorAll("[data-close-officer-deposit-modal]").forEach((button) => button.addEventListener("click", () => { appState.officerDepositModalMode = null; appState.selectedOfficerDepositId = null; renderOfficerDeposits(); }));
  document.querySelector("#officerDepositForm")?.addEventListener("submit", (event) => handleOfficerDepositSubmit(event, session));
  document.querySelector("#confirmOfficerDepositDeleteButton")?.addEventListener("click", handleOfficerDepositDelete);
  bindImagePreview("#officerDepositProof", "#officerDepositPreview", "#officerDepositFormError");
}

async function handleOfficerDepositSubmit(event, session) {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const existing = appState.officerDeposits.find((item) => item.id === appState.selectedOfficerDepositId); const proof = form.elements.proofPhoto?.files?.[0];
  const error = validateImageFile(proof); if (error) return document.querySelector("#officerDepositFormError").textContent = error;
  let uploaded = null; try { uploaded = proof ? await uploadDocumentationPhoto(proof, "setoran-petugas") : null; } catch (uploadError) { return document.querySelector("#officerDepositFormError").textContent = uploadError.message; }
  const officer = String(data.get("officer") || existing?.officer || getDefaultOfficer(session)?.name || "").trim();
  const payload = { depositNo: String(data.get("depositNo") || "").trim(), officer, officerEmail: resolveOfficerEmail(officer, existing?.officerEmail || session.email), date: String(data.get("date") || ""), periodStart: String(data.get("periodStart") || ""), periodEnd: String(data.get("periodEnd") || ""), amount: Number(data.get("amount") || 0), transactionCount: Number(data.get("transactionCount") || 0), method: String(data.get("method") || "Tunai"), status: session.role === "petugas" ? existing?.status || "Menunggu Verifikasi" : String(data.get("status") || "Menunggu Verifikasi"), note: String(data.get("note") || "").trim(), proofPhotoPath: uploaded?.path || existing?.proofPhotoPath || "", proofPhotoUrl: uploaded?.url || existing?.proofPhotoUrl || "", proofPhotoName: uploaded?.name || existing?.proofPhotoName || "" };
  if (!payload.officer || !payload.date || !payload.periodStart || !payload.periodEnd || payload.periodStart > payload.periodEnd || payload.amount <= 0 || payload.transactionCount <= 0) return document.querySelector("#officerDepositFormError").textContent = "Lengkapi petugas, tanggal, periode, nominal, dan jumlah transaksi dengan benar.";
  let targetItem = null;
  if (existing) {
    appState.officerDeposits = appState.officerDeposits.map((item) => {
      if (item.id === existing.id) {
        targetItem = { ...item, ...payload };
        return targetItem;
      }
      return item;
    });
  } else {
    targetItem = { id: Date.now(), ...payload };
    appState.officerDeposits = [targetItem, ...appState.officerDeposits];
  }
  const ok = await wrapFormSubmit(event, () => syncRowToPostgres("setoran_petugas", targetItem));
  if (ok) {
    appState.officerDepositModalMode = null;
    appState.selectedOfficerDepositId = null;
    renderOfficerDeposits();
  }
}

async function handleOfficerDepositDelete() { if (!await deleteRowFromPostgres("setoran_petugas", appState.selectedOfficerDepositId)) return; appState.officerDeposits = appState.officerDeposits.filter((item) => item.id !== appState.selectedOfficerDepositId); appState.officerDepositModalMode = null; appState.selectedOfficerDepositId = null; renderOfficerDeposits(); }

function canManageLazisnuDeposits(role) { return role === "admin" || role === "bendahara"; }
function getVisibleLazisnuDeposits() { let items = [...appState.lazisnuDeposits]; const search = appState.lazisnuDepositSearch.trim().toLowerCase(); if (search) items = items.filter((item) => item.depositNo.toLowerCase().includes(search) || item.recipientName.toLowerCase().includes(search)); if (appState.lazisnuDepositDestination !== "all") items = items.filter((item) => item.destination === appState.lazisnuDepositDestination); if (appState.lazisnuDepositDate) items = items.filter((item) => item.date === appState.lazisnuDepositDate); if (appState.lazisnuDepositStatus !== "all") items = items.filter((item) => item.status === appState.lazisnuDepositStatus); return items.sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id); }
function renderLazisnuDepositActions(item, session) { return `<div class="row-actions"><button class="icon-button soft" data-lazisnu-deposit-action="detail" data-id="${item.id}" type="button">Detail</button>${canManageLazisnuDeposits(session.role) ? `<button class="icon-button" data-lazisnu-deposit-action="edit" data-id="${item.id}" type="button">Edit</button><button class="icon-button danger" data-lazisnu-deposit-action="delete" data-id="${item.id}" type="button">Hapus</button>` : ""}</div>`; }
function renderLazisnuDepositList(items, session) { if (!items.length) return `<div class="empty-state">Data setor ke LAZISNU tidak ditemukan.</div>`; const rows = items.map((item) => `<tr><td><strong>${escapeHtml(item.depositNo)}</strong><span>${formatDateId(item.date)}</span></td><td>${escapeHtml(item.destination)}</td><td>${escapeHtml(item.recipientName)}</td><td>${formatRupiah(item.amount)}</td><td>${escapeHtml(item.method)}</td><td>${escapeHtml(item.receiptNo || "-")}</td><td><span class="status-pill ${getDepositStatusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${renderLazisnuDepositActions(item, session)}</td></tr>`).join(""); const cards = items.map((item) => `<article class="lazisnu-deposit-card"><div><strong>${escapeHtml(item.destination)}</strong><span>${escapeHtml(item.depositNo)} - ${formatDateId(item.date)}</span></div><div class="pickup-card-meta"><span>${formatRupiah(item.amount)}</span><span>${escapeHtml(item.recipientName)}</span><span>${escapeHtml(item.method)}</span><span class="status-pill ${getDepositStatusClass(item.status)}">${escapeHtml(item.status)}</span></div><p>${escapeHtml(item.receiptNo || "Nomor bukti belum diisi")}</p>${renderLazisnuDepositActions(item, session)}</article>`).join(""); return `<div class="table-wrap lazisnu-deposit-table"><table><thead><tr><th>No. Setoran</th><th>Tujuan</th><th>Penerima</th><th>Nominal</th><th>Metode</th><th>No. Bukti</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div><div class="lazisnu-deposit-card-list">${cards}</div>`; }

function renderLazisnuDepositModal() {
  const mode = appState.lazisnuDepositModalMode; if (!mode) return ""; const item = appState.lazisnuDeposits.find((entry) => entry.id === appState.selectedLazisnuDepositId); const readonly = mode === "detail";
  if (mode === "delete") return `<div class="modal-backdrop"><section class="confirm-modal"><h2>Hapus Setoran LAZISNU</h2><p>Yakin ingin menghapus <strong>${escapeHtml(item?.depositNo || "setoran ini")}</strong>?</p><div class="modal-actions"><button class="ghost-button" data-close-lazisnu-deposit-modal type="button">Batal</button><button class="danger-button" id="confirmLazisnuDepositDeleteButton" type="button">Hapus</button></div></section></div>`;
  const values = item || { depositNo: generateLazisnuDepositNo(getLocalDateString()), date: getLocalDateString(), destination: "LAZISNU Ranting", recipientName: "", amount: "", method: "Tunai", receiptNo: "", status: "Draft", note: "", proofPhotoUrl: "", proofPhotoName: "" };
  return `<div class="modal-backdrop"><form class="donor-form-modal" id="lazisnuDepositForm"><div class="modal-heading"><div><p class="eyebrow">Setor ke LAZISNU</p><h2>${mode === "add" ? "Tambah Setoran" : readonly ? "Detail Setoran" : "Edit Setoran"}</h2></div><button class="close-button" data-close-lazisnu-deposit-modal type="button">x</button></div><div class="form-grid">
  <label class="field"><span>Nomor setoran</span><input name="depositNo" value="${escapeHtml(values.depositNo)}" readonly /></label><label class="field"><span>Tanggal setor</span><input name="date" type="date" value="${escapeHtml(values.date)}" ${readonly ? "readonly" : ""} required /></label><label class="field"><span>Tujuan setoran</span><select name="destination" ${readonly ? "disabled" : ""}>${["LAZISNU Ranting","MWC LAZISNU","PC LAZISNU"].map((value) => `<option ${values.destination === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="field"><span>Nama penerima/petugas LAZISNU</span><input name="recipientName" value="${escapeHtml(values.recipientName)}" ${readonly ? "readonly" : ""} required /></label><label class="field"><span>Nominal setor</span><input name="amount" type="number" min="1" step="1000" value="${escapeHtml(values.amount)}" ${readonly ? "readonly" : ""} required /></label><label class="field"><span>Metode setor</span><select name="method" ${readonly ? "disabled" : ""}>${["Tunai","Transfer","QRIS"].map((value) => `<option ${values.method === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="field"><span>Nomor bukti/kwitansi</span><input name="receiptNo" value="${escapeHtml(values.receiptNo)}" ${readonly ? "readonly" : ""} /></label><label class="field"><span>Status</span><select name="status" ${readonly ? "disabled" : ""}>${["Draft","Sudah Disetor","Batal"].map((value) => `<option ${values.status === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="field full"><span>Catatan</span><textarea name="note" ${readonly ? "readonly" : ""}>${escapeHtml(values.note)}</textarea></label><label class="field full"><span>Bukti setor</span>${readonly ? "" : `<input name="proofPhoto" id="lazisnuDepositProof" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />`}<small>Opsional. Maksimal 2 MB.</small></label><div class="full" id="lazisnuDepositPreview">${renderPhotoPreview(values.proofPhotoUrl, values.proofPhotoName || "Bukti setor LAZISNU")}</div></div><p class="form-error" id="lazisnuDepositFormError"></p><div class="modal-actions"><button class="ghost-button" data-close-lazisnu-deposit-modal type="button">${readonly ? "Tutup" : "Batal"}</button>${readonly ? "" : `<button class="primary-button compact" type="submit">Simpan Setoran</button>`}</div></form></div>`;
}

function renderLazisnuDeposits() { const session = getSession(); if (!session?.role) return navigate("/login"); const items = getVisibleLazisnuDeposits(); renderAppShell(session, "Setor ke LAZISNU", `<section class="lazisnu-deposit-hero"><div><p class="eyebrow">Kas Ranting ke LAZISNU</p><h2>Catat dana yang disetorkan ke LAZISNU, MWC, atau PCNU.</h2><p>Bendahara dan admin mengelola bukti penyerahan dana dari kas ranting.</p></div>${canManageLazisnuDeposits(session.role) ? `<button class="primary-button compact" id="addLazisnuDepositButton" type="button">Tambah Setoran</button>` : ""}</section>${renderCashSummary()}<section class="panel lazisnu-deposit-panel"><div class="lazisnu-deposit-toolbar"><label class="search-field"><span>Cari setoran</span><input id="lazisnuDepositSearch" value="${escapeHtml(appState.lazisnuDepositSearch)}" placeholder="Nomor setoran atau penerima" /></label><label class="search-field"><span>Tujuan</span><select id="lazisnuDepositDestination"><option value="all">Semua tujuan</option>${["LAZISNU Ranting","MWC LAZISNU","PC LAZISNU"].map((value) => `<option ${appState.lazisnuDepositDestination === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label><label><span>Tanggal</span><input id="lazisnuDepositDate" type="date" value="${escapeHtml(appState.lazisnuDepositDate)}" /></label><label><span>Status</span><select id="lazisnuDepositStatus"><option value="all">Semua status</option>${["Draft","Sudah Disetor","Batal"].map((value) => `<option ${appState.lazisnuDepositStatus === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label></div>${renderLazisnuDepositList(items, session)}</section>${renderLazisnuDepositModal()}`); bindLazisnuDepositEvents(); }
function bindLazisnuDepositEvents() { document.querySelector("#addLazisnuDepositButton")?.addEventListener("click", () => { appState.lazisnuDepositModalMode = "add"; renderLazisnuDeposits(); }); [["#lazisnuDepositSearch","lazisnuDepositSearch","input"],["#lazisnuDepositDestination","lazisnuDepositDestination","change"],["#lazisnuDepositDate","lazisnuDepositDate","change"],["#lazisnuDepositStatus","lazisnuDepositStatus","change"]].forEach(([selector,key,event]) => document.querySelector(selector)?.addEventListener(event, event === "input" ? debounce((e) => { appState[key] = e.target.value; renderLazisnuDeposits(); }, 250) : (e) => { appState[key] = e.target.value; renderLazisnuDeposits(); })); document.querySelectorAll("[data-lazisnu-deposit-action]").forEach((button) => button.addEventListener("click", () => { appState.lazisnuDepositModalMode = button.dataset.lazisnuDepositAction; appState.selectedLazisnuDepositId = Number(button.dataset.id); renderLazisnuDeposits(); })); document.querySelectorAll("[data-close-lazisnu-deposit-modal]").forEach((button) => button.addEventListener("click", () => { appState.lazisnuDepositModalMode = null; appState.selectedLazisnuDepositId = null; renderLazisnuDeposits(); })); document.querySelector("#lazisnuDepositForm")?.addEventListener("submit", handleLazisnuDepositSubmit); document.querySelector("#confirmLazisnuDepositDeleteButton")?.addEventListener("click", handleLazisnuDepositDelete); bindImagePreview("#lazisnuDepositProof", "#lazisnuDepositPreview", "#lazisnuDepositFormError"); }
async function handleLazisnuDepositSubmit(event) {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const existing = appState.lazisnuDeposits.find((item) => item.id === appState.selectedLazisnuDepositId); const proof = form.elements.proofPhoto?.files?.[0]; const error = validateImageFile(proof); if (error) return document.querySelector("#lazisnuDepositFormError").textContent = error; let uploaded = null; try { uploaded = proof ? await uploadDocumentationPhoto(proof, "setoran-lazisnu") : null; } catch (uploadError) { return document.querySelector("#lazisnuDepositFormError").textContent = uploadError.message; } const payload = { depositNo: String(data.get("depositNo") || "").trim(), date: String(data.get("date") || ""), destination: String(data.get("destination") || "LAZISNU Ranting"), recipientName: String(data.get("recipientName") || "").trim(), amount: Number(data.get("amount") || 0), method: String(data.get("method") || "Tunai"), receiptNo: String(data.get("receiptNo") || "").trim(), status: String(data.get("status") || "Draft"), note: String(data.get("note") || "").trim(), proofPhotoPath: uploaded?.path || existing?.proofPhotoPath || "", proofPhotoUrl: uploaded?.url || existing?.proofPhotoUrl || "", proofPhotoName: uploaded?.name || existing?.proofPhotoName || "" }; if (!payload.date || !payload.recipientName || payload.amount <= 0) return document.querySelector("#lazisnuDepositFormError").textContent = "Lengkapi tanggal, penerima, dan nominal setoran.";
  let targetItem = null;
  if (existing) {
    appState.lazisnuDeposits = appState.lazisnuDeposits.map((item) => {
      if (item.id === existing.id) {
        targetItem = { ...item, ...payload };
        return targetItem;
      }
      return item;
    });
  } else {
    targetItem = { id: Date.now(), ...payload };
    appState.lazisnuDeposits = [targetItem, ...appState.lazisnuDeposits];
  }
  const ok = await wrapFormSubmit(event, () => syncRowToPostgres("setoran_lazisnu", targetItem));
  if (ok) {
    appState.lazisnuDepositModalMode = null;
    appState.selectedLazisnuDepositId = null;
    renderLazisnuDeposits();
  }
}
async function handleLazisnuDepositDelete() { if (!await deleteRowFromPostgres("setoran_lazisnu", appState.selectedLazisnuDepositId)) return; appState.lazisnuDeposits = appState.lazisnuDeposits.filter((item) => item.id !== appState.selectedLazisnuDepositId); appState.lazisnuDepositModalMode = null; appState.selectedLazisnuDepositId = null; renderLazisnuDeposits(); }

function canManageDistribution(role) {
  return role === "admin" || role === "bendahara";
}

function getDistributionStatusClass(status) {
  if (status === "Disalurkan") {
    return "approved";
  }

  if (status === "Dibatalkan") {
    return "rejected";
  }

  return "waiting";
}

function getVisibleDistributions() {
  let distributions = [...appState.distributions];
  const search = appState.distributionSearch.trim().toLowerCase();

  if (search) {
    distributions = distributions.filter((item) => item.recipientName.toLowerCase().includes(search));
  }

  if (appState.distributionCategory !== "all") {
    distributions = distributions.filter((item) => item.category === appState.distributionCategory);
  }

  if (appState.distributionDate) {
    distributions = distributions.filter((item) => item.date === appState.distributionDate);
  }

  if (appState.distributionStatus !== "all") {
    distributions = distributions.filter((item) => item.status === appState.distributionStatus);
  }

  return distributions.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function renderDistributionSummary(distributions) {
  const month = getLocalDateString().slice(0, 7);
  const deliveredThisMonth = appState.distributions.filter((item) => item.status === "Disalurkan" && item.date.startsWith(month));
  const totalDelivered = deliveredThisMonth.reduce((sum, item) => sum + item.amount, 0);
  const categoryCounts = new Map();
  deliveredThisMonth.forEach((item) => categoryCounts.set(item.category, (categoryCounts.get(item.category) || 0) + 1));
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  const approvedIncome = appState.pickups
    .filter((pickup) => pickup.status === "Disetujui Bendahara" && pickup.date.startsWith(month))
    .reduce((sum, pickup) => sum + pickup.amount, 0);

  return `
    <section class="distribution-stats">
      <article><span>Tersalurkan bulan ini</span><strong>${formatRupiah(totalDelivered)}</strong></article>
      <article><span>Penerima bantuan</span><strong>${new Set(deliveredThisMonth.map((item) => item.recipientName)).size}</strong></article>
      <article><span>Kategori terbanyak</span><strong>${escapeHtml(topCategory)}</strong></article>
      <article><span>Saldo akhir sementara</span><strong>${formatRupiah(approvedIncome - totalDelivered)}</strong></article>
    </section>
  `;
}

function renderDistributionActions(item, session) {
  const manage = canManageDistribution(session.role) ? `
    <button class="icon-button" data-distribution-action="edit" data-id="${item.id}" type="button">Edit</button>
    <button class="icon-button danger" data-distribution-action="delete" data-id="${item.id}" type="button">Hapus</button>
  ` : "";

  return `
    <div class="row-actions">
      <button class="icon-button soft" data-distribution-action="detail" data-id="${item.id}" type="button">Detail</button>
      ${manage}
    </div>
  `;
}

function renderDistributionList(distributions, session) {
  if (!distributions.length) {
    return `<div class="empty-state">Data penyaluran tidak ditemukan untuk filter ini.</div>`;
  }

  const rows = distributions.map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.distributionNo)}</strong>
        <span>${formatDateId(item.date)}</span>
      </td>
      <td>
        <strong>${escapeHtml(item.recipientName)}</strong>
        <span>RT ${escapeHtml(item.rt)} / RW ${escapeHtml(item.rw)}</span>
      </td>
      <td>${escapeHtml(item.category)}</td>
      <td>${formatRupiah(item.amount)}</td>
      <td>${escapeHtml(item.source)}</td>
      <td><span class="status-pill ${getDistributionStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
      <td>${renderDistributionActions(item, session)}</td>
    </tr>
  `).join("");

  const cards = distributions.map((item) => `
    <article class="distribution-card">
      <div>
        <strong>${escapeHtml(item.recipientName)}</strong>
        <span>${escapeHtml(item.distributionNo)} - ${formatDateId(item.date)}</span>
      </div>
      <div class="pickup-card-meta">
        <span>${formatRupiah(item.amount)}</span>
        <span>${escapeHtml(item.category)}</span>
        <span>RT ${escapeHtml(item.rt)}/RW ${escapeHtml(item.rw)}</span>
        <span class="status-pill ${getDistributionStatusClass(item.status)}">${escapeHtml(item.status)}</span>
      </div>
      <p>${item.note ? escapeHtml(item.note) : "Tidak ada keterangan."}</p>
      ${renderDistributionActions(item, session)}
    </article>
  `).join("");

  return `
    <div class="table-wrap distribution-table">
      <table>
        <thead>
          <tr>
            <th>No. Penyaluran</th>
            <th>Penerima</th>
            <th>Kategori</th>
            <th>Nominal</th>
            <th>Sumber Dana</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="distribution-card-list">${cards}</div>
  `;
}

function renderDistributionModal(session) {
  if (!appState.distributionModalMode) {
    return "";
  }

  const item = appState.distributions.find((distribution) => distribution.id === appState.selectedDistributionId);
  const mode = appState.distributionModalMode;
  const isReadonly = mode === "detail";
  const title = mode === "add" ? "Tambah Penyaluran" : mode === "edit" ? "Edit Penyaluran" : mode === "delete" ? "Hapus Penyaluran" : "Detail Penyaluran";

  if (mode === "delete") {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="confirm-modal">
          <h2>${title}</h2>
          <p>Yakin ingin menghapus penyaluran untuk <strong>${escapeHtml(item?.recipientName || "penerima ini")}</strong>?</p>
          <div class="modal-actions">
            <button class="ghost-button" data-close-distribution-modal type="button">Batal</button>
            <button class="danger-button" id="confirmDistributionDeleteButton" type="button">Hapus</button>
          </div>
        </section>
      </div>
    `;
  }

  const values = item || {
    distributionNo: generateDistributionNo(getLocalDateString()),
    date: getLocalDateString(),
    recipientName: "",
    address: "",
    rt: "",
    rw: "",
    phone: "",
    category: "Santunan Yatim",
    amount: "",
    source: "Kas Koin NU",
    status: "Draft",
    note: "",
    documentationName: "",
    documentationUrl: ""
  };

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="donor-form-modal" id="distributionForm" novalidate>
        <div class="modal-heading">
          <div>
            <p class="eyebrow">Penyaluran Dana</p>
            <h2>${title}</h2>
          </div>
          <button class="close-button" data-close-distribution-modal type="button" aria-label="Tutup">x</button>
        </div>
        <div class="form-grid">
          <label class="field">
            <span>Nomor penyaluran otomatis</span>
            <input name="distributionNo" id="distributionNoInput" value="${escapeHtml(values.distributionNo)}" readonly />
          </label>
          <label class="field">
            <span>Tanggal penyaluran</span>
            <input name="date" id="distributionDateInput" type="date" value="${escapeHtml(values.date)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field">
            <span>Nama penerima</span>
            <input name="recipientName" value="${escapeHtml(values.recipientName)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field">
            <span>Nomor HP penerima</span>
            <input name="phone" value="${escapeHtml(values.phone)}" ${isReadonly ? "readonly" : ""} />
          </label>
          <label class="field full">
            <span>Alamat penerima</span>
            <input name="address" value="${escapeHtml(values.address)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field">
            <span>RT</span>
            <input name="rt" value="${escapeHtml(values.rt)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field">
            <span>RW</span>
            <input name="rw" value="${escapeHtml(values.rw)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field">
            <span>Kategori bantuan</span>
            <select name="category" ${isReadonly ? "disabled" : ""}>
              ${distributionCategories.map((category) => `<option value="${category}" ${values.category === category ? "selected" : ""}>${category}</option>`).join("")}
            </select>
          </label>
          <label class="field">
            <span>Nominal bantuan</span>
            <input name="amount" type="number" min="0" step="1000" value="${escapeHtml(values.amount)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field">
            <span>Sumber dana</span>
            <input name="source" value="${escapeHtml(values.source)}" ${isReadonly ? "readonly" : ""} required />
          </label>
          <label class="field">
            <span>Status penyaluran</span>
            <select name="status" ${isReadonly ? "disabled" : ""}>
              ${["Draft", "Disalurkan", "Dibatalkan"].map((status) => `<option value="${status}" ${values.status === status ? "selected" : ""}>${status}</option>`).join("")}
            </select>
          </label>
          <label class="field">
            <span>Dokumentasi/foto</span>
            ${isReadonly ? "" : `<input name="documentation" id="distributionDocumentation" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />`}
            <small>${values.documentationName ? `Saat ini: ${escapeHtml(values.documentationName)}. ` : ""}Format JPG, PNG, atau WEBP. Maksimal 2 MB.</small>
          </label>
          <div class="full" id="distributionDocumentationPreview">${renderPhotoPreview(values.documentationUrl, values.documentationName || "Dokumentasi penyaluran dana")}</div>
          <label class="field full">
            <span>Keterangan</span>
            <textarea name="note" ${isReadonly ? "readonly" : ""}>${escapeHtml(values.note)}</textarea>
          </label>
        </div>
        <p class="form-error" id="distributionFormError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" data-close-distribution-modal type="button">${isReadonly ? "Tutup" : "Batal"}</button>
          ${isReadonly ? "" : `<button class="primary-button compact" type="submit">${mode === "add" ? "Simpan Penyaluran" : "Simpan Perubahan"}</button>`}
        </div>
      </form>
    </div>
  `;
}

function renderDistributions() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }

  const distributions = getVisibleDistributions();

  renderAppShell(session, "Penyaluran Dana", `
    <section class="distribution-hero">
      <div>
        <p class="eyebrow">Program Sosial Ranting</p>
        <h2>Catat dan pantau penyaluran dana Koin NU.</h2>
        <p>${canManageDistribution(session.role) ? "Admin dan bendahara dapat mengelola penyaluran dana." : "Petugas dapat melihat data penyaluran yang sudah dicatat."}</p>
      </div>
      ${canManageDistribution(session.role) ? `<button class="primary-button compact" id="addDistributionButton" type="button">Tambah Penyaluran</button>` : ""}
    </section>

    ${renderDistributionSummary(distributions)}

    <section class="panel distribution-panel">
      <div class="distribution-toolbar">
        <label class="search-field">
          <span>Cari penerima</span>
          <input id="distributionSearch" type="search" value="${escapeHtml(appState.distributionSearch)}" placeholder="Cari nama penerima" />
        </label>
        <label>
          <span>Kategori</span>
          <select id="distributionCategory">
            <option value="all">Semua kategori</option>
            ${distributionCategories.map((category) => `<option value="${category}" ${appState.distributionCategory === category ? "selected" : ""}>${category}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Tanggal</span>
          <input id="distributionDate" type="date" value="${escapeHtml(appState.distributionDate)}" />
        </label>
        <label>
          <span>Status</span>
          <select id="distributionStatus">
            <option value="all">Semua status</option>
            ${["Draft", "Disalurkan", "Dibatalkan"].map((status) => `<option value="${status}" ${appState.distributionStatus === status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </label>
      </div>
      ${renderDistributionList(distributions, session)}
    </section>
    ${renderDistributionModal(session)}
  `);

  bindDistributionEvents(session);
}

function bindDistributionEvents(session) {
  document.querySelector("#addDistributionButton")?.addEventListener("click", () => openDistributionModal("add"));

  [
    ["#distributionSearch", "distributionSearch", "input"],
    ["#distributionCategory", "distributionCategory", "change"],
    ["#distributionDate", "distributionDate", "change"],
    ["#distributionStatus", "distributionStatus", "change"]
  ].forEach(([selector, key, eventName]) => {
    document.querySelector(selector)?.addEventListener(eventName, eventName === "input" ? debounce((event) => {
      appState[key] = event.target.value;
      renderDistributions();
    }, 250) : (event) => {
      appState[key] = event.target.value;
      renderDistributions();
    });
  });

  document.querySelectorAll("[data-distribution-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.distributionAction;
      if ((action === "edit" || action === "delete") && !canManageDistribution(session.role)) {
        return;
      }
      openDistributionModal(action, Number(button.dataset.id));
    });
  });

  document.querySelectorAll("[data-close-distribution-modal]").forEach((button) => {
    button.addEventListener("click", closeDistributionModal);
  });

  document.querySelector("#distributionForm")?.addEventListener("submit", handleDistributionSubmit);
  bindImagePreview("#distributionDocumentation", "#distributionDocumentationPreview", "#distributionFormError");
  document.querySelector("#confirmDistributionDeleteButton")?.addEventListener("click", handleDistributionDelete);
  document.querySelector("#distributionDateInput")?.addEventListener("change", (event) => {
    if (appState.distributionModalMode !== "add") {
      return;
    }
    const numberInput = document.querySelector("#distributionNoInput");
    if (numberInput) {
      numberInput.value = generateDistributionNo(event.target.value);
    }
  });
}

function openDistributionModal(mode, id = null) {
  appState.distributionModalMode = mode;
  appState.selectedDistributionId = id;
  renderDistributions();
}

function closeDistributionModal() {
  appState.distributionModalMode = null;
  appState.selectedDistributionId = null;
  renderDistributions();
}

async function handleDistributionSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const existing = appState.distributions.find((item) => item.id === appState.selectedDistributionId);
  const documentation = form.elements.documentation?.files?.[0];
  const photoError = validateImageFile(documentation);
  if (photoError) {
    document.querySelector("#distributionFormError").textContent = photoError;
    return;
  }
  let uploadedPhoto = null;
  try {
    uploadedPhoto = documentation ? await uploadDocumentationPhoto(documentation, "penyaluran") : null;
  } catch (error) {
    document.querySelector("#distributionFormError").textContent = error.message;
    return;
  }
  const payload = {
    distributionNo: String(data.get("distributionNo") || "").trim() || generateDistributionNo(String(data.get("date") || getLocalDateString())),
    date: String(data.get("date") || ""),
    recipientName: String(data.get("recipientName") || "").trim(),
    address: String(data.get("address") || "").trim(),
    rt: String(data.get("rt") || "").trim().padStart(2, "0"),
    rw: String(data.get("rw") || "").trim().padStart(2, "0"),
    phone: String(data.get("phone") || "").trim(),
    category: String(data.get("category") || "Lainnya"),
    amount: Number(data.get("amount") || 0),
    source: String(data.get("source") || "").trim(),
    status: String(data.get("status") || "Draft"),
    note: String(data.get("note") || "").trim(),
    documentationPath: uploadedPhoto?.path || existing?.documentationPath || "",
    documentationName: uploadedPhoto?.name || existing?.documentationName || "",
    documentationUrl: uploadedPhoto?.url || existing?.documentationUrl || ""
  };

  if (!payload.date || !payload.recipientName || !payload.address || !payload.rt || !payload.rw || !payload.source || payload.amount <= 0) {
    document.querySelector("#distributionFormError").textContent = "Lengkapi tanggal, penerima, alamat, RT/RW, sumber dana, dan nominal.";
    return;
  }

  let targetItem = null;
  if (appState.distributionModalMode === "edit") {
    appState.distributions = appState.distributions.map((item) => {
      if (item.id === appState.selectedDistributionId) {
        targetItem = { ...item, ...payload };
        return targetItem;
      }
      return item;
    });
  } else {
    targetItem = { id: Date.now(), ...payload };
    appState.distributions = [targetItem, ...appState.distributions];
  }

  const ok = await wrapFormSubmit(event, () => syncRowToPostgres("penyaluran_dana", targetItem));
  if (ok) {
    closeDistributionModal();
  }
}

async function handleDistributionDelete() {
  if (!await deleteRowFromPostgres("penyaluran_dana", appState.selectedDistributionId)) {
    return;
  }
  appState.distributions = appState.distributions.filter((item) => item.id !== appState.selectedDistributionId);
  closeDistributionModal();
}

function canManageOfficers(role) {
  return role === "admin";
}

function getVisibleOfficers(session) {
  let officers = [...appState.officers];

  if (session.role === "petugas") {
    officers = officers.filter((officer) => officer.username === session.email || officer.username === "petugas@rantingnu.id");
  }

  const search = appState.officerSearch.trim().toLowerCase();
  if (search) {
    officers = officers.filter((officer) => officer.name.toLowerCase().includes(search));
  }

  if (appState.officerArea !== "all") {
    officers = officers.filter((officer) => officer.area === appState.officerArea);
  }

  if (appState.officerStatus !== "all") {
    officers = officers.filter((officer) => officer.active === (appState.officerStatus === "active"));
  }

  return officers;
}

function getOfficerDonors(officer) {
  return appState.donors.filter((donor) => donor.officerEmail === officer.username || (officer.username === "petugas@rantingnu.id" && donor.officerEmail === "petugas@rantingnu.id"));
}

function getOfficerPickups(officer) {
  return appState.pickups.filter((pickup) => pickup.officerEmail === officer.username || (officer.username === "petugas@rantingnu.id" && pickup.officerEmail === "petugas@rantingnu.id"));
}

function renderOfficerStats(officers) {
  const active = officers.filter((officer) => officer.active).length;
  const totalDonors = officers.reduce((sum, officer) => sum + getOfficerDonors(officer).length, 0);
  const totalPickups = officers.reduce((sum, officer) => sum + getOfficerPickups(officer).length, 0);

  return `
    <section class="officer-stats">
      <article><span>Total petugas</span><strong>${officers.length}</strong></article>
      <article><span>Petugas aktif</span><strong>${active}</strong></article>
      <article><span>Donatur binaan</span><strong>${totalDonors}</strong></article>
      <article><span>Transaksi terkait</span><strong>${totalPickups}</strong></article>
    </section>
  `;
}

function renderOfficerActions(officer, session) {
  const manage = canManageOfficers(session.role) ? `
    <button class="icon-button" data-officer-action="edit" data-id="${officer.id}" type="button">Edit</button>
    <button class="icon-button danger" data-officer-action="delete" data-id="${officer.id}" type="button">Hapus</button>
  ` : "";

  return `
    <div class="row-actions">
      <button class="icon-button soft" data-officer-action="detail" data-id="${officer.id}" type="button">Detail</button>
      ${manage}
    </div>
  `;
}

function renderOfficerList(officers, session) {
  if (!officers.length) {
    return `<div class="empty-state">Data petugas tidak ditemukan untuk filter ini.</div>`;
  }

  const rows = officers.map((officer) => `
    <tr>
      <td>
        <strong>${escapeHtml(officer.name)}</strong>
        <span>${escapeHtml(officer.phone)}</span>
      </td>
      <td>${escapeHtml(officer.area)}</td>
      <td>RT ${escapeHtml(officer.rt)} / RW ${escapeHtml(officer.rw)}</td>
      <td>${getOfficerDonors(officer).length || officer.donorCount}</td>
      <td>${escapeHtml(officer.username)}</td>
      <td><span class="status-pill ${officer.active ? "active" : "inactive"}">${officer.active ? "Aktif" : "Tidak aktif"}</span></td>
      <td>${renderOfficerActions(officer, session)}</td>
    </tr>
  `).join("");

  const cards = officers.map((officer) => `
    <article class="officer-card">
      <div>
        <strong>${escapeHtml(officer.name)}</strong>
        <span>${escapeHtml(officer.phone)} - ${escapeHtml(officer.username)}</span>
      </div>
      <div class="pickup-card-meta">
        <span>${escapeHtml(officer.area)}</span>
        <span>${getOfficerDonors(officer).length || officer.donorCount} donatur</span>
        <span class="status-pill ${officer.active ? "active" : "inactive"}">${officer.active ? "Aktif" : "Tidak aktif"}</span>
      </div>
      ${renderOfficerActions(officer, session)}
    </article>
  `).join("");

  return `
    <div class="table-wrap officer-table">
      <table>
        <thead>
          <tr>
            <th>Petugas</th>
            <th>Wilayah Tugas</th>
            <th>Domisili</th>
            <th>Donatur</th>
            <th>Login</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="officer-card-list">${cards}</div>
  `;
}

function renderOfficerDetail(officer) {
  const month = getLocalDateString().slice(0, 7);
  const donors = getOfficerDonors(officer);
  const pickups = getOfficerPickups(officer);
  const monthlyPickups = pickups.filter((pickup) => pickup.date.startsWith(month));
  const monthlyTotal = monthlyPickups.reduce((sum, pickup) => sum + pickup.amount, 0);
  const waiting = pickups.filter((pickup) => pickup.status === "Menunggu Verifikasi").length;
  const activities = pickups.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return `
    <section class="officer-detail">
      <div class="detail-grid">
        <div><span>Nama</span><strong>${escapeHtml(officer.name)}</strong></div>
        <div><span>Nomor HP</span><strong>${escapeHtml(officer.phone)}</strong></div>
        <div class="full"><span>Alamat</span><strong>${escapeHtml(officer.address)}</strong></div>
        <div><span>Wilayah tugas</span><strong>${escapeHtml(officer.area)}</strong></div>
        <div><span>Role</span><strong>${escapeHtml(officer.role)}</strong></div>
        <div><span>Donatur tanggung jawab</span><strong>${donors.length || officer.donorCount}</strong></div>
        <div><span>Pengambilan bulan ini</span><strong>${formatRupiah(monthlyTotal)}</strong></div>
        <div><span>Total transaksi</span><strong>${pickups.length}</strong></div>
        <div><span>Menunggu verifikasi</span><strong>${waiting}</strong></div>
        <div><span>Status</span><strong>${officer.active ? "Aktif" : "Tidak aktif"}</strong></div>
      </div>
      <section class="audit-panel">
        <h3>Riwayat Aktivitas Terbaru</h3>
        ${activities.length ? activities.map((pickup) => `
          <article>
            <strong>${escapeHtml(pickup.donorName)} - ${formatRupiah(pickup.amount)}</strong>
            <span>${formatDateId(pickup.date)} - ${escapeHtml(pickup.status)}</span>
            <p>${pickup.note ? escapeHtml(pickup.note) : "Tidak ada catatan."}</p>
          </article>
        `).join("") : `<p>Belum ada aktivitas pengambilan.</p>`}
      </section>
    </section>
  `;
}

function renderOfficerModal(session) {
  if (!appState.officerModalMode) {
    return "";
  }

  const officer = appState.officers.find((item) => item.id === appState.selectedOfficerId);
  const mode = appState.officerModalMode;
  const isReadonly = mode === "detail";
  const title = mode === "add" ? "Tambah Petugas" : mode === "edit" ? "Edit Petugas" : mode === "delete" ? "Hapus Petugas" : "Detail Petugas";

  if (mode === "delete") {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="confirm-modal">
          <h2>${title}</h2>
          <p>Yakin ingin menghapus data <strong>${escapeHtml(officer?.name || "petugas ini")}</strong>?</p>
          <div class="modal-actions">
            <button class="ghost-button" data-close-officer-modal type="button">Batal</button>
            <button class="danger-button" id="confirmOfficerDeleteButton" type="button">Hapus</button>
          </div>
        </section>
      </div>
    `;
  }

  if (mode === "detail" && officer) {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="verification-modal">
          <div class="modal-heading">
            <div>
              <p class="eyebrow">Profil Juru Koin</p>
              <h2>${escapeHtml(officer.name)}</h2>
            </div>
            <button class="close-button" data-close-officer-modal type="button" aria-label="Tutup">x</button>
          </div>
          ${renderOfficerDetail(officer)}
          <div class="modal-actions">
            <button class="ghost-button" data-close-officer-modal type="button">Tutup</button>
          </div>
        </section>
      </div>
    `;
  }

  const values = officer || {
    name: "",
    phone: "",
    address: "",
    rt: "",
    rw: "",
    area: "",
    donorCount: "",
    username: "",
    role: "petugas",
    active: true,
    note: ""
  };

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="donor-form-modal" id="officerForm" novalidate>
        <div class="modal-heading">
          <div>
            <p class="eyebrow">Data Petugas</p>
            <h2>${title}</h2>
          </div>
          <button class="close-button" data-close-officer-modal type="button" aria-label="Tutup">x</button>
        </div>
        <div class="form-grid">
          <label class="field">
            <span>Nama lengkap petugas</span>
            <input name="name" value="${escapeHtml(values.name)}" required />
          </label>
          <label class="field">
            <span>Nomor HP</span>
            <input name="phone" value="${escapeHtml(values.phone)}" />
          </label>
          <label class="field full">
            <span>Alamat</span>
            <input name="address" value="${escapeHtml(values.address)}" required />
          </label>
          <label class="field">
            <span>RT</span>
            <input name="rt" value="${escapeHtml(values.rt)}" required />
          </label>
          <label class="field">
            <span>RW</span>
            <input name="rw" value="${escapeHtml(values.rw)}" required />
          </label>
          <label class="field full">
            <span>Wilayah tugas</span>
            <input name="area" value="${escapeHtml(values.area)}" required />
          </label>
          <label class="field">
            <span>Jumlah donatur binaan</span>
            <input name="donorCount" type="number" min="0" value="${escapeHtml(values.donorCount)}" />
          </label>
          <label class="field">
            <span>Username/email login</span>
            <input name="username" value="${escapeHtml(values.username)}" required />
          </label>
          <label class="field">
            <span>Role petugas</span>
            <select name="role">
              <option value="petugas" ${values.role === "petugas" ? "selected" : ""}>Petugas</option>
              <option value="koordinator" ${values.role === "koordinator" ? "selected" : ""}>Koordinator</option>
            </select>
          </label>
          <label class="field">
            <span>Status</span>
            <select name="active">
              <option value="true" ${values.active ? "selected" : ""}>Aktif</option>
              <option value="false" ${!values.active ? "selected" : ""}>Tidak aktif</option>
            </select>
          </label>
          <label class="field full">
            <span>Catatan</span>
            <textarea name="note">${escapeHtml(values.note)}</textarea>
          </label>
        </div>
        <p class="form-error" id="officerFormError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" data-close-officer-modal type="button">Batal</button>
          <button class="primary-button compact" type="submit">${mode === "add" ? "Simpan Petugas" : "Simpan Perubahan"}</button>
        </div>
      </form>
    </div>
  `;
}

function renderOfficers() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }

  const officers = getVisibleOfficers(session);
  const areaOptions = [...new Set(appState.officers.map((officer) => officer.area))].sort();

  renderAppShell(session, "Data Petugas", `
    <section class="officer-hero">
      <div>
        <p class="eyebrow">Juru Koin Ranting</p>
        <h2>Kelola petugas dan wilayah tanggung jawab pengambilan koin.</h2>
        <p>${session.role === "petugas" ? "Petugas hanya melihat profil dirinya sendiri." : session.role === "bendahara" ? "Bendahara dapat memantau data petugas dan performa pengambilan." : "Admin dapat menambah, mengubah, dan menghapus data petugas."}</p>
      </div>
      ${canManageOfficers(session.role) ? `<button class="primary-button compact" id="addOfficerButton" type="button">Tambah Petugas</button>` : ""}
    </section>

    ${renderOfficerStats(officers)}

    <section class="panel officer-panel">
      <div class="officer-toolbar">
        <label class="search-field">
          <span>Cari petugas</span>
          <input id="officerSearch" type="search" value="${escapeHtml(appState.officerSearch)}" placeholder="Cari nama petugas" />
        </label>
        <label>
          <span>Wilayah tugas</span>
          <select id="officerArea">
            <option value="all">Semua wilayah</option>
            ${areaOptions.map((area) => `<option value="${escapeHtml(area)}" ${appState.officerArea === area ? "selected" : ""}>${escapeHtml(area)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select id="officerStatus">
            <option value="all">Semua status</option>
            <option value="active" ${appState.officerStatus === "active" ? "selected" : ""}>Aktif</option>
            <option value="inactive" ${appState.officerStatus === "inactive" ? "selected" : ""}>Tidak aktif</option>
          </select>
        </label>
      </div>
      ${renderOfficerList(officers, session)}
    </section>
    ${renderOfficerModal(session)}
  `);

  bindOfficerEvents(session);
}

function bindOfficerEvents(session) {
  document.querySelector("#addOfficerButton")?.addEventListener("click", () => openOfficerModal("add"));

  [
    ["#officerSearch", "officerSearch", "input"],
    ["#officerArea", "officerArea", "change"],
    ["#officerStatus", "officerStatus", "change"]
  ].forEach(([selector, key, eventName]) => {
    document.querySelector(selector)?.addEventListener(eventName, eventName === "input" ? debounce((event) => {
      appState[key] = event.target.value;
      renderOfficers();
    }, 250) : (event) => {
      appState[key] = event.target.value;
      renderOfficers();
    });
  });

  document.querySelectorAll("[data-officer-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.officerAction;
      if ((action === "edit" || action === "delete") && !canManageOfficers(session.role)) {
        return;
      }
      openOfficerModal(action, Number(button.dataset.id));
    });
  });

  document.querySelectorAll("[data-close-officer-modal]").forEach((button) => {
    button.addEventListener("click", closeOfficerModal);
  });

  document.querySelector("#officerForm")?.addEventListener("submit", handleOfficerSubmit);
  document.querySelector("#confirmOfficerDeleteButton")?.addEventListener("click", handleOfficerDelete);
}

function openOfficerModal(mode, id = null) {
  appState.officerModalMode = mode;
  appState.selectedOfficerId = id;
  renderOfficers();
}

function closeOfficerModal() {
  appState.officerModalMode = null;
  appState.selectedOfficerId = null;
  renderOfficers();
}

function handleOfficerSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const payload = {
    name: String(data.get("name") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    address: String(data.get("address") || "").trim(),
    rt: String(data.get("rt") || "").trim().padStart(2, "0"),
    rw: String(data.get("rw") || "").trim().padStart(2, "0"),
    area: String(data.get("area") || "").trim(),
    donorCount: Number(data.get("donorCount") || 0),
    username: String(data.get("username") || "").trim(),
    role: String(data.get("role") || "petugas"),
    active: data.get("active") === "true",
    note: String(data.get("note") || "").trim()
  };

  if (!payload.name || !payload.address || !payload.rt || !payload.rw || !payload.area || !payload.username) {
    document.querySelector("#officerFormError").textContent = "Nama, alamat, RT/RW, wilayah tugas, dan username wajib diisi.";
    return;
  }

  let targetOfficer = null;
  if (appState.officerModalMode === "edit") {
    appState.officers = appState.officers.map((officer) => {
      if (officer.id === appState.selectedOfficerId) {
        targetOfficer = { ...officer, ...payload };
        return targetOfficer;
      }
      return officer;
    });
  } else {
    targetOfficer = { id: Date.now(), ...payload };
    appState.officers = [targetOfficer, ...appState.officers];
  }

  syncRowToPostgres("petugas", targetOfficer);
  closeOfficerModal();
}

async function handleOfficerDelete() {
  if (!await deleteRowFromPostgres("petugas", appState.selectedOfficerId)) {
    return;
  }
  appState.officers = appState.officers.filter((officer) => officer.id !== appState.selectedOfficerId);
  closeOfficerModal();
}

function renderOrganizationStats() {
  const beneficiaries = new Set(appState.distributions.filter((item) => item.status === "Disalurkan").map((item) => item.recipientName)).size;
  return `
    <section class="org-stats">
      <article><span>Jumlah pengurus</span><strong>${appState.boardMembers.length}</strong></article>
      <article><span>Jumlah petugas</span><strong>${appState.officers.length}</strong></article>
      <article><span>Jumlah donatur</span><strong>${appState.donors.length}</strong></article>
      <article><span>Penerima manfaat</span><strong>${beneficiaries}</strong></article>
    </section>
  `;
}

function renderProfile() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }

  const profile = appState.branchProfile;
  const canEdit = session.role === "admin";

  renderAppShell(session, "Profil Ranting", `
    <section class="org-hero">
      <div>
        <p class="eyebrow">Identitas Organisasi</p>
        <h2>${escapeHtml(profile.branchName)}</h2>
        <p>${escapeHtml(profile.village)}, ${escapeHtml(profile.district)}, ${escapeHtml(profile.regency)}</p>
      </div>
      <div class="report-actions">
        <button class="ghost-button" id="printStructureButton" type="button">Cetak Struktur</button>
        ${canEdit ? `<button class="primary-button compact" id="editProfileButton" type="button">${appState.profileEditMode ? "Batal Edit" : "Edit Profil"}</button>` : ""}
      </div>
    </section>
    ${renderOrganizationStats()}
    <section class="panel org-panel">
      ${appState.profileEditMode && canEdit ? renderProfileForm(profile) : renderProfileDetail(profile)}
    </section>
    ${renderStructurePrint()}
  `);

  document.querySelector("#printStructureButton")?.addEventListener("click", () => window.print());
  document.querySelector("#editProfileButton")?.addEventListener("click", () => {
    appState.profileEditMode = !appState.profileEditMode;
    renderProfile();
  });
  document.querySelector("#cancelProfileEdit")?.addEventListener("click", () => {
    appState.profileEditMode = false;
    renderProfile();
  });
  document.querySelector("#profileForm")?.addEventListener("submit", handleProfileSubmit);
}

function renderProfileDetail(profile) {
  return `
    <div class="org-logo-row">
      <div><strong>NU</strong><span>Logo NU: ${escapeHtml(profile.nuLogo)}</span></div>
      <div><strong>R</strong><span>Logo Ranting: ${escapeHtml(profile.branchLogo)}</span></div>
    </div>
    <div class="detail-grid">
      <div><span>Nama ranting</span><strong>${escapeHtml(profile.branchName)}</strong></div>
      <div><span>Masa khidmah</span><strong>${escapeHtml(profile.servicePeriod)}</strong></div>
      <div><span>Desa</span><strong>${escapeHtml(profile.village)}</strong></div>
      <div><span>Kecamatan</span><strong>${escapeHtml(profile.district)}</strong></div>
      <div><span>Kabupaten</span><strong>${escapeHtml(profile.regency)}</strong></div>
      <div><span>Provinsi</span><strong>${escapeHtml(profile.province)}</strong></div>
      <div class="full"><span>Alamat sekretariat</span><strong>${escapeHtml(profile.secretariatAddress)}</strong></div>
      <div><span>Nomor telepon</span><strong>${escapeHtml(profile.phone)}</strong></div>
      <div><span>Email</span><strong>${escapeHtml(profile.email)}</strong></div>
    </div>
  `;
}

function renderProfileForm(profile) {
  const fields = [
    ["branchName", "Nama ranting"],
    ["village", "Nama desa"],
    ["district", "Kecamatan"],
    ["regency", "Kabupaten"],
    ["province", "Provinsi"],
    ["phone", "Nomor telepon"],
    ["email", "Email"],
    ["branchLogo", "Logo ranting"],
    ["nuLogo", "Logo NU"],
    ["servicePeriod", "Masa khidmah"]
  ];
  return `
    <form id="profileForm" class="profile-form">
      <div class="form-grid">
        ${fields.map(([name, label]) => `
          <label class="field">
            <span>${label}</span>
            <input name="${name}" value="${escapeHtml(profile[name])}" required />
          </label>
        `).join("")}
        <label class="field full">
          <span>Alamat sekretariat</span>
          <input name="secretariatAddress" value="${escapeHtml(profile.secretariatAddress)}" required />
        </label>
      </div>
      <div class="modal-actions">
        <button class="ghost-button" type="button" id="cancelProfileEdit">Batal</button>
        <button class="primary-button compact" type="submit">Simpan Profil</button>
      </div>
    </form>
  `;
}

function handleProfileSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  Object.keys(appState.branchProfile).forEach((key) => {
    appState.branchProfile[key] = String(data.get(key) || "").trim();
  });
  appState.profileEditMode = false;
  syncProfileToPostgres();
  renderProfile();
}

function getVisibleBoardMembers() {
  let members = [...appState.boardMembers];
  const search = appState.boardSearch.trim().toLowerCase();
  if (search) {
    members = members.filter((member) => member.name.toLowerCase().includes(search));
  }
  if (appState.boardPosition !== "all") {
    members = members.filter((member) => member.position === appState.boardPosition);
  }
  if (appState.boardStatus !== "all") {
    members = members.filter((member) => member.active === (appState.boardStatus === "active"));
  }
  return members;
}

function renderBoardMembers() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }
  const canEdit = session.role === "admin";
  const members = getVisibleBoardMembers();
  const positions = ["Ketua", "Wakil Ketua", "Sekretaris", "Wakil Sekretaris", "Bendahara", "Wakil Bendahara", "Admin Sistem"];

  renderAppShell(session, "Data Pengurus", `
    <section class="org-hero">
      <div>
        <p class="eyebrow">Struktur Ranting</p>
        <h2>Data pengurus masa khidmah ${escapeHtml(appState.branchProfile.servicePeriod)}</h2>
        <p>Kelola jabatan inti ranting dan identitas pengurus.</p>
      </div>
      ${canEdit ? `<button class="primary-button compact" id="addBoardButton" type="button">Tambah Pengurus</button>` : ""}
    </section>
    ${renderOrganizationStats()}
    <section class="panel org-panel">
      <div class="board-toolbar">
        <label class="search-field"><span>Cari pengurus</span><input id="boardSearch" type="search" value="${escapeHtml(appState.boardSearch)}" placeholder="Cari nama pengurus" /></label>
        <label><span>Jabatan</span><select id="boardPosition"><option value="all">Semua jabatan</option>${positions.map((position) => `<option value="${position}" ${appState.boardPosition === position ? "selected" : ""}>${position}</option>`).join("")}</select></label>
        <label><span>Status</span><select id="boardStatus"><option value="all">Semua status</option><option value="active" ${appState.boardStatus === "active" ? "selected" : ""}>Aktif</option><option value="inactive" ${appState.boardStatus === "inactive" ? "selected" : ""}>Tidak aktif</option></select></label>
      </div>
      ${renderBoardList(members, session)}
    </section>
    ${renderBoardModal(session)}
  `);
  bindBoardEvents(session);
}

function renderBoardList(members, session) {
  if (!members.length) {
    return `<div class="empty-state">Data pengurus tidak ditemukan.</div>`;
  }
  const canEdit = session.role === "admin";
  const rows = members.map((member) => `
    <tr>
      <td><strong>${escapeHtml(member.position)}</strong><span>${escapeHtml(member.term)}</span></td>
      <td><strong>${escapeHtml(member.name)}</strong><span>${escapeHtml(member.phone)}</span></td>
      <td>${escapeHtml(member.address)}</td>
      <td>${renderBoardAvatar(member)}</td>
      <td><span class="status-pill ${member.active ? "active" : "inactive"}">${member.active ? "Aktif" : "Tidak aktif"}</span></td>
      <td><div class="row-actions"><button class="icon-button soft" data-board-action="detail" data-id="${member.id}" type="button">Detail</button>${canEdit ? `<button class="icon-button" data-board-action="edit" data-id="${member.id}" type="button">Edit</button><button class="icon-button danger" data-board-action="delete" data-id="${member.id}" type="button">Hapus</button>` : ""}</div></td>
    </tr>
  `).join("");
  const cards = members.map((member) => `
    <article class="board-card">
      <div class="board-person">${renderBoardAvatar(member)}<div><strong>${escapeHtml(member.position)}</strong><span>${escapeHtml(member.name)} - ${escapeHtml(member.phone)}</span></div></div>
      <div class="pickup-card-meta"><span>${escapeHtml(member.term)}</span><span class="status-pill ${member.active ? "active" : "inactive"}">${member.active ? "Aktif" : "Tidak aktif"}</span></div>
      <div class="row-actions"><button class="icon-button soft" data-board-action="detail" data-id="${member.id}" type="button">Detail</button>${canEdit ? `<button class="icon-button" data-board-action="edit" data-id="${member.id}" type="button">Edit</button><button class="icon-button danger" data-board-action="delete" data-id="${member.id}" type="button">Hapus</button>` : ""}</div>
    </article>
  `).join("");
  return `<div class="table-wrap board-table"><table><thead><tr><th>Jabatan</th><th>Nama</th><th>Alamat</th><th>Foto</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div><div class="board-card-list">${cards}</div>`;
}

function renderBoardModal(session) {
  if (!appState.boardModalMode) {
    return "";
  }
  const member = appState.boardMembers.find((item) => item.id === appState.selectedBoardId);
  const mode = appState.boardModalMode;
  const readonly = mode === "detail";
  if (mode === "delete") {
    return `<div class="modal-backdrop" role="dialog" aria-modal="true"><section class="confirm-modal"><h2>Hapus Pengurus</h2><p>Yakin ingin menghapus <strong>${escapeHtml(member?.name || "pengurus ini")}</strong>?</p><div class="modal-actions"><button class="ghost-button" data-close-board-modal type="button">Batal</button><button class="danger-button" id="confirmBoardDeleteButton" type="button">Hapus</button></div></section></div>`;
  }
  const values = member || { position: "Ketua", name: "", phone: "", address: "", photo: "", term: appState.branchProfile.servicePeriod, active: true };
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="donor-form-modal" id="boardForm" novalidate>
        <div class="modal-heading"><div><p class="eyebrow">Data Pengurus</p><h2>${mode === "add" ? "Tambah Pengurus" : mode === "edit" ? "Edit Pengurus" : "Detail Pengurus"}</h2></div><button class="close-button" data-close-board-modal type="button" aria-label="Tutup">x</button></div>
        <div class="form-grid">
          <label class="field"><span>Jabatan</span><select name="position" ${readonly ? "disabled" : ""}>${["Ketua", "Wakil Ketua", "Sekretaris", "Wakil Sekretaris", "Bendahara", "Wakil Bendahara", "Admin Sistem"].map((position) => `<option value="${position}" ${values.position === position ? "selected" : ""}>${position}</option>`).join("")}</select></label>
          <label class="field"><span>Nama lengkap</span><input name="name" value="${escapeHtml(values.name)}" ${readonly ? "readonly" : ""} required /></label>
          <label class="field"><span>Nomor HP</span><input name="phone" value="${escapeHtml(values.phone)}" ${readonly ? "readonly" : ""} /></label>
          <label class="field"><span>Masa jabatan</span><input name="term" value="${escapeHtml(values.term)}" ${readonly ? "readonly" : ""} required /></label>
          <label class="field full"><span>Alamat</span><input name="address" value="${escapeHtml(values.address)}" ${readonly ? "readonly" : ""} required /></label>
          ${readonly ? "" : `<label class="field full"><span>Foto pengurus</span><input name="photo" id="boardPhoto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" /><small>Opsional. Format JPG, JPEG, PNG, atau WEBP. Maksimal 2 MB.</small></label>`}
          <div class="full" id="boardPhotoPreview">${renderBoardPhotoPreview(values)}</div>
          <label class="field"><span>Status aktif</span><select name="active" ${readonly ? "disabled" : ""}><option value="true" ${values.active ? "selected" : ""}>Aktif</option><option value="false" ${!values.active ? "selected" : ""}>Tidak aktif</option></select></label>
        </div>
        <p class="form-error" id="boardFormError" role="alert"></p>
        <div class="modal-actions"><button class="ghost-button" data-close-board-modal type="button">${readonly ? "Tutup" : "Batal"}</button>${readonly ? "" : `<button class="primary-button compact" type="submit">Simpan Pengurus</button>`}</div>
      </form>
    </div>
  `;
}

function renderStructurePrint() {
  const profile = appState.branchProfile;
  return `
    <section class="structure-print">
      <header><h1>Struktur Organisasi ${escapeHtml(profile.branchName)}</h1><p>Masa Khidmah ${escapeHtml(profile.servicePeriod)}</p><p>${escapeHtml(profile.village)}, ${escapeHtml(profile.district)}, ${escapeHtml(profile.regency)}</p></header>
      <table><thead><tr><th>Foto</th><th>Jabatan</th><th>Nama</th><th>Nomor HP</th></tr></thead><tbody>${appState.boardMembers.map((member) => `<tr><td>${renderBoardAvatar(member, "print")}</td><td>${escapeHtml(member.position)}</td><td>${escapeHtml(member.name)}</td><td>${escapeHtml(member.phone)}</td></tr>`).join("")}</tbody></table>
    </section>
  `;
}

function bindBoardEvents(session) {
  document.querySelector("#addBoardButton")?.addEventListener("click", () => openBoardModal("add"));
  [["#boardSearch", "boardSearch", "input"], ["#boardPosition", "boardPosition", "change"], ["#boardStatus", "boardStatus", "change"]].forEach(([selector, key, eventName]) => {
    document.querySelector(selector)?.addEventListener(eventName, eventName === "input" ? debounce((event) => {
      appState[key] = event.target.value;
      renderBoardMembers();
    }, 250) : (event) => {
      appState[key] = event.target.value;
      renderBoardMembers();
    });
  });
  document.querySelectorAll("[data-board-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.boardAction;
      if ((action === "edit" || action === "delete") && session.role !== "admin") return;
      openBoardModal(action, Number(button.dataset.id));
    });
  });
  document.querySelectorAll("[data-close-board-modal]").forEach((button) => button.addEventListener("click", closeBoardModal));
  document.querySelector("#boardForm")?.addEventListener("submit", handleBoardSubmit);
  bindBoardPhotoPreview();
  document.querySelector("#confirmBoardDeleteButton")?.addEventListener("click", handleBoardDelete);
}

function bindBoardPhotoPreview() {
  document.querySelector("#boardPhoto")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    const preview = document.querySelector("#boardPhotoPreview");
    const error = document.querySelector("#boardFormError");
    const message = validateImageFile(file);
    if (error) {
      error.textContent = message;
    }
    if (!preview || !file || message) {
      if (message) event.target.value = "";
      return;
    }
    preview.innerHTML = renderBoardPhotoPreview({
      name: document.querySelector("#boardForm [name=name]")?.value || "Pengurus",
      photo: URL.createObjectURL(file)
    });
  });
}

function openBoardModal(mode, id = null) {
  appState.boardModalMode = mode;
  appState.selectedBoardId = id;
  renderBoardMembers();
}

function closeBoardModal() {
  appState.boardModalMode = null;
  appState.selectedBoardId = null;
  renderBoardMembers();
}

async function handleBoardSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const existing = appState.boardMembers.find((member) => member.id === appState.selectedBoardId);
  const photo = form.elements.photo?.files?.[0];
  const photoError = validateImageFile(photo);
  if (photoError) {
    document.querySelector("#boardFormError").textContent = photoError;
    return;
  }
  let uploadedPhoto = null;
  try {
    uploadedPhoto = photo ? await uploadDocumentationPhoto(photo, "pengurus") : null;
  } catch (error) {
    document.querySelector("#boardFormError").textContent = error.message;
    return;
  }
  const payload = {
    position: String(data.get("position") || "Ketua"),
    name: String(data.get("name") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    address: String(data.get("address") || "").trim(),
    photo: uploadedPhoto?.url || existing?.photo || "",
    term: String(data.get("term") || "").trim(),
    active: data.get("active") === "true"
  };
  if (!payload.name || !payload.address || !payload.term) {
    document.querySelector("#boardFormError").textContent = "Nama, alamat, dan masa jabatan wajib diisi.";
    return;
  }
  let targetItem = null;
  if (appState.boardModalMode === "edit") {
    appState.boardMembers = appState.boardMembers.map((member) => {
      if (member.id === appState.selectedBoardId) {
        targetItem = { ...member, ...payload };
        return targetItem;
      }
      return member;
    });
  } else {
    targetItem = { id: Date.now(), ...payload };
    appState.boardMembers = [targetItem, ...appState.boardMembers];
  }
  syncRowToPostgres("pengurus", targetItem);
  closeBoardModal();
}

async function handleBoardDelete() {
  if (!await deleteRowFromPostgres("pengurus", appState.selectedBoardId)) {
    return;
  }
  appState.boardMembers = appState.boardMembers.filter((member) => member.id !== appState.selectedBoardId);
  closeBoardModal();
}

function canAccessSettings(role) {
  return role === "admin";
}

function renderPermissionTable() {
  const rows = [
    ["Lihat dashboard", true, true, true, true],
    ["Kelola donatur", true, true, false, false],
    ["Input pengambilan", true, false, true, false],
    ["Verifikasi setoran", true, true, false, false],
    ["Setoran petugas ke bendahara", true, true, true, true],
    ["Setor ke LAZISNU", true, true, false, true],
    ["Lihat laporan", true, true, false, true],
    ["Kelola penyaluran dana", true, true, false, false],
    ["Kelola petugas", true, false, false, false],
    ["Kelola pengurus", true, false, false, false],
    ["Pengaturan sistem", true, false, false, false]
  ];
  return `
    <div class="table-wrap settings-table">
      <table>
        <thead><tr><th>Hak akses</th><th>Admin</th><th>Bendahara</th><th>Petugas</th><th>Pengurus/Pemantau</th></tr></thead>
        <tbody>${rows.map((row) => `<tr><td>${row[0]}</td>${row.slice(1).map((allowed) => `<td><span class="status-pill ${allowed ? "approved" : "rejected"}">${allowed ? "Ya" : "Tidak"}</span></td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function previewNumber(format) {
  return format.replace("{YYYY}", appState.systemSettings.activeYear).replace("{0001}", "0001");
}

function renderSettings() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }
  if (!canAccessSettings(session.role)) {
    navigate("/dashboard");
    return;
  }

  const settings = appState.systemSettings;
  const canEdit = session.role === "admin";
  renderAppShell(session, "Pengaturan Sistem", `
    <section class="settings-hero">
      <div>
        <p class="eyebrow">Konfigurasi Aplikasi</p>
        <h2>Atur identitas, target, format nomor, laporan, dan tampilan.</h2>
        <p>${canEdit ? "Admin dapat mengubah seluruh pengaturan sistem." : "Mode lihat saja untuk bendahara dan pengurus/pemantau."}</p>
      </div>
      <div class="modal-actions">
        <button class="ghost-button compact" id="togglePasswordForm" type="button">Ubah Password</button>
        ${canEdit ? `<button class="primary-button compact" id="toggleSettingsEdit" type="button">${appState.settingsEditMode ? "Batal Edit" : "Edit Pengaturan"}</button>` : ""}
      </div>
    </section>

    <section class="panel ${appState.passwordEditMode ? "" : "is-hidden"}">
      <h3>Ubah Password</h3>
      <form id="changePasswordForm" class="settings-form">
        <div class="form-grid">
          <label class="field"><span>Password lama</span><input name="currentPassword" type="password" autocomplete="current-password" required /></label>
          <label class="field"><span>Password baru</span><input name="newPassword" type="password" autocomplete="new-password" minlength="8" required /></label>
          <label class="field"><span>Ulangi password baru</span><input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required /></label>
        </div>
        <small class="error" id="changePasswordError"></small>
        <small class="success" id="changePasswordSuccess"></small>
        <div class="modal-actions"><button class="primary-button compact" type="submit">Simpan Password</button></div>
      </form>
    </section>

    ${appState.settingsEditMode && canEdit ? renderSettingsForm(settings) : renderSettingsDetail(settings)}
  `);

  document.querySelector("#toggleSettingsEdit")?.addEventListener("click", () => {
    appState.settingsEditMode = !appState.settingsEditMode;
    renderSettings();
  });
  document.querySelector("#cancelSettingsEdit")?.addEventListener("click", () => {
    appState.settingsEditMode = false;
    renderSettings();
  });
  document.querySelector("#settingsForm")?.addEventListener("submit", handleSettingsSubmit);
  document.querySelector("#togglePasswordForm")?.addEventListener("click", () => {
    appState.passwordEditMode = !appState.passwordEditMode;
    renderSettings();
  });
  document.querySelector("#changePasswordForm")?.addEventListener("submit", handleChangePasswordSubmit);
  ["pickupNumberFormat", "distributionNumberFormat", "activeYear"].forEach((name) => {
    document.querySelector(`[name="${name}"]`)?.addEventListener("input", updateSettingsPreview);
  });
}

function renderSettingsDetail(settings) {
  return `
    <section class="settings-grid">
      ${renderSettingsPanel("Identitas Aplikasi", [
        ["Nama aplikasi", settings.appName],
        ["Slogan", settings.appSlogan],
        ["Nama ranting", settings.branchName],
        ["Logo aplikasi", settings.appLogo],
        ["Warna utama", settings.primaryColor],
        ["Alamat sekretariat", settings.secretariatAddress],
        ["Email", settings.email],
        ["Nomor HP admin", settings.adminPhone]
      ])}
      <article class="settings-panel"><h3>Role dan Hak Akses</h3>${renderPermissionTable()}</article>
      ${renderSettingsPanel("Tahun/Periode & Target Koin", [
        ["Tahun aktif", settings.activeYear],
        ["Periode aktif", settings.activePeriod],
        ["Target pemasukan bulanan", formatRupiah(settings.monthlyCoinTarget)],
        ["Target donatur aktif", settings.activeDonorTarget],
        ["Target penyaluran dana", formatRupiah(settings.distributionTarget)],
        ["Target saldo aman kas", formatRupiah(settings.safeCashTarget)]
      ])}
      ${renderSettingsPanel("Format Nomor Transaksi", [
        ["Format pengambilan", settings.pickupNumberFormat],
        ["Preview pengambilan", previewNumber(settings.pickupNumberFormat)],
        ["Format penyaluran", settings.distributionNumberFormat],
        ["Preview penyaluran", previewNumber(settings.distributionNumberFormat)]
      ])}
      ${renderSettingsPanel("Pengaturan Laporan", [
        ["Penanda tangan ketua", settings.reportChairName],
        ["Penanda tangan bendahara", settings.reportTreasurerName],
        ["Format kop laporan", settings.reportHeaderFormat],
        ["Tampilkan logo NU", settings.showNuLogo ? "Ya" : "Tidak"],
        ["Tampilkan logo ranting", settings.showBranchLogo ? "Ya" : "Tidak"],
        ["Footer laporan", settings.reportFooter]
      ])}
      ${renderSettingsPanel("Pengaturan Tampilan", [
        ["Mode hijau NU", settings.greenMode ? "Aktif" : "Nonaktif"],
        ["Mode terang/gelap", settings.themeMode],
        ["Ukuran font", settings.fontSizeMode],
        ["Mode sederhana petugas", settings.simpleOfficerMode ? "Aktif" : "Nonaktif"]
      ])}
    </section>
  `;
}

function renderSettingsPanel(title, items) {
  return `<article class="settings-panel"><h3>${title}</h3>${items.map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</article>`;
}

function renderSettingsForm(settings) {
  return `
    <form id="settingsForm" class="settings-form">
      <section class="settings-grid">
        <article class="settings-panel"><h3>Identitas Aplikasi</h3><div class="form-grid">
          ${[
            ["appName", "Nama aplikasi"], ["appSlogan", "Slogan aplikasi"], ["branchName", "Nama ranting"], ["appLogo", "Logo aplikasi"], ["primaryColor", "Warna utama"], ["email", "Email"], ["adminPhone", "Nomor HP admin"]
          ].map(([name, label]) => `<label class="field"><span>${label}</span><input name="${name}" value="${escapeHtml(settings[name])}" required /></label>`).join("")}
          <label class="field full"><span>Alamat sekretariat</span><input name="secretariatAddress" value="${escapeHtml(settings.secretariatAddress)}" required /></label>
        </div></article>
        <article class="settings-panel"><h3>Role dan Hak Akses</h3>${renderPermissionTable()}</article>
        <article class="settings-panel"><h3>Tahun/Periode & Target Koin</h3><div class="form-grid">
          <label class="field"><span>Tahun aktif</span><input name="activeYear" value="${escapeHtml(settings.activeYear)}" required /></label>
          <label class="field"><span>Periode aktif</span><input name="activePeriod" value="${escapeHtml(settings.activePeriod)}" required /></label>
          <label class="field"><span>Target pemasukan bulanan</span><input name="monthlyCoinTarget" type="number" value="${settings.monthlyCoinTarget}" /></label>
          <label class="field"><span>Target jumlah donatur aktif</span><input name="activeDonorTarget" type="number" value="${settings.activeDonorTarget}" /></label>
          <label class="field"><span>Target penyaluran dana</span><input name="distributionTarget" type="number" value="${settings.distributionTarget}" /></label>
          <label class="field"><span>Target saldo aman kas</span><input name="safeCashTarget" type="number" value="${settings.safeCashTarget}" /></label>
        </div></article>
        <article class="settings-panel"><h3>Format Nomor Transaksi</h3><div class="form-grid">
          <label class="field"><span>Format pengambilan</span><input name="pickupNumberFormat" value="${escapeHtml(settings.pickupNumberFormat)}" /></label>
          <label class="field"><span>Preview pengambilan</span><input id="pickupNumberPreview" value="${escapeHtml(previewNumber(settings.pickupNumberFormat))}" readonly /></label>
          <label class="field"><span>Format penyaluran</span><input name="distributionNumberFormat" value="${escapeHtml(settings.distributionNumberFormat)}" /></label>
          <label class="field"><span>Preview penyaluran</span><input id="distributionNumberPreview" value="${escapeHtml(previewNumber(settings.distributionNumberFormat))}" readonly /></label>
        </div></article>
        <article class="settings-panel"><h3>Pengaturan Laporan</h3><div class="form-grid">
          <label class="field"><span>Nama penanda tangan ketua</span><input name="reportChairName" value="${escapeHtml(settings.reportChairName)}" /></label>
          <label class="field"><span>Nama penanda tangan bendahara</span><input name="reportTreasurerName" value="${escapeHtml(settings.reportTreasurerName)}" /></label>
          <label class="field full"><span>Format kop laporan</span><input name="reportHeaderFormat" value="${escapeHtml(settings.reportHeaderFormat)}" /></label>
          <label class="field"><span>Tampilkan logo NU</span><select name="showNuLogo"><option value="true" ${settings.showNuLogo ? "selected" : ""}>Ya</option><option value="false" ${!settings.showNuLogo ? "selected" : ""}>Tidak</option></select></label>
          <label class="field"><span>Tampilkan logo ranting</span><select name="showBranchLogo"><option value="true" ${settings.showBranchLogo ? "selected" : ""}>Ya</option><option value="false" ${!settings.showBranchLogo ? "selected" : ""}>Tidak</option></select></label>
          <label class="field full"><span>Footer laporan</span><input name="reportFooter" value="${escapeHtml(settings.reportFooter)}" /></label>
        </div></article>
        <article class="settings-panel"><h3>Pengaturan Tampilan</h3><div class="form-grid">
          <label class="field"><span>Mode hijau NU</span><select name="greenMode"><option value="true" ${settings.greenMode ? "selected" : ""}>Aktif</option><option value="false" ${!settings.greenMode ? "selected" : ""}>Nonaktif</option></select></label>
          <label class="field"><span>Mode terang/gelap</span><select name="themeMode"><option ${settings.themeMode === "Terang" ? "selected" : ""}>Terang</option><option ${settings.themeMode === "Gelap" ? "selected" : ""}>Gelap</option></select></label>
          <label class="field"><span>Ukuran font</span><select name="fontSizeMode"><option ${settings.fontSizeMode === "Normal" ? "selected" : ""}>Normal</option><option ${settings.fontSizeMode === "Besar" ? "selected" : ""}>Besar</option></select></label>
          <label class="field"><span>Mode sederhana petugas</span><select name="simpleOfficerMode"><option value="true" ${settings.simpleOfficerMode ? "selected" : ""}>Aktif</option><option value="false" ${!settings.simpleOfficerMode ? "selected" : ""}>Nonaktif</option></select></label>
        </div></article>
      </section>
      <div class="modal-actions"><button class="ghost-button" id="cancelSettingsEdit" type="button">Batal</button><button class="primary-button compact" type="submit">Simpan Pengaturan</button></div>
    </form>
  `;
}

function updateSettingsPreview() {
  const year = document.querySelector('[name="activeYear"]')?.value || appState.systemSettings.activeYear;
  const pickupFormat = document.querySelector('[name="pickupNumberFormat"]')?.value || "";
  const distributionFormat = document.querySelector('[name="distributionNumberFormat"]')?.value || "";
  const pickupPreview = document.querySelector("#pickupNumberPreview");
  const distributionPreview = document.querySelector("#distributionNumberPreview");
  if (pickupPreview) pickupPreview.value = pickupFormat.replace("{YYYY}", year).replace("{0001}", "0001");
  if (distributionPreview) distributionPreview.value = distributionFormat.replace("{YYYY}", year).replace("{0001}", "0001");
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const numericFields = ["monthlyCoinTarget", "activeDonorTarget", "distributionTarget", "safeCashTarget"];
  Object.keys(appState.systemSettings).forEach((key) => {
    if (numericFields.includes(key)) {
      appState.systemSettings[key] = Number(data.get(key) || 0);
    } else if (["showNuLogo", "showBranchLogo", "greenMode", "simpleOfficerMode"].includes(key)) {
      appState.systemSettings[key] = data.get(key) === "true";
    } else {
      appState.systemSettings[key] = String(data.get(key) || "").trim();
    }
  });
  appState.settingsEditMode = false;
  syncSettingsToPostgres();
  renderSettings();
}

async function handleChangePasswordSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const error = document.querySelector("#changePasswordError");
  const success = document.querySelector("#changePasswordSuccess");
  if (error) error.textContent = "";
  if (success) success.textContent = "";
  const payload = {
    currentPassword: String(data.get("currentPassword") || ""),
    newPassword: String(data.get("newPassword") || ""),
    confirmPassword: String(data.get("confirmPassword") || "")
  };
  const parsed = changePasswordSchema.safeParse(payload);
  if (!parsed.success) { if (error) error.textContent = parsed.error.issues[0]?.message || "Password tidak valid."; return; }
  try {
    await internalRequest("change-password", { method: "POST", body: JSON.stringify({ currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword }) });
    form.reset();
    if (success) success.textContent = "Password berhasil diubah.";
  } catch (err) {
    if (error) error.textContent = err.message || "Password gagal diubah.";
  }
}

function getVisibleUsers() {
  return appState.users.filter((user) => {
    const matchesSearch = user.fullName.toLowerCase().includes(appState.userSearch.toLowerCase()) || user.email.toLowerCase().includes(appState.userSearch.toLowerCase());
    const matchesRole = appState.userRole === "all" || user.role === appState.userRole;
    const matchesStatus = appState.userStatus === "all" || user.status === appState.userStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });
}

function renderUsers() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }
  if (!canManageUsers(session.role)) {
    navigate("/dashboard");
    return;
  }

  const users = getVisibleUsers();
  renderAppShell(session, "Kelola User", `
    <section class="settings-hero">
      <div>
        <p class="eyebrow">database internal</p>
        <h2>Kelola profil user, role, dan status akses.</h2>
        <p>Password tetap dikelola oleh database internal. Halaman ini hanya menyimpan profil dan hak akses aplikasi.</p>
      </div>
      <button class="primary-button compact" id="addUserButton" type="button">Tambah User</button>
    </section>

    <section class="panel officer-panel">
      <div class="officer-toolbar">
        <label class="search-field">
          <span>Cari user</span>
          <input id="userSearch" type="search" value="${escapeHtml(appState.userSearch)}" placeholder="Cari nama atau email" />
        </label>
        <label>
          <span>Role</span>
          <select id="userRole">
            <option value="all">Semua role</option>
            ${roles.map((role) => `<option value="${role}" ${appState.userRole === role ? "selected" : ""}>${labelRole(role)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select id="userStatus">
            <option value="all">Semua status</option>
            <option value="aktif" ${appState.userStatus === "aktif" ? "selected" : ""}>Aktif</option>
            <option value="tidak_aktif" ${appState.userStatus === "tidak_aktif" ? "selected" : ""}>Tidak aktif</option>
          </select>
        </label>
      </div>
      ${renderUserTable(users)}
    </section>
    ${renderUserModal()}
  `);

  bindUserEvents();
}

function renderUserTable(users) {
  return `
    <div class="table-wrap officer-table">
      <table>
        <thead><tr><th>Nama</th><th>Email</th><th>HP</th><th>Role</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead>
        <tbody>
          ${users.map((user) => `
            <tr>
              <td><strong>${escapeHtml(user.fullName)}</strong></td>
              <td>${escapeHtml(user.email)}</td>
              <td>${escapeHtml(user.phone || "-")}</td>
              <td>${labelRole(user.role)}</td>
              <td><span class="status-pill ${user.status === "aktif" ? "approved" : "rejected"}">${user.status === "aktif" ? "Aktif" : "Tidak aktif"}</span></td>
              <td>${formatDateId(String(user.createdAt || "").slice(0, 10))}</td>
              <td class="row-actions">
                <button class="ghost-button small" data-user-action="edit" data-id="${user.id}" type="button">Edit</button>
                <button class="ghost-button small" data-user-action="reset" data-id="${user.id}" type="button">Reset</button>
              </td>
            </tr>
          `).join("") || `<tr><td colspan="7">Belum ada user sesuai filter.</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="officer-card-list">
      ${users.map((user) => `
        <article class="officer-card">
          <div><strong>${escapeHtml(user.fullName)}</strong><span>${escapeHtml(user.email)}</span></div>
          <p>${escapeHtml(user.phone || "-")} - ${labelRole(user.role)}</p>
          <div class="card-meta"><span>${user.status === "aktif" ? "Aktif" : "Tidak aktif"}</span><span>${formatDateId(String(user.createdAt || "").slice(0, 10))}</span></div>
          <div class="card-actions">
            <button class="ghost-button small" data-user-action="edit" data-id="${user.id}" type="button">Edit</button>
            <button class="ghost-button small" data-user-action="reset" data-id="${user.id}" type="button">Reset Password</button>
          </div>
        </article>
      `).join("") || `<article class="officer-card"><strong>Belum ada user</strong><span>Ubah filter atau tambah user baru.</span></article>`}
    </div>
  `;
}

function renderUserModal() {
  const mode = appState.userModalMode;
  if (!mode) {
    return "";
  }
  const user = appState.users.find((item) => item.id === appState.selectedUserId);
  const values = user || { id: "", fullName: "", email: "", phone: "", role: "petugas", status: "aktif" };
  const title = mode === "add" ? "Tambah User" : "Edit User";
  return `
    <div class="modal-backdrop">
      <form class="donor-form-modal" id="userForm">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">Kelola User</p>
            <h2>${title}</h2>
            <p>Kelola profil user internal. Password awal dibuat server jika belum diisi.</p>
          </div>
          <button class="icon-button" data-close-user-modal type="button" aria-label="Tutup">x</button>
        </div>
        <div class="form-grid">
          <label class="field full">
            <span>User ID</span>
            <input name="id" value="${escapeHtml(values.id)}" ${mode === "edit" ? "readonly" : ""} placeholder="UUID user dari database internal" required />
          </label>
          <label class="field"><span>Nama lengkap</span><input name="fullName" value="${escapeHtml(values.fullName)}" required /></label>
          <label class="field"><span>Email</span><input name="email" type="email" value="${escapeHtml(values.email)}" required /></label>
          <label class="field"><span>Nomor HP</span><input name="phone" value="${escapeHtml(values.phone || "")}" /></label>
          <label class="field"><span>Role</span><select name="role">${roles.map((role) => `<option value="${role}" ${values.role === role ? "selected" : ""}>${labelRole(role)}</option>`).join("")}</select></label>
          <label class="field"><span>Status</span><select name="status"><option value="aktif" ${values.status === "aktif" ? "selected" : ""}>Aktif</option><option value="tidak_aktif" ${values.status === "tidak_aktif" ? "selected" : ""}>Tidak aktif</option></select></label>
        </div>
        <p class="form-error" id="userFormError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" data-close-user-modal type="button">Batal</button>
          <button class="primary-button compact" type="submit">Simpan User</button>
        </div>
      </form>
    </div>
  `;
}

function bindUserEvents() {
  document.querySelector("#addUserButton")?.addEventListener("click", () => openUserModal("add"));
  document.querySelector("#userSearch")?.addEventListener("input", debounce((event) => {
    appState.userSearch = event.target.value;
    renderUsers();
  }, 250));
  document.querySelector("#userRole")?.addEventListener("change", (event) => {
    appState.userRole = event.target.value;
    renderUsers();
  });
  document.querySelector("#userStatus")?.addEventListener("change", (event) => {
    appState.userStatus = event.target.value;
    renderUsers();
  });
  document.querySelectorAll("[data-user-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.userAction;
      const id = button.dataset.id;
      if (action === "edit") {
        openUserModal("edit", id);
      }
      if (action === "reset") {
        handleUserReset(id);
      }
    });
  });
  document.querySelectorAll("[data-close-user-modal]").forEach((button) => button.addEventListener("click", closeUserModal));
  document.querySelector("#userForm")?.addEventListener("submit", handleUserSubmit);
}

function openUserModal(mode, id = null) {
  appState.userModalMode = mode;
  appState.selectedUserId = id;
  renderUsers();
}

function closeUserModal() {
  appState.userModalMode = null;
  appState.selectedUserId = null;
  renderUsers();
}

function handleUserSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const payload = {
    id: String(data.get("id") || "").trim(),
    fullName: String(data.get("fullName") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    role: String(data.get("role") || "petugas"),
    status: String(data.get("status") || "aktif"),
    createdAt: new Date().toISOString()
  };

  if (!payload.id || !payload.fullName || !payload.email) {
    document.querySelector("#userFormError").textContent = "User ID, nama, dan email wajib diisi.";
    return;
  }

  const duplicate = appState.users.some((user) => user.id !== appState.selectedUserId && (user.id === payload.id || user.email === payload.email));
  if (duplicate) {
    document.querySelector("#userFormError").textContent = "User ID atau email sudah dipakai.";
    return;
  }

  let targetUser = null;
  if (appState.userModalMode === "edit") {
    appState.users = appState.users.map((user) => {
      if (user.id === appState.selectedUserId) {
        targetUser = { ...user, ...payload, createdAt: user.createdAt };
        return targetUser;
      }
      return user;
    });
  } else {
    targetUser = payload;
    appState.users = [targetUser, ...appState.users];
  }
  syncRowToPostgres("profiles", targetUser);
  closeUserModal();
}

async function handleUserReset(id) {
  const user = appState.users.find((item) => item.id === id);
  if (!user) {
    return;
  }
  if (!hasPostgresConfig()) {
    alert(`Reset password internal belum tersedia untuk ${user.email}.`);
    return;
  }
  try {
    await postgresAuthRequest("recover", {
      method: "POST",
      body: JSON.stringify({ email: user.email })
    });
    alert(`Instruksi reset password dikirim ke ${user.email} jika email terdaftar.`);
  } catch {
    alert("Reset password belum berhasil. Cek konfigurasi email database internal.");
  }
}

function getPublicMonth() {
  return getLocalDateString().slice(0, 7);
}

function getPublicApprovedIncome() {
  const month = getPublicMonth();
  return appState.pickups
    .filter((pickup) => pickup.status === "Disetujui Bendahara" && pickup.date.startsWith(month))
    .reduce((sum, pickup) => sum + pickup.amount, 0);
}

function getPublicDistributionTotal() {
  const month = getPublicMonth();
  return appState.distributions
    .filter((item) => item.status === "Disalurkan" && item.date.startsWith(month))
    .reduce((sum, item) => sum + item.amount, 0);
}

function getPublicMonthlySeries(type) {
  const labels = ["Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des", "Jan", "Feb", "Mar", "Apr", "Mei"];
  const baseIncome = [8200000, 9100000, 9700000, 10400000, 11200000, 12100000, 12900000, 13600000, 14500000, 15700000, 16900000, 18450000];
  const baseDistribution = [4200000, 4800000, 5100000, 5300000, 5700000, 6200000, 6900000, 7100000, 7600000, 8100000, 8600000, getPublicDistributionTotal()];
  baseIncome[baseIncome.length - 1] = getPublicApprovedIncome();
  return labels.map((label, index) => ({
    label,
    amount: type === "income" ? baseIncome[index] : baseDistribution[index]
  }));
}

function renderPublicChart(title, items) {
  const max = Math.max(...items.map((item) => item.amount), 1);
  return `
    <article class="public-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Grafik</p>
          <h2>${title}</h2>
        </div>
      </div>
      <div class="public-chart">
        ${items.map((item) => `
          <div class="public-chart-col">
            <div><span style="height:${Math.max(8, Math.round((item.amount / max) * 100))}%"></span></div>
            <strong>${item.label}</strong>
            <small>${formatCompactRupiah(item.amount)}</small>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function renderPublicPrograms() {
  const categories = [
    { name: "Santunan Yatim", target: 10000000 },
    { name: "Bantuan Dhuafa", target: 15000000 },
    { name: "Pendidikan", target: 8000000 },
    { name: "Kesehatan", target: 6000000 },
    { name: "Bencana", target: 5000000 },
    { name: "Kegiatan Keagamaan", target: 12000000 }
  ];
  return categories.map((cat) => {
    const items = appState.distributions.filter((item) => item.status === "Disalurkan" && item.category === cat.name);
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const percentage = Math.min(100, Math.round((totalAmount / cat.target) * 100));
    return `
      <article class="program-card">
        <strong>${cat.name}</strong>
        <span>${new Set(items.map((item) => item.recipientName)).size} penerima manfaat</span>
        <div class="program-progress-container">
          <div class="program-progress-bar">
            <div class="program-progress-fill" style="width: ${percentage}%;"></div>
          </div>
          <div class="program-progress-labels">
            <span>Tersalur: ${formatRupiah(totalAmount)}</span>
            <span>${percentage}% dari target</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderPublicActivities() {
  const pickupActivities = appState.pickups
    .filter((pickup) => pickup.status === "Disetujui Bendahara")
    .map((pickup) => ({
      date: pickup.date,
      type: "Pengambilan Koin",
      title: `Pengambilan dari donatur wilayah RT/RW`,
      amount: pickup.amount
    }));
  const distributionActivities = appState.distributions
    .filter((item) => item.status === "Disalurkan")
    .map((item) => ({
      date: item.date,
      type: "Penyaluran Bantuan",
      title: item.category,
      amount: item.amount
    }));
  const socialActivities = [
    { date: "2026-05-26", type: "Kegiatan Sosial", title: "Bakti sosial dan pendataan penerima manfaat", amount: 0 },
    { date: "2026-05-19", type: "Kegiatan Sosial", title: "Pengajian ranting dan sosialisasi Koin NU", amount: 0 }
  ];
  return [...pickupActivities, ...distributionActivities, ...socialActivities]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .map((activity) => `
      <article class="public-activity">
        <div>
          <strong>${escapeHtml(activity.type)}</strong>
          <span>${formatDateId(activity.date)} - ${escapeHtml(activity.title)}</span>
        </div>
        <small>${activity.amount ? formatRupiah(activity.amount) : "Kegiatan"}</small>
      </article>
    `).join("");
}

function renderPublicGallery() {
  return appState.publicDocumentation.map((item) => `
    <article class="gallery-card">
      <img src="${escapeHtml(item.photoUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" />
      <strong>${escapeHtml(item.category)}</strong>
      <span>${escapeHtml(item.title)} - ${formatDateId(item.date)}</span>
    </article>
  `).join("");
}

// Jadwal Shalat Widget Logic
let cachedPrayerTimes = null;
let cachedPrayerDate = "";

async function fetchPrayerTimes() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  if (cachedPrayerTimes && cachedPrayerDate === dateStr) {
    return cachedPrayerTimes;
  }

  const fallback = {
    imsak: "04:19",
    subuh: "04:29",
    dzuhur: "11:45",
    ashar: "15:05",
    maghrib: "17:36",
    isya: "18:50",
    lokasi: "KAB. BANYUMAS",
    tanggal: `${day}/${month}/${year}`
  };

  try {
    const response = await fetch(`https://api.myquran.com/v2/sholat/jadwal/1402/${year}/${month}/${day}`);
    if (!response.ok) throw new Error("API response error");
    const json = await response.json();
    if (json && json.status && json.data && json.data.jadwal) {
      const j = json.data.jadwal;
      cachedPrayerTimes = {
        imsak: j.imsak,
        subuh: j.subuh,
        dzuhur: j.dzuhur,
        ashar: j.ashar,
        maghrib: j.maghrib,
        isya: j.isya,
        lokasi: json.data.lokasi || "KAB. BANYUMAS",
        tanggal: j.tanggal
      };
      cachedPrayerDate = dateStr;
      return cachedPrayerTimes;
    }
  } catch (error) {
    console.warn("Gagal mengambil jadwal shalat dari API, menggunakan fallback:", error);
  }

  return fallback;
}

function getActivePrayerIndex(schedule) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const prayers = [
    { name: "Imsak", time: parseTime(schedule.imsak) },
    { name: "Subuh", time: parseTime(schedule.subuh) },
    { name: "Dzuhur", time: parseTime(schedule.dzuhur) },
    { name: "Ashar", time: parseTime(schedule.ashar) },
    { name: "Maghrib", time: parseTime(schedule.maghrib) },
    { name: "Isya", time: parseTime(schedule.isya) }
  ];

  for (let i = 0; i < prayers.length; i++) {
    if (prayers[i].time > currentMinutes) {
      return i;
    }
  }
  return -1;
}

async function updatePrayerWidget(containerId) {
  const container = document.querySelector(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="prayer-widget-loading" style="padding: 1rem; text-align: center; color: rgba(255,255,255,0.7); font-size: 0.85rem;">
      Memuat Jadwal Shalat...
    </div>
  `;

  const schedule = await fetchPrayerTimes();
  const activeIdx = getActivePrayerIndex(schedule);

  const prayerList = [
    { label: "Imsak", time: schedule.imsak },
    { label: "Subuh", time: schedule.subuh },
    { label: "Dzuhur", time: schedule.dzuhur },
    { label: "Ashar", time: schedule.ashar },
    { label: "Maghrib", time: schedule.maghrib },
    { label: "Isya", time: schedule.isya }
  ];

  container.innerHTML = `
    <div class="prayer-widget-card">
      <div class="prayer-widget-header">
        <div>
          <h4>Jadwal Shalat</h4>
          <small>${escapeHtml(schedule.lokasi)} · ${escapeHtml(schedule.tanggal)}</small>
        </div>
        <span class="prayer-live-dot">Banyumas</span>
      </div>
      <div class="prayer-grid">
        ${prayerList.map((p, idx) => {
          const isNext = idx === activeIdx;
          return `
            <div class="prayer-item ${isNext ? "next-prayer" : ""}">
              <span class="prayer-name">${p.label}</span>
              <span class="prayer-time">${p.time}</span>
              ${isNext ? '<span class="prayer-badge">Selanjutnya</span>' : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderPublicDashboard() {
  const session = getSession();
  const canUploadDocumentation = canManagePublicContent(session?.role);
  const profile = appState.branchProfile;
  const activeDonors = appState.donors.filter((donor) => donor.active).length;
  const income = getPublicApprovedIncome();
  const distribution = getPublicDistributionTotal();
  const beneficiaries = new Set(appState.distributions.filter((item) => item.status === "Disalurkan").map((item) => item.recipientName)).size;
  const chair = appState.boardMembers.find((member) => member.position === "Ketua");
  const secretary = appState.boardMembers.find((member) => member.position === "Sekretaris");
  const treasurer = appState.boardMembers.find((member) => member.position === "Bendahara");

  document.title = `${brand.name} | Transparansi ${profile.branchName}`;
  app.innerHTML = `
    <section class="public-shell">
      <header class="public-header">
        <div class="public-brand">
          ${renderLazisnuLogo("public-logo")}
          <div>
            <strong>${brand.name}</strong>
            <span>${brand.subtitle}</span>
          </div>
        </div>
        <nav>
          <a href="#ringkasan">Ringkasan</a>
          <a href="#peta-sebaran-container">Peta Sebaran</a>
          <a href="#program">Program</a>
          <a href="#profil">Profil</a>
        </nav>
      </header>

      <section class="public-hero">
        <div class="public-hero-content">
          <p class="eyebrow">Transparansi Publik</p>
          <h1>${brand.name}: koin warga dikelola terbuka untuk maslahat bersama.</h1>
          <strong class="public-tagline">${brand.tagline}</strong>
          <p>Ringkasan ini menampilkan data agregat tanpa nomor HP donatur, alamat detail, atau data pribadi sensitif.</p>
          <div class="public-actions">
            <button class="ghost-button" id="printPublicButton" type="button">Cetak Ringkasan</button>
            <button class="primary-button compact" id="downloadPublicPdfButton" type="button">Simpan sebagai PDF</button>
          </div>
        </div>
        <div class="public-hero-widget">
          <div id="public-prayer-container" style="width: 100%;"></div>
        </div>
      </section>

      <section class="public-summary" id="ringkasan">
        <article><span>Donatur aktif</span><strong>${activeDonors}</strong></article>
        <article><span>Pemasukan bulan berjalan</span><strong>${formatRupiah(income)}</strong></article>
        <article><span>Penyaluran bulan berjalan</span><strong>${formatRupiah(distribution)}</strong></article>
        <article><span>Saldo saat ini</span><strong>${formatRupiah(income - distribution)}</strong></article>
        <article><span>Penerima manfaat</span><strong>${beneficiaries}</strong></article>
      </section>

      <section class="public-chart-grid">
        ${renderPublicChart("Pemasukan 12 Bulan Terakhir", getPublicMonthlySeries("income"))}
        ${renderPublicChart("Penyaluran 12 Bulan Terakhir", getPublicMonthlySeries("distribution"))}
      </section>

      <!-- Peta Sebaran Maslahat -->
      <section class="public-section" id="peta-sebaran-container">
        <div class="public-section-heading">
          <p class="eyebrow">Peta Maslahat</p>
          <h2>Sebaran Penyaluran Dana Sosial</h2>
        </div>
        <div class="public-panel map-panel" style="padding: 1rem;">
          <div id="distribution-map" style="height: 400px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); z-index: 1; border: 1px solid var(--border-light);"></div>
          <div class="map-legend" style="display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; font-size: 0.85rem; color: #555;">
            <span style="display: inline-flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; background: #10b981; width: 12px; height: 12px; border-radius: 50%;"></span> Sudah Disalurkan</span>
            <span style="display: inline-flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; background: #d97706; width: 12px; height: 12px; border-radius: 50%;"></span> Rencana Penyaluran (Draft)</span>
          </div>
        </div>
      </section>

      <section class="public-section" id="program">
        <div class="public-section-heading">
          <p class="eyebrow">Program Bantuan</p>
          <h2>Dana tersalur per program</h2>
        </div>
        <div class="program-grid">${renderPublicPrograms()}</div>
      </section>

      <section class="public-grid-two">
        <article class="public-panel">
          <div class="public-section-heading">
            <p class="eyebrow">Aktivitas</p>
            <h2>10 aktivitas terbaru</h2>
          </div>
          <div class="public-activity-list">${renderPublicActivities()}</div>
        </article>
        <article class="public-panel">
          <div class="public-section-heading">
            <p class="eyebrow">Dokumentasi</p>
            <h2>Galeri kegiatan</h2>
          </div>
          <div class="gallery-grid">${renderPublicGallery()}</div>
          ${canUploadDocumentation ? `
            <form class="public-upload-form" id="publicDocumentationForm">
               <h3>Tambah Dokumentasi Publik</h3>
               <div class="form-grid">
                 <label class="field"><span>Judul kegiatan</span><input name="title" required /></label>
                 <label class="field"><span>Kategori</span><select name="category"><option>Santunan</option><option>Pengajian</option><option>Bakti Sosial</option><option>Kegiatan Ranting</option></select></label>
                 <label class="field"><span>Tanggal</span><input name="date" type="date" value="${getLocalDateString()}" required /></label>
                 <label class="field"><span>Foto kegiatan</span><input name="photo" id="publicDocumentationPhoto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" required /></label>
               </div>
               <div id="publicDocumentationPreview">${renderPhotoPreview("", "Preview dokumentasi kegiatan")}</div>
               <p class="form-error" id="publicDocumentationError" role="alert"></p>
               <button class="primary-button compact" type="submit">Upload Foto</button>
            </form>
          ` : ""}
        </article>
      </section>

      <section class="public-profile" id="profil">
        <div>
          <p class="eyebrow">Profil Ranting</p>
          <h2>${escapeHtml(profile.branchName)}</h2>
          <p>${escapeHtml(profile.secretariatAddress)}</p>
        </div>
        <div class="public-profile-list">
          <span>Ketua: ${escapeHtml(chair?.name || "-")}</span>
          <span>Sekretaris: ${escapeHtml(secretary?.name || "-")}</span>
          <span>Bendahara: ${escapeHtml(treasurer?.name || "-")}</span>
          <span>Kontak resmi: ${escapeHtml(profile.phone)} / ${escapeHtml(profile.email)}</span>
        </div>
      </section>
      ${renderBrandFooter("public-footer")}
    </section>
  `;

  document.querySelector("#printPublicButton")?.addEventListener("click", () => window.print());
  document.querySelector("#downloadPublicPdfButton")?.addEventListener("click", () => window.print());
  document.querySelector("#publicDocumentationForm")?.addEventListener("submit", handlePublicDocumentationSubmit);
  bindImagePreview("#publicDocumentationPhoto", "#publicDocumentationPreview", "#publicDocumentationError");
  updatePrayerWidget("#public-prayer-container");

  loadLeaflet(() => {
    initializeDistributionMap();
  });
}

function initializeDistributionMap() {
  const mapEl = document.getElementById("distribution-map");
  if (!mapEl) return;

  const centerLat = -7.3770;
  const centerLng = 109.2205;

  const map = window.L.map("distribution-map").setView([centerLat, centerLng], 15);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const items = appState.distributions.filter((item) => item.status === "Disalurkan" || item.status === "Draft");

  if (items.length === 0) {
    window.L.marker([centerLat, centerLng])
      .addTo(map)
      .bindPopup("<b>Sekretariat PRNU Karangsalam Kidul II</b><br>Belum ada data penyaluran bantuan terdaftar.")
      .openPopup();
    return;
  }

  items.forEach((item) => {
    const rt = Number(item.rt) || 1;
    const rw = Number(item.rw) || 1;

    // Jitter coordinates based on RT, RW and item.id
    const seed = (rt * 7) + (rw * 13) + (item.id % 17);
    const angle = (seed * 22.5) * (Math.PI / 180);
    const radius = 0.0012 + ((item.id % 5) * 0.0004);

    const lat = centerLat + (Math.sin(angle) * radius * 0.4);
    const lng = centerLng + (Math.cos(angle) * radius);

    const markerColor = item.status === "Disalurkan" ? "#10b981" : "#d97706";

    const customIcon = window.L.divIcon({
      className: "custom-map-pin",
      html: `<div style="background-color: ${markerColor}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const popupContent = `
      <div class="map-popup-card" style="min-width: 180px;">
        <h4 style="margin:0 0 4px; color:#15803d; font-size: 0.9rem; font-weight: bold;">${escapeHtml(item.category)}</h4>
        <div style="font-size:0.7rem; color:#666; margin-bottom:6px;">No: ${escapeHtml(item.distributionNo)}</div>
        <table style="width:100%; border-collapse:collapse; font-size:0.75rem; text-align:left;">
          <tr>
            <th style="padding:2px 0; color:#888; font-weight:normal; width:45%;">Penerima</th>
            <td style="padding:2px 0; font-weight:bold;">${escapeHtml(item.recipientName)}</td>
          </tr>
          <tr>
            <th style="padding:2px 0; color:#888; font-weight:normal;">Wilayah</th>
            <td style="padding:2px 0;">RT ${escapeHtml(item.rt)} / RW ${escapeHtml(item.rw)}</td>
          </tr>
          <tr>
            <th style="padding:2px 0; color:#888; font-weight:normal;">Nominal</th>
            <td style="padding:2px 0; font-weight:bold; color:#15803d;">${formatRupiah(item.amount)}</td>
          </tr>
          <tr>
            <th style="padding:2px 0; color:#888; font-weight:normal;">Tanggal</th>
            <td style="padding:2px 0;">${formatDateId(item.date)}</td>
          </tr>
        </table>
        ${item.note ? `<p style="margin:6px 0 0; font-size:0.7rem; color:#555; border-top:1px dashed #eee; padding-top:4px; font-style:italic;">"${escapeHtml(item.note)}"</p>` : ""}
      </div>
    `;

    window.L.marker([lat, lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(popupContent);
  });
}

async function handlePublicDocumentationSubmit(event) {
  event.preventDefault();
  const session = getSession();
  if (!canManagePublicContent(session?.role)) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const photo = form.elements.photo?.files?.[0];
  const error = document.querySelector("#publicDocumentationError");
  if (!photo) {
    error.textContent = "Pilih foto kegiatan terlebih dahulu.";
    return;
  }
  const photoError = validateImageFile(photo);
  if (photoError) {
    error.textContent = photoError;
    return;
  }
  let uploadedPhoto;
  try {
    uploadedPhoto = await uploadDocumentationPhoto(photo, "kegiatan-publik");
  } catch (uploadError) {
    error.textContent = uploadError.message;
    return;
  }
  const targetItem = {
    id: Date.now(),
    title: String(data.get("title") || "").trim(),
    category: String(data.get("category") || "Kegiatan Ranting"),
    date: String(data.get("date") || getLocalDateString()),
    photoPath: uploadedPhoto.path || "",
    photoName: uploadedPhoto.name,
    photoUrl: uploadedPhoto.url
  };
  appState.publicDocumentation = [targetItem, ...appState.publicDocumentation];
  syncRowToPostgres("dokumentasi_kegiatan", targetItem);
  renderPublicDashboard();
}

function getPublishedNews() {
  return appState.news.filter((item) => item.status === "published").sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function renderNewsCards(items, admin = false) {
  return items.map((item) => `
    <article class="gallery-card news-card">
      ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" />` : ""}
      <strong>${escapeHtml(item.category)} · ${formatDateId(item.date)}</strong>
      <h3>${escapeHtml(item.title)}</h3>
      <span>${escapeHtml(item.excerpt || item.content.slice(0, 140))}</span>
      ${admin ? `<small>Status: ${escapeHtml(item.status)}</small>` : ""}
      ${admin ? `<div class="card-actions"><button class="ghost-button" data-edit-news="${item.id}" type="button">Edit</button><button class="danger-button" data-delete-news="${item.id}" type="button">Hapus</button></div>` : ""}
    </article>
  `).join("") || `<div class="photo-empty">Belum ada berita.</div>`;
}

function renderNewsAdmin() {
  const session = getSession();
  if (!session?.role) return navigate("/login");
  const canManage = canManagePublicContent(session.role);
  const editing = appState.news.find((item) => String(item.id) === String(appState.selectedNewsId));
  renderAppShell(session, "Berita", `
    <section class="public-panel">
      <div class="panel-heading"><div><p class="eyebrow">Publikasi</p><h2>Kelola berita landing page</h2></div>${canManage ? `<button class="primary-button compact" id="addNewsButton" type="button">Tambah Berita</button>` : ""}</div>
      <div class="gallery-grid">${renderNewsCards(appState.news.sort((a, b) => String(b.date).localeCompare(String(a.date))), canManage)}</div>
    </section>
    ${canManage && appState.newsModalOpen ? `
      <section class="public-panel">
        <div class="panel-heading"><div><p class="eyebrow">Form Berita</p><h2>${editing ? "Edit" : "Tambah"} Berita</h2></div></div>
        <form class="public-upload-form" id="newsForm">
          <div class="form-grid">
            <label class="field"><span>Judul</span><input name="title" value="${escapeHtml(editing?.title || "")}" required /></label>
            <label class="field"><span>Kategori</span><input name="category" value="${escapeHtml(editing?.category || "Kegiatan Ranting")}" required /></label>
            <label class="field"><span>Tanggal</span><input name="date" type="date" value="${escapeHtml(editing?.date || getLocalDateString())}" required /></label>
            <label class="field"><span>Status</span><select name="status"><option value="published" ${editing?.status !== "draft" ? "selected" : ""}>published</option><option value="draft" ${editing?.status === "draft" ? "selected" : ""}>draft</option></select></label>
            <label class="field"><span>Gambar</span><input name="image" id="newsImage" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" /></label>
          </div>
          <label class="field"><span>Ringkasan</span><textarea name="excerpt" required>${escapeHtml(editing?.excerpt || "")}</textarea></label>
          <label class="field"><span>Konten</span><textarea name="content" required>${escapeHtml(editing?.content || "")}</textarea></label>
          <div id="newsImagePreview">${renderPhotoPreview(editing?.imageUrl || "", editing?.title || "Preview gambar berita")}</div>
          <p class="form-error" id="newsFormError" role="alert"></p>
          <button class="primary-button compact" type="submit">Simpan Berita</button>
          <button class="ghost-button" id="cancelNewsButton" type="button">Batal</button>
        </form>
      </section>` : ""}
  `);
  document.querySelector("#addNewsButton")?.addEventListener("click", () => { appState.selectedNewsId = null; appState.newsModalOpen = true; renderNewsAdmin(); });
  document.querySelector("#cancelNewsButton")?.addEventListener("click", () => { appState.newsModalOpen = false; appState.selectedNewsId = null; renderNewsAdmin(); });
  document.querySelectorAll("[data-edit-news]").forEach((button) => button.addEventListener("click", () => { if (!canManagePublicContent(session.role)) return; appState.selectedNewsId = button.dataset.editNews; appState.newsModalOpen = true; renderNewsAdmin(); }));
  document.querySelectorAll("[data-delete-news]").forEach((button) => button.addEventListener("click", async () => { if (!canManagePublicContent(session.role)) return; if (!confirm("Hapus berita ini?")) return; if (!await deleteRowFromPostgres("berita", button.dataset.deleteNews)) return; appState.news = appState.news.filter((item) => String(item.id) !== String(button.dataset.deleteNews)); renderNewsAdmin(); }));
  document.querySelector("#newsForm")?.addEventListener("submit", handleNewsSubmit);
  bindImagePreview("#newsImage", "#newsImagePreview", "#newsFormError");
}

async function handleNewsSubmit(event) {
  event.preventDefault();
  const session = getSession();
  if (!canManagePublicContent(session?.role)) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const existing = appState.news.find((item) => String(item.id) === String(appState.selectedNewsId));
  const image = form.elements.image?.files?.[0];
  let uploaded = null;
  try { uploaded = image ? await uploadDocumentationPhoto(image, "berita") : null; } catch (error) { document.querySelector("#newsFormError").textContent = error.message; return; }
  const item = {
    id: existing?.id || Date.now(),
    title: String(data.get("title") || "").trim(),
    category: String(data.get("category") || "Kegiatan Ranting").trim(),
    date: String(data.get("date") || getLocalDateString()),
    excerpt: String(data.get("excerpt") || "").trim(),
    content: String(data.get("content") || "").trim(),
    imagePath: uploaded?.path || existing?.imagePath || "",
    imageName: uploaded?.name || existing?.imageName || "",
    imageUrl: uploaded?.url || existing?.imageUrl || "",
    status: String(data.get("status") || "draft")
  };
  if (!item.title || !item.excerpt || !item.content) { document.querySelector("#newsFormError").textContent = "Judul, ringkasan, dan konten wajib diisi."; return; }
  appState.news = [item, ...appState.news.filter((news) => String(news.id) !== String(item.id))];
  await syncRowToPostgres("berita", item);
  appState.newsModalOpen = false;
  appState.selectedNewsId = null;
  renderNewsAdmin();
}

function renderPlaceholder(title) {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }

  renderAppShell(session, title, `
    <section class="placeholder-panel">
      <p class="eyebrow">Tahap berikutnya</p>
      <h2>${title}</h2>
      <p>Menu sudah disiapkan agar navigasi sidebar rapi. Modul ini bisa dilanjutkan setelah Data Donatur selesai.</p>
    </section>
  `);
}

function renderLandingPage() {
  const totalIncome = getPublicApprovedIncome();
  const totalTarget = 50000000;
  const totalPercentage = Math.min(100, Math.round((totalIncome / totalTarget) * 100));

  const programs = [
    ["Aswaja", "Merawat amaliyah Aswaja An-Nahdliyah dalam kehidupan berjamaah.", `<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`],
    ["Dakwah", "Menguatkan majelis ilmu, pengajian, dan syiar Islam rahmatan lil alamin.", `<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`],
    ["Sosial", "Hadir bersama warga melalui kepedulian dan gotong royong.", `<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></svg>`],
    ["Ekonomi Umat", "Mendorong kemandirian warga dan penguatan usaha lokal.", `<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`],
    ["Digitalisasi", "Merapikan layanan, informasi, dan transparansi organisasi.", `<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="12" y1="2" x2="12" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg>`]
  ];
  const institutions = [
    {
      name: "Muslimat NU",
      tagline: "Ibu Umat, Penggerak Keluarga Nahdliyin",
      desc: "Wadah berhimpun perempuan NU dewasa yang bergerak di bidang sosial keagamaan, kesehatan ibu & anak, pendidikan PAUD/TPQ, majelis taklim, dan penguatan ekonomi keluarga.",
      basis: "Perempuan NU (dewasa)",
      color: "#c7522a",
      tags: ["Majelis Taklim", "Posyandu", "Santunan", "Koperasi"],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
    },
    {
      name: "Fatayat NU",
      tagline: "Perempuan Muda, Agen Perubahan Umat",
      desc: "Organisasi perempuan muda NU (maks. 40 tahun) yang fokus pada kaderisasi, isu keperempuanan, pencegahan stunting, pemberdayaan ekonomi kreatif, dan kepemimpinan perempuan.",
      basis: "Perempuan muda NU (≤40 tahun)",
      color: "#e07b39",
      tags: ["Stunting", "Pelatihan UMKM", "Kepemimpinan", "Literasi"],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-9 3-9 4v1h18v-1c0-1-3-4-9-4z"/></svg>`
    },
    {
      name: "GP Ansor",
      tagline: "Pemuda Tangguh, Penjaga Tradisi & NKRI",
      desc: "Gerakan kepemudaan NU (maks. 40 tahun) yang membina kader berjiwa pemimpin, menjaga Aswaja, dan aktif dalam bakti sosial. Memiliki sayap Banser untuk keamanan dan kemanusiaan.",
      basis: "Pemuda laki-laki NU (≤40 tahun)",
      color: "#2d6a4f",
      tags: ["Banser", "Bakti Sosial", "Pengamanan", "Kaderisasi"],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
    },
    {
      name: "IPNU",
      tagline: "Pelajar & Santri, Generasi Penerus NU",
      desc: "Ikatan Pelajar NU untuk pelajar & santri laki-laki (maks. 27 tahun). Fokus pada kaderisasi pelajar, kajian keislaman, literasi, dan pengembangan potensi generasi muda NU.",
      basis: "Pelajar & santri laki-laki (≤27 tahun)",
      color: "#1a6b9a",
      tags: ["Kajian Kitab", "CBP", "Literasi Digital", "Rutinan"],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
    },
    {
      name: "IPPNU",
      tagline: "Pelajar Putri Cerdas, Berkarakter Aswaja",
      desc: "Ikatan Pelajar Putri NU untuk pelajar & santri perempuan (maks. 27 tahun). Memperkuat ukhuwah, kaderisasi putri, nilai ke-NU-an, dan pengembangan potensi diri generasi muda.",
      basis: "Pelajar & santri perempuan (≤27 tahun)",
      color: "#7b3f7e",
      tags: ["KPP", "Rutinan Yasin", "Ukhuwah", "Kajian"],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/><path d="M12 14c-5 0-9 2.5-9 4v2h18v-2c0-1.5-4-4-9-4z"/></svg>`
    },
    {
      name: "Pagar Nusa",
      tagline: "Benteng Budaya, Seni Bela Diri Nahdliyin",
      desc: "Badan otonom yang melestarikan dan mengembangkan seni beladiri pencak silat khas NU. Berperan dalam pelestarian budaya bangsa dan pembinaan karakter melalui olahraga tradisional.",
      basis: "Penggiat pencak silat & budaya NU",
      color: "#5a3e1b",
      tags: ["Pencak Silat", "Budaya", "Kejuaraan", "Pelatihan"],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
    },
    {
      name: "JATMAN",
      tagline: "Wadah Pengamal Tarekat Mu'tabar NU",
      desc: "Jam'iyyah Ahli Thariqah al-Mu'tabarah an-Nahdliyyah — menghimpun para pengamal dan pengajar tarikat yang mu'tabar (diakui sanadnya) dalam naungan Ahlussunnah wal Jama'ah.",
      basis: "Pengamal & guru tarikat mu'tabar",
      color: "#4a5568",
      tags: ["Tarikat", "Dzikir", "Sanad Ilmu", "Istighotsah"],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`
    },
    {
      name: "JQH NU",
      tagline: "Penjaga Al-Qur'an, Pelestari Tilawah",
      desc: "Jam'iyyatul Qurra wal Huffazh — wadah para qari'/qari'ah dan hafizh/hafizhah Al-Qur'an NU. Aktif dalam MTQ, pembinaan tilawah, dan kaderisasi penghafal Qur'an di pesantren.",
      basis: "Qari', qari'ah, hafizh, hafizhah",
      color: "#2c6e49",
      tags: ["Tilawah", "Tahfizh", "MTQ", "Pembinaan"],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`
    },
    {
      name: "Pergunu",
      tagline: "Guru NU: Mendidik, Mengabdi, Menginspirasi",
      desc: "Persatuan Guru Nahdlatul Ulama — menghimpun para pendidik dan tenaga pengajar di lingkungan NU. Fokus pada peningkatan kualitas pendidikan Islam dan kesejahteraan guru.",
      basis: "Guru & pendidik di lingkungan NU",
      color: "#1d4e89",
      tags: ["Pendidikan", "Pelatihan Guru", "Ma'arif", "Beasiswa"],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`
    }
  ];
  const events = [
    { day: "05", month: "Jun", title: "Pengajian Selapanan & Kajian Kitab Nashaihul Ibad", time: "19:30 - 22:00 WIB", location: "Serambi Masjid Baiturrahman RT 03" },
    { day: "12", month: "Jun", title: "Santunan Anak Yatim & Dhuafa Bulanan", time: "16:00 - 18:00 WIB", location: "Sekretariat PRNU Karangsalam Kidul II" },
    { day: "19", month: "Jun", title: "Lailatul Ijtima' & Istighotsah Bersama", time: "20:00 - 22:30 WIB", location: "Mushola Al-Ikhlas RT 03 RW 03" },
    { day: "26", month: "Jun", title: "Rapat Pleno Syuriyah & Tanfidziyah", time: "09:00 - 12:00 WIB", location: "Sekretariat PRNU" },
    { day: "03", month: "Jul", title: "Pengajian Selapanan — Kajian Rutin Bulanan", time: "19:30 - 22:00 WIB", location: "Serambi Masjid Baiturrahman" },
    { day: "10", month: "Jul", title: "Santunan & Penyaluran Dana Sosial RT 01-06", time: "15:30 - 17:30 WIB", location: "Balai RT 03 RW 03" },
    { day: "17", month: "Jul", title: "Lailatul Ijtima' & Laporan Koin NU Ranting", time: "20:00 - 22:30 WIB", location: "Mushola Al-Barokah RT 01" },
    { day: "24", month: "Jul", title: "Pelatihan Digitalisasi UMKM Muslimat NU", time: "09:00 - 13:00 WIB", location: "Sekretariat PRNU" }
  ];
  const sermons = [
    { title: "Kewajiban Zakat & Khidmah Koin NU dalam Perspektif Fiqih", speaker: "KH. Muhammad Sholeh", duration: "35:10", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", date: "2026-05-26" },
    { title: "Fadhilah Lailatul Ijtima' dan Amaliyah Aswaja An-Nahdliyah", speaker: "Kiai Masruri", duration: "42:15", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", date: "2026-04-24" },
    { title: "Sedekah Subuh, Kepedulian Sosial, dan Gerakan Koin NU", speaker: "Ustadz KH. Ahmad Hambali", duration: "28:40", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", date: "2026-03-19" },
    { title: "Ukhuwah Islamiyah dan Nilai Kebangsaan dalam Tradisi NU", speaker: "KH. M. Yusuf Chudlori", duration: "52:12", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", date: "2026-02-15" },
    { title: "Thariqah Aswaja: Mengenal Mazhab dan Amaliyah Nahdliyin", speaker: "Kiai Masruri", duration: "38:55", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", date: "2026-01-16" },
    { title: "Maulid Nabi: Mencintai Rasulullah SAW dengan Karya & Amal", speaker: "KH. Muhammad Sholeh", duration: "46:30", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", date: "2025-09-16" }
  ];
  const news = getPublishedNews().slice(0, 6);

  document.title = "PRNU Karangsalam Kidul II | Merawat Tradisi, Menguatkan Khidmah";
  app.innerHTML = `
    <div class="landing-page">
      <!-- Header Topbar -->
      <div class="landing-topbar">
        <div class="landing-topbar-content">
          <div class="landing-topbar-info">
            <span>
              <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 9.24v7.68z"/></svg>
              +62 812-7000-0101
            </span>
            <span>
              <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              admin@rantingnu.id
            </span>
          </div>
          <div class="landing-topbar-actions">
            <a href="/login" class="landing-topbar-link">
              <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
              Masuk Sistem SIKOINNU
            </a>
          </div>
        </div>
      </div>

      <!-- Main Header -->
      <header class="landing-header">
        <a class="landing-brand" href="#beranda" aria-label="PRNU Karangsalam Kidul II">
          <img src="/logo-karangsalam-2.png" alt="Logo Karangsalam 2" />
          <span><strong>PRNU</strong><small>Karangsalam Kidul II</small></span>
        </a>
        <button class="landing-menu" id="landingMenuButton" aria-expanded="false" aria-controls="landingNav">Menu</button>
        <nav class="landing-nav" id="landingNav">
          <a href="#beranda">Beranda</a>
          <a href="#profil">Profil</a>
          <a href="#jadwal-shalat">Jadwal Shalat</a>
          <a href="#program">Program</a>
          <a href="#agenda">Agenda</a>
          <a href="#kajian">Kajian</a>
          <a href="#berita">Berita</a>
          <a href="#donasi">Donasi</a>
          <a href="#kontak">Hubungi</a>
        </nav>
      </header>

      <main>
        <!-- Hero Section -->
        <section class="landing-hero" id="beranda">
          <div class="landing-hero-content">
            <div class="hero-kicker-badge">
              <span>Nahdlatul Ulama</span>
              <span>Ranting Karangsalam Kidul II</span>
            </div>
            <h1>Merawat Tradisi,<br /><em>Menguatkan Khidmah</em></h1>
            <p class="landing-tagline">Membangun Umat Dari Tingkatan Ranting</p>
            <p class="landing-hero-copy">Bergerak bersama warga menjaga amalan Ahlussunnah wal Jama'ah, menata layanan sosial-keumatan, dan mengelola infaq/sedekah secara amanah, profesional, dan terbuka.</p>
            <div class="landing-badges">
              <span class="landing-hero-tag">Aswaja An-Nahdliyah</span>
              <span class="landing-hero-tag">Khidmah Jama'ah</span>
              <span class="landing-hero-tag">Transparansi Koin NU</span>
            </div>
            <div class="landing-actions">
              <a class="landing-button landing-button-gold" href="#program">Lihat Program</a>
              <a class="landing-button landing-button-outline" href="#kontak">Hubungi Kami</a>
            </div>
          </div>
          <aside class="landing-hero-card">
            <div class="hero-card-pattern-overlay"></div>
            <div class="hero-card-branding">
              <img src="/logo-karangsalam-2.png" alt="Logo Karangsalam 2" />
              <div>
                <strong>SIKOINNU</strong>
                <small id="hero-clock-panel">Waktu: <span id="hero-clock">--:--:--</span> WIB</small>
              </div>
            </div>
            <div class="hero-card-welcome-message" style="margin-top: 1rem; text-align: left; width: 100%;">
              <p style="font-size: 0.88rem; line-height: 1.5; color: rgba(255,255,255,0.85); font-style: italic; border-left: 2px solid var(--gold); padding-left: 0.75rem;">
                "Merawat Tradisi, Menguatkan Khidmah, Membangun Umat. Sistem Informasi Pengelolaan Kotak Infaq Nahdlatul Ulama."
              </p>
              <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--gold-light); font-weight: 700;">
                <span>MASA KHIDMAH: 2025-2030</span>
                <span>KAB. BANYUMAS</span>
              </div>
            </div>
          </aside>
        </section>

        <!-- Hero Quick Features Grid Overlay -->
        <div class="hero-quick-features-container">
          <div class="hero-quick-features">
            <div class="quick-feature-card">
              <div class="quick-feature-icon">
                <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <div class="quick-feature-info">
                <h4>Shalat Berikutnya</h4>
                <p id="hero-next-prayer">Memuat...</p>
              </div>
            </div>
            <div class="quick-feature-card">
              <div class="quick-feature-icon">
                <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <div class="quick-feature-info">
                <h4>Koin NU Ranting</h4>
                <p>Terkumpul: ${totalPercentage}% target</p>
              </div>
            </div>
            <div class="quick-feature-card">
              <div class="quick-feature-icon">
                <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
              <div class="quick-feature-info">
                <h4>Kajian & Khutbah</h4>
                <p>2 Audio Kajian Aktif</p>
              </div>
            </div>
            <div class="quick-feature-card">
              <div class="quick-feature-icon">
                <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div class="quick-feature-info">
                <h4>Badan Otonom</h4>
                <p>4 Banom & Lembaga</p>
              </div>
            </div>
          </div>
        </div>

        <!-- About Section Redesign -->
        <section class="landing-intro landing-section landing-pattern-bg" id="profil">
          <div class="landing-intro-left">
            <p class="landing-kicker">Tentang Kami</p>
            <h2>Menjaga tradisi.<br /><span>Menyapa zaman.</span></h2>
            <p class="landing-intro-desc">PRNU Karangsalam Kidul II hadir sebagai wadah khidmah jam'iyyah Nahdlatul Ulama dalam bidang dakwah, pendidikan, sosial, ekonomi umat, and penguatan amaliyah Aswaja An-Nahdliyah.</p>
            <ul class="landing-checklist">
              <li>
                <span class="checklist-icon">
                  <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <div>
                  <strong>Kemandirian Umat:</strong>
                  <span>Pengelolaan dana sosial/Koin NU secara amanah, terbuka, dan berdampak maslahat.</span>
                </div>
              </li>
              <li>
                <span class="checklist-icon">
                  <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <div>
                  <strong>Dakwah Aswaja:</strong>
                  <span>Menjaga keutuhan aqidah Ahlussunnah wal Jama'ah melalui pengajian dan kajian keilmuan.</span>
                </div>
              </li>
              <li>
                <span class="checklist-icon">
                  <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <div>
                  <strong>Sinergi Ranting:</strong>
                  <span>Kolaborasi aktif bersama Banom (Muslimat, Ansor, Fatayat, IPNU-IPPNU) di Karangsalam Kidul II.</span>
                </div>
              </li>
            </ul>
            <a class="landing-text-link" href="#lembaga">Kenali gerakan kami <span>→</span></a>
          </div>
          <div class="landing-intro-right">
            <div class="arched-image-wrapper">
              <img src="https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=900&q=80" alt="Arsitektur Islam Ranting" class="arched-image" loading="lazy" />
              <div class="arched-image-border"></div>
            </div>
          </div>
        </section>

        <!-- Dedicated Prayer Times Section -->
        <section class="landing-prayer-section landing-section" id="jadwal-shalat">
          <div class="landing-heading-row">
            <div>
              <p class="landing-kicker">Waktu Ibadah</p>
              <h2>Jadwal Shalat Hari Ini<br /><span>Kabupaten Banyumas</span></h2>
            </div>
            <p class="prayer-section-tagline">Waktu shalat sinkron otomatis dengan jadwal resmi Kemenag RI untuk kemudahan ibadah jamaah Ranting.</p>
          </div>
          <div id="landing-prayer-container"></div>
        </section>

        <!-- Program Section -->
        <section class="landing-program-section landing-section" id="program">
          <div class="landing-heading-row">
            <div><p class="landing-kicker">Program Utama</p><h2>Khidmah yang tumbuh<br /><span>bersama warga.</span></h2></div>
            <p>Lima arah gerak untuk menguatkan kehidupan berjamaah dan memberi manfaat yang terasa dekat.</p>
          </div>
          <div class="landing-program-grid">
            ${programs.map(([title, copy, svgIcon], index) => `
              <article class="landing-program-card">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <b class="program-vector-icon">${svgIcon}</b>
                <h3>${title}</h3>
                <p>${copy}</p>
              </article>
            `).join("")}
          </div>
        </section>

        <!-- Banom & Lembaga -->
        <section class="landing-institutions landing-section landing-pattern-bg" id="lembaga">
          <div class="landing-heading-row">
            <div>
              <p class="landing-kicker">Badan Otonom (Banom) NU</p>
              <h2>Satu Jam'iyyah,<br /><span>Banyak Sayap Khidmah.</span></h2>
            </div>
            <p>Banom NU adalah "kamar-kamar" dalam satu rumah besar Nahdlatul Ulama — masing-masing bergerak sesuai basis dan keahliannya, namun berjalan dalam satu garis akidah Aswaja.</p>
          </div>
          <div class="landing-institution-grid">
            ${institutions.map(inst => `
              <article class="landing-institution-card" style="--inst-color: ${inst.color};">
                <div class="inst-card-header">
                  <div class="inst-icon-wrap" style="background: ${inst.color}15; color: ${inst.color}; border-color: ${inst.color}30;">
                    ${inst.icon}
                  </div>
                  <div>
                    <h3>${inst.name}</h3>
                    <small class="inst-tagline">${inst.tagline}</small>
                  </div>
                </div>
                <p class="inst-desc">${inst.desc}</p>
                <div class="inst-basis">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;flex-shrink:0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span>${inst.basis}</span>
                </div>
                <div class="inst-tags">
                  ${inst.tags.map(tag => `<span class="inst-tag" style="background:${inst.color}12; color:${inst.color}; border-color:${inst.color}25;">${tag}</span>`).join("")}
                </div>
              </article>
            `).join("")}
          </div>
        </section>

        <!-- Agenda Section -->
        <section class="landing-events landing-section" id="agenda">
          <div class="landing-heading-row">
            <div><p class="landing-kicker">Agenda Ranting</p><h2>Kegiatan terdekat<br /><span>di Karangsalam Kidul II.</span></h2></div>
            <p>Jadwal berkumpul, ngaji bersama, dan konsolidasi khidmah jam'iyyah.</p>
          </div>
          <div class="landing-events-grid">
            ${events.map(ev => `
              <article class="event-card">
                <div class="event-date-badge">
                  <span class="event-day">${ev.day}</span>
                  <span class="event-month">${ev.month}</span>
                </div>
                <div class="event-details">
                  <h3>${ev.title}</h3>
                  <div class="event-meta">
                    <span>🕒 ${ev.time}</span>
                    <span>📍 ${ev.location}</span>
                  </div>
                </div>
              </article>
            `).join("")}
          </div>
        </section>

        <!-- Kajian / Media Section -->
        <section class="landing-sermons landing-section landing-pattern-bg" id="kajian">
          <div class="landing-heading-row">
            <div><p class="landing-kicker">Kajian & Khutbah</p><h2>Mendengar ilmu,<br /><span>merawat sanad.</span></h2></div>
            <p>Rekaman pengajian dan kajian keislaman moderat khas warga Nahdliyin.</p>
          </div>
          <audio id="global-sermon-player" style="display: none;"></audio>
          <div class="landing-sermons-grid">
            ${sermons.map((ser, index) => `
              <article class="sermon-card">
                <div class="sermon-info">
                  <span class="sermon-number">${String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>${ser.title}</h3>
                    <small>Narasumber: <b>${ser.speaker}</b> · Durasi: ${ser.duration}${ser.date ? ` · <span style="color:var(--gold-dark)">${formatDateId(ser.date)}</span>` : ""}</small>
                  </div>
                </div>
                <div class="sermon-player-controls">
                  <button class="sermon-play-btn" data-audio="${ser.audioUrl}">
                    <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                    Putar
                  </button>
                  <div class="sermon-progress-bar-container">
                    <div class="sermon-progress-track"><div class="sermon-progress-filled" style="width: 0%;"></div></div>
                  </div>
                  <a href="#" class="sermon-download-btn" title="Download Catatan PDF" onclick="event.preventDefault(); alert('Ringkasan PDF Kajian akan segera disediakan oleh sekretaris.');">
                    <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    PDF
                  </a>
                </div>
              </article>
            `).join("")}
          </div>
        </section>

        <!-- News Section -->
        <section class="landing-news landing-section" id="berita">
          <div class="landing-heading-row">
            <div><p class="landing-kicker">Berita Terbaru</p><h2>Kabar dari<br /><span>ranting.</span></h2></div>
            <p>Catatan kegiatan dan gerak khidmah PRNU Karangsalam Kidul II.</p>
          </div>
          <div class="landing-news-grid">
            ${news.length ? news.map((item) => `
              <article class="news-item-card" data-id="${item.id}" style="cursor: pointer;">
                <div class="news-img-container">
                  <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" />
                </div>
                <div class="news-card-content">
                  <small>${escapeHtml(item.category)} · ${formatDateId(item.date)}</small>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.excerpt)}</p>
                  <span class="news-readmore-btn">Baca kabar lengkap <span>→</span></span>
                </div>
              </article>
            `).join("") : `<div class="photo-empty" style="grid-column: 1 / -1;">Belum ada berita yang diterbitkan.</div>`}
          </div>
        </section>

        <section class="landing-gallery landing-section landing-pattern-bg" id="galeri">
          <div class="landing-heading-row">
            <div><p class="landing-kicker">Galeri Khidmah</p><h2>Yang dikerjakan bersama,<br /><span>menjadi cerita bersama.</span></h2></div>
            <p>Rangkaian dokumentasi kegiatan keagamaan, sosial, dan koordinasi jam'iyyah pengurus ranting.</p>
          </div>
          <div class="landing-gallery-grid">
            ${appState.publicDocumentation.slice(0, 8).map(doc => `
              <figure class="gallery-fig" title="${escapeHtml(doc.title)}">
                <img src="${escapeHtml(doc.photoUrl)}" alt="${escapeHtml(doc.title)}" loading="lazy" />
                <figcaption>
                  <span class="gallery-cat">${escapeHtml(doc.category)}</span>
                  <span>${escapeHtml(doc.title)}</span>
                </figcaption>
              </figure>
            `).join("")}
          </div>
        </section>

        <!-- Donation Campaign Cause Section -->
        <section class="landing-donation landing-section" id="donasi">
          <div>
            <p class="landing-kicker">Koin NU & Donasi</p>
            <h2>Sedikit demi sedikit,<br /><span>manfaat terus mengalir.</span></h2>
            <p>Mari bersama menguatkan khidmah NU untuk umat melalui Koin NU dan donasi program sosial.</p>
            <div class="landing-actions">
              <a class="landing-button landing-button-gold" href="/transparansi">Lihat Transparansi Koin NU</a>
              <button class="landing-button landing-button-outline" id="copyDonationButton" type="button">Donasi Sekarang</button>
            </div>
          </div>
          <div class="landing-donation-stat">
            <small>Gerakan bersama</small>
            <strong>Koin NU Ranting</strong>
            <div class="program-progress-container" style="width: 100%; margin: 1.25rem 0 0.75rem; text-align: left;">
              <div class="program-progress-bar" style="background: rgba(255,255,255,0.12);">
                <div class="program-progress-fill" style="width: ${totalPercentage}%;"></div>
              </div>
              <div class="program-progress-labels" style="margin-top: 0.5rem; display: flex; justify-content: space-between;">
                <span style="color: var(--gold-light); font-size: 0.72rem; font-weight: 700;">Terkumpul: ${formatRupiah(totalIncome)}</span>
                <span style="color: var(--gold); font-size: 0.72rem; font-weight: 700;">${totalPercentage}% dari target</span>
              </div>
            </div>
            <span>Amanah · Terbuka · Berdampak</span>
          </div>
        </section>

        <!-- Contact & Maps Section -->
        <section class="landing-contact landing-section landing-pattern-bg" id="kontak">
          <div class="landing-contact-info">
            <p class="landing-kicker">Kontak Kami</p>
            <h2>Mari terhubung<br /><span>dan berkhidmah.</span></h2>
            <p style="margin-top: 1rem; font-size: 0.95rem;">Hubungi pengurus untuk informasi kegiatan, setoran Koin NU, pendaftaran donatur baru, atau saran program khidmah.</p>
            
            <div class="landing-contact-form-wrapper" style="margin-top: 2rem;">
              <form class="landing-contact-form" onsubmit="event.preventDefault(); window.confetti({particleCount:100, spread:70}); alert('Terima kasih. Pesan Anda telah terkirim ke sistem pengurus Ranting.'); this.reset();">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                  <input type="text" placeholder="Nama Lengkap" required style="padding:0.75rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:#fff; font-size:0.85rem;" />
                  <input type="tel" placeholder="Nomor WhatsApp" required style="padding:0.75rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:#fff; font-size:0.85rem;" />
                </div>
                <textarea placeholder="Tulis pesan atau saran program..." required rows="4" style="width:100%; padding:0.75rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:#fff; font-size:0.85rem; margin-bottom:1rem; resize:vertical; font-family:inherit;"></textarea>
                <button type="submit" class="landing-button landing-button-gold" style="border:none; cursor:pointer; width:100%; justify-content:center;">Kirim Pesan Ke Pengurus</button>
              </form>
            </div>
          </div>
          <div class="landing-contact-grid">
            <article>
              <small>Alamat sekretariat</small>
              <strong>PRNU Karangsalam Kidul II<br />Gg. Melati RT 02 / RW 03, Kec. Kedungbanteng, Kab. Banyumas, Jawa Tengah</strong>
            </article>
            <article>
              <small>Informasi & Layanan</small>
              <strong>WhatsApp: +62 812-7000-0101<br />Email: admin@rantingnu.id</strong>
            </article>
            <article>
              <small>Akses cepat</small>
              <a href="https://www.google.com/maps/search/?api=1&query=Karangsalam+Kidul+Kedungbanteng+Banyumas" target="_blank" rel="noreferrer" class="maps-link">
                <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Buka Google Maps
              </a>
              <a href="/login" class="system-link">
                <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
                Masuk Sistem Koin NU
              </a>
            </article>
          </div>
        </section>
      </main>

      <!-- Multi-column Premium Footer -->
      <footer class="landing-footer-premium">
        <div class="landing-footer-grid">
          <div class="footer-col brand-col">
            <div class="landing-brand">
              <img src="/logo-karangsalam-2.png" alt="Logo Karangsalam 2" />
              <span><strong>PRNU</strong><small>Karangsalam Kidul II</small></span>
            </div>
            <p class="footer-brand-desc">Merawat tradisi Ahlussunnah wal Jama'ah An-Nahdliyah, menguatkan khidmah keumatan, and membangun kemandirian ekonomi umat di tingkatan Ranting.</p>
            <div class="footer-socials">
              <a href="#" aria-label="Facebook"><svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
              <a href="#" aria-label="Instagram"><svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
              <a href="#" aria-label="Youtube"><svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg></a>
            </div>
          </div>
          <div class="footer-col links-col">
            <h3>Navigasi Cepat</h3>
            <ul>
              <li><a href="#beranda">Beranda</a></li>
              <li><a href="#profil">Profil Ranting</a></li>
              <li><a href="#jadwal-shalat">Jadwal Shalat</a></li>
              <li><a href="#program">Program Utama</a></li>
              <li><a href="#agenda">Agenda Ranting</a></li>
              <li><a href="#kajian">Audio Kajian</a></li>
              <li><a href="#berita">Kabar Ranting</a></li>
            </ul>
          </div>
          <div class="footer-col contact-col">
            <h3>Sekretariat & Hubungi</h3>
            <p>
              <strong>Pengurus Ranting Nahdlatul Ulama</strong><br />
              Desa Karangsalam Kidul, RT 02 / RW 03<br />
              Kecamatan Kedungbanteng, Kabupaten Banyumas<br />
              Jawa Tengah, Indonesia
            </p>
            <p style="margin-top: 1rem;">
              <strong>Layanan Koin NU:</strong> +62 812-7000-0101<br />
              <strong>Email:</strong> admin@rantingnu.id
            </p>
          </div>
        </div>
        <div class="landing-footer-bottom">
          <p>&copy; 2026 SIKOINNU - PRNU Karangsalam Kidul II. Hak Cipta Dilindungi.</p>
          <p>Membangun Umat Dari Tingkatan Ranting</p>
        </div>
      </footer>

      <!-- Modals (Donation Dialog & News Reader Dialog) -->
      <dialog id="donation-dialog" class="donation-dialog">
        <div class="donation-dialog-content" id="donation-dialog-content-wrapper">
          <!-- Initialized via JavaScript initDonationDialogFlow() -->
        </div>
      </dialog>

      <dialog id="news-reader-dialog" class="news-dialog">
        <div class="news-dialog-content">
          <button class="dialog-close-btn" id="close-news-dialog" aria-label="Tutup">&times;</button>
          <div id="news-dialog-body"></div>
        </div>
      </dialog>
    </div>`;

  document.querySelector("#landingMenuButton")?.addEventListener("click", (event) => {
    const expanded = event.currentTarget.getAttribute("aria-expanded") === "true";
    event.currentTarget.setAttribute("aria-expanded", String(!expanded));
    document.querySelector("#landingNav")?.classList.toggle("open", !expanded);
  });
  document.querySelectorAll(".landing-nav a").forEach((link) => link.addEventListener("click", () => {
    document.querySelector("#landingMenuButton")?.setAttribute("aria-expanded", "false");
    document.querySelector("#landingNav")?.classList.remove("open");
  }));

  // Functional Audio Player Control
  const audioPlayer = document.querySelector("#global-sermon-player");
  let currentPlayingBtn = null;
  let currentProgressTrack = null;

  document.querySelectorAll(".sermon-play-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const button = event.currentTarget;
      const audioUrl = button.dataset.audio;
      const card = button.closest(".sermon-card");
      const progressFilled = card.querySelector(".sermon-progress-filled");

      if (currentPlayingBtn === button) {
        if (audioPlayer.paused) {
          audioPlayer.play();
          button.innerHTML = '<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg> Jeda';
        } else {
          audioPlayer.pause();
          button.innerHTML = '<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg> Putar';
        }
      } else {
        if (currentPlayingBtn) {
          currentPlayingBtn.innerHTML = '<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg> Putar';
          if (currentProgressTrack) currentProgressTrack.style.width = "0%";
        }

        currentPlayingBtn = button;
        currentProgressTrack = progressFilled;
        audioPlayer.src = audioUrl;
        audioPlayer.play().catch(e => console.warn("Audio playback issue:", e));
        button.innerHTML = '<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg> Jeda';
      }
    });
  });

  if (audioPlayer) {
    audioPlayer.addEventListener("timeupdate", () => {
      if (audioPlayer.duration && currentProgressTrack) {
        const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        currentProgressTrack.style.width = `${percentage}%`;
      }
    });

    audioPlayer.addEventListener("ended", () => {
      if (currentPlayingBtn) {
        currentPlayingBtn.innerHTML = '<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg> Putar';
      }
      if (currentProgressTrack) {
        currentProgressTrack.style.width = "0%";
      }
      currentPlayingBtn = null;
      currentProgressTrack = null;
    });
  }

  // Interactive Donation Dialog
  const donationDialog = document.querySelector("#donation-dialog");
  document.querySelector("#copyDonationButton")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (donationDialog) {
      initDonationDialogFlow();
      donationDialog.showModal();
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  });

  // Interactive News Reader Modal
  const newsDialog = document.querySelector("#news-reader-dialog");
  document.querySelectorAll(".landing-news-grid article.news-item-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      const item = appState.news.find((n) => n.id === id);
      if (!item) return;

      const body = document.querySelector("#news-dialog-body");
      if (body) {
        body.innerHTML = `
          <div class="news-dialog-header" style="text-align: left; margin-bottom: 1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; font-weight:700; color:var(--gold-dark); text-transform:uppercase; margin-bottom:0.5rem;">
              <span>${escapeHtml(item.category)}</span>
              <span>${formatDateId(item.date)}</span>
            </div>
            <h2 style="font-family:var(--font-serif); font-size:1.8rem; line-height:1.3; color:var(--neutral-dark); margin:0;">${escapeHtml(item.title)}</h2>
          </div>
          <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" style="width:100%; height:280px; object-fit:cover; border-radius:var(--radius-md); margin-bottom:1.5rem; box-shadow:var(--shadow-sm);" />
          <div class="news-dialog-text" style="font-size:0.95rem; line-height:1.7; color:var(--neutral-mid); text-align:left;">
            ${item.content.split("\n").filter(Boolean).map(p => `<p style="margin-bottom:1rem;">${escapeHtml(p)}</p>`).join("")}
          </div>
        `;
        if (newsDialog) newsDialog.showModal();
      }
    });
  });

  document.querySelector("#close-news-dialog")?.addEventListener("click", () => {
    newsDialog?.close();
  });

  updatePrayerWidget("#landing-prayer-container");

  // Real-time ticking clock
  const updateClock = () => {
    const clockEl = document.querySelector("#hero-clock");
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  updateClock();
  if (window.heroClockInterval) clearInterval(window.heroClockInterval);
  window.heroClockInterval = setInterval(updateClock, 1000);
}

// === Interactive QRIS Donation Simulator & Digital Receipt Helpers ===
let qrisTimerInterval = null;

function initDonationDialogFlow() {
  if (qrisTimerInterval) clearInterval(qrisTimerInterval);
  const wrapper = document.querySelector("#donation-dialog-content-wrapper");
  if (!wrapper) return;

  wrapper.innerHTML = `
    <button class="dialog-close-btn" id="close-donation-dialog" aria-label="Tutup">&times;</button>
    <div class="dialog-header">
      <img src="/logo-karangsalam-2.png" alt="Logo NU" />
      <h3>Layanan Infaq & Donasi</h3>
      <p>Salurkan infaq terbaik Anda secara aman dan transparan.</p>
    </div>
    
    <div class="donation-payment-tabs">
      <button class="tab-btn active" id="tab-bank" type="button">Transfer Bank</button>
      <button class="tab-btn" id="tab-qris" type="button">QRIS Instan</button>
    </div>

    <div class="dialog-body" id="donation-dialog-body">
      ${getBankTransferTabHtml()}
    </div>
    
    <div class="dialog-footer">
      <p>Pengurus Ranting NU Karangsalam Kidul II - Transparan & Amanah</p>
    </div>
  `;

  // Bind close button
  document.querySelector("#close-donation-dialog")?.addEventListener("click", () => {
    if (qrisTimerInterval) clearInterval(qrisTimerInterval);
    document.querySelector("#donation-dialog")?.close();
  });

  // Bind copy button on bank transfer tab
  bindBankTransferEvents();

  // Tab switching
  const tabBank = document.querySelector("#tab-bank");
  const tabQris = document.querySelector("#tab-qris");
  const dialogBody = document.querySelector("#donation-dialog-body");

  tabBank?.addEventListener("click", () => {
    if (qrisTimerInterval) clearInterval(qrisTimerInterval);
    tabBank.classList.add("active");
    tabQris.classList.remove("active");
    dialogBody.innerHTML = getBankTransferTabHtml();
    bindBankTransferEvents();
  });

  tabQris?.addEventListener("click", () => {
    tabQris.classList.add("active");
    tabBank.classList.remove("active");
    dialogBody.innerHTML = getQrisSetupTabHtml();
    bindQrisSetupEvents();
  });
}

function getBankTransferTabHtml() {
  return `
    <div class="donation-method-card">
      <div class="method-header">Bank Rakyat Indonesia (BRI)</div>
      <div class="method-body">
        <strong>0023-01-000888-53-0</strong>
        <span>a.n. PRNU Karangsalam Kidul II</span>
        <button class="copy-btn" id="copy-bank-acc" data-copy="002301000888530" type="button">
          <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          Salin Rekening
        </button>
      </div>
    </div>
  `;
}

function bindBankTransferEvents() {
  const btn = document.querySelector("#copy-bank-acc");
  btn?.addEventListener("click", () => {
    const text = btn.dataset.copy;
    navigator.clipboard.writeText(text).then(() => {
      btn.innerHTML = 'Tersalin!';
      btn.classList.add("copied");
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0.2, y: 0.6 }
      });
      setTimeout(() => {
        btn.innerHTML = `<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Salin Rekening`;
        btn.classList.remove("copied");
      }, 3000);
    });
  });
}

function getQrisSetupTabHtml() {
  return `
    <form id="qris-setup-form" style="display:flex; flex-direction:column; gap:1.2rem; text-align:left;">
      <label class="form-group-label" style="display:flex; flex-direction:column; gap:0.4rem;">
        <span style="font-size:0.85rem; font-weight:700; color:var(--neutral-dark);">Nama Donatur (Opsional)</span>
        <input type="text" id="qris-donor-name" placeholder="Hamba Allah" style="padding:0.7rem; border:1px solid var(--border-light); border-radius:var(--radius-sm); font-size:0.9rem;" />
      </label>
      <label class="form-group-label" style="display:flex; flex-direction:column; gap:0.4rem;">
        <span style="font-size:0.85rem; font-weight:700; color:var(--neutral-dark);">Nomor WhatsApp (Opsional)</span>
        <input type="tel" id="qris-donor-phone" placeholder="Contoh: 08123456789" style="padding:0.7rem; border:1px solid var(--border-light); border-radius:var(--radius-sm); font-size:0.9rem;" />
      </label>
      
      <div style="display:flex; flex-direction:column; gap:0.4rem;">
        <span style="font-size:0.85rem; font-weight:700; color:var(--neutral-dark);">Pilih Nominal Donasi</span>
        <div class="qris-nominal-grid">
          <button type="button" class="nominal-card" data-val="10000">Rp 10.000</button>
          <button type="button" class="nominal-card active" data-val="25000">Rp 25.000</button>
          <button type="button" class="nominal-card" data-val="50000">Rp 50.000</button>
          <button type="button" class="nominal-card" data-val="100000">Rp 100.000</button>
        </div>
      </div>

      <label class="form-group-label" style="display:flex; flex-direction:column; gap:0.4rem;">
        <span style="font-size:0.85rem; font-weight:700; color:var(--neutral-dark);">Nominal Kustom (Rp)</span>
        <input type="number" id="qris-custom-amount" min="1000" step="1000" placeholder="Masukkan nominal lain..." style="padding:0.7rem; border:1px solid var(--border-light); border-radius:var(--radius-sm); font-size:0.9rem;" />
      </label>

      <button type="submit" class="primary-button" style="width:100%; padding:0.85rem; font-size:1rem; margin-top:0.5rem;">Lanjut Pembayaran</button>
    </form>
  `;
}

function bindQrisSetupEvents() {
  const form = document.querySelector("#qris-setup-form");
  const nominalCards = document.querySelectorAll(".nominal-card");
  const customAmountInput = document.querySelector("#qris-custom-amount");
  let selectedNominal = 25000;

  nominalCards.forEach((card) => {
    card.addEventListener("click", () => {
      nominalCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      selectedNominal = Number(card.dataset.val);
      if (customAmountInput) customAmountInput.value = "";
    });
  });

  customAmountInput?.addEventListener("input", () => {
    nominalCards.forEach((c) => c.classList.remove("active"));
    selectedNominal = Number(customAmountInput.value || 0);
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const donorName = document.querySelector("#qris-donor-name")?.value.trim() || "Hamba Allah";
    const donorPhone = document.querySelector("#qris-donor-phone")?.value.trim() || "";
    const finalAmount = customAmountInput?.value ? Number(customAmountInput.value) : selectedNominal;

    if (finalAmount < 1000) {
      showToast("Minimal donasi adalah Rp 1.000.", "error");
      return;
    }

    startQrisInvoice(finalAmount, donorName, donorPhone);
  });
}

function startQrisInvoice(amount, donorName, donorPhone) {
  const wrapper = document.querySelector("#donation-dialog-content-wrapper");
  if (!wrapper) return;

  if (qrisTimerInterval) clearInterval(qrisTimerInterval);

  const transactionId = `TRX-QRIS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const qrString = `00020101021226300016ID.CO.SIKOINNU.0118${transactionId}5204000053033605405${amount}5802ID5925PRNU KARANGSALAM KIDUL II6012BANYUMAS6304`;

  const qr = qrcode(4, 'M');
  qr.addData(qrString);
  qr.make();
  const qrCodeDataUrl = qr.createDataURL(6);

  wrapper.innerHTML = `
    <button class="dialog-close-btn" id="close-donation-dialog" aria-label="Tutup">&times;</button>
    <div class="dialog-header">
      <img src="/logo-karangsalam-2.png" alt="Logo NU" />
      <h3>Pindai QRIS Infaq</h3>
      <p>Silakan scan QRIS di bawah ini untuk menyelesaikan infaq Anda.</p>
    </div>
    
    <div class="dialog-body" style="display:flex; flex-direction:column; align-items:center; gap:1.2rem; text-align:center;">
      
      <div class="qris-invoice-card" style="display:flex; flex-direction:column; align-items:center; background:#fff; border:1.5px dashed var(--primary-light); border-radius:var(--radius-md); padding:1.2rem; width:100%; max-width:320px; box-shadow:var(--shadow-sm);">
        <div style="font-size:0.75rem; font-weight:700; letter-spacing:0.1em; color:#1e3a8a; margin-bottom:0.6rem;">QRIS NASIONAL</div>
        <img src="${qrCodeDataUrl}" alt="QRIS Code" style="width:200px; height:200px; padding:0.5rem; border:1px solid #e2e8f0; border-radius:var(--radius-sm); margin-bottom:0.5rem;" />
        <div style="font-family:var(--font-serif); font-size:1.15rem; font-weight:700; color:var(--primary-dark);">${escapeHtml(donorName)}</div>
        <div style="font-size:1.35rem; font-weight:800; color:var(--gold-dark); margin:0.25rem 0;">${formatRupiah(amount)}</div>
        <div style="font-size:0.75rem; color:var(--neutral-mid); font-family:var(--font-mono);">${transactionId}</div>
      </div>

      <div class="qris-timer-wrapper" style="width:100%; display:flex; flex-direction:column; align-items:center; gap:0.25rem;">
        <span class="qris-timer" id="qris-countdown-text">15:00</span>
        <span style="font-size:0.8rem; color:var(--neutral-mid);">Selesaikan pembayaran sebelum waktu habis</span>
        <div style="width:100%; max-width:260px; height:4px; background:#e2e8f0; border-radius:2px; overflow:hidden; margin-top:0.4rem;">
          <div id="qris-progress-bar" style="width:100%; height:100%; background:var(--primary); transition: width 1s linear;"></div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.6rem; width:100%; max-width:280px; margin-top:0.5rem;">
        <button type="button" class="primary-button" id="btn-simulate-qris-success" style="background:#10b981; border-color:#10b981;">Simulasi Bayar (Sukses)</button>
        <button type="button" class="ghost-button" id="btn-cancel-qris" style="font-size:0.85rem;">Batalkan</button>
      </div>

    </div>

    <div class="dialog-footer">
      <p>Gerbang Donasi Digital Karangsalam Kidul II | Menunggu Pembayaran...</p>
    </div>
  `;

  // Bind close button
  document.querySelector("#close-donation-dialog")?.addEventListener("click", () => {
    if (qrisTimerInterval) clearInterval(qrisTimerInterval);
    document.querySelector("#donation-dialog")?.close();
  });

  // Countdown timer logic (15 minutes = 900 seconds)
  let timeLeft = 900;
  const countdownText = document.querySelector("#qris-countdown-text");
  const progressBar = document.querySelector("#qris-progress-bar");

  qrisTimerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(qrisTimerInterval);
      showToast("Batas waktu pembayaran habis.", "error");
      initDonationDialogFlow();
      return;
    }

    const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const secs = String(timeLeft % 60).padStart(2, "0");
    if (countdownText) countdownText.textContent = `${mins}:${secs}`;
    if (progressBar) progressBar.style.width = `${(timeLeft / 900) * 100}%`;
  }, 1000);

  // Bind simulate success
  document.querySelector("#btn-simulate-qris-success")?.addEventListener("click", () => {
    if (qrisTimerInterval) clearInterval(qrisTimerInterval);
    triggerQrisPaymentSuccess(transactionId, amount, donorName);
  });

  // Bind cancel
  document.querySelector("#btn-cancel-qris")?.addEventListener("click", () => {
    if (qrisTimerInterval) clearInterval(qrisTimerInterval);
    initDonationDialogFlow();
  });
}

function triggerQrisPaymentSuccess(trxId, amount, donorName) {
  confetti({ particleCount: 80, spread: 60, origin: { x: 0.1, y: 0.6 } });
  confetti({ particleCount: 80, spread: 60, origin: { x: 0.9, y: 0.6 } });
  setTimeout(() => {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
  }, 350);

  const wrapper = document.querySelector("#donation-dialog-content-wrapper");
  if (!wrapper) return;

  const dateStr = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  wrapper.innerHTML = `
    <button class="dialog-close-btn" id="close-donation-dialog" aria-label="Tutup">&times;</button>
    <div class="dialog-header no-print">
      <img src="/logo-karangsalam-2.png" alt="Logo NU" />
      <h3 style="color:#10b981;">Pembayaran Berhasil!</h3>
      <p>Terima kasih atas infaq/sedekah yang Anda berikan. Semoga berkah dan bermanfaat.</p>
    </div>

    <div class="dialog-body" style="display:flex; flex-direction:column; align-items:center; gap:1.2rem;">
      
      <div class="digital-receipt-card" id="donation-receipt-print-area">
        <div class="receipt-header">
          <img src="/logo-karangsalam-2.png" alt="Logo NU" />
          <div>
            <h4>PENGURUS RANTING NAHDLATUL ULAMA</h4>
            <h5>KARANGSALAM KIDUL II - KEDUNGBANTENG</h5>
            <p>KUITANSI DONASI DIGITAL SIKOINNU</p>
          </div>
        </div>

        <div class="receipt-divider"></div>

        <div class="receipt-status-stamp">LUNAS</div>

        <table class="receipt-table">
          <tr>
            <th>Nomor Transaksi</th>
            <td>: <strong>${escapeHtml(trxId)}</strong></td>
          </tr>
          <tr>
            <th>Tanggal / Waktu</th>
            <td>: ${dateStr} WIB</td>
          </tr>
          <tr>
            <th>Nama Donatur</th>
            <td>: ${escapeHtml(donorName)}</td>
          </tr>
          <tr>
            <th>Metode Pembayaran</th>
            <td>: QRIS Instan (Simulasi)</td>
          </tr>
          <tr>
            <th>Status Pembayaran</th>
            <td>: <span style="color:#10b981; font-weight:700;">SUKSES / LUNAS</span></td>
          </tr>
          <tr class="receipt-amount-row">
            <th>Jumlah Donasi</th>
            <td>: <span>${formatRupiah(amount)}</span></td>
          </tr>
        </table>

        <div class="receipt-divider"></div>

        <div class="receipt-footer">
          <p>Teriring Doa Jazaakumullaahu Khairan Katsiran</p>
          <p>Semoga Allah SWT melimpahkan berkah, kesehatan, dan kelapangan rezeki untuk Anda sekeluarga. Aamiin.</p>
        </div>
      </div>

      <div class="receipt-actions no-print" style="display:flex; gap:0.8rem; width:100%; max-width:320px; justify-content:center; margin-top:0.5rem;">
        <button type="button" class="primary-button" id="btn-print-receipt" style="display:flex; align-items:center; justify-content:center; gap:0.4rem; flex:1;">
          <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect width="12" height="8" x="6" y="14"></rect></svg>
          Cetak Kuitansi
        </button>
        <button type="button" class="ghost-button" id="btn-receipt-done" style="flex:1;">Selesai</button>
      </div>

    </div>

    <div class="dialog-footer no-print">
      <p>Data donasi ini akan tercatat dalam portal transparansi keuangan Ranting.</p>
    </div>
  `;

  // Bind close button
  document.querySelector("#close-donation-dialog")?.addEventListener("click", () => {
    document.querySelector("#donation-dialog")?.close();
  });

  // Bind print receipt
  document.querySelector("#btn-print-receipt")?.addEventListener("click", () => {
    window.print();
  });

  // Bind done
  document.querySelector("#btn-receipt-done")?.addEventListener("click", () => {
    document.querySelector("#donation-dialog")?.close();
  });
}

function render() {
  const path = window.location.pathname;
  if (path === "/publik" || path === "/transparansi") {
    renderPublicDashboard();
    return;
  }
  if (path === "/") {
    renderLandingPage();
    return;
  }
  if (path === "/login") {
    renderLogin();
    return;
  }

  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }
  if (!canAccessPath(session, path)) {
    navigate("/dashboard");
    return;
  }

  if (path === "/dashboard") {
    renderDashboard();
    return;
  }
  if (path === "/profil-ranting") {
    renderProfile();
    return;
  }
  if (path === "/pengurus") {
    renderBoardMembers();
    return;
  }
  if (path === "/donatur") {
    renderDonors();
    return;
  }
  if (path === "/petugas") {
    renderOfficers();
    return;
  }
  if (path === "/pengambilan-koin") {
    renderPickups();
    return;
  }
  if (path === "/verifikasi") {
    renderVerification();
    return;
  }
  if (path === "/setoran-petugas") {
    renderOfficerDeposits();
    return;
  }
  if (path === "/setor-lazisnu") {
    renderLazisnuDeposits();
    return;
  }
  if (path === "/penyaluran-dana") {
    renderDistributions();
    return;
  }
  if (path === "/berita") {
    renderNewsAdmin();
    return;
  }
  if (path === "/laporan") {
    renderReports();
    return;
  }
  if (path === "/users") {
    renderUsers();
    return;
  }
  if (path === "/pengaturan") {
    renderSettings();
    return;
  }
  navigate("/dashboard");
}

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then((reg) => console.log("Service Worker registered with scope:", reg.scope))
      .catch((err) => console.error("Service Worker registration failed:", err));
  });
}

// Network Status Observers
window.addEventListener("online", () => {
  appState.isOffline = false;
  updateOfflineIndicator();
  syncOfflineData();
});

window.addEventListener("offline", () => {
  appState.isOffline = true;
  updateOfflineIndicator();
});

// Event Delegation for Network Badge Manual Click Trigger
document.addEventListener("click", (event) => {
  const badge = event.target.closest("#networkStatusBadge");
  if (badge) {
    if (appState.syncingOffline) {
      showToast("Sedang menyelaraskan data...", "info");
    } else if (appState.isOffline) {
      showToast("Anda sedang offline. Tidak dapat menyelaraskan data.", "warning");
    } else if (appState.pendingSyncCount > 0) {
      syncOfflineData();
    } else {
      showToast("Koneksi online. Semua data telah diselaraskan.", "success");
    }
  }
});

window.addEventListener("popstate", render);

async function initApp() {
  app.innerHTML = `<section class="placeholder-panel"><p class="eyebrow">Memuat</p><h2>Menyiapkan aplikasi</h2><p>Jika PostgreSQL belum dikonfigurasi, aplikasi akan berjalan dalam mode demo.</p></section>`;
  await restorePostgresSession();
  
  // Inisialisasi antrean offline dari IndexedDB
  try {
    await updatePendingSyncCount();
  } catch (err) {
    console.warn("Gagal inisialisasi antrean offline:", err);
  }
  
  await loadInternalData();
  render();
}

initApp();
