// core/due.js — 예상 잔액의 계산 부품 (일별 예상 지출 · 입금 · 자료 범위 · 날짜).
// 브라우저가 만든 표와 매장 자료를 Node 에 넘겨, 같은 숫자가 나오는지 본다.
// 예측 카드 · 곡선 · 그래프는 캐시·저장소 창구 E 를 받는다 (B-1f-2) — Node 에서는 같은 계산을 하는 E 를 만든다.
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

test('Node 계산 = 브라우저 계산 — 예상 잔액 카드 · 곡선 · 그래프 · 되짚기 (환경 E 로)', async ({
  page
}) => {
  await openApp(page);
  const b = await page.evaluate(() => {
    const t = dueTable();
    const last = t.days.length - 1;
    const c = dueCard();
    const months = monthList();
    const cv = dueCurve(months, c);
    const r = {
      U: JSON.stringify(UP),
      plan: JSON.stringify(planBox()),
      planAt: planAt(),
      project: dueProject(t, last, dueDay()),
      past: duePast(t, dueDay(), last),
      card: c,
      curve: cv,
      pts: dueGraphPts(c, cv),
      spread: dueSpread(),
      unknownAccs: dueUnknownAccs(),
      sig: dueInputSig(),
      months
    };
    r.table = JSON.stringify(t);
    return r;
  });
  const U = JSON.parse(b.U);
  // Node 의 창구: 표는 core 로 한 번 세워 기억하고(앱의 캐시와 같다), 예정 지출은 브라우저 것을 그대로
  let memo;
  const E = {
    table: () => memo || (memo = core.dueTableBuildIn(U)),
    plan: () => JSON.parse(b.plan),
    planAt: () => b.planAt
  };
  const plain = (x) => JSON.parse(JSON.stringify(x));
  // 표를 세우는 계산 자체도 브라우저와 같다 (__ 로 시작하는 칸은 계산하면서 표에 붙는 기억 — 끝에서 따로 본다)
  const bare = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('__')));
  expect(bare(plain(core.dueTableBuildIn(U)))).toEqual(bare(JSON.parse(b.table)));
  const t = E.table();
  const last = t.days.length - 1;
  expect(plain(core.dueProjectIn(U, E, t, last, core.dueDayIn(U)))).toEqual(plain(b.project));
  expect(plain(core.duePastIn(U, E, t, core.dueDayIn(U), last))).toEqual(plain(b.past));
  const c = core.dueCardIn(U, E);
  expect(plain(c)).toEqual(plain(b.card));
  const cv = core.dueCurveIn(U, E, b.months, c);
  expect(plain(cv)).toEqual(plain(b.curve));
  expect(plain(core.dueGraphPtsIn(U, E, c, cv))).toEqual(plain(b.pts));
  expect(plain(core.dueSpreadIn(U, E))).toEqual(plain(b.spread));
  expect(plain(core.dueUnknownAccsIn(U, E))).toEqual(plain(b.unknownAccs));
  expect(core.dueInputSigIn(U, E)).toBe(b.sig);
  // 같은 계산을 다 거친 뒤, 표에 붙은 기억까지 브라우저와 같다
  expect(plain(E.table())).toEqual(JSON.parse(b.table));
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
