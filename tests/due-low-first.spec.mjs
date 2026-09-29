// 예상 영역의 주인공은 다음 달 최저 예상 잔액 (2026-09-29 요한 확정).
// ★ 맨 위 큰 칸 = 다음 달 최저 예상 잔액의 임시 참고 범위(원 단위) + 주 단위 시기.
// ★ 월말 예상 잔액은 「자세히」로 내린다. 그래프의 월말 금액표는 최저 금액표보다 눈에 덜 띈다.
// ★ 계산 · 기간 · 보류 조건은 그대로다 — 숫자는 numbers.json 스냅샷이 지킨다.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';

test('큰 칸은 다음 달 최저 범위와 시기, 월말은 자세히 · 그래프에서 최저가 더 크게', async ({
  page
}) => {
  await openApp(page);
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  const card = page.locator('#up-result .duecard');
  const top = card.locator('.duetop .dueres');
  await expect(top.locator('.duereslab')).toHaveText(/9월 최저 예상 잔액$/);
  await expect(top.locator('.duresnum')).toHaveText('48,507,077원 ~ 102,242,103원');
  await expect(top.locator('.dueresday')).toHaveText(
    '가장 낮은 시기: 9월 4일~10일 무렵 · 임시 참고 범위'
  );
  // 한계 안내는 접혀 있어도 그대로
  await expect(card).toContainText('임시로 넓혀 표시한 참고 범위입니다');
  await expect(card).toContainText('지금 사용할 수 있는 금액을 뜻하지 않습니다');

  // 접힌 카드 글에서 월말 금액은 그래프 금액표에만 있다 — 글줄로는 안 나온다
  const 접힌글 = await card.evaluate((n) =>
    [...n.querySelectorAll('div')]
      .filter((d) => !d.closest('svg') && !d.closest('.duegraph'))
      .map((d) => d.textContent)
      .join('\n')
  );
  expect(접힌글).not.toContain('107,747,567원');
  await expect(card.locator('.dueend')).toHaveCount(0);

  // 자세히에서 월말 예상 잔액 · 계산상 최저일 하루와 중심값
  await card.locator('.duetop').click();
  await expect(card.locator('.dueend')).toHaveText('월말(9월 30일) 예상 잔액: 107,747,567원');
  await expect(card).toContainText('계산상 2023년 9월 중 가장 낮은 날은 9월 10일');
  await expect(card).toContainText('75,374,590원');

  // 그래프: 최저 금액표가 월말 금액표보다 크고, 월말은 테두리만
  const 표 = await card.locator('.duegraph svg text').evaluateAll((ts) =>
    ts
      .filter((t) => /원/.test(t.textContent || ''))
      .map((t) => ({
        글: t.textContent,
        크기: +(t.getAttribute('font-size') || 0),
        색: t.getAttribute('fill')
      }))
  );
  const 최저 = 표.find((x) => x.글.includes('계산상 최저'));
  const 월말 = 표.find((x) => x.글.startsWith('9월 30일'));
  expect(최저 && 월말).toBeTruthy();
  expect(최저.크기).toBeGreaterThan(월말.크기);
  expect(월말.색).toBe('var(--gray)');
});
