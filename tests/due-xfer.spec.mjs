// 예상 잔액 · 아직 안 정한 출금과 계좌 간 이체 (NAM-9 후속, 2026-09-29 요한).
// ★ 아직 안 정한 출금도 잔액 예측용 출금에 넣는다 — 추가 분류 없이 그래프가 나오게.
// ★ 여러 계좌를 합친 잔액에서, 포함된 두 계좌 사이 이체 후보(확인 전)는 넣지도 빼지도 않고 보류한다.
//   확인된 이체(「맞습니다」)는 뺀다. 계좌가 하나면 이체 후보가 없어 그 출금은 그대로 넣는다.
// ★ 사업 수입 · 지출 · 계좌 순이익이 안 바뀌는 것은 numbers.json 스냅샷(월별 값)이 지킨다.
import { test, expect } from '@playwright/test';
import { openApp, demoAsBankXlsx } from './helpers.mjs';

// 예시(국민) + 두 번째 은행. 두 번째 은행에 예시의 6월 첫 100만원 이상 출금과 같은 금액·시각의 입금을 넣는다
async function secondBank(page, base, n = 1) {
  const b64 = await page.evaluate(async (n) => {
    // 예시의 6월 100만원 이상 출금 앞에서부터 n건과 같은 금액 · 같은 시각의 입금을 넣는다
    const outs = DEMO_TX.map((s) => s.split('|'))
      .filter((f) => f[0].startsWith('06-') && +f[2] <= -1000000)
      .slice(0, n);
    /** @type {any[][]} */
    const rows = [['거래일시', '적요', '출금액', '입금액', '잔액']];
    let bal = 500000;
    bal -= 10000;
    rows.push([DEMO_YEAR + '-06-01 08:00:00', '관리비', 10000, 0, bal]);
    outs.forEach((out) => {
      bal += -out[2];
      rows.push([DEMO_YEAR + '-' + out[0], '이체입금', 0, -out[2], bal]);
    });
    bal -= 10000;
    rows.push([DEMO_YEAR + '-07-05 10:00:00', '관리비', 10000, 0, bal]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '거래내역');
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  }, n);
  return {
    name: '신한은행_거래내역.xlsx',
    mimeType: base.mimeType,
    buffer: Buffer.from(b64, 'base64')
  };
}

async function toResult(page, files) {
  await page.getByRole('button', { name: '식당' }).click();
  await page.locator('input[type=file]').first().setInputFiles(files);
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.getByPlaceholder('예: 1호점').fill('테스트식당');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByPlaceholder('예: 홍길동').fill('홍길동');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '파일 없이 직접 정하기' }).click();
  for (let k = 0; k < 20; k++) {
    const want = await page.evaluate(() => {
      const q = UP.queue[UP.pos];
      return (q && DEMO_PICKS[q.name]) || '기타';
    });
    const btn = page.locator('#up button:visible', { hasText: new RegExp(`^${want}$`) });
    await ((await btn.count()) ? btn : page.locator('#up button:visible', { hasText: /^기타$/ }))
      .first()
      .click();
  }
  await page.getByRole('button', { name: '결과 보기', exact: true }).click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
}

test('두 계좌 — 확인 전 이체 후보가 미분류면 보류, 확인하면 빼고 그래프가 나온다', async ({
  page
}) => {
  const errors = await openApp(page);
  const a = await demoAsBankXlsx(page);
  await toResult(page, [a, await secondBank(page, a)]);

  const r = await page.evaluate(() => {
    const p = findTransfers()[0];
    const rid = rowId(p.out);
    const g = UP.byName[keyOf(p.out)];
    const inFc = () => dueTable().지출줄.some((x) => x.rid === rid);
    const state = () => {
      dueFresh();
      const c = dueCard();
      return {
        held: !!(c && c.보류),
        heldHasIt: !!(c && c.보류 && c.보류.목록.some((x) => x.rid === rid)),
        inFc: inFc(),
        graph: !!(c && !c.보류 && c.예상 != null)
      };
    };
    // ① 이체 후보의 출금 쪽 거래처를 아직 안 정함으로 둔다 (확인 전)
    unsetCatQuiet(g);
    const 미분류후보 = state();
    // ② 대표님이 「맞습니다」 — 확인된 이체는 예측 출금에서 뺀다
    takeXfer([p]);
    const 확인 = state();
    // ③ 이체로 확인하지 않고 분류만 한 경우 — 요한 승인(2026-09-29): 분류와 상관없이 확인 전 후보는 보류
    dropXfer(p);
    setCatQuiet(g, '기타');
    const 분류 = state();
    unsetCatQuiet(g);
    return { 미분류후보, 확인, 분류 };
  });
  // 확인 전 후보: 합친 잔액에서 두 번 빠지지 않게 넣지 않고, 근거 없이 빼지도 않고 보류한다
  expect(r.미분류후보).toEqual({ held: true, heldHasIt: true, inFc: false, graph: false });
  // 확인된 이체: 빼고, 보류가 풀려 그래프가 나온다
  expect(r.확인).toEqual({ held: false, heldHasIt: false, inFc: false, graph: true });
  // 분류만 한 경우: 여전히 확인 전 후보라 예측 출금에 안 넣고 보류한다
  expect(r.분류).toEqual({ held: true, heldHasIt: true, inFc: false, graph: false });
  expect(errors).toEqual([]);
});

test('한 계좌 — 다른 계좌로 보낸 미분류 출금을 근거 없이 빼지 않고 예측 출금에 넣는다', async ({
  page
}) => {
  const errors = await openApp(page);
  await toResult(page, [await demoAsBankXlsx(page)]);
  const r = await page.evaluate(() => {
    const out = UP.rows.find((x) => x.at.slice(5, 7) === '06' && x.amount <= -1000000);
    const rid = rowId(out);
    unsetCatQuiet(UP.byName[keyOf(out)]);
    dueFresh();
    const c = dueCard();
    const 줄 = dueTable().지출줄.find((x) => x.rid === rid);
    return {
      후보: findTransfers().length,
      갈래: 줄 && 줄.갈래,
      held: !!(c && c.보류),
      미분류: c && c.미분류 ? c.미분류.건수 : 0
    };
  });
  expect(r.후보).toBe(0);
  expect(r.갈래).toBe('미분류');
  expect(r.held).toBe(false);
  expect(r.미분류).toBeGreaterThan(0);
  // 화면에도 추가 분류 없이 그래프와 안내가 선다
  await expect(page.locator('#up-result .duecard .duegraph svg')).toHaveCount(1);
  await expect(
    page.getByText(/아직 분류하지 않은 출금 [\d,]+건은 예상 출금에 넣었습니다/)
  ).toBeVisible();
  expect(errors).toEqual([]);
});

// NAM-9 배포 전 보완: 거래처를 하나도 정하지 않아도 결과를 볼 수 있다.
// 매출 입금이 모두 미분류면 예측 입금을 0원으로 두지 않고 예측만 보류한다 — 실적은 그대로 보인다
test('분류 0곳 — 결과로 갈 수 있고, 매출이 분류되지 않았으면 예측만 보류한다', async ({ page }) => {
  const errors = await openApp(page);
  const file = await demoAsBankXlsx(page);
  await page.getByRole('button', { name: '식당' }).click();
  await page.locator('input[type=file]').first().setInputFiles(file);
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.getByPlaceholder('예: 1호점').fill('테스트식당');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByPlaceholder('예: 홍길동').fill('홍길동');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '파일 없이 직접 정하기' }).click();
  await page.getByRole('button', { name: '분류는 나중에 하고 결과 보기' }).click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
  await expect(page.locator('#up-result .pnl').first()).toContainText('계좌 순이익');
  await expect(page.getByText(/은 위 숫자에 넣지 않았습니다/)).toBeVisible();

  // 자동으로 매출이 된 거래처를 미분류로 되돌린다 — 매출 입금이 모두 분류되지 않은 매장을 만든다
  const r = await page.evaluate(() => {
    UP.payees.forEach((g) => {
      if (g.cat === '매출' || g.catIn === '매출') unsetCatQuiet(g);
    });
    dueFresh();
    const c = dueCard();
    goMonth(UP.month);
    return { 입금보류: !!(c && c.입금보류), 건수: c && c.입금보류 ? c.입금보류.건수 : 0 };
  });
  expect(r.입금보류).toBe(true);
  expect(r.건수).toBeGreaterThan(0);
  await expect(
    page.getByText(
      /아직 매출로 확인된 입금이 없습니다\. 미분류 입금 [\d,]+건 중 매출이 있는지 확인해 주세요\./
    )
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '들어온 돈 확인하기' })).toBeVisible();
  await expect(page.locator('#up-result .duegraph')).toHaveCount(0);
  await expect(page.locator('#up-result .pnl').first()).toContainText('계좌 순이익');
  expect(errors).toEqual([]);
});

// NAM-9 요한 승인: 보류 사유가 여럿이면 함께 보이고, 자료 3개월 미만이면 예상 전체를 보류한다
test('보류 사유 여럿 · 자료 3개월 미만', async ({ page }) => {
  const errors = await openApp(page);
  const a = await demoAsBankXlsx(page);
  await toResult(page, [a, await secondBank(page, a)]);
  // 이체 후보(확인 전) + 매출 미분류 → 사유 둘
  await page.evaluate(() => {
    UP.payees.forEach((g) => {
      if (g.cat === '매출' || g.catIn === '매출') unsetCatQuiet(g);
    });
    goMonth(UP.month);
  });
  const card = page.locator('#up-result .duecard');
  await expect(card).toContainText('확인할 것이 2가지 있습니다.');
  await expect(card).toContainText(/계좌끼리 옮긴 돈인지 [\d,]+건을 확인해 주세요/);
  await expect(card).toContainText('아직 매출로 확인된 입금이 없습니다.');

  // 7 · 8월만 있는 자료 → 그래프 · 최저 · 종료일 예상 잔액을 함께 보류, 실적과 잔액은 그대로
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await openApp(page);
  await page.evaluate(() => {
    const keep = DEMO_TX.filter((s) => s.startsWith('07-') || s.startsWith('08-'));
    const drop = DEMO_TX.filter((s) => !(s.startsWith('07-') || s.startsWith('08-')));
    window.DEMO_OPEN += drop.reduce((x, s) => x + +s.split('|')[2], 0);
    window.DEMO_TX = keep;
  });
  await toResult(page, [await demoAsBankXlsx(page)]);
  const c2 = page.locator('#up-result .duecard');
  await expect(c2).toContainText('예상 잔액을 보려면 3개월 이상의 거래내역을 추가해 주세요.');
  await expect(c2).not.toContainText('만원');
  await expect(page.locator('#up-result .duegraph')).toHaveCount(0);
  await expect(page.locator('#up-result .pnl').first()).toContainText('계좌 순이익');
  await expect(page.locator('#up-result')).toContainText('8월 22일 계좌 잔액');
  expect(errors).toEqual([]);
});

// NAM-9 요한 승인: 이체 후보 한 쌍마다 「옮긴 돈입니다 / 아닙니다 / 나중에 확인」.
// 한 건씩 답하면 남은 수가 줄고, 「아님」은 분류를 안 바꾸며, 저장 · 재열기 뒤에도 남는다
test('이체 후보 2건 — 한 건씩 확인 · 고치기 · 저장 후 유지 · 옛 저장본', async ({ page }) => {
  const errors = await openApp(page);
  const a = await demoAsBankXlsx(page);
  await toResult(page, [a, await secondBank(page, a, 2)]);
  const hold = page.locator('#up-result .duecard');
  const 남은 = async () => {
    const t = await hold.innerText();
    const m = t.match(/계좌끼리 옮긴 돈인지 ([\d,]+)건을 확인해 주세요/);
    return m ? +m[1] : 0;
  };
  expect(await page.evaluate(() => findTransfers().length)).toBe(2);
  expect(await 남은()).toBe(2);

  await page.getByRole('button', { name: '계좌끼리 옮긴 돈 확인하기' }).click();
  const 답 = (i, name) =>
    page.locator('#up-result .xferbox .xfacts').nth(i).getByRole('button', { name, exact: true });

  // 첫 후보: 옮긴 돈입니다 → 남은 1건
  await 답(0, '계좌끼리 옮긴 돈입니다').click();
  expect(await 남은()).toBe(1);

  // 둘째 후보: 아닙니다 → 남은 0, 보류가 풀린다. 그 거래처의 분류는 그대로다
  const 전분류 = await page.evaluate(() => {
    const p = findTransfers()[1];
    const g = UP.byName[keyOf(p.out)];
    return g.cat || null;
  });
  await 답(1, '계좌끼리 옮긴 돈이 아닙니다').click();
  expect(await 남은()).toBe(0);
  await expect(page.locator('#up-result .duecard .duegraph svg')).toHaveCount(1);
  const 후 = await page.evaluate(() => {
    const ps = findTransfers();
    const g = UP.byName[keyOf(ps[1].out)];
    dueFresh();
    return {
      cat: g.cat || null,
      답: ps.map((p) => xferAnswer(p)),
      예측에들어감: dueTable().지출줄.some((x) => x.rid === rowId(ps[1].out))
    };
  });
  expect(후.cat).toBe(전분류); // 사업 지출로 자동 분류하지 않는다
  expect(후.답).toEqual(['yes', 'no']); // 한 쌍의 답이 다른 쌍에 번지지 않는다
  expect(후.예측에들어감).toBe(true); // 일반 거래 규칙으로 예측 출금에 들어간다

  // 잘못 눌렀으면 고친다 — 나중에 확인 → 다시 보류 1건
  await 답(1, '나중에 확인').click();
  expect(await 남은()).toBe(1);
  await 답(1, '계좌끼리 옮긴 돈이 아닙니다').click();
  expect(await 남은()).toBe(0);

  // 저장 · 재열기 뒤에도 두 답이 그대로다
  const 저장 = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('fc.picks.'));
    return { k, v: JSON.parse(localStorage.getItem(k)) };
  });
  expect(저장.v.xferNo.length).toBe(1);
  expect(저장.v.xferNo[0]).not.toMatch(/\d{6,}/); // 금액을 담지 않는다 (시각 · 행번호만 숫자)
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page
    .getByRole('button', { name: /테스트식당/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
  expect(await page.evaluate(() => findTransfers().map((p) => xferAnswer(p)))).toEqual([
    'yes',
    'no'
  ]);
  await expect(page.locator('#up-result .duecard .duegraph svg')).toHaveCount(1);

  // 옛 저장본(xferNo 칸 없음)도 열린다 — 「아님」 답만 없고 나머지는 그대로다
  await page.evaluate((k) => {
    const o = JSON.parse(localStorage.getItem(k));
    delete o.xferNo;
    localStorage.setItem(k, JSON.stringify(o));
  }, 저장.k);
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page
    .getByRole('button', { name: /테스트식당/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
  expect(await page.evaluate(() => findTransfers().map((p) => xferAnswer(p)))).toEqual([
    'yes',
    null
  ]);
  expect(await 남은()).toBe(1);

  // 마지막 후보를 처리해도 다른 보류 사유(매출 분류 없음)가 있으면 계속 보류
  await page.evaluate(() => {
    UP.payees.forEach((g) => {
      if (g.cat === '매출' || g.catIn === '매출') unsetCatQuiet(g);
    });
    markNotXfer(findTransfers()[1]);
    goMonth(UP.month);
  });
  expect(await 남은()).toBe(0);
  await expect(hold).toContainText('아직 매출로 확인된 입금이 없습니다.');
  await expect(page.locator('#up-result .duegraph')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// 입금 쪽 보류 안내 — 입금이 없을 때 · 입금이 모두 매출 밖일 때 「0건을 확인해 주세요」로 적지 않는다
test('입금 없음 · 입금 전부 매출 외', async ({ page }) => {
  const errors = await openApp(page);
  await toResult(page, [await demoAsBankXlsx(page)]);
  // 직전 30일 입금을 모두 매출 밖(사업 외 용도 → 「내가 넣은 돈」)으로 정한다
  await page.evaluate(() => {
    const c = dueCard();
    const t0 = Math.floor(Date.parse(c.오늘 + 'T00:00:00Z') / 86400000);
    UP.rows.forEach((r) => {
      const d = Math.floor(Date.parse(r.at.slice(0, 10) + 'T00:00:00Z') / 86400000);
      if (r.amount > 0 && d > t0 - 30 && d <= t0) setCatQuiet(UP.byName[keyOf(r)], '사업 외 용도');
    });
    goMonth(UP.month);
  });
  const card = page.locator('#up-result .duecard');
  await expect(card).toContainText(
    '직전 30일에 들어온 돈 가운데 매출로 분류한 거래가 없어 예상 입금을 계산할 수 없습니다.'
  );
  await expect(card).not.toContainText('0건');

  // 직전 30일 입금이 아예 없는 자료
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await openApp(page);
  await page.evaluate(() => {
    const keep = DEMO_TX.filter((s) => !(s >= '07-24' && +s.split('|')[2] > 0));
    window.DEMO_TX = keep;
  });
  await toResult(page, [await demoAsBankXlsx(page)]);
  await expect(page.locator('#up-result .duecard')).toContainText(
    '직전 30일에 들어온 돈이 없어 예상 입금을 계산할 수 없습니다.'
  );
  await expect(page.locator('#up-result .pnl').first()).toContainText('계좌 순이익');
  expect(errors).toEqual([]);
});
