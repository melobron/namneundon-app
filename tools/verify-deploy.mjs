// 배포 확인 — 운영 주소가 내주는 파일이 저장소의 app/ 과 한 바이트도 다르지 않은가.
// 배포가 취소·누락되면 여기서 걸린다. 사용: node tools/verify-deploy.mjs [주소]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'https://app.namneundon.com';
const APP = fileURLToPath(new URL('../app/', import.meta.url));
const SKIP = new Set(['_headers', '.assetsignore', '.DS_Store']); // Cloudflare 가 내주지 않는 파일

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (!SKIP.has(f)) files.push(relative(APP, p));
  }
})(APP);

let bad = 0;
for (const f of files.sort()) {
  const url = BASE + '/' + (f === 'index.html' ? '' : f) + '?verify=' + Date.now();
  const res = await fetch(url, { cache: 'no-store' });
  const got = Buffer.from(await res.arrayBuffer());
  const same = res.ok && got.equals(readFileSync(join(APP, f)));
  if (!same) {
    bad++;
    console.log(`✗ ${f} (${res.status})`);
  }
}
console.log(
  bad ? `\n${bad}개 파일이 저장소와 다르다` : `${files.length}개 파일 모두 저장소와 같다 ✓`
);
process.exit(bad ? 1 : 0);
