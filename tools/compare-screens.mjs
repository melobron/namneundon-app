// @ts-nocheck — 브라우저 안 코드(page.evaluate)가 앱 전역을 쓴다
// 넓은 화면 비교 — 「동작을 안 바꾸는 변경」(CSS 정리 · 화면 코드 쪼개기)이 정말 화면을 안 바꿨는지 본다.
//
// 사용: node tools/compare-screens.mjs [옛 app 폴더] [다른 화면을 저장할 폴더]
//   옛 app 폴더를 안 주면 origin/main 의 app/ 을 임시 폴더에 꺼내 쓴다. 새 쪽은 지금 작업 폴더의 app/.
//
// 찍는 것 (106장): 너비 360 · 390 · 768 · 1280 + 다크(390 · 1280) ×
//   예시 12달 각각 · (390 · 1280 밝은 화면은) 접힌 줄을 모두 펼친 화면 · 1년 · 그래프,
//   그리고 파일 올리기 흐름 9단계(390 · 1280).
// ★ 같은 앱끼리 비교해도 시작 화면 등에 3px 폭 세로줄(30~60픽셀)이 가끔 다르게 나온다.
//   그래서 다른 픽셀이 50 이하면 「흔들림 의심」으로 따로 세고 실패로 치지 않는다 — 저장된 그림을 눈으로 확인한다.
// ★ 눌러야 열리는 칸(직접 적는 돈 · 예정 지출 창 등)은 여기서 못 본다 — 그런 곳은 tests/ 의 시험으로 지킨다.
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
const REPO = fileURLToPath(new URL('..', import.meta.url));
let [oldDir, outDir] = process.argv.slice(2);
const newDir = join(REPO, 'app');
if (!oldDir) {
  const tmp = mkdtempSync(join(tmpdir(), 'screens-'));
  execSync('git archive origin/main app | tar -x -C ' + JSON.stringify(tmp), { cwd: REPO });
  oldDir = join(tmp, 'app');
  console.log(
    '옛 화면: origin/main (' +
      execSync('git rev-parse --short origin/main', { cwd: REPO }).toString().trim() +
      ')'
  );
}
const T = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json',
  '.svg': 'image/svg+xml'
};
const srv = (root, port) =>
  createServer(async (q, r) => {
    let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    try {
      r.writeHead(200, { 'Content-Type': T[extname(p)] || 'application/octet-stream' });
      r.end(await readFile(join(root, p)));
    } catch {
      r.writeHead(404).end();
    }
  }).listen(port);
const A = srv(oldDir, 4191),
  B = srv(newDir, 4192);
const QUIET_CSS =
  '*{scrollbar-width:none!important;animation:none!important;transition:none!important;caret-color:transparent!important}*::-webkit-scrollbar{display:none!important}';
const br = await chromium.launch();
const shots = {};
async function page(port, w, scheme) {
  const ctx = await br.newContext({
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    viewport: { width: w, height: 844 },
    colorScheme: scheme
  });
  await ctx.addInitScript((css) => {
    const put = () => {
      const st = document.createElement('style');
      st.textContent = css;
      (document.head || document.documentElement).appendChild(st);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', put);
    else put();
  }, QUIET_CSS);
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date('2026-09-23T10:00:00+09:00'));
  await p.goto('http://localhost:' + port + '/');
  await p.locator('#splash').waitFor({ state: 'detached' });
  return { ctx, p };
}
async function settle(p) {
  await p.evaluate(async () => {
    await document.fonts.ready;
    for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(() => r()));
  });
  await p.waitForTimeout(250);
}
function snapper(p, tag) {
  return async (n) => {
    await p.mouse.move(0, 0);
    await p.evaluate(() => {
      const a = document.activeElement;
      if (a && a !== document.body && a.blur) a.blur();
    });
    await p.addStyleTag({ content: QUIET_CSS });
    await settle(p);
    let a = await p.screenshot({ fullPage: true });
    await settle(p);
    const b = await p.screenshot({ fullPage: true });
    if (!a.equals(b)) {
      await settle(p);
      a = await p.screenshot({ fullPage: true });
    }
    shots[tag + '|' + n] = a;
  };
}
async function expandAll(p) {
  for (let i = 0; i < 60; i++) {
    const rows = p.locator('.tapx:visible');
    const n = await rows.count();
    if (i >= n) break;
    await rows
      .nth(i)
      .click({ force: true })
      .catch(() => {});
    await p.waitForTimeout(60);
  }
}
async function demoFlow(k, port, w, scheme) {
  const { ctx, p } = await page(port, w, scheme);
  const snap = snapper(p, k + '|' + w + scheme);
  await snap('시작');
  await p.getByRole('button', { name: '예시 먼저 보기' }).click();
  await snap('예시');
  const months = await p
    .locator('select:visible')
    .first()
    .locator('option')
    .evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
  for (const m of months) {
    await p.locator('select:visible').first().selectOption(m);
    await snap(m);
    if (scheme === 'light' && (w === 390 || w === 1280)) {
      await expandAll(p);
      await snap(m + '-펼침');
    }
  }
  await p.getByRole('button', { name: '1년' }).click();
  await snap('1년');
  await p.getByRole('button', { name: '한 달' }).click();
  /* NAM-9 부터는 그래프가 카드 안에 있다. 옛 판과 견줄 때만 단추가 있다 */
  const gb = p.getByRole('button', { name: '예상 잔액 그래프 보기' });
  if (await gb.count()) await gb.click();
  await snap('그래프');
  await ctx.close();
}
async function uploadFlow(k, port, w) {
  const { ctx, p } = await page(port, w, 'light');
  const snap = snapper(p, k + '|' + w + '올리기');
  const b64 = await p.evaluate(async () => {
    await loadSheetJS();
    const rows = [['거래일시', '적요', '출금액', '입금액', '잔액']];
    let bal = DEMO_OPEN;
    DEMO_TX.forEach((s) => {
      const f = s.split('|'),
        a = +f[2];
      bal += a;
      rows.push([DEMO_YEAR + '-' + f[0], f[1], a < 0 ? -a : 0, a > 0 ? a : 0, bal]);
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '거래내역');
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  });
  const file = {
    name: '국민은행_거래내역.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(b64, 'base64')
  };
  await p.getByRole('button', { name: '식당' }).click();
  await p.locator('input[type=file]').first().setInputFiles(file);
  await p.getByRole('button', { name: '이 파일들로 시작하기' }).waitFor();
  await snap('1-파일목록');
  await p.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await snap('2-매장이름');
  await p.getByPlaceholder('예: 1호점').fill('테스트식당');
  await p.getByRole('button', { name: '다음', exact: true }).click();
  await p.getByPlaceholder('예: 홍길동').fill('홍길동');
  await p.getByRole('button', { name: '다음', exact: true }).click();
  await snap('3-분류묻기전');
  await p.getByRole('button', { name: '파일 없이 직접 정하기' }).click();
  await snap('4-분류첫질문');
  for (let i = 0; i < 20; i++) {
    const want = await p.evaluate(() => {
      const q = UP.queue[UP.pos];
      return (q && DEMO_PICKS[q.name]) || '기타';
    });
    const bt = p.locator('#up button:visible', { hasText: new RegExp('^' + want + '$') });
    await ((await bt.count()) ? bt : p.locator('#up button:visible', { hasText: /^기타$/ }))
      .first()
      .click();
    if (i === 9) await snap('5-분류중간');
  }
  await snap('6-분류끝');
  await p.getByRole('button', { name: '결과 보기', exact: true }).click();
  await snap('7-목표일');
  const d = p
    .locator('#up button:visible')
    .filter({ hasText: /^(확인|이대로 보기|결과 보기|다음)$/ });
  if (await d.count()) await d.first().click();
  await snap('8-결과');
  await expandAll(p);
  await snap('9-결과펼침');
  await ctx.close();
}
for (const [k, port] of [
  ['old', 4191],
  ['new', 4192]
]) {
  for (const w of [360, 390, 768, 1280]) await demoFlow(k, port, w, 'light');
  for (const w of [390, 1280]) await demoFlow(k, port, w, 'dark');
  for (const w of [390, 1280]) await uploadFlow(k, port, w);
}
if (outDir) await mkdir(outDir, { recursive: true });
let ok = 0,
  n = 0,
  bad = [];
for (const key of Object.keys(shots).filter((x) => x.startsWith('old|'))) {
  n++;
  const nk = 'new|' + key.slice(4);
  const same = shots[nk] && shots[key].equals(shots[nk]);
  ok += same ? 1 : 0;
  if (!same) {
    bad.push(key.slice(4));
    if (outDir) {
      const f = key.slice(4).replace(/[|/ ]/g, '_');
      await writeFile(join(outDir, f + '-old.png'), shots[key]);
      if (shots[nk]) await writeFile(join(outDir, f + '-new.png'), shots[nk]);
    }
  }
}
// 다른 픽셀 수와 범위 — 50 이하는 흔들림 의심(자기 비교에서도 가끔 생긴다)으로 따로 센다
const pg = await br.newPage();
async function diffOf(x, y) {
  return pg.evaluate(
    async ([A, B]) => {
      const load = (s) =>
        new Promise((ok) => {
          const i = new Image();
          i.onload = () => ok(i);
          i.src = 'data:image/png;base64,' + s;
        });
      const [a, b] = await Promise.all([load(A), load(B)]);
      if (a.width !== b.width || a.height !== b.height)
        return { n: -1, size: [a.width, a.height, b.width, b.height] };
      const c = (i) => {
        const k = document.createElement('canvas');
        k.width = i.width;
        k.height = i.height;
        const g = k.getContext('2d');
        g.drawImage(i, 0, 0);
        return g.getImageData(0, 0, i.width, i.height).data;
      };
      const d1 = c(a),
        d2 = c(b);
      let x0 = 1e9,
        y0 = 1e9,
        x1 = -1,
        y1 = -1,
        n = 0;
      for (let i = 0; i < d1.length; i += 4)
        if (d1[i] !== d2[i] || d1[i + 1] !== d2[i + 1] || d1[i + 2] !== d2[i + 2]) {
          n++;
          const px = (i / 4) % a.width,
            py = Math.floor(i / 4 / a.width);
          x0 = Math.min(x0, px);
          y0 = Math.min(y0, py);
          x1 = Math.max(x1, px);
          y1 = Math.max(y1, py);
        }
      return { n, box: [x0, y0, x1, y1] };
    },
    [x.toString('base64'), y.toString('base64')]
  );
}
let real = 0,
  flaky = 0;
for (const b of bad) {
  const r = await diffOf(shots['old|' + b], shots['new|' + b]);
  const small = r.n >= 0 && r.n <= 50;
  if (small) flaky++;
  else real++;
  console.log((small ? '흔들림 의심 ~ ' : '다름 ✗ ') + b + ' ' + JSON.stringify(r));
}
console.log(`넓은 화면 비교 ${ok}/${n} 동일 · 다름 ${real} · 흔들림 의심 ${flaky}`);
await br.close();
A.close();
B.close();
process.exit(real === 0 ? 0 : 1);
