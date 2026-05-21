import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".bin": "application/octet-stream"
};

createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let file = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[\\/])+/, "");
  if (file === "/" || file === "\\") file = "index.html";
  if (file.startsWith("/") || file.startsWith("\\")) file = file.slice(1);
  const abs = join(root, file);

  if (!existsSync(abs) || !statSync(abs).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "content-type": types[extname(abs).toLowerCase()] || "application/octet-stream",
    "cache-control": "no-store"
  });
  createReadStream(abs).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`GNN slides: http://127.0.0.1:${port}/`);
});
