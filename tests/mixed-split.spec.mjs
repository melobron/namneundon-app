// 섞인 거래처 줄 나누기 · 나간 돈의 「매출」은 확인해서 정하기 (123차 · 2026-10-15 · 10-16 결정).
// ★ 지키는 것 — 업종 · 공단과 상관없이 입금과 출금이 함께 있는 거래처는 항목별 목록에서 들어온 줄 · 나간 줄로 나뉜다.
//   줄의 [항목 바꾸기]는 그 줄의 쪽만 고친다.
//   출금은 묻지 않고는 「매출」이 되지 않는다. 질문 카드에서 섞인 거래처에 「매출」을 고르면 들어온 쪽만 매출이 되고,
//   나간 쪽은 두던 대로(정해 둔 것은 그대로, 아니면 아직 안 정함) 남는다.
//   출금을 매출로 두는 것(카드 취소 · 환불 같은 매출 차감)은 막지 않되, 결과 화면에서 확인 창을 거쳐야 한다 —
//   섞인 거래처의 나간 줄 · 출금만 있는 거래처 모두. 그렇게 정한 줄에는 안내가 붙고, 매출이 마이너스인 달에는 까닭을 적는다.
//   한쪽을 정해 둔 섞인 거래처가 다시 물어지면 남은 쪽에만 넣는다 — 입금 쪽 매출을 덮지 않는다.
// 자료는 모두 합성이다 (거래처 이름 · 금액 · 날짜 지어냄).
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';
import { nhisXlsx, startWith } from './nhis-fixture.mjs';

const STORE = '테스트식당';
const MIX = '다온상사'; // 공단이 아닌 섞인 거래처 — 4월 입금 700,000 · 출금 2,500,000
const REFUND = '라온환불'; // 출금만 있는 거래처 — 4월 출금 20,000,000 (시험 하나에서만 넣는다)
// 나머지 거래처의 카드 답 — 카드 매출 · 식자재 · 월세 (매달 같다)
const BASE = { 가람카드: '매출', 나래식자재: '식자재', 건물주A: '월세' };
const ASK =
  '나간 돈을 매출로 정하면 매출을 줄이는 출금(환불·취소)으로 반영됩니다. 이렇게 정할까요?';
const NOTE = '매출을 줄이는 출금으로 반영됩니다';
const MINUS = '나간 돈 일부가 매출을 줄이는 출금으로 정해져 이 달 매출이 마이너스입니다';

/** @param {[string, string, number][]} extra */
function rows(extra = []) {
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
  tx.push(...extra);
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

// 2025년 4월 1일 ~ 30일: [번 돈(매출), 쓴 돈, 그 밖의 입금, 아직 안 정한 돈, 입금 항목, 출금 항목]
async function april(page, name = MIX) {
  return page.evaluate((n) => {
    const d = monthNumbers('2025-04');
    const g = UP.byName[n];
    return [
      d.sales,
      d.cost,
      d.otherIn,
      d.unknown,
      g.mixed ? g.catIn || null : null,
      g.mixed ? g.catOut || null : g.cat || null
    ];
  }, name);
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
// 펼친 목록에서 label 줄의 [단추] 메뉴
async function openRowMenu(page, label, button = '항목 바꾸기') {
  const row = page
    .locator('.dtl .drow')
    .filter({ has: page.locator('.dnm', { hasText: label }) })
    .first();
  await row.getByRole('button', { name: button }).click();
  return row.locator('xpath=following-sibling::div[contains(@class,"menu")][1]');
}
async function openSection(page, parent, section) {
  await page
    .locator('.bigrow', { hasText: parent })
    .first()
    .click({ position: { x: 8, y: 8 } });
  if (section) await page.locator('.orow:not(.bigrow)', { hasText: section }).first().click();
}
const rowText = (page, label) =>
  page.locator('.dtl .drow .dnm', { hasText: label }).first().innerText();

test('공단이 아닌 섞인 거래처 — 들어온 줄 · 나간 줄이 따로, 나간 줄의 매출은 확인 창을 거친다', async ({
  page
}) => {
  const errors = await openApp(page);
  await startWith(page, '식당', await nhisXlsx(page, rows()), STORE);
  await answerCards(page, { [MIX]: '보험', ...BASE });
  await toResult(page, false);
  // 처음: 양쪽 다 보험. 입금 700,000 은 그 밖의 입금, 출금 2,500,000 은 보험(지출)
  expect(await april(page)).toEqual([15000000, 8500000, 700000, 0, '보험', '보험']);

  // 사업에 쓴 돈 → 보험: 나간 줄 · 들어온 줄이 따로
  await openSection(page, '사업에 쓴 돈', '보험');
  const lines = (await page.locator('.dtl .drow .dnm').allInnerTexts()).filter((t) =>
    t.includes(MIX)
  );
  expect(lines.length).toBe(2);
  expect(lines[0]).toContain(MIX + ' · 나간 돈 1건');
  expect(lines[1]).toContain(MIX + ' · 들어온 돈 1건');
  expect(lines[1]).toContain('(그 밖의 입금)');

  // 들어온 줄 → 매출: 입금만 매출 · 출금은 보험 그대로 · 확인 창 없음
  const inMenu = await openRowMenu(page, MIX + ' · 들어온 돈');
  await inMenu.getByRole('button', { name: /^매출/ }).first().click();
  expect(await april(page)).toEqual([15700000, 8500000, 0, 0, '매출', '보험']);
  await noMinusSales(page);

  // (나) 나간 줄 → 매출: 확인 창이 뜬다 → [취소]면 그대로
  const outMenu = await openRowMenu(page, MIX + ' · 나간 돈');
  await outMenu.getByRole('button', { name: /^매출/ }).first().click();
  await expect(outMenu.locator('.addq')).toHaveText(ASK);
  await outMenu.getByRole('button', { name: '취소' }).click();
  // 취소하면 고르던 메뉴로 돌아간다 — 값은 그대로
  await expect(outMenu.locator('.addq')).toHaveCount(0);
  await expect(outMenu.getByRole('button', { name: /^보험/ }).first()).toBeVisible();
  expect(await april(page)).toEqual([15700000, 8500000, 0, 0, '매출', '보험']);

  // [매출 차감으로 정하기]면 출금 2,500,000 이 매출을 줄인다
  await outMenu.getByRole('button', { name: /^매출/ }).first().click();
  await outMenu.getByRole('button', { name: '매출 차감으로 정하기' }).click();
  expect(await april(page)).toEqual([13200000, 6000000, 0, 0, '매출', '매출']);
  // 매출 목록의 나간 줄에 안내가 붙는다
  await openSection(page, '사업으로 번 돈', '매출');
  expect(await rowText(page, MIX + ' · 나간 돈')).toContain(NOTE);
  expect(await rowText(page, MIX + ' · 들어온 돈')).not.toContain(NOTE);

  // (바) 저장 → 다시 열기 뒤에도 그대로
  await toResult(page, true);
  expect(await april(page)).toEqual([13200000, 6000000, 0, 0, '매출', '매출']);
  await openSection(page, '사업으로 번 돈', '매출');
  expect(await rowText(page, MIX + ' · 나간 돈')).toContain(NOTE);
  expect(errors).toEqual([]);
});

test('섞이지 않은 거래처는 한 줄 그대로 — 출금만 있는 곳의 매출도 확인 창을 거친다', async ({
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
  await menu.getByRole('button', { name: /^매출/ }).first().click();
  await expect(menu.locator('.addq')).toHaveText(ASK);
  await menu.getByRole('button', { name: '취소' }).click();
  expect(await april(page, '나래식자재')).toEqual([15000000, 8500000, 700000, 0, null, '식자재']);
  expect(errors).toEqual([]);
});

test('질문 카드에서 섞인 거래처에 「매출」 — 입금만 매출, 출금은 아직 안 정함 → 다시 물어도 매출을 덮지 않는다', async ({
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
  // (가) 카드 「매출」 → 입금 700,000 만 매출. 출금 2,500,000 은 아직 안 정한 돈
  await answerCards(page, { [MIX]: '매출', ...BASE });
  // 카드가 다음으로 넘어갔다 — 같은 거래처를 곧바로 다시 묻지 않는다
  expect(await page.evaluate((n) => UP.queue.indexOf(UP.byName[n]) < UP.pos, MIX)).toBe(true);
  await toResult(page, false);
  expect(await april(page)).toEqual([15700000, 6000000, 0, 2500000, '매출', null]);
  await noMinusSales(page);

  // 다시 열기 뒤에도 같다 — 입금만 매출로 저장됐다
  await toResult(page, true);
  expect(await april(page)).toEqual([15700000, 6000000, 0, 2500000, '매출', null]);

  // 「아직 안 정한 돈」 → [차례로 정하기] 로 다시 물어진다. 남은 나간 쪽만 묻고 매출 단추는 없다
  await page.locator('.orow', { hasText: '아직 안 정한 돈' }).first().click();
  await page.getByRole('button', { name: '차례로 정하기' }).click();
  const card = page.locator('.obcard');
  await expect(card).toContainText(
    '들어온 돈(매출)은 정해 두신 그대로 둡니다. 나간 돈의 항목을 골라 주세요.'
  );
  await expect(card.locator('.obbtns').getByRole('button', { name: /^매출/ })).toHaveCount(0);
  await card.locator('.obbtns').getByRole('button', { name: /^기타/ }).click();
  // 매출이 아닌 항목을 골라도 입금 쪽 매출은 그대로, 나간 쪽에만 들어간다
  expect(await april(page)).toEqual([15700000, 8500000, 0, 0, '매출', '기타']);
  await toResult(page, true);
  expect(await april(page)).toEqual([15700000, 8500000, 0, 0, '매출', '기타']);
  await noMinusSales(page);
  expect(errors).toEqual([]);
});

test('결과 화면 「아직 안 정한 돈」 — 섞인 거래처 나간 쪽의 매출은 확인 창, 취소하면 그대로', async ({
  page
}) => {
  const errors = await openApp(page);
  await startWith(page, '식당', await nhisXlsx(page, rows()), STORE);
  await answerCards(page, { [MIX]: '매출', ...BASE });
  await toResult(page, false);
  await page.locator('.orow', { hasText: '아직 안 정한 돈' }).first().click();
  const menu = await openRowMenu(page, MIX, '정하기');
  await menu.getByRole('button', { name: /^매출/ }).first().click();
  await expect(menu.locator('.addq')).toHaveText(ASK);
  await menu.getByRole('button', { name: '취소' }).click();
  expect(await april(page)).toEqual([15700000, 6000000, 0, 2500000, '매출', null]);
  await menu.getByRole('button', { name: /^기타/ }).first().click();
  expect(await april(page)).toEqual([15700000, 8500000, 0, 0, '매출', '기타']);
  expect(errors).toEqual([]);
});

test('출금만 있는 거래처를 매출 차감으로 — 확인 창 · 줄 안내 · 매출이 마이너스인 달의 안내', async ({
  page
}) => {
  const errors = await openApp(page);
  const extra = /** @type {[string, string, number][]} */ ([
    ['2025-04-25 10:00:00', REFUND, -20000000]
  ]);
  await startWith(page, '식당', await nhisXlsx(page, rows(extra)), STORE);
  await answerCards(page, { [MIX]: '보험', ...BASE });
  await toResult(page, false);
  expect(await april(page, REFUND)).toEqual([15000000, 8500000, 700000, 20000000, null, null]);

  // (다) 「아직 안 정한 돈」 → 라온환불 [정하기] → 매출 → 확인 창
  await page.locator('.orow', { hasText: '아직 안 정한 돈' }).first().click();
  const menu = await openRowMenu(page, REFUND, '정하기');
  await menu.getByRole('button', { name: /^매출/ }).first().click();
  await expect(menu.locator('.addq')).toHaveText(ASK);
  await menu.getByRole('button', { name: '매출 차감으로 정하기' }).click();
  // 매출 15,000,000 − 20,000,000 = −5,000,000
  expect(await april(page, REFUND)).toEqual([-5000000, 8500000, 700000, 0, null, '매출']);

  // (라) 매출이 마이너스인 달 — 회색 안내 한 줄 (오류 표시 아님)
  const minus = page.locator('#up-result .sales-minus');
  await expect(minus).toHaveText(MINUS);
  await expect(minus).toHaveClass(/subnote/);
  await openSection(page, '사업으로 번 돈', '매출');
  expect(await rowText(page, REFUND)).toContain(NOTE);
  expect(await rowText(page, '가람카드')).not.toContain(NOTE);

  // (바) 다시 열어도 그대로
  await toResult(page, true);
  expect(await april(page, REFUND)).toEqual([-5000000, 8500000, 700000, 0, null, '매출']);
  await expect(page.locator('#up-result .sales-minus')).toHaveText(MINUS);
  // 다른 달은 안내가 없다
  await page.evaluate(() => {
    UP.month = '2025-03';
    drawResult(monthList());
  });
  await expect(page.locator('#up-result .sales-minus')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('(마) 옛 저장 자료 — 섞인 거래처의 출금이 매출이면 값은 그대로 되살리고 안내가 보인다', async ({
  page
}) => {
  const errors = await openApp(page);
  // 63-4 때 섞인 거래처에 「매출」 하나로 저장된 기기 — 되살리면 양쪽이 매출이다
  await page.evaluate(
    ([store, mix]) => {
      localStorage.setItem(
        'fc.picks.' + store,
        JSON.stringify({
          v: 1,
          cv: CAT_CV,
          업종: '식당',
          store,
          owner: '홍길동',
          picks: { [mix]: '매출', 가람카드: '매출', 나래식자재: '식자재', 건물주A: '월세' }
        })
      );
    },
    [STORE, MIX]
  );
  await startWith(page, '식당', await nhisXlsx(page, rows()), STORE, false);
  await answerCards(page, BASE);
  await toResult(page, false);
  // 바꾸지 않는다: 출금 2,500,000 이 매출을 줄인 채로 13,200,000
  expect(await april(page)).toEqual([13200000, 6000000, 0, 0, '매출', '매출']);
  await openSection(page, '사업으로 번 돈', '매출');
  expect(await rowText(page, MIX + ' · 나간 돈')).toContain(NOTE);
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
  await expect(card).not.toContainText('들어온 돈만 매출로 정합니다');
  await expect(card).toContainText(
    '나간 돈(기타)은 정해 두신 그대로 둡니다. 들어온 돈의 항목을 골라 주세요.'
  );
  await card.locator('.obbtns').getByRole('button', { name: /^매출/ }).click();
  expect(await page.evaluate((n) => [UP.byName[n].catIn, UP.byName[n].catOut], MIX)).toEqual([
    '매출',
    '기타'
  ]);
  expect(errors).toEqual([]);
});

// 123차 ⑤ — 표시만. 매출 목록에서 매출 차감 출금 줄은 출금만 있는 거래처 줄처럼 마이너스로 보인다
test('매출 목록 — 섞인 거래처의 나간 줄(매출 차감)은 마이너스, 들어온 줄은 플러스', async ({
  page
}) => {
  const errors = await openApp(page);
  // 63-4 때처럼 「매출」 하나로 저장된 섞인 거래처 — 되살리면 양쪽이 매출
  await page.evaluate(
    ([store, mix]) => {
      localStorage.setItem(
        'fc.picks.' + store,
        JSON.stringify({
          v: 1,
          cv: CAT_CV,
          업종: '식당',
          store,
          owner: '홍길동',
          picks: { [mix]: '매출', 가람카드: '매출', 나래식자재: '식자재', 건물주A: '월세' }
        })
      );
    },
    [STORE, MIX]
  );
  await startWith(page, '식당', await nhisXlsx(page, rows()), STORE, false);
  await answerCards(page, BASE);
  await toResult(page, false);
  // 계산은 그대로 (매출 13,200,000)
  expect(await april(page)).toEqual([13200000, 6000000, 0, 0, '매출', '매출']);

  // 항목별 목록 (drawDetail)
  await openSection(page, '사업으로 번 돈', '매출');
  const value = (label) =>
    page
      .locator('.dtl .drow', { has: page.locator('.dnm', { hasText: label }) })
      .first()
      .locator('.dv')
      .innerText();
  expect(await value(MIX + ' · 나간 돈')).toBe('−2,500,000');
  expect(await value(MIX + ' · 들어온 돈')).toBe('700,000');
  expect(await value('가람카드')).toBe('15,000,000');

  // 정하신 거래처 목록 (drawCatFix) — 같은 규칙
  const fix = await page.evaluate(() => {
    const box = document.createElement('div');
    drawCatFix(box, monthNumbers('2025-04'), '매출');
    return [...box.querySelectorAll('.drow')].map((r) => [
      r.querySelector('.dnm').textContent,
      r.querySelector('.dv').textContent
    ]);
  });
  expect(fix).toEqual(
    expect.arrayContaining([
      [expect.stringContaining(MIX + ' · 나간 돈'), '−2,500,000'],
      [expect.stringContaining(MIX + ' · 들어온 돈'), '700,000']
    ])
  );
  expect(errors).toEqual([]);
});
