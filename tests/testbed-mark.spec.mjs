// D-테스트베드 참여 표기 (122차 · 요한 결정 2026-10-15).
// ★ 지키는 것 — 사무국 조건. 문구는 한 글자도 안 바뀌고, 첫 화면 맨 아래 아이콘 줄에만 보인다
//   (결과 화면 · 「! 안내」 · 업로드 창에는 없다). 링크가 아니다.
//   로고는 앱 폴더 안 파일이고 가로 120px 안쪽, 남는돈 로고보다 작다. 둘레 여백은 로고 높이 절반 이상이다.
//   아이콘과 겹치지 않고 가로로 넘치지 않는다. 좁으면 아이콘 위 한 줄로, 같은 오른쪽에 붙는다.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';

const MARK = '2026년 하반기 D-테스트베드 참여팀';

for (const w of [360, 390, 1024]) {
  test(`첫 화면 아이콘 줄의 참여 표기 — ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 800 });
    const errors = await openApp(page);
    const mark = page.locator('#applinks .testbed');
    await expect(mark).toBeVisible();
    await expect(mark.locator('.testbed-text')).toHaveText(MARK);
    await expect(mark.locator('a')).toHaveCount(0);
    await expect(mark.locator('.testbed-logo')).toHaveAttribute('src', 'd-testbed-logo.webp');
    await expect
      .poll(() =>
        mark
          .locator('.testbed-logo')
          .evaluate((e) => /** @type {HTMLImageElement} */ (e).naturalWidth)
      )
      .toBeGreaterThan(0);

    const m = await page.evaluate(() => {
      const r = (e) => e.getBoundingClientRect();
      const box = r(document.querySelector('#applinks .testbed'));
      const logo = r(document.querySelector('#applinks .testbed-logo'));
      const icons = [...document.querySelectorAll('#applinks a')].map(r);
      const brand = r(document.querySelector('.brandlogo'));
      const hit = (a, b) =>
        a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      return {
        logoW: logo.width,
        logoH: logo.height,
        gaps: [logo.left - box.left, logo.top - box.top, box.bottom - logo.bottom],
        brandW: brand.width,
        overlap: icons.some((i) => hit(i, box)),
        sameLine: icons.every((i) => i.top < box.bottom && box.top < i.bottom),
        rightGap: Math.min(...icons.map((i) => i.left)) - box.right,
        boxRight: box.right,
        iconsRight: Math.max(...icons.map((i) => i.right)),
        scrollW: document.documentElement.scrollWidth
      };
    });
    expect(m.logoW).toBeLessThanOrEqual(120);
    expect(m.logoW).toBeLessThan(m.brandW);
    for (const g of m.gaps) expect(g).toBeGreaterThanOrEqual(m.logoH / 2);
    expect(m.overlap).toBe(false);
    expect(m.scrollW).toBe(w);
    // 같은 줄이면 아이콘 왼쪽, 아니면 아이콘 줄 위에서 같은 오른쪽 끝
    if (m.sameLine) expect(m.rightGap).toBeGreaterThan(0);
    else expect(Math.abs(m.boxRight - m.iconsRight)).toBeLessThan(1);

    // 결과(예시) 화면에는 없다
    await page.getByRole('button', { name: '예시 먼저 보기' }).click();
    await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
    await expect(mark).toBeHidden();
    // 「! 안내」를 펼쳐도 없다
    await page.evaluate(() => openUpPanel());
    await page.locator('#upinfobtn').click();
    await expect(page.locator('#upnote')).toBeVisible();
    expect(await page.locator('#up').innerText()).not.toContain('D-테스트베드');
    expect(errors).toEqual([]);
  });
}
