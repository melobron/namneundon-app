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

  // NAM-9 (2026-09-29): 예상 기간을 묻지 않는다. 저장통에 예전 목표일이 있어도 늘 다음 달 말일이다
  test('dueDayIn — 예전에 고른 목표일과 상관없이 늘 말일', () => {
    expect(core.DUE_END_DAY).toBe(31);
    expect(core.dueDayIn({})).toBe(31);
    expect(core.dueDayIn({ dueDay: 25 })).toBe(31);
    expect(core.dueDayIn({ dueDay: 10 })).toBe(31);
    expect(core.dueDayIn(null)).toBe(31);
  });

  test('예상 종료일 — 자료 기준일이 속한 달의 다음 달 말일 (28·29·30·31일 · 해 넘김)', () => {
    const end = (at) => core.nextDue(at, core.dueDayIn({}));
    expect(end('2023-08-22')).toBe('2023-09-30'); // 30일
    expect(end('2023-03-31')).toBe('2023-04-30');
    expect(end('2023-07-01')).toBe('2023-08-31'); // 31일
    expect(end('2023-01-31')).toBe('2023-02-28'); // 28일
    expect(end('2024-01-10')).toBe('2024-02-29'); // 윤년 29일
    expect(end('2023-12-28')).toBe('2024-01-31'); // 해를 넘긴다
  });
});

// 다음 달 1일 ~ 말일 가운데 가장 낮은 예상 잔액. 점은 dueGraphPts 와 같은 모양이다
test.describe('다음 달 최저 예상 잔액', () => {
  const D = (at) => core.dayNum(at);
  // 기준일 다음 날부터 끝날까지 날마다 [입금 전, 일말] 두 점. 값은 날짜 → [입금전, 일말]
  const pts = (오늘, 끝, 값) => {
    const 점 = [{ 날: D(오늘), 값: 1000, 갈래: '기준' }];
    for (let d = D(오늘) + 1; d <= D(끝); d++) {
      const v = 값(d);
      점.push({ 날: d, 값: v[0], 갈래: '입금전', 같음: v[0] === v[1] });
      점.push({ 날: d, 값: v[1], 갈래: '일말', 같음: v[0] === v[1] });
    }
    return { 점, 시작: D(오늘), 끝: D(끝) };
  };
  const card = (오늘, 목표, 잘림 = null) => ({ 오늘, 목표, 잘림 });

  test('이번 달 최저와 다음 달 최저가 다르면 다음 달 것을 고른다', () => {
    // 8월 25일이 전체 최저(−500), 9월 12일이 9월 최저(200)
    const p = pts('2023-08-22', '2023-09-30', (d) =>
      d === D('2023-08-25') ? [-500, 100] : d === D('2023-09-12') ? [200, 900] : [800, 900]
    );
    const low = core.dueNextMonthLowIn(card('2023-08-22', '2023-09-30'), p);
    expect(low.달).toBe('2023-09');
    expect(low.날수).toBe(D('2023-09-12'));
    expect(low.값).toBe(200);
    expect(low.갈래).toBe('입금전');
    expect(low.전부).toBe(true);
  });

  test('다음 달 말일(1월 31일)까지 찾고 해를 넘긴다', () => {
    const p = pts('2023-12-28', '2024-01-31', (d) =>
      d === D('2024-01-31') ? [100, 400] : [500, 600]
    );
    const low = core.dueNextMonthLowIn(card('2023-12-28', '2024-01-31'), p);
    expect(low.달).toBe('2024-01');
    expect(low.날수).toBe(D('2024-01-31'));
    expect(low.끝날).toBe(D('2024-01-31'));
  });

  test('윤년 2월 — 29일까지 찾는다', () => {
    const p = pts('2024-01-10', '2024-02-29', (d) =>
      d === D('2024-02-29') ? [50, 70] : [300, 300]
    );
    const low = core.dueNextMonthLowIn(card('2024-01-10', '2024-02-29'), p);
    expect(low.날수).toBe(D('2024-02-29'));
    expect(low.첫날).toBe(D('2024-02-01'));
  });

  test('같은 값이면 앞선 날의 입금 전 시점', () => {
    const p = pts('2023-03-15', '2023-04-30', () => [300, 300]);
    const low = core.dueNextMonthLowIn(card('2023-03-15', '2023-04-30'), p);
    expect(low.날수).toBe(D('2023-04-01'));
    expect(low.갈래).toBe('입금전');
  });

  test('비교 자료가 모자라 다음 달 중간에서 끝나면 계산된 날까지만 · 닿지 못하면 없음', () => {
    const 중간 = pts('2023-08-22', '2023-09-15', () => [400, 500]);
    const low = core.dueNextMonthLowIn(card('2023-08-22', '2023-09-15', '2023-09-30'), 중간);
    expect(low.전부).toBe(false);
    expect(low.계산끝).toBe(D('2023-09-15'));
    const 못닿음 = pts('2023-08-22', '2023-08-29', () => [400, 500]);
    expect(core.dueNextMonthLowIn(card('2023-08-22', '2023-08-29', '2023-09-30'), 못닿음)).toBe(
      null
    );
  });
});

// 예상 금액은 원 단위 그대로 (2026-09-29 요한 확정 — 만원 표기 취소). 반올림 · 내림 · 올림 · 「1만원 미만」 없음
test('예상 금액 원 단위 표기', () => {
  expect(core.dueWon(75374590)).toBe('75,374,590원');
  expect(core.dueWon(-5230)).toBe('−5,230원');
  expect(core.dueWon(-3000)).toBe('−3,000원');
  expect(core.dueWon(0)).toBe('0원');
  expect(core.dueWon(48507077)).toBe('48,507,077원');
  expect(core.dueWon(102242103.4)).toBe('102,242,103원');
});
