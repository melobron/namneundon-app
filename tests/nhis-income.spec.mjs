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
