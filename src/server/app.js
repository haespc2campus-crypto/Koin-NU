import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { getServerConfig } from "./config.js";
import { createApiContext } from "./core.js";
import { registerApiRoutes } from "./routes.js";

export async function buildServer(config = getServerConfig()) {
  const app = Fastify({
    logger: true,
    bodyLimit: config.maxBodyBytes
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: false });

  app.setErrorHandler((error, request, reply) => {
    const status = error.statusCode || (/Data|Nominal|Tanggal|wajib|valid|lengkap/i.test(error.message) ? 400 : 500);
    request.log.error(error);
    reply.code(status).send({ error: status >= 500 ? "Terjadi kesalahan server." : error.message });
  });

  await registerApiRoutes(app, createApiContext(config));

  await mkdir(config.uploadsDir, { recursive: true });

  await app.register(fastifyStatic, {
    root: config.uploadsDir,
    prefix: "/uploads/",
    decorateReply: false
  });

  const staticRoot = path.join(config.root, "dist");
  await app.register(fastifyStatic, {
    root: staticRoot,
    prefix: "/",
    decorateReply: true
  });

  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/")) return reply.code(404).send({ error: "API tidak ditemukan" });
    return reply.sendFile("index.html");
  });

  return app;
}
