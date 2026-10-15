// 섞인 거래처 줄 나누기 · 나간 쪽 「매출」 막기 (123차 · 2026-10-15 결정).
// ★ 지키는 것 — 업종 · 공단과 상관없이 입금과 출금이 함께 있는 거래처는 항목별 목록에서 들어온 줄 · 나간 줄로 나뉜다.
//   줄의 [항목 바꾸기]는 그 줄의 쪽만 고치고, 나간 줄 메뉴에는 「매출」이 없다 — 출금이 매출이 되어 매출이 마이너스가 되는 길을 막는다.
//   질문 카드에서 섞인 거래처에 「매출」을 고르면 들어온 쪽만 매출이 되고, 나간 쪽은 두던 대로(정해 둔 것은 그대로, 아니면 아직 안 정함) 남는다.
// 자료는 모두 합성이다 (거래처 이름 · 금액 · 날짜 지어냄).
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';
import { nhisXlsx, startWith } from './nhis-fixture.mjs';

const STORE = '테스트식당';
const MIX = '다온상사'; // 공단이 아닌 섞인 거래처 — 4월 입금 700,000 · 출금 2,500,000
// 나머지 거래처의 카드 답 — 카드 매출 · 식자재 · 월세 (매달 같다)
const BASE = { 가람카드: '매출', 나래식자재: '식자재', 건물주A: '월세' };

function rows() {
  /** @type {[string, string, number][]} */
  const tx = [];
  for (const m of ['2025-02', '2025-03', '2025-04']) {
    const last = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
    for (let d = 1; d <= last; d++)
      tx.push([`${m}-${String(d).padStart(2, '0')} 18:00:00`, '가람카드', 500000]);
    tx.push([`${m}-05 11:00:00`, '나래식자재', -4000000]);
    tx.push([`${m}-01 11:00:00`, '건물주A', -2000000]);
  }
  tx.push(['2025-04-10 09:00:00', MIX, -2500000]);
  tx.push(['2025-04-20 10:00:00', MIX, 700000]);
  tx.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return tx;
}

// 질문 카드를 차례로 답한다. answers 에 없는 거래처는 「나중에」
async function answerCards(page, answers) {
  for (let k = 0; k < 20; k++) {
    if (await page.locator('.askcard').isVisible()) {
      await page.getByRole('button', { name: '다른 곳입니다' }).click();
      continue;
    }
    const name = await page.evaluate(() => {
      const g = UP.queue[UP.pos];
      return g && UP.pos < UP.queue.length ? g.name : null;
    });
    if (!name || !(await page.locator('.obcard').isVisible())) break;
    const card = page.locator('.obcard');
    const to = answers[name];
    if (!to) {
      await card.getByRole('button', { name: '나중에' }).click();
      continue;
    }
    const quick = card.locator('.obbtns').getByRole('button', { name: new RegExp('^' + to) });
    if (await quick.count()) await quick.first().click();
    else {
      await card.getByRole('button', { name: /다른 항목/ }).click();
      await card
        .locator('.menu')
        .getByRole('button', { name: new RegExp('^' + to) })
        .first()
        .click();
    }
  }
}

async function toResult(page, reload) {
  if (reload) {
    await page.reload();
    await page.locator('#splash').waitFor({ state: 'detached' });
    await page
      .getByRole('button', { name: new RegExp(STORE) })
      .first()
      .click();
  } else if (!(await page.getByRole('button', { name: '1년' }).isVisible())) {
    await page.evaluate(() => showResult());
  }
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
  await page.evaluate(() => {
    UP.month = '2025-04';
    drawResult(monthList());
  });
}

// 2025년 4월 1일 ~ 30일: [번 돈, 쓴 돈, 그 밖의 입금, 아직 안 정한 돈, 입금 항목, 출금 항목]
async function april(page) {
  return page.evaluate((n) => {
    const d = monthNumbers('2025-04');
    const g = UP.byName[n];
    return [d.sales, d.cost, d.otherIn, d.unknown, g.catIn || null, g.catOut || null];
  }, MIX);
}
async function noMinusSales(page) {
  const ms = await page.evaluate(() =>
    monthList().map((m) => {
      const d = monthNumbers(m);
      return [m, d.sales, d.salesOut];
    })
  );
  for (const [m, sales, out] of ms) {
    expect(sales, m).toBeGreaterThan(0);
    expect(out, m).toBe(0);
  }
}
// 펼친 항목 목록에서 label 줄의 [항목 바꾸기] 메뉴
async function openRowMenu(page, label) {
  const row = page
    .locator('.dtl .drow')
    .filter({ has: page.locator('.dnm', { hasText: label }) })
    .first();
  await row.getByRole('button', { name: '항목 바꾸기' }).click();
  return row.locator('xpath=following-sibling::div[contains(@class,"menu")][1]');
}
async function openSection(page, parent, section) {
  await page
    .locator('.bigrow', { hasText: parent })
    .first()
    .click({ position: { x: 8, y: 8 } });
  await page.locator('.orow:not(.bigrow)', { hasText: section }).first().click();
}

test('공단이 아닌 섞인 거래처 — 「보험」 목록에서 들어온 줄 · 나간 줄이 따로, 나간 줄 메뉴에 매출 없음', async ({
  page
}) => {
  const errors = await openApp(page);
  await startWith(page, '식당', await nhisXlsx(page, rows()), STORE);
  await answerCards(page, { [MIX]: '보험', ...BASE });
  await toResult(page, false);
  // 처음: 양쪽 다 보험. 입금 700,000 은 그 밖의 입금, 출금 2,500,000 은 보험(지출)
  expect(await april(page)).toEqual([15000000, 8500000, 700000, 0, '보험', '보험']);

  // (가) 사업에 쓴 돈 → 보험: 나간 줄 · 들어온 줄이 따로
  await openSection(page, '사업에 쓴 돈', '보험');
  const lines = (await page.locator('.dtl .drow .dnm').allInnerTexts()).filter((t) =>
    t.includes(MIX)
  );
  expect(lines.length).toBe(2);
  expect(lines[0]).toContain(MIX + ' · 나간 돈 1건');
  expect(lines[1]).toContain(MIX + ' · 들어온 돈 1건');
  expect(lines[1]).toContain('(그 밖의 입금)');

  // (다) 나간 줄 메뉴에 「매출」이 없다
  const outMenu = await openRowMenu(page, MIX + ' · 나간 돈');
  await expect(outMenu.getByRole('button', { name: /^매출/ })).toHaveCount(0);
  await expect(outMenu.getByRole('button', { name: /^기타/ })).toHaveCount(1);
  // 들어온 줄 메뉴에는 있다
  const inMenu = await openRowMenu(page, MIX + ' · 들어온 돈');
  await expect(inMenu.getByRole('button', { name: /^매출/ })).toHaveCount(1);

  // (나) 들어온 줄 → 매출: 입금만 매출 · 출금은 보험 그대로 · 매출이 마이너스가 아니다
  await inMenu.getByRole('button', { name: /^매출/ }).first().click();
  expect(await april(page)).toEqual([15700000, 8500000, 0, 0, '매출', '보험']);
  await noMinusSales(page);

  // (라) 저장 → 다시 열기 뒤에도 그대로
  await toResult(page, true);
  expect(await april(page)).toEqual([15700000, 8500000, 0, 0, '매출', '보험']);
  await noMinusSales(page);
  expect(errors).toEqual([]);
});

test('섞이지 않은 거래처는 한 줄 그대로 — 나간 쪽 목록의 메뉴에도 매출이 있다 (예전 그대로)', async ({
  page
}) => {
  const errors = await openApp(page);
  await startWith(page, '식당', await nhisXlsx(page, rows()), STORE);
  await answerCards(page, { [MIX]: '보험', ...BASE });
  await toResult(page, false);
  await openSection(page, '사업에 쓴 돈', '식자재');
  const lines = (await page.locator('.dtl .drow .dnm').allInnerTexts()).filter((t) =>
    t.includes('나래식자재')
  );
  expect(lines).toEqual([expect.stringMatching(/나래식자재 · 1건$/)]);
  const menu = await openRowMenu(page, '나래식자재');
  await expect(menu.getByRole('button', { name: /^매출/ })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('질문 카드에서 섞인 거래처에 「매출」 — 입금만 매출, 출금은 아직 안 정함 → 결과 화면에서 정하기(매출 없음) → 다시 열기', async ({
  page
}) => {
  const errors = await openApp(page);
  await startWith(page, '식당', await nhisXlsx(page, rows()), STORE);
  // 섞인 거래처 카드에는 매출이 들어온 돈에만 들어간다는 안내가 있다
  await page.evaluate((n) => {
    UP.pos = UP.queue.indexOf(UP.byName[n]);
    drawOnboard();
  }, MIX);
  await expect(page.locator('.obcard')).toContainText(
    '들어온 돈만 매출로 정합니다. 아직 정하지 않은 나간 돈은 결과 화면에서 정할 수 있습니다.'
  );
  await page.evaluate(() => {
    UP.pos = 0;
    drawOnboard();
  });
  await answerCards(page, { [MIX]: '매출', ...BASE });
  // 카드가 다음으로 넘어갔다 — 같은 거래처를 다시 묻지 않는다
  expect(await page.evaluate((n) => UP.queue.indexOf(UP.byName[n]) < UP.pos, MIX)).toBe(true);
  await toResult(page, false);
  // 입금 700,000 만 매출. 출금 2,500,000 은 아직 안 정한 돈
  expect(await april(page)).toEqual([15700000, 6000000, 0, 2500000, '매출', null]);
  await noMinusSales(page);

  // 결과 화면 「아직 안 정한 돈」 → 그 거래처 [정하기] → 메뉴에 매출 없음 → 기타
  await page.locator('.orow', { hasText: '아직 안 정한 돈' }).first().click();
  const row = page
    .locator('.dtl .drow')
    .filter({ has: page.locator('.dnm', { hasText: MIX }) })
    .first();
  await row.getByRole('button', { name: '정하기' }).click();
  const menu = row.locator('xpath=following-sibling::div[contains(@class,"menu")][1]');
  await expect(menu.getByRole('button', { name: /^매출/ })).toHaveCount(0);
  await menu.getByRole('button', { name: /^기타/ }).first().click();
  expect(await april(page)).toEqual([15700000, 8500000, 0, 0, '매출', '기타']);
  await noMinusSales(page);

  await toResult(page, true);
  expect(await april(page)).toEqual([15700000, 8500000, 0, 0, '매출', '기타']);
  await noMinusSales(page);
  expect(errors).toEqual([]);
});

test('출금을 이미 정해 둔 섞인 거래처에 카드에서 「매출」 — 출금 항목은 그대로', async ({
  page
}) => {
  const errors = await openApp(page);
  await startWith(page, '식당', await nhisXlsx(page, rows()), STORE);
  await page.evaluate((n) => {
    const g = UP.byName[n];
    gSetCat(g, false, '기타', false);
    UP.pos = UP.queue.indexOf(g);
    drawOnboard();
  }, MIX);
  const card = page.locator('.obcard');
  // 나간 돈이 정해져 있으면 안내 줄은 없다
  await expect(card).not.toContainText('들어온 돈만 매출로 정합니다');
  await card.locator('.obbtns').getByRole('button', { name: /^매출/ }).click();
  expect(await page.evaluate((n) => [UP.byName[n].catIn, UP.byName[n].catOut], MIX)).toEqual([
    '매출',
    '기타'
  ]);
  expect(errors).toEqual([]);
});
