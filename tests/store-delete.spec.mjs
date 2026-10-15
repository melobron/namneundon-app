// 매장 지우기 (122차).
// ★ 지키는 것 — 시작 화면 [지우기]는 그 매장의 통 여섯(storeKeysOf)과, 그 매장이 마지막 매장이면 fc.last 를 지운다.
//   다시 열어도 되살아나지 않고, 다른 매장 자료는 한 글자도 안 바뀐다.
//   fc_use(사용 기록) · fc.breaks(잔액 끊김 답)는 매장과 무관해 남는다.
// 자료는 모두 지어낸 값이다 (실제 거래내역 아님).
import { test, expect } from '@playwright/test';
import { openApp, storageDump } from './helpers.mjs';

const J = (o) => JSON.stringify(o);
const KINDS = ['fc.picks.', 'fc.manual.', 'fc.banks.', 'fc.data.', 'fc.plan.', 'nd_lastrun.'];
/** @param {string} s @param {string} day */
const store = (s, day) => ({
  ['fc.picks.' + s]: J({ v: 1, store: s, owner: '홍길동', picks: { 가나상회: '식자재' }, n곳: 1 }),
  ['fc.manual.' + s]: J({
    v: 2,
    items: [{ id: 'm1', name: '현금 매출', side: 'in' }],
    amounts: { '2026-08': { m1: 120000 } },
    days: {}
  }),
  ['fc.banks.' + s]: J({ '국민|거래내역': '국민 주거래' }),
  ['fc.data.' + s]: J({
    dv: 1,
    저장일: day,
    store: s,
    owner: '홍길동',
    banks: [
      {
        name: '국민',
        rows: [{ at: '2026-08-01', payee: '가나상회', amount: -5000, balance: 95000 }]
      }
    ]
  }),
  ['fc.plan.' + s]: J({ v: 1, items: [{ id: 'p1', name: '월세', amt: -800000, day: 25 }] }),
  ['nd_lastrun.' + s]: day
});
const SEED = Object.assign({}, store('A', '2026-09-20'), store('B', '2026-09-10'), {
  'fc.last': 'A',
  fc_use: J({ v: 1, 연날: ['2026-09-20'] }),
  'fc.breaks': J({ '2026-08-01|가나상회|2': 'ok' })
});

test('시작 화면 [지우기] — 매장 통 여섯과 fc.last 를 지우고, 다시 열어도 안 살아난다', async ({
  page
}) => {
  const errors = await openApp(page);
  await page.evaluate((seed) => {
    localStorage.clear();
    for (const k in seed) localStorage.setItem(k, seed[k]);
  }, SEED);
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });

  const line = page.locator('.gsline', { hasText: '〈A〉' });
  await line.getByRole('button', { name: '지우기' }).click();
  const ask = page.locator('.saveask:visible');
  // 실제로 지우는 것만 적는다. 남는 기록이 있으니 「모두」라고 쓰지 않는다
  await expect(ask.locator('.addq')).toHaveText(
    '「A」을 지울까요? 거래내역과 정하신 거래처 1곳, 예정 지출, 직접 적은 금액이 함께 지워집니다.'
  );
  await ask.getByRole('button', { name: '지우기' }).click();
  await expect(page.locator('.gsline', { hasText: '〈A〉' })).toHaveCount(0);

  const check = async () => {
    const after = await storageDump(page);
    for (const kind of KINDS) {
      expect(after[kind + 'A'], kind + 'A').toBeUndefined();
      expect(after[kind + 'B'], kind + 'B').toEqual(tryJson(SEED[kind + 'B']));
    }
    expect(after['fc.last']).toBeUndefined();
    expect(after.fc_use).toBeDefined();
    expect(after['fc.breaks']).toBeDefined();
  };
  await check();

  // 다시 열어도 그대로 — 되살아나지 않는다
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });
  await expect(page.locator('.gsline', { hasText: '〈A〉' })).toHaveCount(0);
  await expect(page.locator('.gsline', { hasText: '〈B〉' })).toHaveCount(1);
  await check();
  expect(errors).toEqual([]);
});

/** @param {string} v */
function tryJson(v) {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

test('열어 둔 매장을 지우면 놓는다 — 돌아가 고쳐도 되살아나지 않는다', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate((seed) => {
    localStorage.clear();
    for (const k in seed) localStorage.setItem(k, seed[k]);
  }, SEED);
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page.locator('.gsline', { hasText: '〈A〉' }).locator('.gostore').click();
  await expect.poll(() => page.evaluate(() => UP.store)).toBe('A');

  // 로고를 눌러 시작 화면으로 온 것과 같다 — 보던 자료(UP)는 메모리에 그대로 있다
  await page.evaluate(() => drawStart());
  const line = page.locator('.gsline', { hasText: '〈A〉' });
  await line.getByRole('button', { name: '지우기' }).click();
  await page.locator('.saveask:visible').getByRole('button', { name: '지우기' }).click();
  await expect(page.getByRole('button', { name: '보던 화면으로 돌아가기' })).toHaveCount(0);
  expect(await page.evaluate(() => UP.demo)).toBe(true);

  // 거래처를 고칠 때마다 부르는 저장 — 예시라 아무것도 안 쓴다
  await page.evaluate(() => savePicks());
  const after = await storageDump(page);
  for (const kind of KINDS) expect(after[kind + 'A'], kind + 'A').toBeUndefined();
  expect(after['fc.last']).toBeUndefined();
  expect(errors).toEqual([]);
});
