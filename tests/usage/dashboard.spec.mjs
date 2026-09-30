// 팀 대시보드 화면 — 조회 API 는 가로채서 모의 응답을 준다 (2026-09-29).
// 로딩 · 0건 · 미수집 · 오류 · 권한 만료 · 늦은 응답 · 100% 초과 · 글자 안전 · 작은 화면을 본다.
import { test, expect } from '@playwright/test';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { siteServer } from '../serve.mjs';
import { FIXED_NOW } from '../helpers.mjs';
import { buildReport, parseQuery } from '../../services/usage-rules.js';

const root = fileURLToPath(new URL('../../team-dashboard/', import.meta.url));
const server = siteServer(root);
let base;
test.beforeAll(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}`;
});
test.afterAll(async () => {
  await new Promise((done) => server.close(done));
});

const TODAY = '2026-09-23'; // FIXED_NOW 의 서울 날짜
const CAMPS = [{ code: 'D08', title: '시험 글', postUrl: 'https://example.com/d08' }];
/**
 * @param {string} url
 * @param {{ rows?: any[], started?: string | null, source?: string, campaigns?: any[], today?: string }} [o]
 */
function report(
  url,
  { rows, started = '2026-09-20', source = 'dev', campaigns = CAMPS, today = TODAY } = {}
) {
  const q = parseQuery(new URL(url).searchParams, today);
  if (!q.ok) throw new Error('bad query ' + url);
  return buildReport({
    rows: rows || [
      { date: '2026-09-21', code: 'D08', step: '도착', count: 10 },
      { date: '2026-09-21', code: 'D08', step: '파일선택', count: 4 },
      { date: '2026-09-22', code: null, step: '결과표시', count: 3 }
    ],
    campaigns,
    from: q.from,
    to: q.to,
    s: q.s,
    today,
    trackingStartedAt: started,
    generatedAt: '2026-09-23T01:00:00.000Z',
    source
  });
}
const asJson = (body, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body)
});
async function open(page, handler) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.setFixedTime(FIXED_NOW);
  const calls = [];
  await page.route('**/api/usage**', async (route) => {
    calls.push(route.request().url());
    return handler(route, route.request().url(), calls.length);
  });
  await page.goto(base + '/');
  return { errors, calls };
}

test('정상 — 합계 · 비율 · 미수집 날짜 · 경고 · 모의 표시 · 글 표', async ({ page }) => {
  const { errors, calls } = await open(page, (r, url) => r.fulfill(asJson(report(url))));
  await expect(page.locator('#n-arrival')).toHaveText('10');
  await expect(page.locator('#n-file')).toHaveText('4');
  await expect(page.locator('#n-result')).toHaveText('3');
  await expect(page.locator('#rates')).toContainText('파일 선택/도착 40%');
  await expect(page.locator('#rates')).toContainText('결과/파일 선택 75%');
  await expect(page.locator('#mock')).toBeVisible();
  expect(new URL(calls[0]).search).toBe('?from=2026-09-17&to=2026-09-23');
  const days = page.locator('#daily tbody tr');
  await expect(days).toHaveCount(7);
  await expect(days.nth(0)).toContainText('미수집'); // 9-17 은 집계 전
  await expect(days.nth(4)).toContainText('10'); // 9-21
  await expect(page.locator('#warns')).toContainText('미수집');
  await expect(page.locator('#warns')).toContainText('오늘은 아직 집계 중');
  const camps = page.locator('#camps tbody tr');
  // 결과 표시가 많은 글부터 — 출처 미확인(결과 3)이 D08(결과 0)보다 위
  await expect(camps.nth(0)).toContainText('출처 미확인');
  await expect(camps.nth(1)).toContainText('D08 · 시험 글');
  await expect(page.locator('#code option')).toHaveText(['전체 글', '출처 미확인', 'D08']);
  expect(errors).toEqual([]);
});

test('실제 0건과 미수집을 구분한다', async ({ page }) => {
  let started = '2026-09-01';
  await open(page, (r, url) => r.fulfill(asJson(report(url, { rows: [], started, source: 'x' }))));
  await expect(page.locator('#n-arrival')).toHaveText('0');
  await expect(page.locator('#status')).toContainText('0건입니다');
  await expect(page.locator('#rates')).toContainText('—');
  await expect(page.locator('#mock')).toBeHidden();
  started = null;
  await page.getByRole('button', { name: '새로고침' }).click();
  await expect(page.locator('#n-arrival')).toHaveText('미수집');
  await expect(page.locator('#warns')).toContainText('아직 집계를 시작하지 않았습니다');
  for (const cell of [3, 4, 5])
    await expect(page.locator(`#camps tbody tr td:nth-child(${cell})`)).toHaveText('미수집');
});

/** @type {Array<{ name: string, reply: (r: any) => any, want: string }>} */
const FAILS = [
  {
    name: '원본 연결 전 503',
    reply: (r) => r.fulfill(asJson({ error: 'source_unavailable' }, 503)),
    want: '0건이 아닙니다'
  },
  {
    name: '권한 없음 403',
    reply: (r) => r.fulfill({ status: 403, body: '접근 권한이 없습니다.' }),
    want: '로그인'
  },
  {
    name: '로그인 화면(HTML)',
    reply: (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html>login</html>' }),
    want: '로그인'
  },
  { name: '네트워크 끊김', reply: (r) => r.abort(), want: '불러오지 못했습니다' }
];
for (const { name, reply, want } of FAILS) {
  test(`실패를 0건으로 보이지 않는다 — ${name}`, async ({ page }) => {
    await open(page, reply);
    await expect(page.locator('#status')).toContainText(want);
    await expect(page.locator('#status')).toHaveClass(/bad/);
    for (const id of ['#n-arrival', '#n-file', '#n-result'])
      await expect(page.locator(id)).toHaveText('—');
    await expect(page.locator('#daily tbody tr')).toHaveCount(0);
  });
}

test('같은 조건 새로고침만 실패하면 앞 숫자와 그 조회 시각을 남긴다', async ({ page }) => {
  await open(page, (r, url, n) =>
    n === 1 ? r.fulfill(asJson(report(url))) : r.fulfill(asJson({ error: 'x' }, 503))
  );
  await expect(page.locator('#n-arrival')).toHaveText('10');
  await page.getByRole('button', { name: '새로고침' }).click();
  await expect(page.locator('#status')).toContainText('10:00에 불러온 숫자');
  await expect(page.locator('#n-arrival')).toHaveText('10');
});

test('조건을 바꾸면 앞 요청의 늦은 답이 새 화면을 덮지 않는다', async ({ page }) => {
  await open(page, async (r, url, n) => {
    if (n === 1) {
      await new Promise((ok) => setTimeout(ok, 800));
      return r.fulfill(
        asJson(
          report(url, { rows: [{ date: '2026-09-21', code: 'D08', step: '도착', count: 111 }] })
        )
      );
    }
    return r.fulfill(
      asJson(report(url, { rows: [{ date: '2026-09-21', code: 'D08', step: '도착', count: 222 }] }))
    );
  });
  await page.getByRole('button', { name: '최근 30일' }).click();
  await expect(page.locator('#n-arrival')).toHaveText('222');
  await page.waitForTimeout(1000);
  await expect(page.locator('#n-arrival')).toHaveText('222');
  await expect(page.locator('#daily tbody tr')).toHaveCount(30);
});

test('100% 를 넘는 비율은 그대로 두고 주의를 붙인다', async ({ page }) => {
  const rows = [
    { date: '2026-09-21', code: 'D08', step: '도착', count: 2 },
    { date: '2026-09-21', code: 'D08', step: '결과표시', count: 3 }
  ];
  await open(page, (r, url) => r.fulfill(asJson(report(url, { rows }))));
  await expect(page.locator('#rates')).toContainText('결과/도착 150%');
  await expect(page.locator('#rates .over').last()).toContainText('100%를 넘을 수 있습니다');
  const bars = await page.locator('#chart rect.r').evaluateAll((rects) =>
    rects.map((e) => ({
      top: Number(e.getAttribute('y')),
      height: Number(e.getAttribute('height'))
    }))
  );
  expect(bars.length).toBeGreaterThan(0);
  expect(bars.every((b) => b.top >= 0 && b.height <= 160)).toBe(true);
});

test('자정 뒤 최근 기간을 다시 고르면 새로운 한국 날짜를 사용한다', async ({ page }) => {
  const { calls } = await open(page, (r, url) =>
    r.fulfill(asJson(report(url, { rows: [], today: '2026-09-24' })))
  );
  await expect(page.locator('#n-arrival')).toHaveText('0');
  await page.clock.setFixedTime(new Date('2026-09-23T15:10:00.000Z'));
  await page.getByRole('button', { name: '새로고침' }).click();
  await expect.poll(() => calls.length).toBe(2);
  expect(new URL(calls[1]).search).toBe('?from=2026-09-18&to=2026-09-24');
  await expect(page.locator('#to')).toHaveAttribute('max', '2026-09-24');
});

test('날짜 고르기 — 90일 넘게는 요청하지 않고 알린다', async ({ page }) => {
  const { calls } = await open(page, (r, url) => r.fulfill(asJson(report(url))));
  await expect(page.locator('#n-arrival')).toHaveText('10');
  await page.locator('#from').fill('2026-06-01');
  await page.locator('#to').fill('2026-09-23');
  await page.getByRole('button', { name: '날짜 적용' }).click();
  await expect(page.locator('#status')).toContainText('최대 90일');
  expect(calls.length).toBe(1);
});

test('받은 글자는 글자로만 — 제목의 태그 · javascript: 링크를 실행하지 않는다', async ({
  page
}) => {
  const campaigns = [
    { code: 'D08', title: '<img src=x onerror="window.__x=1">', postUrl: 'javascript:alert(1)' }
  ];
  const { errors } = await open(page, (r, url) => r.fulfill(asJson(report(url, { campaigns }))));
  await expect(page.locator('#camps tbody tr').filter({ hasText: 'D08' })).toContainText(
    '<img src=x'
  );
  await expect(page.locator('#camps a')).toHaveCount(0);
  expect(await page.evaluate(() => /** @type {any} */ (window).__x)).toBeUndefined();
  expect(errors).toEqual([]);
});

for (const width of [390, 1280]) {
  test(`화면 너비 ${width}px — 가로로 넘치지 않고 표는 제자리에서 밀린다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, (r, url) => r.fulfill(asJson(report(url))));
    await expect(page.locator('#n-arrival')).toHaveText('10');
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(over).toBeLessThanOrEqual(0);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() => document.activeElement && document.activeElement.textContent)
    ).toBe('최근 7일');
  });
}
