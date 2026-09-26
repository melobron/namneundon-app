/* 계산은 core/result.js 의 openingMonthsIn — 지금 매장(UP)을 넘긴다 */
function openingMonths(cols, months) {
  return openingMonthsIn(UP, cols, months);
}

/* 계산은 core/result.js 의 closedColsIn — 지금 매장(UP)을 넘긴다 */
function closedCols(months, cols) {
  return closedColsIn(UP, months, cols);
}
/* 계산은 core/result.js 의 lastClosedMonthIn — 지금 매장(UP)을 넘긴다 */
function lastClosedMonth(months, cols) {
  return lastClosedMonthIn(UP, months, cols);
}

/* ── 48차 ① · 순이익 그림과 잔액 그림을 위아래로 ─────────────────
   47차에는 눈금 하나를 둘이 같이 썼다. 뜻은 맞았는데 그리고 나니
   예시 8개월에서 순이익 막대가 150px 중 25.9px 만 썼다 —
   잔액이 1억대라 축을 다 먹는다. 731만원과 2,912만원이 네 배 차이인데
   그 네 배가 26px 안에서 벌어지니 사장님 눈에는 다 고만고만한 막대다.
   ★ 그림을 둘로 나눈다. 각 그림 안에는 눈금이 하나뿐이라
     「같은 높이 = 같은 돈」이 그대로 지켜진다.
     거짓말은 한 그림에 두 축을 넣을 때 생기는 것이고 여기서는 안 생긴다.
   ★ 가로축은 같은 자리에 두고 한 상자 안에서 같이 스크롤한다 —
     7월 자리에서 위는 막대가 있는데 아래는 선이 내려간 것이 그대로 보인다.
   ★ 왼쪽 눈금은 스크롤 상자 밖에 고정한다. 가로로 밀어도 제자리에 있어야 읽힌다.
   ★ 눈금 글자만 만원·억으로 줄여 쓴다 — 눈금은 대조하는 숫자가 아니라
     높이를 읽는 자다. 표와 결과 화면의 금액은 원 단위 그대로다 */
/* ★ 66-6차 ①. 옛 고정폭 그림에 쓰던 자들(CH_W·CH_TOP·CH_BOT·CH_AXIS·CH_MON)은
   그림이 화면 폭에 맞춰지면서 쓸 데가 없어져 걷어냈다.
   지금 쓰는 자는 아래 CH_ONE(높이)·CH_VW(기준 폭) 둘뿐이고,
   나머지 여백은 그리는 자리에서 바로 정한다 */

function svgEl(tag, attrs) {
  var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.keys(attrs).forEach(function (k) {
    e.setAttribute(k, attrs[k]);
  });
  return e;
}
/* ── 55차 ② · 그림마다 제 범례를 제 제목 줄에 ────────────────
   예전에는 셋을 두 그림 아래 한 번에 두었다. 막대 색이 바뀐 자리에서
   한참 내려가야 뜻을 찾아, 「초록색으로 바뀌었길래 이게 뭐지 하고 한참 찾았다」가 됐다.
   ★ 빨강이 범례에 없었다 — 그림에는 나오는데 뜻이 어디에도 없었다.
     다 정한 적자 달이 그 색이다. 이번에 같이 넣는다.
   ★ 괄호를 붙인 긴 이름(「순이익 (다 정함)」)은 두 줄이 되고 제목까지 민다.
     짧은 셋을 나란히 두면 앞의 둘은 정해진 것이고 마지막만 안 정해진 것이라는 게
     대비로 읽힌다 */
function chHead(title, marks, sub) {
  var h = el('div', 'chhead');
  h.appendChild(el('div', 'chlab', title));
  /* ★ 66-4차 ③. 범례와 부제를 한 묶음으로 오른쪽에 세운다.
     예전에는 범례만 오른쪽이고 부제는 가운데라, 그림마다 설명 자리가 달라 보였다.
     같은 것은 늘 같은 자리에 있어야 한다 (49차) — 그림 셋 다 이 함수를 쓴다.
     ★ 제목은 그대로 가운데다 (64-5차). 좁은 화면에서 제목과 부딪히지 않게
       한 줄 아래에 묶음을 둔다 — 옆에 나란히 두면 390px 에서 겹친다 */
  var r = el('div', 'chright');
  var k = el('div', 'chkey');
  marks.forEach(function (m) {
    k.appendChild(el('span', m[0], m[1]));
  });
  r.appendChild(k);
  if (sub) {
    (Array.isArray(sub) ? sub : [sub]).forEach(function (s) {
      if (s) r.appendChild(el('div', 'chsub', s));
    });
  }
  h.appendChild(r);
  return h;
}
/* ── 66-6차 ① · 1년치 그림 — 열두어 달을 한 화면에 ──────────────────
   「한눈에 보기」 구역인데 옆으로 밀어야 다 보이면 한눈이 아니다.
   이번 달 일별 그림이 스무 날을 390px 에 다 넣는 것과 같은 방법으로 바꾼다 —
   폭을 고정하지 않고 viewBox 로 화면 폭에 맞춘다.
   ★ 한 달 칸 너비를 달 수로 나눠 정한다. 달이 많으면 막대가 얇아지되
     간격을 먼저 줄여서 색이 안 사라지게 한다 (막대는 칸의 72%).
   ★ 눈금도 그림 안에 함께 그린다 — 밀 것이 없으니 눈금을 따로 붙들 까닭이 없다.
   ★ 왼쪽 눈금 = 순이익(막대) · 오른쪽 눈금 = 잔액(선). 자릿수가 달라 자를 둘로 둔다.
     격자선은 왼쪽 자로만 긋는다. 두 자의 눈금이 서로 안 맞는 것은
     축이 둘인 그림의 당연한 모습이고, 억지로 맞추면 눈금이 이상한 수가 된다.
   ★ 눈금 글자 색을 각각 제 것 색으로 둔다 — 어느 자가 누구 것인지 그것으로 안다 */
/* ── 66-7차 ① · 그림을 픽셀 자로 그린다 ────────────────────────────
   viewBox 로 늘리면 화면이 넓어질수록 글자·막대·선 굵기까지 같이 커진다 —
   1024px 에서 축 글자가 표 본문보다 커졌다.
   그래서 그리는 자리에서 상자의 실제 픽셀 폭을 재고,
   글자 크기·선 굵기·여백은 픽셀로 못 박는다. 높이도 고정이다.
   ★ 폭이 바뀌면 다시 그린다 (창 돌리기·창 크기 바꾸기).
     정수 픽셀이 바뀔 때만 다시 그려 되돌이를 막는다.
   ★ 상자가 아직 안 보이는 자리(hidden)면 폭이 0이라 화면 폭으로 어림한다 */
var CH_MAXW = 640; /* 이보다 넓어지지 않는다. 넘으면 가운데로 */
var CH_H1 = 220; /* 1년치 그림 높이 (달 이름 줄 포함) */
var CH_H2 = 180; /* 이번 달 일별 그림 높이 (날짜 줄 포함) */
function fitChart(wrap, H, draw) {
  function 폭() {
    var w = wrap.clientWidth || 0;
    /* clientWidth 에는 안쪽 여백이 들어 있다. 그림이 쓸 수 있는 폭은 그것을 뺀 값이다 */
    if (w) {
      var cs = getComputedStyle(wrap);
      w -= (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    }
    if (w <= 0) w = (document.body.clientWidth || 390) - 72;
    return Math.max(240, Math.min(CH_MAXW, Math.round(w)));
  }
  var 지난폭 = 0;
  function 그리기() {
    var w = 폭();
    if (w === 지난폭) return;
    지난폭 = w;
    wrap.innerHTML = '';
    var svg = svgEl('svg', { width: w, height: H, viewBox: '0 0 ' + w + ' ' + H });
    draw(svg, w);
    wrap.appendChild(svg);
  }
  그리기();
  if (window.ResizeObserver) {
    try {
      new ResizeObserver(그리기).observe(wrap);
    } catch (e) {}
  }
}
/* ── 66-9차 ① · 눈금 글자가 카드 밖으로 안 나가게 ────────────────
   왼쪽 여백을 42px 로 못 박아 두었더니 「2,500만」처럼 긴 라벨의 앞자리가 잘렸다.
   글자 폭을 실제로 재서 그만큼 자리를 비운다.
   ★ 재는 자는 캔버스다 — 화면에 붙이지 않고도 폭을 알 수 있어 그리기 전에 쓸 수 있다.
   ★ 글꼴은 본문과 같은 것을 쓴다. 다른 글꼴로 재면 잰 값이 뜻이 없다 */
var _measCtx = null;
function textW(s, px) {
  if (!_measCtx) {
    try {
      _measCtx = document.createElement('canvas').getContext('2d');
    } catch (e) {
      return String(s).length * px * 0.6;
    }
  }
  if (!_measCtx) return String(s).length * px * 0.6;
  var fam = '';
  try {
    fam = getComputedStyle(document.body).fontFamily;
  } catch (e) {}
  _measCtx.font = px + 'px ' + (fam || 'sans-serif');
  return _measCtx.measureText(String(s)).width;
}
/* 눈금 라벨 중 가장 긴 것에 맞춘 왼쪽 자리 (글자 + 눈금과의 사이 + 여유) */
function axisLeft(ticks) {
  var w = 0;
  ticks.forEach(function (v) {
    w = Math.max(w, textW(axisTxt(v), 11));
  });
  return Math.ceil(w) + 13;
}
/* ── 82-1차 · 한 달 그림의 날짜 줄 ──────────────────────────────
   예전에는 「8/1 · 8/5 · 8/10 · 8/15 · 8/22」 다섯 개였다.
   ★ 월은 안 쓴다 — 제목 아래 「8월 1일 ~ 8월 22일」이 이미 말한다.
     같은 것을 두 자리에서 말하지 않는다 (49차).
   ★ 이틀 간격으로 촘촘히 넣는다. 「이 날 많이 썼구나」를 날짜로 짚으려면
     닷새 간격으로는 세어 봐야 한다.
   ★ 마지막 날은 간격에 안 맞아도 늘 넣는다 — 자료가 어디서 끝났는지가 사실이다.
   ★ 390px 처럼 좁아 이틀 간격 글자가 서로 닿을 때만 사흘로 벌린다.
     두 그림(일별 흐름·계좌 잔액)이 이 함수 하나를 같이 쓰므로 날짜 줄이 늘 같다.
   ★ 1년 그림은 이 함수를 안 쓴다 — 거기는 달 이름 줄이라 그대로다 */
function dayTicks(last, colW) {
  /* 가장 긴 라벨(두 자리)에 글자 사이 최소 간격을 더한 값 */
  var 필요 = textW(String(last), 10) + 3;
  var step = colW * 2 < 필요 ? 3 : 2;
  var out = [],
    d;
  for (d = 1; d <= last; d += step) out.push(d);
  /* 마지막 날은 늘 넣는다. 간격에 맞아 이미 들어 있으면 두 번 넣지 않는다.
     ★ 83차 ⑦. 말일이 짝수인 달은 바로 앞 라벨과 한 칸밖에 안 떨어져 글자가 붙는다
       (30일 달의 「29 30」이 0.5px 겹쳤다). 그럴 때는 앞 것을 뺀다 —
       …·27·29·30 이 아니라 …·27·30 이 된다 */
  if (out[out.length - 1] !== last) {
    /* ★ 요청서는 「< 2」였다. 320px 에서는 간격이 사흘로 벌어지는데
       그때 30일 달의 「28 30」이 다시 0.6px 로 붙었다 (이틀 사이인데 자가 사흘이다).
       문턱을 간격 자체로 두면 어느 폭에서도 같은 뜻이 된다 */
    if (last - out[out.length - 1] < step) out.pop();
    out.push(last);
  }
  return out;
}
/* ── 66-8차 ① · 1년치 그림 둘 ────────────────────────────────────
   축을 둘로 둔 그림을 없앤다. 왼쪽 1,250만과 오른쪽 5,000만이 나란히 서 있으면
   막대와 선을 눈으로 견주게 되는데 자가 서로 달라 뜻이 없다.
   ★ [그림1] 번 돈·쓴 돈 막대와 계좌 순이익 선 — 셋 다 원 단위라 자 하나로 잰다.
     이번 달 일별 그림과 같은 문법이다. 달 단위로 바꾼 것뿐이다.
   ★ [그림2] 월말 계좌 잔액 선 — 자릿수가 다르니 제 그림에서 제 자로 잰다. 낮게.
   ★ 막힌 달에서는 순이익 선을 끊는다. 0으로 이으면 그 달이 0원이었다는 말이 된다.
   ★ 66-8차 ②. 강조는 색이 아니라 진하기로 한다 —
     막대는 배경처럼 옅게, 선은 주인공답게 진하게. 격자선은 거의 안 보이게 */
var CH_H3 = 150; /* 잔액 그림 높이 (달 이름 줄 포함) */
var CH_BAR = 0.42; /* 막대 진하기 — 시안의 옅은 초록·빨강 */
/* ★ 70차 ③ · 그래프 x축의 「진행 중」 ──────────────────────────────
   표 헤더(①)에는 알약이 붙었는데 그래프 라벨은 다른 달과 똑같아서,
   같은 화면 안에서 8월이 두 가지로 보였다. 말도 모양도 표와 같게 맞춘다.
   ★ 새 색은 안 만든다 — 호박(--est) 계열, 표 알약과 같은 것이다.
   ★ 알약이 카드 밖으로 잘리지 않게 그림 높이에 RUN_PAD 만큼만 더 준다.
     그림이 그려지는 자리(PH)는 그대로다 — 막대도 선도 한 픽셀 안 움직인다.
   ★ 한 달 화면의 일별 그래프에는 안 붙인다 (요청서 3) */
var RUN_PAD = 16;
function runLabel(svg, cx, ly, 진행) {
  var t = svgEl('text', {
    x: cx,
    y: ly,
    'text-anchor': 'middle',
    'font-size': '10',
    fill: 진행 ? 'var(--est)' : 'var(--gray)',
    'text-decoration': 'underline'
  });
  if (진행) t.setAttribute('font-weight', '700');
  svg.appendChild(t);
  return t;
}
function runPill(svg, cx, ly, W) {
  var pw = Math.ceil(textW('진행 중', 9)) + 12,
    ph = 13;
  var px = cx - pw / 2;
  if (px < 1) px = 1;
  if (px + pw > W - 1) px = W - 1 - pw;
  var py = ly + 4;
  svg.appendChild(
    svgEl('rect', {
      x: px,
      y: py,
      width: pw,
      height: ph,
      rx: 6.5,
      fill: 'var(--estbg)',
      stroke: 'var(--estline)',
      'stroke-width': 1
    })
  );
  var t = svgEl('text', {
    x: px + pw / 2,
    y: py + 9.5,
    'text-anchor': 'middle',
    'font-size': '9',
    'font-weight': '700',
    fill: 'var(--est)'
  });
  t.textContent = '진행 중';
  svg.appendChild(t);
}
function drawProfitChart(host, months, cols, 진행달) {
  if (!months.length) return;
  var n = months.length;
  var pts = months.map(function (m, i) {
    var c = cols[i];
    /* ★ 71차 ⑤-4. 자료가 없는 달은 자리만 두고 아무것도 안 그린다.
       0으로 그리면 「그 달에 0원 벌었다」로 읽힌다 — 그건 거짓말이다 */
    return {
      m: m,
      c: c,
      없음: !!c.없음,
      blocked: !!c.blocked && !c.없음,
      unset: !c.없음 && (c.unknown || 0) > 0,
      earn: c.sales + c.otherIn,
      cost: c.cost,
      profit: c.profit,
      lo: c.lo,
      hi: c.hi,
      close: c.close
    };
  });
  /* ★ 119차. 음수인 달 강조 — 기존 월별 값(monthNumbers)으로만 가른다. 계산은 안 바꾼다.
     ★ 안 정한 거래가 없으면 계좌 순이익 < 0 일 때.
     ★ 안 정한 거래가 있으면 기존 범위의 상한 hi < 0 일 때만 — 어떻게 정해도 음수인 달이다.
       범위가 0원에 닿거나 양수까지 걸치면 강조하지 않는다. 0원은 강조하지 않는다.
     ★ 진행 중인 달도 같은 조건이다. 「진행 중」 알약은 그대로 둔다.
     ★ 점 자리는 그대로 p.profit 이다 — 그래프 값의 뜻을 바꾸지 않는다 */
  pts.forEach(function (p) {
    p.적자 = !p.없음 && !p.blocked && (p.unset ? p.hi < 0 : p.profit < 0);
  });
  var 연한조각 = pts.some(function (p) {
    return !p.blocked && p.unset && p.hi > p.lo;
  });
  /* ── 그림 1 ── */
  var aLo = 0,
    aHi = 0;
  pts.forEach(function (p) {
    if (p.없음) return; /* ★ 71차 ⑤. 자료 없는 달은 눈금 범위에도 안 넣는다 */
    if (p.earn > aHi) aHi = p.earn;
    if (p.cost > aHi) aHi = p.cost;
    if (p.blocked) return;
    aLo = Math.min(aLo, p.lo, p.profit);
    aHi = Math.max(aHi, p.hi, p.profit);
  });
  if (aHi === aLo) aHi = aLo + 1;
  var rgA = axisRange(aLo, aHi);
  var lo = rgA.lo,
    hi = rgA.hi,
    stepA = rgA.step;

  var box = el('div', 'chbox');
  var marks = [
    ['kgood', '■ 사업으로 번 돈'],
    ['kwarn', '■ 사업에 쓴 돈'],
    ['kprof', '— 계좌 순이익']
  ];
  if (연한조각) marks.push(['kest', '■ 아직 덜 정함']);
  /* ★ 111차 ④㉰. 눈금 단위를 그림 제목에 밝힌다 */
  /* ★ 112차 ①. 단위는 그림마다 따로 둔다. 예전에는 한 함수 안에서 U단위 하나를
     두 그림이 같이 썼다 — var 는 함수 하나에 하나뿐이라 아래 그림이 위 그림의 값을
     덮어썼다. 제목은 chHead 로 먼저 그려져 안 바뀌는데, fitChart 가
     ResizeObserver 로 다시 그릴 때는 덮인 값을 읽는다.
     그래서 「(만원)」이라 써 놓고 눈금만 억 단위로 찍혔다 */
  var U순이익 = axisUnit(Math.max(Math.abs(lo), Math.abs(hi)));
  /* ★ 77차. 그래프 자체와 범례가 말하는 설명은 반복하지 않는다. */
  box.appendChild(
    chHead('달마다 사업으로 번 돈 · 사업에 쓴 돈 · 계좌 순이익 (' + U순이익.name + ')', marks, null)
  );
  var wrap = el('div', 'chone');
  box.appendChild(wrap);
  host.appendChild(box);
  /* ★ 70차 ③. 진행 중인 달이 있으면 알약이 들어갈 자리만큼 그림을 아래로 늘린다.
     그림이 그려지는 자리(PH)는 그대로라 막대·선·축은 한 픽셀도 안 움직인다 */
  var 진행덧 = months.some(function (mm) {
    return isRunning(mm, months);
  })
    ? RUN_PAD
    : 0;
  fitChart(wrap, CH_H1 + 진행덧, function (svg, W) {
    var ticks = axisTicks(lo, hi, stepA);
    var LEFT = axisLeft(ticks),
      RIGHT = 10,
      PAD = 14,
      MON = 18;
    var PH = CH_H1 - MON;
    var colW = (W - LEFT - RIGHT) / n;
    /* 막대 둘이 나란히 선다. 가늘게 두고 사이를 넉넉히 남긴다 (시안) */
    var bw = Math.max(2.5, Math.min(12, colW * 0.3));
    function y(v) {
      if (hi === lo) return PAD;
      return PAD + ((hi - v) / (hi - lo)) * (PH - PAD * 2);
    }
    function x(i) {
      return LEFT + i * colW + colW / 2;
    }
    ticks.forEach(function (v) {
      svg.appendChild(
        svgEl('line', {
          x1: LEFT - 4,
          y1: y(v),
          x2: W - RIGHT,
          y2: y(v),
          stroke: 'var(--line)',
          'stroke-width': v === 0 ? 1 : 0.6,
          opacity: v === 0 ? '0.9' : '0.55'
        })
      );
      var t = svgEl('text', {
        x: LEFT - 8,
        y: y(v) + 3.5,
        'text-anchor': 'end',
        'font-size': '11',
        fill: 'var(--gray)'
      });
      t.textContent = axisTxt(v, U순이익);
      svg.appendChild(t);
    });
    var y0 = y(0);
    /* ★ 119차. 음수인 달 강조 — 그 달 칸에 옅은 빨강을 막대 뒤에 깐다 (기존 --warn 을 옅게) */
    pts.forEach(function (p, i) {
      if (!p.적자) return;
      svg.appendChild(
        svgEl('rect', {
          x: LEFT + i * colW,
          y: 0,
          width: colW,
          height: PH,
          fill: 'var(--warn)',
          opacity: '0.12',
          class: 'negcol'
        })
      ); /* ★ 119차. 0.08 → 0.12 (배경만 진하게) */
    });
    pts.forEach(function (p, i) {
      if (p.없음) return; /* ★ 71차 ⑤. 자료 없는 달은 막대도 알약도 없다 */
      var cx = x(i);
      if (p.earn > 0) {
        svg.appendChild(
          svgEl('rect', {
            x: cx - bw - 1.5,
            y: y(p.earn),
            width: bw,
            height: Math.max(1, y0 - y(p.earn)),
            rx: 2,
            fill: 'var(--good)',
            opacity: String(CH_BAR)
          })
        );
      }
      if (p.cost > 0) {
        svg.appendChild(
          svgEl('rect', {
            x: cx + 1.5,
            y: y(p.cost),
            width: bw,
            height: Math.max(1, y0 - y(p.cost)),
            rx: 2,
            fill: 'var(--warn)',
            opacity: String(CH_BAR)
          })
        );
      }
      /* ★ 64-5차. 안 정한 돈만큼 순이익이 움직일 수 있는 폭 */
      if (!p.blocked && p.unset && p.hi > p.lo) {
        svg.appendChild(
          svgEl('rect', {
            x: cx - 4,
            y: y(p.hi),
            width: 8,
            height: Math.max(1, y(p.lo) - y(p.hi)),
            rx: 2,
            fill: 'var(--est)',
            opacity: '0.22'
          })
        );
      }
      /* ★ 49차 ②. 막힌 달은 왜 비었는지 밝힌다.
         ★ 66-12차 ③. 회색이라 그냥 지나치게 됐다 —
           우리 색 체계에서 「아직 덜 정함」은 호박색(--est)이다.
         ★ 66-15차 확정. 점선 기둥은 없앤다 — 막대는 그대로 두고,
           그림 맨 아래(달 이름 바로 위)에 채운 호박 알약 하나만 띄운다.
           일별 그림의 「지금까지」 알약과 같은 문법이다.
         ★ 막대를 가리지 않게 맨 아래에 둔다. 순이익 선이 그 달에서 끊기는 것과
           그림 아래 각주는 그대로다 */
      if (p.blocked) {
        var aw = Math.ceil(textW('아직', 11)) + 16,
          ah = 18;
        var ax = cx - aw / 2;
        if (ax < 1) ax = 1;
        if (ax + aw > W - 1) ax = W - 1 - aw;
        var ay = PH - 2 - ah;
        svg.appendChild(
          svgEl('rect', { x: ax, y: ay, width: aw, height: ah, rx: 9, fill: 'var(--est)' })
        );
        var em = svgEl('text', {
          x: ax + aw / 2,
          y: ay + 12.5,
          'text-anchor': 'middle',
          'font-size': '11',
          'font-weight': '700',
          fill: 'var(--paper)'
        });
        em.textContent = '아직';
        svg.appendChild(em);
      }
    });
    /* 순이익 선 — 막힌 달에서 끊는다 */
    var 토막 = [],
      지금 = [];
    pts.forEach(function (p, i) {
      if (p.없음 || p.blocked) {
        if (지금.length) {
          토막.push(지금);
          지금 = [];
        }
        return;
      }
      지금.push(x(i) + ',' + y(p.profit));
    });
    if (지금.length) 토막.push(지금);
    토막.forEach(function (seg) {
      if (seg.length < 2) return;
      svg.appendChild(
        svgEl('polyline', {
          points: seg.join(' '),
          fill: 'none',
          stroke: 'var(--brand)',
          'stroke-width': 2.2,
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round'
        })
      );
    });
    /* ★ 119차. 음수인 달의 금액 글 자리 — 금액끼리 겹치면 뒤의 것은 안 쓴다.
       안 쓴 달도 빨간 칸·점·달 이름은 남고, 누르면 그 달 상세에서 금액을 본다 */
    var 쓴자리 = [];
    pts.forEach(function (p, i) {
      var cx = x(i);
      if (!p.blocked && !p.없음) {
        var 점 = svgEl('circle', {
          cx: cx,
          cy: y(p.profit),
          r: 3,
          fill: p.적자 ? 'var(--warn)' : 'var(--paper)',
          stroke: p.적자 ? 'var(--warn)' : 'var(--brand)',
          'stroke-width': 2
        });
        if (p.적자) {
          점.setAttribute('class', 'negdot');
          var tt = svgEl('title', {});
          /* 안 정한 거래가 있는 달은 한 금액을 확정값처럼 쓰지 않고 기존 범위를 적는다 */
          tt.textContent =
            +p.m.slice(5, 7) +
            '월 계좌 순이익 ' +
            (p.unset
              ? '범위 ' + won(Math.round(p.lo)) + '원 ~ ' + won(Math.round(p.hi)) + '원'
              : won(p.profit) + '원');
          점.appendChild(tt);
        }
        svg.appendChild(점);
      }
      if (p.적자 && !p.unset) {
        /* 안 정한 거래가 있는 달은 금액 글을 안 쓴다 */
        var 글 = won(p.profit) + '원',
          gw = textW(글, 11);
        var gx = Math.max(LEFT + 1 + gw / 2, Math.min(W - RIGHT - 1 - gw / 2, cx));
        var gy = y(p.profit) + 16;
        if (gy > PH - 3) gy = y(p.profit) - 8;
        var 겹 = 쓴자리.some(function (b) {
          return gx - gw / 2 < b.r + 4 && b.l - 4 < gx + gw / 2;
        });
        if (!겹) {
          var nt = svgEl('text', {
            x: gx,
            y: gy,
            'text-anchor': 'middle',
            'font-size': '11',
            'font-weight': '700',
            fill: 'var(--warn)',
            stroke: 'var(--paper)',
            'stroke-width': 3,
            'paint-order': 'stroke',
            class: 'negamt'
          });
          nt.textContent = 글;
          svg.appendChild(nt);
          쓴자리.push({ l: gx - gw / 2, r: gx + gw / 2 });
        }
      }
      /* ★ 70차 ③. 진행 중인 달은 호박 굵게 + 밑에 알약 (표 헤더와 같은 말·모양) */
      var 진행c = p.m === 진행달;
      var t = runLabel(svg, cx, PH + 13, 진행c);
      t.textContent = +p.m.slice(5, 7) + '월';
      /* ★ 119차. 음수인 달 이름은 진한 빨강 */
      if (p.적자) {
        t.setAttribute('fill', 'var(--warn)');
        t.setAttribute('font-weight', '700');
        t.setAttribute('class', 'negmon');
      }
      if (진행c) runPill(svg, cx, PH + 13, W);
      if (p.없음) return; /* 자료 없는 달은 눌러도 갈 곳이 없다 */
      var r = svgEl('rect', {
        x: LEFT + i * colW,
        y: 0,
        width: colW,
        height: CH_H1 + 진행덧,
        fill: 'transparent',
        style: 'cursor:pointer'
      });
      r.addEventListener('click', function () {
        goMonth(p.m);
      });
      svg.appendChild(r);
    });
  });

  /* ── 그림 2 · 월말 계좌 잔액 ── */
  var bLo = 0,
    bHi = 0;
  pts.forEach(function (p) {
    if (p.없음) return;
    bLo = Math.min(bLo, p.close);
    bHi = Math.max(bHi, p.close);
  });
  if (bHi === bLo) bHi = bLo + 1;
  var rgB = axisRange(bLo, bHi);
  var blo = rgB.lo,
    bhi = rgB.hi,
    stepB = rgB.step;
  var box2 = el('div', 'chbox');
  /* ★ 112차 ①. 위 그림(U순이익)과 다른 변수다. 잔액은 자릿수가 달라 단위도 다르다 —
     둘을 억지로 맞추지 않는다 */
  var U월잔액 = axisUnit(Math.max(Math.abs(blo), Math.abs(bhi))); /* ★ 111차 ④㉰ */
  /* ★ 60차 ③ (용어규칙 10). 진행 중인 달의 잔액은 「월말」이 아니라 그날까지의 값이다 */
  box2.appendChild(
    chHead('월말 계좌 잔액 (' + U월잔액.name + ')', [['know', '— 계좌 잔액']], null)
  );
  var wrap2 = el('div', 'chone');
  box2.appendChild(wrap2);
  host.appendChild(box2);
  fitChart(wrap2, CH_H3 + 진행덧, function (svg, W) {
    var ticks = axisTicks(blo, bhi, stepB);
    var LEFT = axisLeft(ticks),
      RIGHT = 10,
      PAD = 12,
      MON = 18;
    var PH = CH_H3 - MON;
    var colW = (W - LEFT - RIGHT) / n;
    function y(v) {
      if (bhi === blo) return PAD;
      return PAD + ((bhi - v) / (bhi - blo)) * (PH - PAD * 2);
    }
    function x(i) {
      return LEFT + i * colW + colW / 2;
    }
    ticks.forEach(function (v) {
      svg.appendChild(
        svgEl('line', {
          x1: LEFT - 4,
          y1: y(v),
          x2: W - RIGHT,
          y2: y(v),
          stroke: 'var(--line)',
          'stroke-width': v === 0 ? 1 : 0.6,
          opacity: v === 0 ? '0.9' : '0.55'
        })
      );
      var t = svgEl('text', {
        x: LEFT - 8,
        y: y(v) + 3.5,
        'text-anchor': 'end',
        'font-size': '11',
        fill: 'var(--gray)'
      });
      t.textContent = axisTxt(v, U월잔액);
      svg.appendChild(t);
    });
    /* ★ 71차 ⑤. 자료 없는 달에서 선을 끊는다 — 이어 그으면 0원까지
       내려갔다 올라온 것처럼 보인다. 없는 것은 없는 대로 비워 둔다 */
    var 조각 = [],
      이번 = [];
    pts.forEach(function (p, i) {
      if (p.없음) {
        if (이번.length) {
          조각.push(이번);
          이번 = [];
        }
        return;
      }
      이번.push(x(i) + ' ' + y(p.close));
    });
    if (이번.length) 조각.push(이번);
    조각.forEach(function (seg) {
      if (seg.length < 2) return;
      svg.appendChild(
        svgEl('path', {
          d: 'M ' + seg.join(' L '),
          fill: 'none',
          stroke: 'var(--now)',
          'stroke-width': 2.2,
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round'
        })
      );
    });
    pts.forEach(function (p, i) {
      var cx = x(i);
      if (!p.없음) {
        svg.appendChild(
          svgEl('circle', {
            cx: cx,
            cy: y(p.close),
            r: 3,
            fill: 'var(--paper)',
            stroke: 'var(--now)',
            'stroke-width': 2
          })
        );
      }
      /* ★ 70차 ③. 잔액 그래프에도 같은 표시 — 두 그림이 같은 말을 해야 한다 */
      var 진행c2 = p.m === 진행달;
      var t = runLabel(svg, cx, PH + 13, 진행c2);
      t.textContent = +p.m.slice(5, 7) + '월';
      if (진행c2) runPill(svg, cx, PH + 13, W);
      if (p.없음) return;
      var r = svgEl('rect', {
        x: LEFT + i * colW,
        y: 0,
        width: colW,
        height: CH_H3 + 진행덧,
        fill: 'transparent',
        style: 'cursor:pointer'
      });
      r.addEventListener('click', function () {
        goMonth(p.m);
      });
      svg.appendChild(r);
    });
  });
}
/* ── 66-8차 ③ · 1년치 요약 한 줄 ──────────────────────────────────
   여기 있던 「N월은 순이익이 났는데 계좌는 …」은 한 달짜리 이야기라
   1년치 구역에서 뺐다. 그 달 화면에서 할 말이다.
   그 자리에 열두 달을 한 줄로 요약한다. 완료된 달만 센다.
   ★ 막힌 달은 순이익을 셀 수 없으니 합계에서 빼고, 뺐다는 것을 밝힌다 */
function yearSumLine(months, cols) {
  var done = closedCols(months, cols);
  if (!done.length) return null;
  var 셀수있는 = done.filter(function (c) {
    return !c.blocked;
  });
  if (!셀수있는.length) return null;
  var 흑 = 0,
    적 = 0,
    사업외 = 0;
  셀수있는.forEach(function (c) {
    if (c.profit > 0) 흑++;
    else if (c.profit < 0) 적++;
    사업외 += c.keepOut || 0;
  });
  /* ★ 66-16차 ③. 순이익 합계는 바로 위 카드가 이미 말한다 — 여기서 두 번 안 쓴다.
     ★ 흑자는 초록, 적자는 빨강. 뜻 색 체계 그대로다 (24차) */
  var box = el('div', 'ysum');
  box.appendChild(el('b', 'ysumg', '흑자 ' + won(흑) + '달'));
  box.appendChild(document.createTextNode(' / '));
  box.appendChild(el('b', 'ysumw', '적자 ' + won(적) + '달'));
  box.appendChild(document.createTextNode(' · 사업 외 용도로 나간 돈 ' + won(사업외) + '원'));
  if (셀수있는.length < done.length) {
    var 제외달 = done.length - 셀수있는.length;
    box.appendChild(
      el('div', 'ysum2', '아직 안 정한 ' + won(제외달) + '달은 합계에서 제외했습니다')
    );
  }
  return box;
}
/* ── 54차 ⑤ · 1년치 표의 「아직 안 정한 돈」 숫자를 누르면 정하러 간다 ─
   한 달 화면에는 이미 상자와 「거래처 더 정하기 N곳」 버튼이 있다.
   1년치에서만 갈 길이 없었다. 새 화면을 만들지 않고 그 상자를 펴 놓고 간다.
   ★ 49차 ⑤(「▾ 아직 안 정한 …」 줄)과 같은 방식이다.
     편 자리가 화면 밖이면 안 누른 것과 같아서 그 줄로 스크롤한다 */
function goUnset(m) {
  UP.month = m;
  UP.view = 'month';
  UP.open = { __unset: true };
  UP.ckPin = {};
  drawResult(monthList());
  setTimeout(function () {
    var rows = document.querySelectorAll('#up-result .orow');
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].textContent.indexOf('아직 안 정한 돈') === 0) {
        rows[i].scrollIntoView({ block: 'center' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, 0);
}
function goMonth(m) {
  UP.month = m;
  UP.view = 'month';
  UP.open = {};
  UP.ckPin = {};
  drawResult(monthList());
  window.scrollTo(0, 0);
}

/* 계산은 core/result.js 의 dailyFlowIn — 지금 매장(UP)을 넘긴다 */
function dailyFlow(m, cutDay) {
  return dailyFlowIn(UP, m, cutDay);
}
/* 계산은 core/result.js 의 dayPickIn — 지금 매장(UP)을 넘긴다 */
function dayPick(m) {
  return dayPickIn(UP, m);
}
function setDayPick(m, day) {
  UP.dayPick = day === null ? null : { m: m, d: day };
}
/* 고른 날 칸에 옅은 세로 띠. 두 그림에 같이 깔린다 */
function daySelBand(svg, m, f, LEFT, colW, H) {
  var sel = dayPick(m);
  if (sel === null || sel < 1 || sel > f.last) return;
  svg.appendChild(
    svgEl('rect', { x: LEFT + (sel - 1) * colW, y: 0, width: colW, height: H, class: 'dcsel' })
  );
}
/* ★ 누르는 자리는 막대가 아니라 칸 전체다 —
   390px 화면에서 칸폭이 10px 안팎이라 막대를 손가락으로 겨눌 수 없고,
   번 돈이 없는 날은 막대가 아예 없다.
   ★ 띠끼리 겹치지 않게 잇대어 둔다. 겹치면 옆날이 눌린다 —
     왼끝이 LEFT+(i-1)*colW 이고 폭이 colW 라 앞뒤 띠가 정확히 맞닿는다 */
function dayHits(svg, m, f, months, LEFT, colW, H) {
  for (var i = 1; i <= f.last; i++) {
    var hit = svgEl('rect', {
      x: LEFT + (i - 1) * colW,
      y: 0,
      width: colW,
      height: H,
      class: 'dchit'
    });
    (function (day) {
      hit.addEventListener('click', function () {
        /* 같은 날을 다시 누르면 닫힌다 */
        setDayPick(m, dayPick(m) === day ? null : day);
        drawResult(months);
      });
    })(i);
    svg.appendChild(hit);
  }
}
/* 계산은 core/result.js 의 daySplitIn — 지금 매장(UP)을 넘긴다 */
function daySplit(m, day) {
  return daySplitIn(UP, m, day);
}
/* 계산은 core/result.js 의 manualItemIn — 지금 매장(UP)을 넘긴다 */
function manualItem(id) {
  return manualItemIn(UP, id);
}
/* 계산은 core/result.js 의 dayManualIn — 지금 매장(UP)을 넘긴다 */
function dayManual(m, day) {
  return dayManualIn(UP, m, day);
}
/* ── 거래 한 줄 ── 새로 만들지 않는다. .rawpeek · .rawrow 를 그대로 쓴다.
   ★ 거래처 이름 아래에 적요를 작게 단다. 이름과 다를 때만이다 (81차 ③).
   ★ 계좌가 둘 이상이면 어느 계좌인지 같이 단다 */
var DAY_PEEK = 10; /* 한 갈래에 한 번에 보이는 줄 수 (④) */
function dayRow(box, r, 계좌여럿, 왜) {
  var row = el('div', 'rawrow');
  var when = el('span', 'rawat');
  when.textContent = clockText(r.at);
  row.appendChild(when);
  var nm = el('div', 'dcnm');
  var nmt = el('div', 'dcnmt', showName(r.payee));
  /* ★ 108차 ④. 반영한 뒤에도 그 줄이 추정값이라는 표시를 남긴다.
     금액은 안 가린다 — 이름 옆에 작은 딱지 하나다 (✎ 를 쓰는 방식 그대로) */
  /* ★ 112차 ②㉱. 딱지는 잔액 차이로 뽑은 금액에만 붙는다.
     파일 금액을 고르신 줄·계산에서 뺀 줄은 추정이 아니다 — 아래 밑줄로 적는다 */
  if (r.patched) nmt.appendChild(el('span', 'estmark', '추정'));
  nm.appendChild(nmt);
  var 밑 = [];
  /* ★ 112차 ②㉰. 「미확인」이라 부르지 않는다. 무엇이 정해졌고 무엇이 남았는지 적는다 */
  if (r.byStated) {
    밑.push('파일 금액 반영 · 잔액 차이 ' + won(Math.abs(r.residual)) + '원 확인 필요');
  } else if (r.unsure) {
    밑.push(
      (r.stated === null || r.stated === undefined
        ? '파일에 금액 없음'
        : '파일 금액 ' + won(Math.abs(r.stated)) + '원') +
        ' · 확인 필요로 분류 · 매출·지출에서 제외'
    );
  }
  var mo = String(r.memo == null ? '' : r.memo).trim();
  if (mo && mo !== String(r.payee).trim() && mo !== showName(r.payee)) 밑.push(mo);
  if (계좌여럿) 밑.push(bankName(accOf(r)));
  if (왜) 밑.push(왜);
  if (밑.length) nm.appendChild(el('div', 'dcsub', 밑.join(' · ')));
  row.appendChild(nm);
  row.appendChild(
    el(
      'span',
      'rawamt num ' + (r.amount < 0 ? 'sgn-minus' : 'sgn-plus'),
      (r.amount > 0 ? '+' : '') + won(r.amount)
    )
  );
  box.appendChild(row);
}
/* ── 84차 ②③④⑤ · 두 그림 바로 아래에 그날을 편다 ──────────────────
   새 창을 띄우지 않는다. 82차 ⑦에서 두 그림을 위아래로 붙인 까닭이
   「눈이 오갈 수 있어야 한다」였다 — 창을 띄우면 그림이 가려져
   「이 막대가 그 막대였나」를 잃는다.
   ★ 여기서는 보기만 한다. 「아직 안 정한 돈」이 보여도 여기서 못 정한다 (⑥) */
function drawDayPanel(host, m, f, months, bal) {
  var day = dayPick(m);
  if (day === null || day < 1 || day > f.last) return;
  var at = m + '-' + (day < 10 ? '0' + day : '' + day);
  var 계좌여럿 = !!(UP.banks && UP.banks.length > 1);
  var s = daySplit(m, day);
  var mans = dayManual(m, day);
  var box = el('div', 'dcday');
  host.appendChild(box);

  /* ── ③ 맨 위 · 날짜를 크게 ──
     ★ 글자 없는 막대를 눌렀을 때, 내가 누르려던 날이 맞는지 여기서만 안다.
     ★ 좌우 화살표를 단다 — 칸폭이 10px 라 한 칸 옆을 잘못 누르는 일이 흔하다.
       그때 다시 겨누지 않고 화살표 한 번으로 옮겨간다.
     ★ 그 달 첫날의 ◀, 마지막 날의 ▶ 는 흐리게 하고 안 눌리게 한다.
       진행 중인 달에서는 f.last 가 자료가 끝난 날이라 그 뒤로 못 간다 */
  var nav = el('div', 'dcnav');
  function 화살표(글, 갈날) {
    var b = el('button', 'dcarrow', 글);
    b.type = 'button';
    if (갈날 < 1 || 갈날 > f.last) b.disabled = true;
    else
      b.addEventListener('click', function () {
        setDayPick(m, 갈날); /* 그림의 선택 표시도 같이 옮겨간다 */
        drawResult(months);
      });
    return b;
  }
  nav.appendChild(화살표('◀', day - 1));
  var big = el('div', 'dcbig', dayText(at));
  var dw = dowText(at);
  /* 요일을 함께 적는다 — 「이 날이 무슨 요일이었지」가 매출을 읽는 데 쓰인다 */
  if (dw) big.appendChild(el('span', 'dcdow', '(' + dw + ')'));
  nav.appendChild(big);
  nav.appendChild(화살표('▶', day + 1));
  box.appendChild(nav);

  /* ── ⑤ 거래가 없는 날 ──
     그냥 닫아버리면 「눌렀는데 왜 안 열리지」가 된다.
     잔액은 앞날에서 이어진 값이다 (82차 ⑦에서 정한 대로) */
  if (!s.earn.length && !s.spend.length && !s.rest.length && !mans.length) {
    box.appendChild(el('div', 'dcnone', '이 날은 거래가 없습니다'));
    var bv = bal[day - 1];
    box.appendChild(el('div', 'dcbal', '계좌 잔액 ' + won(bv == null ? 0 : bv) + '원'));
    return;
  }

  /* 요약 두 숫자는 그림의 막대와 같은 값이다 — 아래 첫 두 갈래의 합이다 */
  /* ★ 111차 ④㉯. 원 단위로 적는다. 길어지면 항목을 줄바꿈한다 —
     서로 다른 금액을 긴 한 문장으로 잇지 않는다 */
  var sumbox = el('div', 'dcsum');
  sumbox.appendChild(el('div', null, '번 돈 ' + won(f.earn[day]) + '원'));
  sumbox.appendChild(el('div', null, '쓴 돈 ' + won(f.spend[day]) + '원'));
  box.appendChild(sumbox);

  /* 열 건까지 보이고 「외 N건 보기」로 더 본다 — .rawpeek 가 이미 그렇게 한다 */
  function 더보기(pk, 열쇠, 전체, 몇) {
    if (전체 <= 몇) return;
    var b = el('button', 'oblink rawmorebtn', '외 ' + won(전체 - 몇) + '건 보기');
    b.type = 'button';
    b.addEventListener('click', function () {
      UP.open = UP.open || {};
      UP.open[열쇠] = 몇 + DAY_PEEK;
      drawResult(months);
    });
    pk.appendChild(b);
  }

  /* 앞의 두 갈래 — 합이 위 요약과 정확히 같다 (막대에 든 것 그대로다).
     거래가 하나도 없는 갈래는 줄을 안 만든다 */
  [
    ['in', '사업으로 번 돈', f.earn[day], s.earn],
    ['out', '사업에 쓴 돈', f.spend[day], s.spend]
  ].forEach(function (g) {
    var 손 = mans.filter(function (x) {
      return g[0] === 'in' ? x.side === 'in' : x.side !== 'in';
    });
    if (!g[3].length && !손.length) return;
    var wrap = el('div', 'dcgrp');
    /* ★ 86차 ⑥. 거래가 서른 건 넘는 날은 한 갈래가 화면을 다 먹는다.
       눌러서 접었다 편다 — 「여기 안 든 것」이 이미 쓰는 그 방식이다.
       ★ 처음에는 둘 다 편 채로 둔다. 그래서 열쇠를 「접힘」으로 둔다 —
         UP.open 은 달을 옮길 때 비워지는 통이라 열림으로 두면 다시 접힌다.
       ★ 접어도 오른쪽 합계는 보인다 */
    var 접힘 = 'dcshut:' + g[0] + ':' + at;
    var 폄 = !(UP.open && UP.open[접힘]);
    var h = el('div', 'dcgh tapx');
    var gn = el('div', 'dcgn', g[1]);
    gn.appendChild(foldChip(폄));
    h.appendChild(gn);
    h.appendChild(el('div', 'dcga num', won(g[2]) + '원'));
    h.addEventListener('click', function () {
      UP.open = UP.open || {};
      UP.open[접힘] = 폄;
      drawResult(months);
    });
    wrap.appendChild(h);
    if (!폄) {
      box.appendChild(wrap);
      return;
    }
    var pk = el('div', 'rawpeek');
    var 열쇠 = 'dc:' + g[0] + ':' + at;
    var 몇 = (UP.open && UP.open[열쇠]) || DAY_PEEK;
    g[3].slice(0, 몇).forEach(function (r) {
      dayRow(pk, r, 계좌여럿);
    });
    더보기(pk, 열쇠, g[3].length, 몇);
    /* ★ 직접 넣으신 현금매출도 그날에 보인다 (83차 ②).
       계좌에 안 들어온 돈이라 ✎ 표시로 갈라 보여야 한다 */
    손.forEach(function (x) {
      var row = el('div', 'rawrow');
      row.appendChild(el('span', 'rawat'));
      var nm = el('div', 'dcnm');
      var t = el('div', 'dcnmt', x.name);
      t.appendChild(el('span', 'manmark', ' ✎'));
      nm.appendChild(t);
      row.appendChild(nm);
      row.appendChild(
        el(
          'span',
          'rawamt num ' + (g[0] === 'in' ? 'sgn-plus' : 'sgn-minus'),
          (g[0] === 'in' ? '+' : '−') + won(Math.abs(x.amt))
        )
      );
      pk.appendChild(row);
    });
    if (손.length) {
      pk.appendChild(
        el(
          'div',
          'rawmore',
          '✎ 는 직접 넣으신 금액입니다 — 계좌에 안 들어온 돈이라 위 합계에 안 듭니다'
        )
      );
    }
    wrap.appendChild(pk);
    box.appendChild(wrap);
  });

  /* 세 번째 갈래는 접어 둔다. 다만 있다는 것은 보여야 한다 —
     건수와 합계를 줄에 적는다 */
  if (s.rest.length) {
    var restSum = 0;
    s.rest.forEach(function (x) {
      restSum += Math.abs(x.r.amount);
    });
    var wrap3 = el('div', 'dcgrp');
    var 열쇠3 = 'dcrest:' + at;
    var open3 = !!(UP.open && UP.open[열쇠3]);
    var h3 = el('div', 'dcgh tapx');
    var n3 = el('div', 'dcgn', '여기 안 든 것 ' + won(s.rest.length) + '건');
    n3.appendChild(foldChip(open3));
    h3.appendChild(n3);
    h3.appendChild(el('div', 'dcga num', won(restSum) + '원'));
    h3.addEventListener('click', function () {
      UP.open = UP.open || {};
      UP.open[열쇠3] = !open3;
      drawResult(months);
    });
    wrap3.appendChild(h3);
    if (open3) {
      var pk3 = el('div', 'rawpeek');
      var 열쇠3n = 'dcrestn:' + at;
      var 몇3 = (UP.open && UP.open[열쇠3n]) || DAY_PEEK;
      s.rest.slice(0, 몇3).forEach(function (x) {
        dayRow(pk3, x.r, 계좌여럿, x.why);
      });
      더보기(pk3, 열쇠3n, s.rest.length, 몇3);
      wrap3.appendChild(pk3);
    }
    box.appendChild(wrap3);
  }
}
function drawDayChart(host, m, d, months) {
  /* ★ 66차 ④. 막힌 달에는 그림을 안 그린다 — 끝값이 가리킬 순이익이 없다.
     ★ 66-13차 ③. 그런데 아무 말 없이 사라지면 그림이 원래 없는 줄 아신다.
       그 자리에 호박색 한 줄만 둔다 — 1년치 그림 각주와 같은 어법이다 */
  if (d.blocked) {
    host.appendChild(el('div', 'dcwait', '거래처를 더 정하시면 일별 흐름을 보여드립니다'));
    return;
  }
  var 진행 = isRunning(m, months);
  var f = dailyFlow(m, 진행 ? lastDayIn(m) : null);
  if (f.last < 2) return;
  /* ★ 83차 ⑤. 직접 넣으신 금액은 막대에 안 얹는다 — 계좌에 찍힌 거래가 아니다.
     누적선 끝값만 계좌 순이익에 맞춘다 */
  var 직접 = (d.manIn || 0) - (d.manOut || 0);

  var cum = [],
    run = 0,
    i;
  for (i = 1; i <= f.last; i++) {
    run += f.earn[i] - f.spend[i];
    cum.push(run);
  }
  if (cum.length) cum[cum.length - 1] += 직접;
  var hi = 0,
    lo = 0;
  for (i = 1; i <= f.last; i++) {
    if (f.earn[i] > hi) hi = f.earn[i];
    if (-f.spend[i] < lo) lo = -f.spend[i];
  }
  cum.forEach(function (v) {
    if (v > hi) hi = v;
    if (v < lo) lo = v;
  });
  var rg = axisRange(lo, hi);
  lo = rg.lo;
  hi = rg.hi;
  var stepD = rg.step;
  if (hi === lo) hi = lo + 1;

  /* ── 82차 ⑦ · 날마다의 계좌 잔액 ──────────────────────────────
     「내가 이 날 돈을 왜 이리 많이 썼지?」를 볼 수 있어야 한다 (개발자 요청).
     ★ 새로 계산하지 않는다. balanceAt(m, 날) 이 이미 하는 일이다 —
       계좌마다 그 날까지의 마지막 거래 잔액을 더한 값이다.
     ★ 그래서 거래가 없는 날은 앞 날 잔액이 저절로 이어진다.
       잔액은 거래가 없어도 남아 있는 값이라 선을 끊으면 거짓이 된다
       (1년 그림에서 자료 없는 달을 끊는 것과 뜻이 다르다) */
  var bal = [],
    bLo = null,
    bHi = null;
  for (i = 1; i <= f.last; i++) {
    var bv = balanceAt(m, i);
    if (bv === null) bv = bal.length ? bal[bal.length - 1] : 0;
    bal.push(bv);
    if (bLo === null || bv < bLo) bLo = bv;
    if (bHi === null || bv > bHi) bHi = bv;
  }
  /* 잔액 그림은 0을 바닥으로 잡는다 — 1년 그림과 같은 자다 */
  var rgB = axisRange(Math.min(0, bLo === null ? 0 : bLo), bHi === null ? 1 : bHi);
  var blo = rgB.lo,
    bhi = rgB.hi,
    stepB = rgB.step;
  if (bhi === blo) bhi = blo + 1;

  /* ★ 두 그림의 x축을 맞춘다 — 위아래로 눈이 오가야 「이 날 많이 썼구나」가 보인다.
     왼쪽 자리는 눈금 글자 길이로 정해지므로, 둘 중 넓은 쪽에 둘 다 맞춘다.
     안 맞추면 잔액 눈금이 더 길어 그림 둘이 어긋난다 */
  var ticksD = axisTicks(lo, hi, stepD);
  var ticksB = axisTicks(blo, bhi, stepB);
  var LEFT공통 = Math.max(axisLeft(ticksD), axisLeft(ticksB));

  /* ★ 112차 ①. 이 그림만의 단위다. 아래 「계좌 잔액」은 제 변수를 따로 쓴다 —
     예전에는 한 변수를 둘이 나눠 써서, 다시 그릴 때 이 그림이 잔액 단위(억원)로
     눈금을 찍었다. −730만원 막대가 −0.1 자리에 섰다 */
  var U흐름 = axisUnit(Math.max(Math.abs(lo), Math.abs(hi))); /* ★ 111차 ④㉰ */
  host.appendChild(
    chHead(
      '일별 흐름 (' + U흐름.name + ')',
      [
        ['kgood', '■ 사업으로 번 돈'],
        ['kwarn', '■ 사업에 쓴 돈'],
        ['kprof', '— 계좌 순이익(이번 달 누적)']
      ],
      monNum(m) + ' 1일 ~ ' + monNum(m) + ' ' + f.last + '일'
    )
  );

  var box = el('div', 'dchart');
  host.appendChild(box);
  /* ★ 66-7차 ①. 1년치 그림과 같은 자로 그린다 — 픽셀 고정, 높이 고정.
     화면에 붙인 뒤에 재야 참값이 나온다 */
  fitChart(box, CH_H2, function (svg, W) {
    var ticks = ticksD;
    var LEFT = LEFT공통,
      RIGHT = 10,
      PAD = 10,
      BOT = 16;
    var PH = CH_H2 - BOT;
    var colW = (W - LEFT - RIGHT) / f.last;
    var bw = Math.max(2, Math.min(9, colW * 0.62));
    function y(v) {
      return PAD + ((hi - v) / (hi - lo)) * (PH - PAD * 2);
    }
    function x(day) {
      return LEFT + (day - 1) * colW + colW / 2;
    }
    ticks.forEach(function (v) {
      svg.appendChild(
        svgEl('line', {
          x1: LEFT - 4,
          y1: y(v),
          x2: W - RIGHT,
          y2: y(v),
          stroke: 'var(--line)',
          'stroke-width': v === 0 ? 1.2 : 0.7
        })
      );
      var t = svgEl('text', {
        x: LEFT - 7,
        y: y(v) + 3.5,
        'text-anchor': 'end',
        'font-size': '11',
        fill: 'var(--gray)'
      });
      t.textContent = axisTxt(v, U흐름);
      svg.appendChild(t);
    });
    /* ★ 84차 ①. 고른 날 띠는 막대 아래에 깐다 — 막대 색을 흐리지 않으려는 것이다 */
    daySelBand(svg, m, f, LEFT, colW, CH_H2);
    for (i = 1; i <= f.last; i++) {
      var cx = x(i),
        y0 = y(0);
      if (f.earn[i] > 0) {
        svg.appendChild(
          svgEl('rect', {
            x: cx - bw / 2,
            y: y(f.earn[i]),
            width: bw,
            height: Math.max(1, y0 - y(f.earn[i])),
            rx: 2,
            fill: 'var(--good)',
            opacity: '0.55'
          })
        );
      }
      if (f.spend[i] > 0) {
        svg.appendChild(
          svgEl('rect', {
            x: cx - bw / 2,
            y: y0,
            width: bw,
            height: Math.max(1, y(-f.spend[i]) - y0),
            rx: 2,
            fill: 'var(--warn)',
            opacity: '0.55'
          })
        );
      }
    }
    var pl = [];
    for (i = 1; i <= f.last; i++) pl.push(x(i) + ',' + y(cum[i - 1]));
    svg.appendChild(
      svgEl('polyline', {
        points: pl.join(' '),
        fill: 'none',
        stroke: 'var(--brand)',
        'stroke-width': 2,
        'stroke-linejoin': 'round'
      })
    );
    svg.appendChild(
      svgEl('circle', {
        cx: x(f.last),
        cy: y(cum[cum.length - 1]),
        r: 3.5,
        fill: 'var(--paper)',
        stroke: 'var(--brand)',
        'stroke-width': 2
      })
    );
    /* ★ 66-9차 ②. 이 선이 무엇인지 그림 안에서 못 박는다.
       마지막 점 옆에 알약 하나 — 「지금까지 +2,240만」.
       ★ 카드 밖으로 나가지 않게 좌우로 밀어 넣고, 위가 좁으면 아래로 붙인다 */
    var 끝값 = cum[cum.length - 1];
    /* ★ 111차 ④. 눈금이 아니라 값을 말하는 자리라 원 단위로 적는다 */
    var 알약글 = '지금까지 ' + (끝값 < 0 ? '−' : '+') + won(Math.abs(끝값)) + '원';
    var pw = Math.ceil(textW(알약글, 11)) + 16,
      ph = 20;
    var px2 = x(f.last) - pw / 2;
    if (px2 < 1) px2 = 1;
    if (px2 + pw > W - 1) px2 = W - 1 - pw;
    var py = y(끝값) - ph - 8;
    if (py < 1) py = y(끝값) + 9;
    svg.appendChild(
      svgEl('rect', { x: px2, y: py, width: pw, height: ph, rx: 10, fill: 'var(--brand)' })
    );
    var pt = svgEl('text', {
      x: px2 + pw / 2,
      y: py + 14,
      'text-anchor': 'middle',
      'font-size': '11',
      'font-weight': '700',
      fill: 'var(--paper)'
    });
    pt.textContent = 알약글;
    svg.appendChild(pt);
    /* ★ 82-1차. 날짜 숫자만 이틀 간격. 아래 잔액 그림과 같은 자를 쓴다 */
    dayTicks(f.last, colW).forEach(function (day) {
      var t = svgEl('text', {
        x: x(day),
        y: PH + 12,
        'text-anchor': 'middle',
        'font-size': '10',
        fill: 'var(--gray)'
      });
      t.textContent = String(day);
      svg.appendChild(t);
    });
    /* ★ 84차 ①. 누르는 띠는 맨 위에 얹는다 — 막대가 없는 날도 눌려야 한다 */
    dayHits(svg, m, f, months, LEFT, colW, CH_H2);
  });

  /* ── 82차 ⑦ · 그림 2 · 계좌 잔액 ────────────────────────────────
     1년 화면의 「월말 계좌 잔액」과 같은 형태·같은 색이다 (var(--now) 선).
     새 모양을 만들지 않는다.
     ★ 위 「일별 흐름」 바로 아래에 둔다. 거래처를 덜 정해 위 그림이 안 나오면
       여기까지 오지도 않는다 — 위쪽 d.blocked·f.last 검사를 그대로 물려받는다 */
  /* ★ 112차 ①. 위 「일별 흐름」의 U흐름 을 덮어쓰지 않는다 — 이 그림의 제 변수다 */
  var U잔액 = axisUnit(Math.max(Math.abs(blo), Math.abs(bhi))); /* ★ 111차 ④㉰ */
  host.appendChild(
    chHead(
      '계좌 잔액 (' + U잔액.name + ')',
      [['know', '— 계좌 잔액']],
      monNum(m) + ' 1일 ~ ' + monNum(m) + ' ' + f.last + '일'
    )
  );
  var box2 = el('div', 'dchart');
  host.appendChild(box2);
  fitChart(box2, CH_H3, function (svg, W) {
    var LEFT = LEFT공통,
      RIGHT = 10,
      PAD = 12,
      BOT = 16;
    var PH = CH_H3 - BOT;
    var colW = (W - LEFT - RIGHT) / f.last;
    function y(v) {
      if (bhi === blo) return PAD;
      return PAD + ((bhi - v) / (bhi - blo)) * (PH - PAD * 2);
    }
    /* ★ 위 그림과 같은 자리 계산이다 — 한 글자도 다르면 x축이 어긋난다 */
    function x(day) {
      return LEFT + (day - 1) * colW + colW / 2;
    }
    ticksB.forEach(function (v) {
      svg.appendChild(
        svgEl('line', {
          x1: LEFT - 4,
          y1: y(v),
          x2: W - RIGHT,
          y2: y(v),
          stroke: 'var(--line)',
          'stroke-width': v === 0 ? 1 : 0.6,
          opacity: v === 0 ? '0.9' : '0.55'
        })
      );
      var t = svgEl('text', {
        x: LEFT - 8,
        y: y(v) + 3.5,
        'text-anchor': 'end',
        'font-size': '11',
        fill: 'var(--gray)'
      });
      t.textContent = axisTxt(v, U잔액);
      svg.appendChild(t);
    });
    /* ★ 84차 ①. 두 그림에 같이 표시한다 — 어느 쪽을 눌러도 같은 날이 열린다 */
    daySelBand(svg, m, f, LEFT, colW, CH_H3);
    /* ★ 선을 끊지 않는다. 거래가 없는 날도 잔액은 그대로 남아 있다 */
    var seg = [];
    for (i = 1; i <= f.last; i++) seg.push(x(i) + ' ' + y(bal[i - 1]));
    if (seg.length > 1) {
      svg.appendChild(
        svgEl('path', {
          d: 'M ' + seg.join(' L '),
          fill: 'none',
          stroke: 'var(--now)',
          'stroke-width': 2.2,
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round'
        })
      );
    }
    /* ★ 1년 그림은 달마다 점을 찍는다. 여기서는 하루 사이가 10px 남짓이라
       날마다 찍으면 점이 서로 붙어 선이 안 보인다. 마지막 날에만 같은 점을 찍는다 */
    svg.appendChild(
      svgEl('circle', {
        cx: x(f.last),
        cy: y(bal[bal.length - 1]),
        r: 3,
        fill: 'var(--paper)',
        stroke: 'var(--now)',
        'stroke-width': 2
      })
    );
    /* ★ 82-1차. 위 그림과 같은 함수·같은 colW 라 날짜 줄이 한 글자도 안 어긋난다 */
    dayTicks(f.last, colW).forEach(function (day) {
      var t = svgEl('text', {
        x: x(day),
        y: PH + 12,
        'text-anchor': 'middle',
        'font-size': '10',
        fill: 'var(--gray)'
      });
      t.textContent = String(day);
      svg.appendChild(t);
    });
    dayHits(svg, m, f, months, LEFT, colW, CH_H3);
  });

  /* ── 84차 ② · 열린 화면은 두 그림 바로 아래다 ── */
  drawDayPanel(host, m, f, months, bal);
}

/* 처음 열 때 기본값 = 올해. 올해 자료가 없으면 자료 있는 가장 최근 해 */
function defaultYear(months) {
  var ys = yearsWithData(months);
  if (!ys.length) return null;
  var 올해 = String(new Date().getFullYear());
  if (ys.indexOf(올해) !== -1) return 올해;
  return ys[ys.length - 1];
}
function yearNow(months) {
  var ys = yearsWithData(months);
  if (!ys.length) return null;
  if (UP.year && ys.indexOf(UP.year) !== -1) return UP.year;
  UP.year = defaultYear(months);
  return UP.year;
}
function drawYear(host, allMonths) {
  /* ★ 71차 ⑤. 표와 그림의 자리는 고른 해의 1~12월로 고정한다.
     자료가 있고 없고는 칸의 「내용」이지 「자리」가 아니다 —
     자리가 달마다 밀리면 두 해를 견줄 수가 없다 */
  var 해 = yearNow(allMonths);
  var months = 해 ? yearMonths(해) : allMonths.slice();
  /* 진행 중인 달은 「자료가 있는 달들 가운데 마지막이면서 아직 안 끝난 달」이다.
     열두 달 고정 목록으로는 그 판정을 못 한다 — 12월이 늘 마지막이 되어 버린다.
     그래서 진짜 목록으로 한 번만 재서 들고 다닌다 */
  var 진행달 =
    allMonths.filter(function (m) {
      return isRunning(m, allMonths);
    })[0] || null;
  /* 자료가 있는 달인가 — 없으면 monthNumbers 가 0을 내는데, 그 0은 「0원 벌었다」가 아니라
     「모른다」다. 숫자로 보여주면 거짓말이 된다 (38차 그대로) */
  var 있는달 = {};
  allMonths.forEach(function (m) {
    있는달[m] = 1;
  });
  var cols = months.map(function (m) {
    var c = monthNumbers(m);
    c.없음 = !있는달[m];
    /* 아직 안 온 달 = 진행 중인 달보다 뒤. 지났는데 자료가 없는 달과 뜻이 다르다 —
       앞의 것은 기다리면 되고, 뒤의 것은 파일을 올리시면 채워진다 */
    c.미래 = c.없음 && !!진행달 && m > 진행달;
    return c;
  });
  /* 문 열기 전 달 판정과 평균은 자료가 있는 달만 놓고 잰다 */
  var 실cols = cols.filter(function (c) {
    return !c.없음;
  });
  var opening = openingMonths(실cols, allMonths);
  /* 진행 중인 달은 22일치라 평균을 끌어내린다. 평균에서 뺀다.
     문 열기 전 달도 같다.
     ★ 66차 ②. 「끝난 달」 판정을 closedCols 한 곳으로 모았다 —
       머리 배지와 카드 줄이 같은 판정을 써야 숫자가 안 어긋난다
     ★ 71차 ⑤-6. 평균은 그 해 안에서 자료 있는 마감 달들만으로 낸다 */
  var done = 실cols.filter(function (c) {
    return c.m !== 진행달 && !opening[c.m];
  });
  var opened = 실cols.filter(function (c) {
    return opening[c.m];
  });
  /* 문턱에 걸린 달이 절반을 넘으면 평균을 아예 안 낸다 */
  if (opened.length * 2 > 실cols.length || !done.length) done = [];

  /* ── 66차 ③-1 · 구역 머리와 카드 줄 ────────────────────────────
     표만 있으면 열두 달을 가로로 훑어야 「그래서 얼마 남았나」가 안 보인다.
     ★ 66-16차 ①②. 예전에는 이 자리에 「최근 마감한 달 하나」의 성적표가 앉아 있었다.
       구역 간판은 「1년치 한눈에 보기」인데 안에 든 것은 7월 한 달이라 어긋났다.
       이제 완료된 달들을 통째로 더한다 — 간판과 내용이 같은 말을 한다.
     ★ 카드는 셋뿐이다. 잔액은 합계가 뜻이 없어(더할 수 있는 값이 아니다)
       이번 달 구역과 아래 잔액 그림·표에 맡긴다.
     ★ 합계엔 전월이 없다. 「전월 대비 %」 줄도 없앤다.
     ★ 값은 표와 같은 monthNumbers 에서 나온다 — 새로 세지 않는다.
     ★ 막힌 달은 순이익을 셀 수 없어 합계에서 빠진다. 빠진 달이 있을 때만
       바로 아래 굵은 안내로 밝힌다 */
  var 셀수있는 = done.filter(function (c) {
    return !c.blocked;
  });
  host.appendChild(el('div', 'yhead', 해 ? 해 + '년' : '1년'));
  /* ★ 77차. 같은 기간을 카드마다 반복하지 않고 제목 아래 한 번만 적는다. */
  var 첫달 = done.length ? done[0].m : null;
  var 끝달 = done.length ? done[done.length - 1].m : null;
  if (done.length) {
    host.appendChild(el('div', 'yperiod', +첫달.slice(5, 7) + '~' + monNum(끝달) + ' 합계'));
  }

  if (셀수있는.length) {
    var 합번 = 0,
      합쓴 = 0,
      합순 = 0;
    셀수있는.forEach(function (c) {
      합번 += c.sales + c.otherIn;
      합쓴 += c.cost;
      합순 += c.profit;
    });
    var 카드줄 = el('div', 'ycards');
    function 카드(기호, 이름, 값, cls) {
      var b = el('div', 'ycard ' + cls);
      b.appendChild(el('div', 'ysign', 기호));
      b.appendChild(el('div', 'ycname', 이름));
      /* ★ 74차. 합계 카드는 줄인 만원 단위보다 실제 원 단위가 더 분명하다. */
      b.appendChild(el('div', 'ycval num', won(값) + '원'));
      return b;
    }
    카드줄.appendChild(카드('', '사업으로 번 돈', 합번, 'yin'));
    카드줄.appendChild(카드('−', '사업에 쓴 돈', 합쓴, 'yout'));
    카드줄.appendChild(카드('=', '계좌 순이익', 합순, 'yprof'));
    host.appendChild(카드줄);

    /* ★ 66-8차 ③ · 66-16차 ③. 순이익 합계는 위 카드가 이미 말한다 —
       여기서는 흑자·적자 달 수와 사업 외 용도만 남긴다 */
    var 요약 = yearSumLine(months, cols);
    if (요약) host.appendChild(요약);
  }

  /* ★ 49차 ④. 한 달 화면에는 있는데 1년치에는 없었다 —
     그래프에 빈 달이 여럿 보이는데 얼마나 남았는지 알 길이 없었다.
   ★ 새 식을 만들지 않는다. nowPct 를 기간만 넓혀 쓴다 —
     달마다의 volume·unknown 을 더해 한 덩어리로 넘긴다.
   ★ 분모가 한 달 화면과 다르므로 기간을 반드시 적는다 (원칙 4).
   ★ 위쪽 「거래처 더 정하기 N곳」과 같은 수(unsetCount)를 쓴다 —
     한 화면에 같은 것이 두 수로 나오면 안 된다 */
  var 합 = { volume: 0, unknown: 0 };
  cols.forEach(function (c) {
    합.volume += c.volume || 0;
    합.unknown += c.unknown || 0;
  });
  var 정한율 = nowPct(합); /* ★ 71차 ⑤. 예전 이름은 「해」였는데 위에서 「보는 해」와 겹친다 */
  var 남은곳 = unsetCount();
  if (정한율 !== null) {
    var pl = el('div', 'nowpct');
    pl.appendChild(document.createTextNode('현재 ' + 정한율 + '% 정해졌습니다'));
    host.appendChild(pl);
  }
  var 해새로정할 = resultNewButton(남은곳);
  if (해새로정할) host.appendChild(해새로정할);

  /* ★ 47차 ⑤. 그래프는 표 위에 둔다. 표는 손대지 않는다 */
  drawProfitChart(host, months, cols, 진행달);

  /* ★ 68차 ④. 그림과 표 사이에 이름이 없어 표가 그림의 꼬리처럼 보였다.
     표는 표대로 하는 일이 있다 — 소제목 한 줄로 갈라 준다 */
  host.appendChild(el('div', 'ytabhead', '월별 자세히 보기'));
  var wrap = el('div', 'ywrap');
  var tab = document.createElement('table');
  tab.className = 'ytab';

  var thead = document.createElement('thead');
  var hr = document.createElement('tr');
  hr.appendChild(el('th', 'rh', ''));
  cols.forEach(function (c) {
    /* ★ 48차 ②. 표의 달 이름을 눌러도 그 달로 간다
       ★ 66차 ③-3. 진행 중인 달에만 표를 붙인다.
         마감 달마다 (마감)을 붙이면 열두 칸이 다 시끄러워진다
       ★ 70차 ①. 「8월(진행 중)」 괄호 글씨는 작아서 눈에 안 띄었다.
         달 이름 밑에 호박 알약 한 줄로 내린다 — 괄호 글씨는 없앤다 (알약이 대신한다).
         ★ 새 색은 안 만든다. 표의 「아직 안 정한 돈」 알약과 같은 호박 계열이다.
         ★ 열 바탕은 칠하지 않는다 (개발자 1안 확정) */
    var th = el('th', 'ymtap');
    if (c.m === 진행달) th.appendChild(el('span', 'runpill', '진행 중'));
    else th.appendChild(el('span', 'runspace', ''));
    th.appendChild(el('span', 'ymnum', monNum(c.m)));
    th.addEventListener('click', function () {
      goMonth(c.m);
    });
    hr.appendChild(th);
  });
  if (done.length) {
    var ah = el('th', 'avgcol', '평균');
    ah.appendChild(el('span', 'avgn', won(done.length) + '달'));
    hr.appendChild(ah);
  }
  thead.appendChild(hr);
  tab.appendChild(thead);

  var tbody = document.createElement('tbody');
  function row(label, cls, pick, avg, whyId, goUnsetRow, get) {
    var tr = document.createElement('tr');
    if (cls) tr.className = cls;
    var rh = el('td', 'rh', label);
    if (whyId)
      rh.appendChild(
        whyMark(whyId, function () {
          drawResult(months);
        })
      );
    tr.appendChild(rh);
    cols.forEach(function (c, i) {
      /* ★ 71차 ⑤-5. 자료가 없는 달은 pick 을 아예 안 부른다.
         monthNumbers 는 그 달에 0을 내는데 그 0은 「0원」이 아니라 「모른다」다 (38차).
         ★ 두 가지를 갈라 보인다 —
           아직 안 온 달: 조용한 회색 「—」. 아무 말도 안 붙인다. 기다리면 된다.
           지났는데 자료 없는 달: 빈 칸. 표 아래 한 줄이 채우는 길을 알려준다.
         ★ 새 색은 안 칠한다. 크림·호박은 이미 「아직 안 정한 돈」·「진행 중」의 뜻이다 */
      if (c.없음) {
        var ntd = el('td', 'num noyet', c.미래 ? '—' : '');
        /* ★ 90차 ②(A안). 이 칸도 같은 줄 수로 둔다 — 안 그러면 「—」만 반 줄 내려앉는다 */
        if (get) ntd.appendChild(el('span', 'ydelta', ''));
        tr.appendChild(ntd);
        return;
      }
      var v = pick(c);
      /* ★ 68차 ⑥. pill 이 붙은 칸은 값을 span 하나로 감싼다 —
         표가 border-collapse:collapse 라 칸 자체는 모서리가 안 둥글어진다.
         글자는 그대로다. 감싸기만 한다 */
      var td;
      if (v.pill && v.txt) {
        td = el('td', 'num' + (v.cls ? ' ' + v.cls : ''));
        td.appendChild(el('span', 'ypill', v.txt));
      } else {
        td = el('td', 'num' + (v.cls ? ' ' + v.cls : ''), v.txt);
      }
      /* ★ 90차 ②(A안). 줄을 언제나 붙인다 — 견줄 수 없는 칸이면 빈 줄로 자리만 잡는다.
         무엇을 견줄지 정하는 것은 그대로 deltaTxt 하나뿐이다 (66차 ③-2) */
      if (get) td.appendChild(el('span', 'ydelta', deltaTxt(cols, 진행달, opening, i, get)));
      /* ★ 54차 ⑤. 「아직 안 정한 돈」 줄만 눌린다 — 할 일이 남아 있는 줄이다.
         — 칸(갈 곳 없음)과 0원인 달(다 정함)은 안 눌린다 */
      if (goUnsetRow && v.go) {
        td.classList.add('gomonth');
        td.addEventListener('click', function () {
          goUnset(c.m);
        });
      }
      tr.appendChild(td);
    });
    if (done.length) {
      var a = avg ? avg(done) : { txt: '' };
      var atd = el('td', 'num avgcol' + (a.cls ? ' ' + a.cls : ''));
      if (a.pill && a.txt) atd.appendChild(el('span', 'ypill', a.txt));
      else atd.textContent = a.txt;
      /* ★ 90차 ②(A안). 평균 칸에는 전월 대비가 없다. 그래도 줄 수는 같아야
         한 줄의 숫자가 전부 같은 높이에 앉는다 (textContent 뒤에 붙인다 — 앞에 붙이면 지워진다) */
      if (get) atd.appendChild(el('span', 'ydelta', ''));
      tr.appendChild(atd);
    }
    tbody.appendChild(tr);
    if (whyId && whyOpen(whyId)) {
      var wtr = document.createElement('tr');
      var wtd = el('td', 'whytd');
      wtd.colSpan = 1 + cols.length + (done.length ? 1 : 0);
      wtd.appendChild(whyBox(whyId));
      wtr.appendChild(wtd);
      tbody.appendChild(wtr);
    }
    return tr; /* ★ 70차 ②. 그룹 줄에 펼침 표시를 달려면 줄이 필요하다 */
  }

  /* ★ 43차. 줄 차례를 한 달 화면과 같게 맞춘다.
     들어온 돈 − 사업에 쓴 돈 = 순이익. 세로로 그대로 뺄셈이 되어야 한다.
     「매출」·「그 밖의 입금」은 접은 자리로 내린다 —
     대표님이 이 표에서 「매출 5500 − 지출 5100인데 왜 1000?」을 물으셨다.
     두 줄을 따로 두면 어느 것이 순이익의 재료인지 안 보인다 */
  var anyOtherIn = cols.some(function (c) {
    return c.otherIn;
  });
  /* ★ 61차 ①. 업종마다 이름이 다르다 — 식당은 「월세」, 나머지는 「임차료」.
     ★ 70차 ②. 이 둘은 뜻으로 「사업에 쓴 돈」의 세부다. 그 줄 바로 아래로 옮긴다
       (개발자 확정 — 예전에는 원가율 아래에 있어서 무엇의 세부인지 안 보였다).
     ★ 64-12. 평균 칸이 0원으로 나오던 것을 원가율과 같은 규칙으로 맞춘다 —
       아직 아무 곳도 그 항목으로 안 정하셨으면 「0원 썼다」가 아니라 「모른다」다.
       「없는 것」과 「아직 안 정한 것」을 구분 못 하니 억지로 0을 안 보여준다 (38차).
     ★ 달 칸의 0원은 그대로 둔다 — 그 달에 안 나간 것은 사실이고,
       월세는 실제로 매달 꼬박꼬박 나가지 않는다 (87개월 중 72개월) */
  function 항목줄(원이름) {
    row(
      baseName(원이름),
      'yrsub',
      function (c) {
        if (c.blocked) return { txt: '—', cls: 'none' };
        return { txt: won(catOfMonth(c, 원이름)) };
      },
      function (l) {
        var 합 = 0;
        l.forEach(function (c) {
          if (!c.blocked) 합 += catOfMonth(c, 원이름);
        });
        if (!합) return { txt: '—' };
        return {
          txt: won(
            meanOf(l, function (c) {
              return catOfMonth(c, 원이름);
            })
          )
        };
      }
    );
  }

  var 번돈줄 = row(
    '사업으로 번 돈',
    'yrin',
    function (c) {
      return { txt: won(c.sales + c.otherIn) };
    },
    function (l) {
      return {
        txt: won(
          meanOf(l, function (c) {
            return c.sales + c.otherIn;
          })
        )
      };
    },
    'in',
    false,
    function (c) {
      return c.sales + c.otherIn;
    }
  );
  그룹줄(months, 번돈줄, 'in', true);
  if (그룹열림('in')) {
    row(
      '　매출',
      'keeprow2',
      function (c) {
        return { txt: won(c.sales) };
      },
      function (l) {
        return {
          txt: won(
            meanOf(l, function (c) {
              return c.sales;
            })
          )
        };
      }
    );
    if (anyOtherIn) {
      row(
        '　그 밖의 입금',
        'keeprow2',
        function (c) {
          return { txt: c.otherIn ? won(c.otherIn) : '—' };
        },
        function (l) {
          return {
            txt: won(
              meanOf(l, function (c) {
                return c.otherIn;
              })
            )
          };
        }
      );
    }
  }
  var 쓴돈줄 = row(
    '사업에 쓴 돈',
    'yrout',
    function (c) {
      return { txt: won(c.cost) };
    },
    function (l) {
      return {
        txt: won(
          meanOf(l, function (c) {
            return c.cost;
          })
        )
      };
    },
    'out',
    false,
    function (c) {
      return c.cost;
    }
  );
  그룹줄(months, 쓴돈줄, 'out', true);
  if (그룹열림('out')) {
    항목줄('월세');
    항목줄('인건비');
  }
  /* ★ 66차 ③-2. 핵심 세 줄(번 돈 · 쓴 돈 · 순이익)을 붙여 놓는다.
     세로로 그대로 뺄셈이 되어야 위 카드 줄과 같은 그림이 된다 */
  row(
    '계좌 순이익',
    'prof yrprof',
    function (c) {
      if (c.blocked) return { txt: '—', cls: 'none' };
      return { txt: won(c.profit), cls: c.profit < 0 ? 'minus' : 'plus' };
    },
    function (l) {
      var ok = l.filter(function (c) {
        return !c.blocked;
      });
      if (!ok.length) return { txt: '—', cls: 'none' };
      var v = meanOf(ok, function (c) {
        return c.profit;
      });
      return { txt: won(v), cls: v < 0 ? 'minus' : 'plus' };
    },
    'profit',
    false,
    function (c) {
      return c.profit;
    }
  );
  /* ★ 61차 ①. 원가율·월세·인건비 — 1년치로 봐야 뜻이 있는 셋이다.
     원가율은 「자세히 보기」 안에만 있어서 1년치를 펴도 안 보였다.
     ★ 익월 매칭은 안 한다. 한 달 화면과 같은 「같은 달 기준」이어야
       두 화면이 안 어긋난다 — 익월 매칭은 따로 정할 일이다.
     ★ 원가율의 평균 칸은 달별 %의 평균이 아니라 (식자재+주류 합) ÷ (매출 합) 이다.
       매출 큰 달과 작은 달의 %를 그냥 평균하면 실제와 어긋난다 — poolPct 가 그 일을 한다.
     ★ 매출이 0이거나 식자재+주류가 0이면 — 로 둔다.
       「없는 것」과 「아직 안 정한 것」을 구분 못 하니 억지로 0%를 안 보여준다 (38차) */
  row(
    tradeInfo().비율이름,
    'yrratio',
    function (c) {
      if (opening[c.m]) return { txt: '—' };
      if (c.blocked) return { txt: '—', cls: 'none' };
      if (!c.sales || !foodOf(c)) return { txt: '—' };
      return { txt: ratioTxt(foodOf(c), c.sales) };
    },
    function (l) {
      /* ★ 61차 ①. 달 칸이 전부 — 인데 평균만 0% 로 나오던 것을 막는다.
       식자재·주류를 아직 아무 데도 안 정하셨으면 분자가 0이라 poolPct 가 0% 를 냈다.
       달 칸과 같은 규칙이어야 한다 — 억지로 0% 를 안 보여준다 (38차) */
      var 밥 = 0;
      l.forEach(function (c) {
        if (!c.blocked) 밥 += foodOf(c);
      });
      if (!밥) return { txt: '—' };
      return poolPct(l, foodOf, function (c) {
        return c.sales;
      });
    }
  );
  /* ══ 36차 1-2 ══  뺄셈은 여기서 끝난다. 아래는 순이익에 안 들어가는 돈이다.
     ★ 대표님이 문제를 처음 보신 화면이 이 표다 —
       한 달 카드만 고치면 1년치에서 같은 오해가 그대로 난다 */
  var anyIn = cols.some(function (c) {
    return c.keepIn;
  });
  var anyOut = cols.some(function (c) {
    return c.keepOut;
  });
  var anyKeep = anyIn || anyOut;
  var anyUnset = cols.some(function (c) {
    return c.unknown;
  });
  if (anyKeep) {
    var 외줄 = row(
      '사업 외 용도',
      'keeprow',
      function (c) {
        var v = (c.keepIn || 0) + (c.keepOut || 0);
        return { txt: v ? won(v) : '—' };
      },
      function (l) {
        return {
          txt: won(
            meanOf(l, function (c) {
              return (c.keepIn || 0) + (c.keepOut || 0);
            })
          )
        };
      },
      'keep'
    );
    그룹줄(months, 외줄, 'keep', true);
    /* ★ 부호를 안 쓰고 줄을 둘로 나눈다 — 넣은 쪽과 가져간 쪽.
       keep 은 「입금이면 −, 출금이면 +」라 한 줄로 두면 이 줄만 +가 나간 돈이 된다.
       바로 위 확인 카드에서는 −가 나간 돈이라 사장님이 반대로 읽으신다.
       ★ 예전에는 이 두 줄을 「내가 넣은 돈」·「내가 가져간 돈」이라 불렀는데,
         35차에서 사업과 무관한 항목이 늘면서 그 이름이 틀린 말이 됐다 —
         은행 원금 상환·대출받은 돈·사업 외 용도까지 그렇게 읽혔다 */
    if (anyIn && 그룹열림('keep')) {
      row(
        '　들어온 돈',
        'keeprow2',
        function (c) {
          return { txt: c.keepIn ? won(c.keepIn) : '—' };
        },
        function (l) {
          return {
            txt: won(
              meanOf(l, function (c) {
                return c.keepIn;
              })
            )
          };
        }
      );
    }
    if (anyOut && 그룹열림('keep')) {
      row(
        '　나간 돈',
        'keeprow2',
        function (c) {
          return { txt: c.keepOut ? won(c.keepOut) : '—' };
        },
        function (l) {
          return {
            txt: won(
              meanOf(l, function (c) {
                return c.keepOut;
              })
            )
          };
        }
      );
    }
  }
  /* 안 정한 돈은 매출에도 사업에 쓴 돈에도 안 들어간다.
     이 줄이 없으면 「순이익이 왜 이것뿐인가」를 표에서 설명할 길이 없다 */
  if (anyUnset) {
    row(
      '아직 안 정한 돈',
      anyKeep ? 'keeprow2 unsetrow2' : 'keeprow unsetrow2',
      function (c) {
        if (!c.unknown) return { txt: '—', cls: 'dash' };
        return { txt: won(c.unknown), go: true, pill: true };
      },
      function (l) {
        return {
          txt: won(
            meanOf(l, function (c) {
              return c.unknown;
            })
          ),
          pill: true
        };
      },
      'unset',
      true
    );
  }

  /* 「원가율」은 식당에서 식자재 비율을 뜻하는 말이다.
     사업에 쓴 돈 전체를 매출로 나눈 값을 원가율이라고 부르면 안 된다.
     ★ 70차 ②. 이 줄은 「자세히 보기」 안에 숨어 있었다 — 이제 상시 노출이다.
       세부가 없는 줄이라 접을 것이 없다 (요청서 5) */
  row(
    '사업에 쓴 돈 비율 (매출 대비)',
    null,
    function (c) {
      if (opening[c.m]) return { txt: '—' };
      if (c.blocked || !c.sales) return { txt: '—', cls: c.blocked ? 'none' : '' };
      return { txt: ratioTxt(c.cost, c.sales) };
    },
    function (l) {
      return poolPct(
        l,
        function (c) {
          return c.cost;
        },
        function (c) {
          return c.sales;
        }
      );
    }
  );
  /* ★ 61차 ①. 여기 있던 「원가율 (식자재·주류 ÷ 매출)」 줄은 위로 올렸다 —
     접힌 자리에 있어서 1년치를 펴도 안 보였다. 같은 것을 두 자리에 두지 않는다 (49차) */

  /* 이 앱의 최종 값. 열두 달 잔액 흐름이 한눈에 보인다.
     ★ 66차 ③-3. 진행 중인 달의 칸은 「—」다. 아직 월말이 안 왔다.
       예전에는 마지막 거래일 잔액을 넣어두고 이름만 「달 끝」이라 불렀는데,
       그러면 이 줄에서 8월과 7월을 나란히 견주게 되어 거짓말이 된다.
       지금 잔액은 맨 위 이번 달 구역에서 보신다 (같은 것 한 자리 — 49차).
     ★ 65-2차. 평균 칸을 채운다. 완료된 달만 센다 —
       진행 중인 달의 반쪽 잔액이 섞이면 평균이 내려앉는다 */
  row(
    '월말 계좌 잔액',
    'balrow',
    function (c) {
      if (c.m === 진행달) return { txt: '—' };
      return { txt: won(c.close) };
    },
    function (l) {
      return {
        txt: won(
          meanOf(l, function (c) {
            return c.close;
          })
        )
      };
    },
    'bal'
  );
  tab.appendChild(tbody);
  wrap.appendChild(tab);
  host.appendChild(wrap);
  /* ★ 66차 ③-3. 표를 열면 가장 오른쪽(최신 달)이 먼저 보이게 한다.
     왼쪽이 가장 오래된 달이라, 그냥 두면 1년 전 숫자가 첫인상이 된다.
     ★ 56차의 스크롤 자리 지키기가 그린 뒤에 scrollLeft 를 되돌려 놓으므로,
       거기서 「아직 한 번도 안 민 표」만 오른쪽 끝으로 보낸다 (drawResult).
       여기서는 처음 그릴 때의 자리만 정한다 */
  wrap.scrollLeft = wrap.scrollWidth;
  /* ★ 66차 ③-3. 진행 중인 달이 어디까지의 누적인지 표 밑에 밝힌다 */
  /* ★ 71차 ⑤-5. 지났는데 자료가 없는 달 — 채우는 길을 알려드린다.
     71차 ②로 파일을 보탤 수 있게 됐으니 이것은 빈말이 아니다.
     ★ 아직 안 온 달은 여기 안 센다. 그건 기다리면 되는 것이라 할 말이 없다 */
  var 빈달 = cols.filter(function (c) {
    return c.없음 && !c.미래;
  });
  if (빈달.length) {
    var 토막 = [],
      앞 = null,
      뒤 = null;
    빈달.forEach(function (c, i) {
      var n = +c.m.slice(5, 7);
      if (앞 === null) {
        앞 = 뒤 = n;
        return;
      }
      if (n === 뒤 + 1) {
        뒤 = n;
        return;
      }
      토막.push(앞 === 뒤 ? 앞 + '월' : 앞 + '~' + 뒤 + '월');
      앞 = 뒤 = n;
    });
    if (앞 !== null) 토막.push(앞 === 뒤 ? 앞 + '월' : 앞 + '~' + 뒤 + '월');
    host.appendChild(
      el(
        'div',
        'yfoot',
        해 +
          '년 ' +
          토막.join(' · ') +
          '은 아직 자료가 없습니다. ' +
          '그 시기 거래내역을 올리시면 이 표와 그래프가 채워집니다.'
      )
    );
  }
  /* ★ 76차. 표 아래 긴 설명은 모두 걷는다.
     회계상 순이익과 다를 수 있다는 한 줄은 drawResultInner의 dscLine에서만 보여준다. */
}
function foodOf(c) {
  return catOfMonth(c, '식자재') + catOfMonth(c, '주류·음료');
}

/* ★ 61차. 이름을 바꾼 매장에서도 그 자리의 항목을 집는다 —
     RATIO_RULES 가 이미 하는 방식 그대로. 예전에는 원본 이름으로만 찾아서
     「식자재」를 「재료비」로 바꾸신 매장에서는 0원으로 나왔다 */
function catOfMonth(c, name) {
  return c.cats[baseName(name)] || 0;
}

/* 비율은 각 달 비율의 평균이 아니라 (분자 합 ÷ 분모 합) — 16차에서 정한 그대로 */
function poolPct(list, num, den) {
  var n = 0,
    d = 0;
  list.forEach(function (c) {
    if (c.blocked) return;
    n += num(c);
    d += den(c);
  });
  return d > 0 ? { txt: ratioTxt(n, d) } : { txt: '—' };
}

/* ★ 43차. 1년치 표에 세 자리 %가 그대로 남아 있었다 (153% · 152%).
     42차에 한 달 화면만 고쳤고 검사도 표를 안 밟았다.
   ★ 67차 ②. 여기도 배수를 뺀다 — 한 달 화면의 pctCell 과 같은 말을 쓴다 (49차) */
function ratioTxt(num, den) {
  if (!den || den <= 0) return '—';
  var p = Math.round((num / den) * 100);
  if (p < 100) return p + '%';
  return '매출 초과';
}

/* 끝난 달만 더해서 평균 */
function meanOf(list, get) {
  var s = 0;
  list.forEach(function (c) {
    s += get(c);
  });
  return list.length ? Math.round(s / list.length) : 0;
}

function 그룹줄(months, tr, 키, 세부있음) {
  if (!tr || !세부있음) return; /* 세부가 없으면 누를 것이 없다 — 그냥 줄로 둔다 (요청서 6) */
  var rh = tr.querySelector('.rh');
  if (!rh) return;
  var 열림 = 그룹열림(키);
  tr.classList.add('ygrp');
  rh.appendChild(el('span', 'ychev', 열림 ? '▲' : '▼'));
  rh.setAttribute('role', 'button');
  rh.tabIndex = 0;
  rh.setAttribute('aria-expanded', 열림 ? 'true' : 'false');
  var 뒤집기 = function () {
    UP.open.__yg = UP.open.__yg || {};
    UP.open.__yg[키] = !열림;
    /* drawResult 가 표의 가로 스크롤 자리를 지킨다 (56차) — 여기서 튀지 않는다 */
    drawResult(months);
  };
  rh.addEventListener('click', 뒤집기);
  rh.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      뒤집기();
    }
  });
}

/* ★ 70차 ② · 그룹 접기 ────────────────────────────────────────
     표가 열두 달을 가로로 늘어놓는 자리라 줄이 늘면 바로 안 읽힌다.
     그래서 세부가 있는 줄은 접어 두고, 궁금한 것만 펼쳐 보게 한다.
     ★ 예전의 「자세히 보기 ▾」 하나로 전부 여닫던 방식은 없앴다 —
       매출만 보고 싶어도 비율까지 다 딸려 나왔다 (개발자 확정).
     ★ 접어도 그룹 합계 숫자는 그대로다. 접히는 것은 세부뿐이다.
     ★ 접고 펴는 것은 보기일 뿐 — 계산에는 닿지 않는다 */
function 그룹열림(키) {
  return !!(UP.open.__yg && UP.open.__yg[키]);
}

function deltaTxt(cols, 진행달, opening, i, get) {
  if (i < 1) return '';
  var c = cols[i],
    p = cols[i - 1];
  if (!마감칸(진행달, opening, c) || !마감칸(진행달, opening, p)) return '';
  return pctDelta(get(c), get(p));
}

/* pick 은 달 하나를, avg 는 평균 칸을 만든다.
     ★ 53차 ①. whyId 가 있으면 이름 옆에 ? 가 붙고,
       누르면 그 줄 바로 아래에 두 줄이 한 칸으로 깔린다.
       한 달 화면과 같은 여섯 줄이라 설명도 같은 것을 쓴다 */
/* ★ 66차 ③-2. get 을 주면 칸 아래에 작은 「전월 대비」 한 줄이 붙는다.
     마감한 달끼리만 견준다 — 바로 앞 칸이 진행 중이거나 문 열기 전 달이면 안 붙인다.
     막힌 달(아직 안 정한 돈이 많은 달)도 견주지 않는다. 셀 수 없는 값이다 */
function 마감칸(진행달, opening, c) {
  return c.m !== 진행달 && !opening[c.m] && !c.blocked;
}

/* 화면을 열면 예시부터 세워둔다. 파일을 올리면 같은 자리에 그 숫자가 들어간다 */
startDemo();
/* ★ 63-13. 시작 화면은 맨 마지막에 세운다.
   위쪽(fillBiz 옆)에서 부르면 PICK_KEY 가 아직 안 정해져 있어
   savedSummary() 가 저장통을 못 찾고 「이어서 보기」가 안 나온다.
   예시를 다 그린 뒤라 감추는 것도 여기서 해야 확실하다 */
try {
  drawStart();
} catch (e) {}
/* ★ 97차 ①. 91차 ②의 「열자마자 지난 화면으로」를 끈다.
   매장이 둘 이상이면 자동으로 하나를 고르는 것이 되어 절반은 틀린 화면이 열렸고,
   시작 화면이 영영 안 보여 「어떻게 받나요」 안내(96차)와 「이어서 보기」 목록(93차)에
   닿지 못했다. 되살리는 길은 시작 화면의 「이어서 보기」 하나로 모은다.
   ★ 재업로드가 없어진다는 91차의 본론은 그대로다. 한 번 누르는 것만 늘었다 —
     「이어서 보기」는 openSavedData 를 바로 부른다(goSavedStore). 그 길은 그대로다.
   ★ openLastData 는 지우지 않는다. 다만 이제 부르는 곳이 없다 —
     이걸 다시 켜는 날 여기 한 줄만 되살리면 되도록 남겨둔다.
     LAST_KEY(fc.last) 를 저장하고 지우는 로직도 같은 이유로 그대로 둔다 */
