// 병원·치과·약국 공단 입금 시험 자료 — 이름만 실제 은행 표기다. 금액·날짜는 합성이다.
//   이름 출처: 2026-10-15 약사 파일럿 1명의 은행 표기 (이름만 받았다. 거래내역 파일은 받지 않았다)
//     공단 조제료 입금 「국민건강가지급」「국민건강초심」 · 의료급여 입금 「의료급여건생비」「의료급여초심」
//     보험료 출금 「YYMM국민건강」「YYMM국민연금」「YYMM고용보험」「YYMM산재보험」
//   「건보」는 요청서 5번이 확인하라고 적은 표기다 (실제 은행 표기로 확인된 것은 아니다).
//   그 밖의 이름(비씨카드·의약품도매A·건물주A·직원A)은 합성이다.
export const NHIS_OPEN = 30000000;

export function nhisRows() {
  /** @type {[string, string, number][]} */
  const tx = [];
  const months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  // 카드 매출 — 일요일을 뺀 날마다 (9월은 22일까지)
  for (const m of months) {
    const last = m === '2026-09' ? 22 : new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
    for (let d = 1; d <= last; d++) {
      const at = `${m}-${String(d).padStart(2, '0')}`;
      if (new Date(at + 'T00:00:00Z').getUTCDay() === 0) continue;
      tx.push([at + ' 18:00:00', '비씨카드', 700000]);
    }
  }
  months.forEach((m, i) => {
    const ym = m.slice(2, 4) + m.slice(5, 7);
    // 공단 입금 (합성 금액)
    tx.push([`${m}-15 10:00:00`, '국민건강가지급', 18000000 + i * 100000]);
    if (m !== '2026-09') tx.push([`${m}-25 10:00:00`, '국민건강초심', 2500000 + i * 10000]);
    tx.push([`${m}-18 10:00:00`, '의료급여건생비', 900000 + i * 1000]);
    if (m !== '2026-09') tx.push([`${m}-20 10:00:00`, '의료급여초심', 300000 + i * 1000]);
    // 보험료 출금 — 년월이 앞에 붙는다
    tx.push([`${m}-10 09:00:00`, ym + '국민건강', -700000]);
    tx.push([`${m}-10 09:01:00`, ym + '국민연금', -600000]);
    tx.push([`${m}-10 09:02:00`, ym + '고용보험', -120000]);
    tx.push([`${m}-10 09:03:00`, ym + '산재보험', -30000]);
    // 일반 지출 (합성 이름)
    tx.push([`${m}-05 11:00:00`, '의약품도매A', -9000000]);
    tx.push([`${m}-19 11:00:00`, '의약품도매A', -8000000]);
    tx.push([`${m}-01 11:00:00`, '건물주A', -3000000]);
    tx.push([`${m}-11 11:00:00`, '직원A', -2800000]);
  });
  // 보험료 환급으로 볼 만한 입금 — 출금과 같은 표기로 들어온 경우 (합성: 실제 환급 표기는 받지 못했다)
  tx.push(['2026-08-30 10:00:00', '2608국민건강', 150000]);
  tx.push(['2026-08-30 10:01:00', '2608국민연금', 80000]);
  tx.push(['2026-09-05 10:00:00', '건보', 200000]);
  tx.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return tx;
}

// 엑셀 한 장(거래일시·적요·출금액·입금액·잔액)으로 만든다 — 브라우저 안에서 SheetJS 로 쓴다
export async function nhisXlsx(page, tx = nhisRows()) {
  const b64 = await page.evaluate(
    async ({ tx, open }) => {
      await loadSheetJS();
      /** @type {any[][]} */
      const rows = [['거래일시', '적요', '출금액', '입금액', '잔액']];
      let bal = open;
      tx.forEach(([at, name, a]) => {
        bal += a;
        rows.push([at, name, a < 0 ? -a : 0, a > 0 ? a : 0, bal]);
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '거래내역');
      return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    },
    { tx, open: NHIS_OPEN }
  );
  return {
    name: '국민은행_거래내역.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(b64, 'base64')
  };
}

// 업종 타일을 누르고 파일을 올려 거래처 확인 화면까지 간다
// owner: false — 성함을 이미 저장해 둔 매장이라 묻지 않는 경우
export async function startWith(page, trade, file, store = '테스트약국', owner = true) {
  await page.getByRole('button', { name: trade, exact: true }).click();
  await page.locator('input[type=file]').first().setInputFiles(file);
  await page.getByRole('button', { name: '이 파일들로 시작하기' }).click();
  await page.getByPlaceholder('예: 1호점').fill(store);
  await page.getByRole('button', { name: '다음', exact: true }).click();
  if (owner) {
    await page.getByPlaceholder('예: 홍길동').fill('홍길동');
    await page.getByRole('button', { name: '다음', exact: true }).click();
  }
  const choose = page.getByRole('button', { name: '파일 없이 직접 정하기' });
  if (await choose.count()) await choose.click();
}

// 지금 거래처 상태: [이름, 원본 표기, 섞임, cat, auto, catIn, autoIn, catOut, autoOut, 줄에 있음]
export async function payeeState(page) {
  return page.evaluate(() =>
    UP.payees.map((g) => [
      g.name,
      g.rawList.join('·'),
      !!g.mixed,
      g.cat || null,
      !!g.auto,
      g.catIn || null,
      !!g.autoIn,
      g.catOut || null,
      !!g.autoOut,
      UP.queue.indexOf(g) !== -1
    ])
  );
}

// 일반 지출 거래처를 대표님이 정한 것처럼 찍는다 (공단 입금은 건드리지 않는다)
export async function pickOthers(page) {
  await page.evaluate(() => {
    const want = { 의약품도매A: '의약품 매입', 건물주A: '임차료', 직원A: '인건비' };
    UP.payees.forEach((g) => {
      const c = want[g.name];
      if (!c) return;
      if (g.mixed) {
        gSetCat(g, true, c, false);
        gSetCat(g, false, c, false);
      } else gSetCat(g, null, c, false);
    });
    UP.queue = buildQueue(false);
    savePicks();
  });
}

// 달마다 매출 · 그 밖의 입금 · 아직 안 정한 입금 · 매입 비율, 그리고 예상 잔액 카드의 들어올 돈
export async function nhisNumbers(page) {
  return page.evaluate(() => {
    UP.__due = null;
    const months = monthList();
    const per = months.map((m) => {
      const d = monthNumbers(m);
      const food = (d.cats[baseName('식자재')] || 0) + (d.cats[baseName('주류·음료')] || 0);
      return {
        m,
        매출: d.sales,
        그밖입금: d.otherIn,
        미정입금: d.uIn,
        들어온돈: d.inTotal,
        나간돈: d.outTotal,
        비율: d.sales > 0 ? Math.round((food / d.sales) * 10000) / 100 : null
      };
    });
    const c = dueCard();
    return {
      per,
      잔액: nowBalance(),
      예상: c
        ? {
            들어올: c.들어올 === undefined ? null : c.들어올,
            나갈: c.나갈 === undefined ? null : c.나갈,
            보류: !!c.보류,
            입금보류: !!c.입금보류,
            자료보류: !!c.자료보류,
            예상: c.예상 === undefined ? null : c.예상
          }
        : null
    };
  });
}
