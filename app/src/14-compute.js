/* ── 결과 ── */
function monthOf(at) {
  return at.slice(0, 7);
}

function monthList() {
  var seen = {},
    out = [];
  UP.rows.forEach(function (r) {
    var m = monthOf(r.at);
    if (!seen[m]) {
      seen[m] = 1;
      out.push(m);
    }
  });
  out.sort();
  return out;
}

/* ── 57차 ② · 63차 2·3 · 짝지어진 항목은 줄의 방향이 이긴다 ────────
   「대출」은 계산 밖이고 「대출 상환」은 지출이다. 한쪽만 계산 밖이라
   항목 이름 하나로는 두 방향을 다 담을 수 없다.
   어느 것으로 정하시든 들어온 줄은 「대출」, 나간 줄은 「대출 상환」이다.
   개인 돈도 같다 — 「사업 외 용도」로 정하시면
   들어온 줄은 「내가 넣은 돈」, 나간 줄은 「내가 가져간 돈」이 된다.
   ★ 63-4 에서 한 거래처에 항목 하나만 고르게 되었으므로, 방향을 가르는 일은
     전부 여기 한 곳에서 한다.
   ★ 이름을 고쳐 쓰고 계셔도 따라간다 — baseName 으로 표를 세운다.
     baseCats 가 바뀔 때만 다시 세운다 (줄마다 다섯 번씩 견주지 않게) */
var SIDE_MAP = null,
  SIDE_MAP_KEY = null;
function sideMap() {
  var k = UP && UP.baseCats ? UP.baseCats.join('|') : '';
  if (SIDE_MAP_KEY === k && SIDE_MAP) return SIDE_MAP;
  var m = {};
  Object.keys(KEEP_SIDE).forEach(function (c) {
    m[baseName(c)] = { 입금: baseName(KEEP_SIDE[c]['입금']), 출금: baseName(KEEP_SIDE[c]['출금']) };
  });
  SIDE_MAP = m;
  SIDE_MAP_KEY = k;
  return m;
}
function sideOf(cat, isIn) {
  var m = sideMap()[cat];
  return m ? m[isIn ? '입금' : '출금'] : cat;
}
function catOf(r) {
  /* 아직 안 정한 것은 어느 항목에도 넣지 않고 따로 둔다.
     섞인 거래처는 그 거래가 들어온 쪽인지 나간 쪽인지로 항목이 갈린다 (35차 B) */
  var c = gCatFor(UP.byName[keyOf(r)], r.amount > 0);
  if (!c) return UNSET;
  return sideOf(c, r.amount > 0);
}
function isUnknown(r) {
  return !gCatFor(UP.byName[keyOf(r)], r.amount > 0);
}

/* cutDay 를 주면 그 날짜까지만 센다.
   진행 중인 달을 지난달 전체와 견주면 22일치를 31일치와 비교하게 된다 */
function monthNumbers(m, cutDay) {
  var rows = UP.rows.filter(function (r) {
    return monthOf(r.at) === m && (!cutDay || +r.at.slice(8, 10) <= cutDay);
  });
  var sales = 0,
    keep = 0,
    keepParts = {},
    cats = {};
  var unknown = 0,
    unknownN = 0,
    volume = 0,
    unkPayees = {},
    uOut = 0,
    uIn = 0;
  /* 들어온 돈·나간 돈은 통장 합계와 정확히 같아야 한다.
     지출을 「매출 − 순증」으로 거꾸로 구하면 매출 아닌 입금이 지출을 깎아버린다 */
  var inTotal = 0,
    outTotal = 0,
    otherIn = 0,
    otherInPayees = {};
  /* 매출로 찍힌 항목에도 출금이 있다 (카드 취소·손님 환불).
     d.sales 는 그것을 뺀 순액이라 「들어온 돈 = 매출 + 그 밖의 입금」이 안 맞는다.
     화면에서 더해 보이려면 통장에 실제로 들어온 쪽을 따로 들고 있어야 한다 */
  var salesIn = 0,
    salesOut = 0,
    keepIn = 0,
    keepOut = 0;
  var keepInParts = {},
    keepOutParts = {};
  rows.forEach(function (r) {
    var c = catOf(r);
    volume += Math.abs(r.amount);
    if (r.amount > 0) inTotal += r.amount;
    else outTotal += -r.amount;
    /* 적힌 금액이 맞다고 하신 거래의 설명 안 되는 차액 — 손익에 섞지 않는다.
       ★ 아직 안 정한 거래에도 차액은 있을 수 있어 안 정한 것보다 먼저 센다 */
    if (r.residual) {
      keep += -r.residual;
      keepParts['확인 필요'] = (keepParts['확인 필요'] || 0) + -r.residual;
    }
    if (isUnknown(r)) {
      unknown += Math.abs(r.amount);
      unknownN++;
      unkPayees[keyOf(r)] = (unkPayees[keyOf(r)] || 0) + Math.abs(r.amount);
      if (r.amount < 0) uOut += -r.amount;
      else uIn += r.amount;
      /* ★ 35차 E. 아직 안 정한 돈은 매출에도 지출에도 넣지 않는다.
         예전에는 나간 것은 지출로, 들어온 것은 그 밖의 입금으로 들어가
         사장님이 아무것도 안 정하셨는데도 순이익이 이미 깎여 있었다 */
      return;
    }
    /* ★ 36차 4단계. 계좌 간 이체는 계좌에는 오갔지만 사업의 매출·지출이 아니다.
       한 계좌에서 나가 다른 계좌로 들어온 같은 돈이라, 안 빼면 양쪽 다 잡혀
       매출과 지출이 같이 부풀어 오른다 (실파일 8월 매출 599만원).
       ★ 거래처 항목과 상관없이 줄 단위로 가른다 — 같은 거래처에 이체 아닌 줄도 있다 */
    if (xferOn(r)) {
      keep += -r.amount;
      keepParts[XFER_PART] = (keepParts[XFER_PART] || 0) + -r.amount;
      if (r.amount > 0) {
        keepIn += r.amount;
        keepInParts[XFER_PART] = (keepInParts[XFER_PART] || 0) + r.amount;
      } else {
        keepOut += -r.amount;
        keepOutParts[XFER_PART] = (keepOutParts[XFER_PART] || 0) + -r.amount;
      }
      return;
    }
    /* 내가 넣은 돈·뺀 돈은 잔액에만 반영하고 손익에서는 뺀다 */
    if (isKeep(c)) {
      /* ★ 36차. 앱이 안 묻고 넘긴 것(F)과 사장님이 손수 찍으신 것을 갈라 놓는다.
         한 덩어리로 두면 나중에 그 항목을 열었을 때 자기가 안 찍은 것이 섞여 있는데
         어느 게 어느 것인지 알 길이 없다. 되돌리려면 먼저 가려낼 수 있어야 한다 */
      var pk = UP.byName[keyOf(r)] && UP.byName[keyOf(r)].askSkip ? SKIP_PART : c;
      keep += -r.amount;
      keepParts[pk] = (keepParts[pk] || 0) + -r.amount;
      if (r.amount > 0) {
        keepIn += r.amount;
        keepInParts[pk] = (keepInParts[pk] || 0) + r.amount;
      } else {
        keepOut += -r.amount;
        keepOutParts[pk] = (keepOutParts[pk] || 0) + -r.amount;
      }
      return;
    }
    if (c === '매출') {
      sales += r.amount;
      if (r.amount > 0) salesIn += r.amount;
      else salesOut += -r.amount;
      return;
    }
    if (r.amount > 0) {
      /* 매출이 아닌 입금 — 환급·되돌려받은 돈 */
      otherIn += r.amount;
      otherInPayees[keyOf(r)] = (otherInPayees[keyOf(r)] || 0) + r.amount;
      return;
    }
    cats[c] = (cats[c] || 0) + -r.amount; /* 나간 돈만 지출로 센다 */
  });
  var cost = 0;
  Object.keys(cats).forEach(function (k) {
    cost += cats[k];
  });
  /* ★ 36차 4단계. 계좌마다 따로 잡아 더한다.
     예전에는 그 달 첫 줄·마지막 줄의 잔액을 그대로 썼다 —
     계좌가 둘이면 한 계좌만 잡히고 다른 계좌가 통째로 빠진다.
     검산(open + inTotal - outTotal = close)이 첫 달부터 깨져 숫자가 아예 안 나온다 */
  var open = monthOpenBalance(m, rows);
  var close = monthCloseBalance(m, rows);
  var unkRatio = volume > 0 ? unknown / volume : 0;
  /* 안 정한 거래가 어디로 가느냐에 따라 순이익이 움직일 수 있는 폭.
     고정 10% 같은 선은 근거가 없어서, 흑자·적자 판정이 뒤집히는지로 본다 */
  /* ── 36차 J ── 직접 넣으신 금액은 손익에만 반영한다.
     ★ 계좌 잔액(open·close)과 검산(inTotal·outTotal)에는 절대 안 들어간다.
       현금 매출은 계좌에 안 들어온 돈이다. 검산에 넣으면 그 달이 통째로 안 나온다 */
  /* ★ 83차 ④. 진행 중인 달에도 날짜 있는 것은 cutDay 까지 더한다.
     자르는 일은 manualSum 안에서 한다 — 계좌 거래를 자르는 자와 같은 자다.
     ★ 83차 ⑥. 적은 것이 없으면 두 값 다 0이라 예전과 똑같다 */
  var manIn = UP.manual ? manualSum(m, 'in', cutDay) : 0;
  var manOut = UP.manual ? manualSum(m, 'out', cutDay) : 0;
  sales += manIn;
  cost += manOut;
  var profit = sales + otherIn - cost;

  /* 안 정한 돈이 어느 쪽으로 가느냐에 따라 순이익이 움직일 수 있는 폭.
     안 정한 나간 돈이 모두 지출이 되면 그만큼 내려가고,
     안 정한 들어온 돈이 모두 매출이 되면 그만큼 올라간다.
     ★ profit 에 안 정한 돈이 안 들어가게 바뀌었으므로 uIn·uOut 이 서로 바뀐다 (35차 E) */
  var lo = profit - uOut,
    hi = profit + uIn;
  return {
    m: m,
    rows: rows,
    sales: sales,
    cost: cost,
    keep: keep,
    manIn: manIn,
    manOut: manOut,
    salesIn: salesIn,
    salesOut: salesOut,
    keepIn: keepIn,
    keepOut: keepOut,
    keepInParts: keepInParts,
    keepOutParts: keepOutParts,
    inTotal: inTotal,
    outTotal: outTotal,
    otherIn: otherIn,
    otherInPayees: otherInPayees,
    keepParts: keepParts,
    cats: cats,
    profit: profit,
    open: open,
    close: close,
    volume: volume,
    unknown: unknown,
    unknownN: unknownN,
    unkPayees: unkPayees,
    unkGroups: Object.keys(unkPayees).length,
    unkRatio: unkRatio,
    uOut: uOut,
    uIn: uIn,
    lo: lo,
    hi: hi,
    blocked: lo < 0 && hi > 0
  };
}

/* ── 36차 4단계 · 계좌 간 이체 ──────────────────────────────
   ★ 인수인계에 「계좌 간 이체는 없습니다(확인함)」로 되어 있었는데 틀렸다.
     실파일 12개월에 9건 2,749만원이 있다.
     합치면 이 9건이 양쪽 다 매출과 지출로 잡혀 8월 매출이 599만원 부풀어 오른다.
   ★ 자동으로 걸러내지 않는다. 틀리면 매출이 사라진다 —
     사장님이 보시고 「맞습니다」를 누르셔야 빠진다.
   ★ 금액이 같은 우연도 있으니 각 건을 따로 뺄 수 있게 한다 */
var XFER_DAYS = 1; /* 같은 날 또는 하루 차이까지 본다 */
var XFER_PART = '계좌끼리 옮긴 돈'; /* 화면에서 갈라 부르는 이름 */

function rowId(r) {
  return r.at + '|' + r.amount + '|' + r.balance + '|' + (r.acc || 0);
}
/* ── 37차 6번 · 이체 확인을 저장하는 키 ──────────────────────
   ★ 키에 금액을 넣지 않는다. 넣으면 hasNumber 검사에 걸려 fc.picks 가 통째로 안 남는다.
     날짜 + 은행 이름 + 엑셀 행번호면 그 줄을 되찾을 수 있고 금액은 안 들어간다.
   ★ fc.manual 에 넣지 않는다 — 이건 금액이 아니라 사장님의 판단이다.
   ★ 줄을 못 찾으면 조용히 버린다 (파일이 바뀌었을 수 있다) */
function xferKey(r) {
  return r.at.slice(0, 10) + '|' + bankName(r.acc || 0) + '|' + (r.excelRow || 0);
}
function dayNum(at) {
  return Math.floor(dayMs(at) / 86400000);
}

/* 한 계좌는 출금, 다른 계좌는 입금, 금액이 같고, 날짜가 하루 안쪽 */
function findTransfers() {
  if (!UP.banks || UP.banks.length < 2) return [];
  var outs = [],
    ins = [];
  UP.rows.forEach(function (r) {
    if (!r.amount) return;
    (r.amount < 0 ? outs : ins).push(r);
  });
  var byAmt = {};
  ins.forEach(function (r) {
    (byAmt[r.amount] || (byAmt[r.amount] = [])).push(r);
  });
  var used = {},
    pairs = [];
  outs.forEach(function (o) {
    var cand = byAmt[-o.amount];
    if (!cand) return;
    for (var i = 0; i < cand.length; i++) {
      var n = cand[i];
      if (n.acc === o.acc) continue; /* 같은 계좌 안은 이체가 아니다 */
      if (used[rowId(n)]) continue;
      if (Math.abs(dayNum(n.at) - dayNum(o.at)) > XFER_DAYS) continue;
      used[rowId(n)] = 1;
      pairs.push({ out: o, into: n, amount: -o.amount });
      return;
    }
  });
  pairs.sort(function (a, b) {
    return a.out.at < b.out.at ? -1 : 1;
  });
  return pairs;
}
function monLabel(m) {
  return m ? m.slice(0, 4) + '년 ' + +m.slice(5, 7) + '월' : '';
}
function prevMonthOf(m) {
  if (!m) return m;
  var y = +m.slice(0, 4),
    n = +m.slice(5, 7) - 1;
  if (n < 1) {
    n = 12;
    y--;
  }
  return y + '-' + (n < 10 ? '0' + n : n);
}
/* 사장님이 「맞습니다」를 누르신 것만 실제로 뺀다 */
function xferOn(r) {
  return !!(UP.xfer && UP.xfer[rowId(r)]);
}
/* ★ 57차 ⑦. 이체로 빼면 사업 지출이 줄어든다. 하루 표를 다시 만든다 */
function takeXfer(pairs) {
  if (UP) UP.__due = null;
  UP.xfer = UP.xfer || {};
  pairs.forEach(function (p) {
    UP.xfer[rowId(p.out)] = 1;
    UP.xfer[rowId(p.into)] = 1;
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
/* 저장할 목록 — 금액이 없는 키만 */
function xferKeys() {
  if (!UP.xfer) return [];
  var out = [];
  (UP.rows || []).forEach(function (r) {
    if (UP.xfer[rowId(r)]) out.push(xferKey(r));
  });
  return out;
}
/* 되살리기 — 그 키에 맞는 줄을 찾아 이체로 표시한다.
   못 찾으면 조용히 버린다 */
function applyXferKeys(keys) {
  if (!keys || !keys.length) return 0;
  var want = {};
  keys.forEach(function (k) {
    want[k] = 1;
  });
  UP.xfer = UP.xfer || {};
  var n = 0;
  (UP.rows || []).forEach(function (r) {
    if (want[xferKey(r)]) {
      UP.xfer[rowId(r)] = 1;
      n++;
    }
  });
  return n;
}
function bankName(i) {
  return UP.banks && UP.banks[i] ? UP.banks[i].bank : '계좌';
}
/* ── 진행 중인 달 · 잔액 사다리 ── */
function monthDays(m) {
  return new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
}

function lastDayIn(m) {
  var d = 0;
  UP.rows.forEach(function (r) {
    if (monthOf(r.at) === m) {
      var x = +r.at.slice(8, 10);
      if (x > d) d = x;
    }
  });
  return d;
}
/* 파일의 마지막 달이고 말일까지 안 찼으면 아직 진행 중이다 */
function isRunning(m, months) {
  return m === months[months.length - 1] && lastDayIn(m) < monthDays(m);
}
function nextMonthLabel(m) {
  var n = +m.slice(5, 7) + 1;
  if (n > 12) {
    n = 1;
  }
  return n + '월';
}

/* ── 예상 ──
   순증감을 통째로 평균 내면 월말에 몰리는 카드 정산을 못 잡는다.
   입금은 요일별로, 지출은 일자별로 따로 본다.
   그리고 과거로 되돌려 얼마나 틀리는지 재보고, 많이 틀리면 아예 보여주지 않는다 */
var FC_MIN_MONTHS = 3; /* 이만큼 쌓여야 예상을 시도한다 */
var FC_MAX_ERR = 0.08; /* 되돌려 재봤을 때 이보다 많이 틀리면 안 보여준다 */

function dayMs(at) {
  return Date.UTC(+at.slice(0, 4), +at.slice(5, 7) - 1, +at.slice(8, 10));
}
function dowOf(y, mon, day) {
  return new Date(Date.UTC(y, mon - 1, day)).getUTCDay();
}
function addMonth(m) {
  var y = +m.slice(0, 4),
    n = +m.slice(5, 7) + 1;
  if (n > 12) {
    n = 1;
    y++;
  }
  return y + '-' + (n < 10 ? '0' + n : n);
}
/* 손익과 상관없는 돈(대표 인출·가수금 등)은 예상에서 뺀다 */
function fcUsable(r) {
  return !isKeep(catOf(r));
}

/* 최근 4주 요일별 하루 평균 입금 — 카드 정산은 요일을 탄다 */
function dowInflow(endMs) {
  var start = endMs - 27 * 86400000;
  var sum = [0, 0, 0, 0, 0, 0, 0],
    days = [0, 0, 0, 0, 0, 0, 0];
  for (var t = start; t <= endMs; t += 86400000) days[new Date(t).getUTCDay()]++;
  UP.rows.forEach(function (r) {
    if (r.amount <= 0 || !fcUsable(r)) return;
    var t = dayMs(r.at);
    if (t < start || t > endMs) return;
    sum[new Date(t).getUTCDay()] += r.amount;
  });
  return sum.map(function (s, i) {
    return days[i] ? s / days[i] : 0;
  });
}

/* 지난 몇 달 일자별 평균 출금 — 월세·정기결제는 날짜를 탄다 */
function domOutflow(months, m, back) {
  var idx = months.indexOf(m),
    used = 0,
    sum = {},
    cnt = {};
  for (var i = idx - 1; i >= 0 && used < back; i--, used++) {
    var mm = months[i];
    UP.rows.forEach(function (r) {
      if (monthOf(r.at) !== mm || r.amount >= 0 || !fcUsable(r)) return;
      var day = +r.at.slice(8, 10);
      sum[day] = (sum[day] || 0) + -r.amount;
    });
    var dd = monthDays(mm);
    for (var k = 1; k <= dd; k++) cnt[k] = (cnt[k] || 0) + 1;
  }
  var avg = {};
  Object.keys(cnt).forEach(function (k) {
    avg[k] = (sum[k] || 0) / cnt[k];
  });
  return { avg: avg, n: used };
}

/* m월 cutDay 다음날부터 말일까지 (또는 다음 달 1~toDay까지) 얼마나 오갈지 */
function forecastSpan(months, m, fromM, fromDay, toDay, endMs) {
  var dow = dowInflow(endMs);
  var dom = domOutflow(months, m, FC_MIN_MONTHS);
  if (dom.n < FC_MIN_MONTHS) return null;
  var y = +fromM.slice(0, 4),
    mo = +fromM.slice(5, 7);
  var inflow = 0,
    outflow = 0;
  for (var day = fromDay; day <= toDay; day++) {
    inflow += dow[dowOf(y, mo, day)];
    outflow += dom.avg[day] || 0;
  }
  return {
    inflow: Math.round(inflow),
    outflow: Math.round(outflow),
    net: Math.round(inflow - outflow),
    months: dom.n
  };
}

/* 그 달 cutDay까지의 잔액 */
/* ── 36차 4단계 · 계좌별 잔액 ─────────────────────────────
   ★ 잔액은 계좌마다 따로 이어진다. 합친 줄을 순서대로 훑으면서
     마지막에 본 줄의 잔액을 쓰면, 그 시점 다른 계좌의 돈이 통째로 빠진다.
     계좌마다 「그 시점까지의 마지막 잔액」을 따로 잡아 더한다.
     그 계좌에 그 달 거래가 없으면 직전에 본 잔액을 그대로 이어 쓴다.
     한 번도 나온 적이 없으면 0이다 (부산은 2026-03 에 열렸다) */
function accCount() {
  return (UP.banks && UP.banks.length) || 1;
}
function accOf(r) {
  return r.acc || 0;
}
/* upto(r) 가 참인 마지막 줄까지 계좌별 잔액을 이어 더한다 */
function balanceSum(upto) {
  var n = accCount(),
    last = [],
    i;
  for (i = 0; i < n; i++) last[i] = null;
  UP.rows.forEach(function (r) {
    if (!upto(r)) return;
    last[accOf(r)] = r.balance;
  });
  var s = 0,
    any = false;
  for (i = 0; i < n; i++) {
    if (last[i] !== null) {
      s += last[i];
      any = true;
    }
  }
  return any ? s : null;
}
function balanceAt(m, cutDay) {
  return balanceSum(function (r) {
    return r.at.slice(0, 7) < m || (monthOf(r.at) === m && +r.at.slice(8, 10) <= cutDay);
  });
}
function monthEndBalance(m) {
  return balanceSum(function (r) {
    return r.at.slice(0, 7) <= m;
  });
}
/* 그 달 월말 — 계좌마다 그 달 마지막 잔액, 없으면 직전 달 것 */
function monthCloseBalance(m) {
  var v = monthEndBalance(m);
  return v === null ? 0 : v;
}
/* 그 달 월초 — 계좌마다 (그 달 첫 거래의 잔액 - 그 거래 금액),
   그 달에 거래가 없으면 직전 달 마지막 잔액, 그것도 없으면 0 */
function monthOpenBalance(m, rowsInMonth) {
  var n = accCount(),
    firstOf = [],
    i;
  for (i = 0; i < n; i++) firstOf[i] = null;
  (rowsInMonth || []).forEach(function (r) {
    var a = accOf(r);
    if (firstOf[a] === null) firstOf[a] = r;
  });
  /* 그 달 전까지 계좌별 마지막 잔액 */
  var prev = [];
  for (i = 0; i < n; i++) prev[i] = null;
  UP.rows.forEach(function (r) {
    if (r.at.slice(0, 7) >= m) return;
    prev[accOf(r)] = r.balance;
  });
  var s = 0;
  for (i = 0; i < n; i++) {
    if (firstOf[i]) s += firstOf[i].balance - (firstOf[i].amount || 0);
    else if (prev[i] !== null) s += prev[i];
  }
  return s;
}
/* 지금 계좌에 있는 돈 = 계좌마다 마지막 거래의 잔액을 합한 값 */
function nowBalance() {
  var v = balanceSum(function () {
    return true;
  });
  return v === null ? 0 : v;
}

/* ── 이번 달 결국 지난달보다 나을까 (매출만) ──
   실측: 22일 시점에 방향을 말했을 때 94% 맞았고,
   ±10%를 넘을 때만 말하면 36건 전부 맞았다. 정교한 방법일수록 오히려 나빴다 */
/* ±10%로 하면 실제로는 거의 안 변한 달에도 말하게 된다. ±20%면 헛말이 0건 */
var PROJ_MIN_CHANGE = 0.2;
var PROJ_MIN_MONTHS = 3; /* 오픈 직후 달이 가장 크게 틀렸다 */

/* 실측 6개 매장 21개월(거래 21,078건): 방향이 94.0% 맞았는데
   틀린 36건 중 34건이 14일 이전이었다. 5일 시점에 「줄어들 것」이라고 한 달이
   실제로는 두 배가 된 적도 있다. 15일부터만 말하면 97.7%가 된다.
   초순에 틀린 말을 하느니 아무 말도 안 하는 게 낫다 */
var PROJ_MIN_DAY = 15;

function salesProjection(months, m) {
  if (!isRunning(m, months)) return null; /* 끝난 달은 실제값으로 */
  var idx = months.indexOf(m);
  if (idx < PROJ_MIN_MONTHS) return null; /* 과거 자료가 모자라면 */
  var lastD = lastDayIn(m),
    days = monthDays(m);
  if (!lastD || lastD >= days) return null;
  if (lastD < PROJ_MIN_DAY) return null; /* 15일 전에는 말하지 않는다 */
  var cur = monthNumbers(m);
  if (cur.sales <= 0) return null;
  var prev = monthNumbers(months[idx - 1]); /* 지난달 전체 */
  if (prev.sales <= 0) return null;
  var proj = (cur.sales * days) / lastD; /* 일할 계산 */
  var change = proj / prev.sales - 1;
  if (Math.abs(change) <= PROJ_MIN_CHANGE) return null;
  return {
    proj: proj,
    prev: prev.sales,
    up: change > 0,
    prevM: +months[idx - 1].slice(5, 7),
    mm: +m.slice(5, 7)
  };
}

/* ── 시점 비교 ──
   비교하려고 이전 파일을 보관할 필요가 없다. 이번 파일 하나로
   「그날 섰다면 뭐라고 했을까」를 되돌려 계산한다 */
var ASOF_DAYS = [1, 10, 20];

function forecastAsOf(months, m, cutDay) {
  var base = balanceAt(m, cutDay);
  if (base === null) return null;
  var f = forecastSpan(
    months,
    m,
    m,
    cutDay + 1,
    monthDays(m),
    dayMs(m + '-' + (cutDay < 10 ? '0' + cutDay : cutDay))
  );
  if (!f) return null; /* 자료가 모자라면 그 줄은 뺀다 */
  return base + f.net;
}

/* 과거로 되돌려 같은 방법으로 예상해보고 실제와 얼마나 벌어졌는지 잰다 */
function forecastError(months, cutDay) {
  var errs = [];
  for (var i = months.length - 1; i >= FC_MIN_MONTHS && errs.length < 3; i--) {
    var mm = months[i];
    if (lastDayIn(mm) < monthDays(mm)) continue; /* 덜 찬 달은 못 쓴다 */
    var base = balanceAt(mm, cutDay);
    if (base === null) continue;
    var f = forecastSpan(
      months,
      mm,
      mm,
      cutDay + 1,
      monthDays(mm),
      dayMs(mm + '-' + (cutDay < 10 ? '0' + cutDay : cutDay))
    );
    if (!f) continue;
    var real = monthEndBalance(mm);
    if (!real) continue;
    errs.push(Math.abs(base + f.net - real) / Math.abs(real));
  }
  if (!errs.length) return null;
  errs.sort(function (a, b) {
    return a - b;
  });
  return { max: errs[errs.length - 1], n: errs.length };
}

/* ── 전월 대비 ── */
function prevMonth(m, months) {
  var i = months.indexOf(m);
  return i > 0 ? months[i - 1] : null;
}
/* 늘어난 게 좋은 값인지(매출·순이익) 나쁜 값인지(지출)에 따라 색이 갈린다 */
function cmpLine(now, before, beforeLabel, upIsGood) {
  if (before === null || before === undefined) return null;
  var diff = now - before;
  if (diff === 0) return null;
  var up = diff > 0;
  var good = up === upIsGood;
  /* 적자에서 흑자로 넘어간 것을 「154% 증가」로 쓰면 뜻이 없다 */
  var flip = (before < 0 && now > 0) || (before > 0 && now < 0);
  if (flip) {
    var word = now > 0 ? '흑자로 돌아섰습니다' : '적자로 돌아섰습니다';
    return {
      short: beforeLabel + ' 대비 ' + word,
      full: beforeLabel + ' ' + won(before) + '원 → ' + won(now) + '원 · ' + word,
      cls: good ? 'up' : 'down'
    };
  }
  /* 줄마다 숫자가 셋씩 붙으면 정작 중요한 %가 안 보인다.
     기준 금액과 차액은 눌렀을 때만 */
  /* ★ 67차 ②. 100%를 넘으면 배수(「16배로 늘었습니다」) 대신
     수치 둘을 그대로 놓는다 — 「12만원 → 190만원」은 풀이가 필요 없다 */
  var mv = moveTxt(before, now);
  var 둘 = won(before) + '원 → ' + won(now) + '원';
  var head = !mv
    ? up
      ? '증가'
      : '감소'
    : mv.큼
      ? 둘
      : mv.txt === null
        ? '거의 다 줄었습니다'
        : mv.txt + ' ' + (up ? '증가' : '감소');
  return {
    short: beforeLabel + ' 대비 ' + head,
    full:
      mv && mv.큼
        ? beforeLabel + ' ' + 둘
        : beforeLabel +
          ' ' +
          won(before) +
          '원 대비 ' +
          won(Math.abs(diff)) +
          '원' +
          (!mv || mv.txt === null
            ? up
              ? ' 증가'
              : ' 감소'
            : ' (' + mv.txt + ' ' + (up ? '증가' : '감소') + ')'),
    cls: good ? 'up' : 'down'
  };
}
/* ── 비율 판정 ── 직영 6개 매장 12개월 실측에서 나온 보통 범위 */
function baseName(orig) {
  var i = UP_CATS.indexOf(orig);
  return (UP && UP.baseCats && UP.baseCats[i]) || orig;
}
/* ★ 64-5차. 안내문에서는 사장님이 단추에서 보신 이름으로 말한다 —
   「내가 가져간 돈」은 「사업 외 용도」 묶음의 나간 쪽 속 이름이라,
   앱이 안 묻고 넘긴 것을 설명하면서 그 이름을 대면
   사장님이 어디서도 못 보신 이름이 화면에 나온다.
   어느 항목으로 넣는지(동작)는 그대로다 — 말만 바꾼다.
   ★ 단추에 「내가 가져간 돈」이 그대로 뜨는 자리(추천·확인)는 안 바꾼다.
     거기서는 사장님이 그 이름을 직접 보고 누르신다 (64차 질문 2 확정) */
function sayCat(c) {
  var p = SIDE_ONLY[c];
  return baseName(p || c);
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

function catSum(d, origs) {
  var s = 0;
  origs.forEach(function (o) {
    s += d.cats[baseName(o)] || 0;
  });
  return s;
}
function pctStr(x) {
  var n = Math.round(x * 100);
  return n >= 100 ? '전부' : n + '%';
}
/* ── 42차 3번 · 세 자리 %는 쓰지 않는다 ────────────────────
   「5705% 늘었습니다」는 지난달 1만원 쓰고 이번 달 57만원 썼다는 말이다.
   대표님께 아무 뜻이 없고, 분모 금액도 안 붙어 있어 원칙 4에도 어긋난다.
   ★ 67차 ②. 예전에는 100%를 넘으면 배수로 말했다(「57배로 늘었습니다」).
     60차 낱말 규칙대로 배수도 화면에서 뺀다 — 「무슨 말인지 못 알아듣겠습니다」.
     대신 원래 수치 둘을 그대로 놓는다. 「12만원 → 190만원」은 풀이가 필요 없다.
   ★ 줄어서 100%가 되는 것은 「없어졌다」는 뜻이다. 그렇게 적는다.
   ★ 화면 어디든 세 자리 %가 나오면 빌드가 막힌다 (개발도구/검사_applyBreaks.html) */
function moveTxt(before, now) {
  var b = Math.abs(before),
    n = Math.abs(now);
  if (!b) return null;
  var pct = Math.round((Math.abs(n - b) / b) * 100);
  if (pct < 100) return { txt: pct + '%', 큼: false };
  if (n < b) return { txt: null, 큼: false }; /* 다 줄어든 것 */
  return { txt: null, 큼: true }; /* 수치 둘로 말한다 */
}
/* 묶음 비율은 한 자리까지 — 20.7% 와 21% 는 다른 말이다 */
function pct1(x) {
  return (x * 100).toFixed(1) + '%';
}

/* 가장 큰 거래처 — "어디를 잘못 찍었나"를 바로 보여주기 위한 것 */
function topPayee(d, cat) {
  var list = catPayees(d, cat);
  return list.length ? list[0] : null;
}

/* ── 비율은 3개월씩 묶어서 본다 ──
   월별 원가율은 이번 달과 다음 달 상관이 +0.07 로 사실상 노이즈다.
   3개월 묶음은 +0.71. 월별 출렁임의 3분의 2는 원가가 아니라
   「대금을 언제 냈는가」라서, 월별로 경고하면 사장님은 업체를 바꾸고
   아무것도 안 바뀐다. 실측 발동률 70% → 23%.
   묶음 비율은 각 달 비율의 평균이 아니라 (분자 합 ÷ 분모 합)이다 —
   매출 작은 달이 과대 반영되면 안 된다 */
var OWN_MIN_MONTHS = 6; /* 3개월 묶음을 두 개 이상 만들려면 */
var OWN_GAP = 0.1; /* 평균과 이만큼(%p) 벌어져야 말한다 */
var OWN_SPAN = 3; /* 몇 달씩 묶는가 */
var RATIO_MIN_SALES = 10000000; /* 매출이 이보다 적은 달은 비율에서 뺀다 */

/* 달마다 한 번만 세어두고 규칙마다 돌려쓴다.
   이번 달이 안 끝났으면 과거 달도 같은 날짜까지 잘라서 센다 —
   매출은 카드 정산이 월말까지 들어오는데 식자재 대금은 5·10일에 몰려 나가서,
   달 중간에 자르면 원가율이 저절로 11%p 부풀어 오른다.
   한 달 전체와 1~22일을 견주면 그 부풀림만으로 문턱을 넘는다 */
/* 아직 안 정한 금액이 지출 총액의 이만큼을 넘으면 비율 이야기를 아예 안 한다.
   blocked 는 흑자/적자 판정이 뒤집히는지를 보는 것이라 여기 쓸 수 없다 —
   못정한가 71%여도 lo·hi 가 같은 부호면 통과해서,
   「월세가 0원입니다」 같은 카드가 떴다 */
var RATIO_MAX_UNKNOWN = 0.2;
/* 안 정한 나간 돈이 지출 대비 얼마나 되는가.
   ★ 35차 E부터 안 정한 돈은 d.cats 에 안 들어간다. d.uOut 을 그대로 쓴다.
     분모(d.cost)에도 안 들어가므로 「지출로 다 잡혔을 때」 대비로 견준다 */
function unknownCostShare(d) {
  if (!d) return 0;
  var base = d.cost + (d.uOut || 0);
  return base > 0 ? (d.uOut || 0) / base : 0;
}
function ratioMuted(d) {
  return unknownCostShare(d) > RATIO_MAX_UNKNOWN;
}

function ratioMonths(m, months, cutDay) {
  var ok = [],
    skipped = [];
  (months || []).forEach(function (x) {
    if (x > m) return;
    var dd = monthNumbers(x, cutDay || null);
    if (dd.blocked || dd.sales <= 0) return; /* 못 정한 게 많은 달은 뺀다 */
    if (dd.sales < RATIO_MIN_SALES) {
      skipped.push(x);
      return;
    }
    ok.push({ m: x, d: dd });
  });
  return { ok: ok, skipped: skipped, cutDay: cutDay || null };
}

function ymLabel(x, curY) {
  var y = +x.slice(0, 4),
    mm = +x.slice(5, 7);
  if (y === curY) return mm + '월';
  if (y === curY - 1) return '작년 ' + mm + '월';
  return y + '년 ' + mm + '월';
}
/* 「작년 10~12월」 처럼 묶음 이름을 만든다.
   숫자에 날짜가 붙어야 사장님 머릿속에 그 달에 뭐가 있었는지가 같이 떠오른다 */
function bucketLabel(list, curY) {
  var a = list[0].m,
    b = list[list.length - 1].m;
  var ya = +a.slice(0, 4),
    yb = +b.slice(0, 4);
  var ma = +a.slice(5, 7),
    mb = +b.slice(5, 7);
  if (ya === yb) {
    var head = ya === curY ? '올해 ' : ya === curY - 1 ? '작년 ' : ya + '년 ';
    return head + ma + '~' + mb + '월';
  }
  return ymLabel(a, curY) + '~' + ymLabel(b, curY);
}

/* 겹치게 3개월씩 묶고, 묶음마다 (분자 합 / 분모 합).
   견주는 기준은 「그 묶음 이전의 합산 비율」이다 —
   미래 묶음을 기준에 넣으면 다음 달 파일을 올렸을 때 지난달 판정이 바뀐다.
   사장님한테는 「지난달엔 괜찮다더니?」가 되고, 그건 숫자가 틀린 것보다 나쁘다 */
function ownBuckets(cats, m, months, stats) {
  var ok = stats.ok;
  if (ok.length < OWN_MIN_MONTHS) return null;
  var curY = +m.slice(0, 4);
  var buckets = [];
  for (var i = 0; i + OWN_SPAN <= ok.length; i++) {
    var part = ok.slice(i, i + OWN_SPAN);
    var num = 0,
      den = 0;
    part.forEach(function (e) {
      num += catSum(e.d, cats);
      den += e.d.sales;
    });
    if (den <= 0) continue;
    buckets.push({
      label: bucketLabel(part, curY),
      ratio: num / den,
      first: part[0].m,
      last: part[part.length - 1].m
    });
  }
  if (buckets.length < 2) return null;
  var cur = null;
  buckets.forEach(function (b) {
    if (b.last === m) cur = b;
  });
  if (!cur) return null;
  /* 그 묶음이 시작되기 전까지의 합산 비율 — 그때 알 수 있었던 것만 쓴다 */
  var bn = 0,
    bd = 0,
    bm = 0;
  ok.forEach(function (e) {
    if (e.m >= cur.first) return;
    bn += catSum(e.d, cats);
    bd += e.d.sales;
    bm++;
  });
  if (bd <= 0 || bm < OWN_SPAN) return null;
  var base = bn / bd;

  var lo = buckets[0],
    hi = buckets[0];
  buckets.forEach(function (b) {
    if (b.ratio < lo.ratio) lo = b;
    if (b.ratio > hi.ratio) hi = b;
  });
  var mlo = null,
    mhi = null;
  ok.forEach(function (e) {
    var v = e.d.sales > 0 ? catSum(e.d, cats) / e.d.sales : null;
    if (v === null) return;
    if (mlo === null || v < mlo) mlo = v;
    if (mhi === null || v > mhi) mhi = v;
  });
  return {
    cur: cur.ratio,
    avg: base,
    n: bm,
    lo: lo,
    hi: hi,
    mlo: mlo,
    mhi: mhi,
    spread: hi.ratio - lo.ratio,
    mspread: mhi - mlo
  };
}

/* 이번 달 기간을 말로 — 「8월 1~22일」 / 「8월」 */
function spanWord(m, cutDay) {
  var mm = +m.slice(5, 7);
  return cutDay ? mm + '월 1~' + cutDay + '일' : mm + '월';
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

/* ── 0원 카드는 한 달이 아니라 석 달을 본다 ──
   월세가 매달 꼬박꼬박 나가지 않는다. 계약일이 제각각이라 밀려 내기도 하고
   두 달치를 한 번에 내기도 한다. 실측 — 87개월 중 72개월(83%)에만 나갔다.
   「이번 달 0원」으로 띄우면 6달 중 1달이 헛방이다 (15/87 = 17%).
   석 달 내내 0원일 때만 띄우면 1/73 = 1% 로 떨어지고,
   진짜 「안 찍었다」는 그대로 잡힌다 — 안 찍었으면 석 달이 다 0원이니까 */
var ZERO_SPAN = 3;
function zeroSpanMonths(cats, m, months, cutDay) {
  var i = (months || []).indexOf(m);
  if (i < ZERO_SPAN - 1) return null; /* 석 달치가 없으면 아예 안 띄운다 */
  var span = months.slice(i - ZERO_SPAN + 1, i + 1);
  for (var k = 0; k < span.length; k++) {
    var dd = monthNumbers(span[k], cutDay || null);
    if (!dd.rows.length || dd.sales <= 0) return null;
    /* 한 달이라도 아직 안 정한 게 많으면 0원인지 안 찍은 건지 알 수 없다 */
    if (ratioMuted(dd)) return null;
    if (catSum(dd, cats) > 0) return null; /* 한 달이라도 나갔으면 안 띄운다 */
  }
  return span;
}
function spanLabel(span) {
  return span
    .map(function (x) {
      return +x.slice(5, 7) + '월';
    })
    .join(' · ');
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

/* ── 처음 보는 거래처 · 크게 늘어난 거래처 ── */
/* 크기는 순위와 비율에, 부호는 화면에 쓴다.
   출금이 −로 보여야 위 카드 제목과 아래 거래처 줄이 같은 돈으로 읽힌다 */
function payeeSums(m) {
  var s = {};
  UP.rows.forEach(function (r) {
    if (monthOf(r.at) !== m) return;
    var k = keyOf(r);
    var o = s[k] || (s[k] = { abs: 0, net: 0 });
    o.abs += Math.abs(r.amount);
    o.net += r.amount;
  });
  return s;
}
/* 급여는 첫 달이 부분 급여라 다음 달에 무조건 몇 백 % 늘어난다.
   신입이 들어올 때마다 카드가 뜨는데, 그건 알려드릴 일이 아니라 당연한 일이다.
   ★ 「개인 이름이면 빼기」로 하면 안 된다 — 실측 237장 중 92장이
     임대인·거래처 사장님의 개인 계좌였고 2억짜리 지출도 있었다.
     사장님이 「인건비」로 정하신 거래처만 뺀다. 못정한는 안 뺀다 */
var CARD_SKIP_BASE = ['인건비'];
function cardSkipped(name) {
  var g = UP.byName[name];
  if (!gDone(g)) return false; /* 아직 뭔지 모른다. 못정한는 안 뺀다 */
  /* 내가 가져간 돈·넣은 돈·투자받은 돈·은행 원금 상환.
     사장님이 직접 하신 일이고 순이익을 안 바꾼다.
     목록은 isKeep 한 곳에만 둔다 — 두 벌을 두면 나중에 어긋난다 */
  var cs = gCats(g);
  if (cs.every(isKeep)) return true;
  for (var i = 0; i < CARD_SKIP_BASE.length; i++) {
    var b = baseName(CARD_SKIP_BASE[i]);
    /* 「주방 인건비」처럼 나눠 쓰시는 경우까지 잡는다 */
    if (
      cs.every(function (c) {
        return c === b || c.indexOf(b) !== -1;
      })
    )
      return true;
  }
  return false;
}

/* 우리가 무엇인지 이미 아는 곳 — 이름만으로 세금·보험·공과금이 잡히는 거래처.
   사장님이 확인해줄 게 없다. 다만 사장님이 손으로 옮긴 곳은 그대로 본다 */
function autoKnown(name) {
  var g = UP.byName[name];
  if (g && gDone(g) && !(g.auto || g.autoIn || g.autoOut)) return false;
  var c = autoCategory(name, -1); /* 출금 쪽으로 물어본다 — 카드사 판정을 피한다 */
  return c === '세금' || c === '보험' || c === '전기·가스·수도';
}
/* 그 거래처가 달마다 얼마씩이었는지 */
function payeeByMonth(name) {
  var s = {};
  UP.rows.forEach(function (r) {
    if (keyOf(r) !== name) return;
    var mm = monthOf(r.at);
    s[mm] = (s[mm] || 0) + Math.abs(r.amount);
  });
  return s;
}
/* 평소의 세 배를 넘으면 세금·보험이라도 확인할 값어치가 있다.
   견줄 다른 달이 없으면 「평소」가 없는 것이라 안 띄운다 */
function farAboveUsual(name, m, abs) {
  var s = payeeByMonth(name),
    xs = [];
  Object.keys(s).forEach(function (k) {
    if (k !== m) xs.push(s[k]);
  });
  if (!xs.length) return false;
  xs.sort(function (a, b) {
    return a - b;
  });
  return abs > xs[(xs.length - 1) >> 1] * 3;
}

function newPayees(d, m, months) {
  var pm = prevMonth(m, months);
  if (!pm) return [];
  var cur = payeeSums(m),
    old = payeeSums(pm),
    floor = d.volume * 0.01;
  return Object.keys(cur)
    .filter(function (p) {
      if (old[p] || cur[p].abs < floor) return false;
      /* 신입 직원은 매달 「처음 보는 거래처」다 */
      if (cardSkipped(p)) return false;
      /* 합산보험료·국민연금은 우리가 이미 무엇인지 안다. 확인해줄 게 없다 */
      if (autoKnown(p) && !farAboveUsual(p, m, cur[p].abs)) return false;
      return true;
    })
    .sort(function (a, b) {
      return cur[b].abs - cur[a].abs;
    })
    .slice(0, 3)
    .map(function (p) {
      return { name: p, amt: cur[p].abs, net: cur[p].net };
    });
}
function grownPayees(d, m, months) {
  var pm = prevMonth(m, months);
  if (!pm) return [];
  var cur = payeeSums(m),
    old = payeeSums(pm),
    floor = d.volume * 0.01;
  return Object.keys(cur)
    .filter(function (p) {
      if (!old[p] || cur[p].abs < floor) return false;
      if (cur[p].abs / old[p].abs < 1.3) return false;
      /* 첫 달 부분 급여 → 다음 달 전체 급여는 몇 백 %가 당연하다 */
      if (cardSkipped(p)) return false;
      /* 좋은 방향으로 바뀐 건 확인하라고 하지 않는다.
         들어오는 돈이 늘어난 걸 확인하라고 하면, 정작 봐야 할 지출도 안 본다 */
      if (cur[p].net > 0) return false;
      /* 세금·보험·공과금은 매년 조금씩 오른다. 평소의 세 배를 넘을 때만 말한다 */
      if (autoKnown(p) && !farAboveUsual(p, m, cur[p].abs)) return false;
      return true;
    })
    .sort(function (a, b) {
      return cur[b].abs - old[b].abs - (cur[a].abs - old[a].abs);
    })
    .slice(0, 3)
    .map(function (p) {
      return {
        name: p,
        amt: cur[p].abs,
        was: old[p].abs,
        net: cur[p].net,
        wasNet: old[p].net,
        up: Math.round((cur[p].abs / old[p].abs - 1) * 100)
      };
    });
}
