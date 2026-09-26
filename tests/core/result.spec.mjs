// core/result.js — 결과 화면 · 1년치 그래프의 계산 부품: 볼 달 고르기 · 달 이름 · 그래프 눈금 · 하루 흐름 · 사업 외 목록.
// 매장 자료(UP)가 필요한 것은 fIn(U, …) 이다. 브라우저의 UP 를 Node 에 넘겨 같은 답이 나오는지 본다.
import { test, expect } from '@playwright/test';
import { openApp } from '../helpers.mjs';
import { loadCore } from './load-core.mjs';

const core = loadCore();
const plain = (x) => (x === undefined ? null : JSON.parse(JSON.stringify(x)));

test('Node 계산 = 브라우저 계산 — 예시 매장의 결과 화면 계산', async ({ page }) => {
  await openApp(page);
  const b = await page.evaluate(() => {
    const months = monthList();
    const cols = months.map((m) => monthNumbers(m));
    const days = [1, 10, 15, 28];
    return {
      U: JSON.stringify(UP),
      months,
      cols: JSON.stringify(cols),
      whole: {
        asOfText: asOfText(),
        unsetCount: unsetCount(),
        etcName: etcName(),
        viewable: viewableMonth(months, null),
        viewableNot: viewableMonth(months, months[months.length - 1]),
        opening: openingMonths(cols, months),
        closed: closedCols(months, cols),
        lastClosed: lastClosedMonth(months)
      },
      per: months.map((m) => ({
        bigOutDay: bigOutDay(months, m),
        label: monthLabelR(m, months),
        flow: dailyFlow(m, null),
        flowCut: dailyFlow(m, 15),
        pick: dayPick(m),
        split: days.map((d) => daySplit(m, d)),
        manual: days.map((d) => dayManual(m, d)),
        keep: [true, false].map((isIn) => keepPayees(monthNumbers(m), '사업 외 용도', isIn, false)),
        keepN: [true, false].map((isIn) => keepCount(monthNumbers(m), '사업 외 용도', isIn, false))
      }))
    };
  });
  const U = JSON.parse(b.U);
  const months = b.months;
  const cols = JSON.parse(b.cols);
  const days = [1, 10, 15, 28];
  expect(months.length).toBeGreaterThan(0);
  const whole = {
    asOfText: core.asOfTextIn(U),
    unsetCount: core.unsetCountIn(U),
    etcName: core.etcNameIn(U),
    viewable: core.viewableMonthIn(U, months, null),
    viewableNot: core.viewableMonthIn(U, months, months[months.length - 1]),
    opening: core.openingMonthsIn(U, cols, months),
    closed: core.closedColsIn(U, months, cols),
    lastClosed: core.lastClosedMonthIn(U, months)
  };
  for (const k of Object.keys(whole)) expect(plain(whole[k]), k).toEqual(plain(b.whole[k]));
  months.forEach((m, i) => {
    const per = {
      bigOutDay: core.bigOutDayIn(U, months, m),
      label: core.monthLabelRIn(U, m, months),
      flow: core.dailyFlowIn(U, m, null),
      flowCut: core.dailyFlowIn(U, m, 15),
      pick: core.dayPickIn(U, m),
      split: days.map((d) => core.daySplitIn(U, m, d)),
      manual: days.map((d) => core.dayManualIn(U, m, d)),
      keep: [true, false].map((isIn) =>
        core.keepPayeesIn(U, core.monthNumbersIn(U, m), '사업 외 용도', isIn, false)
      ),
      keepN: [true, false].map((isIn) =>
        core.keepCountIn(U, core.monthNumbersIn(U, m), '사업 외 용도', isIn, false)
      )
    };
    for (const k of Object.keys(per))
      expect(plain(per[k]), `${m} ${k}`).toEqual(plain(b.per[i][k]));
  });
});

test.describe('그래프 눈금', () => {
  test('axisTicks — 범위를 눈금 간격으로 나눈다 (양 끝 포함)', () => {
    const r = core.axisRange(-120, 980);
    expect(r.lo).toBeLessThanOrEqual(-120);
    expect(r.hi).toBeGreaterThanOrEqual(980);
    const ticks = core.axisTicks(r.lo, r.hi, r.step);
    expect(ticks[0]).toBe(r.lo);
    expect(ticks[ticks.length - 1]).toBe(r.hi);
    for (let i = 1; i < ticks.length; i++) expect(ticks[i] - ticks[i - 1]).toBeCloseTo(r.step);
  });

  test('niceStepFor — 1 · 2 · 2.5 · 5 · 10 의 자릿수 배만 쓴다', () => {
    for (const span of [7, 95, 1234, 56789, 3000000]) {
      const s = core.niceStepFor(span, 5);
      const m = s / Math.pow(10, Math.floor(Math.log10(s)));
      expect([1, 2, 2.5, 5, 10]).toContain(+m.toFixed(6));
    }
  });
});

test.describe('글자 · 날짜', () => {
  test('moneyRead — 숫자만 읽고 음수 · 빈 값은 0', () => {
    expect(core.moneyRead('1,234,000원')).toBe(1234000);
    expect(core.moneyRead('')).toBe(0);
    expect(core.moneyRead('-500')).toBe(500); // 부호는 글자로 보고 버린다
  });

  test('yearMonths · yearsWithData — 한 해의 열두 달, 자료가 있는 해', () => {
    const ym = core.yearMonths(2024);
    expect(ym.length).toBe(12);
    expect(ym[0]).toBe('2024-01');
    expect(ym[11]).toBe('2024-12');
    expect(core.yearsWithData(['2023-11', '2024-01', '2024-02'])).toEqual(['2023', '2024']); // 해는 글자로
  });

  test('checksLeftIn — 이 달에 「괜찮아요」 누르지 않은 카드만 센다', () => {
    const cards = [
      { kind: 'new', p: { name: '새거래처' } },
      { kind: 'grow', p: { name: '큰거래처' } }
    ];
    const id = core.checkId(cards[0]);
    expect(id).toBe('new:새거래처');
    const U = { month: '2024-03', okWarn: { ['2024-03|' + id]: 1 } };
    expect(core.checksLeftIn(U, cards)).toBe(1);
    expect(core.checksLeftIn({ month: '2024-03' }, cards)).toBe(2);
  });
});
