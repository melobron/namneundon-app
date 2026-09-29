/* 계산은 core/compute.js 의 monthListIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function monthList() {
  return monthListIn(UP);
}

/* 계산은 core/compute.js 의 sideMapIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function sideMap() {
  return sideMapIn(UP);
}
/* 계산은 core/compute.js 의 sideOfIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function sideOf(cat, isIn) {
  return sideOfIn(UP, cat, isIn);
}
/* 계산은 core/compute.js 의 catOfIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function catOf(r) {
  return catOfIn(UP, r);
}
/* 계산은 core/compute.js 의 isUnknownIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function isUnknown(r) {
  return isUnknownIn(UP, r);
}

/* 계산은 core/compute.js 의 monthNumbersIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function monthNumbers(m, cutDay) {
  return monthNumbersIn(UP, m, cutDay);
}

/* 계산은 core/compute.js 의 xferKeyIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function xferKey(r) {
  return xferKeyIn(UP, r);
}

/* 계산은 core/compute.js 의 findTransfersIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function findTransfers() {
  return findTransfersIn(UP);
}
/* 계산은 core/compute.js 의 xferOnIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function xferOn(r) {
  return xferOnIn(UP, r);
}
/* ★ 57차 ⑦. 이체로 빼면 사업 지출이 줄어든다. 하루 표를 다시 만든다 */
function takeXfer(pairs) {
  if (UP) UP.__due = null;
  UP.xfer = UP.xfer || {};
  pairs.forEach(function (p) {
    UP.xfer[rowId(p.out)] = 1;
    UP.xfer[rowId(p.into)] = 1;
    if (UP.xferNo) delete UP.xferNo[xferPairIdIn(UP, p)]; /* 두 답은 함께 설 수 없다 */
    xferCarryDrop(p);
  });
  savePicks(); /* 37차 6번. 다음 달에 또 안 누르시게 */
}
function dropXfer(p) {
  if (UP) UP.__due = null;
  if (!UP.xfer) return;
  delete UP.xfer[rowId(p.out)];
  delete UP.xfer[rowId(p.into)];
  savePicks();
}
/* ── NAM-9 요한 승인 · 이체 후보 한 쌍의 세 가지 답 ─────────────────────────
   「계좌끼리 옮긴 돈입니다」 = takeXfer · 「계좌끼리 옮긴 돈이 아닙니다」 = markNotXfer ·
   「나중에 확인」 = clearXferAnswer (확인 전으로 되돌린다 — 잘못 누른 답을 고치는 길이기도 하다).
   ★ 「아닙니다」는 분류를 건드리지 않는다. 사업 지출로 자동 분류하지 않는다 */
function markNotXfer(p) {
  if (UP) UP.__due = null;
  if (UP.xfer) {
    delete UP.xfer[rowId(p.out)];
    delete UP.xfer[rowId(p.into)];
  }
  UP.xferNo = UP.xferNo || {};
  UP.xferNo[xferPairIdIn(UP, p)] = 1;
  xferCarryDrop(p);
  savePicks();
}
function clearXferAnswer(p) {
  if (UP) UP.__due = null;
  if (UP.xfer) {
    delete UP.xfer[rowId(p.out)];
    delete UP.xfer[rowId(p.into)];
  }
  if (UP.xferNo) delete UP.xferNo[xferPairIdIn(UP, p)];
  xferCarryDrop(p);
  savePicks();
}
/* 한 쌍이 지금 어느 답인가 — 'yes' · 'no' · null(확인 전) */
function xferAnswer(p) {
  if (xferOn(p.out)) return 'yes';
  if (xferNoIn(UP, p)) return 'no';
  return null;
}
/* ── 저장 · 되살리기 (검증방 지적 보완) ─────────────────────────────────
   저장 칸: xferOk(옮긴 돈입니다) · xferNo(아닙니다) — 둘 다 쌍 저장 키 목록. 금액 없음.
   옛 칸 xfer(줄 키: 날짜 | 은행 이름 | 행번호)는 옛 판과 맞추려고 계속 쓴다.
   ★ 지금 자료에 없는 쌍의 답(다른 달 파일 등)은 들고 있다가 그대로 다시 남긴다 (UP.xferCarry*).
   ★ 지금 자료의 쌍에 새로 답하면 그 쌍의 저장 키는 들고 있던 것에서 지운다 — 새 답이 이긴다 */
function xferCarryDrop(p) {
  var k = xferPairKeyIn(UP, p);
  if (UP.xferCarryOk) delete UP.xferCarryOk[k];
  if (UP.xferCarryNo) delete UP.xferCarryNo[k];
}
/* ★ 검증방 지적 (2026-09-29 세 번째). 파일 이름으로는 계좌를 가를 수 없어, fc.picks 에는 새 답을 더 남기지 않는다.
   예전 판이 남긴 키만 버리지 않고 그대로 들고 간다 (옛 판과의 호환). 이 키로는 아무것도 되살리지 않는다 */
function xferSavedKeys(yes) {
  var out = {},
    carry = (yes ? UP.xferCarryOk : UP.xferCarryNo) || {},
    k;
  for (k in carry) if (Object.prototype.hasOwnProperty.call(carry, k)) out[k] = 1;
  return Object.keys(out).sort();
}
function xferOkKeys() {
  return UP ? xferSavedKeys(true) : [];
}
function xferNoKeys() {
  return UP ? xferSavedKeys(false) : [];
}
/* 저장통 · 불러온 분류 파일의 이체 답 — 새로 읽은 파일에는 붙이지 않는다 (검증방 지적 2026-09-29 세 번째).
   ① xferOk · xferNo: 파일 이름 · 시트 이름 · 은행 이름이 같아도 다른 계좌일 수 있어 자동 적용하지 않는다.
      키는 버리지 않고 들고 있다가 그대로 다시 남긴다. 새 파일에서는 이체 후보를 다시 묻는다.
   ② 옛 줄 키(xfer)도 같다 — 자동으로 적용하지 않고 들고만 있다.
   ★ 같은 저장 자료를 그대로 다시 열 때는 applyXferFromData 가 그 자료의 쌍 ID 로 되살린다.
   ★ 원본 거래 · 분류는 건드리지 않는다 */
function applyXferSaved(o) {
  if (!UP || !o) return;
  var ok = Array.isArray(o.xferOk) ? o.xferOk : null,
    no = Array.isArray(o.xferNo) ? o.xferNo : [];
  UP.xfer = UP.xfer || {};
  UP.xferNo = UP.xferNo || {};
  UP.xferCarryOk = UP.xferCarryOk || {};
  UP.xferCarryNo = UP.xferCarryNo || {};
  var 예 = {},
    아니오 = {};
  (ok || []).forEach(function (k) {
    if (typeof k === 'string' && k) 예[k] = 1;
  });
  no.forEach(function (k) {
    if (typeof k === 'string' && k) 아니오[k] = 1;
  });
  var k;
  for (k in 예) if (Object.prototype.hasOwnProperty.call(예, k)) UP.xferCarryOk[k] = 1;
  for (k in 아니오) if (Object.prototype.hasOwnProperty.call(아니오, k)) UP.xferCarryNo[k] = 1;
  /* ② 옛 줄 키(xfer: 날짜 | 은행 이름 | 행번호)에는 계좌를 가를 정보가 없다 — 은행 이름은 같은 은행 계좌가 둘이면
     올린 차례로 붙은 「국민은행 1 · 2」다. 검증방 지적대로 자동으로 적용하지 않고 다시 묻는다.
     키는 버리지 않고 들고 있다가 그대로 다시 남긴다 (옛 판과의 호환) */
  UP.xferCarryLegacy = UP.xferCarryLegacy || {};
  if (Array.isArray(o.xfer))
    o.xfer.forEach(function (x) {
      if (typeof x === 'string' && x) UP.xferCarryLegacy[x] = 1;
    });
}
/* ── 같은 저장 자료를 다시 열 때만 되살리는 이체 답 (검증방 지적 2026-09-29 세 번째) ──────────
   이 기기의 거래내역 저장통(fc.data)에 지금 후보 쌍의 답을 쌍 ID(두 줄의 rowId)로 함께 남긴다.
   ★ 쌍 ID 는 그 저장 자료의 줄을 그대로 가리킨다 — 같은 자료를 다시 열면 같은 줄이 같은 ID 로 돌아온다.
   ★ 새 파일을 읽거나 보태면 저장 자료가 새로 쓰이므로, 그때는 답이 따라가지 않고 다시 묻는다.
   ★ fc.data 는 이미 금액 · 잔액을 담는 이 기기 전용 통이다. 계좌번호는 넣지 않는다 */
function xferDataAnswers() {
  var ok = [],
    no = [];
  if (UP && UP.rows)
    findTransfers().forEach(function (p) {
      var 답 = xferAnswer(p);
      if (답 === 'yes') ok.push(xferPairIdIn(UP, p));
      else if (답 === 'no') no.push(xferPairIdIn(UP, p));
    });
  return { ok: ok.sort(), no: no.sort() };
}
function applyXferFromData(x) {
  if (!UP || !x) return 0;
  var 예 = {},
    아니오 = {},
    n = 0;
  (Array.isArray(x.ok) ? x.ok : []).forEach(function (k) {
    if (typeof k === 'string') 예[k] = 1;
  });
  (Array.isArray(x.no) ? x.no : []).forEach(function (k) {
    if (typeof k === 'string') 아니오[k] = 1;
  });
  UP.xfer = UP.xfer || {};
  UP.xferNo = UP.xferNo || {};
  findTransfers().forEach(function (p) {
    var id = xferPairIdIn(UP, p);
    if (예[id] && 아니오[id]) return;
    if (예[id]) {
      UP.xfer[rowId(p.out)] = 1;
      UP.xfer[rowId(p.into)] = 1;
      n++;
    } else if (아니오[id]) {
      UP.xferNo[id] = 1;
      n++;
    }
  });
  UP.__due = null;
  return n;
}
/* 계산은 core/compute.js 의 xferKeysIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e).
   ★ 들고 있던 옛 줄 키도 같이 남긴다 — 자동으로 쓰지는 않지만 지우지도 않는다 */
function xferKeys() {
  var out = {};
  xferKeysIn(UP).forEach(function (k) {
    out[k] = 1;
  });
  Object.keys((UP && UP.xferCarryLegacy) || {}).forEach(function (k) {
    out[k] = 1;
  });
  return Object.keys(out).sort();
}
/* 계산은 core/compute.js 의 bankNameIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function bankName(i) {
  return bankNameIn(UP, i);
}

/* 계산은 core/compute.js 의 lastDayInIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function lastDayIn(m) {
  return lastDayInIn(UP, m);
}
/* 계산은 core/compute.js 의 isRunningIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function isRunning(m, months) {
  return isRunningIn(UP, m, months);
}

var FC_MAX_ERR = 0.08; /* 되돌려 재봤을 때 이보다 많이 틀리면 안 보여준다 */

/* 계산은 core/compute.js 의 fcUsableIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function fcUsable(r) {
  return fcUsableIn(UP, r);
}

/* 계산은 core/compute.js 의 dowInflowIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function dowInflow(endMs) {
  return dowInflowIn(UP, endMs);
}

/* 계산은 core/compute.js 의 domOutflowIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function domOutflow(months, m, back) {
  return domOutflowIn(UP, months, m, back);
}

/* 계산은 core/compute.js 의 forecastSpanIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function forecastSpan(months, m, fromM, fromDay, toDay, endMs) {
  return forecastSpanIn(UP, months, m, fromM, fromDay, toDay, endMs);
}

/* 계산은 core/compute.js 의 accCountIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function accCount() {
  return accCountIn(UP);
}
/* 계산은 core/compute.js 의 balanceSumIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function balanceSum(upto) {
  return balanceSumIn(UP, upto);
}
/* 계산은 core/compute.js 의 balanceAtIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function balanceAt(m, cutDay) {
  return balanceAtIn(UP, m, cutDay);
}
/* 계산은 core/compute.js 의 monthEndBalanceIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function monthEndBalance(m) {
  return monthEndBalanceIn(UP, m);
}
/* 계산은 core/compute.js 의 monthCloseBalanceIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function monthCloseBalance(m) {
  return monthCloseBalanceIn(UP, m);
}
/* 계산은 core/compute.js 의 lateAccountsIn — 지금 매장(UP)을 넘긴다 (B-9) */
function lateAccounts(m) {
  return lateAccountsIn(UP, m);
}
/* 계산은 core/compute.js 의 monthOpenBalanceIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function monthOpenBalance(m, rowsInMonth) {
  return monthOpenBalanceIn(UP, m, rowsInMonth);
}
/* 계산은 core/compute.js 의 nowBalanceIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function nowBalance() {
  return nowBalanceIn(UP);
}

/* 계산은 core/compute.js 의 salesProjectionIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function salesProjection(months, m) {
  return salesProjectionIn(UP, months, m);
}

/* ── 시점 비교 ──
   비교하려고 이전 파일을 보관할 필요가 없다. 이번 파일 하나로
   「그날 섰다면 뭐라고 했을까」를 되돌려 계산한다 */
var ASOF_DAYS = [1, 10, 20];

/* 계산은 core/compute.js 의 forecastAsOfIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function forecastAsOf(months, m, cutDay) {
  return forecastAsOfIn(UP, months, m, cutDay);
}

/* 계산은 core/compute.js 의 forecastErrorIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function forecastError(months, cutDay) {
  return forecastErrorIn(UP, months, cutDay);
}

/* 계산은 core/compute.js 의 baseNameIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function baseName(orig) {
  return baseNameIn(UP, orig);
}
/* 계산은 core/compute.js 의 sayCatIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function sayCat(c) {
  return sayCatIn(UP, c);
}
/* 바깥 기준(보통 20~40% 같은 것)은 없앴다 — 우리 데이터가 아니다.
   매출 1천만원 넘는 74개 달 중 20개(27%)가 그 밖이었고,
   매장별 중앙값도 30.9~36.6%로 흩어진다. 이 앱은 그 가게 자기 데이터로만 말한다 */
var RATIO_RULES = [
  {
    id: 'food+drink',
    cats: ['식자재', '주류·음료'],
    label: '식자재와 주류·음료를 합한 금액',
    row: '식자재'
  },
  { id: 'drink', cats: ['주류·음료'], label: '주류·음료', row: '주류·음료' },
  { id: 'labor', cats: ['인건비'], label: '인건비', row: '인건비' },
  { id: 'rent', cats: ['월세'], label: '월세', row: '월세' },
  { id: 'util', cats: ['전기·가스·수도'], label: '전기·가스·수도', row: '전기·가스·수도' }
];

/* 계산은 core/compute.js 의 catSumIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function catSum(d, origs) {
  return catSumIn(UP, d, origs);
}

/* 계산은 core/compute.js 의 topPayeeIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function topPayee(d, cat) {
  return topPayeeIn(UP, d, cat);
}

var OWN_GAP = 0.1; /* 평균과 이만큼(%p) 벌어져야 말한다 */

/* 계산은 core/compute.js 의 ratioMonthsIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function ratioMonths(m, months, cutDay) {
  return ratioMonthsIn(UP, m, months, cutDay);
}

/* 계산은 core/compute.js 의 ownBucketsIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function ownBuckets(cats, m, months, stats) {
  return ownBucketsIn(UP, cats, m, months, stats);
}

/* 묶음을 못 만들 때는 경고 대신 사실 한 줄.
   「보통 20~40%」는 우리 데이터가 아니다 —
   매출 1천만원 넘는 74개 달 중 20개(27%)가 그 밖이고,
   매장별 중앙값도 30.9~36.6%로 흩어진다. 이 앱은 그 가게 자기 데이터로만 말한다 */
function ratioFacts(d, m, months) {
  var out = {};
  if (d.sales <= 0 || ratioMuted(d)) return out;
  var cutDay = isRunning(m, months) ? lastDayIn(m) : null;
  var stats = ratioMonths(m, months, cutDay);
  RATIO_RULES.forEach(function (r) {
    var v = catSum(d, r.cats) / d.sales;
    if (v <= 0) return;
    if (ownBuckets(r.cats, m, months, stats)) return; /* 견줄 수 있으면 경고가 맡는다 */
    var needMore = Math.max(1, OWN_MIN_MONTHS - stats.ok.length);
    out[r.row] =
      spanWord(m, cutDay) +
      ' ' +
      r.label +
      neun(r.label) +
      ' 매출의 ' +
      pctStr(v) +
      '입니다. ' +
      needMore +
      '개월치가 더 쌓이면 ' +
      BIZ.주인 +
      ' 평소와 견줘드립니다.';
  });
  return out;
}
/* ★ 60차 ⑤. endBoost 를 걷어냈다 — 부르는 곳이 없어졌다.
   자리는 위 drawResultInner 의 주석에 적어뒀다 */

/* 계산은 core/compute.js 의 zeroSpanMonthsIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function zeroSpanMonths(cats, m, months, cutDay) {
  return zeroSpanMonthsIn(UP, cats, m, months, cutDay);
}

function ratioWarnings(d, m, months) {
  var out = [],
    zeros = [];
  if (d.sales <= 0) return out;
  /* 아직 안 찍은 게 많으면 모든 비율이 낮게 나온다. 비율 이야기를 통째로 접고
     먼저 찍어달라는 한 장만 남긴다 */
  if (ratioMuted(d)) {
    out.push({
      id: 'unset',
      cat: null,
      go: true,
      title: '아직 안 정한 거래가 사업에 쓴 돈의 ' + pctStr(unknownCostShare(d)) + '입니다.',
      body: '먼저 정해주시면 비율을 봐드릴 수 있습니다.'
    });
    return out;
  }

  var food = catSum(d, ['식자재']),
    drink = catSum(d, ['주류·음료']);
  var swapped = food === 0 && drink / d.sales >= 0.2;

  if (swapped) {
    var fn = baseName('식자재'),
      dn = baseName('주류·음료');
    out.push({
      id: 'swap',
      cat: dn,
      title:
        fn + ga(fn) + ' 0원인데 ' + dn + ga(dn) + ' 매출의 ' + pctStr(drink / d.sales) + '입니다.',
      body: '두 항목이 서로 바뀐 것으로 보입니다.'
    });
  }

  var cutDay = isRunning(m, months) ? lastDayIn(m) : null;
  var stats = ratioMonths(m, months, cutDay);
  RATIO_RULES.forEach(function (r) {
    if (swapped && (r.id === 'drink' || r.id === 'food+drink')) return;
    var v = catSum(d, r.cats) / d.sales;
    if (v === 0) {
      zeros.push(r);
      return;
    } /* 0원짜리는 따로 다룬다 */
    var b = ownBuckets(r.cats, m, months, stats);
    if (!b) return; /* 견줄 게 없으면 아무 말도 안 한다 */
    if (Math.abs(b.cur - b.avg) < OWN_GAP) return;
    var body =
      '3개월씩 묶어 보면 ' +
      BIZ.주인 +
      ' ' +
      r.label +
      neun(r.label) +
      ' 매출의 ' +
      pct1(b.lo.ratio) +
      ' ~ ' +
      pct1(b.hi.ratio) +
      ' 사이였습니다. ' +
      '가장 높았던 건 ' +
      b.hi.label +
      '(' +
      pct1(b.hi.ratio) +
      '), ' +
      '가장 낮았던 건 ' +
      b.lo.label +
      '(' +
      pct1(b.lo.ratio) +
      ')입니다.';
    /* 달마다 훨씬 더 벌어지면 그 사실도 알려준다 —
       그 출렁임은 원가가 아니라 대금을 언제 냈는가다 */
    if (b.mspread > b.spread * 2) {
      body +=
        '  달마다는 ' +
        pct1(b.mlo) +
        '에서 ' +
        pct1(b.mhi) +
        '까지 벌어지는데, 대금을 몰아 내신 달과 미룬 달이 섞여 있습니다.';
    }
    if (stats.skipped.length) {
      body +=
        '  매출이 적었던 ' +
        stats.skipped.length +
        '개월(' +
        stats.skipped
          .map(function (x) {
            return x.slice(0, 4) + '년 ' + +x.slice(5, 7) + '월';
          })
          .join(' · ') +
        ')은 비율 계산에서 뺐습니다.';
    }
    body += '  확인해보시겠어요?';
    out.push({
      id: r.id,
      cat: baseName(r.cats[r.cats.length - 1]),
      title: spanWord(m, cutDay) + ' ' + r.label + ga(r.label) + ' 매출의 ' + pctStr(v) + '입니다.',
      body: body
    });
  });
  /* 0원일 수 없는 항목은 한 장씩 짚어준다 — 「다 찍으세요」보다 훨씬 빠르다.
     0원이라는 사실만 말한다. 「보통 매출의 20~30%」는 우리 데이터가 아니다.
     이번 달만 보면 헛방이 많아 석 달을 본다 (zeroSpanMonths) */
  zeros.forEach(function (r) {
    var span = zeroSpanMonths(r.cats, m, months, cutDay);
    if (!span) return;
    var cat = baseName(r.cats[r.cats.length - 1]);
    out.push({
      id: 'zero:' + r.id,
      cat: null,
      find: cat,
      title: spanLabel(span) + ' 석 달 동안 ' + cat + '로 정하신 거래처가 한 곳도 없습니다.',
      body: d.unknownN ? '아직 안 정한 거래 중에 있을 수 있습니다.' : ''
    });
  });

  /* 「적자입니다. 맞나요?」 카드는 없앴다.
     1~22일 기준으로 77% 발동했고(한 달 전체는 55%), 원인은 원가율 44.4%와 같다 —
     매출은 월말까지 들어오는데 지출은 5·10일에 몰린다.
     게다가 이 카드는 못 정한 거래의 범위를 안 봐서, 순이익 블록이
     「아직 말씀드릴 수 없습니다」라고 할 때도 혼자 적자라고 단정했다.
     실제로 순이익 +24,705,930원인 달에 이 카드가 적자라고 한 경우가 있었다.
     순이익 블록이 같은 말을 더 정확하게 하고 있어 지운다 */

  Object.keys(d.cats).forEach(function (k) {
    if (k === UNSET) return; /* 아직 안 찍은 것을 잘못 찍었다고 하면 안 된다 */
    if (d.cost > 0 && d.cats[k] / d.cost > 0.5) {
      out.push({
        id: 'half:' + k,
        cat: k,
        title: k + ga(k) + ' 사업에 쓴 돈 총액의 ' + pctStr(d.cats[k] / d.cost) + '를 차지합니다.',
        body: '한 항목에 몰려 있습니다. 잘못 정한 거래처가 있는지 봐주세요.'
      });
    }
  });
  return out;
}

/* 계산은 core/compute.js 의 payeeSumsIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function payeeSums(m) {
  return payeeSumsIn(UP, m);
}
/* 계산은 core/compute.js 의 cardSkippedIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function cardSkipped(name) {
  return cardSkippedIn(UP, name);
}

/* 계산은 core/compute.js 의 autoKnownIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function autoKnown(name) {
  return autoKnownIn(UP, name);
}
/* 계산은 core/compute.js 의 payeeByMonthIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function payeeByMonth(name) {
  return payeeByMonthIn(UP, name);
}
/* 계산은 core/compute.js 의 farAboveUsualIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function farAboveUsual(name, m, abs) {
  return farAboveUsualIn(UP, name, m, abs);
}

/* 계산은 core/compute.js 의 newPayeesIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function newPayees(d, m, months) {
  return newPayeesIn(UP, d, m, months);
}
/* 계산은 core/compute.js 의 grownPayeesIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function grownPayees(d, m, months) {
  return grownPayeesIn(UP, d, m, months);
}
