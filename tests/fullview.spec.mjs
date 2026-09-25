import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';

const viewNames = ['한 달', '1년'];
const viewports = [390, 1024];

async function readPng(page) {
  return page.evaluate(async () => {
    const image = document.querySelector('.imgprevimg');
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = { green: 0, red: 0, panel: 0, line: 0 };
    for (let i = 0; i < pixels.length; i += 4) {
      const color = `${pixels[i].toString(16).padStart(2, '0')}${pixels[i + 1]
        .toString(16)
        .padStart(2, '0')}${pixels[i + 2].toString(16).padStart(2, '0')}`;
      if (color === '2c8055') colors.green++;
      if (color === 'c4443e') colors.red++;
      if (color === 'f6f2ee') colors.panel++;
      if (color === 'e7dfd7') colors.line++;
    }
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      colors
    };
  });
}

test('전체보기 PNG에 앱 CSS가 적용된다', async ({ page }) => {
  const errors = await openApp(page);
  const failed = [];
  page.on('requestfailed', (request) => failed.push(request.url()));

  for (const width of viewports) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.locator('#splash').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '예시 먼저 보기' }).click();
    await page.getByRole('button', { name: '1년' }).waitFor();

    for (const viewName of viewNames) {
      await page.getByRole('button', { name: viewName }).click();
      await page.getByRole('button', { name: '전체보기' }).click();
      await page.locator('.imgprevimg').waitFor({ state: 'visible' });

      const png = await readPng(page);
      expect(png.width).toBeGreaterThan(0);
      expect(png.height).toBeGreaterThan(0);
      expect(png.colors.green).toBeGreaterThan(0);
      expect(png.colors.red).toBeGreaterThan(0);
      expect(png.colors.panel).toBeGreaterThan(0);
      expect(png.colors.line).toBeGreaterThan(0);

      await page.getByRole('button', { name: '닫기' }).click();
    }
  }

  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});