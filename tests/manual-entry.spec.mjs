// 직접 적는 돈 — 현금매출을 적고 [넣기]를 누르면 그 줄에 나오고, 그 달 「직접 넣은 들어온 돈」(manIn)에 더해진다.
// (통장 합계 inTotal 은 통장 그대로라 안 바뀐다)
// 결과 화면 정리(B-4) 때 이 칸을 그리는 함수(drawEntryBox · drawCashRow)를 옮겼다. 누르는 길을 지킨다.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';

test('현금매출을 직접 적으면 그 달 직접 넣은 돈에 더해진다', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await page.locator('select:visible').first().selectOption('2023-03');
  const before = await page.evaluate(() => monthNumbers('2023-03').manIn);
  const bankIn = await page.evaluate(() => monthNumbers('2023-03').inTotal);

  // 들어온 돈 줄을 펼치고 → 현금매출 줄을 펼치고 → [＋ 추가] 로 금액 칸을 연다
  await page.locator('.mcalc.minearn:visible').first().click();
  await page.locator('.tapx:visible', { hasText: '현금매출' }).first().click();
  await page.getByRole('button', { name: '＋ 추가' }).first().click();
  await page.getByPlaceholder('금액').first().fill('150000');
  await page.getByRole('button', { name: '넣기', exact: true }).first().click();

  const cash = page.locator('.tapx:visible', { hasText: '현금매출' }).first();
  await expect(cash).toContainText('150,000');
  const after = await page.evaluate(() => monthNumbers('2023-03').manIn);
  expect(after - before).toBe(150000);
  expect(await page.evaluate(() => monthNumbers('2023-03').inTotal)).toBe(bankIn);
});
