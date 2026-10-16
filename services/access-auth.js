// Cloudflare Access 로그인 확인 (팀 대시보드 · 조회 API, 2026-09-29).
// 공식 안내: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
// ★ 머리글(Cf-Access-Jwt-Assertion)이 「있다」는 것만으로 들이지 않는다. 서명 · aud · iss · 만료를 모두 본다.
// ★ 설정(팀 도메인 · AUD)이 비어 있으면 누구도 들이지 않는다 — 설정 전에 열리는 일이 없게.
// ★ 새 의존성(jose 등) 없이 브라우저 · Worker 공통의 WebCrypto 로 RS256 을 확인한다.

const SKEW = 60; // 초. 서버 시계 차이만큼 봐준다

function b64urlBytes(s) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(s)));
}

/** 팀 도메인 모양 — 이름.cloudflareaccess.com 만 받는다 */
export function teamOrigin(domain) {
  if (typeof domain !== 'string' || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain))
    return null;
  return 'https://' + domain;
}

/**
 * 공개 키 목록 가져오기 — 키가 바뀌는 것을 따라가도록 주기적으로 다시 받는다.
 * @param {(url: string) => Promise<Response>} fetchFn
 */
export function jwksCache(fetchFn, ttlMs = 10 * 60 * 1000) {
  let at = 0;
  let keys = null;
  return async (origin, now) => {
    if (!keys || now - at > ttlMs) {
      const res = await fetchFn(origin + '/cdn-cgi/access/certs');
      if (!res.ok) throw new Error('certs');
      const body = await res.json();
      keys = Array.isArray(body.keys) ? body.keys : [];
      at = now;
    }
    return keys;
  };
}

/**
 * @param {string | null} token Cf-Access-Jwt-Assertion 값
 * @param {{ domain: string, aud: string, getKeys: (origin: string, now: number) => Promise<any[]>, now: number }} o
 * @returns {Promise<{ ok: true, email: string | null } | { ok: false, why: string }>}
 */
export async function verifyAccess(token, o) {
  const origin = teamOrigin(o.domain);
  if (!origin || !o.aud) return { ok: false, why: 'not_configured' };
  if (!token || typeof token !== 'string') return { ok: false, why: 'no_token' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, why: 'shape' };
  let head, claims;
  try {
    head = b64urlJson(parts[0]);
    claims = b64urlJson(parts[1]);
  } catch {
    return { ok: false, why: 'shape' };
  }
  if (head.alg !== 'RS256' || !head.kid) return { ok: false, why: 'alg' };
  let keys;
  try {
    keys = await o.getKeys(origin, o.now);
  } catch {
    return { ok: false, why: 'certs' };
  }
  const jwk = keys.find((k) => k.kid === head.kid && k.kty === 'RSA');
  if (!jwk) return { ok: false, why: 'kid' };
  let good;
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    good = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64urlBytes(parts[2]),
      new TextEncoder().encode(parts[0] + '.' + parts[1])
    );
  } catch {
    good = false;
  }
  if (!good) return { ok: false, why: 'signature' };
  const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!auds.includes(o.aud)) return { ok: false, why: 'aud' };
  if (claims.iss !== origin) return { ok: false, why: 'iss' };
  const sec = Math.floor(o.now / 1000);
  if (typeof claims.exp !== 'number' || claims.exp < sec - SKEW)
    return { ok: false, why: 'expired' };
  if (typeof claims.nbf === 'number' && claims.nbf > sec + SKEW)
    return { ok: false, why: 'not_yet' };
  return { ok: true, email: typeof claims.email === 'string' ? claims.email : null };
}
