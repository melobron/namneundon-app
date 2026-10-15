// 확인된 계좌 간 이체가 「아직 안 정한 돈」에 남던 문제 (A안, 2026-10-15).
// 매출 · 운영비 · 개인 통장 3개(2025-02~04, 합성 자료)를 함께 올리고 이체 후보 6쌍을 한꺼번에 확인하면
// 4월 「아직 안 정한 돈」이 17,400,000원 → 3,400,000원이 된다.
// ★ 남는 340만원은 일부러 넣은, 앱이 못 잡는 거래다 —
//   100만원 출금을 60만 + 40만으로 나눠 받음, 70만원이 이틀 뒤 도착.
// ★ 실제 거래 파일은 쓰지 않는다. 아래 줄은 전부 지어낸 것이다.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';

// [날짜, 적요, 금액(+ 입금 · − 출금)]
const 매출통장 = [
  ['02-03 09:00:00', '카드매출', 8123400],
  ['02-05 10:00:00', '운영비이체', -2000000],
  ['02-20 09:00:00', '카드매출', 7456700],
  ['03-03 09:00:00', '카드매출', 8234500],
  ['03-05 10:00:00', '운영비이체', -2500000],
  ['03-10 11:00:00', '대표개인이체', -1200000],
  ['03-20 09:00:00', '카드매출', 7345600],
  ['04-01 09:00:00', '카드매출', 8345600],
  ['04-03 10:00:00', '운영비이체', -3000000],
  ['04-10 11:00:00', '대표개인이체', -1500000],
  ['04-15 10:00:00', '운영비이체', -2500000],
  ['04-20 10:00:00', '운영비이체', -1000000], // 60만 + 40만으로 나눠 받음 — 앱이 못 잡는다
  ['04-22 09:00:00', '카드매출', 7234500],
  ['04-25 11:00:00', '대표개인이체', -700000], // 이틀 뒤 도착 — 앱이 못 잡는다
  ['04-30 09:00:00', '카드매출', 1111100]
];
const 운영비통장 = [
  ['02-05 10:05:00', '매출통장입금', 2000000],
  ['02-10 10:00:00', '임대료', -1650000],
  ['02-15 10:00:00', '식자재', -432100],
  ['03-05 10:05:00', '매출통장입금', 2500000],
  ['03-10 10:00:00', '임대료', -1650000],
  ['03-15 10:00:00', '식자재', -456300],
  ['04-03 10:05:00', '매출통장입금', 3000000],
  ['04-10 10:00:00', '임대료', -1650000],
  ['04-16 09:00:00', '매출통장입금', 2500000], // 하루 뒤 도착 — 이체 후보로 잡힌다
  ['04-20 10:05:00', '매출통장입금', 600000],
  ['04-20 10:06:00', '매출통장입금', 400000],
  ['04-21 10:00:00', '식자재', -478900]
];
const 개인통장 = [
  ['02-12 12:00:00', '생활비', -212300],
  ['03-10 11:05:00', '사업통장입금', 1200000],
  ['03-12 12:00:00', '생활비', -234500],
  ['04-10 11:05:00', '사업통장입금', 1500000],
  ['04-12 12:00:00', '생활비', -245600],
  ['04-27 11:00:00', '사업통장입금', 700000]
];
const 정할곳 = { 카드매출: '매출', 임대료: '월세', 식자재: '식자재', 생활비: '사업 외 용도' };
const 이체거래처 = ['운영비이체', '대표개인이체', '매출통장입금', '사업통장입금'];
const XFER = '계좌끼리 옮긴 돈'; // core 의 XFER_PART

async function bankFile(page, name, open, lines) {
  const b64 = await page.evaluate(
    async ({ open, lines }) => {
      await loadSheetJS();
      /** @type {any[][]} */
      const rows = [['거래일시', '적요', '출금액', '입금액', '잔액']];
      let bal = open;
      lines.forEach(([at, payee, a]) => {
        bal += a;
        rows.push(['2025-' + at, payee, a < 0 ? -a : 0, a > 0 ? a : 0, bal]);
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '거래내역');
      return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    },
    { open, lines }
  );
  return {
    name,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(b64, 'base64')
  };
}

// 4월 숫자 · 일별 목록 · 잔액. 매출 · 지출 · 순이익 · 잔액은 이체 확인 전후로 같아야 한다
async function april(page) {
  return page.evaluate((XFER) => {
    const d = monthNumbers('2025-04');
    const why = (day, payee) =>
      daySplit('2025-04', day)
        .rest.filter((x) => x.r.payee === payee)
        .map((x) => x.why);
    return {
      unknown: d.unknown,
      unknownN: d.unknownN,
      unkPayees: d.unkPayees,
      unkRatio: d.unkRatio,
      xferIn: d.keepInParts[XFER] || 0,
      같은값: {
        sales: d.sales,
        cost: d.cost,
        profit: d.profit,
        otherIn: d.otherIn,
        inTotal: d.inTotal,
        outTotal: d.outTotal,
        open: d.open,
        close: d.close,
        now: nowBalance(),
        months: monthList().map((m) => {
          const x = monthNumbers(m);
          return [m, x.sales, x.cost, x.profit, x.open, x.close];
        })
      },
      // 4월 3일 이체(확인 대상) · 4월 20일 나눠 받은 입금(못 잡는 거래)
      day3: why(3, '운영비이체').concat(why(3, '매출통장입금')),
      day20: why(20, '운영비이체').concat(why(20, '매출통장입금'))
    };
  }, XFER);
}

test('세 계좌 — 이체 후보 6쌍을 한꺼번에 확인하면 4월 미정 1,740만 → 340만', async ({ page }) => {
  const errors = await openApp(page);
  const files = [
    await bankFile(page, '국민은행_매출통장.xlsx', 10000000, 매출통장),
    await bankFile(page, '신한은행_운영비통장.xlsx', 1000000, 운영비통장),
    await bankFile(page, '하나은행_개인통장.xlsx', 300000, 개인통장)
  ];
  await page.getByRole('button', { name: '식당' }).click();
  await page.locator('input[type=file]').first().setInputFiles(files);
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.getByPlaceholder('예: 1호점').fill('테스트식당');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByPlaceholder('예: 홍길동').fill('홍길동');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '파일 없이 직접 정하기' }).click();
  await page.getByRole('button', { name: '분류는 나중에 하고 결과 보기' }).click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();

  // 이체 쪽 거래처는 안 정한 채로 두고 나머지만 정한다 — 거래처를 안 정한 채 이체로 확인하는 경우
  await page.evaluate(
    ({ 정할곳, 이체거래처 }) => {
      UP.payees.forEach((g) => {
        if (정할곳[g.name]) setCatQuiet(g, 정할곳[g.name]);
        else if (이체거래처.indexOf(g.name) !== -1) unsetCatQuiet(g);
      });
      goMonth('2025-04');
    },
    { 정할곳, 이체거래처 }
  );
  expect(await page.evaluate(() => [UP.banks.length, findTransfers().length])).toEqual([3, 6]);

  const 전 = await april(page);
  expect(전.unknown).toBe(17400000);
  expect(전.unknownN).toBe(11);
  expect(전.day3).toEqual(['아직 안 정한 돈', '아직 안 정한 돈']);

  // 「확인 전 6건 모두 계좌끼리 옮긴 돈입니다」
  await page.getByRole('button', { name: '계좌끼리 옮긴 돈 확인하기' }).click();
  await page.getByRole('button', { name: '확인 전 6건 모두 계좌끼리 옮긴 돈입니다' }).click();
  await page.evaluate(() => goMonth('2025-04'));

  const 후 = await april(page);
  expect(후.unknown).toBe(3400000);
  expect(후.unknownN).toBe(5);
  // 남은 미정은 앱이 못 잡는 거래뿐이다 — 같은 거래처(운영비이체 · 매출통장입금)의 일반 거래는 남는다
  expect(후.unkPayees).toEqual({
    운영비이체: 1000000,
    매출통장입금: 1000000,
    대표개인이체: 700000,
    사업통장입금: 700000
  });
  expect(후.unkRatio).toBeCloseTo(전.unkRatio * (3400000 / 17400000), 12);
  expect(후.xferIn).toBe(7000000);
  expect(후.day3).toEqual([XFER, XFER]);
  expect(후.day20).toEqual(['아직 안 정한 돈', '아직 안 정한 돈', '아직 안 정한 돈']);
  // 매출 · 지출 · 순이익 · 실제 계좌 잔액은 이체 확인 전후로 같다
  expect(후.같은값).toEqual(전.같은값);
  await expect(page.locator('#up-result')).toContainText('아직 안 정한 돈 (거래 5건)');

  // 같은 저장 자료를 다시 열면 그대로다
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page
    .getByRole('button', { name: /테스트식당/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
  await page.evaluate(() => goMonth('2025-04'));
  const 다시 = await april(page);
  expect(다시.unknown).toBe(3400000);
  expect(다시.day3).toEqual([XFER, XFER]);

  // 「모든 답을 확인 전으로」 — 원래대로 미정으로 돌아간다 (모두 확인한 뒤에는 단추가 바로 보인다)
  await page.getByRole('button', { name: '모든 답을 확인 전으로' }).click();
  await page.evaluate(() => goMonth('2025-04'));
  const 취소 = await april(page);
  expect(취소.unknown).toBe(17400000);
  expect(취소.day3).toEqual(['아직 안 정한 돈', '아직 안 정한 돈']);
  expect(취소.같은값).toEqual(전.같은값);
  expect(errors).toEqual([]);
});
