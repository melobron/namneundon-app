// 고객 앱의 이용 단계 집계 · 데이터 처리 안내 · 소개 페이지의 글 코드 전달 (NAM-20·21, 2026-09-29).
// ★ 집계 설정(03-usage-config.js)은 운영에서 비어 있다. 여기서는 그 파일만 시험 설정으로 바꿔 낸다.
//   보내는 곳은 로컬 주소이고 Playwright 가 가로채 응답한다 — 실제 서버로 아무것도 나가지 않는다.
// ★ 올리는 파일은 예시 거래(DEMO_TX)로 만든 가짜 은행 파일이다.
import { test, expect } from '@playwright/test';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { FIXED_NOW, demoAsBankXlsx } from '../helpers.mjs';
import { siteServer } from '../serve.mjs';

const ENDPOINT = 'http://127.0.0.1:9/ev';
const CONFIG =
  `var USAGE_CONFIG = { endpoint: '${ENDPOINT}', keepFor: '400일(시험 값)', ` +
  `contact: 'https://pf.kakao.com/_bijxaX/chat' };`;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type'
};
const STORE = '테스트식당';
const FILE_NAME = '국민은행_거래내역.xlsx';

/**
 * 집계를 켜고, 보낸 것과 바깥으로 나간 요청을 모두 모은다.
 * @param {import('@playwright/test').Page} page
 */
async function enable(page, { fail = false, config = CONFIG } = {}) {
  const sent = [];
  const outside = [];
  await page.route('**/src/03-usage-config.js', (r) =>
    r.fulfill({ contentType: 'text/javascript; charset=utf-8', body: config })
  );
  await page.route(ENDPOINT, (route) => {
    const q = route.request();
    if (q.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    sent.push({ body: JSON.parse(q.postData() || 'null'), headers: q.headers() });
    return fail ? route.abort() : route.fulfill({ status: 204, headers: CORS });
  });
  page.on('request', (q) => {
    const u = new URL(q.url());
    if (u.origin !== 'http://localhost:4173')
      outside.push({ url: q.url(), body: q.postData() || '' });
  });
  return { sent, outside };
}
async function open(page, path = '/') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto(path);
  await expect(page.getByRole('button', { name: '예시 먼저 보기' })).toBeVisible();
  await page.locator('#splash').waitFor({ state: 'detached' });
  return errors;
}
const steps = (sent) => sent.map((x) => x.body.step);
const tabState = (page) =>
  page.evaluate(() => JSON.parse(sessionStorage.getItem('nd.analytics.v1') || 'null'));

// 파일 올리기 → 매장 이름 → 대표자 → 거래처 20곳 → 결과 (upload.spec.mjs 와 같은 길)
async function uploadToResult(page) {
  const file = await demoAsBankXlsx(page);
  await page.getByRole('button', { name: '식당' }).click();
  await page.locator('#upinput').setInputFiles(file);
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.getByPlaceholder('예: 1호점').fill(STORE);
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByPlaceholder('예: 홍길동').fill('홍길동');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '파일 없이 직접 정하기' }).click();
  for (let k = 0; k < 20; k++) {
    const want = await page.evaluate(() => {
      const q = UP.queue[UP.pos];
      return (q && DEMO_PICKS[q.name]) || '기타';
    });
    const btn = page.locator('#up button:visible', { hasText: new RegExp(`^${want}$`) });
    await ((await btn.count()) ? btn : page.locator('#up button:visible', { hasText: /^기타$/ }))
      .first()
      .click();
  }
  await page.getByRole('button', { name: '결과 보기', exact: true }).click();
  const dueBtn = page
    .locator('#up button:visible')
    .filter({ hasText: /^(확인|이대로 보기|결과 보기|다음)$/ });
  if (await dueBtn.count()) await dueBtn.first().click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
}

test('기본 설정(꺼짐) — 아무것도 보내지 않고, 안내 · 주소 · 탭 저장도 그대로', async ({ page }) => {
  const outside = [];
  page.on('request', (q) => {
    if (new URL(q.url()).origin !== 'http://localhost:4173') outside.push(q.url());
  });
  const errors = await open(page, '/?s=D08');
  expect(await page.evaluate(() => USAGE.on())).toBe(false);
  await expect(page.locator('.usenote')).toHaveCount(0);
  expect(new URL(page.url()).search).toBe('?s=D08');
  expect(await tabState(page)).toBeNull();
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});

test('켜짐 — 안내가 보인 뒤 도착 한 번, s 만 담고 주소에서 s 만 뺀다', async ({ page }) => {
  const { sent } = await enable(page);
  const errors = await open(page, '/?x=1&s=D08#top');
  const note = page.locator('#welcome .usenote');
  await expect(note).toBeVisible();
  await expect(note).toContainText('거래내역 파일과 분석 결과 금액은 서버로 전송되지 않습니다.');
  await expect(page.locator('#up .usenote')).toHaveCount(1); // 파일 올리는 칸 곁에도
  await expect.poll(() => steps(sent)).toEqual(['도착']);
  expect(sent[0].body).toEqual({ step: '도착', s: 'D08' });
  // 쿠키 · 이전 주소를 싣지 않는다
  expect(sent[0].headers.cookie).toBeUndefined();
  expect(sent[0].headers.referer).toBeUndefined();
  const u = new URL(page.url());
  expect(u.search + u.hash).toBe('?x=1#top');
  expect(await tabState(page)).toEqual({ v: 1, s: 'D08', sent: { 도착: 1 } });

  // 첫 화면으로 다시 와도(재그리기) 더 세지 않는다
  await page.evaluate(() => drawStart());
  // 같은 탭 새로고침 · 다른 글 코드로 다시 와도 도착은 한 번, 글 코드는 처음 것
  await page.goto('/?s=B02');
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page.waitForTimeout(300);
  expect(steps(sent)).toEqual(['도착']);
  expect((await tabState(page)).s).toBe('D08');
  expect(new URL(page.url()).search).toBe('');
  expect(errors).toEqual([]);
});

test('데이터 처리 안내 — 펼치면 보내는 것 · 보내지 않는 것 · 보관 · 접속 기록 · 문의', async ({
  page
}) => {
  await enable(page);
  await open(page);
  const note = page.locator('#welcome .usenote');
  const more = note.getByRole('button', { name: '데이터 처리 안내' });
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  const detail = note.locator('.usedetail');
  await expect(detail).toBeVisible();
  for (const t of [
    '보내는 것',
    '보내지 않는 것',
    '파일 이름',
    '계좌번호',
    '400일(시험 값)',
    'Cloudflare',
    '문의'
  ])
    await expect(detail).toContainText(t);
  await expect(detail.getByRole('link')).toHaveAttribute(
    'href',
    'https://pf.kakao.com/_bijxaX/chat'
  );
});

test('글 코드가 틀리거나 두 번 적히면 s 없이 보낸다 (출처 미확인)', async ({ page }) => {
  for (const path of ['/?s=D08&s=B02', '/?s=D-08', '/?s=', '/?s=ABCDEFGHIJKLM']) {
    const p = await page.context().newPage();
    const { sent } = await enable(p);
    await open(p, path);
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0].body, path).toEqual({ step: '도착' });
    await p.close();
  }
});

test('시험 주소에서 운영 수신처로는 보내지 않는다', async ({ page }) => {
  const config =
    "var USAGE_CONFIG = { endpoint: 'https://usage.example/ev', keepFor: 'x', contact: 'x' };";
  const { outside } = await enable(page, { config });
  await open(page);
  expect(await page.evaluate(() => USAGE.on())).toBe(false);
  await expect(page.locator('.usenote')).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(outside).toEqual([]);
});

test('탭 저장이 막혀도 앱과 집계는 돈다', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new DOMException('막힘', 'SecurityError');
      }
    });
  });
  const { sent } = await enable(page);
  const errors = await open(page, '/?s=D08');
  await expect.poll(() => sent.map((x) => x.body)).toEqual([{ step: '도착', s: 'D08' }]);
  expect(errors).toEqual([]);
});

test('파일 선택 → 결과: 단계마다 한 번, 예시 · 재그리기 · 빈 선택은 세지 않고, 금융 자료는 나가지 않는다', async ({
  page
}) => {
  const { sent, outside } = await enable(page);
  const errors = await open(page, '/?s=D08');
  await expect.poll(() => steps(sent)).toEqual(['도착']);

  // 예시 먼저 보기 — 예시 결과는 세지 않는다
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await page.waitForTimeout(200);
  expect(steps(sent)).toEqual(['도착']);
  await page.evaluate(() => drawStart());

  // 고르기를 취소하면(빈 목록) 세지 않는다
  await page.locator('#upinput').setInputFiles([]);
  expect(steps(sent)).toEqual(['도착']);

  await uploadToResult(page);
  await expect.poll(() => steps(sent)).toEqual(['도착', '파일선택', '결과표시']);

  // 결과를 다시 그려도 · 1년 보기로 오가도 더 세지 않는다
  await page.evaluate(() => drawResult(monthList()));
  await page.getByRole('button', { name: '1년' }).click();
  await page.waitForTimeout(200);
  expect(steps(sent)).toEqual(['도착', '파일선택', '결과표시']);

  // 요청 본문은 step · s 뿐이고, 어떤 요청에도 파일 이름 · 매장 이름 · 금액이 없다
  for (const x of sent) {
    expect(Object.keys(x.body).sort()).toEqual(['s', 'step']);
    expect(x.body.s).toBe('D08');
  }
  const amount = await page.evaluate(() => String(Math.abs(UP.rows[0].amount)));
  const balance = await page.evaluate(() => String(UP.rows[0].balance));
  expect(outside.length).toBe(3);
  for (const o of outside) {
    expect(o.url).toBe(ENDPOINT);
    for (const secret of [FILE_NAME, '국민은행', STORE, '홍길동', amount, balance])
      expect(o.body + o.url).not.toContain(secret);
  }
  expect(errors).toEqual([]);
});

test('저장본 이어 보기는 결과로 세지 않고, 못 읽은 파일 뒤 옛 결과도 세지 않는다', async ({
  page,
  context
}) => {
  const first = await enable(page);
  await open(page);
  await uploadToResult(page);
  await expect.poll(() => steps(first.sent)).toContain('결과표시');

  // 새 탭 = 새 방문. 저장된 매장을 이어서 보기
  const tab = await context.newPage();
  const { sent } = await enable(tab);
  const errors = await open(tab);
  await expect.poll(() => steps(sent)).toEqual(['도착']);
  await tab
    .getByRole('button', { name: new RegExp(STORE) })
    .first()
    .click();
  await expect(tab.getByRole('button', { name: '1년' })).toBeVisible();
  await tab.waitForTimeout(200);
  expect(steps(sent)).toEqual(['도착']);

  // 읽을 수 없는 파일을 올리면 파일 선택만 세고, 남아 있는 옛 결과는 세지 않는다
  await tab.evaluate(() => openUpPanel());
  await tab.locator('#upinput').setInputFiles({
    name: 'not-a-bank.xlsx',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('not a spreadsheet')
  });
  await expect.poll(() => steps(sent)).toEqual(['도착', '파일선택']);
  await tab.evaluate(() => showResult());
  await tab.waitForTimeout(200);
  expect(steps(sent)).toEqual(['도착', '파일선택']);
  expect(errors).toEqual([]);
});

test('수신처가 실패해도 분석은 끝까지 된다 (다시 보내지 않는다)', async ({ page }) => {
  const { sent } = await enable(page, { fail: true });
  const errors = await open(page);
  await uploadToResult(page);
  await expect.poll(() => steps(sent)).toEqual(['도착', '파일선택', '결과표시']);
  expect(errors).toEqual([]);
});

for (const width of [390, 1280]) {
  test(`안내 모양 (${width}px) — 첫 화면과 파일 올리는 칸에서 보인다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await enable(page);
    await open(page);
    const note = page.locator('#welcome .usenote');
    await expect(note).toBeVisible();
    const box = await note.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= width).toBe(true);
    await page.getByRole('button', { name: '식당' }).click();
    await expect(page.locator('#up .usenote')).toBeVisible();
  });
}

// ── 소개 페이지 — 글 코드를 앱 링크에 넘긴다 (소개 페이지 자체는 아무것도 보내지 않는다)
const landingRoot = fileURLToPath(new URL('../../landing/', import.meta.url));
const links = { 'https://app.namneundon.com': 'http://localhost:4173' };
const landing = siteServer(landingRoot, links);
let landingURL;
test.beforeAll(async () => {
  landing.listen(0, '127.0.0.1');
  await once(landing, 'listening');
  landingURL = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (landing.address()).port}`;
});
test.afterAll(async () => {
  await new Promise((done) => landing.close(done));
});

test('소개 페이지 — 올바른 글 코드만 앱 링크에 붙이고, 같은 탭에서는 처음 코드를 유지', async ({
  page
}) => {
  const outside = [];
  page.on('request', (q) => {
    const o = new URL(q.url()).origin;
    if (o !== landingURL) outside.push(q.url());
  });
  const hrefs = () =>
    page.locator('[data-appurl]').evaluateAll((a) => a.map((x) => x.getAttribute('href')));
  await page.goto(landingURL + '/?s=D08');
  expect(new Set(await hrefs())).toEqual(new Set(['http://localhost:4173/?s=D08']));
  await page.goto(landingURL + '/?s=B02');
  expect(new Set(await hrefs())).toEqual(new Set(['http://localhost:4173/?s=D08']));

  const other = await page.context().newPage();
  for (const bad of ['/?s=D-08', '/?s=D08&s=B02', '/']) {
    await other.goto(landingURL + bad);
    const h = await other
      .locator('[data-appurl]')
      .evaluateAll((a) => a.map((x) => x.getAttribute('href')));
    expect(new Set(h), bad).toEqual(new Set(['http://localhost:4173']));
  }
  expect(outside.filter((u) => !u.startsWith('data:'))).toEqual([]);
});
