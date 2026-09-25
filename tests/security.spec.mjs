// 보안 — 밖에서 온 글자(파일 이름)가 HTML 로 해석되지 않는가.
//
// 남에게 받은 엑셀의 파일 이름에 <img src=x onerror=…> 가 들어 있으면,
// 그 이름을 innerHTML 에 그대로 넣는 순간 스크립트가 돈다 (2026-09-25 에 고친 upStat 요약).
// 같은 내용·다른 이름의 파일을 함께 올리면 「건너뛴 파일 — <이름>」으로 요약에 파일 이름이 들어간다.
import { test, expect } from '@playwright/test';
import { openApp, demoAsBankXlsx } from './helpers.mjs';

const EVIL = '<img src=x onerror="window.__pwned=1">.xlsx';

test('파일 이름에 든 HTML 은 글자로만 보인다', async ({ page }) => {
  const errors = await openApp(page);
  const good = await demoAsBankXlsx(page);
  const evil = { ...good, name: EVIL };

  await page.getByRole('button', { name: '식당' }).click();
  await page.locator('input[type=file]').first().setInputFiles([good, evil]);
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.waitForTimeout(500);

  // 스크립트가 돌지 않았다
  expect(await page.evaluate(() => /** @type {any} */ (window).__pwned)).toBeUndefined();
  // 요약에 파일 이름이 글자 그대로 보이고, <img> 요소는 생기지 않았다
  const stat = page.locator('#upstat');
  await expect(stat).toContainText('건너뛴 파일 — <img src=x');
  expect(await stat.locator('img').count()).toBe(0);
  expect(errors).toEqual([]);
});
