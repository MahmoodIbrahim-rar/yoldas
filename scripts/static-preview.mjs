import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

createServer(async (request, response) => {
  const relativePath = decodeURIComponent(new URL(request.url, "http://localhost").pathname).replace(/^\/+/, "") || "index.html";
  const filePath = normalize(join(root, relativePath));
  if (!filePath.startsWith(root)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(4180, "0.0.0.0", () => console.log("Yoldas static preview on http://0.0.0.0:4180"));
