// Tiny static server for local play and shots: serves the repository
// root so game/ loads offline exactly as the grader serves it.
// Run: node serve.ts — then open http://localhost:8080/game/
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const root = new URL(".", import.meta.url).pathname;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".ts": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

const server = createServer(async (req, res) => {
  const rawPath = decodeURIComponent(new URL(req.url || "/", "http://x").pathname);
  const path = rawPath === "/" ? "/game/index.html" : rawPath.endsWith("/") ? `${rawPath}index.html` : rawPath;
  const file = join(root, path);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end("no");
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(8080, () => console.log("serving at http://localhost:8080/game/"));
