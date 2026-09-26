// core/verify.js — 잔액 검산. 화면 없이 Node 에서 돈다 (tests/core/load-core.mjs).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { loadCore, withDemo } from './load-core.mjs';

const core = withDemo(loadCore());
// 브라우저가 낸 숫자 (tests/demo.spec.mjs 의 스냅샷)
const browser = JSON.parse(
  readFileSync(new URL('../snapshots/demo.spec.mjs/numbers.json', import.meta.url), 'utf8')
);

// 거래 한 줄. 금액은 들어오면 +, 나가면 −
const row = (at, amount, balance, extra = {}) => ({ at, payee: 'x', amount, balance, ...extra });

test('Node 계산 = 브라우저 계산 — 예시 거래 2,363건 검산', () => {
  const res = core.orderAndVerify(core.demoRows());
  expect({
    rows: res.rows.length,
    opening: res.opening,
    closing: res.closing,
    breaks: res.breaks.length,
    moved: res.moved
  }).toEqual({
    rows: browser.verify.rows,
    opening: browser.verify.opening,
    closing: browser.verify.closing,
    breaks: browser.verify.breaks,
    moved: browser.verify.moved
  });
});

test.describe('orderAndVerify — 잔액이 이어지는가', () => {
  test('잘 이어진 거래: 시작 잔액을 찾고 끊김이 없다', () => {
    const res = core.orderAndVerify([
      row('2024-01-01 09:00:00', 1000, 11000),
      row('2024-01-01 10:00:00', -3000, 8000),
      row('2024-01-02 09:00:00', 500, 8500)
    ]);
    expect(res.opening).toBe(10000);
    expect(res.closing).toBe(8500);
    expect(res.breaks).toEqual([]);
    expect(res.moved).toBe(0);
  });

  test('시각순으로 정렬한다 (파일이 거꾸로 적혀 있어도)', () => {
    const res = core.orderAndVerify([
      row('2024-01-02 09:00:00', 500, 8500),
      row('2024-01-01 10:00:00', -3000, 8000),
      row('2024-01-01 09:00:00', 1000, 11000)
    ]);
    expect(res.rows.map((r) => r.at)).toEqual([
      '2024-01-01 09:00:00',
      '2024-01-01 10:00:00',
      '2024-01-02 09:00:00'
    ]);
    expect(res.breaks).toEqual([]);
  });

  test('같은 초에 순서가 뒤바뀐 거래는 잔액에 맞게 다시 놓는다', () => {
    // 은행 파일은 1초 안에 붙은 거래의 순서가 뒤바뀌어 있곤 하다
    const res = core.orderAndVerify([
      row('2024-01-01 09:00:00', 1000, 11000),
      row('2024-01-01 09:00:01', -500, 10000), // 원래 두 번째가 뒤에 왔다
      row('2024-01-01 09:00:01', -500, 10500),
      row('2024-01-01 10:00:00', 200, 10200)
    ]);
    expect(res.breaks).toEqual([]);
    expect(res.moved).toBe(2);
    expect(res.rows.map((r) => r.balance)).toEqual([11000, 10500, 10000, 10200]);
  });

  test('60초 넘게 떨어진 거래는 순서를 바꾸지 않고 끊김으로 알린다', () => {
    const res = core.orderAndVerify([
      row('2024-01-01 09:00:00', 1000, 11000),
      row('2024-01-01 09:05:00', -500, 10000),
      row('2024-01-01 09:10:00', -500, 10500)
    ]);
    expect(res.moved).toBe(0);
    expect(res.breaks.length).toBeGreaterThan(0);
  });

  test('앞 잔액 + 금액 ≠ 잔액이면 끊김, 차이를 알려준다', () => {
    const res = core.orderAndVerify([
      row('2024-01-01 09:00:00', 1000, 11000),
      row('2024-01-01 10:00:00', -3000, 7000) // 8000 이어야 한다
    ]);
    expect(res.breaks).toHaveLength(1);
    expect(res.breaks[0].gap).toBe(-1000);
    expect(res.breaks[0].why).toBe('앞 잔액에 금액을 더한 값과 다릅니다');
  });

  test('금액 칸이 비면 끊김으로 알린다', () => {
    const res = core.orderAndVerify([
      row('2024-01-01 09:00:00', 1000, 11000),
      row('2024-01-01 10:00:00', null, 9000)
    ]);
    expect(res.breaks).toHaveLength(1);
    expect(res.breaks[0].why).toBe('금액 칸이 비어 있습니다');
  });

  test('확인한 차액(residual)은 금액에 더해 본다', () => {
    const res = core.orderAndVerify([
      row('2024-01-01 09:00:00', 1000, 11000),
      row('2024-01-01 10:00:00', -3000, 7000, { residual: -1000 })
    ]);
    expect(res.breaks).toEqual([]);
  });

  test('올린 배열을 건드리지 않는다', () => {
    const raw = [row('2024-01-02 09:00:00', 500, 8500), row('2024-01-01 09:00:00', 1000, 8000)];
    const before = raw.map((r) => r.at);
    core.orderAndVerify(raw);
    expect(raw.map((r) => r.at)).toEqual(before);
  });
});

test.describe('askedRange — 파일에 적힌 조회 기간', () => {
  test('세 가지 날짜 모양을 다 읽는다', () => {
    expect(core.askedRange(['조회기간 2024.01.18 ~ 2026.09.18'])).toEqual({
      from: '2024-01-18',
      to: '2026-09-18'
    });
    expect(core.askedRange(['조회기간 2024-01-01 ~ 2026-09-18'])).toEqual({
      from: '2024-01-01',
      to: '2026-09-18'
    });
    expect(core.askedRange(['조회기간 2026년 05월 01일 ~ 2026년 08월 21일'])).toEqual({
      from: '2026-05-01',
      to: '2026-08-21'
    });
  });

  test('pdf.js 가 한 글자씩 내놓은 「조 회 기 간」도 읽는다', () => {
    expect(core.askedRange(['조 회 기 간 2024.01.18 ~ 2026.09.18'])).toEqual({
      from: '2024-01-18',
      to: '2026-09-18'
    });
  });

  test('라벨 앞의 날짜(신규일 등)는 기간으로 삼지 않는다', () => {
    expect(core.askedRange(['신규일 2021.07.14 조회기간 2024.01.18 ~ 2026.09.18'])).toEqual({
      from: '2024-01-18',
      to: '2026-09-18'
    });
  });

  test('라벨이 없거나 날짜가 거꾸로면 null', () => {
    expect(core.askedRange(['거래내역 2024.01.18 ~ 2026.09.18'])).toBeNull();
    expect(core.askedRange(['조회기간 2026.09.18 ~ 2024.01.18'])).toBeNull();
  });
});
