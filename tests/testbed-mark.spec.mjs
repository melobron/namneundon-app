// D-테스트베드 참여 표기 (122차).
// ★ 지키는 것 — 사무국 조건. 문구는 한 글자도 안 바뀌고, 「! 안내」를 펼쳤을 때만 보인다(첫 화면·결과 화면에는 없다).
//   로고는 앱 폴더 안 파일이고 가로 120px 안쪽, 이 창의 남는돈 로고보다 작다. 둘레 여백은 로고 높이 절반 이상이다.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';

const MARK = '2026년 하반기 D-테스트베드 참여팀';

test('「! 안내」 아래 참여 표기', async ({ page }) => {
  const errors = await openApp(page);
  // 첫 화면에는 없다 (시작 화면은 .upnote 를 복사해 가므로 그 안에 넣으면 여기 나온다)
  expect(await page.evaluate(() => document.body.innerText)).not.toContain('D-테스트베드');

  await page.evaluate(() => openUpPanel());
  await expect(page.locator('#testbed')).toBeHidden();
  await page.locator('#upinfobtn').click();
  await expect(page.locator('#testbed .testbed-text')).toHaveText(MARK);

  const logo = page.locator('#testbed .testbed-logo');
  await expect(logo).toHaveAttribute('src', 'd-testbed-logo.webp');
  await expect
    .poll(() => logo.evaluate((e) => /** @type {HTMLImageElement} */ (e).naturalWidth))
    .toBeGreaterThan(0);
  const m = await page.evaluate(() => {
    const L = document.querySelector('#testbed .testbed-logo').getBoundingClientRect();
    const B = document.getElementById('testbed').getBoundingClientRect();
    const N = document.querySelector('#up .uplogo img').getBoundingClientRect();
    return {
      w: L.width,
      h: L.height,
      top: L.top - B.top,
      left: L.left - B.left,
      bottom: B.bottom - L.bottom,
      brandW: N.width,
      brandH: N.height
    };
  });
  expect(m.w).toBeLessThanOrEqual(120);
  expect(m.w).toBeLessThan(m.brandW);
  expect(m.h).toBeLessThan(m.brandH);
  for (const gap of [m.top, m.left, m.bottom]) expect(gap).toBeGreaterThanOrEqual(m.h / 2);

  // 다시 접으면 함께 접힌다
  await page.locator('#upinfobtn').click();
  await expect(page.locator('#testbed')).toBeHidden();
  expect(errors).toEqual([]);
});
