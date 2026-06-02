import crypto from "node:crypto";
import { tables } from "./core.js";
import { isLegacyPasswordHash, verifyPassword } from "./password.js";
import { parse, schemas } from "./validation.js";

function send(reply, status, body) {
  return reply.code(status).header("Cache-Control", "no-store").send(body);
}

export async function registerApiRoutes(app, context) {
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
    const token = crypto.randomBytes(32).toString("base64url");
    context.sessions.set(token, { userId: user.id, expiresAt: Date.now() + context.sessionTtlMs });
    return { token, user: responseUser, expiresIn: Math.floor(context.sessionTtlMs / 1000) };
  });

  app.route({ method: ["GET", "POST"], url: "/api/logout", handler: async (request) => {
    context.sessions.delete(context.authToken(request));
    return { ok: true };
  }});

  app.post("/api/change-password", async (request, reply) => {
    const db = await context.readDb();
    const user = context.tokenUser(request, db);
    if (!user) return send(reply, 403, { error: "Akses ditolak" });
    const body = parse(schemas.changePassword, request.body);
    if (!(await verifyPassword(body.currentPassword, user.password_hash))) return send(reply, 401, { error: "Password lama tidak sesuai." });
    await context.saveProfilePassword(db, user.id, body.newPassword);
    return { ok: true };
  });

  app.post("/api/admin/reset-password", async (request, reply) => {
    const db = await context.readDb();
    const user = context.tokenUser(request, db);
    if (user?.role !== "admin") return send(reply, 403, { error: "Akses ditolak" });
    const body = parse(schemas.resetPassword, request.body);
    await context.saveProfilePassword(db, body.userId, body.newPassword);
    return { ok: true };
  });

  app.post("/api/upload", async (request, reply) => {
    const db = await context.readDb();
    const body = parse(schemas.upload, request.body);
    const result = await context.upload(body, context.tokenUser(request, db));
    return send(reply, result.status, result.body);
  });

  app.get("/api/db", async (request) => {
    const db = await context.readDb();
    const user = context.tokenUser(request, db);
    const data = {};
    for (const t of tables) data[t] = context.canRead(user, t) ? context.safePublicRows(t, db[t], user) : [];
    data.profiles = user?.role === "admin" ? db.profiles.map(context.publicUser) : [];
    return data;
  });

  app.route({ method: ["GET", "POST", "DELETE"], url: "/api/table/:table/:id?", handler: async (request, reply) => {
    const { table, id } = parse(schemas.tableParams, request.params);
    const db = await context.readDb();
    const user = context.tokenUser(request, db);
    if (request.method === "GET") {
      if (table === "profiles" && user?.role !== "admin") return send(reply, 403, { error: "Akses ditolak" });
      if (!context.canRead(user, table)) return send(reply, 403, { error: "Akses ditolak" });
      return context.safePublicRows(table, db[table], user);
    }
    if (!context.canWrite(user, table)) return send(reply, 403, { error: "Akses ditolak" });
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
