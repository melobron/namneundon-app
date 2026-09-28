// 폐쇄망에서도 운영 파일을 그대로 확인한다. 주소 치환은 응답에만 적용한다.
import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};

export function makeServer(folder) {
  const base = resolve(ROOT, folder);
  return createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = await realpath(
        resolve(base, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname))
      );
      if (!file.startsWith(base + sep)) {
        res.writeHead(403).end();
        return;
      }
      let body = await readFile(file);
      if (extname(file) === '.html') {
        body = Buffer.from(
          body
            .toString()
            .replaceAll('https://app.namneundon.com', 'http://localhost:4173')
            .replaceAll('https://namneundon.com', 'http://localhost:4174')
        );
      }
      res.writeHead(200, {
        'Content-Type': types[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
}

export async function startServers() {
  const servers = [];
  try {
    for (const [folder, port] of [
      ['app', 4173],
      ['landing', 4174]
    ]) {
      const server = makeServer(String(folder));
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(Number(port), '127.0.0.1', () => resolve(undefined));
      });
      servers.push(server);
      console.log(`${folder}: http://localhost:${port}`);
    }
    return servers;
  } catch (error) {
    for (const server of servers) server.close();
    throw error;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await startServers();
}
