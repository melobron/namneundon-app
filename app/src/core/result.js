/* ── core · 결과 화면 · 1년치 그래프의 계산 부품 ─────────────────────
   리팩토링 B-1h (2026-09-26): 15-result-panels · 17-result · 18-charts-year 에서 화면 · 저장소에 닿지 않는 계산을 옮겼다.
   볼 달 고르기 · 달 이름 · 기준 시각 · 사업 외 목록 · 확인 카드 개수 · 그래프 눈금 · 하루 흐름 · 문 열기 전 달.
   매장 자료(UP)를 읽는 것은 fIn(U, …) 이고, 원래 파일에 연결 함수 f(…) 가 남아 있다.
   ★ 화면 요소를 매개변수로 받는 것(moneyLive · drawDueAsk2)과 펼침 상태(whyOpen)는 앱에 남겼다.
   CASH_NAME(12) 은 여기 계산이 쓰는 상수라 함께 올라왔다.
   단위 테스트: tests/core/result.spec.mjs */
/* ── (원래 12-storage.js) ── */
var CASH_NAME = '현금매출';
/* ── (원래 15-result-panels.js) ── */
/* ── 41차 1번 (가) · 결과를 처음 열 때 어느 달을 보여드리는가 ──
   예전에는 진행 중인 달로 갔다. 그 달은 원래 절반짜리라 안 정한 돈의 몫이 커서
   막히기 쉽다 — 「이제 보실 수 있습니다」 다음 화면이 「셀 수 없습니다」가 됐다.
   ★ 20곳 찍은 실파일에서 13달 중 10달은 이미 숫자가 나오는데,
     하필 막힌 셋 중 하나를 첫 화면으로 열고 있었다. 계산이 아니라 순서 문제였다.
   ★ 사장님이 제일 먼저 궁금해하시는 것도 「지난달 얼마 남았나」다.
     끝난 달 가운데 가장 최근 달을 연다. 그 달마저 막혔으면
     숫자가 나오는 가장 최근 달까지 물러난다 — 첫 화면은 숫자여야 한다 */
/* ★ 59차 ④. 화면을 처음 열면 진행 중인 달로 뜬다 —
   「지금 어떤 상태인가」를 먼저 보여주려는 것이다.
   예전에는 진행 중인 달을 아예 걸러내서 7월로 떴다.
 ★ 그냥 바꾸면 안 된다. 진행 중인 달이 blocked 인 경우가 실제로 있다 —
   실파일 둘을 스무 곳만 정한 상태에서 2026-08 이 그렇다.
   그대로 두면 첫 화면에 「달이 끝나면 나옵니다」만 뜨고 숫자가 하나도 안 보인다.
   그래서 blocked 이면 지금처럼 끝난 달 중 숫자가 나오는 가장 최근 달로 물러난다 */
/* ★ 64-2차 1. 늘 가장 최근 달이다. 물러나기를 없앴다.
   「8월까지 자료를 올렸는데 7월이 보이면 당황합니다」 —
   막힌 달이면 그 화면의 「조금만 더 정하면 나옵니다」와
   「N월은 보실 수 있습니다 [N월 보기]」(41차)가 갈 길을 알려준다.
   59차 ④의 「빈 화면 금지」는 그 유도로 갈음한다 */
function defaultMonth(months) {
  if (!months || !months.length) return null;
  return months[months.length - 1];
}
/* 지금 보는 달 말고, 숫자가 나오는 가장 최근 달 (없으면 null) */
function viewableMonthIn(U, months, notThis) {
  if (!months || !months.length) return null;
  for (var i = months.length - 1; i >= 0; i--) {
    if (months[i] === notThis) continue;
    var d = monthNumbersIn(
      U,
      months[i],
      isRunningIn(U, months[i], months) ? lastDayInIn(U, months[i]) : null
    );
    if (!d.blocked) return months[i];
  }
  return null;
}
/* ★ 101차 ①. 지난 3달에 일자별로 제일 큰 돈이 나간 날.
   기본값을 여기서 잡아 대표님은 확인만 하시면 되게 한다.
   ★ domOutflow 는 이미 있는 함수다. 새로 세지 않는다 */
function bigOutDayIn(U, months, m) {
  var dom;
  try {
    dom = domOutflowIn(U, months, m, FC_MIN_MONTHS);
  } catch (e) {
    return null;
  }
  if (!dom || dom.n < FC_MIN_MONTHS) return null;
  var best = null,
    bestV = 0;
  /* ★ 103차 ③. 고르실 수 있는 날과 같은 범위로 넓힌다. 묻는 값과 권하는 값의
     범위가 다르면 말일에 몰리는 대표님께는 영영 엉뚱한 날을 권하게 된다.
     domOutflow 의 avg 는 「그 날이 있던 달 수」로 이미 나눠져 있어 29~31 도 셀 수 있다 */
  for (var d = 1; d <= 31; d++) {
    var v = dom.avg[d] || 0;
    if (v > bestV) {
      bestV = v;
      best = d;
    }
  }
  return best;
}
function monthLabel(m) {
  return m.replace('-', '년 ') + '월';
}
/* 1년치 표 각주가 이미 「진행 중」이라고 쓴다. 말을 하나로 맞춘다 */
function monthLabelRIn(U, m, months) {
  return monthLabel(m) + (isRunningIn(U, m, months) ? ' (진행 중)' : '');
}
/* ── 47차 ② · 지금 몇 %인가 ────────────────────────────────
   46차에 만든 「N% → 100%」는 뒤집히지 않은 달에만 나왔다.
   실파일 둘·97곳 찍은 상태에서 13달 중 11달이 blocked 라 %가 없었다 —
   얼마나 더 정확해지는지 알려주자던 줄인데 정확도가 낮을수록 안 보였다.
   ★ 두 자리가 같은 계산을 쓰게 한 곳에서 낸다.
     한 화면에 68%와 71%가 다른 식으로 나오면 안 된다.
   ★ 반올림해서 99.6%가 100%로 보이면 안 된다 — 내림에 99% 상한 */
function nowPct(d) {
  if (!d || !(d.volume > 0)) return null;
  var p = Math.floor((1 - d.unknown / d.volume) * 100);
  if (p > 99) p = 99;
  if (p < 0) p = 0;
  return p;
}
/* 순이익 범위를 말하는 자리는 원 단위가 필요 없다. 만원으로 줄여 쓴다 */
function manwon(v) {
  var m = Math.round(v / 10000);
  return (m < 0 ? '−' : '') + won(Math.abs(m)) + '만원';
}
/* ── 85차 ② · 치는 동안 콤마가 붙는 금액 칸 ──────────────────────
   지금은 5000000 이라고 치신다. 0이 몇 개인지 세야 한다.
   ★ 저장되는 값은 지금과 한 자리도 안 다르다 — 콤마는 보이기만 하는 것이다.
     읽는 자(moneyRead)는 예전에 자리마다 흩어져 있던 그 식 그대로다 —
     숫자 아닌 글자를 걷어내고 반올림한다. 그래서 대표님이 콤마를 직접
     치셔도 예전처럼 그대로 받는다.
   ★ 다 치고 딴 데를 눌러야 붙으면 세는 수고가 그대로다.
     그래서 change 가 아니라 input 에 붙인다 */
function moneyRead(v) {
  return Math.max(0, Math.round(+String(v).replace(/[^0-9]/g, '') || 0));
}
/* 거래내역의 마지막 거래 시각 — 언제까지의 숫자인지 위에 크게 적는다 */
function asOfTextIn(U) {
  var at = '';
  U.rows.forEach(function (r) {
    if (r.at > at) at = r.at;
  });
  if (!at) return '';
  /* 시·분은 안 쓴다. 사장님이 대조하는 단위는 날짜이고,
     이 줄이 길어지면 순이익이 첫 화면에서 밀린다 */
  return +at.slice(0, 4) + '년 ' + +at.slice(5, 7) + '월 ' + +at.slice(8, 10) + '일';
}
/* 아직 항목을 안 정한 거래처 수 */
function unsetCountIn(U) {
  return U.payees.filter(function (g) {
    return !gDone(g);
  }).length;
}
/* 감춘 항목은 고르는 자리에만 안 나온다. 이미 찍힌 거래는 그대로 남는다 */
function isHiddenIn(U, name) {
  return (U.hidden || []).indexOf(name) !== -1;
}
/* 「기타」의 지금 이름 — 사장님이 이름을 바꿨을 수도 있다 */
function etcNameIn(U) {
  var i = UP_CATS.indexOf('기타');
  return (U.baseCats && U.baseCats[i]) || '기타';
}
/* ── 36차 ── 사업과 무관한 항목의 거래처 목록.
   ★ 한 번 잘못 찍으면 되돌릴 길이 「처음부터 다시 정하기」뿐이었다 —
     keep 항목만 펼침이 없어서 [항목 바꾸기]에 닿을 수가 없었다.
   방향으로도 갈라야 한다. 같은 항목이 들어온 쪽과 나간 쪽에 다 있을 수 있다.
   skipOnly 는 「앱이 넘긴 작은 거래」(F)만 따로 볼 때 쓴다 */
function keepPayeesIn(U, d, cat, isIn, skipOnly) {
  var m = {};
  d.rows.forEach(function (r) {
    if (r.amount > 0 !== isIn) return;
    /* 36차 4단계. 이체는 줄 단위라 항목으로 안 거른다 */
    if (cat === XFER_PART) {
      if (!xferOnIn(U, r)) return;
    } else {
      if (xferOnIn(U, r)) return;
      if (catOfIn(U, r) !== cat) return;
      var g0 = U.byName[keyOfIn(U, r)];
      var sk = !!(g0 && g0.askSkip);
      if (skipOnly ? !sk : sk) return;
    }
    var k = keyOfIn(U, r);
    var e = m[k] || (m[k] = { name: k, n: 0, sum: 0 });
    e.n++;
    e.sum += Math.abs(r.amount);
  });
  return Object.keys(m)
    .map(function (k) {
      return m[k];
    })
    .sort(function (a, b) {
      return b.sum - a.sum;
    });
}
/* 그 항목에 든 거래처가 몇 곳·몇 건인지 — 다른 항목 줄과 같은 꼬리표 */
function keepCountIn(U, d, cat, isIn, skipOnly) {
  var l = keepPayeesIn(U, d, cat, isIn, skipOnly),
    n = 0;
  l.forEach(function (e) {
    n += e.n;
  });
  return l.length ? won(l.length) + '곳 · ' + won(n) + '건' : '';
}
/* ── (원래 17-result.js) ── */
/* ── 확인이 필요한 것 ──
   숫자만 보여주고 판단을 사장님께 떠넘기지 않는다. 이상하면 우리가 먼저 말한다.
   막지는 않는다 — 진짜 그런 매장도 있으니 알려주고 고르게 한다 */
function warnOkIn(U, m, id) {
  return U.okWarn && U.okWarn[m + '|' + id];
}
function checksLeftIn(U, cards) {
  var m = U.month;
  return cards.filter(function (c) {
    return !warnOkIn(U, m, checkId(c));
  }).length;
}
function checkId(c) {
  if (c.kind === 'ratio') return c.w.id;
  if (c.kind === 'unsure') return 'unsure:' + c.row.excelRow;
  if (c.kind === 'resid') return 'resid:' + c.row.excelRow; /* ★ 112차 ②㉰ */
  if (c.kind === 'new') return 'new:' + c.p.name;
  return 'grow:' + c.p.name;
}
/* ── 「인건비부터 찾아보기」 ──
   실측: 개인 이름 출금 중 매달 나가고 · 금액이 비슷하고 · 6개월 이상 이어진 곳은
   40곳 중 26곳(65%)이 인건비였다. 지정하지는 않고 순서로만 쓴다 */
function steadyScore(g) {
  var s = 0;
  if (looksPersonal(g.name) && g.net < 0) s += 2;
  if (g.monthN >= 6) s += 2;
  else if (g.monthN >= 3) s += 1;
  if (g.amts && g.amts.length >= 3) {
    var sum = 0;
    g.amts.forEach(function (a) {
      sum += a;
    });
    var mean = sum / g.amts.length,
      v = 0;
    g.amts.forEach(function (a) {
      v += (a - mean) * (a - mean);
    });
    var cv = mean ? Math.sqrt(v / g.amts.length) / mean : 9;
    if (cv < 0.3) s += 1;
  }
  if (g.n <= 3) s -= 2; /* 단발성은 힌트가 안 된다 — 뒤로 */
  return s;
}
/* 찾기 — 다듬은 이름끼리 견준다. 공백·대소문자는 무시한다 */
function findKey(s) {
  return canonName(String(s || ''))
    .replace(/\s+/g, '')
    .toLowerCase();
}
/* ── (원래 18-charts-year.js) ── */
/* ── 1년치 ── */
/* 문 열기 전 달이 평균을 망가뜨린다.
   실측: 매출 0원인 달에 개점 자금 2억이 나가서 지출 비율 평균이 710%,
   순이익 평균이 −1억 2,700만원으로 찍혔다. 사실이 아닌 숫자다.
   매출이 그 매장 중앙값의 이만큼에 못 미치는 달은 진행 중인 달과 똑같이 다룬다 —
   숫자 자체는 그대로 보여준다. 실제로 있었던 일이다 */
var OPENING_MIN = 0.2;
function openingMonthsIn(U, cols, months) {
  var out = {};
  var fin = cols.filter(function (c) {
    return !isRunningIn(U, c.m, months);
  });
  if (fin.length < 2) return out;
  /* 한 번만 재면 중앙값 자체가 문 열기 전 달에 끌려 내려간다 —
     매출 0원인 달이 셋이면 중앙값이 118만원이 되어 그다음 달을 못 걸러낸다.
     걸러낸 뒤 다시 재기를 되풀이해 값이 안 바뀔 때까지 간다 */
  var live = fin.slice();
  for (var pass = 0; pass < 5; pass++) {
    var xs = live
      .map(function (c) {
        return c.sales;
      })
      .sort(function (a, b) {
        return a - b;
      });
    var mid = xs[(xs.length - 1) >> 1];
    if (mid <= 0) break;
    var keep = live.filter(function (c) {
      return c.sales >= mid * OPENING_MIN;
    });
    if (keep.length === live.length || keep.length < 2) break;
    live = keep;
  }
  var alive = {};
  live.forEach(function (c) {
    alive[c.m] = 1;
  });
  fin.forEach(function (c) {
    if (!alive[c.m]) out[c.m] = 1;
  });
  return out;
}
/* ── 66차 ② · 최근 마감한 달 ──────────────────────────────────────
   끝난 달 가운데 가장 최신 달이다. 자료 마지막 거래일이 든 달이 아직 진행 중이면
   그 앞 달이 마감 달이다 — 자료가 8월 22일까지면 마감 달은 7월이다.
   ★ 문 열기 전 달은 뺀다. 1년치 표의 평균이 쓰는 판정과 같은 자리다 —
     한 화면에서 「끝난 달」을 두 가지로 세면 카드와 표가 어긋난다 (49차).
   ★ cols 를 이미 만들어 둔 곳(drawYear)은 넘겨서 두 번 안 세게 한다 */
function closedColsIn(U, months, cols) {
  cols =
    cols ||
    months.map(function (m) {
      return monthNumbersIn(U, m);
    });
  var opening = openingMonthsIn(U, cols, months);
  return cols.filter(function (c) {
    return !isRunningIn(U, c.m, months) && !opening[c.m];
  });
}
function lastClosedMonthIn(U, months, cols) {
  var done = closedColsIn(U, months, cols);
  return done.length ? done[done.length - 1].m : null;
}
/* 「8월」처럼 달만. 한 해 안에서 보는 자리에 해까지 붙이면 줄이 길어진다 */
function monNum(m) {
  return +m.slice(5, 7) + '월';
}
/* ★ 111차 ④㉰. 눈금은 자리가 좁아 원 단위를 못 넣는다. 그림 하나에 단위 하나를 정하고
   그 이름을 축 제목에 적는다 — 축 제목이 없으면 「1」이 1원인지 1억인지 알 수 없다.
   ★ 이건 그림 공간을 위한 표시 단위다. 계산도, 원 단위로 적는 결과도 안 바꾼다.
   ★ manwon() 은 안 지운다 — 다른 자리에서 계속 쓴다 */
function axisUnit(hi) {
  var a = Math.abs(hi || 0);
  return a >= 100000000
    ? { div: 100000000, name: '억원' }
    : a >= 10000
      ? { div: 10000, name: '만원' }
      : { div: 1, name: '원' };
}
function axisTxt(v, u) {
  var a = Math.abs(v);
  if (a === 0) return '0';
  var s = v < 0 ? '−' : '';
  if (u) {
    var n = a / u.div;
    return s + (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
  }
  if (a >= 100000000) {
    var 억 = a / 100000000;
    return s + (억 >= 10 ? Math.round(억) : Math.round(억 * 10) / 10) + '억';
  }
  return s + won(Math.round(a / 10000)) + '만';
}
/* ── 50차 ⑦ · 눈금을 깔끔한 수로 ──────────────────────────────
   예전에는 그 파일의 제일 큰 값을 그대로 눈금에 썼다 — 「2,912만」·「6,860만」.
   높이를 읽는 자인데 눈금이 지저분하면 읽을 수가 없다.
   ★ 깔끔한 수 = 1 · 2 · 2.5 · 5 에 10을 거듭 곱한 것.
     2.5 를 넣어둔 덕에 어떤 값이든 축의 80% 이상을 쓴다 —
     48차에 25.9px 에서 162px 로 살린 것을 되돌리지 않으려는 것이다.
   ★ 0 은 언제나 넣는다. 적자가 내려가는 자리다.
   ★ 위아래 그림의 줄 수를 억지로 맞추지 않는다 —
     눈금은 각 그림 안에서만 뜻이 있다 */
/* ★ 66-12차 ②. 여기 있던 NICE 계단(1·1.5·2·2.5·3·4·5·6·8·10)과 niceUp·niceStep 은
   「맨 위 값을 깔끔한 수로 올린다」는 방식이었다. 그 방식은 위쪽만 줄을 긋고
   0 아래를 비워두어 눈금이 성겼다. 이제는 한 칸을 먼저 고르고 그 배수로 범위를 넓힌다 */
/* ── 66-12차 ② · 눈금을 고른 간격으로 ────────────────────────────
   예전에는 맨 위 값을 셋이나 넷으로 나눠 위쪽만 줄을 긋고,
   0 아래는 맨 밑 한 줄만 그었다. 그래서 0과 다음 줄 사이가 텅 비고
   음수 쪽은 눈금이 아예 없었다.
   ★ 한 칸(step)을 먼저 고르고, 그 배수로 범위를 넓힌 다음
     맨 아래부터 맨 위까지 한 칸씩 줄을 긋는다 — 숫자가 있는 자리엔 반드시 줄이 있다.
   ★ 한 칸은 1·2·2.5·5×10ⁿ 중에서만 고른다. 3,300만 같은 칸은 읽히지 않는다.
   ★ 줄이 너무 많으면 시끄럽다 — 여섯 줄을 넘으면 한 칸을 키운다 */
var NICE_STEP = [1, 2, 2.5, 5, 10];
function niceStepFor(span, want) {
  if (!(span > 0)) return 1;
  var raw = span / want;
  var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
  for (var i = 0; i < NICE_STEP.length; i++) {
    var s = p * NICE_STEP[i];
    if (s >= raw - 1e-9) return s;
  }
  return p * 10;
}
/* 그림이 담아야 할 범위 — 한 칸의 배수로 넓힌다. step 도 같이 돌려준다 */
function axisRange(lo, hi) {
  if (lo > 0) lo = 0;
  if (hi < 0) hi = 0;
  if (!(hi > lo)) hi = lo + 1;
  var step = niceStepFor(hi - lo, 4);
  var 막이 = 0;
  while ((hi - lo) / step > 6 && 막이++ < 8) step = niceStepFor(hi - lo, 3) * (막이 > 1 ? 2 : 1);
  var rlo = Math.floor(lo / step + 1e-9) * step;
  var rhi = Math.ceil(hi / step - 1e-9) * step;
  if (rhi === rlo) rhi = rlo + step;
  return { lo: rlo, hi: rhi, step: step };
}
function axisTicks(lo, hi, step) {
  if (!step) step = axisRange(lo, hi).step;
  var out = [],
    v;
  for (v = lo; v <= hi + step * 1e-6; v += step) out.push(Math.round(v));
  if (!out.length) out.push(0);
  return out;
}
/* ── 66차 ③ · 전월 대비 ─────────────────────────────────────────
   마감한 달끼리만 견준다. 진행 중인 달은 아직 22일치라
   마감 달과 견주면 「반토막 났다」는 거짓말이 된다.
   ★ 앞 달이 0이면 나눌 수가 없다 — 빈 칸으로 둔다.
   ★ 부호는 −(빼기 기호)를 쓴다. 아스키 하이픈은 화면에서 마이너스로 안 읽힌다 */
function pctDelta(cur, prev) {
  if (cur == null || prev == null || !prev) return '';
  var p = ((cur - prev) / Math.abs(prev)) * 100;
  if (!isFinite(p)) return '';
  var r = Math.round(p * 10) / 10;
  if (r === 0) return '0.0%';
  return (r > 0 ? '+' : '−') + Math.abs(r).toFixed(1) + '%';
}
/* ── 66차 ④ · 이번 달 일별 흐름 ──────────────────────────────────
   한 달 숫자만 보면 「이 달이 어떻게 흘러왔는지」가 안 보인다.
   날마다 번 돈(초록 막대·위)과 쓴 돈(빨강 막대·아래), 그 위에 계좌 순이익 누적선.

   ★ 기준은 월마감과 똑같다 — 사업 외 용도·계좌 간 이체·아직 안 정한 돈은 뺀다.
     그래서 누적선의 끝값이 이 달 계좌 순이익 숫자와 정확히 같아야 한다 (검증 기준).
   ★ 83차 ⑤. 직접 넣으신 금액(현금 매출 등)은 계좌에 안 들어온 돈이다.
     막대는 계좌에 찍힌 거래만 그린다 — 그러니 막대에는 안 얹는다.
     다만 누적선의 끝값은 계좌 순이익과 같아야 하므로 선에만 마지막 날에 얹는다.
     82차까지는 f.earn 에 얹어 막대까지 움직였다. 그 자리를 가른 것이다.
   ★ 눈금은 막대와 누적선을 한 자로 잰다. 자를 둘로 두면 어느 것이 큰지 거짓이 된다.
   ★ 막힌 달(아직 안 정한 돈이 많은 달)에는 안 그린다 — 끝값이 가리킬 순이익이 없다 */
function dailyFlowIn(U, m, cutDay) {
  var last = cutDay || monthDays(m);
  var earn = [],
    spend = [],
    i;
  for (i = 0; i <= last; i++) {
    earn.push(0);
    spend.push(0);
  }
  U.rows.forEach(function (r) {
    if (monthOf(r.at) !== m) return;
    var day = +r.at.slice(8, 10);
    if (!(day >= 1 && day <= last)) return;
    if (isUnknownIn(U, r)) return;
    if (xferOnIn(U, r)) return;
    var c = catOfIn(U, r);
    if (isKeepIn(U, c)) return;
    if (c === '매출') {
      earn[day] += r.amount;
      return;
    } /* 취소·환불은 음수로 깎인다 */
    if (r.amount > 0) {
      earn[day] += r.amount;
      return;
    } /* 매출 아닌 입금 */
    spend[day] += -r.amount;
  });
  return { last: last, earn: earn, spend: spend };
}
/* ── 84차 · 칸을 누르면 그날이 열린다 ──────────────────────────────
   82-1차에서 날짜 글자를 이틀 간격으로 촘촘히 넣었다. 그런데 막대는 하루도
   안 빠지고 다 있고 날짜 글자는 이틀에 하나뿐이라, 글자가 없는 날은 어느
   막대인지 눈으로 세야 했다 — 「9」와 「11」 사이 막대가 10일이라는 걸
   세어봐야 안다. 라벨을 아무리 촘촘히 해도 이건 안 풀린다.
   누른 뒤 화면이 푼다.
   ★ 그림은 「이 날 많이 썼다」까지만 말한다. 「무엇에 썼는지」는 그날 거래를 봐야 한다.
   ★ 계산을 안 바꾼다. 새 숫자를 만들지 않고 이미 있는 값을 다른 자리에 보여줄 뿐이다.
   ★ 고른 날은 UP 에만 둔다 — 저장통(fc.picks · fc.manual)에는 안 들어간다.
     달을 옮기면 저절로 풀린다 (열쇠에 달이 들어 있다) */
function dayPickIn(U, m) {
  var p = U && U.dayPick;
  return p && p.m === m ? p.d : null;
}
/* ── 84차 ④ · 그날 거래를 세 갈래로 가른다 ─────────────────────────
   막대는 사업 거래만 그린다. 아직 안 정한 돈·계좌 간 이체·사업 외 용도는 빠져 있다.
   그런데 목록에 그것들이 없으면 계좌에는 있는 거래가 화면에 없어서 「빠졌네」가 된다.
   그렇다고 다 섞으면 목록 합계가 위 요약과 안 맞아 보인다. 세 갈래로 나눠 둘 다 푼다.
   ★ 가르는 잣대도 차례도 dailyFlow 와 한 글자도 다르지 않다 —
     앞의 두 갈래가 막대이고, 셋을 합치면 그날 계좌에 든 거래 전부다.
   ★ 줄 차례는 UP.rows 에 있는 그대로다. 잔액이 이어지도록 이미 맞춰 둔 차례라
     여기서 다시 정렬하지 않는다 */
function daySplitIn(U, m, day) {
  var earn = [],
    spend = [],
    rest = [];
  U.rows.forEach(function (r) {
    if (monthOf(r.at) !== m) return;
    if (+r.at.slice(8, 10) !== day) return;
    if (isUnknownIn(U, r)) {
      rest.push({ r: r, why: '아직 안 정한 돈' });
      return;
    }
    if (xferOnIn(U, r)) {
      rest.push({ r: r, why: XFER_PART });
      return;
    }
    var c = catOfIn(U, r);
    if (isKeepIn(U, c)) {
      rest.push({ r: r, why: c });
      return;
    }
    if (c === '매출' || r.amount > 0) earn.push(r); /* 취소·환불은 음수로 깎인다 */
    else spend.push(r);
  });
  return { earn: earn, spend: spend, rest: rest };
}
/* 직접 넣으신 금액 가운데 그 날짜에 적으신 것 (83차 ②) */
function manualItemIn(U, id) {
  var f = ((U.manual && U.manual.items) || []).filter(function (it) {
    return it.id === id;
  })[0];
  if (f) return { name: f.name, side: f.side };
  return { name: CASH_NAME, side: 'in' }; /* 현금매출은 items 에 없다 (83차 ①) */
}
function dayManualIn(U, m, day) {
  var out = [];
  ((U.manual && U.manual.days && U.manual.days[m]) || []).forEach(function (it) {
    if (+it.day !== day) return;
    var one = manualItemIn(U, it.id);
    out.push({ name: one.name, side: one.side, amt: +it.amt || 0 });
  });
  return out;
}
/* ── 71차 ⑤ · 「한 해」 보기 ─────────────────────────────────────
   대표님들은 연도로 생각하신다. 예전에는 최근 열세 달이 굴러가서
   2025년과 2026년이 한 표에 섞여 있었다 — 「올해 얼마 벌었나」를 물으면
   표를 손가락으로 짚어 가며 더해야 했다.
   이제 해를 고르고, 그 해 1월부터 12월까지 고정된 자리로 본다.
   ★ 계산은 안 건드린다. monthNumbers 는 그대로다 —
     어느 달을 어떤 차례로 늘어놓을지만 여기서 정한다 */
function yearsWithData(months) {
  var seen = {},
    out = [];
  (months || []).forEach(function (m) {
    var y = m.slice(0, 4);
    if (!seen[y]) {
      seen[y] = 1;
      out.push(y);
    }
  });
  out.sort();
  return out;
}
/* 그 해 1월부터 12월까지. 자료가 없는 달도 자리는 있다 */
function yearMonths(y) {
  var out = [];
  for (var i = 1; i <= 12; i++) out.push(y + '-' + (i < 10 ? '0' + i : '' + i));
  return out;
}
