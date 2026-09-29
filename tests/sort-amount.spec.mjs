// 금액 큰 순서 (2026-09-29 요한 확정).
// ★ 「사업으로 번 돈」 「사업에 쓴 돈」의 항목별 · 거래처별 목록은 지금 고른 기간의 합계(절댓값)가 큰 순서.
// ★ 항목 분류 화면의 물을 차례는 입금 · 출금을 상계하지 않은 절댓값 합계가 큰 순서. 같으면 예전 차례.
// ★ 정렬만 바꾼다 — 숫자는 numbers.json 스냅샷이 지킨다. 날짜별 거래와 그래프의 시간순은 그대로다.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';
import { loadCore } from './core/load-core.mjs';

const core = loadCore();
const num = (s) => +String(s).replace(/[^0-9]/g, '') || 0;

/** 펼친 한쪽(번 돈 · 쓴 돈) 아래 들여쓴 항목 줄의 [이름, 금액] — 다음 굵은 줄에서 멈춘다 */
async function sideRows(page, cls) {
  return page.evaluate((cls) => {
    const out = [];
    let n = document.querySelector('#up-result .' + cls);
    while ((n = n && n.nextElementSibling)) {
      if (n.classList.contains('bigrow') || n.classList.contains('res')) break;
      if (!n.classList.contains('orow') || !n.classList.contains('tapx')) continue;
      if (n.querySelector('.keeptag')) continue;
      out.push([
        n.querySelector('.lab').firstChild.textContent.trim(),
        n.querySelector('.v').textContent
      ]);
    }
    return out;
  }, cls);
}
function expectDesc(vals) {
  for (let i = 1; i < vals.length; i++) expect(vals[i - 1]).toBeGreaterThanOrEqual(vals[i]);
}

for (const 달 of ['마지막 달', '앞선 달'])
  test(
    '결과 화면 — 번 돈 · 쓴 돈의 항목과 거래처가 금액 큰 순서 (' + 달 + ')',
    async ({ page }) => {
      await openApp(page);
      await page.getByRole('button', { name: '예시 먼저 보기' }).click();
      await expect(page.getByRole('button', { name: '1년' })).toBeVisible();
      if (달 === '앞선 달') {
        // 기간을 바꿔도 그 기간의 합계로 다시 줄을 세운다 — 달 고르기에서 셋째 달을 고른다
        const sel = page.locator('#up-result select').first();
        const vals = await sel
          .locator('option')
          .evaluateAll((os) => os.map((o) => /** @type {HTMLOptionElement} */ (o).value));
        await sel.selectOption(vals[2]);
        await expect(sel).toHaveValue(vals[2]);
      }
      await page.locator('#up-result .mspend').click();
      const 쓴 = await sideRows(page, 'mspend');
      expect(쓴.length).toBeGreaterThan(3);
      expectDesc(쓴.map((r) => num(r[1])));
      // 예전 고정 차례와 다르다 (예시에서 실제로 순서가 바뀌는지)
      const 고정 = await page.evaluate(() => UP.accounts.slice());
      const 예전 = 쓴
        .map((r) => r[0])
        .slice()
        .sort((a, b) => 고정.indexOf(a) - 고정.indexOf(b));
      expect(쓴.map((r) => r[0])).not.toEqual(예전);

      // 가장 큰 항목을 펴면 거래처도 금액 큰 순서
      await page.locator('#up-result .orow.tapx', { hasText: 쓴[0][0] }).first().click();
      const 거래처 = await page.locator('#up-result .dtl .drow .dv').allTextContents();
      expect(거래처.length).toBeGreaterThan(1);
      expectDesc(거래처.map(num));

      await page.locator('#up-result .minearn').click();
      const 번 = await sideRows(page, 'minearn');
      expectDesc(번.map((r) => num(r[1])));
    }
  );

test('항목 분류 — 입출금이 섞인 거래처는 상계하지 않은 절댓값 합계로, 같으면 예전 차례', () => {
  const rows = [
    { payee: '가 출금만', amount: -100000, at: '2026-06-01' },
    { payee: '나 섞임', amount: 60000, at: '2026-06-02' },
    { payee: '나 섞임', amount: -50000, at: '2026-06-03' },
    { payee: '다 입금만', amount: 30000, at: '2026-06-04' },
    { payee: '라 출금만', amount: -30000, at: '2026-06-05' }
  ];
  const g = core.groupPayeesWith(rows, {});
  const q = core.orderQueue(g).map((x) => x.name);
  // 섞임: 상계하면 1만원이라 맨 뒤지만, 절댓값 합계 11만원이라 맨 앞
  expect(q).toEqual(['나 섞임', '가 출금만', '다 입금만', '라 출금만']);
});

test('결과 화면 거래처 목록 — 출금은 음수여도 절댓값 큰 순서, 같으면 먼저 나온 차례', () => {
  const U = { byName: {}, merge: {}, picks: {} };
  const d = {
    rows: [
      { payee: 'A', amount: -20000, at: '2026-06-01' },
      { payee: 'B', amount: -90000, at: '2026-06-02' },
      { payee: 'C', amount: -20000, at: '2026-06-03' }
    ]
  };
  // 항목 판정은 모두 같은 항목으로 본다
  const saved = core.catOfIn;
  core.catOfIn = () => '식자재';
  try {
    const l = core.catPayeesIn(U, d, '식자재');
    expect(l.map((e) => e.name)).toEqual(['B', 'A', 'C']);
  } finally {
    core.catOfIn = saved;
  }
});

test('1년 표 — 펼친 세부 줄도 이 기간 합계가 큰 순서', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: '예시 먼저 보기' }).click();
  await page.getByRole('button', { name: '1년' }).click();
  await page.locator('#up-result tr.yrin .rh').click({ position: { x: 6, y: 8 } });
  await expect(page.locator('#up-result tr.yrin .rh')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#up-result tr.yrout .rh').click({ position: { x: 6, y: 8 } });
  await expect(page.locator('#up-result tr.yrout .rh')).toHaveAttribute('aria-expanded', 'true');
  const 표 = await page.evaluate(() => {
    const 줄 = (sel) =>
      [...document.querySelectorAll('#up-result ' + sel)].map((tr) => {
        const tds = [...tr.querySelectorAll('td')].slice(1);
        const 칸 = tds.slice(0, -1).map((td) => +td.textContent.replace(/[^0-9]/g, '') || 0);
        return [tr.querySelector('.rh').textContent.trim(), 칸.reduce((a, b) => a + b, 0)];
      });
    return {
      번: 줄('tr.keeprow2').filter((r) => r[0] === '매출' || r[0] === '그 밖의 입금'),
      쓴: 줄('tr.yrsub')
    };
  });
  expect(표.번.length).toBeGreaterThan(0);
  expect(표.쓴.length).toBe(2);
  for (const l of [표.번, 표.쓴]) expectDesc(l.map((r) => r[1]));
});

test('묶음을 되돌리면 빠졌던 거래처는 남은 목록에 금액순으로 돌아간다', () => {
  const q = [
    { name: '지금', abs: 900 },
    { name: '다', abs: 500 },
    { name: '라', abs: 100 }
  ];
  // 지금 보는 것(0번) 뒤에만 끼운다 — 금액이 더 커도 이미 물은 자리 앞으로 가지 않는다
  core.queueInsertByAmount(q, 1, { name: '나', abs: 700 });
  core.queueInsertByAmount(q, 1, { name: '마', abs: 50 });
  core.queueInsertByAmount(q, 1, { name: '가', abs: 5000 });
  core.queueInsertByAmount(q, 1, { name: '라2', abs: 100 });
  expect(q.map((x) => x.name)).toEqual(['지금', '가', '나', '다', '라', '라2', '마']);
});
