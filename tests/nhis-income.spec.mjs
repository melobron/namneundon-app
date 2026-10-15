// 병원·치과·약국 공단 입금 — 자동 '보험'으로 매출에서 조용히 빠지지 않고, 대표님께 여쭌다 (2026-10-15 C안).
// 시험 자료는 실제 은행 표기 이름 + 합성 금액·날짜다 (tests/nhis-fixture.mjs).
import { test, expect } from '@playwright/test';
import { openApp, screenText } from './helpers.mjs';
import {
  nhisRows,
  nhisXlsx,
  startWith,
  payeeState,
  pickOthers,
  nhisNumbers
} from './nhis-fixture.mjs';

const ASK = '공단에서 받은 이 돈은 진료·조제 대금인가요?';
const SALES = ['국민건강가지급', '국민건강초심', '의료급여건생비', '의료급여초심'];
const row = (list, name) => list.find((p) => p[0] === name);

// 거래처 확인 카드를 차례로 답한다 — 조제료는 「매출」, 「국민건강」 입금(환급)은 「보험」, 「건보」는 「나중에」
async function answerCards(page) {
  const seen = [];
  for (let k = 0; k < 30; k++) {
    if (await page.locator('.askcard').isVisible()) {
      const [askName, same] = await page.evaluate(
        (s) => [UP.ask.g.name, s.includes(UP.ask.g.name)],
        SALES
      );
      seen.push(['같은 곳?', askName]);
      await page.getByRole('button', { name: same ? /^같은 곳입니다/ : '다른 곳입니다' }).click();
      continue;
    }
    const name = await page.evaluate(() => {
      const g = UP.queue[UP.pos];
      return g && UP.pos < UP.queue.length ? g.name : null;
    });
    if (!name || !(await page.locator('.obcard').isVisible())) break;
    const q = await page.locator('.obquestion').innerText();
    seen.push([name, q]);
    const card = page.locator('.obcard');
    if (SALES.includes(name)) {
      if (name === '국민건강가지급')
        expect(await screenText(page, '.obcard')).toMatchSnapshot('ask-card.txt');
      await card.getByRole('button', { name: /^매출/ }).click();
    } else if (name === '국민건강') {
      // 환급 등 다른 입금 → 기존 용도 고르기 (보험은 [다른 항목] 안에 있다)
      await card.getByRole('button', { name: /다른 항목/ }).click();
      await card.locator('.menu').getByRole('button', { name: /^보험/ }).click();
    } else {
      await card.getByRole('button', { name: '나중에' }).click();
    }
  }
  return seen;
}

test('약국 — 공단 입금을 묻고, 매출로 확인하면 월 매출·비율·들어올 돈이 같이 바뀐다', async ({
  page
}) => {
  const errors = await openApp(page);
  await startWith(page, '약국', await nhisXlsx(page));

  // 처음 상태: 공단 입금은 자동 '보험'이 아니라 아직 안 정함 · 묻는 줄에 있다
  const s0 = await payeeState(page);
  for (const n of SALES)
    expect(row(s0, n).slice(3, 10), n).toEqual([null, false, null, false, null, false, true]);
  // 「국민건강초심」은 「건강초심」으로 갈리지 않는다
  expect(row(s0, '건강초심')).toBeUndefined();
  // 섞인 「국민건강」 — 출금(보험료)은 자동 '보험' 그대로, 입금만 묻는다
  expect(row(s0, '국민건강').slice(2, 10)).toEqual([
    true,
    null,
    false,
    null,
    false,
    '보험',
    true,
    true
  ]);
  // 국민연금 입금은 후보가 아니다 — 입금·출금 모두 자동 '보험' 그대로 (매출로 가지 않는다)
  expect(row(s0, '국민연금').slice(2, 10)).toEqual([
    true,
    null,
    false,
    '보험',
    true,
    '보험',
    true,
    false
  ]);
  for (const n of ['고용보험', '산재보험']) expect(row(s0, n).slice(3, 5)).toEqual(['보험', true]);

  await pickOthers(page);
  const before = await nhisNumbers(page);
  // 확인 전: 공단 입금은 매출에도 그 밖의 입금에도 없다 — 아직 안 정한 입금이다
  expect(before.per.find((x) => x.m === '2026-06')).toEqual({
    m: '2026-06',
    매출: 18200000,
    그밖입금: 0,
    미정입금: 21924000,
    들어온돈: 40124000,
    나간돈: 24250000,
    비율: 93.41
  });
  expect(before.예상.들어올).toBe(23660000);

  const seen = await answerCards(page);
  for (const n of SALES) expect(seen.find((x) => x[0] === n)?.[1] ?? ASK, n).toBe(ASK);
  expect(seen.find((x) => x[0] === '국민건강')?.[1]).toBe(ASK);
  expect(seen.find((x) => x[0] === '건보')?.[1]).toBe('이 거래는 무엇인가요?');
  // 공단 거래처끼리 「같은 곳인가요?」로 잇지 않는다 — 보험료 거래처 「국민건강」이 매출로 권해지던 길
  expect(seen.filter((x) => x[0] === '같은 곳?')).toEqual([]);

  const s1 = await payeeState(page);
  for (const n of SALES) expect(row(s1, n).slice(3, 5), n).toEqual(['매출', false]);
  // 섞인 거래처 — 입금 확인이 출금 분류를 바꾸지 않는다
  expect(row(s1, '국민건강').slice(5, 9)).toEqual(['보험', false, '보험', true]);
  // 「나중에」 — 아직 안 정함 그대로
  expect(row(s1, '건보').slice(3, 5)).toEqual([null, false]);

  const after = await nhisNumbers(page);
  expect(after.per.find((x) => x.m === '2026-06')).toEqual({
    m: '2026-06',
    매출: 40124000,
    그밖입금: 0,
    미정입금: 0,
    들어온돈: 40124000,
    나간돈: 24250000,
    비율: 42.37
  });
  expect(after.per.find((x) => x.m === '2026-08')).toMatchObject({
    매출: 40348000,
    그밖입금: 230000,
    미정입금: 0
  });
  expect(after.예상.들어올).toBe(52188500);
  // 용도를 바꿔도 통장에 실제로 오간 돈과 잔액은 그대로다
  for (let i = 0; i < before.per.length; i++) {
    expect(after.per[i].들어온돈).toBe(before.per[i].들어온돈);
    expect(after.per[i].나간돈).toBe(before.per[i].나간돈);
  }
  expect(after.잔액).toBe(before.잔액);

  // 저장 후 다시 열기 — 확인한 답이 그대로다
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page
    .getByRole('button', { name: /테스트약국/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
  const s2 = await payeeState(page);
  for (const n of SALES) expect(row(s2, n).slice(3, 5), n).toEqual(['매출', false]);
  expect(row(s2, '국민건강').slice(5, 9)).toEqual(['보험', false, '보험', true]);
  expect((await nhisNumbers(page)).per).toEqual(after.per);
  expect(errors).toEqual([]);
});

test('약국 — 같은 공단 거래처의 새 거래를 보태도 다시 묻지 않는다', async ({ page }) => {
  await openApp(page);
  await startWith(page, '약국', await nhisXlsx(page));
  await pickOthers(page);
  await answerCards(page);
  // 같은 계좌에 10월 거래를 보태 다시 올린다 (합성 금액)
  const more = nhisRows().concat([
    ['2026-09-22 19:00:00', '국민건강가지급', 18600000],
    ['2026-09-22 19:01:00', '국민건강초심', 2600000]
  ]);
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: '약국', exact: true }).click();
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(await nhisXlsx(page, more));
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.getByRole('button', { name: '이어서 하기' }).click();
  const s = await payeeState(page);
  for (const n of SALES) expect(row(s, n).slice(3, 5), n).toEqual(['매출', false]);
  for (const n of SALES) expect(row(s, n)[9], n).toBe(false); // 묻는 줄에 다시 서지 않는다
  expect(row(s, '국민건강가지급')[1]).toBe('국민건강가지급');
});

test('식당 — 공단 이름이 있어도 묻지 않는다 (업종 밖은 기존 자동 분류)', async ({ page }) => {
  await openApp(page);
  await startWith(page, '식당', await nhisXlsx(page), '테스트식당');
  const s = await payeeState(page);
  expect(row(s, '국민건강가지급').slice(3, 5)).toEqual(['보험', true]);
  // 보완 1번 — 이름은 「국민건강초심」으로 살리되 분류는 라이브 120차(「건강초심」)처럼 아직 안 정함
  expect(row(s, '국민건강초심').slice(1, 5)).toEqual(['국민건강초심', false, null, false]);
  expect(row(s, '국민건강초심')[9]).toBe(true);
  expect(row(s, '국민건강').slice(5, 9)).toEqual(['보험', true, '보험', true]);
  expect(row(s, '국민연금').slice(5, 9)).toEqual(['보험', true, '보험', true]);
  // 의료급여는 보험 낱말이 아니다 — 지금처럼 아직 안 정함으로 묻는다 (공단 안내는 없다)
  expect(row(s, '의료급여건생비').slice(3, 5)).toEqual([null, false]);
  await expect(page.locator('.obquestion')).not.toHaveText(ASK);
});

test('저장 자료 — 대표님이 정해 둔 공단 거래처는 덮어쓰지 않는다', async ({ page }) => {
  await openApp(page);
  // 옛 판에서 「국민건강가지급」을 손수 '보험'으로, 「국민건강초심」(그때 이름은 「건강초심」)을 '기타'로 정해 둔 기기
  await page.evaluate(() => {
    localStorage.setItem(
      'fc.picks.테스트약국',
      JSON.stringify({
        v: 1,
        cv: CAT_CV,
        업종: '약국',
        store: '테스트약국',
        owner: '홍길동',
        picks: { 국민건강가지급: '보험', 국민건강초심: '기타' }
      })
    );
  });
  await startWith(page, '약국', await nhisXlsx(page), '테스트약국', false);
  await expect(page.getByText('지난번에 정하신 2곳을 그대로 적용했습니다.')).toBeVisible();
  const s = await payeeState(page);
  expect(row(s, '국민건강가지급').slice(3, 5)).toEqual(['보험', false]);
  expect(row(s, '국민건강초심').slice(3, 5)).toEqual(['기타', false]);
  expect(row(s, '국민건강가지급')[9]).toBe(false);
  // 정해 두지 않은 공단 입금은 묻는다
  expect(row(s, '의료급여건생비').slice(3, 5)).toEqual([null, false]);
  expect(row(s, '의료급여건생비')[9]).toBe(true);
});

// 결과 화면의 펼친 목록에서 그 거래처 줄의 [항목 바꾸기] → 메뉴에서 항목
async function changeRow(page, parent, section, payee, to) {
  await page
    .locator('.bigrow', { hasText: parent })
    .first()
    .click({ position: { x: 8, y: 8 } });
  await page.locator('.orow:not(.bigrow)', { hasText: section }).first().click();
  const row = page
    .locator('.dtl .drow')
    .filter({ has: page.locator('.dnm', { hasText: new RegExp(`(^|[\\s✓⚙?])${payee}( ·|$)`) }) })
    .first();
  await row.getByRole('button', { name: '항목 바꾸기' }).click();
  await row
    .locator('xpath=following-sibling::div[contains(@class,"menu")][1]')
    .getByRole('button', { name: new RegExp('^' + to) })
    .first()
    .click();
}
async function augNumbers(page) {
  return page.evaluate(() => {
    const d = monthNumbers('2026-08');
    const g = UP.byName['국민건강'];
    return [d.sales, d.cost, d.otherIn, g.catIn, g.catOut];
  });
}
async function toResult(page) {
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page
    .getByRole('button', { name: /테스트약국/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
  await page.evaluate(() => {
    UP.month = '2026-08';
    drawResult(monthList());
  });
}

// 보완 2번 — 섞인 「국민건강」(8월: 보험료 출금 700,000 · 환급 입금 150,000). 예전(63-4)에는 양쪽이 같이 바뀌었다
test('결과 화면 — 입금 행에서 고치면 입금 분류만 · 출금 행에서 고치면 출금 분류만 바뀐다', async ({
  page
}) => {
  const errors = await openApp(page);
  await startWith(page, '약국', await nhisXlsx(page));
  await pickOthers(page);
  await answerCards(page);
  await toResult(page);
  // [번 돈, 쓴 돈, 그 밖의 입금, 입금 분류, 출금 분류]
  expect(await augNumbers(page)).toEqual([40348000, 24250000, 230000, '보험', '보험']);

  // (가) 그 밖의 입금 → 「국민건강」 → 매출: 환급 150,000 만 매출로. 보험료 출금은 보험 그대로
  await changeRow(page, '사업으로 번 돈', '그 밖의 입금', '국민건강', '매출');
  expect(await augNumbers(page)).toEqual([40498000, 24250000, 80000, '매출', '보험']);
  await toResult(page);
  expect(await augNumbers(page)).toEqual([40498000, 24250000, 80000, '매출', '보험']);

  // (나) 사업에 쓴 돈 → 보험 → 「국민건강」 → 기타: 출금만 기타로. 입금(매출)은 그대로
  await changeRow(page, '사업에 쓴 돈', '보험', '국민건강', '기타');
  const after = await augNumbers(page);
  expect(after).toEqual([40498000, 24250000, 80000, '매출', '기타']);
  expect(await page.evaluate(() => monthNumbers('2026-08').cats['기타'])).toBe(700000);
  await toResult(page);
  expect(await augNumbers(page)).toEqual(after);
  expect(errors).toEqual([]);
});

// 보완 2차 가 — 공단 거래처 「국민건강」(입금 보험 + 출금 보험)이 나간 쪽 「보험」 목록에서 한 줄로 합쳐 보이면,
// 그 줄을 매출로 고칠 때 출금만 매출이 되어 그 달 매출이 마이너스가 됐다. 이제 쪽마다 한 줄이다
test('결과 화면 — 나간 쪽 목록의 공단 섞인 거래처는 들어온 줄 · 나간 줄로 나뉘고 그 줄의 쪽만 고친다', async ({
  page
}) => {
  const errors = await openApp(page);
  await startWith(page, '약국', await nhisXlsx(page));
  await pickOthers(page);
  await answerCards(page);
  await toResult(page);
  // (가) 사업에 쓴 돈 → 보험: 「국민건강」이 나간 줄 · 들어온 줄 둘로 보인다
  await page
    .locator('.bigrow', { hasText: '사업에 쓴 돈' })
    .first()
    .click({ position: { x: 8, y: 8 } });
  await page.locator('.orow:not(.bigrow)', { hasText: '보험' }).first().click();
  const lines = await page.locator('.dtl .drow .dnm').allInnerTexts();
  const nh = lines.filter((t) => /국민건강 ·/.test(t));
  expect(nh.length).toBe(2);
  expect(nh[0]).toContain('국민건강 · 나간 돈 1건');
  expect(nh[1]).toContain('국민건강 · 들어온 돈 1건');
  expect(nh[1]).toContain('(그 밖의 입금)');
  expect(await augNumbers(page)).toEqual([40348000, 24250000, 230000, '보험', '보험']);

  // (나) 들어온 줄 → 매출: 입금만 매출 · 출금은 보험 그대로
  const pickOn = async (label, to) => {
    const row = page
      .locator('.dtl .drow')
      .filter({ has: page.locator('.dnm', { hasText: label }) })
      .first();
    await row.getByRole('button', { name: '항목 바꾸기' }).click();
    await row
      .locator('xpath=following-sibling::div[contains(@class,"menu")][1]')
      .getByRole('button', { name: new RegExp('^' + to) })
      .first()
      .click();
  };
  await pickOn('국민건강 · 들어온 돈', '매출');
  expect(await augNumbers(page)).toEqual([40498000, 24250000, 80000, '매출', '보험']);

  // (다) 나간 줄 → 기타: 출금만 기타 · 입금(매출)은 그대로
  // 고친 뒤에도 펼친 목록은 그대로 열려 있다
  await expect(page.locator('.dtl .drow .dnm', { hasText: '국민건강 · 들어온 돈' })).toHaveCount(0);
  await pickOn('국민건강 · 나간 돈', '기타');
  expect(await augNumbers(page)).toEqual([40498000, 24250000, 80000, '매출', '기타']);

  // (라) 어느 달도 매출이 마이너스가 아니고, 매출에서 빠지는 출금(매출 차감)도 없다
  await toResult(page);
  const months = await page.evaluate(() =>
    monthList().map((m) => {
      const d = monthNumbers(m);
      return [m, d.sales, d.salesOut];
    })
  );
  for (const [m, sales, out] of months) {
    expect(sales, m).toBeGreaterThan(0);
    expect(out, m).toBe(0);
  }
  expect(errors).toEqual([]);
});

// 보완 2차 다 — 「환급 등 다른 입금」 단추는 만들지 않는다(보류). 지금 있는 [다른 항목] 경로로 매출이 아닌 항목을 고르면
test('공단 카드 [다른 항목] — 매출에 안 들어가고 출금 분류는 그대로 · 다시 열어도 다시 묻지 않는다', async ({
  page
}) => {
  const errors = await openApp(page);
  await startWith(page, '약국', await nhisXlsx(page));
  await pickOthers(page);
  // 카드 단추는 그대로다 — 「환급 등 다른 입금」은 없다
  await page.evaluate(() => {
    UP.pos = UP.queue.indexOf(UP.byName['국민건강']);
    drawOnboard();
  });
  const btns = await page.locator('.obcard button').allInnerTexts();
  expect(btns.map((t) => t.replace(/\s+/g, ' ').trim())).toEqual(
    expect.arrayContaining(['매출', '사업 외 용도', '기타', '다른 항목 ▾', '나중에'])
  );
  expect(btns.join('|')).not.toContain('환급');
  // 「국민건강」 입금 → [다른 항목] → 보험 / 「의료급여초심」 → [다른 항목] → 세금 / 「의료급여건생비」 → 사업 외 용도
  const answer = async (name, to, viaMenu) => {
    await page.evaluate((n) => {
      UP.pos = UP.queue.indexOf(UP.byName[n]);
      drawOnboard();
    }, name);
    await expect(page.locator('.obquestion')).toHaveText(ASK);
    const card = page.locator('.obcard');
    if (viaMenu) {
      await card.getByRole('button', { name: /다른 항목/ }).click();
      await card
        .locator('.menu')
        .getByRole('button', { name: new RegExp('^' + to) })
        .first()
        .click();
    } else await card.getByRole('button', { name: new RegExp('^' + to) }).click();
  };
  await answer('국민건강', '보험', true);
  await answer('의료급여초심', '세금', true);
  await answer('의료급여건생비', '사업 외 용도', false);
  const read = () =>
    page.evaluate(() => {
      const d = monthNumbers('2026-08');
      const st = (n) => {
        const g = UP.byName[n];
        return g.mixed ? [g.catIn, g.catOut] : [g.cat];
      };
      return {
        매출: d.sales,
        그밖입금: d.otherIn,
        그밖입금거래처: d.otherInPayees,
        내가넣은돈: d.keepInParts,
        국민건강: st('국민건강'),
        의료급여초심: st('의료급여초심'),
        의료급여건생비: st('의료급여건생비')
      };
    });
  const want = {
    매출: 18200000, // 카드 매출만 — 공단 입금은 매출에 안 들어간다 (「국민건강가지급」·「국민건강초심」은 아직 안 정함)
    그밖입금: 150000 + 80000 + 304000, // 「국민건강」 환급(보험) + 「국민연금」 환급(자동 보험) + 「의료급여초심」(세금)
    그밖입금거래처: { 국민건강: 150000, 국민연금: 80000, 의료급여초심: 304000 },
    내가넣은돈: { '내가 넣은 돈': 904000 }, // 「의료급여건생비」 — 사업 외 용도 입금은 계산 밖(내가 넣은 돈)
    국민건강: ['보험', '보험'],
    의료급여초심: ['세금'],
    의료급여건생비: ['사업 외 용도']
  };
  expect(await read()).toEqual(want);
  // 저장 → 다시 열기: 그대로 · 같은 질문을 다시 묻지 않는다
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page
    .getByRole('button', { name: /테스트약국/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
  expect(await read()).toEqual(want);
  const s = await payeeState(page);
  for (const n of ['국민건강', '의료급여초심', '의료급여건생비'])
    expect(row(s, n)[9], n).toBe(false);
  expect(errors).toEqual([]);
});
