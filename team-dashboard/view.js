// 팀 대시보드의 표시 규칙 — 화면과 시험이 함께 쓰는 순수 함수 (2026-09-29).
// ★ 분모가 0 이면 비율은 「—」. 누락 · 날짜 경계로 100% 를 넘으면 그 값을 그대로 두고 주의만 붙인다.
// ★ 건수는 단계별 발생 건수다. 사람 수로 읽히는 말을 쓰지 않는다.

export const MAX_DAYS = 90;
export const UNATTRIBUTED = '-';

export function seoulDate(ms) {
  return new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
export function addDays(d, n) {
  const t = new Date(d + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
export function daysBetween(from, to) {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
}

/** 최근 N일 — 오늘(서울)을 넣어 N개 날짜 */
export function presetRange(days, today) {
  return { from: addDays(today, -(days - 1)), to: today };
}

/** 날짜 고르기 검사 — 서버(parseQuery)와 같은 규칙. 문제가 없으면 null */
export function rangeProblem(from, to, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || ''))
    return '시작일과 종료일을 모두 고르세요.';
  if (from > to) return '시작일이 종료일보다 늦습니다.';
  if (to > today) return '오늘 이후 날짜는 고를 수 없습니다.';
  if (daysBetween(from, to) + 1 > MAX_DAYS) return `최대 ${MAX_DAYS}일까지 볼 수 있습니다.`;
  return null;
}

/**
 * @param {number} num
 * @param {number} den
 * @returns {{ text: string, over: boolean }}
 */
export function rate(num, den) {
  if (!den) return { text: '—', over: false };
  const pct = (num / den) * 100;
  return { text: `${Math.round(pct)}%`, over: num > den };
}

export function count(n) {
  return Number(n || 0).toLocaleString('ko-KR');
}

/** 조회 주소 — 같은 주소(origin)의 /api/usage 만 부른다. 비밀 값은 싣지 않는다 */
export function queryUrl(from, to, s) {
  const q = new URLSearchParams({ from, to });
  if (s) q.set('s', s);
  return '/api/usage?' + q.toString();
}

/** 글 이름 — 출처 미확인 · 미등록 코드를 실제 글과 섞어 보이지 않게 */
export function campaignLabel(c) {
  if (c.code == null) return '출처 미확인';
  if (!c.registered) return `${c.code} (미등록 코드)`;
  return c.title ? `${c.code} · ${c.title}` : c.code;
}

/** 원문 링크는 https 주소만 링크로 만든다 */
export function safeLink(url) {
  return typeof url === 'string' && /^https:\/\/[^\s"'<>]+$/.test(url) ? url : null;
}

const WARN = {
  not_started: '아직 집계를 시작하지 않았습니다. 이 기간은 모두 미수집입니다.',
  partial_range: '선택한 기간 앞쪽 일부는 집계 시작 전이라 미수집입니다 (0건이 아닙니다).',
  today_in_progress: '오늘은 아직 집계 중입니다.'
};
export function warningText(code) {
  return WARN[code] || '알려진 자료 제한이 있습니다.';
}

/** 모의 · 시험 자료는 실제 집계와 헷갈리지 않게 따로 알린다 */
export function isMock(source) {
  return source === 'mock' || source === 'dev';
}

/** 응답 상태에 따른 안내. 실패를 0건으로 바꾸지 않는다 */
export function failText(status) {
  if (status === 401 || status === 403)
    return '로그인이 만료되었거나 권한이 없습니다. 새로고침해 다시 로그인하세요.';
  if (status === 503) return '집계 원본에 연결되지 않아 불러오지 못했습니다. 0건이 아닙니다.';
  if (status === 400) return '조회 조건이 올바르지 않습니다.';
  return '불러오지 못했습니다. 잠시 후 새로고침하세요.';
}
