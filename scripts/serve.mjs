// Local preview only. The published website needs no server runtime.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".pdf": "application/pdf", ".ico": "image/x-icon", ".ttf": "font/ttf", ".woff2": "font/woff2" };

export function createPreviewServer({ basePath = "/" } = {}) {
  if (!basePath.startsWith("/") || !basePath.endsWith("/")) throw new Error("basePath должен начинаться и заканчиваться символом /");
  return createServer(async (request, response) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) {
        response.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
      }
      const url = new URL(request.url, "http://localhost");
      const pathname = decodeURIComponent(url.pathname);
      if (!pathname.startsWith(basePath)) { response.writeHead(404).end("Not found"); return; }
      const relative = pathname.slice(basePath.length);
      if (relative.split(/[\\/]/).some(part => part.startsWith("."))) { response.writeHead(403).end("Forbidden"); return; }
      let filename = resolve(root, relative || "index.html");
      if (!filename.startsWith(root + sep)) { response.writeHead(403).end("Forbidden"); return; }
      const info = await stat(filename);
      if (info.isDirectory()) filename = resolve(filename, "index.html");
      const data = await readFile(filename);
      response.writeHead(200, { "Content-Type": types[extname(filename)] || "application/octet-stream", "Content-Length": data.length, "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
      response.end(request.method === "HEAD" ? undefined : data);
    } catch (error) {
      response.writeHead(error.code === "ENOENT" || error.code === "ENOTDIR" ? 404 : 400).end("Not found");
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  const port = Number(option("--port", "4173"));
  const basePath = option("--base", "/");
  const server = createPreviewServer({ basePath });
  server.on("error", error => { console.error(`Не удалось запустить сервер: ${error.message}`); process.exitCode = 1; });
  server.listen(port, "127.0.0.1", () => console.log(`Local: http://127.0.0.1:${port}${basePath}\nОстановка: Ctrl+C`));
}
