import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 5173);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const cleanPath = decodeURIComponent(url.pathname);
  const requestedFile = cleanPath === "/" ? "index.html" : cleanPath.slice(1);
  const filePath = path.resolve(root, requestedFile);
  const relativePath = path.relative(root, filePath);
  const safePath = relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath)
    ? filePath
    : path.join(root, "index.html");
  const publicPath = path.resolve(root, "public", requestedFile);
  const publicRelativePath = path.relative(path.join(root, "public"), publicPath);
  const safePublicPath = publicRelativePath && !publicRelativePath.startsWith("..") && !path.isAbsolute(publicRelativePath)
    ? publicPath
    : "";
  const vendorFiles = {
    "vendor/qrcode.js": "node_modules/qrcode-generator/dist/qrcode.js",
    "vendor/html5-qrcode.min.js": "node_modules/html5-qrcode/html5-qrcode.min.js"
  };
  const vendorPath = vendorFiles[requestedFile] ? path.join(root, vendorFiles[requestedFile]) : "";
  const target = existsSync(safePath) && !safePath.endsWith(path.sep)
    ? safePath
    : safePublicPath && existsSync(safePublicPath) && !safePublicPath.endsWith(path.sep)
      ? safePublicPath
      : vendorPath && existsSync(vendorPath)
        ? vendorPath
        : path.join(root, "index.html");

  try {
    const data = await readFile(target);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(target)] || "application/octet-stream"
    });
    response.end(data);
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Aplikasi belum bisa dimuat.");
  }
});

server.listen(port, () => {
  console.log(`Koin NU Ranting berjalan di http://localhost:${port}`);
});
