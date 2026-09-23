// 예시 화면 — 앱을 열면 예시 거래 2,363건이 실제 계산 경로를 그대로 탄다.
// 계산 숫자와 화면 글자가 한 글자라도 바뀌면 실패한다.
import { test, expect } from '@playwright/test';
import { openApp, screenText, collectNumbers, asJson } from './helpers.mjs';

test('시작 화면', async ({ page }) => {
  const errors = await openApp(page);
  expect(await screenText(page)).toMatchSnapshot('start.txt');
  expect(errors).toEqual([]);
});

test('예시 계산 숫자 전부', async ({ page }) => {
  const errors = await openApp(page);
  expect(asJson(await collectNumbers(page))).toMatchSnapshot('numbers.json');
  expect(errors).toEqual([]);
});

test('예시 결과 화면 — 달마다 · 1년 · 그래프 · 자세히', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();

  expect(await screenText(page)).toMatchSnapshot('result-default.txt');

  // 달마다 — 결과 화면을 그리는 가장 큰 함수(drawResultInner)가 달마다 다른 갈래를 탄다
  const select = page.locator('select:visible').first();
  const values = await select.locator('option').evaluateAll((os) => os.map((o) => o.value));
  for (const v of values) {
    await select.selectOption(v);
    expect(await screenText(page)).toMatchSnapshot(`result-month-${v}.txt`);
  }

  await page.getByRole('button', { name: '1년' }).click();
  expect(await screenText(page)).toMatchSnapshot('result-year.txt');

  await page.getByRole('button', { name: '한 달' }).click();
  await page.getByRole('button', { name: '예상 잔액 그래프 보기' }).click();
  expect(await screenText(page)).toMatchSnapshot('result-due-graph.txt');

  expect(errors).toEqual([]);
});
