// 실제 은행 파일의 「모양」을 본뜬 대역 — backlog C-2.
// 진짜 파일(저장소 밖)은 넣지 않는다. 글자 · 숫자를 가린 모양(머리글 위 줄 수, 날짜 · 금액 모양, 합계 줄,
// 빈 열 · 빈 줄)만 옮겨 적고, 거래는 지어낸 것이다. 확인한 날: 2026-09-27 (tools/scan-bank-files.mjs 로 원본이 읽히는 것도 확인)
import { test, expect } from '@playwright/test';
import { loadCore } from './load-core.mjs';

const core = loadCore({ xlsx: true });
const X = core.XLSX;
// 은행 파일은 대부분 옛 엑셀(.xls)이다 — 같은 형식으로 저장했다 다시 연다
const asXls = (aoa) => {
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), '거래내역');
  return X.read(X.write(wb, { type: 'array', bookType: 'biff8' }), {
    type: 'array',
    cellDates: true
  });
};
// 지어낸 거래 — [날짜, 시각, 거래처, 금액(+입금 −출금)]. 잔액은 이어서 셈한다
const TX = [
  ['2026-08-01', '09:10:00', '카드사정산', 520000],
  ['2026-08-01', '14:02:11', '식자재상회', -180000],
  ['2026-08-02', '10:00:00', '건물관리', -1200000],
  ['2026-08-03', '11:30:45', '카드사정산', 610000],
  ['2026-08-05', '08:00:00', '전기요금', -93000]
];
const OPEN = 3000000;
const withBal = () => {
  let b = OPEN;
  return TX.map(([d, t, who, a]) => ({ d, t, who, a, bal: (b += a) }));
};
const dot = (d) => d.replace(/-/g, '.');
const comma = (n) => n.toLocaleString('en-US');

function expectRead(got) {
  expect(got.fail, got.why).toBeUndefined();
  expect(got.rows.map((r) => r.amount)).toEqual(TX.map((x) => x[3]));
  expect(got.rows.map((r) => r.balance)).toEqual(withBal().map((x) => x.bal));
  expect(got.rows.map((r) => r.at)).toEqual(TX.map((x) => x[0] + ' ' + x[1]));
  const v = core.orderAndVerify(got.rows);
  expect(v.breaks).toHaveLength(0);
}

test('국민(KB) — 머리글 위 4줄 · 날짜 「2026.08.01 09:10:00」 · 맨 아래 합계 줄', () => {
  const rows = withBal();
  const aoa = [
    ['조회기간', '2026.08.01 ~ 2026.08.31'],
    ['계좌번호', '000000-00-000000', '예금주', 12345678],
    ['상품명', 'ＫＢ가짜통장', '잔액', 12345678],
    [],
    ['거래일시', '적요', '보낸분/받는분', '송금메모', '출금액', '입금액', '잔액', '거래점', '구분'],
    ...rows.map((r) => [
      dot(r.d) + ' ' + r.t,
      '전자금융',
      r.who,
      '',
      r.a < 0 ? -r.a : 0,
      r.a > 0 ? r.a : 0,
      r.bal,
      '본점',
      '　'
    ]),
    ['', '', '', '합계', 1473000, 1130000, '', '', '']
  ];
  const got = core.extractRows(asXls(aoa));
  expectRead(got);
  expect(got.rows).toHaveLength(TX.length); // 합계 줄은 거래가 아니다
});

test('신한 — 머리글 위 6줄 · 거래일자와 거래시간이 따로', () => {
  const rows = withBal();
  const aoa = [
    ['거래내역조회'],
    [],
    ['계좌번호', '000-000-000000'],
    ['조회기간', '2026.08.01 ~ 2026.08.31'],
    ['조회건수', 5],
    [],
    ['거래일자', '거래시간', '적요', '출금(원)', '입금(원)', '내용', '잔액(원)', '거래점'],
    ...rows.map((r) => [
      r.d,
      r.t,
      '인터넷',
      r.a < 0 ? -r.a : 0,
      r.a > 0 ? r.a : 0,
      r.who,
      r.bal,
      '본점'
    ])
  ];
  const got = core.extractRows(asXls(aoa));
  expectRead(got);
});

test('부산 — 머리글 위 5줄 · 첫 열이 비었고 · 금액이 쉼표 붙은 글자 · 맨 아래 합계 줄', () => {
  const rows = withBal();
  const aoa = [
    ['계좌번호', '000-0000-0000-00'],
    ['예금주', '가짜상회'],
    ['조회기간', '2026-08-01', '~', '2026-08-31'],
    ['입금 합계', '1,130,000 원', '출금 합계', '1,473,000 원'],
    [],
    [
      '',
      '번호',
      '거래일시',
      '적요',
      '내용',
      '입금금액',
      '출금금액',
      '거래후잔액',
      '적용이율',
      '거래점'
    ],
    ...rows.map((r, i) => [
      '',
      String(i + 1),
      r.d + ' ' + r.t,
      '인터넷',
      r.who,
      comma(r.a > 0 ? r.a : 0),
      comma(r.a < 0 ? -r.a : 0),
      comma(r.bal),
      '0.10',
      '본점'
    ]),
    ['합 계', '', '', '', '', '1,130,000', '1,473,000', '', '', '']
  ];
  const got = core.extractRows(asXls(aoa));
  expectRead(got);
  expect(got.rows).toHaveLength(TX.length);
});

test('가게 계좌 내보내기 — 머리글 위 6줄 · 오른쪽 빈 열 20개 · 아래 빈 줄 수백 개', () => {
  const rows = withBal();
  const pad = (a) => a.concat(new Array(20).fill(''));
  const aoa = [
    ['거래 내역 조회'],
    [],
    [],
    [],
    [],
    [],
    pad([
      'No',
      '거래일시',
      '의뢰인/수취인',
      '출금액(원)',
      '입금액(원)',
      '잔액(원)',
      '출금계좌메모',
      '적요',
      '처리점',
      '구분'
    ]),
    ...rows.map((r, i) =>
      pad([
        i + 1,
        dot(r.d) + ' ' + r.t,
        r.who,
        r.a < 0 ? -r.a : 0,
        r.a > 0 ? r.a : 0,
        r.bal,
        '',
        'CMS 이체',
        '본점',
        ''
      ])
    ),
    ...new Array(300).fill(0).map(() => pad(new Array(10).fill('')))
  ];
  const got = core.extractRows(asXls(aoa));
  expectRead(got);
  expect(got.rows).toHaveLength(TX.length);
});

test('이체 내역 — 머리글 위 6줄이 「이름 : 값」 · 「내 통장 표시」 열', () => {
  const rows = withBal();
  const aoa = [
    ['계좌번호 : 000000-00-000000', '예금주 : '],
    ['잔액 : 1,234,567', '출금가능 : '],
    ['상품명 : 가짜 통장', '신규일 : '],
    ['입금 : 1,130,000', '출금 : '],
    ['합계 : 2,603,000', '건수 : 2,603,000'],
    ['조회기간 : 2026.08.01 ~ 2026.08'],
    [
      'No',
      '거래일시',
      '보낸분/받는분',
      '출금액(원)',
      '입금액(원)',
      '잔액(원)',
      '내 통장 표시',
      '적요',
      '처리점',
      '구분'
    ],
    ...rows.map((r, i) => [
      i + 1,
      dot(r.d) + ' ' + r.t,
      r.who,
      r.a < 0 ? -r.a : 0,
      r.a > 0 ? r.a : 0,
      r.bal,
      '',
      '전자금융',
      '본점',
      ''
    ])
  ];
  const got = core.extractRows(asXls(aoa));
  expectRead(got);
});
