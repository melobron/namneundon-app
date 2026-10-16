import { test, expect } from '@playwright/test';
import { openApp, collectNumbers } from './helpers.mjs';
const GO = 'AI에게 결과 묻기';
// 시험용 가짜 키. 실제 TESTER_KEY 는 저장소에 두지 않는다.
const KEY = 'ui-test-key-0123456789';
async function openChatTest(page, url = '/?aikey=' + KEY) {
  await openApp(page);
  if (url) await page.goto(url);
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
// 지금 보이는 금액 글자 · [항목 바꾸기] 단추 중 띠와 겹치는 것.
// 결과 칸(body) 밖으로 잘린 부분은 보이지 않으므로 칸 안에 보이는 부분만 잰다.
function bandCovers() {
  const band = document.querySelector('.ai-band').getBoundingClientRect();
  const view = document.body.getBoundingClientRect();
  const hits = [];
  const covered = (r) => {
    const top = Math.max(r.top, view.top, 0);
    const bottom = Math.min(r.bottom, view.bottom, innerHeight);
    const left = Math.max(r.left, view.left);
    const right = Math.min(r.right, view.right);
    return (
      bottom > top &&
      right > left &&
      left < band.right &&
      right > band.left &&
      top < band.bottom &&
      bottom > band.top
    );
  };
  const host = document.getElementById('up-result');
  host.querySelectorAll('.chbtn').forEach((b) => {
    if (b.checkVisibility() && covered(b.getBoundingClientRect()))
      hits.push('항목 바꾸기: ' + b.closest('.drow')?.textContent.slice(0, 30));
  });
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!/\d[\d,]*\s*(원|만)/.test(n.nodeValue) || !n.parentElement.checkVisibility()) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects())
      if (covered(r)) hits.push('금액: ' + n.nodeValue.trim());
  }
  return { hits, viewBottom: view.bottom, bandTop: band.top };
}
const won = (v) => v.toLocaleString('ko-KR').replace('-', '−') + '원';
const pct = (v) => (v === null ? '확인 보류' : (v * 100).toFixed(1) + '%');
const monthName = (m) => `${m.slice(0, 4)}년 ${Number(m.slice(5, 7))}월`;
// 보낸 요약 한 달이 표에 어떻게 보여야 하는지 — 값은 그대로, 글자만 바꾼다
function expectedMonth(m, label) {
  return {
    sum: [
      [label, monthName(m.month)],
      ['전체 자료의 마지막 거래일', `${monthName(m.dataEnd)} ${Number(m.dataEnd.slice(8, 10))}일`],
      ['전체 기간 확보 여부', m.complete ? '확인됨' : '전체 기간 확보 미확인'],
      ['사업으로 번 돈', won(m.earned)],
      ['사업에 쓴 돈', won(m.spent)],
      ['차액', won(m.difference)],
      ['매출', won(m.sales)],
      ['그 밖의 입금', won(m.otherIncome)],
      ['아직 안 정한 돈', won(m.unknown)]
    ],
    cats: m.categories.length
      ? m.categories.map((c) => [c.label, won(c.amount), pct(c.ratio)])
      : [['보내는 항목 없음']],
    ratio: [[m.ratioLabel, pct(m.materialRatio)]]
  };
}
function readMonth(box) {
  const rows = (t) => [...t.rows].map((r) => [...r.cells].map((c) => c.textContent));
  const sums = box.querySelectorAll(':scope > table.ai-sum');
  return {
    sum: rows(sums[0]),
    cats: rows(box.querySelector(':scope > table.ai-cats')).slice(1),
    ratio: rows(sums[1])
  };
}

test('키 없음·?ai=1 만으로는 띠 없음, ?aikey 로 켜지고 주소창에서 키가 사라짐, ?ai=0 은 키도 지움', async ({
  page
}) => {
  await openChatTest(page, null);
  await expect(page.locator('.ai-band')).toHaveCount(0);
  await openChatTest(page, '/?ai=1');
  await expect(page.locator('.ai-band')).toHaveCount(0);
  await page.goto('/?aikey=' + KEY);
  expect(page.url()).not.toContain('aikey');
  expect(page.url()).not.toContain(KEY);
  expect(await page.evaluate(() => location.search)).toBe('');
  // 시작 화면 — 결과 화면 밖
  await expect(page.getByRole('button', { name: GO })).toBeHidden();
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.getByRole('button', { name: GO })).toBeVisible();
  // 진입점은 띠 하나뿐, 결과 화면 안의 옛 단추 없음
  await expect(page.getByRole('button', { name: GO })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'AI에게 결과 물어보기' })).toHaveCount(0);
  // 다른 화면으로 가면 결과와 함께 감춰진다
  await page.locator('#upopen').click();
  await expect(page.locator('#up-result')).toBeHidden();
  await expect(page.getByRole('button', { name: GO })).toBeHidden();
  // 다시 열어도 저장된 키로 켜진다
  await page.goto('/');
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.getByRole('button', { name: GO })).toBeVisible();
  await page.goto('/?ai=0');
  expect(
    await page.evaluate(() => [
      localStorage.getItem('fc.ai.tester'),
      localStorage.getItem('fc.ai.enabled')
    ])
  ).toEqual([null, null]);
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.locator('.ai-band')).toHaveCount(0);
});

for (const [width, height] of [
  [360, 844],
  [390, 844],
  [390, 500]
]) {
  test(`띠는 결과의 금액·항목 바꾸기를 덮지 않고, 마지막 줄까지 띠 위로 보이고 누를 수 있음 ${width}×${height}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height });
    await openChatTest(page);
    await openRows(page);
    await expect(page.locator('#up-result .chbtn').first()).toBeVisible();
    const band = await page.locator('.ai-band').boundingBox();
    expect(band).toMatchObject({ x: 0, width });
    expect(band.y + band.height).toBe(height);
    // 가로 넘침 없음
    expect(
      await page.evaluate(() => [
        document.body.scrollWidth <= document.body.clientWidth,
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      ])
    ).toEqual([true, true]);
    const total = await page.evaluate(() => document.body.scrollHeight);
    expect(total).toBeGreaterThan(height * 2);
    const found = [];
    for (let y = 0; y <= total; y += 97) {
      await page.evaluate((top) => (document.body.scrollTop = top), y);
      const r = await page.evaluate(bandCovers);
      // 결과가 보이는 칸이 띠 위에서 끝난다
      expect(r.viewBottom).toBeLessThanOrEqual(r.bandTop + 0.5);
      for (const h of r.hits) found.push(`y=${y} ${h}`);
    }
    expect(found).toEqual([]);
    // 맨 아래까지 — 마지막 줄이 띠 위로 완전히 보이고 누를 수 있다
    await page.evaluate(() => (document.body.scrollTop = document.body.scrollHeight));
    const end = await page.evaluate(() => {
      const band = document.querySelector('.ai-band').getBoundingClientRect();
      const host = document.getElementById('up-result');
      const last = [...host.children].filter((e) => !e.classList.contains('ai-band')).pop();
      const buttons = [...host.querySelectorAll('button')].filter(
        (b) => !b.closest('.ai-band') && b.checkVisibility()
      );
      const lastButton = buttons[buttons.length - 1];
      const br = lastButton.getBoundingClientRect();
      const hit = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
      return {
        lastBottom: last.getBoundingClientRect().bottom,
        stampBottom: document.getElementById('buildstamp').getBoundingClientRect().bottom,
        buttonTop: br.top,
        buttonBottom: br.bottom,
        reachable: lastButton === hit || lastButton.contains(hit),
        bandTop: band.top,
        label: lastButton.textContent
      };
    });
    expect(end.lastBottom).toBeLessThanOrEqual(end.bandTop);
    expect(end.stampBottom).toBeLessThanOrEqual(end.bandTop);
    expect(end.buttonTop).toBeGreaterThanOrEqual(0);
    expect(end.buttonBottom).toBeLessThanOrEqual(end.bandTop);
    expect(end.reachable, end.label).toBe(true);
    await page.locator('#up-result button:not(.ai-band-go):visible').last().click({ trial: true });
    if (height === 844) {
      await page.evaluate(() => (document.body.scrollTop = 0));
      await page.screenshot({ path: test.info().outputPath(`band-${width}.png`) });
    }
  });
}

test('결과를 다시 그려도 띠가 있는 결과 칸의 스크롤 자리를 지킴', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openChatTest(page);
  await page.evaluate(() => (document.body.scrollTop = 600));
  await page.evaluate(() => drawResult(monthList()));
  expect(await page.evaluate(() => document.body.scrollTop)).toBe(600);
});

test('예시 질문은 칸만 채우고, 질문 창이 열리면 띠를 감추고, 돌아가기·뒤로 가기는 전송·삭제 없이 닫음', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = [];
  await page.route('https://chat.namneundon.com/**', async (route) => {
    requests.push(route.request().method() + ' ' + route.request().url());
    await route.fulfill({ json: { answer: '설명', saved: false } });
  });
  await openChatTest(page);
  const before = await collectNumbers(page);
  await page.getByRole('button', { name: GO }).click();
  const dialog = page.locator('#ai-chat');
  await expect(dialog).toBeVisible();
  await expect(page.locator('.ai-band')).toBeHidden();
  await expect(dialog.getByRole('heading')).toHaveText(GO);
  await expect(dialog).toContainText(
    '질문과 선택한 기간의 업종·금액 요약을 남는돈 서버(Cloudflare)와 Cloudflare Workers AI로 보내 답변을 만듭니다.'
  );
  // 선택 동의 바로 아래 작은 글씨
  await expect(page.locator('#ai-chat .ai-share + .ai-note')).toHaveText(
    '동의하지 않아도 내용 없이 날짜별 사용 횟수만 집계됩니다.'
  );
  // 앱 단추 모양: 주 행동은 「동의하고 질문 보내기」 하나
  expect(await dialog.locator('button.b.on').allTextContents()).toEqual(['동의하고 질문 보내기']);
  for (const name of ['결과로 돌아가기', '전송할 내용 보기'])
    await expect(dialog.getByRole('button', { name })).toHaveClass(/(^|\s)b(\s|$)/);
  const chips = [
    '이번 달 결과를 설명해 줘',
    '차액과 통장 잔액은 왜 달라?',
    '아직 안 정한 돈은 뭐야?'
  ];
  await expect(page.locator('#ai-chat .ai-chip')).toHaveText(chips);
  for (const chip of chips) {
    await page.getByRole('button', { name: chip }).click();
    await expect(page.getByRole('textbox', { name: '질문' })).toHaveValue(chip);
  }
  await expect(page.locator('#ai-chat input[type=checkbox]')).not.toBeChecked();
  expect(requests).toEqual([]);
  // 「결과로 돌아가기」
  await page.getByRole('button', { name: '결과로 돌아가기' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: GO })).toBeVisible();
  // 휴대폰 뒤로 가기
  await page.getByRole('button', { name: GO }).click();
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: '아직 안 정한 돈은 뭐야?' }).click();
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: GO })).toBeVisible();
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('fc.ai.usage'))).toBeNull();
  expect(await collectNumbers(page)).toEqual(before);
});

test('키보드가 열린 높이 390×500: 칩은 줄을 바꿔 감싸고, 질문 칸·전송·돌아가기가 화면 안, 가로 넘침 없음', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await openChatTest(page);
  await page.getByRole('button', { name: GO }).click();
  await page.getByRole('button', { name: '전송할 내용 보기' }).click();
  const chipTops = await page
    .locator('#ai-chat .ai-chip')
    .evaluateAll((cs) => [...new Set(cs.map((c) => Math.round(c.getBoundingClientRect().top)))]);
  expect(chipTops.length).toBeGreaterThanOrEqual(2);
  expect(
    await page
      .locator('#ai-chat')
      .evaluate((d) => [
        d.scrollWidth <= d.clientWidth,
        d.querySelector('.ai-chips').scrollWidth <= d.querySelector('.ai-chips').clientWidth,
        d.querySelector('.ai-body').scrollWidth <= d.querySelector('.ai-body').clientWidth
      ])
  ).toEqual([true, true, true]);
  const box = page.getByRole('textbox', { name: '질문' });
  await box.click();
  await page.keyboard.type('차액이 뭔가요?');
  await expect(box).toHaveValue('차액이 뭔가요?');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '동의하고 질문 보내기' })).toBeFocused();
  for (const target of [
    box,
    page.getByRole('button', { name: '동의하고 질문 보내기' }),
    page.getByRole('button', { name: '결과로 돌아가기' })
  ]) {
    const b = await target.boundingBox();
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height).toBeLessThanOrEqual(500);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: test.info().outputPath('chat-390x500.png') });
});

test('전송할 내용 표: 보낸 요약 객체 값을 그대로 한글 표로, 확인 보류·전체 기간 확보 미확인 표기', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = [];
  await page.route('https://chat.namneundon.com/**', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: { answer: '설명', saved: false } });
  });
  await openChatTest(page);
  await page.getByRole('button', { name: GO }).click();
  await page.getByRole('button', { name: '전송할 내용 보기' }).click();
  const preview = page.locator('#ai-chat .ai-preview');
  await expect(preview).toBeVisible();
  await page.getByRole('textbox', { name: '질문' }).fill('설명해 주세요');
  await page.getByRole('button', { name: '동의하고 질문 보내기' }).click();
  await expect(page.locator('.ai-answer')).toHaveText('설명');
  const sent = requests[0].summary;
  // ① 업종
  expect(
    await preview
      .locator(':scope > table.ai-sum')
      .first()
      .evaluate((t) =>
        [.../** @type {HTMLTableElement} */ (t).rows].map((r) =>
          [...r.cells].map((c) => c.textContent)
        )
      )
  ).toEqual([['업종', sent.industry]]);
  // ②~⑤ 선택한 달
  expect(await preview.locator(':scope > .ai-month').evaluate(readMonth)).toEqual(
    expectedMonth(sent.current, '선택한 달')
  );
  // 예시의 8월은 22일까지라 완결로 단정하지 않는다
  expect(sent.current.complete).toBe(false);
  await expect(preview).toContainText('전체 기간 확보 미확인');
  await expect(preview).not.toContainText('진행 중');
  expect(await preview.innerText()).not.toMatch(/\d+일?\s*[~～]\s*\d+일/);
  // ⑥ 이전 달 — 달 이름으로 접고, 펼치면 전송 항목 전부
  const folds = preview.locator('details');
  await expect(folds).toHaveCount(sent.previous.length);
  expect(sent.previous.length).toBeGreaterThan(0);
  for (let i = 0; i < sent.previous.length; i++) {
    const m = sent.previous[i];
    await expect(folds.nth(i).locator('summary')).toHaveText(monthName(m.month));
    await folds.nth(i).locator('summary').click();
    expect(await folds.nth(i).locator('.ai-month').evaluate(readMonth)).toEqual(
      expectedMonth(m, '달')
    );
  }
  await expect(preview.locator('.ai-note')).toHaveText('비율은 보기 쉽게 반올림했습니다.');
  // 계산 못 한 비율은 0% 가 아니라 확인 보류
  const nullBox = await page.evaluateHandle((s) => {
    const m = {
      ...s.current,
      materialRatio: null,
      categories: [{ label: '보험', amount: 1234567, ratio: null }]
    };
    return chatPreview({ ...s, current: m, previous: [] }).querySelector('.ai-month');
  }, sent);
  const nullCase = await nullBox.evaluate(readMonth);
  expect(nullCase.cats).toEqual([['보험', '1,234,567원', '확인 보류']]);
  expect(nullCase.ratio[0][1]).toBe('확인 보류');
  // 스크린샷: 표 맨 위, 펼친 이전 달
  await preview.evaluate((p) => p.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: test.info().outputPath('preview-390.png') });
  await folds.first().evaluate((d) => d.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: test.info().outputPath('preview-prev-390.png') });
});

for (const width of [360, 390, 1280]) {
  test(`동의 전 통신 없음·허용 요약만 전송·시험자 키는 헤더로만·창 배치 ${width}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const logs = [];
    page.on('console', (m) => logs.push(m.text()));
    const requests = [];
    await page.route('https://chat.namneundon.com/**', async (route) => {
      requests.push({ body: route.request().postDataJSON(), headers: route.request().headers() });
      await route.fulfill({
        json: { answer: '<script>실행하지 않음</script> 설명', saved: false }
      });
    });
    await openChatTest(page);
    await page.getByRole('button', { name: GO }).click();
    await page.getByRole('button', { name: '전송할 내용 보기' }).click();
    expect(requests).toEqual([]);
    await expect(page.locator('#ai-chat input[type=checkbox]')).not.toBeChecked();
    const box = await page.locator('#ai-chat').boundingBox();
    // 휴대폰은 전체 화면, 넓은 화면은 가운데 창
    if (width <= 520) expect(box).toEqual({ x: 0, y: 0, width, height: 844 });
    else {
      expect(box.width).toBeLessThanOrEqual(560);
      // 넓은 화면은 가운데 창
      expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.y + box.height / 2 - 844 / 2)).toBeLessThanOrEqual(1);
    }
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
    expect(requests[0].body.summary).toEqual(expected);
    expect(requests[0].body.share).toBe(false);
    expect(requests[0].headers['x-namneundon-tester']).toBe(KEY);
    // 키는 전송 본문·화면·로그에 나오지 않는다
    expect(JSON.stringify(requests[0].body)).not.toContain(KEY);
    expect(await page.locator('body').innerText()).not.toContain(KEY);
    expect(logs.join('\n')).not.toContain(KEY);
    expect(await page.locator('#ai-chat').evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(
      true
    );
    await page.screenshot({ path: test.info().outputPath(`chat-${width}.png`) });
  });
}

test('서버가 시험자 키를 거절하면 안내만, 기존 숫자 유지', async ({ page }) => {
  await page.route('https://chat.namneundon.com/**', (route) =>
    route.fulfill({ status: 403, json: { error: 'tester_only' } })
  );
  await openChatTest(page);
  const before = await collectNumbers(page);
  await page.getByRole('button', { name: GO }).click();
  await page.getByRole('textbox', { name: '질문' }).fill('왜 그런가요?');
  await page.getByRole('button', { name: '동의하고 질문 보내기' }).click();
  await expect(page.locator('.ai-status')).toContainText('시험 키로는 질문할 수 없습니다');
  await expect(page.locator('.ai-answer')).toHaveText('');
  expect(await collectNumbers(page)).toEqual(before);
});

for (const width of [360, 390, 1280]) {
  test(`서버 꺼짐에도 기존 숫자 유지, 전송 실패 안내 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('https://chat.namneundon.com/**', (route) => route.abort());
    await openChatTest(page);
    const before = await collectNumbers(page);
    await page.getByRole('button', { name: GO }).click();
    await page.getByRole('textbox', { name: '질문' }).fill('왜 그런가요?');
    await page.getByRole('button', { name: '동의하고 질문 보내기' }).click();
    await expect(page.locator('.ai-status')).toContainText('기존 분석 화면은 계속');
    await page.getByRole('button', { name: '결과로 돌아가기' }).click();
    await expect(page.locator('#ai-chat')).toHaveCount(0);
    expect(await collectNumbers(page)).toEqual(before);
  });
}
