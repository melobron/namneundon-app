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

// 2026-10-15 · 확인된 계좌 간 이체가 「아직 안 정한 돈」에 남던 문제 (A안).
// 거래처를 안 정한 채 이체로 확인하면 그 줄은 미정이 아니라 「계좌끼리 옮긴 돈」이다.
// ★ 거래처 전체가 아니라 줄 단위다 — 같은 거래처의 이체 아닌 줄은 미정으로 남는다
test.describe('확인된 이체가 미정보다 먼저 판정된다', () => {
  const row = (acc, at, payee, amount, balance) => ({ acc, at, payee, amount, balance });
  const 매출입금 = row(0, '2024-04-01 09:00:00', '카드사', 500000, 1500000);
  const 이체출금 = row(0, '2024-04-02 10:00:00', '운영비이체', -300000, 1200000);
  const 이체입금 = row(1, '2024-04-02 10:05:00', '매출통장입금', 300000, 300000);
  const 일반출금 = row(0, '2024-04-05 10:00:00', '운영비이체', -100000, 1100000); // 같은 거래처 · 짝 없음
  const 식자재 = row(1, '2024-04-06 10:00:00', '식자재', -50000, 250000);
  const group = (name, cat) => ({ name, cat, auto: false, mixed: false });
  const store = (byName, extra) => ({
    rows: [매출입금, 이체출금, 이체입금, 일반출금, 식자재],
    banks: [{ bank: '가은행' }, { bank: '나은행' }],
    byName: { 카드사: group('카드사', '매출'), 식자재: group('식자재', '식자재'), ...byName },
    merge: {},
    baseCats: core.UP_CATS.slice(),
    manual: {},
    ...extra
  });
  const 확인 = () => ({ [core.rowId(이체출금)]: 1, [core.rowId(이체입금)]: 1 });
  const 같은값 = (d) => ({
    sales: d.sales,
    cost: d.cost,
    profit: d.profit,
    otherIn: d.otherIn,
    inTotal: d.inTotal,
    outTotal: d.outTotal,
    open: d.open,
    close: d.close
  });

  test('확인 전 — 거래처를 안 정한 이체 두 줄과 일반 출금이 모두 미정이다', () => {
    const d = core.monthNumbersIn(store({}, {}), '2024-04');
    expect(core.findTransfersIn(store({}, {})).length).toBe(1);
    expect(d.unknown).toBe(700000);
    expect(d.unknownN).toBe(3);
    expect(d.unkPayees).toEqual({ 운영비이체: 400000, 매출통장입금: 300000 });
  });

  test('확인 후 — 이체 두 줄만 미정에서 빠지고 계좌끼리 옮긴 돈이 된다', () => {
    const before = core.monthNumbersIn(store({}, {}), '2024-04');
    const d = core.monthNumbersIn(store({}, { xfer: 확인() }), '2024-04');
    expect(d.unknown).toBe(100000);
    expect(d.unknownN).toBe(1);
    // 같은 거래처의 짝 없는 출금은 미정으로 남는다 — 거래처 전체를 빼지 않는다
    expect(d.unkPayees).toEqual({ 운영비이체: 100000 });
    expect(d.unkGroups).toBe(1);
    expect(d.unkRatio).toBe(100000 / d.volume);
    expect(d.uOut).toBe(100000);
    expect(d.uIn).toBe(0);
    expect(d.keepParts[core.XFER_PART]).toBe(0);
    expect(d.keepInParts[core.XFER_PART]).toBe(300000);
    expect(d.keepOutParts[core.XFER_PART]).toBe(300000);
    // 매출 · 지출 · 순이익 · 통장 합계 · 잔액은 확인 전과 같다
    expect(같은값(d)).toEqual(같은값(before));
    expect(d.volume).toBe(before.volume);
  });

  test('일별 거래 — 확인된 이체 줄은 「계좌끼리 옮긴 돈」, 같은 거래처 일반 줄은 미정', () => {
    const U = store({}, { xfer: 확인() });
    const 둘째날 = core.daySplitIn(U, '2024-04', 2);
    expect(둘째날.rest.map((x) => [x.r.payee, x.why])).toEqual([
      ['운영비이체', core.XFER_PART],
      ['매출통장입금', core.XFER_PART]
    ]);
    const 다섯째날 = core.daySplitIn(U, '2024-04', 5);
    expect(다섯째날.rest.map((x) => [x.r.payee, x.why])).toEqual([
      ['운영비이체', '아직 안 정한 돈']
    ]);
  });

  test('「아닙니다」·「나중에 확인」 — 확인된 이체가 아니므로 미정으로 남는다', () => {
    const p = core.findTransfersIn(store({}, {}))[0];
    const 아님 = store({}, { xfer: {}, xferNo: { [core.xferPairIdIn(null, p)]: 1 } });
    expect(core.monthNumbersIn(아님, '2024-04').unknown).toBe(700000);
    expect(core.daySplitIn(아님, '2024-04', 2).rest.map((x) => x.why)).toEqual([
      '아직 안 정한 돈',
      '아직 안 정한 돈'
    ]);
    const 나중 = store({}, { xfer: {} });
    expect(core.monthNumbersIn(나중, '2024-04').unknown).toBe(700000);
  });

  test('거래처를 정한 뒤 이체로 확인한 경우는 예전과 같다', () => {
    const 정함 = {
      운영비이체: group('운영비이체', '기타'),
      매출통장입금: group('매출통장입금', '기타')
    };
    const d = core.monthNumbersIn(store(정함, { xfer: 확인() }), '2024-04');
    expect(d.unknown).toBe(0);
    expect(d.keepInParts[core.XFER_PART]).toBe(300000);
    expect(d.keepOutParts[core.XFER_PART]).toBe(300000);
    expect(d.cats['기타']).toBe(100000); // 같은 거래처의 이체 아닌 출금은 지출이다
    expect(d.sales).toBe(500000);
  });
});
