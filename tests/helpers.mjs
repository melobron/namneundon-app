// 안전망 테스트 공통 도구.
// 앱은 모든 함수를 전역(window)에 두므로, 테스트는 그 함수를 직접 불러 숫자를 모은다.
// ★ 리팩토링으로 함수가 모듈 안으로 들어가면 collectNumbers 만 고치면 된다.
import { expect } from '@playwright/test';

// 앱이 오늘 날짜를 쓰는 곳이 있다 (진행 중인 달, 목표일 등). 날마다 결과가 달라지지 않게 고정한다
export const FIXED_NOW = new Date('2026-09-23T10:00:00+09:00');

export async function openApp(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.setFixedTime(FIXED_NOW);
  // 저장 id 에 Math.random 이 쓰인다. 같은 순서의 난수가 나오도록 씨앗을 고정한다
  await page.addInitScript(() => {
    let s = 20260923;
    Math.random = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '예시 먼저 보기' })).toBeVisible();
  // 첫 인사 화면(#splash)은 약 2초 뒤 스스로 지워진다. 남아 있으면 화면 글자에 섞인다
  await page.locator('#splash').waitFor({ state: 'detached' });
  return errors;
}

// 화면에 보이는 글자. 빌드 딱지(판 번호)는 회차마다 바뀌므로 뺀다
export async function screenText(page, selector = 'body') {
  return page.evaluate((sel) => {
    const stamp = document.getElementById('buildstamp');
    const hidden = stamp && stamp.style.display;
    if (stamp) stamp.style.display = 'none';
    const t = document.querySelector(sel).innerText;
    if (stamp) stamp.style.display = hidden;
    return t.replace(/[ \t]+\n/g, '\n').trim() + '\n';
  }, selector);
}

// 지금 화면(UP)에 올라 있는 자료로 계산한 숫자 전부
export async function collectNumbers(page) {
  return page.evaluate(() => {
    const months = monthList();
    const noRows = (o) => { const c = Object.assign({}, o); delete c.rows; return c; };
    const t = dueTable();
    const last = t ? t.days.length - 1 : -1;
    const due = (i) => { try { return dueProject(t, i, DUE_DEFAULT); } catch (e) { return 'ERR ' + e.message; } };
    return {
      verify: {
        rows: UP.rows.length, opening: UP.opening, closing: UP.closing,
        breaks: (UP.breaks || []).length, moved: UP.moved || 0,
        patched: UP.patched || 0, unsure: UP.unsure || 0,
      },
      // [이름, 건수, 합계, 항목, 자동 분류 여부]
      payees: UP.payees.map((g) => [g.name, g.n, g.net, g.cat == null ? null : g.cat, g.auto == null ? null : g.auto]),
      months: months.map((m) => Object.assign(noRows(monthNumbers(m)), {
        endBalance: monthEndBalance(m), closeBalance: monthCloseBalance(m),
      })),
      forecastError: ASOF_DAYS.map((d) => [d, forecastError(months, d)]),
      forecastAsOf: months.map((m) => ASOF_DAYS.map((d) => forecastAsOf(months, m, d))),
      salesProjection: months.map((m) => salesProjection(months, m)),
      nowBalance: nowBalance(),
      transfers: findTransfers(),
      due: last < 0 ? null : {
        days: t.days.length,
        last: due(last), twoThirds: due(Math.floor(last * 0.66)), oneThird: due(Math.floor(last * 0.33)),
      },
    };
  });
}

export const asJson = (o) => JSON.stringify(o, null, 1) + '\n';

// 예시 거래 2,363건을 은행 엑셀 양식으로 만든다 (실제 은행 파일이 없을 때의 대역).
// 앱에 이미 들어 있는 SheetJS 로 만들어 브라우저에서 파일로 올린다
export async function demoAsBankXlsx(page) {
  const b64 = await page.evaluate(async () => {
    await loadSheetJS();
    const rows = [['거래일시', '적요', '출금액', '입금액', '잔액']];
    let bal = DEMO_OPEN;
    DEMO_TX.forEach((s) => {
      const f = s.split('|'), a = +f[2];
      bal += a;
      rows.push([DEMO_YEAR + '-' + f[0], f[1], a < 0 ? -a : 0, a > 0 ? a : 0, bal]);
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '거래내역');
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  });
  return {
    name: '국민은행_거래내역.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(b64, 'base64'),
  };
}

// 브라우저 저장소(localStorage) 전체. 사용자 자료가 저장되는 곳이다
export async function storageDump(page) {
  return page.evaluate(() => {
    const out = {};
    Object.keys(localStorage).sort().forEach((k) => {
      const v = localStorage.getItem(k);
      try { out[k] = JSON.parse(v); } catch { out[k] = v; }
    });
    return out;
  });
}
