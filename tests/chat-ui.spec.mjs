import { test, expect } from '@playwright/test';
import { openApp, collectNumbers } from './helpers.mjs';
async function openChatTest(page, enabled = true) {
  await openApp(page);
  if (enabled) await page.goto('/?ai=1');
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
}
test('기본 숨김, 시험 켜기·끄기 저장', async ({ page }) => {
  await openChatTest(page, false);
  await expect(page.getByRole('button', { name: 'AI에게 결과 물어보기' })).toHaveCount(0);
  await page.goto('/?ai=1');
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.getByRole('button', { name: 'AI에게 결과 물어보기' })).toBeVisible();
  await page.goto('/?ai=0');
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.getByRole('button', { name: 'AI에게 결과 물어보기' })).toHaveCount(0);
});
for (const width of [360, 390, 1280]) {
  test(`동의 전 통신 없음·허용 요약만 전송·창 배치 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const requests = [];
    await page.route('https://chat.namneundon.com/**', async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({
        json: { answer: '<script>실행하지 않음</script> 설명', saved: false }
      });
    });
    await openChatTest(page);
    await page.getByRole('button', { name: 'AI에게 결과 물어보기' }).click();
    await page.getByRole('button', { name: '전송할 내용 보기' }).click();
    expect(requests).toEqual([]);
    await expect(page.locator('#ai-chat input[type=checkbox]')).not.toBeChecked();
    const expected = await page.evaluate(() => chatSummary());
    const names = await page.evaluate(() => UP.payees.map((p) => p.name));
    const serialized = JSON.stringify(expected);
    expect(names.filter((n) => n.length > 2 && serialized.includes(n))).toEqual([]);
    await page.getByRole('textbox', { name: '질문' }).fill('이 뜻은 무엇인가요?');
    await page.getByRole('button', { name: '동의하고 질문 보내기' }).click();
    await expect(page.locator('.ai-answer')).toContainText('<script>');
    expect(requests[0].summary).toEqual(expected);
    expect(requests[0].share).toBe(false);
    expect(await page.locator('#ai-chat').evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(
      true
    );
    await page.screenshot({ path: test.info().outputPath(`chat-${width}.png`), fullPage: true });
  });
}
test('서버 꺼짐에도 기존 숫자 유지, 전송 실패 안내', async ({ page }) => {
  await page.route('https://chat.namneundon.com/**', (route) => route.abort());
  await openChatTest(page);
  const before = await collectNumbers(page);
  await page.getByRole('button', { name: 'AI에게 결과 물어보기' }).click();
  await page.getByRole('textbox', { name: '질문' }).fill('왜 그런가요?');
  await page.getByRole('button', { name: '동의하고 질문 보내기' }).click();
  await expect(page.locator('.ai-status')).toContainText('기존 분석 화면은 계속');
  await page.getByRole('button', { name: '취소', exact: true }).click();
  expect(await collectNumbers(page)).toEqual(before);
});
