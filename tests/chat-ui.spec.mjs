import { test, expect } from '@playwright/test';
import { openApp, collectNumbers } from './helpers.mjs';
import { ADMIN, TOPICS } from '../chat/src/index.js';
const GO = 'AI에게 결과 묻기';
// 124 시험 기간 주소(?aikey=)에 쓰던 모양의 가짜 키. 124-5 공개 뒤에는 무시하고 주소창에서 지운다.
const KEY = 'fake1screen1test1key';
const CLOSED = '오늘 AI 질문이 모두 마감됐습니다. 내일 오전 9시 이후 다시 물어봐 주세요.';
const PRIVACY = 'https://namneundon.com/privacy/#policy';
const WELCOME = '보고 계신 결과에서 궁금한 점을 물어보세요.';
const CHIP = {
  운영판단: '이번 달 결과, 지난달보다 나아졌어?',
  용어: '차액은 무슨 뜻이야?',
  잔액차이: '차액과 통장 잔액은 왜 달라?',
  기간비교: '지난달보다 뭐가 달라졌어?',
  지출구성: '어느 항목에 가장 많이 썼어?',
  지출비율: '재료 비율은 어떻게 계산해?',
  미분류: '아직 안 정한 돈은 뭐야?',
  자료범위: '이 자료로 한 달 전체를 비교해도 돼?',
  업종비교: '같은 업종과 비교하면 어느 수준이야?',
  앞으로지출: '다음 달 큰 지출을 해도 될까?'
};
const FINE = 'AI 답변은 틀릴 수 있습니다. 질문에 계좌번호·연락처 같은 개인정보는 적지 마세요.';
const NOTICE =
  '질문과 금액 요약은 미국과 영국의 Cloudflare로 보내져 답변을 만드는 데에만 쓰이고 남지 않습니다. 질문에 적으신 이름도 그대로 전송됩니다.';
const INFO_LINES = [
  '운영자 확인을 켜지 않으시면 질문은 남는돈 서버에도 남지 않습니다.',
  '앞선 대화는 답변에 반영되지 않습니다.'
];
// 입력 칸 위 안내는 줄 수 대신 높이로 잰다 — 작은 글씨 두 줄 높이 이하.
// 리눅스(GitHub 시험 기계)는 한글 글꼴이 달라 넓게 그려져 세 줄까지 허용한다(PR #67 시험 실패, 2026-10-16).
// 124-5 공개 문구(요한 지정)는 360px 에서 세 줄이 된다 — 글씨를 더 줄이지 않고 360 만 세 줄까지 허용한다.
const NOTICE_MAX_LINES = process.platform === 'linux' ? 3 : 2;
async function expectNoticeFits(dialog, width = 390) {
  const m = await dialog.locator('.ai-notice').evaluate((p) => ({
    height: p.getBoundingClientRect().height,
    lineHeight: parseFloat(getComputedStyle(p).lineHeight)
  }));
  expect(m.height, JSON.stringify(m)).toBeLessThanOrEqual(
    m.lineHeight * (NOTICE_MAX_LINES + (width < 390 ? 1 : 0)) + 0.5
  );
}
const OPT_IN = [
  '[선택] 서비스 개선을 위해 앞으로 보내는 질문·답변과 업종을 남는돈 운영자가 확인하도록 저장합니다.',
  '저장 항목: 질문, 답변, 업종, 작성 시각, 대화 번호, 삭제 키 확인값. 질문에 직접 적은 금액·이름도 함께 저장될 수 있습니다.',
  '대표님이 지우시거나 14일이 지나면 지웁니다. 데이터베이스의 되돌리기 기능 때문에 지운 뒤 7일 동안은 되살릴 수 있는 상태로 남고, 그 뒤에 사라집니다.',
  '켜지 않아도 질문 기능은 그대로 쓰실 수 있고, 언제든 끌 수 있습니다. 켜기 전 대화는 저장하지 않습니다.'
];
const KEEP = '결과 화면은 계속 사용할 수 있습니다.';
async function openChatTest(page, url = null) {
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
// 아이콘에 가리지 않고 화면 안에 보이며, 그 자리를 누르면 아이콘이 받지 않는지 잰다.
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
// 서버 대신 답한다. 질문 요청과 주제 집계 요청을 따로 모은다(헤더·본문 그대로).
async function fakeServer(page, answer = '<script>실행하지 않음</script> 설명', status = 200) {
  const chats = [];
  const topics = [];
  await page.route('https://chat.namneundon.com/**', async (route) => {
    const req = route.request();
    const item = {
      method: req.method(),
      url: req.url(),
      body: req.postDataJSON(),
      raw: req.postData(),
      headers: await req.allHeaders()
    };
    if (req.url().endsWith('/api/topic')) {
      topics.push(item);
      return route.fulfill({ json: { counted: true } });
    }
    chats.push(item);
    await route.fulfill(
      status === 200
        ? { json: { answer, saved: !!item.body?.share } }
        : { status, json: { error: 'x', nextAvailable: '2026-09-24T00:00:00.000Z' } }
    );
  });
  return { chats, topics };
}
const chat = (page) => page.locator('#ai-chat');
const lastBot = (page) => page.locator('#ai-chat .ai-log > .ai-bot').last();
async function ask(page, text) {
  await chat(page).getByRole('textbox', { name: '질문' }).fill(text);
  await chat(page).getByRole('button', { name: '보내기' }).click();
}

test('공개: 키 없이 결과 화면에 아이콘, ?ai=0 은 이 브라우저에서 끄기, ?ai=1 은 다시 켜기, 옛 ?aikey 는 무시하고 주소창에서 지움', async ({
  page
}) => {
  const sent = [];
  page.on('request', (r) => {
    if (r.url().startsWith('https://chat.namneundon.com')) sent.push(r.url());
  });
  await openApp(page);
  // 시작 화면 — 결과 화면 밖
  await expect(page.getByRole('button', { name: GO })).toBeHidden();
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.getByRole('button', { name: GO })).toBeVisible();
  await expect(page.getByRole('button', { name: GO })).toHaveCount(1);
  // 다른 화면으로 가면 결과와 함께 감춰진다
  await page.locator('#upopen').click();
  await expect(page.locator('#up-result')).toBeHidden();
  await expect(page.getByRole('button', { name: GO })).toBeHidden();
  // ?ai=0 — 이 브라우저에서 끄고, 다시 열어도 꺼져 있다
  await page.goto('/?ai=0');
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.locator('.ai-fab')).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).paddingBottom)).toBe('0px');
  await page.goto('/');
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.locator('.ai-fab')).toHaveCount(0);
  // ?ai=1 — 다시 켜기
  await page.goto('/?ai=1');
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.getByRole('button', { name: GO })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('fc.ai.enabled'))).toBeNull();
  // 옛 시험 주소: 키는 저장·전송하지 않고 주소창에서 지운다. 남아 있던 옛 시험 키 저장도 지운다
  await page.evaluate(() => localStorage.setItem('fc.ai.tester', 'old1key'));
  await page.goto('/?aikey=' + KEY);
  expect(page.url()).not.toContain('aikey');
  expect(page.url()).not.toContain(KEY);
  expect(await page.evaluate(() => location.search)).toBe('');
  expect(await page.evaluate(() => localStorage.getItem('fc.ai.tester'))).toBeNull();
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await expect(page.getByRole('button', { name: GO })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain(KEY);
  // 여기까지 서버로 간 요청 없음 — 아이콘을 보이는 것만으로는 통신하지 않는다
  expect(sent).toEqual([]);
});

test('통신 범위: 기본 상태에서는 보내기의 POST /api/chat 하나뿐, 본문은 질문·share·허용된 요약 칸만 — 저장을 켰을 때만 지우기 키·convId·삭제 요청', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const all = [];
  page.on('request', (r) => {
    if (
      !r.url().startsWith('http://localhost') &&
      !r.url().startsWith('http://127.0.0.1') &&
      !r.url().startsWith('data:')
    )
      all.push(r.method() + ' ' + r.url());
  });
  const net = await fakeServer(page);
  await openChatTest(page);
  await page.getByRole('button', { name: GO }).click();
  const dialog = chat(page);
  await dialog.getByRole('button', { name: '안내 자세히' }).click();
  await ask(page, '이번 달 결과, 지난달보다 나아졌어?');
  await expect(dialog.locator('.ai-answer')).toHaveCount(1);
  expect(all).toEqual(['POST https://chat.namneundon.com/api/chat']);
  expect(net.topics).toEqual([]);
  const req = net.chats[0];
  expect(Object.keys(req.body).sort()).toEqual(['question', 'share', 'summary']);
  expect(Object.keys(req.body.summary).sort()).toEqual(['current', 'industry', 'previous']);
  const MONTH = [
    'categories',
    'complete',
    'dataEnd',
    'difference',
    'earned',
    'materialRatio',
    'month',
    'otherIncome',
    'ratioLabel',
    'sales',
    'spent',
    'unknown'
  ];
  for (const m of [req.body.summary.current, ...req.body.summary.previous]) {
    expect(Object.keys(m).sort()).toEqual(MONTH);
    for (const c of m.categories)
      expect(Object.keys(c).sort()).toEqual(['amount', 'label', 'ratio']);
  }
  expect(req.headers.authorization).toBeUndefined();
  expect(req.headers['x-namneundon-tester']).toBeUndefined();
  // 저장을 켜면 그때부터 share·convId·지우기 키, 대화 삭제는 DELETE 하나
  await dialog.getByRole('button', { name: '더보기' }).click();
  await dialog.locator('.ai-opt-in').click();
  await dialog.locator('.ai-opt-in-panel').getByRole('button', { name: '켜기' }).click();
  await ask(page, '차액은 무슨 뜻이야?');
  await expect(dialog.locator('.ai-answer')).toHaveCount(2);
  expect(Object.keys(net.chats[1].body).sort()).toEqual(['convId', 'question', 'share', 'summary']);
  await dialog.getByRole('button', { name: '더보기' }).click();
  await dialog.getByRole('button', { name: '대화 삭제' }).click();
  await expect.poll(() => net.chats.length).toBe(3);
  expect(all).toEqual([
    'POST https://chat.namneundon.com/api/chat',
    'POST https://chat.namneundon.com/api/chat',
    'DELETE https://chat.namneundon.com/api/chat/' + net.chats[1].body.convId
  ]);
  expect(net.topics).toEqual([]);
});

for (const width of [360, 390]) {
  test(`아이콘은 모든 금액·항목 바꾸기를 가리지 않는 위치로 스크롤해 보고 누를 수 있고, 맨 아래 마지막 줄을 가리지 않음 ${width}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await openChatTest(page);
    const fab = page.getByRole('button', { name: GO });
    const box = await fab.boundingBox();
    // 휴대폰 48px, 화면 끝에서 16px (시험 브라우저는 안전 영역 0). 스크롤해도 그대로다.
    expect(box).toEqual({ x: width - 16 - 48, y: 844 - 16 - 48, width: 48, height: 48 });
    // 실제 렌더된 버튼 크기(getBoundingClientRect)와 기기 픽셀 비율을 함께 적는다
    const rendered = await fab.evaluate((b) => {
      const r = b.getBoundingClientRect();
      return { width: r.width, height: r.height, dpr: devicePixelRatio };
    });
    console.log(`[icon ${width}] getBoundingClientRect ${JSON.stringify(rendered)}`);
    expect([rendered.width, rendered.height]).toEqual([48, 48]);
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
    expect(await fab.boundingBox()).toEqual(box);
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

test('채팅 첫 화면: 남는돈 AI · 베타 · 닫기, 첫 말풍선과 추천 칩, 입력 칸 위 안내 한 줄과 ⓘ — 닫기·뒤로 가기는 전송·삭제 없음', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const net = await fakeServer(page);
  await openChatTest(page);
  const before = await collectNumbers(page);
  await page.getByRole('button', { name: GO }).click();
  const dialog = chat(page);
  await expect(dialog).toBeVisible();
  await expect(page.locator('.ai-fab')).toBeHidden();
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('남는돈 AI');
  await expect(dialog.locator('.ai-badge')).toHaveText('베타');
  await expect(dialog.getByRole('button', { name: '닫기' })).toBeVisible();
  await expect(dialog.locator('.ai-log > .ai-bot').first()).toHaveText(WELCOME);
  // 추천 칩: 브라우저가 자료 상태로 고른 것과 같다(최대 5개)
  const summary = await page.evaluate(() => chatSummary());
  const picked = await page.evaluate((s) => chatFirstChips(s), summary);
  expect(picked.length).toBeLessThanOrEqual(5);
  await expect(dialog.locator('.ai-log > .ai-chips .ai-chip')).toHaveText(
    picked.map((c) => c.text)
  );
  // 입력 칸 위 안내 한 줄(작은 글씨, 두 줄 안) + ⓘ · 주의 한 줄 · 동의 카드 없음 · 옛 「· 자세히」 없음
  await expect(dialog.locator('.ai-notice')).toHaveText(NOTICE);
  await expectNoticeFits(dialog);
  await expect(dialog.getByRole('button', { name: '자세히', exact: true })).toHaveCount(0);
  const info = dialog.getByRole('button', { name: '안내 자세히' });
  await expect(info).toHaveText('ⓘ');
  const ib = await info.boundingBox();
  expect(ib.width).toBeGreaterThanOrEqual(32);
  expect(ib.height).toBeGreaterThanOrEqual(32);
  // 펼침 상자로 옮긴 글은 처음에는 보이지 않는다
  for (const line of INFO_LINES) await expect(dialog.getByText(line)).toBeHidden();
  await expect(dialog.locator('.ai-fine')).toHaveText(FINE);
  await expect(dialog.getByRole('button', { name: '보내기' })).toBeVisible();
  await expect(dialog.locator('.ai-consent, .ai-sent-line, input[type=checkbox]')).toHaveCount(0);
  await expect(dialog).not.toContainText('강요한');
  await page.screenshot({ path: test.info().outputPath('chat-first-390.png') });
  // ⓘ: 옮긴 안내 두 줄 · 보낼 내용 표 · 개인정보 처리방침(새 탭)
  const detail = dialog.locator('.ai-detail');
  await expect(detail).toBeHidden();
  await info.click();
  await expect(detail).toBeVisible();
  await expect(info).toHaveAttribute('aria-expanded', 'true');
  await expect(detail.locator(':scope > p').first()).toHaveText(INFO_LINES[0]);
  await expect(detail.locator(':scope > p').nth(1)).toHaveText(INFO_LINES[1]);
  await expect(detail.locator(':scope > h3')).toHaveText(['남는돈이 자동으로 붙이는 것']);
  const policy = detail.getByRole('link', { name: '개인정보 처리방침' });
  await expect(policy).toHaveAttribute('href', PRIVACY);
  await expect(policy).toHaveAttribute('target', '_blank');
  await expect(policy).toHaveAttribute('rel', 'noopener noreferrer');
  await expectTableIs(page, detail.locator('.ai-preview'), summary);
  await expect(detail).toContainText('전체 기간 확보 미확인');
  await expect(detail).not.toContainText('진행 중');
  expect(await detail.innerText()).not.toMatch(/\d+일?\s*[~～]\s*\d+일/);
  await detail.evaluate((d) => (d.scrollTop = 0));
  await page.screenshot({ path: test.info().outputPath('info-open-390.png') });
  // 다시 누르면 닫힘
  await info.click();
  await expect(detail).toBeHidden();
  await expect(info).toHaveAttribute('aria-expanded', 'false');
  // 칩은 입력만
  for (const c of picked) {
    await dialog.getByRole('button', { name: c.text }).click();
    await expect(dialog.getByRole('textbox', { name: '질문' })).toHaveValue(c.text);
  }
  expect(net.chats).toEqual([]);
  // 닫기
  await dialog.getByRole('button', { name: '닫기' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: GO })).toBeVisible();
  // 휴대폰 뒤로 가기
  await page.getByRole('button', { name: GO }).click();
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  expect(net.chats).toEqual([]);
  expect(net.topics).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('fc.ai.usage'))).toBeNull();
  expect(await collectNumbers(page)).toEqual(before);
});

test('보내기는 바로 전송 — 꺼진 상태 요청에는 지우기 키·convId 가 없음(네트워크), 답변 뒤 다음 질문 칩, 주제 집계(켰을 때)는 topic·source 만', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const net = await fakeServer(page);
  await openChatTest(page);
  // 주제 집계는 기본 꺼짐(124-5). 켰을 때 보내는 모양을 보려고 이 시험에서만 켠다
  await page.evaluate(() => (CHAT_TOPIC_ON = true));
  await page.getByRole('button', { name: GO }).click();
  const dialog = chat(page);
  const expected = await page.evaluate(() => chatSummary());
  const first = await page.evaluate((s) => chatFirstChips(s), expected);
  // 칩을 그대로 보내면 칩의 주제
  await dialog.getByRole('button', { name: first[0].text }).click();
  await dialog.getByRole('button', { name: '보내기' }).click();
  await expect(dialog.locator('.ai-answer')).toHaveText('<script>실행하지 않음</script> 설명');
  expect(net.chats).toHaveLength(1);
  const req = net.chats[0];
  expect(Object.keys(req.body).sort()).toEqual(['question', 'share', 'summary']);
  expect(req.body.share).toBe(false);
  expect(req.body.summary).toEqual(expected);
  expect(req.headers.authorization).toBeUndefined();
  expect(req.raw).not.toContain('convId');
  expect(req.headers['x-namneundon-tester']).toBeUndefined();
  // 지우기 키를 만들지도 않는다
  expect(await page.evaluate(() => localStorage.getItem('fc.ai.receipt'))).toBeNull();
  // 저장하지 않았다는 말풍선은 붙지 않는다
  await expect(dialog).not.toContainText('운영자 열람용 대화 기록을 저장하지 않았습니다');
  // 질문은 오른쪽, 답은 왼쪽 말풍선. 답은 글자로만
  const me = dialog.locator('.ai-me').last();
  const ans = dialog.locator('.ai-answer');
  await expect(me).toHaveText(first[0].text);
  const [mb, ab, lb] = await Promise.all([
    me.boundingBox(),
    ans.boundingBox(),
    dialog.locator('.ai-log').boundingBox()
  ]);
  expect(mb.x + mb.width).toBeGreaterThan(lb.x + lb.width - 20);
  expect(ab.x).toBeLessThan(lb.x + 20);
  expect(await dialog.locator('.ai-log script').count()).toBe(0);
  // 주제 집계: 본문은 topic·source 둘뿐, 지우기 키·convId·질문 글·요약 없음
  await expect.poll(() => net.topics.length).toBe(1);
  expect(net.topics[0].body).toEqual({ topic: first[0].topic, source: 'chip' });
  expect(net.topics[0].headers.authorization).toBeUndefined();
  for (const s of ['convId', first[0].text, '"summary"', 'question'])
    expect(net.topics[0].raw).not.toContain(s);
  // 답변 아래 다음 질문 칩 최대 2개 — 방금 주제는 빼고, 업종비교·앞으로지출은 없다
  const next = await page.evaluate(
    ([s, skip]) => chatPickChips(s, skip, 2),
    [expected, first[0].topic]
  );
  await expect(dialog.locator('.ai-next .ai-chip')).toHaveText(next.map((t) => CHIP[t]));
  expect(next).not.toContain(first[0].topic);
  await page.screenshot({ path: test.info().outputPath('talk-390.png') });
  // 칩 문장을 고치면 직접 쓴 질문 — 낱말로 분류
  await dialog.locator('.ai-next .ai-chip').first().click();
  const box = dialog.getByRole('textbox', { name: '질문' });
  await box.fill('통장 잔액이 차액이랑 다른 이유가 궁금해요');
  await dialog.getByRole('button', { name: '보내기' }).click();
  await expect.poll(() => net.topics.length).toBe(2);
  expect(net.topics[1].body).toEqual({ topic: '잔액차이', source: 'typed' });
  await ask(page, '오늘 날씨 어때요');
  await expect.poll(() => net.topics.length).toBe(3);
  expect(net.topics[2].body).toEqual({ topic: '기타', source: 'typed' });
  expect(net.chats.every((c) => !c.headers.authorization && !c.raw.includes('convId'))).toBe(true);
});

test('운영자 확인용 저장: ⋯ 메뉴에서 기본 꺼짐 → 설명과 켜기·취소, 켠 동안만 share·지우기 키·convId, 끄면 바로 다음 질문부터 안 보냄', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const net = await fakeServer(page);
  await openChatTest(page);
  await page.evaluate(() => (CHAT_TOPIC_ON = true));
  await page.getByRole('button', { name: GO }).click();
  const dialog = chat(page);
  await dialog.getByRole('button', { name: '더보기' }).click();
  const row = dialog.locator('.ai-opt-in');
  await expect(row).toHaveText('운영자 확인용 저장: 꺼짐');
  // 대화 삭제 아래 설명은 한 문장 — 매장 지우기·브라우저 저장소 이야기는 문서로 옮겼다
  await expect(dialog.locator('.ai-menu > p')).toHaveText(
    '운영자 확인용으로 서버에 저장된 이 브라우저의 대화를 지웁니다.'
  );
  await expect(dialog.getByRole('button', { name: '대화 삭제' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('menu-390.png') });
  await row.click();
  const panel = dialog.locator('.ai-opt-in-panel');
  await expect(panel.locator('p')).toHaveText(OPT_IN);
  await expect(panel).not.toContainText('강요한');
  await page.screenshot({ path: test.info().outputPath('optin-390.png') });
  // 취소 — 꺼진 그대로
  await panel.getByRole('button', { name: '취소' }).click();
  await expect(panel).toBeHidden();
  await expect(row).toHaveText('운영자 확인용 저장: 꺼짐');
  await dialog.getByRole('button', { name: '더보기' }).click();
  // 켜기 전 질문은 저장하지 않는다
  await ask(page, '차액은 무슨 뜻이야?');
  await expect(dialog.locator('.ai-answer')).toHaveCount(1);
  expect(net.chats[0].body.share).toBe(false);
  expect(net.chats[0].headers.authorization).toBeUndefined();
  // 켜기
  await dialog.getByRole('button', { name: '더보기' }).click();
  await row.click();
  await panel.getByRole('button', { name: '켜기' }).click();
  await ask(page, '어느 항목에 가장 많이 썼어?');
  await expect(dialog.locator('.ai-answer')).toHaveCount(2);
  const on = net.chats[1];
  expect(on.body.share).toBe(true);
  expect(on.body.convId).toMatch(/^[0-9a-f-]{36}$/);
  expect(on.headers.authorization).toMatch(/^Bearer [0-9a-f]{64}$/);
  await expect(dialog.locator('.ai-meta').last()).toHaveText('운영자 확인용으로 저장했습니다.');
  // 주제 집계에는 켜져도 키·convId 가 없다
  await expect.poll(() => net.topics.length).toBe(2);
  expect(net.topics[1].body).toEqual({ topic: '지출구성', source: 'typed' });
  expect(net.topics[1].headers.authorization).toBeUndefined();
  // 끄기 — 바로 다음 질문부터
  await dialog.getByRole('button', { name: '더보기' }).click();
  await expect(row).toHaveText('운영자 확인용 저장: 켜짐 · 끄기');
  await row.click();
  await ask(page, '재료 비율은 어떻게 계산해?');
  await expect(dialog.locator('.ai-answer')).toHaveCount(3);
  expect(net.chats[2].body.share).toBe(false);
  expect(net.chats[2].headers.authorization).toBeUndefined();
  expect(net.chats[2].raw).not.toContain('convId');
  // 대화 삭제는 지우기 키와 대화 번호를 보낸다
  await dialog.getByRole('button', { name: '더보기' }).click();
  await dialog.getByRole('button', { name: '대화 삭제' }).click();
  await expect.poll(() => net.chats.length).toBe(4);
  expect(net.chats[3].method).toBe('DELETE');
  expect(net.chats[3].url).toContain('/api/chat/' + on.body.convId);
  expect(net.chats[3].headers.authorization).toBe(on.headers.authorization);
});

test('추천 칩 고르기 규칙: 아직 안 정한 돈이 있으면 미분류가 먼저, 비교할 이전 달이 없으면 기간비교 없음', async ({
  page
}) => {
  await openChatTest(page);
  const s = await page.evaluate(() => chatSummary());
  const pick = (sum, skip, max) =>
    page.evaluate(([a, b, c]) => chatPickChips(a, b, c), [sum, skip, max]);
  const withUnknown = { ...s, current: { ...s.current, unknown: 1000 } };
  const noUnknown = { ...s, current: { ...s.current, unknown: 0 } };
  const prev = s.previous.length
    ? s.previous
    : [{ ...s.current, month: '2023-07', complete: true }];
  expect(await pick({ ...withUnknown, previous: prev }, null, 3)).toEqual([
    '미분류',
    '기간비교',
    '용어'
  ]);
  expect(await pick({ ...withUnknown, previous: [] }, null, 3)).toEqual([
    '미분류',
    '용어',
    '지출구성'
  ]);
  expect(await pick({ ...noUnknown, previous: [] }, null, 3)).toEqual([
    '용어',
    '지출구성',
    '잔액차이'
  ]);
  expect(await pick({ ...noUnknown, previous: prev }, '기간비교', 2)).toEqual(['용어', '지출구성']);
  // 업종비교·앞으로지출은 어떤 경우에도 추천하지 않는다
  for (const sum of [withUnknown, noUnknown])
    for (const skip of [null, '미분류', '용어'])
      expect(await pick(sum, skip, 10)).not.toEqual(expect.arrayContaining(['업종비교']));
  // 칩 문장은 그대로 보내면 칩 주제, 직접 쓴 문장은 낱말로 분류된다
  for (const [topic, text] of Object.entries(CHIP)) {
    expect(
      await page.evaluate(([t, x]) => chatTopicOf(x, { topic: t, text: x }), [topic, text])
    ).toEqual({ topic, source: 'chip' });
    expect(await page.evaluate((x) => chatTopicOf(x, null), text)).toEqual({
      topic,
      source: 'typed'
    });
  }
  expect(await page.evaluate(() => chatTopicOf('고마워요', null))).toEqual({
    topic: '기타',
    source: 'typed'
  });
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

test('키보드가 열린 높이 390×500: 입력 칸·보내기·닫기·안내가 화면 안, 칩은 줄 바꿈, 가로 넘침 없음', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await openChatTest(page);
  await page.getByRole('button', { name: GO }).click();
  const dialog = chat(page);
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
    dialog.getByRole('button', { name: '닫기' }),
    dialog.getByRole('button', { name: '안내 자세히' })
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
  test(`창 배치·거래처 이름 미포함·시험자 헤더 없음 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const logs = [];
    page.on('console', (m) => logs.push(m.text()));
    const net = await fakeServer(page);
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
    await ask(page, '이 뜻은 무엇인가요?');
    await expect(chat(page).locator('.ai-answer')).toContainText('<script>');
    expect(net.chats[0].body.summary).toEqual(expected);
    expect(net.chats[0].headers['x-namneundon-tester']).toBeUndefined();
    expect(net.topics).toEqual([]);
    expect(logs.join('\n')).not.toContain('chat.namneundon.com');
    expect(await chat(page).evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`chat-${width}.png`) });
  });
}

for (const [status, text] of /** @type {[number, string][]} */ ([
  [403, '지금은 답변을 받지 못했습니다. ' + KEEP],
  [429, CLOSED]
])) {
  test(`서버 ${status} 안내는 봇 말풍선으로, 결과 숫자 유지, 주제 집계 없음`, async ({ page }) => {
    const net = await fakeServer(page, '', status);
    await openChatTest(page);
    const before = await collectNumbers(page);
    await page.getByRole('button', { name: GO }).click();
    await ask(page, '왜 그런가요?');
    await expect(lastBot(page)).toHaveText(text);
    await expect(chat(page).locator('.ai-answer')).toHaveCount(0);
    expect(net.topics).toEqual([]);
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
    await ask(page, '왜 그런가요?');
    await expect(lastBot(page)).toHaveText('질문을 보내거나 답변을 받지 못했습니다. ' + KEEP);
    await chat(page).getByRole('button', { name: '닫기' }).click();
    await expect(chat(page)).toHaveCount(0);
    expect(await collectNumbers(page)).toEqual(before);
  });
}

test('관리 화면 1280: 내보내기 두 가지, 개선 기록 입력(고정 목록·안내), 저장 질문 목록(합성)', async ({
  page
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const notes = [];
  await page.route('https://chat.namneundon.com/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/admin')
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: ADMIN });
    if (url.pathname === '/api/admin/list')
      return route.fulfill({
        json: {
          rows: [
            {
              id: '00000000-0000-4000-8000-000000000009',
              question: '차액은 무슨 뜻이야? (합성 질문)',
              answer: '차액은 이번 달 들어오고 나간 돈의 차이입니다. (합성 답변)',
              industry: '식당',
              created_at: Date.parse('2026-10-16T03:00:00Z')
            }
          ]
        }
      });
    if (url.pathname === '/api/admin/notes') {
      notes.push(route.request().postDataJSON());
      return route.fulfill({ json: { saved: true } });
    }
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('https://chat.namneundon.com/admin');
  await expect(page.getByRole('link', { name: '주제 집계 내보내기(CSV)' })).toHaveAttribute(
    'href',
    '/api/admin/topics.csv'
  );
  await expect(page.getByRole('link', { name: '개선 기록 내보내기(CSV)' })).toHaveAttribute(
    'href',
    '/api/admin/notes.csv'
  );
  await expect(page.getByText('원문 내보내기')).toHaveCount(0);
  expect(await page.locator('select[name=topic] option').allTextContents()).toEqual(TOPICS);
  expect(await page.locator('select[name=kind] option').allTextContents()).toEqual([
    '사실 틀림',
    '숫자 틀림',
    '말투',
    '답 못함',
    '기타'
  ]);
  await expect(page.locator('textarea[name=note]')).toHaveAttribute(
    'placeholder',
    '금액·가게 이름·성함·질문 원문 문장을 적지 마세요'
  );
  await expect(page.locator('main')).toContainText('(합성 질문)');
  await page.locator('select[name=topic]').selectOption('잔액차이');
  await page.locator('select[name=kind]').selectOption('숫자 틀림');
  await page.locator('textarea[name=note]').fill('잔액 설명이 길다');
  await page.getByRole('button', { name: '개선 기록 저장' }).click();
  await expect(page.locator('#noted')).toHaveText('저장했습니다');
  expect(notes).toEqual([{ topic: '잔액차이', kind: '숫자 틀림', note: '잔액 설명이 길다' }]);
  await page.screenshot({ path: test.info().outputPath('admin-1280.png'), fullPage: true });
});

for (const width of [360, 390]) {
  test(`입력 칸 위 안내는 작은 글씨 두 줄 안(360 은 세 줄), ⓘ 는 32px 이상 ${width}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await openChatTest(page);
    await page.getByRole('button', { name: GO }).click();
    const dialog = chat(page);
    await expect(dialog.locator('.ai-notice')).toHaveText(NOTICE);
    await expectNoticeFits(dialog, width);
    const ib = await dialog.getByRole('button', { name: '안내 자세히' }).boundingBox();
    expect(Math.min(ib.width, ib.height)).toBeGreaterThanOrEqual(32);
    expect(await dialog.evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(true);
  });
}

test('첫 화면 추천 질문 5개 규칙: 미분류 0원·비교 달 없음·인건비·월세 0원일 때 바꾸거나 뺀다', async ({
  page
}) => {
  await openChatTest(page);
  const s = await page.evaluate(() => chatSummary());
  const first = (sum) => page.evaluate((x) => chatFirstChips(x), sum);
  const cats = (list) => ({ ...s, current: { ...s.current, categories: list } });
  const base = {
    ...cats([
      { label: '식자재', amount: 1000, ratio: 0.1 },
      { label: '인건비', amount: 2000, ratio: 0.2 },
      { label: '월세', amount: 500, ratio: 0.05 }
    ]),
    previous: s.previous.length ? s.previous : [{ ...s.current, month: '2023-07', complete: true }]
  };
  base.current.unknown = 1000;
  const FULL = [
    { topic: '운영판단', text: '번 돈은 느는데 왜 남는 게 적어?' },
    { topic: '지출비율', text: '인건비는 매출의 몇 %야?' },
    { topic: '지출구성', text: '월세·공과금은 얼마 나갔어?' },
    { topic: '기간비교', text: '지난달보다 뭐가 달라졌어?' },
    { topic: '미분류', text: '아직 안 정한 돈은 뭐야?' }
  ];
  expect(await first(base)).toEqual(FULL);
  // 아직 안 정한 돈 0원 → 미분류 대신 「어느 항목에 가장 많이 썼어?」
  expect(await first({ ...base, current: { ...base.current, unknown: 0 } })).toEqual([
    ...FULL.slice(0, 4),
    { topic: '지출구성', text: '어느 항목에 가장 많이 썼어?' }
  ]);
  // 비교할 이전 달 없음 → 기간비교 대신 「차액은 무슨 뜻이야?」
  expect(await first({ ...base, previous: [] })).toEqual([
    ...FULL.slice(0, 3),
    { topic: '용어', text: '차액은 무슨 뜻이야?' },
    FULL[4]
  ]);
  // 인건비·월세가 0원(또는 없음)이면 그 칩은 빼고 남은 것만
  const noLabor = {
    ...base,
    current: {
      ...base.current,
      categories: base.current.categories.filter((c) => c.label !== '인건비')
    }
  };
  expect(await first(noLabor)).toEqual([FULL[0], FULL[2], FULL[3], FULL[4]]);
  const zeroRent = {
    ...base,
    current: {
      ...base.current,
      categories: base.current.categories.map((c) => (c.label === '월세' ? { ...c, amount: 0 } : c))
    }
  };
  expect(await first(zeroRent)).toEqual([FULL[0], FULL[1], FULL[3], FULL[4]]);
  // 업종별 이름(급여·임차료)도 같은 항목으로 본다
  const renamed = {
    ...base,
    current: {
      ...base.current,
      categories: [
        { label: '급여', amount: 2000, ratio: 0.2 },
        { label: '임차료', amount: 500, ratio: 0.05 }
      ]
    }
  };
  expect(await first(renamed)).toEqual(FULL);
  // 새 칩 문장도 그대로 보내면 칩 주제, 직접 쓰면 낱말로 같은 주제
  for (const c of FULL.concat([{ topic: '지출구성', text: '어느 항목에 가장 많이 썼어?' }])) {
    expect(await page.evaluate((x) => chatTopicOf(x.text, x), c)).toEqual({
      topic: c.topic,
      source: 'chip'
    });
    expect(await page.evaluate((x) => chatTopicOf(x, null), c.text)).toEqual({
      topic: c.topic,
      source: 'typed'
    });
  }
});
