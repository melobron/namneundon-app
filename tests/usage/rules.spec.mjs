// 유입·사용 집계 규칙 — 화면 없이 (NAM-20·22, 2026-09-29).
import { test, expect } from '@playwright/test';
import {
  parseEvent,
  parseQuery,
  seoulDate,
  buildReport,
  checkCampaigns,
  isCode,
  addDays,
  UNATTRIBUTED
} from '../../services/usage-rules.js';
import { CAMPAIGNS, LANDING_ORIGIN } from '../../services/campaigns.js';
import * as view from '../../team-dashboard/view.js';

test('글 코드 — 영숫자 · 밑줄 1~12자, 대소문자 그대로', () => {
  for (const ok of ['D08', 'd08', 'A_1', 'x', 'ABCDEFGHIJKL']) expect(isCode(ok)).toBe(true);
  for (const bad of ['', 'ABCDEFGHIJKLM', 'D-08', 'D 08', '한글', 'D08/', null, 8])
    expect(isCode(bad)).toBe(false);
});

test('이벤트 본문 — step 과 s 만, 그 밖의 키 · 긴 본문 · 모양 틀림은 받지 않는다', () => {
  expect(parseEvent('{"step":"도착","s":"D08"}')).toEqual({ ok: true, step: '도착', code: 'D08' });
  expect(parseEvent('{"step":"결과표시"}')).toEqual({ ok: true, step: '결과표시', code: null });
  const bad = {
    '{"step":"도착","file":"x.xlsx"}': 'extra_key',
    '{"step":"도착","amount":1000}': 'extra_key',
    '{"step":"도착","s":"D-08"}': 's',
    '{"step":"도착","s":""}': 's',
    '{"step":"방문"}': 'step',
    '[]': 'shape',
    null: 'shape',
    '{': 'json'
  };
  for (const [body, why] of Object.entries(bad))
    expect(parseEvent(body)).toEqual({ ok: false, why });
  expect(parseEvent('{"step":"도착","s":"' + 'A'.repeat(400) + '"}')).toEqual({
    ok: false,
    why: 'too_long'
  });
  // 300자 안이어도 바이트가 크면 막는다 (한글 3바이트)
  expect(parseEvent('{"step":"도착","x":"' + '가'.repeat(250) + '"}')).toEqual({
    ok: false,
    why: 'too_long'
  });
});

test('서울 날짜 — 자정 경계', () => {
  expect(seoulDate(Date.parse('2026-09-28T14:59:59Z'))).toBe('2026-09-28');
  expect(seoulDate(Date.parse('2026-09-28T15:00:00Z'))).toBe('2026-09-29');
  expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
});

test('조회 조건 — 날짜 모양 · 순서 · 미래 · 최대 90일 · s', () => {
  const q = (s) => parseQuery(new URLSearchParams(s), '2026-09-29');
  expect(q('from=2026-09-23&to=2026-09-29')).toEqual({
    ok: true,
    from: '2026-09-23',
    to: '2026-09-29',
    s: null
  });
  expect(q('from=2026-07-02&to=2026-09-29')).toMatchObject({ ok: true }); // 90일
  expect(q('from=2026-07-01&to=2026-09-29')).toEqual({ ok: false, why: 'too_long' });
  expect(q('from=2026-09-29&to=2026-09-28')).toEqual({ ok: false, why: 'order' });
  expect(q('from=2026-09-29&to=2026-09-30')).toEqual({ ok: false, why: 'future' });
  expect(q('from=2026-02-30&to=2026-03-01')).toEqual({ ok: false, why: 'date' });
  expect(q('to=2026-09-29')).toEqual({ ok: false, why: 'date' });
  expect(q('from=2026-09-29&to=2026-09-29&s=D08&s=B02')).toEqual({ ok: false, why: 's' });
  expect(q('from=2026-09-29&to=2026-09-29&s=D-08')).toEqual({ ok: false, why: 's' });
  expect(q('from=2026-09-29&to=2026-09-29&s=-')).toMatchObject({ ok: true, s: UNATTRIBUTED });
});

const ROWS = [
  { date: '2026-09-25', code: 'D08', step: '도착', count: 10 },
  { date: '2026-09-25', code: 'D08', step: '파일선택', count: 4 },
  { date: '2026-09-25', code: 'D08', step: '결과표시', count: 3 },
  { date: '2026-09-26', code: null, step: '도착', count: 5 },
  { date: '2026-09-26', code: 'Z99', step: '도착', count: 2 },
  { date: '2026-09-27', code: 'B02', step: '결과표시', count: 1 },
  // 집계 시작 전 날짜의 값은 세지 않는다
  { date: '2026-09-23', code: 'D08', step: '도착', count: 99 }
];
const CAMPS = [
  { code: 'D08', title: '글 하나', postUrl: 'https://example.com/a' },
  { code: 'B02', title: '글 둘' },
  { code: 'C03', title: '글 셋' }
];
const report = (over = {}) =>
  buildReport({
    rows: ROWS,
    campaigns: CAMPS,
    from: '2026-09-23',
    to: '2026-09-29',
    s: null,
    today: '2026-09-29',
    trackingStartedAt: '2026-09-25',
    generatedAt: '2026-09-29T01:00:00.000Z',
    source: 'test',
    ...over
  });
const sum = (list, k) => list.reduce((a, x) => a + (x[k] || 0), 0);

test('보고서 — 합계 = 일별 합 = 글별 합 (전체 · 글 · 출처 미확인 필터)', () => {
  for (const s of [null, 'D08', UNATTRIBUTED, 'Z99', 'C03']) {
    const r = report({ s });
    for (const k of ['arrival', 'fileSelected', 'resultShown']) {
      expect(sum(r.daily, k)).toBe(r.totals[k]);
      expect(sum(r.campaigns, k)).toBe(r.totals[k]);
    }
  }
  const all = report();
  expect(all.totals).toEqual({ arrival: 17, fileSelected: 4, resultShown: 4 });
  expect(report({ s: UNATTRIBUTED }).totals.arrival).toBe(5);
});

test('보고서 — 집계 전 날짜는 0 이 아니라 미수집, 경고와 수집 범위', () => {
  const r = report();
  expect(r.daily.slice(0, 2)).toEqual([
    { date: '2026-09-23', collected: false },
    { date: '2026-09-24', collected: false }
  ]);
  expect(r.daily[2]).toMatchObject({ date: '2026-09-25', collected: true, arrival: 10 });
  expect(r.warnings).toEqual(['partial_range', 'today_in_progress']);
  expect([r.availableFrom, r.availableTo]).toEqual(['2026-09-25', '2026-09-29']);
  const none = report({ trackingStartedAt: null });
  expect(none.daily.every((d) => !d.collected)).toBe(true);
  expect(none.warnings).toContain('not_started');
  expect([none.availableFrom, none.availableTo]).toEqual([null, null]);
});

test('보고서 — 글 표: 결과 많은 순, 미등록 · 출처 미확인 구분, 등록 글 0건도 보인다', () => {
  const r = report();
  expect(r.campaigns.map((c) => [c.code, c.registered])).toEqual([
    ['D08', true],
    ['B02', true],
    [null, null],
    ['Z99', false],
    ['C03', true]
  ]);
  const d = r.campaigns[0];
  expect([d.title, d.postUrl]).toEqual(['글 하나', 'https://example.com/a']);
});

test('글 목록 — 지금 등록된 목록이 규칙에 맞다 (https 원문 · 소개 페이지 도착지 · 중복 없음)', () => {
  expect(checkCampaigns(CAMPAIGNS, LANDING_ORIGIN)).toEqual([]);
  const bad = checkCampaigns(
    [
      { code: 'D08', title: 'a', postUrl: 'http://x.com' },
      { code: 'D08', title: 'b' },
      { code: 'E1', title: 'c', destination: 'https://evil.example/' },
      { code: 'bad-code', title: 'd' }
    ],
    LANDING_ORIGIN
  );
  expect(bad.length).toBe(4);
});

test('대시보드 표시 규칙 — 분모 0 · 100% 초과 · 기간 검사 · 링크', () => {
  expect(view.rate(3, 0)).toEqual({ text: '—', over: false });
  expect(view.rate(1, 4)).toEqual({ text: '25%', over: false });
  expect(view.rate(5, 4)).toEqual({ text: '125%', over: true });
  expect(view.presetRange(7, '2026-09-29')).toEqual({ from: '2026-09-23', to: '2026-09-29' });
  expect(view.rangeProblem('2026-07-02', '2026-09-29', '2026-09-29')).toBeNull();
  expect(view.rangeProblem('2026-07-01', '2026-09-29', '2026-09-29')).toMatch('90일');
  expect(view.rangeProblem('2026-09-29', '2026-09-30', '2026-09-29')).toMatch('오늘 이후');
  expect(view.queryUrl('2026-09-23', '2026-09-29', '')).toBe(
    '/api/usage?from=2026-09-23&to=2026-09-29'
  );
  expect(view.safeLink('javascript:alert(1)')).toBeNull();
  expect(view.safeLink('https://example.com/a')).toBe('https://example.com/a');
  expect(view.campaignLabel({ code: null })).toBe('출처 미확인');
  expect(view.campaignLabel({ code: 'Z9', registered: false })).toBe('Z9 (미등록 코드)');
  expect(view.failText(503)).toMatch('0건이 아닙니다');
});
