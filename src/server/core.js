import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import { hashPasswordLegacy, hashPasswordModern, verifyPassword } from "./password.js";
import { createPostgresStore } from "./postgres-store.js";

const allowedUploadTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
export const roles = ["super_admin", "admin", "bendahara", "petugas", "pengurus", "editor_berita"];
export const statuses = ["aktif", "tidak_aktif"];
export const tables = [
  "profiles", "ranting_profile", "pengurus", "petugas", "donatur", "pengambilan_koin",
  "verifikasi_setoran", "setoran_petugas", "setoran_lazisnu", "penyaluran_dana",
  "dokumentasi_kegiatan", "berita", "settings", "pengumuman", "kegiatan",
  "layanan_kematian", "jadwal_tahlil", "pengajuan_bantuan", "masjid_mushola",
  "umkm", "produk_umkm", "download", "download_log", "artikel", "kontak_masuk",
  "program_kerja", "lpj_kegiatan", "dokumen_publik"
];

export const publicPortalTables = [
  "ranting_profile", "pengurus", "dokumentasi_kegiatan", "penyaluran_dana", "berita",
  "pengumuman", "kegiatan", "layanan_kematian", "jadwal_tahlil", "masjid_mushola",
  "umkm", "produk_umkm", "download", "artikel", "program_kerja", "lpj_kegiatan",
  "dokumen_publik"
];

function makeDefaultUser(id, email, password, fullName, role, phone, username = id) {
  return { id, username, email, password_hash: hashPasswordLegacy(password), full_name: fullName, role, phone, status: "aktif", created_at: new Date().toISOString() };
}
const defaultUsers = [
  makeDefaultUser("demo-superadmin", "superadmin@rantingnu.id", "SuperAdmin2026!", "Super Admin", "super_admin", "0812-9000-0001", "superadmin"),
  makeDefaultUser("demo-admin", "admin@rantingnu.id", "Admin2026!", "Admin Ranting", "admin", "0812-9000-1111", "admin"),
  makeDefaultUser("demo-bendahara", "bendahara@rantingnu.id", "Bendahara2026!", "Bendahara", "bendahara", "", "bendahara"),
  makeDefaultUser("demo-petugas", "petugas@rantingnu.id", "Petugas2026!", "Petugas", "petugas", "0812-7000-0101", "petugas"),
  makeDefaultUser("demo-pengurus", "pengurus@rantingnu.id", "Pengurus2026!", "Pengurus", "pengurus", "", "pengurus"),
  makeDefaultUser("demo-editor", "editor@rantingnu.id", "Editor2026!", "Editor Berita", "editor_berita", "", "editor")
];

export function createApiContext(config) {
  const pgPool = config.databaseUrl ? new pg.Pool({ connectionString: config.databaseUrl }) : null;
  const pgStore = pgPool ? createPostgresStore(pgPool, tables, defaultUsers) : null;
  let pgReady = false;
  const loginAttempts = new Map();
  const tokenDenylist = new Set();
  const dbPath = path.join(config.dataDir, "db.json");

  // Cleanup expired rate-limit entries and denied tokens every 10 minutes
  const _cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of loginAttempts) {
      if (entry.resetAt <= now && (!entry.blockedUntil || entry.blockedUntil <= now)) loginAttempts.delete(key);
    }
    for (const token of tokenDenylist) {
      try {
        const [payload] = token.split(".");
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (data.expiresAt < now) tokenDenylist.delete(token);
      } catch { tokenDenylist.delete(token); }
    }
  }, 10 * 60 * 1000);
  if (_cleanupInterval.unref) _cleanupInterval.unref();

  function createSessionToken(data) {
    const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
    const hmac = crypto.createHmac("sha256", config.sessionSecret);
    hmac.update(payload);
    const signature = hmac.digest("base64url");
    return `${payload}.${signature}`;
  }
  function verifySessionToken(token) {
    if (!token || !token.includes(".")) return null;
    if (tokenDenylist.has(token)) return null;
    const [payload, signature] = token.split(".");
    const hmac = crypto.createHmac("sha256", config.sessionSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("base64url");
    const sigBuf = Buffer.from(signature, "base64url");
    const expectedBuf = Buffer.from(expectedSignature, "base64url");
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
    try {
      const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (data.expiresAt < Date.now()) return null;
      return data;
    } catch {
      return null;
    }
  }
  function denyToken(token) { if (token) tokenDenylist.add(token); }

  function emptyDb() { return Object.fromEntries(tables.map((table) => [table, table === "profiles" ? defaultUsers : []])); }
  function syncDefaultUsers(db) {
    let changed = false;
    for (const user of defaultUsers) {
      const index = db.profiles.findIndex((profile) => {
        const userName = String(profile.username || profile.user_name || profile.login || "").trim().toLowerCase();
        const email = String(profile.email || "").trim().toLowerCase();
        return String(profile.id) === String(user.id) || userName === user.username || email === user.email;
      });
      if (index >= 0) {
        const next = {
          ...db.profiles[index],
          ...user,
          id: db.profiles[index].id || user.id,
          created_at: db.profiles[index].created_at || user.created_at,
          updated_at: new Date().toISOString()
        };
        if (JSON.stringify({ ...db.profiles[index], updated_at: "" }) !== JSON.stringify({ ...next, updated_at: "" })) {
          db.profiles[index] = next;
          changed = true;
        }
      } else {
        db.profiles.push(user);
        changed = true;
      }
    }
    return changed;
  }
  async function ensurePg() {
    if (!pgPool || pgReady) return;
    await pgStore.ensure();
    pgReady = true;
  }
  async function readDb() {
    if (pgPool) {
      await ensurePg(); const db = emptyDb();
      for (const table of tables) db[table] = await pgStore.readTable(table);
      return db;
    }
    await mkdir(config.dataDir, { recursive: true });
    if (!existsSync(dbPath)) await writeDb(emptyDb());
    const db = JSON.parse(await readFile(dbPath, "utf8")); let changed = false;
    for (const table of tables) if (!Array.isArray(db[table])) { db[table] = table === "profiles" ? defaultUsers : []; changed = true; }
    changed = syncDefaultUsers(db) || changed;
    for (const user of db.profiles) { if (user.password) { user.password_hash = hashPasswordLegacy(user.password); delete user.password; changed = true; } if (!user.created_at) { user.created_at = new Date().toISOString(); changed = true; } }
    if (changed) await writeDb(db); return db;
  }
  async function writeDb(db) {
    if (pgPool) {
      await ensurePg();
      await pgStore.replaceAll(db);
      return;
    }
    await mkdir(config.dataDir, { recursive: true }); await writeFile(dbPath, JSON.stringify(db, null, 2));
  }
  let jsonWriteLock = Promise.resolve();
  async function withJsonWriteLock(fn) { const run = jsonWriteLock.then(fn, fn); jsonWriteLock = run.catch(() => {}); return run; }
  async function persistRow(db, table, row) { if (pgPool) { await ensurePg(); await pgStore.upsertRow(table, row); return; } await withJsonWriteLock(async () => { const latest = await readDb(); const index = latest[table].findIndex((r) => String(r.id) === String(row.id)); latest[table][index >= 0 ? index : latest[table].length] = row; await writeDb(latest); }); }
  async function persistDelete(db, table, id) { if (pgPool) { await ensurePg(); await pgStore.deleteRow(table, id); return; } await withJsonWriteLock(async () => { const latest = await readDb(); latest[table] = latest[table].filter((r) => String(r.id) !== String(id)); await writeDb(latest); }); }
  function authToken(request) { return (request.headers.authorization || "").replace(/^Bearer\s+/i, ""); }
  function loginRateKey(request, email) { return `${request.ip || request.socket?.remoteAddress || "unknown"}:${String(email || "").toLowerCase()}`; }
  function checkLoginRate(request, email) { const key = loginRateKey(request, email); const now = Date.now(); const current = loginAttempts.get(key); if (current?.blockedUntil > now) return false; if (!current || current.resetAt <= now) loginAttempts.set(key, { count: 0, resetAt: now + 15 * 60 * 1000, blockedUntil: 0 }); return true; }
  function recordLoginAttempt(request, email, success) { const key = loginRateKey(request, email); if (success) { loginAttempts.delete(key); return; } const now = Date.now(); const current = loginAttempts.get(key) || { count: 0, resetAt: now + 15 * 60 * 1000, blockedUntil: 0 }; current.count += 1; if (current.count >= 5) current.blockedUntil = now + 15 * 60 * 1000; loginAttempts.set(key, current); }
  function tokenUser(request, db) { const token = authToken(request); const session = verifySessionToken(token); if (!session) return null; return db.profiles.find((u) => u.id === session.userId && u.status !== "tidak_aktif") || null; }
  function publicUser(user) { const { password, password_hash, ...safe } = user; return { ...safe, fullName: safe.full_name, createdAt: safe.created_at }; }
  async function upgradeProfilePassword(db, userId, password) { const index = db.profiles.findIndex((u) => String(u.id) === String(userId)); if (index < 0) return null; db.profiles[index] = { ...db.profiles[index], password_hash: await hashPasswordModern(password), updated_at: new Date().toISOString() }; await persistRow(db, "profiles", db.profiles[index]); return publicUser(db.profiles[index]); }
  async function saveProfilePassword(db, userId, password) { if (!password || String(password).length < 8) throw new Error("Password minimal 8 karakter."); const index = db.profiles.findIndex((u) => String(u.id) === String(userId)); if (index < 0) throw new Error("User tidak ditemukan."); db.profiles[index] = { ...db.profiles[index], password_hash: await hashPasswordModern(password), updated_at: new Date().toISOString() }; await persistRow(db, "profiles", db.profiles[index]); return publicUser(db.profiles[index]); }
  function cleanText(value, max = 500) { return String(value ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max); }
  function cleanNumber(value, min = 0) { const number = Number(value || 0); if (!Number.isFinite(number) || number < min) throw new Error("Nominal tidak valid."); return number; }
  function cleanDate(value) { const text = cleanText(value, 20); if (text && !/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("Tanggal tidak valid."); return text; }
  async function normalizeProfile(row, existing = {}) { const next = { ...existing, ...row }; delete next.password; if (row.password && String(row.password).length >= 8) next.password_hash = await hashPasswordModern(row.password); if (!next.password_hash && !existing.password_hash) next.password_hash = await hashPasswordModern("changeme123"); next.username = cleanText(next.username || next.user_name || next.login || next.id, 80).toLowerCase(); next.email = String(next.email || "").trim().toLowerCase(); next.full_name = String(next.full_name || next.fullName || next.username || next.email || "User").trim(); next.role = roles.includes(next.role) ? next.role : "petugas"; next.status = statuses.includes(next.status) ? next.status : "aktif"; next.created_at = next.created_at || new Date().toISOString(); return next; }
  async function sanitizeRow(table, row, existing = {}) { if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("Data tidak valid."); if (table === "profiles") return normalizeProfile(row, existing); const next = { ...existing, ...row }; if (["pengambilan_koin", "setoran_petugas", "setoran_lazisnu", "penyaluran_dana"].includes(table)) next.nominal = cleanNumber(next.nominal ?? next.amount ?? 0); if (table === "pengambilan_koin") { if (!next.donatur_id || !next.petugas_id) throw new Error("Donatur dan petugas wajib diisi."); next.tanggal = cleanDate(next.tanggal); next.metode_pembayaran = cleanText(next.metode_pembayaran || "Tunai", 40); next.status_verifikasi = cleanText(next.status_verifikasi || "Menunggu Verifikasi", 40); next.catatan_petugas = cleanText(next.catatan_petugas, 1000); } if (table === "donatur") { next.nama_kk = cleanText(next.nama_kk, 160); if (!next.nama_kk) throw new Error("Nama donatur wajib diisi."); next.phone = cleanText(next.phone, 40); next.alamat = cleanText(next.alamat, 500); next.status = statuses.includes(next.status) ? next.status : "aktif"; } if (["berita", "artikel"].includes(table)) { next.judul = cleanText(next.judul, 180); next.slug = cleanText(next.slug || next.judul.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""), 180); next.ringkasan = cleanText(next.ringkasan || next.excerpt, 500); next.konten = cleanText(next.konten, 12000); next.status = ["published", "draft"].includes(next.status) ? next.status : "draft"; if (!next.judul || !next.ringkasan || !next.konten) throw new Error("Berita wajib lengkap."); } if (["pengumuman", "kegiatan", "umkm", "download", "program_kerja", "lpj_kegiatan", "dokumen_publik"].includes(table)) { next.status = ["published", "draft", "aktif", "nonaktif"].includes(next.status) ? next.status : "draft"; if (next.slug) next.slug = cleanText(next.slug, 180); } if (table === "kontak_masuk") next.status = cleanText(next.status || "baru", 40); next.updated_at = new Date().toISOString(); return next; }
  function isAdminRole(role) { return role === "super_admin" || role === "admin"; }
  function canRead(user, table) { if (publicPortalTables.includes(table)) return true; return Boolean(user); }
  function canWrite(user, table) { if (!user) return false; if (user.role === "super_admin") return true; if (user.role === "admin") return true; if (user.role === "editor_berita") return ["berita", "artikel", "dokumentasi_kegiatan", "kegiatan", "download"].includes(table); if (user.role === "bendahara") return !["profiles", "petugas", "settings", "kontak_masuk"].includes(table); if (user.role === "pengurus") return ["dokumentasi_kegiatan", "berita", "artikel", "kegiatan"].includes(table); if (user.role === "petugas") return ["pengambilan_koin", "setoran_petugas"].includes(table); return false; }
  function publicStatus(row) { return row.status_publikasi || row.status || "published"; }
  function publishedRows(rows) { return rows.filter((r) => ["published", "aktif", "Disalurkan"].includes(publicStatus(r))); }
  function safePublicRows(table, rows, user) { if (user) return table === "profiles" ? rows.map(publicUser) : rows; if (table === "berita") return publishedRows(rows).map((r) => ({ id: r.id, judul: r.judul, slug: r.slug, kategori: r.kategori, tanggal: r.tanggal, ringkasan: r.ringkasan, konten: r.konten, gambar_url: r.gambar_url, gambar_nama: r.gambar_nama, status: r.status, organisasi: r.organisasi })); if (table === "artikel") return publishedRows(rows).map((r) => ({ id: r.id, judul: r.judul, slug: r.slug, kategori: r.kategori, published_at: r.published_at, ringkasan: r.ringkasan || r.excerpt, konten: r.konten, meta_title: r.meta_title, meta_description: r.meta_description, og_image: r.og_image, status: r.status })); if (table === "kegiatan") return publishedRows(rows).map((r) => ({ id: r.id, judul: r.judul, slug: r.slug, kategori: r.kategori, tanggal_mulai: r.tanggal_mulai, tanggal_selesai: r.tanggal_selesai, lokasi: r.lokasi, deskripsi: r.deskripsi, foto_url: r.foto_url, status: r.status, organisasi: r.organisasi })); if (table === "umkm") return publishedRows(rows).map((r) => ({ id: r.id, nama_usaha: r.nama_usaha, slug: r.slug, pemilik: r.pemilik, alamat: r.alamat, whatsapp: r.whatsapp, produk: r.produk, foto_url: r.foto_url, kategori: r.kategori, deskripsi: r.deskripsi, status: r.status })); if (table === "download") return publishedRows(rows).map((r) => ({ id: r.id, judul: r.judul, slug: r.slug, kategori: r.kategori, file_url: r.file_url, file_name: r.file_name, download_count: r.download_count || 0, status: r.status })); if (table === "pengumuman") return publishedRows(rows).map((r) => ({ id: r.id, judul: r.judul, isi: r.isi, tanggal_mulai: r.tanggal_mulai, tanggal_selesai: r.tanggal_selesai, prioritas: r.prioritas, status: r.status })); if (table === "layanan_kematian") return publishedRows(rows).map((r) => ({ id: r.id, nama_almarhum: r.nama_almarhum, alamat: r.alamat, hari_wafat: r.hari_wafat, rumah_duka: r.rumah_duka, kontak_keluarga: r.kontak_keluarga, status_publikasi: r.status_publikasi })); if (table === "masjid_mushola") return publishedRows(rows).map((r) => ({ id: r.id, nama: r.nama, jenis: r.jenis, alamat: r.alamat, takmir: r.takmir, kontak: r.kontak, status: r.status })); if (table === "dokumentasi_kegiatan") return rows.map((r) => ({ id: r.id, judul: r.judul, kategori: r.kategori, tanggal: r.tanggal, foto_url: r.foto_url, foto_nama: r.foto_nama, organisasi: r.organisasi })); if (table === "penyaluran_dana") return rows.filter((r) => r.status === "Disalurkan").map((r) => ({ id: r.id, tanggal: r.tanggal, kategori_bantuan: r.kategori_bantuan, nominal: r.nominal, sumber_dana: r.sumber_dana, status: r.status, keterangan: r.keterangan, dokumentasi_url: r.dokumentasi_url, dokumentasi_nama: r.dokumentasi_nama })); if (table === "pengurus") return rows.filter((r) => r.status !== "tidak_aktif").map((r) => ({ id: r.id, nama: r.nama, jabatan: r.jabatan, foto_url: r.foto_url, status: r.status, organisasi: r.organisasi })); if (table === "ranting_profile") return rows.map((r) => ({ id: r.id, nama_ranting: r.nama_ranting, desa: r.desa, kecamatan: r.kecamatan, kabupaten: r.kabupaten, provinsi: r.provinsi, alamat_sekretariat: r.alamat_sekretariat, email: r.email, phone: r.phone, masa_khidmah: r.masa_khidmah, logo_url: r.logo_url })); return []; }
  function safeUploadFolder(folder = "general") { return String(folder).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "general"; }
  function safeUploadName(name = "file") { return String(name).toLowerCase().replace(/[^a-z0-9. -]+/g, "").replace(/\.\.+/g, ".").replace(/\s+/g, "-").replace(/^-+|-+$/g, "").replace(/^\.+|\.+$/g, "") || "file"; }
  function detectedImageType(buffer) { if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg"; if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png"; if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp"; return ""; }
  async function upload(body, user) { if (!user) return { status: 403, body: { error: "Akses ditolak" } }; const match = String(body?.dataUrl || "").match(/^data:([^;]+);base64,(.+)$/); const type = String(body?.type || match?.[1] || "").toLowerCase(); if (!allowedUploadTypes.has(type)) return { status: 400, body: { error: "Format foto harus JPG, PNG, atau WEBP." } }; if (!match) return { status: 400, body: { error: "Data foto tidak valid." } }; const buffer = Buffer.from(match[2], "base64"); if (!buffer.length || buffer.length > config.maxBodyBytes) return { status: 400, body: { error: "Ukuran foto maksimal 2 MB." } }; const detectedType = detectedImageType(buffer); if (detectedType !== type) return { status: 400, body: { error: "Data foto tidak sesuai format." } }; const ext = allowedUploadTypes.get(type); const folder = safeUploadFolder(body?.folder); const base = safeUploadName(body?.name).replace(/\.(jpe?g|png|webp)$/i, ""); const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${base}.${ext}`; const dir = path.join(config.uploadsDir, folder); await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, filename), buffer); const url = `/uploads/${folder}/${filename}`; return { status: 200, body: { name: body?.name || filename, path: url, url, size: buffer.length, type } }; }
  return { pgPool, ensurePg, readDb, writeDb, persistRow, persistDelete, authToken, denyToken, checkLoginRate, recordLoginAttempt, tokenUser, publicUser, upgradeProfilePassword, saveProfilePassword, sanitizeRow, canRead, canWrite, safePublicRows, upload, createSessionToken, sessionTtlMs: config.sessionTtlMs, publicPortalTables, isAdminRole };
}
