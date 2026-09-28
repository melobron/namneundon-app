// 예상 잔액 카드를 펼친 내용 — 계산 근거 · 자료 범위 · 기준일 등.
// 화면 코드 정리(B-4) 때 이 부분(drawDueCardDetail · drawDueNoCard 등)을 떼어냈다. 글자로 지킨다.
import { test, expect } from '@playwright/test';
import { openApp, screenText } from './helpers.mjs';

test('예상 잔액 카드 — 접힘 · 펼침', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  const card = page.locator('.duecard').first();
  await expect(card).toBeVisible();
  expect(await screenText(page, '.duecard')).toMatchSnapshot('1-closed.txt');
  await card.locator('.duetop').click();
  expect(await screenText(page, '.duecard')).toMatchSnapshot('2-open.txt');
});
