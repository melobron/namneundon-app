// 장부 검산 — 월초 잔액 + 들어온 돈 − 나간 돈 = 월말 잔액.
// 날짜를 잘라 계산해도(「지난달 같은 기간」 비교 등) 성립해야 한다.
// 2026-09-25: 잘라 계산할 때 월말 잔액만 그 달 전체로 잡히던 것을 이 테스트로 드러내고 고쳤다 (roadmap B-7).
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';

test('날짜를 잘라도 월초 + 들어온 돈 − 나간 돈 = 월말', async ({ page }) => {
  const errors = await openApp(page);
  const broken = await page.evaluate(() => {
    const out = [];
    for (const m of monthList()) {
      for (const cut of [null, 1, 10, 15, 22]) {
        const d = monthNumbers(m, cut);
        const gap = d.open + d.inTotal - d.outTotal - d.close;
        if (gap !== 0) out.push({ m, cut, gap });
      }
    }
    return out;
  });
  expect(broken).toEqual([]);
  expect(errors).toEqual([]);
});
