// 파일 올리기 → 매장 이름 → 대표자 → 거래처 분류 → 결과 → 새로고침 후 이어서 보기.
// 사용자가 실제로 밟는 길을 처음부터 끝까지 따라간다.
// ★ 마지막 단계는 「저장된 자료를 되살렸을 때 숫자가 같은가」다.
//   리팩토링하다 저장 형식이 바뀌면 사장님이 정해둔 분류가 사라진다 — 가장 큰 사고다.
import { test, expect } from '@playwright/test';
import {
  openApp,
  screenText,
  collectNumbers,
  asJson,
  demoAsBankXlsx,
  storageDump
} from './helpers.mjs';

const ANSWERS = 20; // 이만큼 정하면 「결과 보기」가 나온다 (119차 기준 94% 정리)

test('업로드부터 결과, 복원까지', async ({ page }) => {
  const errors = await openApp(page);
  const file = await demoAsBankXlsx(page);
  const up = '#up';

  await page.getByRole('button', { name: '식당' }).click();
  await page.locator('input[type=file]').first().setInputFiles(file);
  await expect(page.getByRole('button', { name: '이 파일들로 시작하기' })).toBeVisible();
  expect(await screenText(page, up)).toMatchSnapshot('1-file-list.txt');

  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.getByPlaceholder('예: 1호점').fill('테스트식당');
  expect(await screenText(page, up)).toMatchSnapshot('2-store-name.txt');
  await page.getByRole('button', { name: '다음', exact: true }).click();

  await page.getByPlaceholder('예: 홍길동').fill('홍길동');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '파일 없이 직접 정하기' }).click();
  expect(await screenText(page, up)).toMatchSnapshot('3-onboard-first.txt');

  // 분류 — 예시 화면이 쓰는 정답표(DEMO_PICKS)대로 고른다. 정답표에 없으면 「기타」
  for (let k = 0; k < ANSWERS; k++) {
    const want = await page.evaluate(() => {
      const q = UP.queue[UP.pos];
      return (q && DEMO_PICKS[q.name]) || '기타';
    });
    const btn = page.locator(`${up} button:visible`, { hasText: new RegExp(`^${want}$`) });
    await ((await btn.count()) ? btn : page.locator(`${up} button:visible`, { hasText: /^기타$/ }))
      .first()
      .click();
  }
  expect(await screenText(page, up)).toMatchSnapshot('4-onboard-done.txt');

  await page.getByRole('button', { name: '결과 보기', exact: true }).click();
  // 처음이면 목표일을 한 번 묻는다
  const dueAsk = await screenText(page, up);
  expect(dueAsk).toMatchSnapshot('5-due-ask.txt');
  const dueBtn = page
    .locator(`${up} button:visible`)
    .filter({ hasText: /^(확인|이대로 보기|결과 보기|다음)$/ });
  if (await dueBtn.count()) await dueBtn.first().click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();

  const numbers = asJson(await collectNumbers(page));
  expect(numbers).toMatchSnapshot('numbers.json');
  expect(await screenText(page)).toMatchSnapshot('6-result.txt');
  expect(asJson(await storageDump(page))).toMatchSnapshot('storage.json');

  // 새로고침 → 시작 화면의 저장된 매장 → 이어서 보기
  await page.reload();
  await expect(page.getByRole('button', { name: '예시 먼저 보기' })).toBeVisible();
  await page.locator('#splash').waitFor({ state: 'detached' });
  expect(await screenText(page)).toMatchSnapshot('7-start-with-saved.txt');
  await page
    .getByRole('button', { name: /테스트식당/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
  expect(asJson(await collectNumbers(page))).toBe(numbers); // 되살린 숫자 = 저장 전 숫자

  expect(errors).toEqual([]);
});
