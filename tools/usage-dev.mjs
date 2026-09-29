// 유입·사용 현황을 내 컴퓨터에서만 확인한다 (NAM-20·21·22, 2026-09-29).
//   npm run dashboard
//     팀 대시보드  http://localhost:4180   ← 모의 자료 + 아래 앱에서 보낸 시험 이벤트
//     고객 앱      http://localhost:4181   ← 집계를 켠 로컬 시험 설정 (보내는 곳은 4180/ev)
//     소개 페이지  http://localhost:4182/?s=D08
//     짧은 링크    http://localhost:4180/t/D08   ← 모의 글 목록으로만 동작
// ★ 운영 집계 · 운영 Access 와 무관하다. 로그인 없이 열리는 것은 127.0.0.1 에만 열기 때문이다.
// ★ 대시보드 위에 「모의 자료」가 늘 보인다. 여기 숫자를 실제 집계로 쓰지 않는다.
// ★ 시험 이벤트는 메모리에만 있다가 끄면 사라진다.
import { fileURLToPath } from 'node:url';
import { siteServer } from '../tests/serve.mjs';
import {
  parseEvent,
  parseQuery,
  buildReport,
  seoulDate,
  addDays
} from '../services/usage-rules.js';
import { shortLink } from '../services/short-link/worker.js';

const DASH = 4180;
const APP = 4181;
const LANDING = 4182;
const root = (f) => fileURLToPath(new URL(`../${f}/`, import.meta.url));

/** 모의 글 목록 — 실제 글이 아니다 */
export const MOCK_CAMPAIGNS = [
  { code: 'D08', title: '(모의) 스레드 소개 글', postUrl: 'https://www.threads.com/@namneundon' },
  { code: 'B02', title: '(모의) 블로그 사용 후기', postUrl: 'https://blog.naver.com/namneundon' }
];

/** 모의 건수 — 날짜마다 같은 값이 나오게 날짜로 정한다 (난수 없음) */
export function mockRows(today, days = 40) {
  const rows = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i);
    const k = Number(date.slice(8, 10));
    for (const { code, base } of [
      { code: 'D08', base: 9 },
      { code: 'B02', base: 4 },
      { code: null, base: 6 }
    ]) {
      const arrival = base + (k % 5);
      const file = Math.floor(arrival * 0.4);
      rows.push({ date, code, step: '도착', count: arrival });
      rows.push({ date, code, step: '파일선택', count: file });
      rows.push({ date, code, step: '결과표시', count: Math.floor(file * 0.7) });
    }
  }
  return rows;
}

function main() {
  const today = seoulDate(Date.now());
  const started = addDays(today, -29); // 30일 전은 「미수집」으로 보이게
  const live = [];

  const dash = siteServer(root('team-dashboard'), {}, {}, (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/ev') {
      const cors = {
        'Access-Control-Allow-Origin': `http://localhost:${APP}`,
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      };
      if (req.method === 'OPTIONS') {
        res.writeHead(204, cors).end();
        return true;
      }
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const ev = parseEvent(body);
        if (!ev.ok) {
          res.writeHead(400, cors).end();
          return;
        }
        live.push({ date: seoulDate(Date.now()), code: ev.code, step: ev.step, count: 1 });
        console.log(`시험 이벤트: ${ev.step}${ev.code ? ' · ' + ev.code : ''}`);
        res.writeHead(204, cors).end();
      });
      return true;
    }
    if (url.pathname === '/api/usage') {
      const t = seoulDate(Date.now());
      const q = parseQuery(url.searchParams, t);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'private, no-store');
      if (!q.ok) {
        res.writeHead(400).end(JSON.stringify({ error: 'bad_query', why: q.why }));
        return true;
      }
      const report = buildReport({
        rows: [...mockRows(t).filter((r) => r.date >= started), ...live],
        campaigns: MOCK_CAMPAIGNS,
        from: q.from,
        to: q.to,
        s: q.s,
        today: t,
        trackingStartedAt: started,
        generatedAt: new Date().toISOString(),
        source: 'dev'
      });
      res.writeHead(200).end(JSON.stringify(report));
      return true;
    }
    if (url.pathname.startsWith('/t/')) {
      const r = shortLink(new Request(url), MOCK_CAMPAIGNS);
      const loc = r.headers.get('Location');
      // 운영 소개 주소 대신 로컬 소개 페이지로 보낸다
      const headers = Object.fromEntries(r.headers);
      if (loc)
        headers.location = loc.replace('https://namneundon.com', `http://localhost:${LANDING}`);
      r.text().then((b) => res.writeHead(r.status, headers).end(b));
      return true;
    }
    return false;
  });

  const testConfig =
    '/* 로컬 시험 설정 — tools/usage-dev.mjs 가 파일 대신 낸다. 운영과 무관 */\n' +
    `var USAGE_CONFIG = { endpoint: 'http://localhost:${DASH}/ev', keepFor: '(로컬 시험)', contact: '(로컬 시험)' };\n`;
  const app = siteServer(
    root('app'),
    { 'https://namneundon.com': `http://localhost:${LANDING}` },
    { '/src/03-usage-config.js': { type: 'text/javascript; charset=utf-8', body: testConfig } }
  );
  const landing = siteServer(root('landing'), {
    'https://app.namneundon.com': `http://localhost:${APP}`
  });

  for (const { name, server, port } of [
    { name: '팀 대시보드 (모의 자료)', server: dash, port: DASH },
    { name: '고객 앱 (로컬 시험 집계)', server: app, port: APP },
    { name: '소개 페이지', server: landing, port: LANDING }
  ]) {
    server.listen(port, '127.0.0.1', () => console.log(`${name} → http://localhost:${port}`));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
