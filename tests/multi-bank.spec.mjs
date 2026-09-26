// 계좌가 둘일 때만 나오는 것 — 계좌 간 이체 확인 카드 · 기간이 다른 구간 안내 · 늦게 시작한 계좌 안내(B-9).
// 예시 거래(국민) + 6월부터 시작하는 두 번째 은행 파일. 두 번째 파일에는 예시의 6월 출금 하나와
// 같은 금액 · 같은 시각의 입금을 넣어 이체 후보를 만든다.
import { test, expect } from '@playwright/test';
import { openApp, demoAsBankXlsx, screenText } from './helpers.mjs';

test('계좌 두 개 — 이체 카드 · 기간 안내 · 늦게 시작한 계좌', async ({ page }) => {
  await openApp(page);
  const a = await demoAsBankXlsx(page);
  const b64 = await page.evaluate(async () => {
    // 예시의 6월 첫 출금 (100만원 이상)
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
  const b = {
    name: '신한은행_거래내역.xlsx',
    mimeType: a.mimeType,
    buffer: Buffer.from(b64, 'base64')
  };

  await page.getByRole('button', { name: '식당' }).click();
  await page.locator('input[type=file]').first().setInputFiles([a, b]);
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
  const due = page
    .locator('#up button:visible')
    .filter({ hasText: /^(확인|이대로 보기|결과 보기|다음)$/ });
  if (await due.count()) await due.first().click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();

  expect(await page.evaluate(() => UP.banks.length)).toBe(2);
  expect(await page.evaluate(() => findTransfers().length)).toBeGreaterThan(0);
  for (const mm of ['05', '06']) {
    await page.evaluate((x) => goMonth(DEMO_YEAR + '-' + x), mm);
    await page.locator('.balrow2').first().click(); // 월말 잔액 줄을 펼친다 (B-9 안내)
    expect(await screenText(page, '#up-result')).toMatchSnapshot(`month-${mm}.txt`);
  }
});
