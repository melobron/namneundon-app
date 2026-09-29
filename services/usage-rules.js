// 유입·사용 집계 규칙 (NAM-20 · 팀 대시보드, 2026-09-29).
// 서버(Worker)와 시험이 함께 쓰는 순수 함수만 둔다 — 저장소 · 네트워크 · 지금 시각에 닿지 않는다.
// ★ 고객 앱 이벤트는 { step, s } 뿐이다. 그 밖의 키가 오면 받지 않는다.
// ★ 건수는 「단계별 발생 건수」다. 사용자 수가 아니다 — 방문자 번호를 만들지 않으므로 셀 수 없다.

export const STEPS = /** @type {const} */ (['도착', '파일선택', '결과표시']);
/** 화면 · 조회 응답에서 쓰는 이름 */
export const STEP_FIELD = { 도착: 'arrival', 파일선택: 'fileSelected', 결과표시: 'resultShown' };
export const CODE_RE = /^[A-Za-z0-9_]{1,12}$/;
/** 조회에서 「출처 미확인」만 고를 때 쓰는 값. 글 코드에 쓸 수 없는 글자라 실제 코드와 안 겹친다 */
export const UNATTRIBUTED = '-';
export const MAX_DAYS = 90;
export const MAX_BODY_CHARS = 300;
export const MAX_BODY_BYTES = 600;

export function isCode(s) {
  return typeof s === 'string' && CODE_RE.test(s);
}

/**
 * 고객 앱이 보낸 이벤트 본문 검사 — 시험 수신처와 (확인 뒤) 수신 서버 계약에 쓴다.
 * @param {string} text 요청 본문 그대로
 * @returns {{ ok: true, step: string, code: string | null } | { ok: false, why: string }}
 */
export function parseEvent(text) {
  if (typeof text !== 'string') return { ok: false, why: 'body' };
  if (text.length > MAX_BODY_CHARS) return { ok: false, why: 'too_long' };
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return { ok: false, why: 'too_long' };
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    return { ok: false, why: 'json' };
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, why: 'shape' };
  const keys = Object.keys(o);
  if (keys.some((k) => k !== 'step' && k !== 's')) return { ok: false, why: 'extra_key' };
  if (!STEPS.includes(o.step)) return { ok: false, why: 'step' };
  if ('s' in o && !isCode(o.s)) return { ok: false, why: 's' };
  return { ok: true, step: o.step, code: 's' in o ? o.s : null };
}

/** 그 순간의 서울 날짜 YYYY-MM-DD. 한국은 서머타임이 없어 +9시간이면 된다 */
export function seoulDate(ms) {
  return new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isDate(d) {
  return DATE_RE.test(d) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
}
export function addDays(d, n) {
  const t = new Date(d + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
export function daysBetween(from, to) {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
}

/**
 * 조회 조건 검사. 시작 · 끝 날짜를 모두 넣고, 최대 90일, 끝은 오늘(서울)까지.
 * @param {URLSearchParams} q
 * @param {string} today 서울 날짜
 */
export function parseQuery(q, today) {
  const from = q.get('from');
  const to = q.get('to');
  if (!from || !to || !isDate(from) || !isDate(to)) return { ok: false, why: 'date' };
  if (from > to) return { ok: false, why: 'order' };
  if (to > today) return { ok: false, why: 'future' };
  if (daysBetween(from, to) + 1 > MAX_DAYS) return { ok: false, why: 'too_long' };
  const all = q.getAll('s');
  if (all.length > 1) return { ok: false, why: 's' };
  const s = all.length ? all[0] : null;
  if (s !== null && s !== UNATTRIBUTED && !isCode(s)) return { ok: false, why: 's' };
  return { ok: true, from, to, s };
}

/**
 * 운영자가 관리하는 글 목록 검사. 원문 링크는 https 만, 도착지는 허용한 소개 페이지만.
 * @param {Array<any>} list
 * @param {string} landingOrigin
 */
export function checkCampaigns(list, landingOrigin) {
  const problems = [];
  const seen = new Set();
  for (const c of list) {
    if (!isCode(c.code)) problems.push(`코드 모양: ${c.code}`);
    if (seen.has(c.code)) problems.push(`코드 중복: ${c.code}`);
    seen.add(c.code);
    if (typeof c.title !== 'string' || !c.title) problems.push(`제목 없음: ${c.code}`);
    if (c.postUrl != null && !/^https:\/\/[^\s]+$/.test(c.postUrl))
      problems.push(`원문 링크는 https 만: ${c.code}`);
    if (c.publishedAt != null && !isDate(c.publishedAt)) problems.push(`게시일 모양: ${c.code}`);
    let dest;
    try {
      dest = new URL(c.destination || landingOrigin + '/');
    } catch {
      problems.push(`도착지 모양: ${c.code}`);
      continue;
    }
    if (dest.origin !== landingOrigin) problems.push(`도착지는 소개 페이지만: ${c.code}`);
  }
  return problems;
}

/**
 * 날짜 · 글 · 단계별 건수를 조회 응답 모양으로 바꾼다.
 * 합계 · 일별 · 글별은 같은 범위 · 같은 필터에서 늘 맞아야 한다.
 * 집계를 시작하기 전 날짜는 0 이 아니라 「미수집」이다.
 * @param {{
 *   rows: Array<{ date: string, code: string | null, step: string, count: number }>,
 *   campaigns: Array<{ code: string, title: string, postUrl?: string | null, publishedAt?: string | null }>,
 *   from: string, to: string, s: string | null, today: string,
 *   trackingStartedAt: string | null, generatedAt: string, source: string
 * }} a
 */
export function buildReport(a) {
  const zero = () => ({ arrival: 0, fileSelected: 0, resultShown: 0 });
  const started = a.trackingStartedAt;
  const collected = (d) => started != null && d >= started && d <= a.today;
  const pick = (code) => (a.s == null ? true : a.s === UNATTRIBUTED ? code == null : code === a.s);

  const daily = [];
  const byDay = new Map();
  for (let d = a.from; d <= a.to; d = addDays(d, 1)) {
    const row = collected(d)
      ? { date: d, collected: true, ...zero() }
      : { date: d, collected: false };
    daily.push(row);
    byDay.set(d, row);
  }
  const totals = zero();
  const byCode = new Map();
  for (const r of a.rows) {
    if (r.date < a.from || r.date > a.to || !collected(r.date)) continue;
    if (!pick(r.code)) continue;
    const f = STEP_FIELD[r.step];
    if (!f) continue;
    const n = Math.max(0, Math.floor(Number(r.count) || 0));
    totals[f] += n;
    byDay.get(r.date)[f] += n;
    const key = r.code == null ? null : r.code;
    if (!byCode.has(key)) byCode.set(key, zero());
    byCode.get(key)[f] += n;
  }
  const meta = new Map(a.campaigns.map((c) => [c.code, c]));
  // 필터에 맞는 등록 글은 0건이어도 보인다 (0건도 사실이다)
  for (const c of a.campaigns) if (pick(c.code) && !byCode.has(c.code)) byCode.set(c.code, zero());
  const campaigns = [...byCode.entries()]
    .map(([code, n]) => {
      const m = code == null ? null : meta.get(code);
      return {
        code,
        registered: code == null ? null : !!m,
        title: m ? m.title : null,
        postUrl: m && m.postUrl ? m.postUrl : null,
        publishedAt: m && m.publishedAt ? m.publishedAt : null,
        ...n
      };
    })
    .sort((x, y) => y.resultShown - x.resultShown || y.arrival - x.arrival);

  const warnings = [];
  if (started == null) warnings.push('not_started');
  else if (a.from < started) warnings.push('partial_range');
  if (a.to === a.today) warnings.push('today_in_progress');
  const avail = started == null || started > a.to ? null : started > a.from ? started : a.from;
  return {
    timezone: 'Asia/Seoul',
    measurementVersion: 1,
    source: a.source,
    trackingStartedAt: started,
    availableFrom: avail,
    availableTo: avail ? a.to : null,
    generatedAt: a.generatedAt,
    range: { from: a.from, to: a.to, s: a.s },
    totals,
    daily,
    campaigns,
    warnings
  };
}
