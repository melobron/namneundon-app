// core/compute.js — 월별 집계 · 이체 · 잔액 · 예측 기초. 화면 없이 Node 에서 돈다.
//
// 집계는 매장 자료(UP)를 첫 매개변수 U 로 받는다 (monthNumbersIn(U, 달)).
// 브라우저에서 예시를 연 상태의 UP 를 꺼내 Node 에 그대로 넘기고, 같은 숫자가 나오는지 본다.
import { test, expect } from '@playwright/test';
import { openApp } from '../helpers.mjs';
import { loadCore } from './load-core.mjs';

const core = loadCore();
const noRows = (o) => {
  const c = { ...o };
  delete c.rows;
  return c;
};

test('Node 계산 = 브라우저 계산 — 예시 매장의 월별 집계 · 잔액 · 이체 · 예측', async ({ page }) => {
  await openApp(page);
  // 브라우저: 앱이 실제로 쓰는 함수(연결 함수 → core)로 계산한 값과, 매장 자료 그 자체
  const b = await page.evaluate(() => {
    const months = monthList();
    return {
      U: JSON.stringify(UP),
      months,
      numbers: months.map((m) => monthNumbers(m)),
      cut: months.map((m) => monthNumbers(m, 15)),
      end: months.map((m) => monthEndBalance(m)),
      errs: ASOF_DAYS.map((d) => forecastError(months, d)),
      sales: months.map((m) => salesProjection(months, m)),
      now: nowBalance(),
      xfer: findTransfers()
    };
  });
  const U = JSON.parse(b.U);
  const ASOF = [1, 10, 20];
  expect(core.monthListIn(U)).toEqual(b.months);
  // 결과 객체의 rows 는 거래 행 사본이라 빼고 비교 (나머지 숫자는 전부)
  expect(b.months.map((m) => noRows(core.monthNumbersIn(U, m)))).toEqual(b.numbers.map(noRows));
  expect(b.months.map((m) => noRows(core.monthNumbersIn(U, m, 15)))).toEqual(b.cut.map(noRows));
  expect(b.months.map((m) => core.monthEndBalanceIn(U, m))).toEqual(b.end);
  expect(ASOF.map((d) => core.forecastErrorIn(U, b.months, d))).toEqual(b.errs);
  expect(b.months.map((m) => core.salesProjectionIn(U, b.months, m))).toEqual(b.sales);
  expect(core.nowBalanceIn(U)).toBe(b.now);
  expect(core.findTransfersIn(U)).toEqual(b.xfer);
});

test.describe('날짜 · 달 계산', () => {
  test('monthDays — 윤년 2월 · 30일 달 · 31일 달', () => {
    expect(core.monthDays('2024-02')).toBe(29);
    expect(core.monthDays('2023-02')).toBe(28);
    expect(core.monthDays('2023-04')).toBe(30);
    expect(core.monthDays('2023-12')).toBe(31);
  });

  test('addMonth(다음 달) · prevMonthOf(지난달) — 해를 넘긴다', () => {
    expect(core.addMonth('2023-12')).toBe('2024-01');
    expect(core.addMonth('2024-05')).toBe('2024-06');
    expect(core.prevMonthOf('2024-01')).toBe('2023-12');
  });
});

test.describe('monthNumbersIn — 작은 매장으로', () => {
  // 매출 거래처 하나, 재료비 거래처 하나, 아직 안 정한 거래처 하나
  const row = (at, payee, amount, balance) => ({ at, payee, amount, balance });
  const rows = [
    row('2024-03-01 09:00:00', '카드사', 500000, 1500000),
    row('2024-03-02 09:00:00', '식자재', -200000, 1300000),
    row('2024-03-03 09:00:00', '모르는곳', -50000, 1250000)
  ];
  const group = (name, cat) => ({ name, cat, auto: false, mixed: false });
  const U = {
    rows,
    byName: { 카드사: group('카드사', '매출'), 식자재: group('식자재', '재료비') },
    merge: {},
    baseCats: core.UP_CATS.slice(),
    manual: {}
  };

  test('매출 · 지출 · 순이익 · 통장 합계', () => {
    const d = core.monthNumbersIn(U, '2024-03');
    expect(d.sales).toBe(500000);
    expect(d.inTotal).toBe(500000);
    expect(d.outTotal).toBe(250000);
    expect(d.open).toBe(1000000);
    expect(d.close).toBe(1250000);
    expect(d.open + d.inTotal - d.outTotal).toBe(d.close); // 장부 검산
  });

  test('아직 안 정한 거래는 따로 센다', () => {
    const d = core.monthNumbersIn(U, '2024-03');
    expect(d.unknown).toBe(50000);
    expect(d.unknownN).toBe(1);
  });

  test('매장 자료를 건드리지 않는다', () => {
    const before = JSON.stringify(U);
    core.monthNumbersIn(U, '2024-03');
    core.monthNumbersIn(U, '2024-03', 2);
    expect(JSON.stringify(U)).toBe(before);
  });
});
