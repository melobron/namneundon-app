// 이체 판단 저장 키 — 같은 은행 두 계좌에서 키가 겹칠 때 (검증방 지적, 2026-09-29).
// ★ 화면 안에서는 한 쌍의 답이 다른 쌍으로 번지지 않는다 (쌍 ID = 두 줄의 rowId).
// ★ 저장 키가 지금 자료의 두 쌍 이상에 맞으면 되살리지 않고 다시 묻는다 — 새 키 · 옛 줄 키 모두.
// ★ 키가 한 쌍에만 맞으면 파일을 올린 차례가 바뀌어도 같은 거래에 붙는다.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';

const T = '2023-06-05 10:00:00';
// 한 계좌 파일: 둘째 줄은 나간 이체, 셋째 줄은 들어온 이체 (같은 시각) — 두 파일에서 시각 · 행번호 · 적요가 같다
async function bankFile(page, name, outAmt, inAmt) {
  const b64 = await page.evaluate(
    async ({ T, outAmt, inAmt }) => {
      await loadSheetJS();
      /** @type {any[][]} */
      const rows = [['거래일시', '적요', '출금액', '입금액', '잔액']];
      let bal = 5000000;
      const add = (at, memo, o, i) => {
        bal += i - o;
        rows.push([at, memo, o, i, bal]);
      };
      add('2023-06-01 09:00:00', '관리비', 10000, 0);
      add(T, '이체', outAmt, 0);
      add(T, '이체', 0, inAmt);
      add('2023-06-05 11:00:00', '수수료', 500, 0);
      add('2023-06-20 09:00:00', '관리비', 10000, 0);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '거래내역');
      return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    },
    { T, outAmt, inAmt }
  );
  return {
    name,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(b64, 'base64')
  };
}
async function toResult(page, files, store = '테스트식당') {
  await page.getByRole('button', { name: '식당' }).first().click();
  await page.locator('input[type=file]').first().setInputFiles(files);
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  const name = page.getByPlaceholder('예: 1호점');
  if (await name.isVisible().catch(() => false)) {
    await name.fill(store);
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.getByPlaceholder('예: 홍길동').fill('홍길동');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.getByRole('button', { name: '파일 없이 직접 정하기' }).click();
  }
  // 저장된 매장의 계좌면 「이어서 하기」로 그 매장에 붙는다 (기존 기능)
  const cont = page.getByRole('button', { name: '이어서 하기' });
  if (await cont.isVisible().catch(() => false)) await cont.click();
  const later = page.getByRole('button', { name: '분류는 나중에 하고 결과 보기' });
  if (await later.isVisible().catch(() => false)) await later.click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
}
const state = (page) =>
  page.evaluate(() =>
    findTransfers()
      .map((p) => ({ 금액: p.amount, 답: xferAnswer(p), 키: xferPairKeyIn(UP, p) }))
      .sort((a, b) => a.금액 - b.금액)
  );
async function reopen(page) {
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page
    .getByRole('button', { name: /테스트식당/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
}

test('키가 겹치는 두 쌍 — 답이 번지지 않고, 되살리지 않고 다시 묻는다 (새 키 · 옛 줄 키)', async ({
  page
}) => {
  const errors = await openApp(page);
  // 파일 이름이 숫자만 달라 계좌 열쇠가 같다
  const a = await bankFile(page, '국민은행_1111.xlsx', 100000, 200000);
  const b = await bankFile(page, '국민은행_2222.xlsx', 200000, 100000);
  await toResult(page, [a, b]);
  const 처음 = await state(page);
  expect(처음.length).toBe(2);
  expect(처음[0].키).toBe(처음[1].키); // 저장 키가 똑같은 두 쌍
  const 줄수 = await page.evaluate(() => UP.rows.length);

  await page.evaluate(() => {
    const ps = findTransfers().sort((x, y) => x.amount - y.amount);
    takeXfer([ps[0]]);
    markNotXfer(ps[1]);
  });
  // 화면 안에서는 각 쌍의 답이 따로 선다
  expect((await state(page)).map((x) => x.답)).toEqual(['yes', 'no']);
  // 겹치는 키는 저장하지 않는다 — 되살릴 수 없는 답을 남기지 않는다
  const 저장 = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('fc.picks.'));
    return { k, v: JSON.parse(localStorage.getItem(k)) };
  });
  expect(저장.v.xferOk).toEqual([]);
  expect(저장.v.xferNo).toEqual([]);

  // 다시 열면 어느 쪽에도 붙이지 않고 다시 묻는다. 거래 줄 수는 그대로다
  await reopen(page);
  expect((await state(page)).map((x) => x.답)).toEqual([null, null]);
  expect(await page.evaluate(() => UP.rows.length)).toBe(줄수);

  // 겹치는 키가 저장통에 이미 있어도 (다른 판 등) 붙이지 않는다
  await page.evaluate(
    ({ k, key }) => {
      const o = JSON.parse(localStorage.getItem(k));
      o.xferOk = [key];
      localStorage.setItem(k, JSON.stringify(o));
    },
    { k: 저장.k, key: 처음[0].키 }
  );
  await reopen(page);
  expect((await state(page)).map((x) => x.답)).toEqual([null, null]);

  // 옛 저장본: 줄 키(날짜 | 은행 이름 | 행번호)의 은행 이름은 올린 차례대로 붙은 「국민은행 1 · 2」다.
  // 차례가 바뀌면 다른 계좌를 가리킬 수 있어, 같은 은행 계좌가 둘이면 옛 키로 붙이지 않는다
  const 옛키 = await page.evaluate(() => {
    const p = findTransfers().sort((x, y) => x.amount - y.amount)[0];
    return [xferKey(p.out), xferKey(p.into)];
  });
  await page.evaluate(
    ({ k, 옛키 }) => {
      const o = JSON.parse(localStorage.getItem(k));
      delete o.xferOk;
      delete o.xferNo;
      o.xfer = 옛키;
      localStorage.setItem(k, JSON.stringify(o));
    },
    { k: 저장.k, 옛키 }
  );
  await reopen(page);
  expect((await state(page)).map((x) => x.답)).toEqual([null, null]);
  expect(errors).toEqual([]);
});

test('키가 한 쌍에만 맞으면 — 저장 · 재열기 · 파일 차례를 바꿔 다시 올려도 같은 거래에 붙는다', async ({
  page
}) => {
  const errors = await openApp(page);
  // 은행이 달라 계좌 열쇠가 다르다
  const a = await bankFile(page, '국민은행_거래내역.xlsx', 100000, 200000);
  const b = await bankFile(page, '신한은행_거래내역.xlsx', 200000, 100000);
  await toResult(page, [a, b]);
  await page.evaluate(() => {
    const ps = findTransfers().sort((x, y) => x.amount - y.amount);
    takeXfer([ps[0]]);
    markNotXfer(ps[1]);
  });
  const 저장 = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('fc.picks.'));
    return JSON.parse(localStorage.getItem(k));
  });
  expect(저장.xferOk.length).toBe(1);
  expect(저장.xferNo.length).toBe(1);
  await reopen(page);
  expect((await state(page)).map((x) => [x.금액, x.답])).toEqual([
    [100000, 'yes'],
    [200000, 'no']
  ]);
  // 판단 바꾸기도 남는다
  await page.evaluate(() => {
    const ps = findTransfers().sort((x, y) => x.amount - y.amount);
    clearXferAnswer(ps[0]);
    takeXfer([ps[1]]);
  });
  await reopen(page);
  expect((await state(page)).map((x) => [x.금액, x.답])).toEqual([
    [100000, null],
    [200000, 'yes']
  ]);

  // 파일을 반대 차례로 다시 올린다 — 계좌 차례가 바뀌어도 답은 같은 거래를 따라간다
  await page.goto('/');
  await page.locator('#splash').waitFor({ state: 'detached' });
  await toResult(page, [b, a]);
  expect(await page.evaluate(() => UP.banks.map((x) => x.bank))).not.toEqual(['국민', '신한']);
  expect((await state(page)).map((x) => [x.금액, x.답])).toEqual([
    [100000, null],
    [200000, 'yes']
  ]);
  expect(errors).toEqual([]);
});
