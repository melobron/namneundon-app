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

// 2026-10-15 공단 입금 보완 (C안). 이름은 약사 파일럿의 실제 은행 표기, 금액·날짜는 합성이다
test.describe('공단 입금 — 병원·치과·약국', () => {
  const inn = (payee, at = '2026-06-15 10:00:00') => ({ at, payee, amount: 1000, balance: 0 });
  const group = (rows) => core.groupPayeesWith(rows, core.buildMergeMap(rows));
  const byName = (gs, n) => gs.find((g) => g.name === n);
  const U = (trade, gs) => ({
    trade,
    payees: gs,
    byName: Object.fromEntries(gs.map((g) => [g.name, g]))
  });

  test('canonName — 「국민건강」·「국민연금」으로 시작하면 은행 접두어로 떼지 않는다', () => {
    expect(core.canonName('국민건강초심')).toBe('국민건강초심');
    expect(core.canonName('국민건강가지급')).toBe('국민건강가지급');
    expect(core.canonName('국민연금')).toBe('국민연금');
    // 다른 규칙은 그대로 — 은행+사람 이름은 사람 이름으로, 금융회사 이름은 그대로
    expect(core.canonName('국민홍길동')).toBe('홍길동');
    expect(core.canonName('농협김철수')).toBe('김철수');
    expect(core.canonName('국민카드')).toBe('국민카드');
    // 자동 분류에 쓰는 이름은 예전(라이브 120차) 그대로 — 보완 1번
    expect(core.autoName('국민건강초심')).toBe('건강초심');
    expect(core.autoName('국민건강가지급')).toBe('국민건강가지급');
    expect(core.autoName('국민건강')).toBe('국민건강');
    expect(core.autoName('국민홍길동')).toBe('홍길동');
  });

  test('년월이 앞에 붙은 보험료 출금은 지금처럼 한 거래처 · 자동 보험', () => {
    const gs = group([
      out('2608국민건강', '2026-08-10 09:00:00'),
      out('2609국민건강', '2026-09-10 09:00:00'),
      out('2608국민연금', '2026-08-10 09:00:00'),
      out('2609국민연금', '2026-09-10 09:00:00')
    ]);
    expect(gs.map((g) => [g.name, g.cat, g.auto])).toEqual([
      ['국민건강', '보험', true],
      ['국민연금', '보험', true]
    ]);
  });

  test('약국 — 공단 입금의 자동 보험을 걷어 아직 안 정함으로 둔다 · 출금 보험료는 그대로', () => {
    const gs = group([
      inn('국민건강가지급'),
      inn('국민건강초심'),
      inn('의료급여건생비'),
      inn('2608국민연금'),
      out('2608국민건강', '2026-08-10 09:00:00'),
      out('2609국민건강', '2026-09-10 09:00:00'),
      inn('2609국민건강', '2026-09-30 10:00:00')
    ]);
    const u = U('약국', gs);
    expect(byName(gs, '국민건강가지급').cat).toBe('보험'); // 걷기 전: 이름만으로 자동 보험
    gs.forEach((g) => core.nhisHoldIn(u, g));
    expect(
      ['국민건강가지급', '국민건강초심', '의료급여건생비'].map((n) => [n, byName(gs, n).cat])
    ).toEqual([
      ['국민건강가지급', null],
      ['국민건강초심', null],
      ['의료급여건생비', null]
    ]);
    const nh = byName(gs, '국민건강'); // 섞인 곳 — 입금만 걷는다
    expect([nh.catIn, nh.autoIn, nh.catOut, nh.autoOut]).toEqual([null, false, '보험', true]);
    expect(core.nhisInOnlyIn(u, nh)).toBe(true);
    // 국민연금 입금은 후보가 아니다 — 매출로 가지도 묻지도 않고 자동 보험 그대로
    expect(core.nhisAskIn(u, byName(gs, '2608국민연금'))).toBe(false);
    expect(byName(gs, '2608국민연금').cat).toBe('보험');
    // 확인 카드에서도 빼지 않는다 (예전에는 「이미 아는 보험」으로 빠졌다)
    expect(core.autoKnownIn(u, '국민건강가지급')).toBe(false);
    expect(core.autoKnownIn(U('식당', gs), '국민건강가지급')).toBe(true);
  });

  test('대표님이 정하신 것은 덮어쓰지 않는다 · 업종이 바뀌면 걷은 자동 항목을 되돌린다', () => {
    const gs = group([inn('국민건강가지급'), inn('국민건강초심')]);
    const mine = byName(gs, '국민건강초심');
    core.applySaved(mine, '보험'); // 손수 보험으로 정해 둔 것
    gs.forEach((g) => core.nhisHoldIn(U('약국', gs), g));
    expect([mine.cat, mine.auto]).toEqual(['보험', false]);
    const held = byName(gs, '국민건강가지급');
    expect(held.cat).toBeNull();
    gs.forEach((g) => core.nhisHoldIn(U('식당', gs), g));
    expect([held.cat, held.auto]).toEqual(['보험', true]);
  });

  test('식당·카페·미용실은 그대로 · 출금만 있는 거래처는 후보가 아니다', () => {
    for (const trade of ['식당', '카페', '미용실']) {
      const gs = group([inn('국민건강가지급'), inn('국민건강초심')]);
      gs.forEach((g) => core.nhisHoldIn(U(trade, gs), g));
      expect([gs[0].cat, gs[0].auto], trade).toEqual(['보험', true]);
      // 보완 1번 — 이름은 살리되 분류는 라이브(「건강초심」)와 같다: 자동 분류 없이 아직 안 정함
      const ch = byName(gs, '국민건강초심');
      expect([ch.cat, ch.auto], trade).toEqual([null, false]);
      expect(core.autoKnownIn(U(trade, gs), '국민건강초심'), trade).toBe(false);
    }
    for (const trade of ['병원', '치과', '약국']) {
      const gs = group([out('국민건강')]);
      expect(core.nhisAskIn(U(trade, gs), gs[0]), trade).toBe(false);
    }
  });

  test('「건보」는 보험 낱말이 아니다 — 자동 분류 없이 아직 안 정함', () => {
    expect(core.autoCategory('건보', 1)).toBeNull();
    expect(core.nhisAskIn(U('약국', []), group([inn('건보')])[0])).toBe(false);
  });
});
