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

// 배포 직후에는 새 파일이 전 세계 서버에 퍼지는 데 몇 초가 걸린다 (2026-09-26 실제로 index.html 이
// 한 번 옛것으로 왔다가 곧 새것이 됐다). 다르면 잠깐 기다렸다 다시 본다 — 끝까지 다를 때만 실패다.
const TRIES = 6,
  WAIT_MS = +process.env.VERIFY_WAIT_MS || 10000;
const sameAsRepo = async (f) => {
  const url = BASE + '/' + (f === 'index.html' ? '' : f) + '?verify=' + Date.now();
  // 응답이 없으면 끝없이 기다리지 않는다 — 20초 넘으면 이번에는 「다름」으로 친다
  let res, got;
  try {
    res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    got = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return { ok: false, status: e.name === 'TimeoutError' ? '시간 초과' : e.message };
  }
  return { ok: res.ok && got.equals(readFileSync(join(APP, f))), status: res.status };
};
let left = files.sort();
for (let t = 1; t <= TRIES && left.length; t++) {
  if (t > 1) {
    console.log(`… ${left.length}개가 아직 다르다 — ${WAIT_MS / 1000}초 뒤 다시 (${t}/${TRIES})`);
    await new Promise((r) => setTimeout(r, WAIT_MS));
  }
  const still = [];
  for (const f of left) {
    const r = await sameAsRepo(f);
    if (!r.ok) still.push(f + ` (${r.status})`);
  }
  left = still.map((x) => x.replace(/ \(\d+\)$/, ''));
  if (t === TRIES) still.forEach((x) => console.log('✗ ' + x));
}
const bad = left.length;
console.log(
  bad ? `\n${bad}개 파일이 저장소와 다르다` : `${files.length}개 파일 모두 저장소와 같다 ✓`
);
process.exit(bad ? 1 : 0);
