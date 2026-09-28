// 캐시 없이 외부 요청을 막아도 로컬 두 사이트와 예시 계산이 동작해야 한다.
import { test, expect } from '@playwright/test';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { siteServer } from './serve.mjs';
import { openApp, collectNumbers } from './helpers.mjs';

const appRoot = fileURLToPath(new URL('../app/', import.meta.url));
const landingRoot = fileURLToPath(new URL('../landing/', import.meta.url));
const links = {};
const app = siteServer(appRoot, links);
const landing = siteServer(landingRoot, links);
let appURL;
let landingURL;

test.beforeAll(async () => {
  app.listen(0, '127.0.0.1');
  landing.listen(0, '127.0.0.1');
  await Promise.all([once(app, 'listening'), once(landing, 'listening')]);
  appURL = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (app.address()).port}`;
  landingURL = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (landing.address()).port}`;
  links['https://app.namneundon.com'] = appURL;
  links['https://namneundon.com'] = landingURL;
});

test.afterAll(async () => {
  await Promise.all([app, landing].map((server) => new Promise((done) => server.close(done))));
});

test('인터넷 차단 · 새 브라우저에서 소개 → 앱 · 예시 계산', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: appURL, serviceWorkers: 'block' });
  const external = [];
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if ([appURL, landingURL].includes(url.origin)) return route.continue();
    external.push(url.href);
    return route.abort();
  });
  try {
    const page = await context.newPage();
    await page.goto(landingURL);
    const link = page.locator(`a[href="${appURL}"]`).first();
    await expect(link).toBeVisible();
    // 소개 페이지의 실제 링크를 현재 창에서 열어 연결까지 확인한다.
    await link.evaluate((a) => a.removeAttribute('target'));
    await link.click();
    await expect(page).toHaveURL(appURL + '/');
    const errors = await openApp(page);
    await page.getByRole('button', { name: '예시 먼저 보기' }).click();
    await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
    const numbers = JSON.parse(
      await readFile(new URL('./snapshots/demo.spec.mjs/numbers.json', import.meta.url), 'utf8')
    );
    expect(await collectNumbers(page)).toEqual(numbers);
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    expect(await page.locator(`a[href="${landingURL}"]`).count()).toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});

test('공개 폴더 밖 경로 · 잘못된 URL · 업로드 차단', async () => {
  expect((await fetch(appURL + '/' + encodeURIComponent('../') + 'package.json')).status).toBe(403);
  expect((await fetch(appURL + '/%zz')).status).toBe(400);
  expect((await fetch(appURL, { method: 'POST', body: 'sample' })).status).toBe(405);
  const head = await fetch(appURL, { method: 'HEAD' });
  expect(head.status).toBe(200);
  expect(await head.text()).toBe('');
});

test('로컬 연결은 응답에서만 치환하고 배포 원본은 유지', async () => {
  const original = await readFile(new URL('../landing/index.html', import.meta.url), 'utf8');
  expect(original).toContain("APP_URL   = 'https://app.namneundon.com'");
  const served = await (await fetch(landingURL)).text();
  expect(served).toContain(`APP_URL   = '${appURL}'`);
  expect(await readFile(new URL('../landing/index.html', import.meta.url), 'utf8')).toBe(original);
});
