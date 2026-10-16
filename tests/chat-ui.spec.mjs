import { test, expect } from '@playwright/test';
import { openApp, collectNumbers } from './helpers.mjs';
const FAB = 'AI에게 결과 묻기';
async function openChatTest(page, enabled = true) {
  await openApp(page);
  if (enabled) await page.goto('/?ai=1');
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
}
// 결과 화면의 펼침 줄을 열어 [항목 바꾸기] 단추가 실제로 화면에 나오게 한다.
async function openRows(page) {
  const bigRows = page.locator('#up-result .bigrow');
  for (let i = 0; i < (await bigRows.count()); i++)
    await bigRows.nth(i).click({ position: { x: 8, y: 8 } });
  const sections = page.locator('#up-result .orow:not(.bigrow)');
  for (let i = 0; i < Math.min(await sections.count(), 4); i++) await sections.nth(i).click();
}
// 지금 화면에 보이는 금액 글자와 [항목 바꾸기] 단추 중 진입 단추와 겹치는 것
function overlapsAtScroll() {
  const fab = document.querySelector('.ai-fab').getBoundingClientRect();
  const vh = innerHeight;
  const hits = [];
  const hit = (r) =>
    r.width > 0 &&
    r.height > 0 &&
    r.bottom > 0 &&
    r.top < vh &&
    r.left < fab.right &&
    r.right > fab.left &&
    r.top < fab.bottom &&
    r.bottom > fab.top;
  const host = document.getElementById('up-result');
  host.querySelectorAll('.chbtn').forEach((b) => {
    if (b.checkVisibility() && hit(b.getBoundingClientRect()))
      hits.push('항목 바꾸기: ' + b.closest('.drow')?.textContent.slice(0, 30));
  });
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!/\d[\d,]*\s*(원|만)/.test(n.nodeValue) || !n.parentElement.checkVisibility()) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) if (hit(r)) hits.push('금액: ' + n.nodeValue.trim());
  }
  return hits;
}

test('기본 숨김, 결과 화면 밖에서는 단추 없음, 시험 켜기·끄기 저장', async ({ page }) => {
  await openChatTest(page, false);
  await expect(page.getByRole('button', { name: FAB })).toHaveCount(0);
  await page.goto('/?ai=1');
  // 시작 화면 — 결과 화면 밖
  await expect(page.getByRole('button', { name: FAB })).toBeHidden();
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.getByRole('button', { name: FAB })).toBeVisible();
  // 결과 화면 안에는 진입점이 우측 하단 하나뿐이다 (옛 단추 없음).
  await expect(page.getByRole('button', { name: 'AI에게 결과 물어보기' })).toHaveCount(0);
  await expect(page.locator('.ai-fab')).toHaveCount(1);
  // 「내 거래내역으로 확인하기」 — 예시에서는 시작 화면으로 간다. 결과 화면 밖
  await page.locator('#upopen').click();
  await expect(page.locator('#up-result')).toBeHidden();
  await expect(page.getByRole('button', { name: FAB })).toBeHidden();
  await page.goto('/?ai=0');
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.getByRole('button', { name: FAB })).toHaveCount(0);
});

for (const width of [360, 390]) {
  test(`진입 단추가 보이는 금액·항목 바꾸기와 겹치지 않음 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openChatTest(page);
    await openRows(page);
    await expect(page.locator('#up-result .chbtn').first()).toBeVisible();
    const fab = await page.locator('.ai-fab').boundingBox();
    // 안전 영역을 뺀 우측 하단에 있다.
    expect(fab.x + fab.width).toBeLessThanOrEqual(width - 16 + 0.5);
    expect(fab.y + fab.height).toBeLessThanOrEqual(844 - 16 + 0.5);
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const found = [];
    for (let y = 0; y <= total; y += 211) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      const at = await page.evaluate(() => scrollY);
      for (const h of await page.evaluate(overlapsAtScroll)) found.push(`y=${at} ${h}`);
    }
    // 맨 아래 — 결과 화면 끝 여백
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const atEnd = await page.evaluate(() => scrollY);
    for (const h of await page.evaluate(overlapsAtScroll)) found.push(`y=${atEnd} ${h}`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: test.info().outputPath(`fab-${width}.png`) });
    expect(found).toEqual([]);
  });
}

test('예시 질문은 칸만 채우고, 돌아가기·뒤로 가기는 전송·삭제 없이 닫음', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = [];
  await page.route('https://chat.namneundon.com/**', async (route) => {
    requests.push(route.request().method() + ' ' + route.request().url());
    await route.fulfill({ json: { answer: '설명', saved: false } });
  });
  await openChatTest(page);
  const before = await collectNumbers(page);
  await page.getByRole('button', { name: FAB }).click();
  const dialog = page.locator('#ai-chat');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    '질문과 선택한 기간의 업종·금액 요약을 남는돈 서버(Cloudflare)와 Cloudflare Workers AI로 보내 답변을 만듭니다.'
  );
  // 선택 동의 바로 아래 작은 글씨
  await expect(page.locator('#ai-chat .ai-share + .ai-note')).toHaveText(
    '동의하지 않아도 내용 없이 날짜별 사용 횟수만 집계됩니다.'
  );
  await expect(page.locator('#ai-chat .ai-chip')).toHaveText([
    '이번 달 결과를 설명해 줘',
    '차액과 통장 잔액은 왜 달라?',
    '아직 안 정한 돈은 뭐야?'
  ]);
  for (const chip of [
    '이번 달 결과를 설명해 줘',
    '차액과 통장 잔액은 왜 달라?',
    '아직 안 정한 돈은 뭐야?'
  ]) {
    await page.getByRole('button', { name: chip }).click();
    await expect(page.getByRole('textbox', { name: '질문' })).toHaveValue(chip);
  }
  await expect(page.locator('#ai-chat input[type=checkbox]')).not.toBeChecked();
  expect(requests).toEqual([]);
  // 「결과로 돌아가기」
  await page.getByRole('button', { name: '결과로 돌아가기' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: FAB })).toBeVisible();
  // 휴대폰 뒤로 가기
  await page.getByRole('button', { name: FAB }).click();
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: '아직 안 정한 돈은 뭐야?' }).click();
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: FAB })).toBeVisible();
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('fc.ai.usage'))).toBeNull();
  expect(await collectNumbers(page)).toEqual(before);
});

test('키보드가 열린 높이 390×500에서도 질문 칸·전송·돌아가기가 화면 안', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await openChatTest(page);
  await page.getByRole('button', { name: FAB }).click();
  await page.getByRole('button', { name: '전송할 내용 보기' }).click();
  for (const target of [
    page.getByRole('textbox', { name: '질문' }),
    page.getByRole('button', { name: '동의하고 질문 보내기' }),
    page.getByRole('button', { name: '결과로 돌아가기' })
  ]) {
    const box = await target.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(500);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: test.info().outputPath('chat-390x500.png') });
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
    await page.getByRole('button', { name: FAB }).click();
    await page.getByRole('button', { name: '전송할 내용 보기' }).click();
    expect(requests).toEqual([]);
    await expect(page.locator('#ai-chat input[type=checkbox]')).not.toBeChecked();
    const box = await page.locator('#ai-chat').boundingBox();
    // 휴대폰은 전체 화면, 넓은 화면은 가운데 창
    if (width <= 520) expect(box).toEqual({ x: 0, y: 0, width, height: 844 });
    else expect(box.width).toBeLessThanOrEqual(560);
    const expected = await page.evaluate(() => chatSummary());
    const names = await page.evaluate(() => UP.payees.map((p) => p.name));
    // 예시 거래처 「식자재」처럼 고정 항목 이름과 똑같은 거래처 이름은 요약의 항목명과 구분할 수 없어 뺀다.
    // 목록은 앱이 요약에 쓰는 CHAT_LABELS 그대로다. 나머지 거래처 이름은 계속 검사한다.
    const labels = await page.evaluate(() => CHAT_LABELS);
    const skipped = names.filter((n) => labels.includes(n));
    console.log(`[chat-ui ${width}] 고정 항목과 같아 뺀 거래처 이름: ${JSON.stringify(skipped)}`);
    const checked = names.filter((n) => !labels.includes(n));
    const serialized = JSON.stringify(expected);
    expect(checked.filter((n) => n.length > 2 && serialized.includes(n))).toEqual([]);
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

for (const width of [360, 390, 1280]) {
  test(`서버 꺼짐에도 기존 숫자 유지, 전송 실패 안내 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('https://chat.namneundon.com/**', (route) => route.abort());
    await openChatTest(page);
    const before = await collectNumbers(page);
    await page.getByRole('button', { name: FAB }).click();
    await page.getByRole('textbox', { name: '질문' }).fill('왜 그런가요?');
    await page.getByRole('button', { name: '동의하고 질문 보내기' }).click();
    await expect(page.locator('.ai-status')).toContainText('기존 분석 화면은 계속');
    await page.getByRole('button', { name: '결과로 돌아가기' }).click();
    await expect(page.locator('#ai-chat')).toHaveCount(0);
    expect(await collectNumbers(page)).toEqual(before);
  });
}
