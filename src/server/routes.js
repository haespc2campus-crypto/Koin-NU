import crypto from "node:crypto";
import { tables } from "./core.js";
import { isLegacyPasswordHash, verifyPassword } from "./password.js";
import { parse, schemas } from "./validation.js";

function send(reply, status, body) {
  return reply.code(status).header("Cache-Control", "no-store").send(body);
}

// === Auth Middleware ===
// Routes that don't require authentication
const PUBLIC_ROUTES = new Set(["/api/health", "/api/login", "/api/logout", "/api/db"]);
const SITE_URL = "https://nukarangsalam2.com";

function xmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function slugOf(item, fallbackPrefix) {
  return item.slug || String(item.judul || item.nama_usaha || item.id || fallbackPrefix)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function byNewestDate(a, b) {
  const left = a.published_at || a.tanggal_mulai || a.tanggal || a.created_at || "";
  const right = b.published_at || b.tanggal_mulai || b.tanggal || b.created_at || "";
  return String(right).localeCompare(String(left));
}

function sumNominal(rows = []) {
  return rows.reduce((total, row) => total + Number(row.nominal || row.amount || 0), 0);
}

function findBySlug(rows, slug, fallbackPrefix) {
  return rows.find((item) => slugOf(item, fallbackPrefix) === slug);
}

function buildAuthHook(context) {
  return async function authMiddleware(request, reply) {
    // Skip auth for non-API routes (static files) and public API routes
    const url = request.url.split("?")[0];
    if (!url.startsWith("/api/") || PUBLIC_ROUTES.has(url) || url.startsWith("/api/public/")) return;

    const db = await context.readDb();
    const user = context.tokenUser(request, db);
    if (!user) {
      if (url.startsWith("/api/table/")) {
        request.authUser = null;
        request.authDb = db;
        return;
      }
      return send(reply, 401, { error: "Token tidak valid atau sudah kedaluwarsa. Silakan login ulang." });
    }
    // Attach user and db to request for downstream handlers
    request.authUser = user;
    request.authDb = db;
  };
}

// === RBAC Helper ===
function requireRole(user, allowedRoles, reply) {
  if (!user) {
    send(reply, 401, { error: "Akses ditolak. Silakan login." });
    return false;
  }
  if (!allowedRoles.includes(user.role)) {
    send(reply, 403, { error: `Akses ditolak. Hanya ${allowedRoles.join(", ")} yang diizinkan.` });
    return false;
  }
  return true;
}

export async function registerApiRoutes(app, context) {

  // --- Global Auth Middleware ---
  // Every /api/* request passes through this hook BEFORE reaching the handler.
  // Public routes are whitelisted; everything else requires a valid token.
  app.addHook("onRequest", buildAuthHook(context));

  // --- Public Routes (no auth required) ---

  app.get("/robots.txt", async (request, reply) => {
    const body = [
      "User-agent: *",
      "Disallow: /admin",
      "Disallow: /login",
      "Disallow: /dashboard",
      "Disallow: /donatur",
      "Disallow: /petugas",
      "Disallow: /pengambilan-koin",
      "Disallow: /verifikasi",
      "Disallow: /setoran-petugas",
      "Disallow: /setor-lazisnu",
      "Disallow: /penyaluran-dana",
      "Disallow: /laporan",
      "Disallow: /users",
      "Disallow: /pengaturan",
      "Disallow: /api/",
      "Allow: /api/public/",
      `Sitemap: ${SITE_URL}/sitemap.xml`,
      ""
    ].join("\n");
    return reply.type("text/plain; charset=utf-8").send(body);
  });

  app.get("/sitemap.xml", async (request, reply) => {
    const db = await context.readDb();
    const publicData = {};
    for (const table of context.publicPortalTables) {
      publicData[table] = context.safePublicRows(table, db[table] || [], null);
    }
    const urls = [
      { loc: "/", priority: "1.0" },
      { loc: "/profil", priority: "0.8" },
      { loc: "/kegiatan", priority: "0.8" },
      { loc: "/layanan-warga", priority: "0.8" },
      { loc: "/koin-nu", priority: "0.8" },
      { loc: "/umkm", priority: "0.8" },
      { loc: "/artikel", priority: "0.8" },
      { loc: "/transparansi", priority: "0.8" },
      { loc: "/download", priority: "0.7" },
      { loc: "/kontak", priority: "0.7" },
      ...publicData.berita.map((item) => ({ loc: `/berita/${slugOf(item, "berita")}`, priority: "0.7" })),
      ...publicData.artikel.map((item) => ({ loc: `/artikel/${slugOf(item, "artikel")}`, priority: "0.7" })),
      ...publicData.kegiatan.map((item) => ({ loc: `/kegiatan/${slugOf(item, "kegiatan")}`, priority: "0.7" })),
      ...publicData.umkm.map((item) => ({ loc: `/umkm/${slugOf(item, "umkm")}`, priority: "0.7" }))
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((item) => `  <url><loc>${SITE_URL}${xmlEscape(item.loc)}</loc><changefreq>weekly</changefreq><priority>${item.priority}</priority></url>`).join("\n")}\n</urlset>\n`;
    return reply.type("application/xml; charset=utf-8").send(xml);
  });

  app.get("/api/health", async () => {
    if (context.pgPool) await context.ensurePg();
    return { ok: true, runtime: "fastify", database: context.pgPool ? "postgresql" : "json", time: new Date().toISOString() };
  });

  app.get("/api/public/home", async () => {
    const db = await context.readDb();
    const berita = context.safePublicRows("berita", db.berita, null).sort(byNewestDate).slice(0, 6);
    const artikel = context.safePublicRows("artikel", db.artikel, null).sort(byNewestDate).slice(0, 6);
    const kegiatan = context.safePublicRows("kegiatan", db.kegiatan, null).sort(byNewestDate).slice(0, 6);
    const pengumuman = context.safePublicRows("pengumuman", db.pengumuman, null).sort(byNewestDate).slice(0, 5);
    const umkm = context.safePublicRows("umkm", db.umkm, null).slice(0, 8);
    const pickups = db.pengambilan_koin || [];
    const distributions = db.penyaluran_dana || [];
    return {
      pengumuman,
      kegiatan,
      berita,
      artikel,
      umkm,
      statistik: {
        total_pemasukan: sumNominal(pickups.filter((item) => item.status === "Disetujui Bendahara" || item.status_verifikasi === "Disetujui Bendahara")),
        total_penyaluran: sumNominal(distributions.filter((item) => item.status === "Disalurkan")),
        donatur_aktif: (db.donatur || []).filter((item) => item.status !== "tidak_aktif" && item.active !== false).length,
        petugas_aktif: (db.petugas || []).filter((item) => item.status !== "tidak_aktif" && item.active !== false).length
      }
    };
  });

  app.get("/api/public/articles", async () => {
    const db = await context.readDb();
    return context.safePublicRows("artikel", db.artikel, null).sort(byNewestDate);
  });

  app.get("/api/public/articles/:slug", async (request, reply) => {
    const db = await context.readDb();
    const rows = context.safePublicRows("artikel", db.artikel, null);
    const item = findBySlug(rows, request.params.slug, "artikel");
    if (!item) return send(reply, 404, { error: "Artikel tidak ditemukan." });
    return item;
  });

  app.get("/api/public/news", async () => {
    const db = await context.readDb();
    return context.safePublicRows("berita", db.berita, null).sort(byNewestDate);
  });

  app.get("/api/public/events", async () => {
    const db = await context.readDb();
    return context.safePublicRows("kegiatan", db.kegiatan, null).sort(byNewestDate);
  });

  app.get("/api/public/events/:slug", async (request, reply) => {
    const db = await context.readDb();
    const rows = context.safePublicRows("kegiatan", db.kegiatan, null);
    const item = findBySlug(rows, request.params.slug, "kegiatan");
    if (!item) return send(reply, 404, { error: "Kegiatan tidak ditemukan." });
    return item;
  });

  app.get("/api/public/umkm", async () => {
    const db = await context.readDb();
    return context.safePublicRows("umkm", db.umkm, null);
  });

  app.get("/api/public/umkm/:slug", async (request, reply) => {
    const db = await context.readDb();
    const rows = context.safePublicRows("umkm", db.umkm, null);
    const item = findBySlug(rows, request.params.slug, "umkm");
    if (!item) return send(reply, 404, { error: "UMKM tidak ditemukan." });
    return item;
  });

  app.get("/api/public/downloads", async () => {
    const db = await context.readDb();
    return context.safePublicRows("download", db.download, null);
  });

  app.get("/api/public/transparency", async () => {
    const db = await context.readDb();
    const income = sumNominal((db.pengambilan_koin || []).filter((item) => item.status === "Disetujui Bendahara" || item.status_verifikasi === "Disetujui Bendahara"));
    const expense = sumNominal((db.penyaluran_dana || []).filter((item) => item.status === "Disalurkan"));
    return {
      total_pemasukan: income,
      total_pengeluaran: expense,
      saldo: income - expense,
      laporan_koin: context.safePublicRows("penyaluran_dana", db.penyaluran_dana, null),
      program_kerja: context.safePublicRows("program_kerja", db.program_kerja, null),
      lpj_kegiatan: context.safePublicRows("lpj_kegiatan", db.lpj_kegiatan, null),
      dokumen_publik: context.safePublicRows("dokumen_publik", db.dokumen_publik, null)
    };
  });

  app.post("/api/public/contact", async (request) => {
    const db = await context.readDb();
    const body = parse(schemas.contactMessage, request.body);
    const item = { id: crypto.randomUUID(), ...body, status: "baru", created_at: new Date().toISOString() };
    db.kontak_masuk.push(item);
    await context.persistRow(db, "kontak_masuk", item);
    return { ok: true };
  });

  app.post("/api/login", async (request, reply) => {
    const db = await context.readDb();
    const { email, password } = parse(schemas.login, request.body);
    if (!context.checkLoginRate(request, email)) return send(reply, 429, { error: "Terlalu banyak percobaan login. Coba lagi nanti." });
    const user = db.profiles.find((u) => u.email === email && u.status !== "tidak_aktif");
    if (!user || !(await verifyPassword(password, user.password_hash))) { context.recordLoginAttempt(request, email, false); return send(reply, 401, { error: "Email atau password tidak sesuai." }); }
    context.recordLoginAttempt(request, email, true);
    const responseUser = isLegacyPasswordHash(user.password_hash) ? await context.upgradeProfilePassword(db, user.id, password) : context.publicUser(user);
    const expiresAt = Date.now() + context.sessionTtlMs;
    const token = context.createSessionToken({ userId: user.id, expiresAt });
    return { token, user: responseUser, expiresIn: Math.floor(context.sessionTtlMs / 1000) };
  });

  app.route({ method: ["GET", "POST"], url: "/api/logout", handler: async (request) => {
    const token = context.authToken(request);
    if (token) context.denyToken(token);
    return { ok: true };
  }});

  // Semi-public: returns public-safe data for anonymous, full data for authenticated users
  app.get("/api/db", async (request) => {
    const db = await context.readDb();
    const user = context.tokenUser(request, db);
    const data = {};
    for (const t of tables) {
      if (context.canRead(user, t)) data[t] = context.safePublicRows(t, db[t], user);
    }
    data.profiles = context.isAdminRole(user?.role) ? db.profiles.map(context.publicUser) : [];
    return data;
  });

  // --- Authenticated Routes (middleware enforces token) ---

  app.post("/api/change-password", async (request, reply) => {
    const user = request.authUser;
    const db = request.authDb;
    const body = parse(schemas.changePassword, request.body);
    if (!(await verifyPassword(body.currentPassword, user.password_hash))) return send(reply, 401, { error: "Password lama tidak sesuai." });
    await context.saveProfilePassword(db, user.id, body.newPassword);
    return { ok: true };
  });

  // Admin-only: reset another user's password
  app.post("/api/admin/reset-password", async (request, reply) => {
    if (!requireRole(request.authUser, ["admin"], reply)) return;
    const db = request.authDb;
    const body = parse(schemas.resetPassword, request.body);
    await context.saveProfilePassword(db, body.userId, body.newPassword);
    return { ok: true };
  });

  app.post("/api/upload", async (request, reply) => {
    const user = request.authUser;
    const body = parse(schemas.upload, request.body);
    const result = await context.upload(body, user);
    return send(reply, result.status, result.body);
  });

  // --- RBAC-Protected CRUD Routes ---

  app.get("/api/me", async (request) => {
    return context.publicUser(request.authUser);
  });

  app.route({ method: ["GET", "POST", "DELETE"], url: "/api/table/:table/:id?", handler: async (request, reply) => {
    const { table, id } = parse(schemas.tableParams, request.params);
    const db = request.authDb || await context.readDb();
    const user = request.authUser;

    if (request.method === "GET") {
      if (!context.canRead(user, table)) return send(reply, 403, { error: "Akses ditolak" });
      // Profile listing requires admin
      if (table === "profiles" && !requireRole(user, ["super_admin", "admin"], reply)) return;
      return context.safePublicRows(table, db[table], user);
    }

    // POST and DELETE require write permission (RBAC enforced)
    if (!context.canWrite(user, table)) {
      const roleNames = { admin: "Administrator", bendahara: "Bendahara", petugas: "Petugas", pengurus: "Pengurus" };
      return send(reply, 403, { error: `${roleNames[user?.role] || "Anda"} tidak memiliki akses untuk mengubah data ${table}.` });
    }

    if (request.method === "DELETE") {
      db[table] = db[table].filter((r) => String(r.id) !== String(id));
      await context.persistDelete(db, table, id);
      return { ok: true };
    }

    const parsedBody = parse(schemas.tableBody, request.body);
    const list = Array.isArray(parsedBody) ? parsedBody : [parsedBody];
    const saved = [];
    for (const row of list) {
      if (!row.id) row.id = crypto.randomUUID();
      const index = db[table].findIndex((r) => String(r.id) === String(row.id));
      const next = await context.sanitizeRow(table, row, index >= 0 ? db[table][index] : {});
      db[table][index >= 0 ? index : db[table].length] = next;
      await context.persistRow(db, table, next);
      saved.push(table === "profiles" ? context.publicUser(next) : next);
    }
    return saved;
  }});
}
