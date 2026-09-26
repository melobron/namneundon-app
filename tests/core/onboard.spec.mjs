// core/onboard.js — 처음 분류(온보딩)의 계산 부품: 이름 다듬기 · 사람 이름 가리기 · 묶음 · 묻는 차례 · 목표선.
// 매장 자료(UP)가 필요한 것은 fIn(U, …) 이다. 브라우저의 UP 를 Node 에 넘겨 같은 답이 나오는지 본다.
import { test, expect } from '@playwright/test';
import { openApp } from '../helpers.mjs';
import { loadCore } from './load-core.mjs';

const core = loadCore();
const plain = (x) => (x === undefined ? null : JSON.parse(JSON.stringify(x)));

test('Node 계산 = 브라우저 계산 — 예시 매장의 온보딩 판단', async ({ page }) => {
  await openApp(page);
  const b = await page.evaluate(() => {
    const gs = UP.payees || [];
    const total = totalAbs();
    const per = (f) => gs.map((g) => f(g));
    return {
      U: JSON.stringify(UP),
      n: gs.length,
      total,
      whole: {
        monthSpan: monthSpan(),
        personMask: personMask(),
        personalFirst: personalFirst(),
        madeCats: madeCats(),
        skipTotals: skipTotals(),
        bundlePool: bundlePool(),
        goalRestText: goalRestText(),
        goalLine: goalLine(),
        onboardDone: onboardDone(),
        coverage: coverage(),
        restCount: restCount(),
        mutedMonths: mutedMonths(),
        costAllSpan: costAllSpan(),
        blockedMonths: blockedMonths(),
        picksToClearMonths: picksToClearMonths()
      },
      each: {
        isOwnerName: per(isOwnerName),
        loanLikeIn: per(loanLikeIn),
        madeHint: per(madeHint),
        similarPayees: per(similarPayees),
        learnedFor: per(learnedFor),
        askSkippable: per((g) => askSkippable(g, total)),
        bundleFor: per(bundleFor)
      }
    };
  });
  const U = JSON.parse(b.U);
  const gs = U.payees || [];
  expect(gs.length).toBe(b.n);
  expect(gs.length).toBeGreaterThan(0);
  expect(core.totalAbsIn(U)).toBe(b.total);
  const whole = {
    monthSpan: core.monthSpanIn(U),
    personMask: core.personMaskIn(U),
    personalFirst: core.personalFirstIn(U),
    madeCats: core.madeCatsIn(U),
    skipTotals: core.skipTotalsIn(U),
    bundlePool: core.bundlePoolIn(U),
    goalRestText: core.goalRestTextIn(U),
    goalLine: core.goalLineIn(U),
    onboardDone: core.onboardDoneIn(U),
    coverage: core.coverageIn(U),
    restCount: core.restCountIn(U),
    mutedMonths: core.mutedMonthsIn(U),
    costAllSpan: core.costAllSpanIn(U),
    blockedMonths: core.blockedMonthsIn(U),
    picksToClearMonths: core.picksToClearMonthsIn(U)
  };
  for (const k of Object.keys(whole)) expect(plain(whole[k]), k).toEqual(plain(b.whole[k]));
  const each = {
    isOwnerName: gs.map((g) => core.isOwnerNameIn(U, g)),
    loanLikeIn: gs.map((g) => core.loanLikeInIn(U, g)),
    madeHint: gs.map((g) => core.madeHintIn(U, g)),
    similarPayees: gs.map((g) => core.similarPayeesIn(U, g)),
    learnedFor: gs.map((g) => core.learnedForIn(U, g)),
    askSkippable: gs.map((g) => core.askSkippableIn(U, g, b.total)),
    bundleFor: gs.map((g) => core.bundleForIn(U, g))
  };
  for (const k of Object.keys(each)) expect(plain(each[k]), k).toEqual(plain(b.each[k]));
});

test.describe('사람 이름 가리기', () => {
  test('hideName — 첫 글자만 남긴다', () => {
    expect(core.hideName('홍길동')).toBe('홍○○');
    expect(core.hideName('남궁길동')).toBe('남○○○');
  });

  test('looksPersonName — 성씨로 시작하는 세 · 네 글자만, 세금 · 회사는 아니다', () => {
    expect(core.looksPersonName('김철수')).toBe(true);
    expect(core.looksPersonName('이자')).toBe(false); // 두 글자는 열지 않는다
    expect(core.looksPersonName('대출이자')).toBe(false);
    expect(core.looksPersonName('주식회사')).toBe(false);
  });

  test('personMaskIn — 이름 통째로가 사람일 때와 「이름(상호)」 꼴만 가린다', () => {
    const U = {
      payees: [
        { name: '김철수', rawList: ['김철수'] },
        { name: '박영희(행복상회)', rawList: [] },
        { name: '주민세(사업소분)', rawList: [] },
        { name: '행복식자재', rawList: [] }
      ]
    };
    expect(plain(core.personMaskIn(U))).toEqual({ 김철수: '김○○', 박영희: '박○○' });
    expect(plain(core.personMaskIn(null))).toEqual({});
  });
});

test.describe('글자 · 차례', () => {
  test('orderQueue — 금액 큰 순, 같으면 이름 순 (원래 목록은 그대로)', () => {
    const list = [
      { name: '나', abs: 10 },
      { name: '가', abs: 10 },
      { name: '다', abs: 30 }
    ];
    expect(core.orderQueue(list).map((g) => g.name)).toEqual(['다', '가', '나']);
    expect(list.map((g) => g.name)).toEqual(['나', '가', '다']);
  });

  test('NUM_KO2 · mutedNames — 달 이름, 많으면 개수로', () => {
    expect(core.NUM_KO2(3)).toBe('세');
    expect(core.NUM_KO2(12)).toBe('12');
    expect(core.mutedNames(['2024-03', '2024-11'], [])).toBe('3월 · 11월은');
    const ms = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'];
    expect(core.mutedNames(ms, ms.concat(['2024-07']))).toBe('일곱 달 중 여섯 달은');
  });
});
