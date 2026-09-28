// 외부 요청을 차단한 새 브라우저에서 앱 계산과 소개 페이지 연결을 확인한다.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { startServers } from './server.mjs';
const servers = await startServers();
let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const external = [];
  const errors = [];
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost' && ['4173', '4174'].includes(url.port))
      return route.continue();
    external.push(url.origin);
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://localhost:4173');
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await page.getByRole('button', { name: '1년', exact: true }).waitFor();
  await page.getByRole('button', { name: '1년', exact: true }).click();
  await page.goto('http://localhost:4174');
  const links = await page
    .locator('a[href]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  assert(
    links.some((href) => href.startsWith('http://localhost:4173')),
    '소개 페이지의 앱 연결이 없다'
  );
  assert(
    !links.some((href) => href.startsWith('https://app.namneundon.com')),
    '운영 앱 주소가 남았다'
  );
  assert.deepEqual(errors, [], '브라우저 오류');
  assert.deepEqual(external, [], '화면을 열 때 외부 자원 요청 발생');
  console.log('PASS: 앱 예시 계산 + 소개 페이지 + 로컬 연결 (외부 요청 차단)');
} finally {
  await browser?.close();
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
}
