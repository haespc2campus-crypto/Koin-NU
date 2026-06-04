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

function buildAuthHook(context) {
  return async function authMiddleware(request, reply) {
    // Skip auth for non-API routes (static files) and public API routes
    const url = request.url.split("?")[0];
    if (!url.startsWith("/api/") || PUBLIC_ROUTES.has(url)) return;

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

  app.get("/api/health", async () => {
    if (context.pgPool) await context.ensurePg();
    return { ok: true, runtime: "fastify", database: context.pgPool ? "postgresql" : "json", time: new Date().toISOString() };
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
    data.profiles = user?.role === "admin" ? db.profiles.map(context.publicUser) : [];
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
      if (table === "profiles" && !requireRole(user, ["admin"], reply)) return;
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
