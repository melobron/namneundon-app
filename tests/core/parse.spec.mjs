// core/parse-excel.js · core/parse-pdf.js — 은행 파일 → 거래 행. 화면 없이 Node 에서 돈다.
// 엑셀 도구는 브라우저가 쓰는 바로 그 파일(app/xlsx.full.min.js)을 올린다.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { loadCore, withDemo } from './load-core.mjs';

const core = withDemo(loadCore({ xlsx: true }));
const X = core.XLSX;
// 브라우저에서 같은 파일을 올렸을 때의 숫자 (tests/upload.spec.mjs 의 스냅샷)
const browser = JSON.parse(
  readFileSync(new URL('../snapshots/upload.spec.mjs/numbers.json', import.meta.url), 'utf8')
);

// 표(2차원 배열) → 엑셀 파일 바이트 → 다시 열기. 브라우저가 올린 파일을 여는 길과 같다
const asWorkbook = (aoa) => {
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), '거래내역');
  return X.read(X.write(wb, { type: 'array', bookType: 'xlsx' }), { type: 'array' });
};
// tests/helpers.mjs 의 demoAsBankXlsx 와 같은 모양 — 예시 거래 2,363건을 은행 엑셀로
const demoTable = () => {
  const rows = [['거래일시', '적요', '출금액', '입금액', '잔액']];
  let bal = core.DEMO_OPEN;
  core.DEMO_TX.forEach((s) => {
    const f = s.split('|'),
      a = +f[2];
    bal += a;
    rows.push([core.DEMO_YEAR + '-' + f[0], f[1], a < 0 ? -a : 0, a > 0 ? a : 0, bal]);
  });
  return rows;
};

test('Node 계산 = 브라우저 계산 — 은행 엑셀을 읽어 검산까지', () => {
  const got = core.extractRows(asWorkbook(demoTable()));
  expect(got.fail).toBeUndefined();
  const res = core.orderAndVerify(got.rows);
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

test.describe('extractRows — 은행 엑셀 읽기', () => {
  const head = ['거래일시', '적요', '출금액', '입금액', '잔액'];

  test('머리글 위에 안내 줄이 있어도 머리글을 찾는다', () => {
    const got = core.extractRows(
      asWorkbook([
        ['OO은행 거래내역'],
        ['조회기간 2024.01.01 ~ 2024.01.31'],
        [],
        head,
        ['2024-01-02 09:00:00', '식자재', 30000, 0, 70000],
        ['2024-01-03 10:00:00', '카드매출', 0, 50000, 120000]
      ])
    );
    expect(got.header).toBe(4);
    expect(got.rows).toHaveLength(2);
    expect(got.rows.map((r) => r.amount)).toEqual([-30000, 50000]);
    expect(got.rows.map((r) => r.balance)).toEqual([70000, 120000]);
    expect(got.balName).toBe('잔액');
  });

  test('출금·입금이 나뉜 열을 부호 있는 금액 하나로 합친다', () => {
    const got = core.extractRows(
      asWorkbook([head, ['2024-01-02 09:00:00', '임대료', 1000000, 0, 2000000]])
    );
    expect(got.rows[0].amount).toBe(-1000000);
    expect(got.rows[0].payee).toBe('임대료');
    expect(got.rows[0].at).toBe('2024-01-02 09:00:00');
  });

  test('머리글만 있고 거래가 없으면 empty 로 알린다 (다시 받으라고 하지 않게)', () => {
    const got = core.extractRows(asWorkbook([head]));
    expect(got.fail).toBe(true);
    expect(got.why).toBe('empty');
  });

  // 못 읽은 이유는 사용 기록에 남아, 어느 은행 양식을 먼저 넣을지 정하는 근거가 된다
  test('못 읽은 이유를 가른다 — 머리글 없음 · 날짜 열 없음 · 금액 열 없음', () => {
    const why = (aoa) => core.extractRows(asWorkbook(aoa));
    expect(
      why([
        ['이름', '메모'],
        ['a', 'b']
      ])
    ).toMatchObject({ fail: true, why: 'norows' });
    expect(
      why([
        ['적요', '출금액', '입금액', '잔액'],
        ['식자재', 3000, 0, 7000]
      ])
    ).toMatchObject({
      fail: true,
      why: 'nodate'
    });
    expect(
      why([
        ['거래일시', '적요', '잔액'],
        ['2024-01-02 09:00:00', '식자재', 7000]
      ])
    ).toMatchObject({
      fail: true,
      why: 'noamt'
    });
  });
});

test.describe('숫자·날짜 해석', () => {
  test('toNum — 쉼표·원·공백·음수', () => {
    expect(core.toNum('1,234')).toBe(1234);
    expect(core.toNum('-1,234')).toBe(-1234);
    expect(core.toNum('1,234원')).toBe(1234);
    expect(core.toNum(' 500 ')).toBe(500);
    expect(core.toNum(1234)).toBe(1234);
    expect(core.toNum('')).toBeNull();
    expect(core.toNum(null)).toBeNull();
    expect(core.toNum('-')).toBeNull();
  });

  test('toStamp — 점·하이픈 날짜, 엑셀 날짜 숫자', () => {
    expect(core.toStamp('2024.01.02 09:03:04')).toBe('2024-01-02 09:03:04');
    expect(core.toStamp('2024.01.02')).toBe('2024-01-02');
    expect(core.toStamp('2024-01-02 09:03')).toBe('2024-01-02 09:03');
    expect(core.toStamp(45292.5)).toBe('2024-01-01 12:00:00'); // 엑셀이 날짜를 숫자로 줄 때
  });
});

test.describe('PDF 합계 확인', () => {
  test('pdfSums — 읽어낸 줄의 입금·출금 합', () => {
    const s = core.pdfSums([{ amount: 1000 }, { amount: -300 }, { amount: 500 }, { amount: null }]);
    expect(s).toMatchObject({ in: 1500, out: 300 });
  });
});
