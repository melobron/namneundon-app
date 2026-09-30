// 팀 대시보드 Worker(로그인 확인 · 조회 API)와 짧은 링크 Worker — 배포 없이 코드만 (2026-09-29).
// 로그인 토큰은 시험용 RSA 키로 직접 만든다. 실제 Access 설정 · 계정과 무관하다.
import { test, expect } from '@playwright/test';
import { createHandler, unconnectedSource } from '../../services/usage-dashboard/worker.js';
import { shortLink } from '../../services/short-link/worker.js';

const TEAM = 'nd-test.cloudflareaccess.com';
const AUD = 'aud-for-test';
const NOW = Date.parse('2026-09-29T03:00:00Z');
const ENV = {
  ACCESS_TEAM_DOMAIN: TEAM,
  ACCESS_AUD: AUD,
  ASSETS: { fetch: async () => new Response('<!doctype html>화면', { status: 200 }) }
};

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
let keyPair;
let jwk;
let otherKey;
test.beforeAll(async () => {
  const gen = () =>
    crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['sign', 'verify']
    );
  keyPair = await gen();
  otherKey = await gen();
  jwk = { ...(await crypto.subtle.exportKey('jwk', keyPair.publicKey)), kid: 'k1' };
});
async function token(claims = {}, { key = keyPair.privateKey, kid = 'k1', alg = 'RS256' } = {}) {
  const head = b64url(JSON.stringify({ alg, kid, typ: 'JWT' }));
  const body = b64url(
    JSON.stringify({
      aud: [AUD],
      iss: 'https://' + TEAM,
      exp: Math.floor(NOW / 1000) + 600,
      iat: Math.floor(NOW / 1000),
      email: 'member@example.com',
      ...claims
    })
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(head + '.' + body)
  );
  return head + '.' + body + '.' + b64url(sig);
}
const ROWS = [{ date: '2026-09-29', code: 'D08', step: '도착', count: 3 }];
const okSource = {
  name: 'test',
  read: async () => ({ rows: ROWS, trackingStartedAt: '2026-09-20' })
};
function handler(source = okSource) {
  return createHandler({
    source,
    getKeys: async (origin) => {
      if (origin !== 'https://' + TEAM) throw new Error('wrong team');
      return [jwk];
    },
    now: () => NOW,
    campaigns: [{ code: 'D08', title: '시험 글', postUrl: 'https://example.com/d08' }]
  });
}
const req = (path, tok, init = {}) =>
  new Request('https://team.example' + path, {
    ...init,
    headers: tok ? { 'Cf-Access-Jwt-Assertion': tok } : {}
  });
const API = '/api/usage?from=2026-09-23&to=2026-09-29';

test('로그인 없음 · 틀린 토큰은 화면과 API 모두 403 — 까닭 · 토큰을 드러내지 않는다', async () => {
  const h = handler();
  const cases = {
    '토큰 없음': null,
    '모양 틀림': 'abc',
    '다른 키 서명': await token({}, { key: otherKey.privateKey }),
    '모르는 kid': await token({}, { kid: 'k9' }),
    'alg none': (await token()).replace(
      /^[^.]+/,
      b64url(JSON.stringify({ alg: 'none', kid: 'k1' }))
    ),
    '다른 aud': await token({ aud: ['other'] }),
    '다른 iss': await token({ iss: 'https://evil.cloudflareaccess.com' }),
    만료: await token({ exp: Math.floor(NOW / 1000) - 3600 }),
    '아직 아님': await token({ nbf: Math.floor(NOW / 1000) + 3600 })
  };
  for (const [name, tok] of Object.entries(cases)) {
    for (const path of ['/', '/index.html', '/dashboard.js', API]) {
      const res = await h(req(path, tok), ENV);
      expect(res.status, `${name} ${path}`).toBe(403);
      expect(res.headers.get('Cache-Control')).toBe('private, no-store');
      const body = await res.text();
      expect(body).toBe('접근 권한이 없습니다.');
    }
  }
});

test('설정(팀 도메인 · AUD)이 비어 있으면 올바른 토큰이어도 막는다', async () => {
  const h = handler();
  const tok = await token();
  for (const env of [
    { ...ENV, ACCESS_AUD: '' },
    { ...ENV, ACCESS_TEAM_DOMAIN: '' },
    { ...ENV, ACCESS_TEAM_DOMAIN: 'evil.example.com' }
  ])
    expect((await h(req('/', tok), env)).status).toBe(403);
});

test('로그인하면 화면과 조회 — 비공개 · 저장 안 함, 보안 머리글', async () => {
  const h = handler();
  const tok = await token();
  const page = await h(req('/', tok), ENV);
  expect(page.status).toBe(200);
  expect(page.headers.get('Cache-Control')).toBe('private, no-store');
  expect(page.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
  const res = await h(req(API, tok), ENV);
  expect(res.status).toBe(200);
  expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  const data = await res.json();
  expect(data).toMatchObject({
    timezone: 'Asia/Seoul',
    measurementVersion: 1,
    source: 'test',
    totals: { arrival: 3, fileSelected: 0, resultShown: 0 },
    warnings: ['today_in_progress']
  });
  expect(data.campaigns[0]).toMatchObject({ code: 'D08', title: '시험 글' });
});

test('조회 조건이 틀리면 400, 없는 API 는 404, 쓰기 요청은 405', async () => {
  const h = handler();
  const tok = await token();
  expect((await h(req('/api/usage?from=2026-09-29&to=2026-09-30', tok), ENV)).status).toBe(400);
  expect((await h(req('/api/other', tok), ENV)).status).toBe(404);
  expect((await h(req(API, tok, { method: 'POST' }), ENV)).status).toBe(405);
});

test('집계 원본이 없거나 실패하면 503 — 0건으로 꾸미지 않고 내부 오류를 내보내지 않는다', async () => {
  const tok = await token();
  const unconnected = await handler(unconnectedSource)(req(API, tok), ENV);
  expect(unconnected.status).toBe(503);
  expect(await unconnected.json()).toEqual({ error: 'source_unavailable' });
  const broken = {
    name: 'x',
    read: async () => {
      throw new Error('https://secret.example/funnel?key=RUN_KEY_VALUE');
    }
  };
  const res = await handler(broken)(req(API, tok), ENV);
  expect(res.status).toBe(503);
  expect(await res.text()).not.toContain('RUN_KEY');
});

const CAMPS = [
  { code: 'D08', title: 'a' },
  { code: 'L01', title: 'b', destination: 'https://namneundon.com/?utm=x#top' },
  { code: 'BAD', title: 'c', destination: 'https://evil.example/' }
];
const link = (path, init) => shortLink(new Request('https://namneundon.com' + path, init), CAMPS);

test('짧은 링크 — 등록 코드만 소개 페이지로 302, 캐시 안 함', async () => {
  const r = link('/t/D08');
  expect(r.status).toBe(302);
  expect(r.headers.get('Location')).toBe('https://namneundon.com/?s=D08');
  expect(r.headers.get('Cache-Control')).toBe('no-store');
  expect(link('/t/L01').headers.get('Location')).toBe('https://namneundon.com/?utm=x&s=L01#top');
  // 주소에 실린 이동 대상은 보지 않는다
  expect(link('/t/D08?redirect=https://evil.example').headers.get('Location')).toBe(
    'https://namneundon.com/?s=D08'
  );
});

test('짧은 링크 — 모르는 코드 · 틀린 모양 · 바깥 도착지는 404 와 첫 화면 링크', async () => {
  for (const path of ['/t/X99', '/t/d08', '/t/', '/t/D-08', '/t/BAD', '/t/D08/extra', '/other']) {
    const r = link(path);
    expect(r.status, path).toBe(404);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(await r.text()).toContain('href="https://namneundon.com/"');
  }
  expect(link('/t/D08', { method: 'POST' }).status).toBe(405);
});
