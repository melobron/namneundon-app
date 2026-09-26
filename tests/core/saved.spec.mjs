// core/categories.js · core/saved.js — 항목 이름 · 저장 자료 모양 검사 · 은행 이름 열쇠.
// 매장 자료(UP)가 필요한 것은 fIn(U, …) 이다. 브라우저의 UP 를 Node 에 넘겨 같은 답이 나오는지 본다.
import { test, expect } from '@playwright/test';
import { openApp } from '../helpers.mjs';
import { loadCore } from './load-core.mjs';

const core = loadCore();
const plain = (x) => (x === undefined ? null : JSON.parse(JSON.stringify(x)));

test('Node 계산 = 브라우저 계산 — 예시 매장의 항목 · 저장 서명 · 검산 문턱', async ({ page }) => {
  await openApp(page);
  const b = await page.evaluate(() => {
    const names = allCatNames().concat(['없는 항목', ' 인 건 비 ']);
    return {
      U: JSON.stringify(UP),
      months: monthList(),
      names,
      all: allCatNames(),
      base: names.map((n) => isBase(n)),
      same: names.map((n) => findSame(n)),
      use: names.map((n) => catUse(n)),
      payees: names.map((n) => catPayeeList(n)),
      sig: dataSig(),
      bankKeys: bankKeysNow(),
      breaks: breaksOver(),
      left: manualLeft(monthList())
    };
  });
  const U = JSON.parse(b.U);
  expect(b.all.length).toBeGreaterThan(0);
  expect(plain(core.allCatNamesIn(U))).toEqual(b.all);
  expect(b.names.map((n) => core.isBaseIn(U, n))).toEqual(b.base);
  expect(plain(b.names.map((n) => core.findSameIn(U, n)))).toEqual(plain(b.same));
  expect(plain(b.names.map((n) => core.catUseIn(U, n)))).toEqual(plain(b.use));
  expect(plain(b.names.map((n) => core.catPayeeListIn(U, n)))).toEqual(plain(b.payees));
  expect(core.dataSigIn(U)).toEqual(b.sig);
  expect(plain(core.bankKeysNowIn(U))).toEqual(plain(b.bankKeys));
  expect(plain(core.breaksOverIn(U))).toEqual(plain(b.breaks));
  expect(plain(core.manualLeftIn(U, b.months))).toEqual(plain(b.left));
});

test.describe('항목 이름', () => {
  test('normName — 띄어쓰기 · 기호 · 대소문자를 무시', () => {
    expect(core.normName(' 인 건·비 ')).toBe('인건비');
    expect(core.normName('카드_수수료-(A)')).toBe('카드수수료a');
  });
});

test.describe('저장 자료 모양 검사 — 옛 판을 버리지 않는다', () => {
  test('manualShapeOk — v1(days 없음) · v2(days 있음) 둘 다, 열쇠가 다르면 거절', () => {
    expect(core.manualShapeOk({ v: 1, items: [], amounts: {} })).toBe(true);
    expect(core.manualShapeOk({ v: 2, items: [], amounts: {}, days: {} })).toBe(true);
    expect(core.manualShapeOk({ v: 1, items: [], amounts: {}, days: {} })).toBe(false);
    expect(core.manualShapeOk({ v: 3, items: [], amounts: {} })).toBe(false);
    expect(core.manualShapeOk(null)).toBe(false);
  });

  test('banksShapeOk — v1 · names 만, 너무 많으면 거절', () => {
    expect(core.banksShapeOk({ v: 1, names: {} })).toBe(true);
    expect(core.banksShapeOk({ v: 2, names: {} })).toBe(false);
    expect(core.banksShapeOk({ v: 1, names: {}, extra: 1 })).toBe(false);
    expect(core.banksShapeOk({ v: 1, names: [] })).toBe(false);
    const many = {};
    for (let i = 0; i < 41; i++) many['k' + i] = '은행' + i;
    expect(core.banksShapeOk({ v: 1, names: many })).toBe(false);
  });
});
