// core/classify.js — 거래처 묶기 · 자동 분류. 화면 없이 Node 에서 돈다.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { loadCore, withDemo } from './load-core.mjs';

const core = withDemo(loadCore());
const browser = JSON.parse(
  readFileSync(new URL('../snapshots/demo.spec.mjs/numbers.json', import.meta.url), 'utf8')
);
const out = (payee, at = '2023-01-01 09:00:00') => ({ at, payee, amount: -1000, balance: 0 });

test('Node 계산 = 브라우저 계산 — 예시 거래 2,363건의 거래처 묶기', () => {
  // 앱의 startDemo 와 같은 순서: 검산 → 합치기 규칙표 → 묶기
  const rows = core.orderAndVerify(core.demoRows()).rows;
  const groups = core.groupPayeesWith(rows, core.buildMergeMap(rows));
  // 브라우저 스냅샷의 거래처: [이름, 건수, 합계, 항목, 자동 여부] — 묶기 결과는 앞의 셋
  expect(groups.map((g) => [g.name, g.n, g.net])).toEqual(
    browser.payees.map((p) => [p[0], p[1], p[2]])
  );
});

test.describe('autoCategory — 이름으로 짐작하는 항목', () => {
  const cat = (name, net) => core.autoCategory(name, net);

  test('카드사는 들어온 돈일 때만 매출', () => {
    expect(cat('비씨카드(주)', 1)).toBe('매출');
    expect(cat('삼성카드', 1)).toBe('매출');
    expect(cat('비씨카드(주)', -1)).toBeNull();
  });

  test('세금·보험을 카드보다 먼저 본다 — 「삼성화재」는 들어와도 보험', () => {
    expect(cat('삼성화재', 1)).toBe('보험');
    expect(cat('역삼세무서', -1)).toBe('세금');
    expect(cat('국민건강보험공단', -1)).toBe('보험');
  });

  test('공과금 — 회사 이름과 「수도+숫자」, 「수도권」은 아니다', () => {
    expect(cat('한국전력공사', -1)).toBe('전기·가스·수도');
    expect(cat('서울도시가스', -1)).toBe('전기·가스·수도');
    expect(cat('수도2306강남', -1)).toBe('전기·가스·수도');
    expect(cat('수도권물류', -1)).toBeNull();
  });

  test('계좌번호처럼 생긴 입금 이름은 카드 매출', () => {
    expect(cat('KB0012345678', 1)).toBe('매출');
  });

  test('모르는 이름은 짐작하지 않는다 (사장님께 여쭌다)', () => {
    expect(cat('홍길동', -1)).toBeNull();
    expect(cat('쿠팡_KICC', -1)).toBeNull();
  });
});

test.describe('거래처 합치기', () => {
  test('stripYm — 이름 앞뒤의 년월을 떼어 낸다', () => {
    expect(core.stripYm('2303국민연금')).toEqual({ base: '국민연금', ym: '2303' });
    expect(core.stripYm('국민연금2404')).toEqual({ base: '국민연금', ym: '2404' });
  });

  test('stripYm — 전화번호 뒤 네 자리는 년월로 보지 않는다', () => {
    expect(core.stripYm('010-1234-2306')).toBeNull();
  });

  test('매달 다른 년월이 붙은 이름을 한 거래처로 묶는다', () => {
    const rows = [out('2303국민연금'), out('2304국민연금'), out('2305국민연금')];
    const groups = core.groupPayeesWith(rows, core.buildMergeMap(rows));
    expect(groups.map((g) => [g.name, g.n, g.net])).toEqual([['국민연금', 3, -3000]]);
  });

  test('(주) 가 붙고 안 붙은 같은 회사를 한 거래처로 묶는다', () => {
    const rows = [out('(주)맞손유통'), out('맞손유통')];
    const groups = core.groupPayeesWith(rows, core.buildMergeMap(rows));
    expect(groups).toHaveLength(1);
    expect(groups[0].n).toBe(2);
  });

  test('규칙표가 없으면 원래 이름 그대로', () => {
    expect(core.mergedName(null, out('아무개'))).toBe('아무개');
    expect(core.mergedName({ 아무개: '가나다' }, out('아무개'))).toBe('가나다');
  });
});
