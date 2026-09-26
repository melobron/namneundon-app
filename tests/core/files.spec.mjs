// core/text.js · core/files.js — 조사 · HTML 막기 · 파일 판별 · 은행 이름 · 못 읽은 까닭 글.
import { test, expect } from '@playwright/test';
import { loadCore } from './load-core.mjs';

const core = loadCore();

test.describe('조사 — 마지막 글자의 받침으로', () => {
  test('ro · ga · neun · eul', () => {
    expect(core.ro('공과금')).toBe('으로');
    expect(core.ro('인건비')).toBe('로');
    expect(core.ro('월세')).toBe('로');
    expect(core.ro('물')).toBe('로'); // ㄹ 받침은 「로」
    expect(core.ga('인건비')).toBe('가');
    expect(core.ga('재료비용')).toBe('이');
    expect(core.neun('하나은행')).toBe('은');
    expect(core.neun('새마을금고')).toBe('는');
    expect(core.eul('매출')).toBe('을');
    expect(core.eul('카드')).toBe('를');
    expect(core.eul('ABC')).toBe('를'); // 한글이 아니면 받침 없는 쪽
  });
});

test('escHtml — 파일 이름 같은 글을 화면에 넣기 전에 막는다', () => {
  expect(core.escHtml('<img src=x onerror="a()">')).toBe(
    '&lt;img src=x onerror=&quot;a()&quot;&gt;'
  );
  expect(core.escHtml("A&B's")).toBe('A&amp;B&#39;s');
  expect(core.escHtml(null)).toBe('');
});

test.describe('파일 판별', () => {
  const bytes = (s) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

  test('isPdfFile — 이름이나 종류로', () => {
    expect(core.isPdfFile({ name: '거래내역.PDF', type: '' })).toBe(true);
    expect(core.isPdfFile({ name: 'x', type: 'application/pdf' })).toBe(true);
    expect(core.isPdfFile({ name: '거래내역.xlsx', type: '' })).toBe(false);
    expect(core.isPdfFile(null)).toBe(false);
  });

  test('looksHtml — 이름이 .html 이거나 앞부분이 HTML 표', () => {
    expect(core.looksHtml({ name: 'a.htm' }, bytes(''))).toBe(true);
    expect(core.looksHtml({ name: 'a.xls' }, bytes('<!DOCTYPE html><html>'))).toBe(true);
    expect(core.looksHtml({ name: 'a.xls' }, bytes('<table><tr>'))).toBe(true);
    expect(core.looksHtml({ name: 'a.xls' }, bytes('ÐÏ\u0011à'))).toBe(false);
  });

  test('bankOf — 파일 이름에 은행이 없으면 힌트, 힌트도 없으면 null', () => {
    expect(core.bankOf('그냥파일.xlsx', 'sheet1', null)).toBe(null);
    expect(core.bankOf('그냥파일.xlsx', 'sheet1', '힌트은행')).toBe('힌트은행');
  });

  test('kakaoLabel — 은행을 모르면 은행 이름을 알려 달라고', () => {
    expect(core.kakaoLabel(null)).toBe('카카오채널로 은행 이름 알려주기');
  });

  test('failWhy — 암호 걸린 엑셀은 PDF 증명서로 안내 (케이뱅크는 메뉴까지)', () => {
    expect(core.failWhy('xlsx_locked', '케이')).toContain('케이뱅크 앱에서');
    expect(core.failWhy('xlsx_locked', '케이뱅크')).toContain('케이뱅크 앱에서');
    expect(core.failWhy('xlsx_locked', '국민')).toContain('거래내역증명서(PDF)');
    expect(core.failWhy('notxlsx', null)).toContain('엑셀 파일이 아닙니다');
  });
});
