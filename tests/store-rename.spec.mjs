// 매장 이름 바꾸기 (NAM-14 저장 실패 · NAM-15 이름 충돌).
// ★ 지키는 것 — 이름을 바꾸다 무엇이 실패해도 원래 매장의 자료는 한 글자도 안 사라진다.
//   이미 있는 다른 매장 이름을 넣으면 그 매장 자료를 덮어쓰지 않는다.
// 앞쪽은 저장소(localStorage)에 실패를 일부러 넣어 renameStore 를 부르는 단위 시험,
// 뒤쪽은 예시 거래로 만든 파일을 올려 실제 「저장」 단추를 누르는 화면 시험이다.
// 자료는 모두 지어낸 값이다 (실제 거래내역 아님).
import { test, expect } from '@playwright/test';
import { openApp, collectNumbers, asJson, demoAsBankXlsx, storageDump } from './helpers.mjs';

const J = (o) => JSON.stringify(o);
// 매장 「A」의 여섯 통 + 마지막 매장 표시 + 이름이 다른 매장 하나
const SEED = {
  'fc.picks.A': J({
    v: 1,
    store: 'A',
    owner: '홍길동',
    picks: { 가나상회: '식자재' },
    cv: 3,
    n곳: 1,
    순번: 1
  }),
  'fc.manual.A': J({
    v: 2,
    items: [{ id: 'm1', name: '현금 매출', side: 'in' }],
    amounts: { '2026-08': { m1: 120000 } },
    days: {}
  }),
  'fc.banks.A': J({ '국민|거래내역': '국민 주거래' }),
  'fc.data.A': J({
    dv: 1,
    저장일: '2026-09-20',
    store: 'A',
    owner: '홍길동',
    banks: [
      {
        name: '국민',
        rows: [{ at: '2026-08-01', payee: '가나상회', amount: -5000, balance: 95000 }]
      }
    ]
  }),
  'fc.plan.A': J({ v: 1, items: [{ id: 'p1', name: '월세', amt: -800000, day: 25 }] }),
  'nd_lastrun.A': '2026-09-20',
  'fc.last': 'A',
  'fc.picks.다른매장': J({ v: 1, store: '다른매장', picks: {} })
};
const KINDS = ['fc.picks.', 'fc.manual.', 'fc.banks.', 'fc.data.', 'fc.plan.', 'nd_lastrun.'];

// 저장소를 SEED 로 채우고, 이름 바꾸는 동안에만 실패를 넣을 수 있게 저장소 함수를 감싼다
/**
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, string>} [seed]
 * @param {object} [up]
 */
async function arm(page, seed = SEED, up = { store: 'A', owner: '홍길동', demo: false }) {
  await page.evaluate(
    ({ seed, up }) => {
      localStorage.clear();
      for (const k in seed) localStorage.setItem(k, seed[k]);
      UP = up;
      const P = Storage.prototype;
      const orig = { setItem: P.setItem, getItem: P.getItem, removeItem: P.removeItem };
      const w = /** @type {any} */ (window);
      w.__on = false;
      w.__rules = [];
      w.__calls = [];
      for (const op of Object.keys(orig)) {
        P[op] = function (k, v) {
          if (w.__on) {
            const n = w.__calls.filter((c) => c.op === op).length + 1;
            w.__calls.push({ op, k });
            for (const r of w.__rules) {
              if (r.op !== op) continue;
              if (r.key && !new RegExp(r.key).test(k)) continue;
              if (r.nth && r.nth !== n) continue;
              // 쓴 것과 다른 값이 남는 경우 (다시 읽어 맞춰 보기가 잡아야 한다)
              if (r.mode === 'corrupt') return orig.setItem.call(this, k, String(v).slice(0, 3));
              throw new DOMException('막힘', 'QuotaExceededError');
            }
          }
          return orig[op].call(this, k, v);
        };
      }
      w.__rename = (a, b, owner, rules) => {
        w.__rules = rules || [];
        w.__calls = [];
        w.__on = true;
        let r;
        try {
          r = renameStore(a, b, owner);
        } finally {
          w.__on = false;
        }
        return { r: r || null, calls: w.__calls, store: UP.store, owner: UP.owner };
      };
    },
    { seed, up }
  );
}
const rename = (page, a, b, owner, rules) =>
  page.evaluate(
    ({ a, b, owner, rules }) => /** @type {any} */ (window).__rename(a, b, owner, rules),
    {
      a,
      b,
      owner,
      rules
    }
  );
const raw = (page) =>
  page.evaluate(() => {
    const out = {};
    Object.keys(localStorage).forEach((k) => (out[k] = localStorage.getItem(k)));
    return out;
  });
const targets = (dump, name) => KINDS.filter((p) => p + name in dump);

test.describe('renameStore — 저장소 수준', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('충돌 없는 이동 — 여섯 통 · 분석일 · 안쪽 이름 · 마지막 매장 표시', async ({ page }) => {
    await arm(page);
    const { r, store } = await rename(page, 'A', 'B', '김철수');
    expect(r).toMatchObject({ ok: true, warn: false });
    expect(store).toBe('B');
    const d = await raw(page);
    expect(targets(d, 'A')).toEqual([]);
    expect(targets(d, 'B')).toEqual(KINDS);
    // 금액 · 분류 · 판 번호는 그대로, 안쪽 이름과 성함만 새 것
    const picks = JSON.parse(d['fc.picks.B']);
    expect(picks).toEqual(
      Object.assign(JSON.parse(SEED['fc.picks.A']), { store: 'B', owner: '김철수' })
    );
    const data = JSON.parse(d['fc.data.B']);
    expect(data).toEqual(
      Object.assign(JSON.parse(SEED['fc.data.A']), { store: 'B', owner: '김철수' })
    );
    for (const p of ['fc.manual.', 'fc.banks.', 'fc.plan.', 'nd_lastrun.'])
      expect(d[p + 'B']).toBe(SEED[p + 'A']);
    expect(d['fc.last']).toBe('B');
    expect(d['fc.picks.다른매장']).toBe(SEED['fc.picks.다른매장']);
  });

  test('마지막 매장 표시가 다른 매장을 가리키면 그대로 둔다', async ({ page }) => {
    await arm(page, Object.assign({}, SEED, { 'fc.last': '다른매장' }));
    const { r } = await rename(page, 'A', 'B', '홍길동');
    expect(r).toMatchObject({ ok: true });
    expect((await raw(page))['fc.last']).toBe('다른매장');
  });

  // NAM-14 — 쓰기가 어디서 실패해도 원본은 그대로, 새 이름 자리는 비운다
  const writeFails = {
    '첫 쓰기': [{ op: 'setItem', nth: 1 }],
    '세 번째 쓰기': [{ op: 'setItem', nth: 3 }],
    '여섯 번째 쓰기': [{ op: 'setItem', nth: 6 }],
    '모든 쓰기': [{ op: 'setItem' }],
    '쓴 뒤 다시 읽으니 값이 다름': [{ op: 'setItem', key: '^fc\\.data\\.B$', mode: 'corrupt' }],
    '마지막 매장 표시 쓰기': [{ op: 'setItem', key: '^fc\\.last$' }]
  };
  for (const [name, rules] of Object.entries(writeFails)) {
    test(`저장 실패 (${name}) — 원본 보존 · 새 자리 정리 · 이름 그대로`, async ({ page }) => {
      await arm(page);
      const { r, store, owner } = await rename(page, 'A', 'B', '김철수', rules);
      expect(r).toMatchObject({ ok: false, why: 'write', warn: false });
      expect(store).toBe('A');
      expect(owner).toBe('홍길동');
      expect(await raw(page)).toEqual(SEED);
    });
  }

  // 읽지 못하면 「없다」로 치지 않는다 — 쓰기 · 지우기를 시작하지 않는다
  const readFails = {
    '원본 읽기': '^fc\\.plan\\.A$',
    '새 이름 자리 읽기': '^fc\\.manual\\.B$',
    '마지막 매장 표시 읽기': '^fc\\.last$'
  };
  for (const [name, key] of Object.entries(readFails)) {
    test(`읽기 실패 (${name}) — 아무것도 쓰거나 지우지 않는다`, async ({ page }) => {
      await arm(page);
      const { r, calls, store } = await rename(page, 'A', 'B', '홍길동', [{ op: 'getItem', key }]);
      expect(r).toMatchObject({ ok: false, why: 'read' });
      expect(calls.filter((c) => c.op !== 'getItem')).toEqual([]);
      expect(store).toBe('A');
      expect(await raw(page)).toEqual(SEED);
    });
  }

  test('실패 뒤 새 자리 정리도 실패 — 원본 보존 · 경고 · 다음 시도는 남은 조각을 덮지 않는다', async ({
    page
  }) => {
    await arm(page);
    const first = await rename(page, 'A', 'B', '홍길동', [
      { op: 'setItem', nth: 3 },
      { op: 'removeItem', key: '\\.B$' }
    ]);
    expect(first.r).toMatchObject({ ok: false, why: 'write', warn: true });
    expect(first.store).toBe('A');
    const d = await raw(page);
    for (const k in SEED) expect(d[k]).toBe(SEED[k]);
    const left = targets(d, 'B');
    expect(left.length).toBeGreaterThan(0);
    // 남은 조각은 「이미 있는 자료」다 — 다시 해도 덮어쓰지 않고 멈춘다
    const again = await rename(page, 'A', 'B', '홍길동');
    expect(again.r).toMatchObject({ ok: false, why: 'taken' });
    expect(await raw(page)).toEqual(d);
  });

  test('다 옮긴 뒤 옛 이름 지우기 실패 — 새 자료는 그대로 두고 경고', async ({ page }) => {
    await arm(page);
    const { r, store } = await rename(page, 'A', 'B', '홍길동', [
      { op: 'removeItem', key: '\\.A$' }
    ]);
    expect(r).toMatchObject({ ok: true, warn: true });
    expect(store).toBe('B');
    const d = await raw(page);
    expect(targets(d, 'B')).toEqual(KINDS);
    expect(targets(d, 'A')).toEqual(KINDS);
    expect(d['fc.manual.B']).toBe(SEED['fc.manual.A']);
  });

  test('옮긴 거래내역으로 다시 열면 새 이름이 살아난다', async ({ page }) => {
    await arm(page);
    await rename(page, 'A', 'B', '김철수');
    const back = await page.evaluate(() => {
      const o = loadData('B');
      return o && [o.store, o.owner];
    });
    expect(back).toEqual(['B', '김철수']);
  });

  // NAM-15 — 새 이름 자리에 무엇이든 있으면 멈춘다. 빈 글자 · 깨진 JSON 도 자료다
  for (const p of KINDS) {
    for (const [what, v] of [
      ['자료', SEED[p + 'A']],
      ['빈 글자', ''],
      ['깨진 JSON', '{깨짐']
    ]) {
      test(`이름 충돌 (${p}B 에 ${what}) — 두 매장 모두 그대로`, async ({ page }) => {
        const seed = Object.assign({}, SEED, { [p + 'B']: v });
        await arm(page, seed);
        const { r, calls, store, owner } = await rename(page, 'A', 'B', '김철수');
        expect(r).toMatchObject({ ok: false, why: 'taken' });
        expect(calls.filter((c) => c.op !== 'getItem')).toEqual([]);
        expect([store, owner]).toEqual(['A', '홍길동']);
        expect(await raw(page)).toEqual(seed);
      });
    }
  }

  test('같은 저장 이름 — 앞뒤 공백 · 기본 이름은 옮기지도 지우지도 않는다', async ({ page }) => {
    await arm(page);
    const same = await rename(page, 'A', '  A ', '홍길동');
    expect(same.r).toMatchObject({ ok: true, why: 'same' });
    expect(same.calls.filter((c) => c.op !== 'getItem')).toEqual([]);
    expect(await raw(page)).toEqual(SEED);

    const base = { 'fc.picks.(기본)': SEED['fc.picks.A'], 'fc.manual.(기본)': SEED['fc.manual.A'] };
    await arm(page, base, { store: '', owner: null, demo: false });
    const def = await rename(page, '', '(기본)', null);
    expect(def.r).toMatchObject({ ok: true, why: 'same' });
    expect(await raw(page)).toEqual(base);
  });

  test('원본에 일부 통만 있으면 있는 것만 옮긴다', async ({ page }) => {
    const seed = { 'fc.picks.A': SEED['fc.picks.A'], 'fc.manual.A': SEED['fc.manual.A'] };
    await arm(page, seed);
    const { r } = await rename(page, 'A', 'B', '홍길동');
    expect(r).toMatchObject({ ok: true });
    const d = await raw(page);
    expect(Object.keys(d).sort()).toEqual(['fc.manual.B', 'fc.picks.B']);
    expect(d['fc.manual.B']).toBe(SEED['fc.manual.A']);
  });

  test('안쪽 이름을 바꿔야 하는 자료가 깨졌으면 옮기지 않는다', async ({ page }) => {
    const seed = Object.assign({}, SEED, { 'fc.data.A': '{깨짐' });
    await arm(page, seed);
    const { r, store } = await rename(page, 'A', 'B', '홍길동');
    expect(r).toMatchObject({ ok: false });
    expect(store).toBe('A');
    expect(await raw(page)).toEqual(seed);
  });

  test('예시 화면에서 이름을 바꿔도 같은 이름의 실제 매장 자료는 그대로', async ({ page }) => {
    const seed = {};
    for (const k in SEED) seed[k.replace(/\.A$/, '.예시 사업장')] = SEED[k];
    await arm(page, seed, { store: '예시 사업장', owner: null, demo: true });
    const { r, calls, store } = await rename(page, '예시 사업장', 'B', null);
    expect(r).toMatchObject({ ok: true });
    expect(store).toBe('B');
    expect(calls).toEqual([]);
    expect(await raw(page)).toEqual(seed);
  });
});

// ── 화면 — 예시 거래로 만든 은행 파일을 올려 실제 저장 매장을 만든 뒤 이름 고치기 화면으로 간다
const STORE = '테스트식당';
async function makeStore(page) {
  const file = await demoAsBankXlsx(page);
  const up = '#up';
  await page.getByRole('button', { name: '식당' }).click();
  await page.locator('input[type=file]').first().setInputFiles(file);
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.getByPlaceholder('예: 1호점').fill(STORE);
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByPlaceholder('예: 홍길동').fill('홍길동');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '파일 없이 직접 정하기' }).click();
  for (let k = 0; k < 20; k++) {
    const want = await page.evaluate(() => {
      const q = UP.queue[UP.pos];
      return (q && DEMO_PICKS[q.name]) || '기타';
    });
    const btn = page.locator(`${up} button:visible`, { hasText: new RegExp(`^${want}$`) });
    await ((await btn.count()) ? btn : page.locator(`${up} button:visible`, { hasText: /^기타$/ }))
      .first()
      .click();
  }
  await page.getByRole('button', { name: '결과 보기', exact: true }).click();
  const dueBtn = page
    .locator(`${up} button:visible`)
    .filter({ hasText: /^(확인|이대로 보기|결과 보기|다음)$/ });
  if (await dueBtn.count()) await dueBtn.first().click();
  await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
  // 분석일은 결과 화면을 그린 날에 찍힌다 — 옮기는 대상에 들어 있는지 보려고 확인해 둔다
  expect((await storageDump(page))['nd_lastrun.' + STORE]).toBe('2026-09-23');
}
async function openNamesPanel(page) {
  await page.locator('.rstorebtn').click();
  await expect(page.locator('#up-cats .nminput').first()).toBeVisible();
}
const nameInputs = (page) => page.locator('#up-cats .nminput');

test.describe('이름 고치기 화면', () => {
  test('정상 변경 — 결과로 돌아가고, 새로고침 뒤 새 이름으로 이어 보면 숫자가 같다', async ({
    page
  }) => {
    const errors = await openApp(page);
    await makeStore(page);
    const numbers = asJson(await collectNumbers(page));
    await openNamesPanel(page);
    await nameInputs(page).nth(0).fill('새식당');
    await nameInputs(page).nth(1).fill('김철수');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect(page.locator('.rstorebtn')).toHaveText('새식당');

    const d = await storageDump(page);
    for (const p of ['fc.picks.', 'fc.data.', 'nd_lastrun.']) {
      expect(p + '새식당' in d).toBe(true);
      expect(p + STORE in d).toBe(false);
    }
    expect([d['fc.data.새식당'].store, d['fc.data.새식당'].owner]).toEqual(['새식당', '김철수']);

    await page.reload();
    await page.locator('#splash').waitFor({ state: 'detached' });
    await page
      .getByRole('button', { name: /새식당/ })
      .first()
      .click();
    await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
    expect(await page.evaluate(() => [UP.store, UP.owner])).toEqual(['새식당', '김철수']);
    expect(asJson(await collectNumbers(page))).toBe(numbers);
    expect(errors).toEqual([]);
  });

  for (const width of [390, 1280]) {
    test(`저장 실패 (${width}px) — 편집 화면 · 입력값 · 자료 모두 그대로, 안내가 보인다`, async ({
      page
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors = await openApp(page);
      await makeStore(page);
      await openNamesPanel(page);
      const before = await storageDump(page);
      await nameInputs(page).nth(0).fill('새식당');
      await nameInputs(page).nth(1).fill('김철수');
      await page.evaluate(() => {
        Storage.prototype.setItem = function () {
          throw new DOMException('막힘', 'QuotaExceededError');
        };
      });
      await page.getByRole('button', { name: '저장', exact: true }).click();
      await expect(page.getByText('이름을 바꾸지 못했습니다.', { exact: false })).toBeVisible();
      await expect(nameInputs(page).nth(0)).toHaveValue('새식당');
      await expect(nameInputs(page).nth(1)).toHaveValue('김철수');
      expect(await page.evaluate(() => [UP.store, UP.owner])).toEqual([STORE, '홍길동']);
      expect(await storageDump(page)).toEqual(before);
      expect(errors).toEqual([]);
    });
  }

  test('옛 이름 정리 실패 — 새 이름으로 바뀌고 경고가 남으며, 새로고침 뒤 새 이름으로 열린다', async ({
    page
  }) => {
    const errors = await openApp(page);
    await makeStore(page);
    await openNamesPanel(page);
    await nameInputs(page).nth(0).fill('새식당');
    await page.evaluate(() => {
      Storage.prototype.removeItem = function () {
        throw new DOMException('막힘', 'SecurityError');
      };
    });
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect(
      page.getByText('새 이름으로 자료를 저장했습니다.', { exact: false })
    ).toBeVisible();
    await expect(nameInputs(page).nth(0)).toHaveValue('새식당');
    expect(await page.evaluate(() => UP.store)).toBe('새식당');
    const d = await storageDump(page);
    expect('fc.data.새식당' in d && 'fc.data.' + STORE in d).toBe(true);

    await page.reload();
    await page.locator('#splash').waitFor({ state: 'detached' });
    await page
      .getByRole('button', { name: /새식당/ })
      .first()
      .click();
    await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
    expect(await page.evaluate(() => UP.store)).toBe('새식당');
    expect(errors).toEqual([]);
  });

  test('이름 충돌 — 다른 매장 자료를 덮지 않고 다른 이름을 여쭙는다', async ({ page }) => {
    const errors = await openApp(page);
    await makeStore(page);
    await page.evaluate(() => localStorage.setItem('fc.manual.다른식당', '{"v":2}'));
    await openNamesPanel(page);
    const before = await storageDump(page);
    await nameInputs(page).nth(0).fill('다른식당');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect(page.getByText('이미 저장된', { exact: false })).toBeVisible();
    await expect(nameInputs(page).nth(0)).toHaveValue('다른식당');
    expect(await page.evaluate(() => UP.store)).toBe(STORE);
    expect(await storageDump(page)).toEqual(before);
    expect(errors).toEqual([]);
  });
});
