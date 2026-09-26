// core/due.js — 예상 잔액의 계산 부품 (일별 예상 지출 · 입금 · 자료 범위 · 날짜).
// 날짜별 잔액 표(t)는 아직 앱의 dueTable() 이 만든다 (캐시가 UP 에 있어서 — B-1f-2 에서 옮긴다).
// 브라우저가 만든 표와 매장 자료를 Node 에 넘겨, 같은 숫자가 나오는지 본다.
import { test, expect } from '@playwright/test';
import { openApp } from '../helpers.mjs';
import { loadCore } from './load-core.mjs';

const core = loadCore();

test('Node 계산 = 브라우저 계산 — 예시 매장의 일별 예상 지출 · 입금 · 자료 범위 · 보류', async ({
  page
}) => {
  await openApp(page);
  const b = await page.evaluate(() => {
    const t = dueTable();
    const last = t.days.length - 1;
    const at = [last, Math.floor(last * 0.66), Math.floor(last * 0.33)];
    return {
      U: JSON.stringify(UP),
      t: JSON.stringify(t),
      at,
      daily: at.map((i) => dueDaily(t, i, false)),
      detail: dueDaily(t, last, true),
      inflow: at.map((i) => dueInflow(t, i, 20)),
      cover: dueCover(t, last),
      unknown: dueUnknownOut(t),
      asof: commonAsOf(t),
      day: dueDay()
    };
  });
  const U = JSON.parse(b.U);
  // JSON 으로 오간 표 — 브라우저 쪽도 같은 JSON 을 거친 값과 비교한다
  const t = () => JSON.parse(b.t);
  const plain = (x) => JSON.parse(JSON.stringify(x));
  expect(plain(b.at.map((i) => core.dueDailyIn(U, t(), i, false)))).toEqual(plain(b.daily));
  expect(plain(core.dueDailyIn(U, t(), b.at[0], true))).toEqual(plain(b.detail));
  expect(plain(b.at.map((i) => core.dueInflowIn(U, t(), i, 20)))).toEqual(plain(b.inflow));
  expect(plain(core.dueCoverIn(U, t(), b.at[0]))).toEqual(plain(b.cover));
  expect(plain(core.dueUnknownOutIn(U, t()))).toEqual(plain(b.unknown));
  expect(core.commonAsOfIn(U, t())).toEqual(b.asof);
  expect(core.dueDayIn(U)).toBe(b.day);
});

test.describe('목표일 계산', () => {
  test('nextDue — 다음 달의 그 날, 없는 날이면 그 달 마지막 날', () => {
    expect(core.nextDue('2024-01-15', 10)).toBe('2024-02-10');
    expect(core.nextDue('2024-01-15', 31)).toBe('2024-02-29'); // 윤년 2월
    expect(core.nextDue('2023-01-15', 31)).toBe('2023-02-28');
    expect(core.nextDue('2024-12-05', 10)).toBe('2025-01-10'); // 해를 넘긴다
  });

  test('shiftMonth — 몇 달 앞뒤로, 날짜는 그 달 안에서', () => {
    expect(core.shiftMonth('2024-03-31', -1)).toBe('2024-02-29');
    expect(core.shiftMonth('2024-01-15', -2)).toBe('2023-11-15');
    expect(core.shiftMonth('2024-11-30', 3)).toBe('2025-02-28');
  });

  test('dueDayIn — 정한 목표일이 없으면 기본값', () => {
    expect(core.dueDayIn({})).toBe(core.DUE_DEFAULT);
    expect(core.dueDayIn({ dueDay: 25 })).toBe(25);
    expect(core.dueDayIn({ dueDay: 0 })).toBe(core.DUE_DEFAULT);
    expect(core.dueDayIn(null)).toBe(core.DUE_DEFAULT);
  });
});
