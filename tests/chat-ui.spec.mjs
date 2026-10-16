import { test, expect } from '@playwright/test';
import { openApp, collectNumbers } from './helpers.mjs';
const GO = 'AI에게 결과 묻기';
// 시험용 가짜 키. 실제 TESTER_KEY 는 저장소에 두지 않는다.
const KEY = 'fake1screen1test1key';
const WELCOME = '보고 계신 결과에서 궁금한 점을 물어보세요.';
const CHIPS = [
  '이번 달 결과를 설명해 줘',
  '차액과 통장 잔액은 왜 달라?',
  '아직 안 정한 돈은 뭐야?'
];
const FINE = 'AI 답변은 틀릴 수 있습니다. 질문에 계좌번호·연락처 같은 개인정보는 적지 마세요.';
const CONSENT =
  '질문과 선택한 기간·비교 기간의 업종·금액 요약을 남는돈 서버(Cloudflare)와 Cloudflare Workers AI로 보내 답변을 만듭니다. 원본 파일·개별 거래내역·거래처 이름은 자동으로 보내지 않습니다.';
const SENT_LINE = 'Cloudflare로 요약 전송 · 보낼 내용 보기';
const KEEP = '결과 화면은 계속 사용할 수 있습니다.';
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
// 결과의 금액 글자 · [항목 바꾸기] 단추 하나하나를 화면 가운데로 스크롤했을 때
// 아이콘에 가리지 않고 화면 안에 보이며, 그 자리를 누르면 그것이 눌리는지 잰다.
// 어느 위치에서도 아이콘이 가리는 것(고정 단추가 계속 가리는 것)이 있으면 여기서 걸린다.
function coverage() {
  const fab = document.querySelector('.ai-fab').getBoundingClientRect();
  const under = (r) =>
    r.left < fab.right && r.right > fab.left && r.top < fab.bottom && r.bottom > fab.top;
  const host = document.getElementById('up-result');
  const targets = [];
  host.querySelectorAll('.chbtn').forEach((b) => {
    if (b.checkVisibility()) targets.push({ el: b, rects: () => [b.getBoundingClientRect()] });
  });
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    // 금액: 쉼표 묶음 숫자(13,270,935) 또는 「원」·「만」이 붙은 숫자
    if (!/\d{1,3}(,\d{3})+|\d\s*(원|만)/.test(n.nodeValue) || !n.parentElement.checkVisibility())
      continue;
    const node = n;
    targets.push({
      el: n.parentElement,
      rects: () => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return [...range.getClientRects()].filter((r) => r.width && r.height);
      }
    });
  }
  const bad = [];
  for (const t of targets) {
    t.el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rects = t.rects();
    if (!rects.length) continue;
    const label = t.el.textContent.trim().slice(0, 30);
    if (rects.some(under)) bad.push('가림: ' + label);
    if (rects.some((r) => r.top < 0 || r.bottom > innerHeight)) bad.push('화면 밖: ' + label);
    const r = rects[0];
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    // 그 자리를 누르면 아이콘이 아니라 결과가 눌려야 한다 (그래프 글자는 그래프 자체의 누름 판이 위에 있다)
    if (hit?.closest('.ai-fab')) bad.push('아이콘이 받음: ' + label);
  }
  return { count: targets.length, bad };
}
// 맨 아래까지 내렸을 때 화면에 보이는 글자·단추·링크 중 아이콘에 가리는 것
function coveredAtEnd() {
  window.scrollTo(0, document.documentElement.scrollHeight);
  const fab = document.querySelector('.ai-fab').getBoundingClientRect();
  const under = (r) =>
    r.width &&
    r.height &&
    r.left < fab.right &&
    r.right > fab.left &&
    r.top < fab.bottom &&
    r.bottom > fab.top;
  const bad = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim() || n.parentElement.closest('.ai-fab, #splash')) continue;
    if (!n.parentElement.checkVisibility()) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    if ([...range.getClientRects()].some(under)) bad.push(n.nodeValue.trim().slice(0, 30));
  }
  document.querySelectorAll('body button, body a, body img, body svg').forEach((e) => {
    if (e.closest('.ai-fab') || !e.checkVisibility()) return;
    if (under(e.getBoundingClientRect()))
      bad.push(e.tagName + ' ' + e.textContent.trim().slice(0, 20));
  });
  const stamp = document.getElementById('buildstamp').getBoundingClientRect();
  return { bad, stampBottom: stamp.bottom, fabTop: fab.top, scrollY: window.scrollY };
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
// 표 전체가 보낸 요약 객체와 같은지 — 업종 · 선택한 달 · 이전 달(펼쳐서) · 반올림 안내
async function expectTableIs(page, preview, sent) {
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
  expect(await preview.locator(':scope > .ai-month').evaluate(readMonth)).toEqual(
    expectedMonth(sent.current, '선택한 달')
  );
  const folds = preview.locator('details');
  await expect(folds).toHaveCount(sent.previous.length);
  for (let i = 0; i < sent.previous.length; i++) {
    await expect(folds.nth(i).locator('summary')).toHaveText(monthName(sent.previous[i].month));
    await folds.nth(i).locator('summary').click();
    expect(await folds.nth(i).locator('.ai-month').evaluate(readMonth)).toEqual(
      expectedMonth(sent.previous[i], '달')
    );
  }
  await expect(preview.locator(':scope > .ai-note')).toHaveText('비율은 보기 쉽게 반올림했습니다.');
}
// 서버 대신 답한다. 요청 본문·헤더를 모은다.
async function fakeServer(page, answer = '<script>실행하지 않음</script> 설명', status = 200) {
  const requests = [];
  await page.route('https://chat.namneundon.com/**', async (route) => {
    requests.push({
      method: route.request().method(),
      body: route.request().postDataJSON(),
      headers: route.request().headers()
    });
    await route.fulfill(
      status === 200
        ? { json: { answer, saved: false } }
        : { status, json: { error: 'x', nextAvailable: '2026-09-24T00:00:00.000Z' } }
    );
  });
  return requests;
}
const chat = (page) => page.locator('#ai-chat');
const lastBot = (page) => page.locator('#ai-chat .ai-log > .ai-bot').last();

test('키 없음·?ai=1 만으로는 아이콘 없음, ?aikey 로 켜지고 주소창에서 키가 사라짐, ?ai=0 은 키도 지움', async ({
  page
}) => {
  await openChatTest(page, null);
  await expect(page.locator('.ai-fab')).toHaveCount(0);
  // 시험 키 없는 일반 화면 — 아이콘 여백도 없다
  expect(await page.evaluate(() => getComputedStyle(document.body).paddingBottom)).toBe('0px');
  await openChatTest(page, '/?ai=1');
  await expect(page.locator('.ai-fab')).toHaveCount(0);
  await page.goto('/?aikey=' + KEY);
  expect(page.url()).not.toContain('aikey');
  expect(page.url()).not.toContain(KEY);
  expect(await page.evaluate(() => location.search)).toBe('');
  // 시작 화면 — 결과 화면 밖
  await expect(page.getByRole('button', { name: GO })).toBeHidden();
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.getByRole('button', { name: GO })).toBeVisible();
  await expect(page.getByRole('button', { name: GO })).toHaveCount(1);
  await expect(page.locator('.ai-band')).toHaveCount(0);
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
  await expect(page.locator('.ai-fab')).toHaveCount(0);
});

test('시험 키 형식이 영문 소문자·숫자가 아니면 저장·표시하지 않고 주소창에서도 지움', async ({
  page
}) => {
  for (const bad of ['Upper0123', 'with-dash0123', 'under_score1']) {
    await openApp(page);
    await page.goto('/?aikey=' + encodeURIComponent(bad));
    expect(page.url()).not.toContain('aikey');
    expect(await page.evaluate(() => localStorage.getItem('fc.ai.tester'))).toBeNull();
    await page.getByRole('button', { name: '예시 먼저 보기' }).click();
    await expect(page.locator('.ai-fab')).toHaveCount(0);
  }
});

for (const width of [360, 390]) {
  test(`아이콘은 모든 금액·항목 바꾸기를 가리지 않는 위치로 스크롤해 보고 누를 수 있고, 맨 아래 마지막 줄을 가리지 않음 ${width}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await openChatTest(page);
    const fab = page.getByRole('button', { name: GO });
    const box = await fab.boundingBox();
    // 휴대폰 48px, 화면 끝에서 16px (시험 브라우저는 안전 영역 0)
    expect(box).toEqual({ x: width - 16 - 48, y: 844 - 16 - 48, width: 48, height: 48 });
    expect(
      await fab
        .locator('img.ai-fab-mark')
        .evaluate((i) => /** @type {HTMLImageElement} */ (i).src.startsWith('data:image'))
    ).toBe(true);
    await expect(fab.locator('.ai-fab-tag')).toHaveText('AI');
    await openRows(page);
    // 맨 위 · 중간 · 맨 아래 화면
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: test.info().outputPath(`icon-${width}-top.png`) });
    await page.evaluate(() =>
      window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2)
    );
    await page.screenshot({ path: test.info().outputPath(`icon-${width}-mid.png`) });
    const end = await page.evaluate(coveredAtEnd);
    await page.screenshot({ path: test.info().outputPath(`icon-${width}-bottom.png`) });
    expect(end.scrollY).toBeGreaterThan(0);
    expect(end.bad).toEqual([]);
    expect(end.stampBottom).toBeLessThanOrEqual(end.fabTop);
    // 금액 · 항목 바꾸기 하나하나
    const r = await page.evaluate(coverage);
    expect(r.count).toBeGreaterThan(50);
    expect(r.bad).toEqual([]);
    // 실제 클릭: [항목 바꾸기]를 눌러 메뉴가 열리고, 다시 눌러 닫힌다
    const buttons = page.locator('#up-result .chbtn:visible');
    const n = await buttons.count();
    expect(n).toBeGreaterThan(5);
    const openMenus = () => page.locator('#up-result .menu:not([hidden])').count();
    for (let i = 0; i < n; i++) {
      const b = buttons.nth(i);
      await b.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      const bb = await b.boundingBox();
      const before = await openMenus();
      await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
      expect(await openMenus(), `열림 ${i}`).toBe(before + 1);
      await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
      expect(await openMenus(), `닫힘 ${i}`).toBe(before);
    }
  });
}

test('채팅 첫 화면: 남는돈 AI · 시험 중 · 닫기, 첫 말풍선과 예시 칩(입력만), 보내기, 작은 안내 — 닫기·뒤로 가기는 전송·삭제 없음', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await fakeServer(page);
  await openChatTest(page);
  const before = await collectNumbers(page);
  await page.getByRole('button', { name: GO }).click();
  const dialog = chat(page);
  await expect(dialog).toBeVisible();
  await expect(page.locator('.ai-fab')).toBeHidden();
  await expect(dialog.getByRole('heading')).toHaveText('남는돈 AI');
  await expect(dialog.locator('.ai-badge')).toHaveText('시험 중');
  await expect(dialog.getByRole('button', { name: '닫기' })).toBeVisible();
  // 첫 말풍선(봇)과 그 아래 칩
  await expect(dialog.locator('.ai-log > .ai-bot').first()).toHaveText(WELCOME);
  await expect(dialog.locator('.ai-log > .ai-chips .ai-chip')).toHaveText(CHIPS);
  // 맨 아래: 입력 칸 + 보내기 + 작은 안내
  await expect(dialog.getByRole('textbox', { name: '질문' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '보내기' })).toBeVisible();
  await expect(dialog.locator('.ai-fine')).toHaveText(FINE);
  await expect(dialog.locator('.ai-sent-line')).toBeHidden();
  await page.screenshot({ path: test.info().outputPath('chat-first-390.png') });
  // 대화 삭제는 맨 위 오른쪽 보조 메뉴 안
  await expect(dialog.getByRole('button', { name: '대화 삭제' })).toBeHidden();
  await dialog.getByRole('button', { name: '더보기' }).click();
  await expect(dialog.getByRole('button', { name: '대화 삭제' })).toBeVisible();
  await dialog.getByRole('button', { name: '더보기' }).click();
  await expect(dialog.getByRole('button', { name: '대화 삭제' })).toBeHidden();
  // 칩은 입력만
  for (const c of CHIPS) {
    await dialog.getByRole('button', { name: c }).click();
    await expect(dialog.getByRole('textbox', { name: '질문' })).toHaveValue(c);
  }
  expect(requests).toEqual([]);
  // 닫기
  await dialog.getByRole('button', { name: '닫기' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: GO })).toBeVisible();
  // 휴대폰 뒤로 가기
  await page.getByRole('button', { name: GO }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: CHIPS[2] }).click();
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: GO })).toBeVisible();
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('fc.ai.usage'))).toBeNull();
  expect(await collectNumbers(page)).toEqual(before);
});

test('첫 보내기는 안내 카드 — 동의 전 무전송, 보낼 내용 표 = 전송 객체, 취소, 동의하고 보내기, 그 뒤 전송 줄', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await fakeServer(page);
  await openChatTest(page);
  await page.getByRole('button', { name: GO }).click();
  const dialog = chat(page);
  const expected = await page.evaluate(() => chatSummary());
  const box = dialog.getByRole('textbox', { name: '질문' });
  await box.fill('이번 달 결과를 설명해 줘');
  await dialog.getByRole('button', { name: '보내기' }).click();
  const card = dialog.locator('.ai-consent');
  await expect(card).toBeVisible();
  expect(requests).toEqual([]);
  await expect(card.locator(':scope > p').first()).toHaveText(CONSENT);
  // 운영자 확인 동의: 기본 꺼짐, 앱 체크 상자 모양
  const share = card.locator('.ai-share input[type=checkbox]');
  await expect(share).not.toBeChecked();
  expect(
    await share.evaluate((c) => {
      const s = getComputedStyle(c);
      return [getComputedStyle(c.parentElement).display, s.accentColor, s.width, s.height];
    })
  ).toEqual(['flex', 'rgb(44, 128, 85)', '18px', '18px']);
  await expect(card.locator('.ai-share + .ai-note')).toHaveText(
    '동의하지 않아도 내용 없이 날짜별 사용 횟수만 집계됩니다.'
  );
  // 주 행동은 「동의하고 보내기」 하나
  expect(await card.locator('button.b.on').allTextContents()).toEqual(['동의하고 보내기']);
  await page.screenshot({ path: test.info().outputPath('consent-390.png') });
  // 보낼 내용 보기 — 접혀 있다가 펼치면 지금의 한글 표
  const preview = card.locator('.ai-preview');
  await expect(preview).toBeHidden();
  await card.getByRole('button', { name: '보낼 내용 보기' }).click();
  await expect(preview).toBeVisible();
  await expectTableIs(page, preview, expected);
  await expect(preview).toContainText('전체 기간 확보 미확인');
  await expect(preview).not.toContainText('진행 중');
  expect(await preview.innerText()).not.toMatch(/\d+일?\s*[~～]\s*\d+일/);
  await preview.evaluate((p) => p.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: test.info().outputPath('preview-390.png') });
  // 취소 — 보내지 않고 질문은 남는다
  await card.getByRole('button', { name: '취소' }).click();
  await expect(card).toHaveCount(0);
  await expect(box).toHaveValue('이번 달 결과를 설명해 줘');
  expect(requests).toEqual([]);
  // 다시 보내기 → 카드 → 동의하고 보내기
  await dialog.getByRole('button', { name: '보내기' }).click();
  await dialog.locator('.ai-consent').getByRole('button', { name: '동의하고 보내기' }).click();
  await expect(dialog.locator('.ai-answer')).toHaveText('<script>실행하지 않음</script> 설명');
  expect(requests).toHaveLength(1);
  expect(requests[0].body.summary).toEqual(expected);
  expect(requests[0].body.share).toBe(false);
  // 대표님 질문은 오른쪽, AI 답은 왼쪽 말풍선. 답은 글자로만
  const me = dialog.locator('.ai-me').last();
  const ans = dialog.locator('.ai-answer');
  await expect(me).toHaveText('이번 달 결과를 설명해 줘');
  const [mb, ab, lb] = await Promise.all([
    me.boundingBox(),
    ans.boundingBox(),
    dialog.locator('.ai-log').boundingBox()
  ]);
  expect(mb.x + mb.width).toBeGreaterThan(lb.x + lb.width - 20);
  expect(ab.x).toBeLessThan(lb.x + 20);
  expect(await dialog.locator('.ai-log script').count()).toBe(0);
  // 동의 뒤에는 입력 칸 위 한 줄, 누르면 같은 표
  const line = dialog.locator('.ai-sent-line');
  await expect(line).toHaveText(SENT_LINE);
  await line.click();
  const again = dialog.locator('.ai-log > .ai-card .ai-preview');
  await expect(again).toBeVisible();
  await expectTableIs(page, again, requests[0].body.summary);
  await line.click();
  await expect(again).toHaveCount(0);
  // 두 번째 질문은 카드 없이 바로
  await box.fill('차액과 통장 잔액은 왜 달라?');
  await dialog.getByRole('button', { name: '보내기' }).click();
  await expect(dialog.locator('.ai-answer')).toHaveCount(2);
  await expect(dialog.locator('.ai-consent')).toHaveCount(0);
  expect(requests).toHaveLength(2);
  expect(requests[1].body.summary).toEqual(expected);
  await page.screenshot({ path: test.info().outputPath('talk-390.png') });
});

test('계산 못 한 비율은 0% 가 아니라 확인 보류', async ({ page }) => {
  await openChatTest(page);
  const sent = await page.evaluate(() => chatSummary());
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
});

test('키보드가 열린 높이 390×500: 입력 칸·보내기·닫기가 화면 안, 칩은 줄 바꿈, 가로 넘침 없음', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await openChatTest(page);
  await page.getByRole('button', { name: GO }).click();
  const dialog = chat(page);
  const chipTops = await dialog
    .locator('.ai-chip')
    .evaluateAll((cs) => [...new Set(cs.map((c) => Math.round(c.getBoundingClientRect().top)))]);
  expect(chipTops.length).toBeGreaterThanOrEqual(2);
  expect(
    await dialog.evaluate((d) =>
      [
        d,
        d.querySelector('.ai-log'),
        d.querySelector('.ai-chips'),
        d.querySelector('.ai-foot')
      ].map((e) => e.scrollWidth <= e.clientWidth)
    )
  ).toEqual([true, true, true, true]);
  const box = dialog.getByRole('textbox', { name: '질문' });
  await box.click();
  await page.keyboard.type('차액이 뭔가요?');
  await expect(box).toHaveValue('차액이 뭔가요?');
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: '보내기' })).toBeFocused();
  for (const target of [
    box,
    dialog.getByRole('button', { name: '보내기' }),
    dialog.getByRole('button', { name: '닫기' })
  ]) {
    const b = await target.boundingBox();
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height).toBeLessThanOrEqual(500);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: test.info().outputPath('chat-390x500.png') });
});

for (const width of [360, 390, 1280]) {
  test(`창 배치·거래처 이름 미포함·시험자 키는 헤더로만 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const logs = [];
    page.on('console', (m) => logs.push(m.text()));
    const requests = await fakeServer(page);
    await openChatTest(page);
    const fab = await page.getByRole('button', { name: GO }).boundingBox();
    const size = width <= 520 ? 48 : 56;
    expect(fab).toEqual({ x: width - 16 - size, y: 844 - 16 - size, width: size, height: size });
    await page.getByRole('button', { name: GO }).click();
    // 올라오는 움직임이 끝난 뒤에 잰다
    await chat(page).evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)));
    const box = await chat(page).boundingBox();
    // 휴대폰은 전체 화면, PC 는 오른쪽 아래 380px 창
    if (width <= 520) expect(box).toEqual({ x: 0, y: 0, width, height: 844 });
    else {
      expect(box.width).toBe(380);
      expect(box.x + box.width).toBe(width - 16);
      expect(box.y + box.height).toBe(844 - 16);
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
    await chat(page).getByRole('textbox', { name: '질문' }).fill('이 뜻은 무엇인가요?');
    await chat(page).getByRole('button', { name: '보내기' }).click();
    expect(requests).toEqual([]);
    await chat(page).getByRole('button', { name: '동의하고 보내기' }).click();
    await expect(chat(page).locator('.ai-answer')).toContainText('<script>');
    expect(requests[0].body.summary).toEqual(expected);
    expect(requests[0].headers['x-namneundon-tester']).toBe(KEY);
    // 키는 전송 본문·화면·로그에 나오지 않는다
    expect(JSON.stringify(requests[0].body)).not.toContain(KEY);
    expect(await page.locator('body').innerText()).not.toContain(KEY);
    expect(logs.join('\n')).not.toContain(KEY);
    expect(await chat(page).evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`chat-${width}.png`) });
  });
}

for (const [status, text] of /** @type {[number, string][]} */ ([
  [403, '이 브라우저의 시험 키로는 질문할 수 없습니다. ' + KEEP],
  [429, '현재 무료 질문 한도에 도달했습니다.']
])) {
  test(`서버 ${status} 안내는 봇 말풍선으로, 결과 숫자 유지`, async ({ page }) => {
    await fakeServer(page, '', status);
    await openChatTest(page);
    const before = await collectNumbers(page);
    await page.getByRole('button', { name: GO }).click();
    await chat(page).getByRole('textbox', { name: '질문' }).fill('왜 그런가요?');
    await chat(page).getByRole('button', { name: '보내기' }).click();
    await chat(page).getByRole('button', { name: '동의하고 보내기' }).click();
    await expect(lastBot(page)).toContainText(text);
    await expect(lastBot(page)).toContainText(KEEP);
    await expect(chat(page).locator('.ai-answer')).toHaveCount(0);
    expect(await collectNumbers(page)).toEqual(before);
  });
}

for (const width of [360, 390, 1280]) {
  test(`서버 꺼짐에도 결과 숫자 유지, 오류 안내는 봇 말풍선 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('https://chat.namneundon.com/**', (route) => route.abort());
    await openChatTest(page);
    const before = await collectNumbers(page);
    await page.getByRole('button', { name: GO }).click();
    await chat(page).getByRole('textbox', { name: '질문' }).fill('왜 그런가요?');
    await chat(page).getByRole('button', { name: '보내기' }).click();
    await chat(page).getByRole('button', { name: '동의하고 보내기' }).click();
    await expect(lastBot(page)).toHaveText('질문을 보내거나 답변을 받지 못했습니다. ' + KEEP);
    await chat(page).getByRole('button', { name: '닫기' }).click();
    await expect(chat(page)).toHaveCount(0);
    expect(await collectNumbers(page)).toEqual(before);
  });
}
