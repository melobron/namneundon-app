// 거래처 분류 중 「○○도 같은 곳인가요?」 — 이름이 비슷한 거래처를 묶을지 묻는 카드.
// 결과 화면 정리(B-4) 때 이 카드를 그리는 부분(drawAskCard)을 떼어냈다. 분류하다 조건이 맞아야 나와서 여기서 지킨다.
import { test, expect } from '@playwright/test';
import { openApp, screenText } from './helpers.mjs';

test('비슷한 이름의 거래처를 묶을지 묻는 카드', async ({ page }) => {
  await openApp(page);
  // 예시 거래 + 「가장 큰 출금 거래처」 이름 앞에 지점명을 붙인 거래 세 건 — 이름이 겹치는 곳(similarPayees).
  //   앞 네 글자가 같으면 처음부터 한 줄로 묶여(bundleFor) 이 카드가 안 나오므로 앞에 붙인다
  const b64 = await page.evaluate(async () => {
    await loadSheetJS();
    /** @type {any[][]} */
    const rows = [['거래일시', '적요', '출금액', '입금액', '잔액']];
    const out = {};
    DEMO_TX.forEach((s) => {
      const f = s.split('|');
      if (+f[2] < 0) out[f[1]] = (out[f[1]] || 0) - +f[2];
    });
    // 앞 네 글자가 다른 거래처와 겹치지 않는 곳 — 겹치면 묶음(pickBundle)으로 물어 이 카드가 안 나온다
    const names = Object.keys(out);
    const top = names
      .filter((n) => !names.some((m) => m !== n && m.slice(0, 4) === n.slice(0, 4)))
      .sort((a, b) => out[b] - out[a])[0];
    let bal = DEMO_OPEN;
    DEMO_TX.forEach((s) => {
      const f = s.split('|'),
        a = +f[2];
      bal += a;
      rows.push([DEMO_YEAR + '-' + f[0], f[1], a < 0 ? -a : 0, a > 0 ? a : 0, bal]);
    });
    // 작은 곳은 묻지 않고 넘기므로(36차 F) 세 달에 걸쳐 나가게 한다 — 「매달 나가는 곳」은 계속 묻는다
    ['10-05', '11-05', '12-05'].forEach((d) => {
      bal -= 100000;
      rows.push([DEMO_YEAR + '-' + d + ' 23:00:00', '강남 ' + top, 100000, 0, bal]);
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '거래내역');
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  });
  const file = {
    name: '국민은행_거래내역.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(b64, 'base64')
  };
  await page.getByRole('button', { name: '식당' }).click();
  await page.locator('input[type=file]').first().setInputFiles(file);
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.getByPlaceholder('예: 1호점').fill('테스트식당');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByPlaceholder('예: 홍길동').fill('홍길동');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '파일 없이 직접 정하기' }).click();

  // 예시 정답표대로 고르다가 카드가 나오면 멈춘다
  let asked = false;
  for (let k = 0; k < 40 && !asked; k++) {
    const want = await page.evaluate(() => {
      const q = UP.queue[UP.pos];
      return (q && DEMO_PICKS[q.name]) || '기타';
    });
    const btn = page.locator('#up button:visible', { hasText: new RegExp(`^${want}$`) });
    await ((await btn.count()) ? btn : page.locator('#up button:visible', { hasText: /^기타$/ }))
      .first()
      .click();
    asked = await page.evaluate(() => !!UP.ask);
  }
  expect(asked).toBe(true);
  await expect(page.locator('.askcard')).toBeVisible();
  expect(await screenText(page, '.askcard')).toMatchSnapshot('ask-card.txt');
});
