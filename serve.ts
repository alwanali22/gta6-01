// serve.ts — static file server for local play + headless probes. Node only.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const args = process.argv.slice(2);
let port = 8080;
const pi = args.indexOf('--port');
if (pi >= 0 && args[pi + 1]) port = Number(args[pi + 1]);

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/game/index.html';
    else if (!path.startsWith('/game/') && !path.startsWith('/screenshots/')) path = '/game' + path;
    const file = normalize(join(process.cwd(), path));
    if (!file.startsWith(process.cwd())) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, () => console.log('serving on port ' + port));
