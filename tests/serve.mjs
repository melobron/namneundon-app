// 배포 파일을 그대로 내주되 --all 에서는 두 사이트 사이 링크만 로컬로 바꾼다.
import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { extname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

function inside(root, file) {
  const path = relative(root, file);
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

/** 지정한 공개 폴더만 제공한다. 거래내역이나 저장소 설정은 제공하지 않는다. */
export function siteServer(root, links = {}) {
  return createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = resolve(root, '.' + (path.endsWith('/') ? path + 'index.html' : path));
    if (!inside(root, file)) {
      res.writeHead(403).end();
      return;
    }
    try {
      // 심볼릭 링크로 공개 폴더 밖 자료가 노출되지 않게 실제 경로도 확인한다.
      if (!inside(await realpath(root), await realpath(file))) {
        res.writeHead(403).end();
        return;
      }
      let body = await readFile(file);
      if (extname(file) === '.html') {
        let html = body.toString('utf8');
        for (const [remote, local] of Object.entries(links)) html = html.replaceAll(remote, local);
        body = Buffer.from(html);
      }
      res.writeHead(200, {
        'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 4173;
  const landingPort = Number(process.env.LANDING_PORT) || 4174;
  const all = process.argv.includes('--all');
  const links = all
    ? {
        'https://app.namneundon.com': `http://localhost:${port}`,
        'https://namneundon.com': `http://localhost:${landingPort}`
      }
    : {};
  const servers = [];
  const sites = [{ folder: 'app', sitePort: port }];
  if (all) sites.push({ folder: 'landing', sitePort: landingPort });
  for (const { folder, sitePort } of sites) {
    const root = fileURLToPath(new URL(`../${folder}/`, import.meta.url));
    const server = siteServer(root, links);
    servers.push(server);
    server.on('error', (error) => {
      console.error(`${folder} 서버 시작 실패: ${error.message}`);
      for (const running of servers) running.close();
      process.exitCode = 1;
    });
    // VDI 안에서만 확인하는 서버이므로 외부 네트워크에는 열지 않는다.
    server.listen(sitePort, '127.0.0.1', () =>
      console.log(`${folder} → http://localhost:${sitePort}`)
    );
  }
}
