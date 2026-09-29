// 이체 판단 저장 · 되살리기 (검증방 지적, 2026-09-29 — 세 번째 기준).
// ★ 화면 안에서는 한 쌍의 답이 다른 쌍으로 번지지 않는다 (쌍 ID = 두 줄의 rowId).
// ★ 파일 이름 · 시트 이름 · 은행 이름으로는 계좌를 가를 수 없다 — 새로 읽은 파일에는 저장된 답을 붙이지 않고 다시 묻는다.
//   「옮긴 돈입니다」 · 「아닙니다」 모두. 새 키 · 옛 줄 키 모두.
// ★ 이 기기에 저장한 거래내역(fc.data)을 그대로 다시 열 때만, 그 자료에 함께 남긴 쌍 ID 로 되살린다.
// ★ 계좌번호는 저장하지 않는다. 원본 거래 · 분류는 그대로다.
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
// 같은 저장 자료를 그대로 다시 연다 — 시작 화면의 저장된 매장 단추 (파일을 새로 고르지 않는다)
async function reopen(page) {
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page
    .getByRole('button', { name: /테스트식당/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
}

// 새 파일을 읽는다 — 시작 화면으로 가서 파일을 고른다
async function readNew(page, files) {
  await page.goto('/');
  await page.locator('#splash').waitFor({ state: 'detached' });
  await toResult(page, files);
}
const 저장통 = (page) =>
  page.evaluate(() => {
    const pk = Object.keys(localStorage).find((x) => x.startsWith('fc.picks.'));
    const dk = Object.keys(localStorage).find((x) => x.startsWith('fc.data.'));
    return {
      pk,
      picks: JSON.parse(localStorage.getItem(pk)),
      data: JSON.parse(localStorage.getItem(dk))
    };
  });
const 분류 = (page) => page.evaluate(() => UP.payees.map((g) => [g.name, g.cat || null]).sort());
const 답하기 = (page) =>
  page.evaluate(() => {
    const ps = findTransfers().sort((x, y) => x.amount - y.amount);
    takeXfer([ps[0]]);
    markNotXfer(ps[1]);
  });

test('서로 다른 두 계좌가 같은 기본 파일 이름 · 시트 이름이면 — 새로 읽을 때 저장된 답을 붙이지 않는다', async ({
  page
}) => {
  const errors = await openApp(page);
  // 국민 두 계좌가 둘 다 은행 기본 이름 「국민은행_거래내역.xlsx」 · 시트 「거래내역」으로 내려받아졌다.
  // 거래 줄(시각 · 행번호 · 적요 · 금액)까지 같게 만들어, 파일 이름 · 시트 · 은행 · 저장 키가 모두 같다
  const 사업자 = await bankFile(page, '국민은행_거래내역.xlsx', 100000, 200000);
  const 개인 = await bankFile(page, '국민은행_거래내역.xlsx', 100000, 200000);
  const 신한 = await bankFile(page, '신한은행_거래내역.xlsx', 200000, 100000);
  await toResult(page, [사업자, 신한]);
  const 키 = (await state(page)).map((x) => x.키);
  await 답하기(page);
  expect((await state(page)).map((x) => x.답)).toEqual(['yes', 'no']); // 이번 화면에서는 쓴다
  const 앞분류 = await 분류(page);

  // 다른 계좌(개인) 파일을 새로 읽는다 — 이름 · 시트 · 은행 · 저장 키가 모두 같아도 답을 붙이지 않는다
  await readNew(page, [개인, 신한]);
  const 뒤 = await state(page);
  expect(뒤.map((x) => x.키)).toEqual(키); // 파일 이름만으로는 가를 수 없는 경우다
  expect(뒤.map((x) => x.답)).toEqual([null, null]); // 「맞음」 · 「아님」 모두 다시 묻는다
  expect(await 분류(page)).toEqual(앞분류); // 분류는 그대로
  // 저장통에 옛 판이 남긴 쌍 키가 있어도 붙이지 않는다
  const 통 = await 저장통(page);
  await page.evaluate(
    ({ k, 키 }) => {
      const o = JSON.parse(localStorage.getItem(k));
      o.xferOk = [키[0]];
      o.xferNo = [키[1]];
      localStorage.setItem(k, JSON.stringify(o));
    },
    { k: 통.pk, 키 }
  );
  await readNew(page, [개인, 신한]);
  expect((await state(page)).map((x) => x.답)).toEqual([null, null]);
  expect(errors).toEqual([]);
});

test('같은 저장 자료를 그대로 다시 열면 되살리고, 같은 파일이라도 새로 읽으면 다시 묻는다', async ({
  page
}) => {
  const errors = await openApp(page);
  const a = await bankFile(page, '국민은행_거래내역.xlsx', 100000, 200000);
  const b = await bankFile(page, '신한은행_거래내역.xlsx', 200000, 100000);
  await toResult(page, [a, b]);
  const 줄수 = await page.evaluate(() => UP.rows.length);
  await 답하기(page);
  const 앞분류 = await 분류(page);

  // 저장: 분류 저장통(fc.picks)에는 새 답을 남기지 않는다. 거래내역 저장통(fc.data)에 쌍 ID 로 남는다
  const 통 = await 저장통(page);
  expect(통.picks.xferOk).toEqual([]);
  expect(통.picks.xferNo).toEqual([]);
  expect([통.data.xfer.ok.length, 통.data.xfer.no.length]).toEqual([1, 1]);
  expect(JSON.stringify(통.picks)).not.toMatch(/\d{3,6}-\d{2,6}-\d{4,}/); // 계좌번호 모양 없음

  // 같은 저장 자료를 그대로 다시 연다 → 되살린다 (맞음 · 아님 모두). 거래 줄 · 분류 그대로
  await reopen(page);
  expect((await state(page)).map((x) => [x.금액, x.답])).toEqual([
    [100000, 'yes'],
    [200000, 'no']
  ]);
  expect(await page.evaluate(() => UP.rows.length)).toBe(줄수);
  expect(await 분류(page)).toEqual(앞분류);
  // 판단을 바꾸면 그것도 저장 자료와 함께 남는다
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

  // 같은 파일이라도 새로 읽으면 (차례를 바꿔도 · 그대로도) 다시 묻는다 — 새 파일에는 계좌를 이어 줄 근거가 없다
  await readNew(page, [b, a]);
  expect((await state(page)).map((x) => x.답)).toEqual([null, null]);
  await readNew(page, [a, b]);
  expect((await state(page)).map((x) => x.답)).toEqual([null, null]);
  expect(await 분류(page)).toEqual(앞분류);
  expect(errors).toEqual([]);
});

test('키가 겹치는 두 쌍 — 화면에서 답이 번지지 않고, 저장 자료를 다시 열면 쌍마다 제 답으로 돌아온다', async ({
  page
}) => {
  const errors = await openApp(page);
  // 파일 이름이 숫자만 달라 계좌 열쇠가 같다 → 두 쌍의 저장 키가 똑같다
  const a = await bankFile(page, '국민은행_1111.xlsx', 100000, 200000);
  const b = await bankFile(page, '국민은행_2222.xlsx', 200000, 100000);
  await toResult(page, [a, b]);
  const 처음 = await state(page);
  expect(처음.length).toBe(2);
  expect(처음[0].키).toBe(처음[1].키);
  await 답하기(page);
  expect((await state(page)).map((x) => x.답)).toEqual(['yes', 'no']);
  // 같은 저장 자료 다시 열기 — 쌍 ID 는 두 줄을 그대로 가리켜 겹치지 않는다
  await reopen(page);
  expect((await state(page)).map((x) => x.답)).toEqual(['yes', 'no']);
  // 새로 읽기 — 다시 묻는다
  await readNew(page, [a, b]);
  expect((await state(page)).map((x) => x.답)).toEqual([null, null]);
  expect(errors).toEqual([]);
});

test('옛 줄 키(xfer)만 있는 저장본 — 새로 읽을 때 자동 적용하지 않고 지우지도 않는다', async ({
  page
}) => {
  const errors = await openApp(page);
  const a = await bankFile(page, '국민은행_거래내역.xlsx', 100000, 200000);
  const b = await bankFile(page, '신한은행_거래내역.xlsx', 200000, 100000);
  await toResult(page, [a, b]);
  const 옛키 = await page.evaluate(() => {
    const p = findTransfers().sort((x, y) => x.amount - y.amount)[0];
    return [xferKey(p.out), xferKey(p.into)];
  });
  const 통 = await 저장통(page);
  await page.evaluate(
    ({ k, 옛키 }) => {
      const o = JSON.parse(localStorage.getItem(k));
      delete o.xferOk;
      delete o.xferNo;
      o.xfer = 옛키;
      localStorage.setItem(k, JSON.stringify(o));
    },
    { k: 통.pk, 옛키 }
  );
  await readNew(page, [a, b]);
  expect((await state(page)).map((x) => x.답)).toEqual([null, null]);
  await page.evaluate(() => /** @type {any} */ (window).savePicks());
  const 뒤 = await 저장통(page);
  expect(뒤.picks.xfer).toEqual(expect.arrayContaining(옛키)); // 버리지 않고 들고 간다
  expect(errors).toEqual([]);
});
