// 예상 영역의 주인공은 다음 달 최저 예상 잔액 (2026-09-29 요한 확정 · 2026-09-30 최종 변경).
// ★ 맨 위 큰 칸 = 그래프와 같은 다음 달 계산상 최저일 하루와 그날 예상 잔액(원 단위). ±30% 범위 · 주 단위 날짜 없음.
// ★ 월말 예상 잔액은 「자세히」로 내린다. 그래프의 월말 금액표는 최저 금액표보다 눈에 덜 띈다.
// ★ 계산 · 기간 · 보류 조건은 그대로다 — 숫자는 numbers.json 스냅샷이 지킨다.
// ★ 「입금 전」은 라벨 · 툴팁에 적지 않는다. 같은 날 출금 먼저라는 가정은 「자세히」 한 줄로만 (2026-09-29 요한 확정).
// ★ 범위를 낼 수 없으면 큰 칸에 월말 값을 올리지 않고 까닭과 할 일을 적는다 (2026-09-29 요한 확정).
import { test, expect } from '@playwright/test';
import { openApp, demoAsBankXlsx } from './helpers.mjs';

test('큰 칸은 그래프와 같은 최저일 · 최저 예상 잔액, 월말은 자세히 · 그래프에서 최저가 더 크게', async ({
  page
}) => {
  await openApp(page);
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  const card = page.locator('#up-result .duecard');
  const top = card.locator('.duetop .dueres');
  await expect(top.locator('.duereslab')).toHaveText(/9월 최저 예상 잔액$/);
  await expect(top.locator('.duresnum')).toHaveText('75,374,590원');
  await expect(top.locator('.dueresday')).toHaveText('9월 10일로 예상됩니다');
  // 한계 안내 (요한 최종 문구) — 접혀 있어도 보인다. 범위 · 주 · 「임시 참고 범위」 문구는 없다
  await expect(card).toContainText(
    '과거 거래를 바탕으로 계산한 예상이며, 실제 날짜와 잔액은 달라질 수 있습니다.'
  );
  await expect(card).toContainText('예상에 없던 큰 입출금은 반영되지 않을 수 있습니다.');
  await expect(card).not.toContainText('임시 참고 범위');
  await expect(card).not.toContainText('참고 범위입니다');
  await expect(card).not.toContainText('무렵');
  await expect(card).not.toContainText('102,242,103');

  // 접힌 카드 글에서 월말 금액은 그래프 금액표에만 있다 — 글줄로는 안 나온다
  const 접힌글 = await card.evaluate((n) =>
    [...n.querySelectorAll('div')]
      .filter((d) => !d.closest('svg') && !d.closest('.duegraph'))
      .map((d) => d.textContent)
      .join('\n')
  );
  expect(접힌글).not.toContain('107,747,567원');
  await expect(card.locator('.dueend')).toHaveCount(0);

  // 자세히에서 월말 예상 잔액 (보조 정보). 범위의 가운데 값 문장은 없다
  await card.locator('.duetop').click();
  await expect(card.locator('.dueend')).toHaveText('월말(9월 30일) 예상 잔액: 107,747,567원');
  await expect(card).not.toContainText('범위의 가운데 값');

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
  expect(최저.글).toBe('계산상 최저 예상 잔액 75,374,590원');
  // 카드와 그래프는 같은 계산 결과다 — 금액이 같고, 그래프 최저 점을 누르면 카드와 같은 날이 선다
  expect(최저.글.replace('계산상 최저 예상 잔액 ', '')).toBe(
    await top.locator('.duresnum').innerText()
  );

  // 「입금 전」은 카드 · 그래프 어디에도 없고, 가정은 자세히 한 줄로
  await expect(card).not.toContainText('입금 전');
  await expect(card).toContainText('같은 날에는 출금이 입금보다 먼저 발생한다고 가정합니다.');

  // 툴팁: 최저일(9월 10일)을 누르면 그날 값 — 「입금 전 · 당일 반영 후」라는 말 없이
  await card.locator('.duegraph svg circle[r="5"]').scrollIntoViewIfNeeded();
  const 점 = await card.locator('.duegraph svg circle[r="5"]').boundingBox();
  await page.mouse.click(점.x + 점.width / 2, 점.y + 점.height / 2);
  await expect(page.locator('#up-result .fcdetday')).toHaveText('9월 10일');
  expect(await top.locator('.dueresday').innerText()).toBe('9월 10일로 예상됩니다');
  const 줄 = await page.locator('#up-result .fcdetrow').allTextContents();
  expect(줄.join('|')).toContain('그날 가장 낮은 예상 잔액 75,374,590원');
  expect(줄.join('|')).not.toContain('입금 전');
});

for (const 경우 of ['다음 달에 닿지 못함', '그래프도 없음 (3개월)'])
  test(
    '최저값을 낼 수 없으면 큰 칸은 까닭과 할 일 · 월말은 자세히에만 (' + 경우 + ')',
    async ({ page }) => {
      await openApp(page);
      await page.getByRole('button', { name: '예시 먼저 보기' }).click();
      await expect(page.locator('#up-result .duetop .duresnum')).toHaveText('75,374,590원');
      // ★ 예시 자료를 잘라서는 이 상태가 안 나온다 — 그 전에 「3개월 미만」 보류가 먼저 걸린다.
      //   그래서 화면 경로만 확인한다: 최저값을 내는 함수를 바꿔 끼운다 (계산은 안 건드린다)
      await page.evaluate((경우) => {
        const w = /** @type {any} */ (window);
        if (경우.startsWith('다음 달')) {
          w.dueNextMonthLow = () => null;
        } else {
          w.dueGraphPts = () => null;
          w.dueCurveWhy = () => '3개월';
        }
        goMonth(UP.month);
      }, 경우);
      const card = page.locator('#up-result .duecard');
      const top = card.locator('.duetop .dueres');
      await expect(top.locator('.duereslab')).toHaveText(/9월 최저 예상 잔액$/);
      await expect(top.locator('.duresnum')).toHaveCount(0);
      await expect(card).not.toContainText('75,374,590');
      await expect(top).not.toContainText('107,747,567');
      if (경우.startsWith('다음 달')) {
        await expect(top).toContainText(
          '비교할 과거 자료가 모자라 다음 달 최저 예상 잔액을 표시하지 않았습니다.'
        );
        await expect(top).toContainText('더 이전 기간의 거래내역을 추가해 주세요.');
      } else {
        await expect(top).toContainText(
          '비교할 지난 3개월 자료가 모자라 다음 달 최저 예상 잔액과 그래프를 표시하지 않았습니다.'
        );
        await expect(top).toContainText('3개월 이상의 거래내역을 추가해 주세요.');
        await expect(card.locator('.duegraph')).toHaveCount(0);
      }
      // 예시 화면에는 추가할 파일이 없어 단추를 안 낸다
      await expect(top.getByRole('button', { name: '거래내역 추가하기' })).toHaveCount(0);
      await expect(card.locator('.dueend')).toHaveCount(0);
      await card.locator('.duetop').click();
      await expect(card.locator('.dueend')).toHaveText('월말(9월 30일) 예상 잔액: 107,747,567원');
    }
  );

// 검증방 지적 (2026-09-29): 최저를 표시하지 못한다고 하면서 특정 날짜의 부족 금액 · 경고 아이콘이 남으면 모순이다.
// ★ 시험용 상태: 최저값 함수를 바꿔 끼워 만든 화면이다 (실제 자료로는 재현하지 못했다 — 3개월 미만 보류가 먼저 걸린다)
test('음수 최저 · 최저값을 낼 수 없으면 최저에 기대는 부족 금액 · 경고 아이콘 · 최저 문장을 함께 숨긴다', async ({
  page
}) => {
  const errors = await openApp(page);
  // 다음 달 최저가 −5,230원이 되는 업로드 매장 (시작 잔액만 낮춘 예시 자료)
  await page.clock.setFixedTime(new Date('2023-08-25T10:00:00+09:00'));
  await page.evaluate(() => {
    window.DEMO_OPEN -= 75374590 + 5230;
  });
  const file = await demoAsBankXlsx(page);
  await page.getByRole('button', { name: '식당' }).first().click();
  await page.locator('input[type=file]').first().setInputFiles(file);
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.getByPlaceholder('예: 1호점').fill('테스트식당');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByPlaceholder('예: 홍길동').fill('홍길동');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '파일 없이 직접 정하기' }).click();
  await page.getByRole('button', { name: '분류는 나중에 하고 결과 보기' }).click();
  const card = page.locator('#up-result .duecard');
  // 정상 예측 (음수): 카드와 그래프가 같은 날 · 같은 금액, 음수 뜻 한 줄, 경고 아이콘 · 부족 줄은 그대로다
  await expect(card.locator('.duetop .duresnum')).toHaveText('−5,230원');
  await expect(card.locator('.duetop .dueresday')).toHaveText('9월 10일로 예상됩니다');
  const 그래프표 = await card
    .locator('.duegraph svg text')
    .evaluateAll((ts) => ts.map((t) => t.textContent).filter((x) => x.includes('계산상 최저')));
  expect(그래프표).toEqual(['계산상 최저 예상 잔액 −5,230원']);
  await expect(card).toContainText('음수는 예상대로 돈이 들어오고 나갈 경우');
  await expect(card).not.toContainText('26,872,743');
  await expect(card.locator('.dueicon')).toHaveCount(1);
  await card.locator('.duetop').click();
  await expect(card).toContainText('모자랄 수 있습니다');
  await expect(card).toContainText('계산상 최저 예상 잔액은');
  await card.locator('.duetop').click();

  // 최저값을 낼 수 없는 상태 (시험용)
  await page.evaluate(() => {
    const w = /** @type {any} */ (window);
    w.dueNextMonthLow = () => null;
    goMonth(UP.month);
  });
  await expect(card.locator('.duetop')).toContainText(
    '다음 달 최저 예상 잔액을 표시하지 않았습니다.'
  );
  await expect(card.getByRole('button', { name: '거래내역 추가하기' })).toHaveCount(1);
  await expect(card.locator('.dueicon')).toHaveCount(0);
  await expect(card).not.toContainText('모자랄 수 있습니다');
  await expect(card).not.toContainText('5,230원');
  // 자세히에도 최저에 기대는 날짜 · 금액 · 문장이 없다. 월말 값과 계산 근거는 있다
  await card.locator('.duetop').click();
  await expect(card).not.toContainText('모자랄 수 있습니다');
  await expect(card).not.toContainText('계산상 최저 예상 잔액은');
  await expect(card).not.toContainText('범위의 가운데 값');
  await expect(card.locator('.dueend')).toHaveText('월말(9월 30일) 예상 잔액: 32,367,747원');
  await expect(card).toContainText('같은 날에는 출금이 입금보다 먼저 발생한다고 가정합니다.');
  expect(errors).toEqual([]);
});
