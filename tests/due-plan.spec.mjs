// 예정 지출 확인·수정 창 — 목록 → 반영된 내역 → 뒤로 → 수정 화면.
// 결과 화면 정리(B-4) 때 이 창을 그리는 함수(openDuePlan)를 쪼갰다. 단추를 눌러야 열려 화면 비교가 못 보므로 여기서 지킨다.
import { test, expect } from '@playwright/test';
import { openApp, screenText } from './helpers.mjs';

test('예정 지출 창의 화면들이 그대로다', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await page.getByText('자세히 ▾').first().click();
  await page.getByRole('button', { name: '예정 지출 확인·수정' }).first().click();
  const pane = '.fcpane';
  await expect(page.locator(pane)).toBeVisible();
  expect(await screenText(page, pane)).toMatchSnapshot('1-list.txt');

  await page.locator(pane).getByRole('button', { name: '반영된 내역 보기' }).first().click();
  expect(await screenText(page, pane)).toMatchSnapshot('2-history.txt');

  // 뒤로 → 목록이 처음과 같다
  await page
    .locator(pane)
    .getByRole('button', { name: /뒤로|목록/ })
    .first()
    .click();
  expect(await screenText(page, pane)).toMatchSnapshot('1-list.txt');

  await page.locator(pane).getByRole('button', { name: '수정', exact: true }).first().click();
  expect(await screenText(page, pane)).toMatchSnapshot('3-edit.txt');
});
