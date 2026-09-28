// 오프라인 서버가 앱 밖 파일을 내주지 않고 로컬 연결만 치환하는지 확인한다.
import { test, expect } from '@playwright/test';
import { makeServer } from '../tools/vdi/server.mjs';

let server;
let origin;
test.beforeAll(async () => {
  server = makeServer('landing');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('소개 페이지의 앱 링크는 로컬 주소', async ({ request }) => {
  const response = await request.get(origin);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('http://localhost:4173');
  expect(html).not.toContain('https://app.namneundon.com');
});

test('상위 폴더와 쓰기 요청을 허용하지 않음', async ({ request }) => {
  const response = await request.get(`${origin}/..${encodeURIComponent('/')}package.json`);
  expect(response.status()).toBe(403);
  const malformed = await request.get(`${origin}/%FF`);
  expect(malformed.status()).toBe(404);
  const post = await request.post(origin, { data: 'test' });
  expect(post.status()).toBe(405);
  const alive = await request.get(origin);
  expect(alive.status()).toBe(200);
});
