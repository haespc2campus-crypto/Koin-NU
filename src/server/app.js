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

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https://api.aladhan.com"],
        mediaSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    }
  });
  await app.register(cors, { origin: false });

  app.setErrorHandler((error, request, reply) => {
    let status = error.statusCode || 500;
    if (status === 500 && (error.validation || /^(Data|Nominal|Tanggal|Password|Nama|Berita|Donatur|User) /i.test(error.message))) status = 400;
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
