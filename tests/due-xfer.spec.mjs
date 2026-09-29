// 예상 잔액 · 아직 안 정한 출금과 계좌 간 이체 (NAM-9 후속, 2026-09-29 요한).
// ★ 아직 안 정한 출금도 잔액 예측용 출금에 넣는다 — 추가 분류 없이 그래프가 나오게.
// ★ 여러 계좌를 합친 잔액에서, 포함된 두 계좌 사이 이체 후보(확인 전)는 넣지도 빼지도 않고 보류한다.
//   확인된 이체(「맞습니다」)는 뺀다. 계좌가 하나면 이체 후보가 없어 그 출금은 그대로 넣는다.
// ★ 사업 수입 · 지출 · 계좌 순이익이 안 바뀌는 것은 numbers.json 스냅샷(월별 값)이 지킨다.
import { test, expect } from '@playwright/test';
import { openApp, demoAsBankXlsx } from './helpers.mjs';

// 예시(국민) + 두 번째 은행. 두 번째 은행에 예시의 6월 첫 100만원 이상 출금과 같은 금액·시각의 입금을 넣는다
async function secondBank(page, base) {
  const b64 = await page.evaluate(async () => {
    const out = DEMO_TX.map((s) => s.split('|')).find(
      (f) => f[0].startsWith('06-') && +f[2] <= -1000000
    );
    /** @type {any[][]} */
    const rows = [['거래일시', '적요', '출금액', '입금액', '잔액']];
    let bal = 500000;
    bal -= 10000;
    rows.push([DEMO_YEAR + '-06-01 08:00:00', '관리비', 10000, 0, bal]);
    bal += -out[2];
    rows.push([DEMO_YEAR + '-' + out[0], '이체입금', 0, -out[2], bal]);
    bal -= 10000;
    rows.push([DEMO_YEAR + '-07-05 10:00:00', '관리비', 10000, 0, bal]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '거래내역');
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  });
  return {
    name: '신한은행_거래내역.xlsx',
    mimeType: base.mimeType,
    buffer: Buffer.from(b64, 'base64')
  };
}

async function toResult(page, files) {
  await page.getByRole('button', { name: '식당' }).click();
  await page.locator('input[type=file]').first().setInputFiles(files);
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.getByPlaceholder('예: 1호점').fill('테스트식당');
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
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
}

test('두 계좌 — 확인 전 이체 후보가 미분류면 보류, 확인하면 빼고 그래프가 나온다', async ({
  page
}) => {
  const errors = await openApp(page);
  const a = await demoAsBankXlsx(page);
  await toResult(page, [a, await secondBank(page, a)]);

  const r = await page.evaluate(() => {
    const p = findTransfers()[0];
    const rid = rowId(p.out);
    const g = UP.byName[keyOf(p.out)];
    const inFc = () => dueTable().지출줄.some((x) => x.rid === rid);
    const state = () => {
      dueFresh();
      const c = dueCard();
      return {
        held: !!(c && c.보류),
        heldHasIt: !!(c && c.보류 && c.보류.목록.some((x) => x.rid === rid)),
        inFc: inFc(),
        graph: !!(c && !c.보류 && c.예상 != null)
      };
    };
    // ① 이체 후보의 출금 쪽 거래처를 아직 안 정함으로 둔다 (확인 전)
    unsetCatQuiet(g);
    const 미분류후보 = state();
    // ② 대표님이 「맞습니다」 — 확인된 이체는 예측 출금에서 뺀다
    takeXfer([p]);
    const 확인 = state();
    // ③ 이체가 아니라고 보고 분류만 한 경우 — 분류된 출금이라 예측 출금에 넣는다 (118차 규칙 그대로)
    dropXfer(p);
    setCatQuiet(g, '기타');
    const 분류 = state();
    unsetCatQuiet(g);
    return { 미분류후보, 확인, 분류 };
  });
  // 확인 전 후보: 합친 잔액에서 두 번 빠지지 않게 넣지 않고, 근거 없이 빼지도 않고 보류한다
  expect(r.미분류후보).toEqual({ held: true, heldHasIt: true, inFc: false, graph: false });
  // 확인된 이체: 빼고, 보류가 풀려 그래프가 나온다
  expect(r.확인).toEqual({ held: false, heldHasIt: false, inFc: false, graph: true });
  // 분류만 한 경우: 분류된 출금으로 넣는다 (기존 규칙)
  expect(r.분류).toEqual({ held: false, heldHasIt: false, inFc: true, graph: true });
  expect(errors).toEqual([]);
});

test('한 계좌 — 다른 계좌로 보낸 미분류 출금을 근거 없이 빼지 않고 예측 출금에 넣는다', async ({
  page
}) => {
  const errors = await openApp(page);
  await toResult(page, [await demoAsBankXlsx(page)]);
  const r = await page.evaluate(() => {
    const out = UP.rows.find((x) => x.at.slice(5, 7) === '06' && x.amount <= -1000000);
    const rid = rowId(out);
    unsetCatQuiet(UP.byName[keyOf(out)]);
    dueFresh();
    const c = dueCard();
    const 줄 = dueTable().지출줄.find((x) => x.rid === rid);
    return {
      후보: findTransfers().length,
      갈래: 줄 && 줄.갈래,
      held: !!(c && c.보류),
      미분류: c && c.미분류 ? c.미분류.건수 : 0
    };
  });
  expect(r.후보).toBe(0);
  expect(r.갈래).toBe('미분류');
  expect(r.held).toBe(false);
  expect(r.미분류).toBeGreaterThan(0);
  // 화면에도 추가 분류 없이 그래프와 안내가 선다
  await expect(page.locator('#up-result .duecard .duegraph svg')).toHaveCount(1);
  await expect(
    page.getByText(/아직 분류하지 않은 출금 [\d,]+건은 예상 출금에 넣었습니다/)
  ).toBeVisible();
  expect(errors).toEqual([]);
});

// NAM-9 배포 전 보완: 거래처를 하나도 정하지 않아도 결과를 볼 수 있다.
// 매출 입금이 모두 미분류면 예측 입금을 0원으로 두지 않고 예측만 보류한다 — 실적은 그대로 보인다
test('분류 0곳 — 결과로 갈 수 있고, 매출이 분류되지 않았으면 예측만 보류한다', async ({ page }) => {
  const errors = await openApp(page);
  const file = await demoAsBankXlsx(page);
  await page.getByRole('button', { name: '식당' }).click();
  await page.locator('input[type=file]').first().setInputFiles(file);
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.getByPlaceholder('예: 1호점').fill('테스트식당');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByPlaceholder('예: 홍길동').fill('홍길동');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '파일 없이 직접 정하기' }).click();
  await page.getByRole('button', { name: '분류는 나중에 하고 결과 보기' }).click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
  await expect(page.locator('#up-result .pnl').first()).toContainText('계좌 순이익');
  await expect(page.getByText(/은 위 숫자에 넣지 않았습니다/)).toBeVisible();

  // 자동으로 매출이 된 거래처를 미분류로 되돌린다 — 매출 입금이 모두 분류되지 않은 매장을 만든다
  const r = await page.evaluate(() => {
    UP.payees.forEach((g) => {
      if (g.cat === '매출' || g.catIn === '매출') unsetCatQuiet(g);
    });
    dueFresh();
    const c = dueCard();
    goMonth(UP.month);
    return { 입금보류: !!(c && c.입금보류), 건수: c && c.입금보류 ? c.입금보류.건수 : 0 };
  });
  expect(r.입금보류).toBe(true);
  expect(r.건수).toBeGreaterThan(0);
  await expect(
    page.getByText('직전 30일에 매출로 분류한 입금이 없어 예상 입금을 계산하지 않았습니다.')
  ).toBeVisible();
  await expect(page.locator('#up-result .duegraph')).toHaveCount(0);
  await expect(page.locator('#up-result .pnl').first()).toContainText('계좌 순이익');
  expect(errors).toEqual([]);
});
