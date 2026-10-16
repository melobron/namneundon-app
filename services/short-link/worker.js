// 짧은 링크 Worker — https://namneundon.com/t/<글 코드> 만 맡는다 (NAM-22, 2026-09-29. 아직 배포하지 않음).
// ★ 등록한 글 코드(services/campaigns.js)만 그 글의 도착지(소개 페이지)로 보낸다. 주소에 실린
//   redirect · url 같은 값은 보지 않는다 — 아무 바깥 주소로나 보내는 통로가 되지 않게.
// ★ 도착지는 운영 중에 바뀔 수 있어 302 로 보내고 캐시하지 않는다 (no-store).
// ★ 모르는 코드는 404 와 소개 페이지로 가는 링크. 링크를 누른 것 자체는 세지 않는다.
// ★ Cloudflare Pages 의 _redirects 는 리디렉트 응답에 _headers 를 붙이지 않아 no-store 를 보장할 수 없다.
//   그래서 /t/* 경로만 이 Worker 가 받고, 소개 페이지의 나머지 경로 · 정적 파일은 그대로 Pages 가 낸다.
import { CAMPAIGNS, LANDING_ORIGIN } from '../campaigns.js';
import { isCode } from '../usage-rules.js';

const HEAD = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

function notFound() {
  const home = LANDING_ORIGIN + '/';
  const body =
    '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>남는돈 · 링크를 찾을 수 없습니다</title></head><body>' +
    '<p>링크를 찾을 수 없습니다.</p><p><a href="' +
    home +
    '">남는돈 첫 화면으로</a></p></body></html>';
  return new Response(body, {
    status: 404,
    headers: { ...HEAD, 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/**
 * @param {Request} request
 * @param {Array<{ code: string, destination?: string }>} [campaigns]
 */
export function shortLink(request, campaigns = CAMPAIGNS) {
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return new Response(null, { status: 405, headers: { ...HEAD, Allow: 'GET, HEAD' } });
  const m = /^\/t\/([^/]+)\/?$/.exec(new URL(request.url).pathname);
  if (!m || !isCode(m[1])) return notFound();
  const c = campaigns.find((x) => x.code === m[1]);
  if (!c) return notFound();
  let dest;
  try {
    dest = new URL(c.destination || LANDING_ORIGIN + '/');
  } catch {
    return notFound();
  }
  // 목록이 잘못 적혀도 소개 페이지 밖으로는 보내지 않는다
  if (dest.origin !== LANDING_ORIGIN) return notFound();
  dest.searchParams.set('s', c.code);
  return new Response(null, { status: 302, headers: { ...HEAD, Location: dest.href } });
}

export default {
  /** @param {Request} request */
  fetch(request) {
    return shortLink(request);
  }
};
