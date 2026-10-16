// 팀 대시보드 Worker — 화면(team-dashboard/)과 조회 API(/api/usage)를 한 주소에서 함께 지킨다.
// (NAM-20 팀 대시보드, 2026-09-29. 아직 배포하지 않았다 — docs/development.md 「유입·사용 현황」)
//
// ★ 모든 요청이 먼저 여기를 지난다 (wrangler.jsonc 의 run_worker_first). 화면 파일도 로그인 없이는 안 나간다.
// ★ 로그인 확인은 Cloudflare Access 가 붙여 주는 서명된 토큰으로만 한다 (services/access-auth.js).
// ★ 집계 원본(기존 수집 서버 worker_v27)은 아직 연결하지 않았다. 원본 소스 · 저장 방식 · 조회 인증을
//   확인하기 전에는 추정해서 붙이지 않는다 — 그동안 조회는 503 「집계 원본 연결 전」이다. 0건으로 꾸미지 않는다.
// ★ 비밀 값(RUN_KEY 등)은 브라우저 · 주소 · 응답에 싣지 않는다. 연결할 때는 Worker Secret 과
//   서버 사이 머리글 또는 service binding 을 쓴다.
import { verifyAccess, jwksCache } from '../access-auth.js';
import { parseQuery, buildReport, seoulDate } from '../usage-rules.js';
import { CAMPAIGNS } from '../campaigns.js';

const SECURITY = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
};

function withHeaders(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY)) out.headers.set(k, v);
  return out;
}
function json(status, body) {
  return withHeaders(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  );
}
function text(status, body) {
  return withHeaders(
    new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  );
}

/** 집계 원본을 아직 연결하지 않았을 때 — 조회를 0건이 아니라 「못 읽음」으로 돌려준다 */
export class SourceUnavailable extends Error {}
export const unconnectedSource = {
  name: 'unconnected',
  async read() {
    throw new SourceUnavailable('집계 원본 연결 전');
  }
};

/**
 * @param {{
 *   source: { name: string, read: (from: string, to: string) => Promise<{ rows: any[], trackingStartedAt: string | null }> },
 *   getKeys: (origin: string, now: number) => Promise<any[]>,
 *   now?: () => number,
 *   campaigns?: any[]
 * }} deps
 */
export function createHandler(deps) {
  const now = deps.now || (() => Date.now());
  const campaigns = deps.campaigns || CAMPAIGNS;
  return async function handle(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return withHeaders(new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } }));
    const t = now();
    const who = await verifyAccess(request.headers.get('Cf-Access-Jwt-Assertion'), {
      domain: env.ACCESS_TEAM_DOMAIN,
      aud: env.ACCESS_AUD,
      getKeys: deps.getKeys,
      now: t
    });
    // 까닭(서명 · 만료 등)은 밖에 알리지 않는다. 토큰 값도 남기지 않는다
    if (!who.ok) return text(403, '접근 권한이 없습니다.');

    const url = new URL(request.url);
    if (url.pathname === '/api/usage') {
      const today = seoulDate(t);
      const q = parseQuery(url.searchParams, today);
      if (!q.ok) return json(400, { error: 'bad_query', why: q.why });
      let got;
      try {
        got = await deps.source.read(q.from, q.to);
      } catch {
        // 원본 오류 내용(주소 · 스택 · 키)은 그대로 내보내지 않는다
        return json(503, { error: 'source_unavailable' });
      }
      return json(
        200,
        buildReport({
          rows: got.rows,
          campaigns,
          from: q.from,
          to: q.to,
          s: q.s,
          today,
          trackingStartedAt: got.trackingStartedAt,
          generatedAt: new Date(t).toISOString(),
          source: deps.source.name
        })
      );
    }
    if (url.pathname.startsWith('/api/')) return json(404, { error: 'not_found' });
    if (!env.ASSETS) return text(404, 'not found');
    return withHeaders(await env.ASSETS.fetch(request));
  };
}

const getKeys = jwksCache((u) => fetch(u));
const handle = createHandler({ source: unconnectedSource, getKeys });

export default {
  /** @param {Request} request @param {any} env */
  fetch(request, env) {
    return handle(request, env);
  }
};
