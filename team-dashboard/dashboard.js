// 팀 대시보드 화면 (NAM-20, 2026-09-29).
// ★ 같은 주소의 /api/usage 만 부른다. 로그인은 Cloudflare Access 쿠키가 맡고, 비밀 값은 여기에 없다.
// ★ 조건을 바꾸면 앞 요청의 늦은 답이 새 화면을 덮지 않는다 (차례 번호로 버린다).
// ★ 불러오기 실패를 0건으로 바꾸지 않는다. 같은 조건의 새로고침만 실패하면 앞 숫자와 그 조회 시각을 남긴다.
// ★ 받은 글자는 textContent 로만 넣는다.
import {
  seoulDate,
  presetRange,
  rangeProblem,
  rate,
  count,
  queryUrl,
  campaignLabel,
  safeLink,
  warningText,
  isMock,
  failText
} from './view.js';

/** 이 화면의 요소는 모두 index.html 에 있다 */
const $ = (id) => /** @type {any} */ (document.getElementById(id));
const state = {
  from: '',
  to: '',
  s: '',
  seq: 0,
  shown: null,
  shownKey: '',
  codes: new Set(),
  presetDays: null
};

function today() {
  const value = seoulDate(Date.now());
  $('from').max = value;
  $('to').max = value;
  return value;
}

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function hhmm(iso) {
  const d = new Date(Date.parse(iso) + 9 * 3600 * 1000);
  return d.toISOString().slice(11, 16);
}
function setStatus(msg, bad) {
  const s = $('status');
  s.textContent = msg;
  s.classList.toggle('bad', !!bad);
}

function clearNumbers() {
  for (const id of ['n-arrival', 'n-file', 'n-result']) $(id).textContent = '—';
  $('rates').textContent = '';
  $('warns').replaceChildren();
  $('chart').replaceChildren();
  $('daily').tBodies[0].replaceChildren();
  $('camps').tBodies[0].replaceChildren();
  $('mock').hidden = true;
}

function drawRates(t) {
  const box = $('rates');
  box.replaceChildren();
  /** @type {Array<[string, { text: string, over: boolean }]>} */
  const parts = [
    ['파일 선택/도착', rate(t.fileSelected, t.arrival)],
    ['결과/파일 선택', rate(t.resultShown, t.fileSelected)],
    ['결과/도착', rate(t.resultShown, t.arrival)]
  ];
  parts.forEach(([name, r], i) => {
    if (i) box.append(' · ');
    box.append(el('span', `${name} ${r.text}`, r.over ? 'over' : null));
  });
  if (parts.some(([, r]) => r.over))
    box.append(el('span', ' (누락 · 날짜 경계로 100%를 넘을 수 있습니다)', 'over'));
}

function drawChart(daily) {
  const box = $('chart');
  box.replaceChildren();
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const w = Math.max(daily.length * 14, 280);
  svg.setAttribute('viewBox', `0 0 ${w} 160`);
  svg.setAttribute('preserveAspectRatio', 'none');
  // 단계별 건수는 날짜 경계·전송 누락으로 결과가 도착보다 클 수 있다.
  const max = Math.max(
    1,
    ...daily.filter((d) => d.collected).flatMap((d) => [d.arrival, d.resultShown])
  );
  const step = w / daily.length;
  daily.forEach((d, i) => {
    const x = i * step;
    const bar = (cls, v, off) => {
      const r = document.createElementNS(ns, 'rect');
      const h = cls === 'x' ? 4 : (v / max) * 150;
      r.setAttribute('class', cls);
      r.setAttribute('x', String(x + off));
      r.setAttribute('y', String(160 - h));
      r.setAttribute('width', String(Math.max(step / 2 - 1, 1)));
      r.setAttribute('height', String(h));
      svg.appendChild(r);
    };
    if (!d.collected) bar('x', 0, 0);
    else {
      bar('a', d.arrival, 0);
      bar('r', d.resultShown, step / 2);
    }
  });
  box.appendChild(svg);
}

function drawDaily(daily) {
  const body = $('daily').tBodies[0];
  body.replaceChildren();
  for (const d of daily) {
    const tr = el('tr');
    tr.appendChild(el('th', d.date)).setAttribute('scope', 'row');
    if (!d.collected) {
      const td = el('td', '미수집', 'none');
      td.colSpan = 3;
      tr.appendChild(td);
    } else
      for (const k of ['arrival', 'fileSelected', 'resultShown'])
        tr.appendChild(el('td', count(d[k])));
    body.appendChild(tr);
  }
}

function drawCamps(list, hasCollected) {
  const body = $('camps').tBodies[0];
  body.replaceChildren();
  if (!list.length) {
    const tr = el('tr');
    const td = el('td', '이 조건에 해당하는 글이 없습니다.', 'none');
    td.colSpan = 6;
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }
  for (const c of list) {
    const tr = el('tr');
    tr.appendChild(el('th', campaignLabel(c))).setAttribute('scope', 'row');
    const link = safeLink(c.postUrl);
    const cell = el('td');
    if (link) {
      const a = el('a', '원문');
      a.href = link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      cell.appendChild(a);
    } else cell.textContent = '—';
    tr.appendChild(cell);
    // 수집을 시작하지 않은 기간의 등록 글은 실제 0건으로 보이면 안 된다.
    tr.appendChild(el('td', hasCollected ? count(c.arrival) : '미수집'));
    tr.appendChild(el('td', hasCollected ? count(c.fileSelected) : '미수집'));
    tr.appendChild(el('td', hasCollected ? count(c.resultShown) : '미수집'));
    const r = rate(c.resultShown, c.arrival);
    tr.appendChild(el('td', hasCollected ? r.text : '—', r.over ? 'over' : null));
    body.appendChild(tr);
    if (c.code) state.codes.add(c.code);
  }
}

function syncCodes() {
  const sel = $('code');
  const have = new Set([...sel.options].map((o) => o.value));
  for (const code of [...state.codes].sort()) {
    if (have.has(code)) continue;
    const o = el('option', code);
    o.value = code;
    sel.appendChild(o);
  }
}

function draw(data) {
  $('mock').hidden = !isMock(data.source);
  const warns = $('warns');
  warns.replaceChildren(...data.warnings.map((w) => el('li', warningText(w))));
  const any = data.daily.some((d) => d.collected);
  const t = data.totals;
  $('n-arrival').textContent = any ? count(t.arrival) : '미수집';
  $('n-file').textContent = any ? count(t.fileSelected) : '미수집';
  $('n-result').textContent = any ? count(t.resultShown) : '미수집';
  if (any) drawRates(t);
  else $('rates').textContent = '';
  drawChart(data.daily);
  drawDaily(data.daily);
  drawCamps(data.campaigns, any);
  syncCodes();
  const start = data.trackingStartedAt ? `집계 시작 ${data.trackingStartedAt}` : '집계 시작 전';
  const zero =
    any && !t.arrival && !t.fileSelected && !t.resultShown ? ' · 이 기간은 0건입니다' : '';
  setStatus(`한국 시간 · ${start} · 조회 ${hhmm(data.generatedAt)}${zero}`);
}

async function load() {
  const my = ++state.seq;
  const key = `${state.from}|${state.to}|${state.s}`;
  setStatus('불러오는 중…');
  let res;
  let data = null;
  try {
    res = await fetch(queryUrl(state.from, state.to, state.s), {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    const type = res.headers.get('Content-Type') || '';
    // 로그인이 풀리면 Access 로그인 화면(HTML)이 올 수 있다 — 숫자로 읽지 않는다
    if (res.ok && type.includes('application/json')) data = await res.json();
  } catch {
    res = null;
  }
  if (my !== state.seq) return; // 더 새 조건의 요청이 있다
  if (data) {
    state.shown = data;
    state.shownKey = key;
    draw(data);
    return;
  }
  const status = res ? (res.ok ? 403 : res.status) : 0;
  if (state.shown && state.shownKey === key) {
    setStatus(
      `${failText(status)} 아래는 ${hhmm(state.shown.generatedAt)}에 불러온 숫자입니다.`,
      true
    );
    return;
  }
  state.shown = null;
  clearNumbers();
  setStatus(failText(status), true);
}

function usePreset(days) {
  const r = presetRange(days, today());
  state.presetDays = days;
  state.from = r.from;
  state.to = r.to;
  $('from').value = r.from;
  $('to').value = r.to;
  for (const b of document.querySelectorAll('[data-days]'))
    b.setAttribute('aria-pressed', String(b.getAttribute('data-days') === String(days)));
  load();
}

function init() {
  today();
  for (const b of document.querySelectorAll('[data-days]'))
    b.addEventListener('click', () => usePreset(Number(b.getAttribute('data-days'))));
  $('apply').addEventListener('click', () => {
    const from = $('from').value;
    const to = $('to').value;
    const bad = rangeProblem(from, to, today());
    if (bad) {
      setStatus(bad, true);
      return;
    }
    state.from = from;
    state.to = to;
    state.presetDays = null;
    for (const b of document.querySelectorAll('[data-days]'))
      b.setAttribute('aria-pressed', 'false');
    load();
  });
  $('code').addEventListener('change', () => {
    state.s = $('code').value;
    if (state.presetDays) usePreset(state.presetDays);
    else load();
  });
  $('reload').addEventListener('click', () => {
    if (state.presetDays) usePreset(state.presetDays);
    else {
      today();
      load();
    }
  });
  usePreset(7);
}

init();
