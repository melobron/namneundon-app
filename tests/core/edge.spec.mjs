// 경계 조건 — 월말 · 29~31일 · 음수 잔액(마이너스 통장) · 여러 계좌 · 은행 양식 (backlog B-3).
// 작은 매장 자료를 손으로 만들어 core 계산에 넣는다. 화면은 띄우지 않는다.
import { test, expect } from '@playwright/test';
import { loadCore } from './load-core.mjs';

const core = loadCore({ xlsx: true });
const X = core.XLSX;
const plain = (x) => JSON.parse(JSON.stringify(x));
const asWorkbook = (aoa) => {
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), '거래내역');
  return X.read(X.write(wb, { type: 'array', bookType: 'xlsx' }), { type: 'array' });
};
const row = (at, payee, amount, balance, acc) => ({ at, payee, amount, balance, acc });
const group = (name, cat) => ({ name, cat, auto: false, mixed: false });
const store = (rows, banks) => ({
  rows,
  banks,
  byName: { 카드사: group('카드사', '매출'), 식자재: group('식자재', '재료비') },
  merge: {},
  baseCats: core.UP_CATS.slice(),
  manual: {}
});
// 장부 검산: 월초 + 들어온 돈 − 나간 돈 = 월말
const balanced = (d) => d.open + d.inTotal - d.outTotal === d.close;

test.describe('월말 · 29~31일', () => {
  // 윤년 2월: 1일 · 15일 · 29일 밤 · 다음 달 1일 0시
  const U = store([
    row('2024-02-01 09:00:00', '카드사', 100, 1100),
    row('2024-02-15 09:00:00', '식자재', -30, 1070),
    row('2024-02-29 23:59:00', '카드사', 50, 1120),
    row('2024-03-01 00:00:00', '식자재', -10, 1110)
  ]);

  test('29일 밤 거래는 2월, 3월 1일 0시 거래는 3월', () => {
    const feb = core.monthNumbersIn(U, '2024-02');
    const mar = core.monthNumbersIn(U, '2024-03');
    expect([feb.inTotal, feb.outTotal, feb.close]).toEqual([150, 30, 1120]);
    expect([mar.inTotal, mar.outTotal, mar.open]).toEqual([0, 10, 1120]);
    expect(feb.close).toBe(mar.open); // 계좌가 하나면 달이 이어진다
  });

  test('자르는 날이 그 달보다 길면(2월에 30 · 31일) 달 전체와 같다', () => {
    const whole = core.monthNumbersIn(U, '2024-02');
    for (const cut of [29, 30, 31]) {
      const d = core.monthNumbersIn(U, '2024-02', cut);
      expect([d.inTotal, d.outTotal, d.close], `cut ${cut}`).toEqual([
        whole.inTotal,
        whole.outTotal,
        whole.close
      ]);
    }
  });

  test('자르는 날은 그날까지 넣는다 (15일이면 15일 거래 포함, 28일이면 29일 거래 빠짐)', () => {
    expect(core.monthNumbersIn(U, '2024-02', 14).outTotal).toBe(0);
    expect(core.monthNumbersIn(U, '2024-02', 15).outTotal).toBe(30);
    expect(core.monthNumbersIn(U, '2024-02', 28).inTotal).toBe(100);
    for (const cut of [1, 14, 15, 28, 29, 31]) {
      expect(balanced(core.monthNumbersIn(U, '2024-02', cut)), `cut ${cut}`).toBe(true);
    }
  });

  test('월말 잔액 · 다음 목표일은 달 길이를 따른다', () => {
    expect(core.monthEndBalanceIn(U, '2024-02')).toBe(1120);
    expect(core.nextDue('2024-01-31', 31)).toBe('2024-02-29');
    expect(core.nextDue('2024-03-31', 31)).toBe('2024-04-30');
  });
});

test.describe('음수 잔액 (마이너스 통장)', () => {
  const U = store([
    row('2024-05-01 09:00:00', '식자재', -500, -200),
    row('2024-05-10 09:00:00', '카드사', 100, -100)
  ]);

  test('월초 · 월말 · 지금 잔액이 음수여도 그대로 센다', () => {
    const d = core.monthNumbersIn(U, '2024-05');
    expect([d.open, d.close]).toEqual([300, -100]);
    expect(balanced(d)).toBe(true);
    expect(core.nowBalanceIn(U)).toBe(-100);
    expect(core.monthEndBalanceIn(U, '2024-05')).toBe(-100);
  });

  test('엑셀의 음수 잔액도 읽는다', () => {
    const got = core.extractRows(
      asWorkbook([
        ['거래일시', '적요', '출금액', '입금액', '잔액'],
        ['2024-01-02 09:00:00', '식자재', 30000, 0, -10000],
        ['2024-01-03 10:00:00', '카드매출', 0, 50000, 40000]
      ])
    );
    expect(got.rows.map((r) => [r.amount, r.balance])).toEqual([
      [-30000, -10000],
      [50000, 40000]
    ]);
  });
});

test.describe('여러 계좌', () => {
  const banks = [{ name: 'A' }, { name: 'B' }];

  test('계좌 수는 banks 로 센다 (없으면 하나)', () => {
    expect(core.accCountIn(store([], banks))).toBe(2);
    expect(core.accCountIn(store([]))).toBe(1);
  });

  test('잔액은 계좌마다 마지막 잔액을 더한다', () => {
    const U = store(
      [
        row('2024-06-01 09:00:00', '카드사', 100, 1100, 0),
        row('2024-06-02 09:00:00', '식자재', -50, 450, 1),
        row('2024-06-20 09:00:00', '카드사', 10, 1110, 0)
      ],
      banks
    );
    const d = core.monthNumbersIn(U, '2024-06');
    expect([d.open, d.close]).toEqual([1500, 1560]);
    expect(balanced(d)).toBe(true);
    expect(core.nowBalanceIn(U)).toBe(1560);
  });

  // ★ 사용자 결정 (2026-09-27, backlog B-9): 계산은 이대로 둔다 — 앞 달을 추측해서 채우지 않는다.
  //   늦게 시작한 계좌는 첫 달 월초에 거꾸로 셈한 잔액으로 들어온다 —
  //   그래서 앞 달 월말(그 계좌 없음)과 다음 달 월초(그 계좌 있음)가 다르다. 달마다 장부 검산은 맞는다.
  //   대신 화면이 lateAccountsIn 으로 까닭을 알린다 (아래 시험)
  test('늦게 시작한 계좌: 달마다 검산은 맞고, 앞 달 월말 ≠ 다음 달 월초', () => {
    const U = store(
      [
        row('2024-05-01 09:00:00', '카드사', 100, 1100, 0),
        row('2024-06-02 09:00:00', '식자재', -50, 450, 1)
      ],
      banks
    );
    const may = core.monthNumbersIn(U, '2024-05');
    const jun = core.monthNumbersIn(U, '2024-06');
    expect(balanced(may)).toBe(true);
    expect(balanced(jun)).toBe(true);
    expect(may.close).toBe(1100);
    expect(jun.open).toBe(1600); // 1100(A) + 500(B 의 첫 거래 앞 잔액)
  });

  test('lateAccountsIn — 빠진 달은 before, 들어온 첫 달은 first, 그 뒤는 없음', () => {
    const U = store(
      [
        row('2024-04-03 09:00:00', '카드사', 100, 1000, 0),
        row('2024-05-01 09:00:00', '카드사', 100, 1100, 0),
        row('2024-06-02 09:00:00', '식자재', -50, 450, 1),
        row('2024-07-02 09:00:00', '식자재', -50, 400, 1)
      ],
      banks
    );
    expect(plain(core.lateAccountsIn(U, '2024-04'))).toEqual([
      { acc: 1, from: '2024-06', state: 'before' }
    ]);
    expect(plain(core.lateAccountsIn(U, '2024-05'))).toEqual([
      { acc: 1, from: '2024-06', state: 'before' }
    ]);
    expect(plain(core.lateAccountsIn(U, '2024-06'))).toEqual([
      { acc: 1, from: '2024-06', state: 'first' }
    ]);
    expect(core.lateAccountsIn(U, '2024-07')).toEqual([]);
  });

  test('lateAccountsIn — 계좌가 하나거나 모두 같은 달에 시작하면 알릴 것이 없다', () => {
    const one = store([row('2024-06-01 09:00:00', '카드사', 100, 1100, 0)]);
    expect(core.lateAccountsIn(one, '2024-06')).toEqual([]);
    const same = store(
      [
        row('2024-06-01 09:00:00', '카드사', 100, 1100, 0),
        row('2024-06-20 09:00:00', '식자재', -50, 450, 1)
      ],
      banks
    );
    expect(core.lateAccountsIn(same, '2024-06')).toEqual([]);
  });
});

test.describe('은행 양식 — 금액 한 칸 + 거래구분', () => {
  const head = ['거래일자', '거래구분', '거래금액', '거래후잔액', '내용'];

  test('거래구분(출금 · 입금)과 잔액으로 부호를 정한다', () => {
    const got = core.extractRows(
      asWorkbook([
        head,
        ['2024-01-02 09:00:00', '출금', 30000, 70000, '식자재'],
        ['2024-01-03 10:00:00', '입금', 50000, 120000, '카드매출']
      ])
    );
    expect(got.fail).toBeUndefined();
    expect(got.rows.map((r) => r.amount)).toEqual([-30000, 50000]);
  });

  test('거래구분과 잔액이 어긋나면 잔액을 따른다 (은행이 찍은 사실이 먼저)', () => {
    const got = core.extractRows(
      asWorkbook([
        head,
        ['2024-01-02 09:00:00', '입금', 30000, 100000, '가'],
        ['2024-01-03 10:00:00', '입금', 50000, 50000, '나'] // 「입금」인데 잔액이 줄었다
      ])
    );
    expect(got.rows[1].amount).toBe(-50000);
  });
});
