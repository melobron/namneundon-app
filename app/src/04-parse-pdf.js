/* ── 92차 ④ · PDF 를 「표 배열」로 ─────────────────────────────────────
   ★ 이번 회차에 새로 짜는 것은 이 조각 하나뿐이다.
     여기서 만든 행×열 배열을 엑셀 시트로 바꿔(pdfWorkbook) 위의 extractRows 에
     그대로 넣는다 — 열 찾기·잔액 고르기·검산·정렬은 한 줄도 새로 짜지 않는다.
   ★ pdf.js 는 글자 조각과 그 좌표만 준다. 표 선은 안 준다.
     그래서 y 로 줄을 묶고, 머리글 줄이 앉은 x 자리로 칸을 가른다 —
     머리글은 그 표가 스스로 알려주는 유일한 자리다.
   ★ 머리글을 못 찾으면 조각을 그대로 칸으로 놓고 넘긴다.
     판정은 여전히 findHeader 가 한다. 못 읽으면 ⑤ 안내로 간다 — 멈추지 않는다 */
var PDF_LINE_TOL = 3;        /* 이만큼(pt) 안이면 같은 줄로 본다 */
var PDF_MIN_CHARS = 50;      /* 글자가 이보다 적으면 사진을 찍어 넣은 PDF 다 */

/* 조각들을 y 로 묶어 줄을 만든다. 줄 안은 x 순으로 놓는다 */
/* ── 92-1차 ② · 낱자로 온 글자를 단어로 잇는다 ───────────────────────
   신한 실파일에서 pdf.js 가 「거 래 일 자」처럼 한 자씩 준다. PDF 가 글자를
   하나씩 그려 넣었으면 pdf.js 는 그린 그대로 준다 — 단어를 만들어 주지 않는다.
   단어가 없으면 머리글도 못 알아보고 칸도 못 가른다. 그래서 제일 먼저 잇는다.
   ★ 「붙어 있는 것」만 잇는다. 사이가 빈 것은 그대로 둔다 —
     「2026.08.27 13:44:11」의 빈칸까지 먹으면 날짜가 통째로 깨진다.
     빈칸 하나는 글자폭의 1/4쯤 되므로, 문턱을 그보다 훨씬 아래에 둔다.
   ★ 붙일 때 사이에 아무것도 안 넣는다. 칸이 다른 조각은 여기서 안 붙고,
     나중에 같은 칸에 들어갈 때 pdfTable 이 빈칸 하나로 이어 붙인다 */
function pdfJoinChars(items) {
  var out = [];
  items.forEach(function (it) {
    var 앞 = out[out.length - 1];
    if (앞) {
      var 폭 = (앞.w || 0) / Math.max(1, 앞.s.length);
      var 틈 = it.x - (앞.x + (앞.w || 0));
      if (틈 <= Math.min(1.8, 폭 * 0.35)) {          /* 겹치거나 맞닿아 있다 */
        앞.s += it.s;
        앞.w = Math.max(앞.x + (앞.w || 0), it.x + (it.w || 0)) - 앞.x;
        return;
      }
    }
    out.push({ s: it.s, x: it.x, y: it.y, w: it.w || 0 });
  });
  return out;
}
function pdfLines(items) {
  var out = [];
  items.slice().sort(function (a, b) { return (b.y - a.y) || (a.x - b.x); })
    .forEach(function (it) {
      var last = out[out.length - 1];
      if (last && Math.abs(last.y - it.y) <= PDF_LINE_TOL) { last.items.push(it); return; }
      out.push({ y: it.y, items: [it] });
    });
  out.forEach(function (l) {
    l.items.sort(function (a, b) { return a.x - b.x; });
    l.items = pdfJoinChars(l.items);     /* 칸을 가르기 전에 단어부터 만든다 */
  });
  return out;
}
/* 이 조각은 어느 칸인가 — 가로로 가장 많이 겹치는 칸.
   ★ 겹침으로 본다. 금액은 오른쪽 맞춤이라 머리글보다 왼쪽에서 시작하는데,
     시작 x 로만 재면 앞 칸으로 밀려 들어간다 */
function pdfColOf(cols, it) {
  var a1 = it.x, a2 = it.x + (it.w || 0);
  var best = 0, bestv = -1, c;
  for (c = 0; c < cols.length; c++) {
    var ov = Math.min(a2, cols[c].x2) - Math.max(a1, cols[c].x1);
    if (ov > bestv) { bestv = ov; best = c; }
  }
  if (bestv > 0) return best;
  var mid = (a1 + a2) / 2, bd = null;
  for (c = 0; c < cols.length; c++) {
    var d = Math.abs((cols[c].x1 + cols[c].x2) / 2 - mid);
    if (bd === null || d < bd) { bd = d; best = c; }
  }
  return best;
}
/* ★ 금액은 오른쪽 끝에서 떼어낸다.
   상호가 길고 금액이 억 단위면 은행이 둘을 한 조각으로 그려 보낸다
   (실측 — 「주식회사○○ 100,000,000」). 그러면 좌표로는 영영 못 가른다.
   오른쪽 끝의 수만 떼어내면 안전하다 — 금액은 언제나 줄 끝에 있다.
   떼어낸 글자는 왼쪽 칸으로 보낸다. 거기가 거래처 이름 자리다 */
function pdfPeelNumbers(grid, hi, cols) {
  var 돈이름 = COLSPEC.inAmt.concat(COLSPEC.outAmt, COLSPEC.amount, COLSPEC.balance).map(nz);
  var 돈칸 = [];
  cols.forEach(function (c, i) {
    if (돈이름.indexOf(nz(c.name)) !== -1 || 돈이름.indexOf(nzOuter(c.name)) !== -1) 돈칸.push(i);
  });
  for (var r = hi + 1; r < grid.length; r++) {
    for (var k = 0; k < 돈칸.length; k++) {
      var c = 돈칸[k], v = String(grid[r][c] == null ? '' : grid[r][c]);
      var m = /^(.*\S)\s+([-−+]?\d[\d,]*)$/.exec(v);
      if (!m) continue;
      if (!/[^\d,\-−+.\s]/.test(m[1])) continue;   /* 앞쪽도 수뿐이면 두 금액이다. 안 건드린다 */
      grid[r][c] = m[2];
      if (c > 0) grid[r][c - 1] = grid[r][c - 1] ? (grid[r][c - 1] + ' ' + m[1]) : m[1];
    }
  }
}
/* ★ 점 없는 날짜(20260620)를 여기서만 편다.
   toStamp 는 점을 빼는 일까지만 한다 — 그 함수는 엑셀·HTML 도 함께 쓰는 자리라
   건드리면 다른 은행이 같이 흔들린다. 고치는 자리는 PDF 쪽이어야 한다.
   ★ 머리글이 날짜라고 말한 칸에서만 편다. 여덟 자리 수는 계좌번호일 수도 있다 */
function pdfFixDates(grid, hi, cols) {
  var want = COLSPEC.at.map(nz), 날짜칸 = [];
  cols.forEach(function (c, i) {
    var n = nz(c.name);
    if (want.indexOf(n) !== -1 || DATE_WIDE.test(n)) 날짜칸.push(i);
  });
  for (var r = hi + 1; r < grid.length; r++) {
    for (var k = 0; k < 날짜칸.length; k++) {
      var c = 날짜칸[k];
      var m = /^(20\d{2})(\d{2})(\d{2})(\s[\s\S]*)?$/.exec(String(grid[r][c] || '').trim());
      if (!m) continue;
      var mo = +m[2], da = +m[3];
      if (mo < 1 || mo > 12 || da < 1 || da > 31) continue;
      grid[r][c] = m[1] + '-' + m[2] + '-' + m[3] + (m[4] || '');
    }
  }
}
/* ★ 칸을 가르는 자리는 「글자가 지나가지 않는 세로 띠」다.
   ─ 처음에는 머리글 조각이 앉은 x 로 칸을 갈랐다. 국민 PDF 에서 무너졌다:
     머리글(「출금액」)은 칸 왼쪽에 붙어 있고 금액은 오른쪽 맞춤이라 둘이 안 겹친다.
     금액이 옆 칸(「입금액」) 머리글과 더 많이 겹쳐 통째로 입금으로 읽혔다.
   ─ 빈 띠로 가르면 맞춤이 왼쪽이든 오른쪽이든 한 칸으로 같이 묶인다.
   ★ 딱 한 줄만 옆 칸까지 뻗은 것(긴 상호)으로 칸이 무너지지 않게,
     「거의 모든 줄이 비어 있는 띠」를 가르는 자리로 본다 — 한 줄은 못 이긴다 */
var PDF_GAP_SHARE = 0.12;    /* 이 비율보다 적게 쓰이는 띠는 빈 띠로 본다 */
var PDF_GAP_MIN = 4;         /* 빈 띠가 이보다 좁으면 글자 사이 틈이다 (pt) */
function pdfColumnsByGap(lines) {
  var min = null, max = null;
  lines.forEach(function (l) {
    l.items.forEach(function (it) {
      var a = it.x, b = it.x + (it.w || 0);
      if (min === null || a < min) min = a;
      if (max === null || b > max) max = b;
    });
  });
  if (min === null || max - min < 10) return null;
  min = Math.floor(min); max = Math.ceil(max);
  var n = max - min, hit = new Array(n), i;
  for (i = 0; i < n; i++) hit[i] = 0;
  lines.forEach(function (l) {
    var 썼다 = {};
    l.items.forEach(function (it) {
      var a = Math.max(min, Math.floor(it.x)), b = Math.min(max, Math.ceil(it.x + (it.w || 0)));
      for (var k = a; k < b; k++) 썼다[k - min] = 1;
    });
    Object.keys(썼다).forEach(function (k) { hit[+k]++; });
  });
  var 문턱 = Math.max(1, Math.floor(lines.length * PDF_GAP_SHARE));
  var cols = [], 시작 = null, 빈칸 = 0;
  for (i = 0; i <= n; i++) {
    var 참 = (i < n) && (hit[i] >= 문턱);
    if (참) {
      if (시작 === null) 시작 = i;
      빈칸 = 0;
    } else if (시작 !== null) {
      빈칸++;
      if (빈칸 >= PDF_GAP_MIN || i === n) {
        cols.push({ x1: min + 시작, x2: min + i - 빈칸 });
        시작 = null; 빈칸 = 0;
      }
    }
  }
  return cols.length >= 3 ? cols : null;
}
/* ★ 92-1차 ① · 칸 경계는 머리글 줄의 x 가 정한다.
   ─ 92차에는 몸통의 빈 세로 띠로만 갈랐다. 국민 실파일(905건)에서 무너졌다:
     왼쪽 네 칸(거래일시·적요·보낸분/받는분·거래점 쪽)이 촘촘해 빈 띠가 없어
     네 칸이 한 칸으로 뭉쳤다. 여덟 칸이 여섯 칸이 되고, 첫 칸이 「거래일시」가
     아니게 되어 그 뒤 머리글 찾기가 통째로 실패했다.
   ─ 머리글 줄은 칸이 또렷이 갈리는 유일한 줄이다. 이웃한 머리글 사이의
     가운데를 경계로 둔다. 값이 오른쪽 맞춤이어도 pdfColOf(겹침 기준)가 받아낸다.
   ★ 실측 머리글 x (국민): 거래일시 50 · 적요 129 · 보낸분/받는분 178 · 출금액 268
     · 입금액 332 · 잔액 400 · 송금메모 465 · 거래점 536 */
function pdfColumnsByHeader(line) {
  var its = (line && line.items) || [];
  if (its.length < 3) return null;
  /* ★ 95차 ④. 금액 칸은 오른쪽으로 더 넓다 (케이뱅크 실측).
     머리글은 칸 왼쪽에 붙어 찍히는데 금액은 칸 오른쪽에 맞춰 찍힌다.
     그래서 두 머리글의 가운데로 자르면, 「잔액」처럼 이름이 짧고 다음 머리글이
     가까운 칸에서 금액이 경계를 넘어 옆 칸(받는사람)으로 넘어간다 —
     128건짜리에서 잔액이 통째로 밀려 78건만 읽히고 검산이 45건 깨졌다.
     금액 이름을 단 머리글 뒤에서는 가운데가 아니라 「다음 머리글 바로 앞」에서
     자른다. 금액은 오른쪽 맞춤이라 왼쪽이 넉넉한 것은 해가 없다 */
  var 돈이름 = COLSPEC.inAmt.concat(COLSPEC.outAmt, COLSPEC.amount, COLSPEC.balance).map(nz);
  function 돈칸인가(a) {
    var n = nz(a.s);
    return 돈이름.indexOf(n) !== -1 || 돈이름.indexOf(nzOuter(a.s)) !== -1;
  }
  /* 머리글 사이의 자를 자리를 먼저 다 정한다. 그래야 양쪽 칸이 딱 맞물린다 */
  var cut = [], i;
  for (i = 0; i + 1 < its.length; i++) {
    var a = its[i], 뒤 = its[i + 1];
    var 가운데 = ((a.x + (a.w || 0)) + 뒤.x) / 2;
    cut.push(돈칸인가(a) ? Math.max(가운데, 뒤.x - 2) : 가운데);
  }
  var cols = [];
  for (i = 0; i < its.length; i++) {
    var b = its[i];
    var x1 = i > 0 ? cut[i - 1] : b.x - 2;
    var x2 = i + 1 < its.length ? cut[i] : b.x + (b.w || 0) + 2;
    if (!(x2 > x1)) return null;          /* 머리글이 서로 겹쳐 있으면 못 쓴다 */
    cols.push({ x1: x1, x2: x2, name: b.s });
  }
  return cols;
}
function pdfBuild(lines, hi, cols) {
  var grid = lines.map(function (l, li) {
    var row = [], c;
    for (c = 0; c < cols.length; c++) row.push('');
    /* ★ 머리글 줄만은 차례로 놓는다. 수가 같으면 차례가 곧 짝이다 */
    if (li === hi && l.items.length === cols.length) {
      l.items.forEach(function (it, k) { row[k] = it.s; });
      return row;
    }
    l.items.forEach(function (it) {
      var k = pdfColOf(cols, it);
      row[k] = row[k] ? (row[k] + ' ' + it.s) : it.s;
    });
    return row;
  });
  if (hi >= 0) {
    cols.forEach(function (c, k) { c.name = grid[hi][k]; });
    pdfPeelNumbers(grid, hi, cols);
    pdfFixDates(grid, hi, cols);
  }
  return grid;
}
/* 표 후보를 차례로 준다 — 엑셀·HTML 을 여러 번 읽어보는 workbookTries 와 같은 방식이다.
   머리글 x 로 가른 것을 먼저 주고, 그것으로 안 읽히면 빈 띠로 가른 것을 준다.
   어느 쪽이 맞는지는 읽어봐야 안다 — 판정은 언제나 extractRows 가 한다 */
/* ── 92-3차 · 행의 닻은 거래일시다 ──────────────────────────────────
   ★ 왜 필요한가 (실측). 빽빽하고 금액이 큰 쪽에서는 날짜·적요·거래처가 서로 맞닿아
     pdfJoinChars 가 셋을 한 조각으로 이어 버린다. 그 조각은 폭이 넓어서
     가장 많이 겹치는 칸(거래처)으로 통째로 들어가고, 날짜 칸이 비어 버린다.
     buildRows 는 날짜로 시작하지 않는 줄을 버리므로 그 거래는 통째로 사라진다 —
     905건짜리에서 227건이 이렇게 없어졌다. 숫자가 조용히 줄어드는 자리다.
   ★ 그래서 y 로 줄을 묶는 대신 「거래일시」를 닻으로 삼는다.
     거래 하나에 거래일시는 정확히 하나다. 닻 하나 = 행 하나 —
     두 거래가 한 행으로 합쳐지지도, 한 거래가 사라지지도 않는다.
   ★ 닻 조각에 뒷말이 붙어 있으면 날짜만 떼어 날짜 칸에 두고, 나머지는 다음 칸으로
     보낸다. pdfPeelNumbers 가 금액을 오른쪽에서 떼어내는 것과 같은 방식이다.
   ★ 날짜 칸이 없는 형식(부호 한 열짜리 등)은 이 방법을 안 쓴다 — null 을 돌려주고
     지금까지의 y 묶기가 그대로 후보로 남는다 */
var PDF_DATE_ANCHOR = /^(20\d{2})[.\-\/]?(0[1-9]|1[0-2])[.\-\/]?(0[1-9]|[12]\d|3[01])(\s*\d{1,2}:\d{2}(:\d{2})?)?/;
var PDF_ROW_TOL = 12;        /* 닻 아래 이만큼(pt)까지는 같은 행의 이어진 줄로 본다 */
function pdfDateColOf(cols) {
  var want = COLSPEC.at.map(nz);
  for (var i = 0; i < cols.length; i++) {
    var n = nz(cols[i].name);
    if (n && (want.indexOf(n) !== -1 || DATE_WIDE.test(n))) return i;
  }
  return -1;
}
/* ── 92-4차 · 한 조각에 붙어 온 것을 자리대로 떼어낸다 ────────────────
   ★ 왜 (실측). 상호가 길고 금액이 크면 「…주식회사대한식자재유통1,877,211」처럼
     날짜·적요·거래처·금액이 한 조각으로 붙어 온다. 그대로 두면 금액이 글자 칸에
     갇혀 0원이 된다 — 큰 금액 행만 돈이 사라지는 자리다.
   ★ 떼어낸 조각의 x 를 글자 너비로 어림잡아 다시 계산한다. 그래야 pdfColOf 가
     제 칸을 찾는다. 한글은 영숫자의 두 배 너비로 센다 — 칸을 고르는 데는 이 정도면 된다.
   ★ 「수」로 인정하는 것은 세 자리 쉼표가 든 것뿐이다 (1,877,211).
     그래야 계좌번호나 「계좌 2」 같은 것을 금액으로 잘못 떼지 않는다 */
function pdfUnits(s) {
  var u = 0;
  for (var i = 0; i < s.length; i++) u += (s.charCodeAt(i) > 127 ? 2 : 1);
  return u;
}
function pdfCutAt(it, 머리글자) {
  /* 앞쪽 머리글자 길이만큼을 떼어 두 조각으로 나눈다 */
  var 전체 = pdfUnits(it.s) || 1;
  var 폭 = (it.w || 0) * (pdfUnits(머리글자) / 전체);
  return [{ s: 머리글자, x: it.x, y: it.y, w: 폭 },
          { s: it.s.slice(머리글자.length), x: it.x + 폭, y: it.y, w: (it.w || 0) - 폭 }];
}
/* 꼬리에 붙은 금액을 떼어낸다. 여러 개가 붙어 있으면 여러 번 떼어낸다 */
function pdfSplitTail(it) {
  var out = [it], 안전 = 0;
  while (안전++ < 4) {
    var 끝 = out[out.length - 1];
    var m = /^(.*[^\d,\s])\s*([-−+]?\d{1,3}(?:,\d{3})+)$/.exec(끝.s);
    if (!m) break;
    var 쪼갬 = pdfCutAt(끝, m[1]);
    쪼갬[1].s = 쪼갬[1].s.replace(/^\s+/, '');
    out[out.length - 1] = 쪼갬[0];
    out.push(쪼갬[1]);
  }
  return out;
}
/* ★ 92-4차. pdfPeelNumbers 의 거울. 그쪽은 「글자 + 수」에서 수를 떼어내고,
   이쪽은 「수 + 글자」에서 글자를 떼어 오른쪽 칸으로 보낸다.
   ─ 실측: 잔액이 길면 그 오른쪽 칸(거래점·송금메모) 글자와 맞닿아
     「8,998,122,789 본점」 한 칸이 된다. toNum 이 null 을 돌려주고
     buildRows 가 그 줄을 통째로 버린다 — 큰 금액 행만 사라지던 자리다.
   ─ 좌표로는 못 가른다. 그 칸의 머리글(거래점)은 값보다 한참 오른쪽에 있어서
     값이 잔액 칸 안에 들어앉기 때문이다. 그래서 칸 안에서 글자로 가른다 */
function pdfPeelHeads(grid, hi, cols) {
  var 돈이름 = COLSPEC.inAmt.concat(COLSPEC.outAmt, COLSPEC.amount, COLSPEC.balance).map(nz);
  var 돈칸 = [];
  cols.forEach(function (c, i) {
    if (돈이름.indexOf(nz(c.name)) !== -1 || 돈이름.indexOf(nzOuter(c.name)) !== -1) 돈칸.push(i);
  });
  for (var r = hi + 1; r < grid.length; r++) {
    for (var k = 0; k < 돈칸.length; k++) {
      var c = 돈칸[k], v = String(grid[r][c] == null ? '' : grid[r][c]);
      var m = /^([-−+]?\d[\d,]*)\s+(\S[\s\S]*)$/.exec(v);
      if (!m) continue;
      if (!/[^\d,\-−+.\s]/.test(m[2])) continue;   /* 뒤도 수뿐이면 두 금액이다 — 안 건드린다 */
      grid[r][c] = m[1];
      var R = c + 1;
      if (R < grid[r].length) grid[r][R] = grid[r][R] ? (m[2] + ' ' + grid[r][R]) : m[2];
    }
  }
}
function pdfRowsByDate(lines, hi, cols) {
  var dc = pdfDateColOf(cols);
  if (dc < 0) return null;
  var rows = [], 현재 = null, 현재y = null, c;
  function 새행() { var r = [], k; for (k = 0; k < cols.length; k++) r.push(''); return r; }
  function 넣기(row, k, s) { row[k] = row[k] ? (row[k] + ' ' + s) : s; }
  for (var i = hi + 1; i < lines.length; i++) {
    var its = lines[i].items;
    var 날짜있나 = false, j;
    for (j = 0; j < its.length; j++) if (PDF_DATE_ANCHOR.test(its[j].s)) { 날짜있나 = true; break; }
    /* 닻에서 너무 멀리 떨어진 줄(쪽 바닥의 안내·쪽번호)은 어느 행에도 안 붙인다 */
    if (!날짜있나 && (현재 === null || 현재y === null ||
        Math.abs(현재y - lines[i].y) > PDF_ROW_TOL)) continue;
    for (j = 0; j < its.length; j++) {
      var it = its[j];
      var m = PDF_DATE_ANCHOR.exec(it.s);
      var 나머지 = null;
      if (m) {
        현재 = 새행();
        현재y = it.y;
        rows.push(현재);
        넣기(현재, dc, m[0].trim());
        /* ★ 92-4차. 날짜 뒤에 붙어 온 것은 버리지 않는다. 자리대로 떼어
           제 칸에 넣는다 — 여기에 금액이 들어 있는 행이 있다 */
        var 쪼갬 = pdfCutAt(it, m[0]);
        나머지 = 쪼갬[1];
        나머지.s = 나머지.s.replace(/^\s+/, '');
        if (!나머지.s) continue;
      } else {
        if (현재 === null) continue;      /* 첫 거래 앞의 조각(계좌 안내)은 표에 안 넣는다 */
        나머지 = it;
      }
      pdfSplitTail(나머지).forEach(function (조각) {
        if (!조각.s) return;
        넣기(현재, pdfColOf(cols, 조각), 조각.s);
      });
    }
  }
  if (!rows.length) return null;
  /* 머리글 위의 줄(은행 이름·계좌 안내)을 그대로 얹는다.
     ★ 버리면 안 된다 — bankFromHead 가 거기서 은행 이름을 읽는다.
       없으면 계좌가 「계좌 2」로 불린다 (실측) */
  var 위 = [];
  for (var u = 0; u < hi; u++) {
    var r2 = 새행();
    lines[u].items.forEach(function (it) { 넣기(r2, pdfColOf(cols, it), it.s); });
    위.push(r2);
  }
  /* 머리글 줄 — extractRows 가 칸 이름을 거기서 읽는다 */
  var 머리 = 새행();
  for (c = 0; c < cols.length; c++) 머리[c] = cols[c].name || '';
  var grid = 위.concat([머리], rows);
  /* ★ 92-4차. 행을 나눈 뒤에도 한 번 더 훑는다 —
     자리로 못 가른 것(한 칸 안에서 「상호 12,345,678」로 붙은 것)은
     92차의 pdfPeelNumbers 가 오른쪽 끝에서 떼어낸다. 그 로직은 그대로 쓴다 */
  pdfPeelHeads(grid, 위.length, cols);      /* 수 + 글자 → 글자를 오른쪽으로 */
  pdfPeelNumbers(grid, 위.length, cols);    /* 글자 + 수 → 수만 남긴다 (92차 그대로) */
  pdfFixDates(grid, 위.length, cols);
  return grid;
}
function pdfTables(lines) {
  var hi = -1, i;
  for (i = 0; i < lines.length && hi < 0; i++) {
    if (headerLooksReal(lines[i].items.map(function (x) { return x.s; }))) hi = i;
  }
  /* ★ 92-2차 ①. 쪽마다 되풀이되는 열 머리글을 걷어낸다.
     국민 명세서는 35쪽이고 쪽마다 「거래일시 적요 … 잔액」이 다시 나온다 (35번).
     이 줄들이 거래 줄 사이에 섞여 있으면 쪽 경계에서 표가 무너지고,
     빈 띠로 칸을 재는 쪽은 머리글 글자까지 같이 재서 칸이 어긋난다.
     ★ 첫 머리글(hi)은 남긴다 — 칸 이름을 거기서 읽는다.
       뒤에 오는 것만 걷어내므로 hi 의 자리는 그대로다.
     ★ 안내·합계·쪽번호 줄은 안 건드린다. 날짜로 시작하지 않아 buildRows 가
       어차피 안 읽고, 총액 줄은 아래 pdfTotals 가 읽어야 한다 */
  if (hi >= 0) {
    lines = lines.filter(function (l, k) {
      if (k <= hi) return true;
      return !headerLooksReal(l.items.map(function (x) { return x.s; }));
    });
  }
  var out = [];
  var 머리 = (hi >= 0) ? pdfColumnsByHeader(lines[hi]) : null;
  /* 빈 띠는 머리글 아래(표의 몸통)에서만 잰다 — 머리글 글자와 그 칸의 값이
     서로 반대쪽 끝에 붙어 있으면 한 칸이 둘로 갈린다 */
  var 띠 = pdfColumnsByGap((hi >= 0) ? lines.slice(hi + 1) : lines);
  /* ★ 92-3차. 거래일시를 닻으로 삼아 만든 표를 첫 후보로 둔다.
     y 로 묶은 표도 그대로 후보에 남긴다 — 어느 쪽이 맞는지는 읽어봐야 안다.
     고르는 것은 92-2차의 잣대다(은행 총액 일치 → 잔액 사슬 → 덜 뽑은 것에 벌점) */
  if (머리) {
    var 닻표 = pdfRowsByDate(lines, hi, 머리);
    if (닻표) out.push(닻표);
  }
  if (머리) out.push(pdfBuild(lines, hi, 머리));
  if (띠) out.push(pdfBuild(lines, hi, 띠));
  /* 둘 다 못 가르면 조각을 그대로 놓고 넘긴다. 판정은 findHeader 가 한다 */
  if (!out.length) out.push(lines.map(function (l) {
    return l.items.map(function (x) { return x.s; });
  }));
  return out;
}
/* ── 92-2차 ③ · 은행이 적어준 총액을 찾는다 ──────────────────────────
   명세서 머리에는 「총 출금금액 / 총 입금금액」이 적혀 있다. 그건 은행이 센 값이다.
   우리가 뽑은 합계가 그 값과 다르면 우리가 틀린 것이다 — 한 원도 틀리면 안 된다.
   ★ 이 검산이 이번 회차의 핵심이다. 국민 실파일에서 905건 중 165건이 빠졌는데도
     「읽었다」로 통과해 사장님께 29% 적은 입금이 보였다.
     틀린 숫자를 맞다고 보여주는 것이 못 읽는 것보다 훨씬 나쁘다.
   ★ 총액 줄이 없는 은행은 그냥 없는 대로 둔다(null). 그런 파일은 지금까지처럼
     잔액 사슬 검산만으로 판정한다 — 없는 근거를 지어내지 않는다 */
var TOTAL_OUT = /(총\s*출금(금액|액)?|출금\s*(금액\s*)?(합계|계)|지급\s*합계)/;
var TOTAL_IN = /(총\s*입금(금액|액)?|입금\s*(금액\s*)?(합계|계)|수입\s*합계)/;
function pdfTotals(lines) {
  function 수찾기(t, 라벨) {
    var m = 라벨.exec(t);
    if (!m) return null;
    /* 라벨 뒤에 처음 나오는 수. 사이에 단위·괄호가 끼어도 받는다 */
    var 뒤 = t.slice(m.index + m[0].length, m.index + m[0].length + 40);
    var n = /([\d][\d,]{3,})/.exec(뒤);
    if (!n) return null;
    var v = toNum(n[1]);
    return (v === null || v <= 0) ? null : v;
  }
  /* ★ 라벨이 나오는 자리를 전부 모아 본다.
     쪽마다 되풀이되는 명세서라면 값이 늘 같아야 한다 —
     값이 서로 다르게 읽히면 그건 쪽마다 따로 센 소계이거나 우리가 잘못 읽은 것이다.
     그럴 때는 없는 것으로 친다(null). 근거가 흔들리는 검산으로
     멀쩡한 파일을 막아 세우는 것이 더 나쁘다 */
  function 모으기(라벨) {
    var 값 = [];
    for (var i = 0; i < lines.length; i++) {
      var 글 = lines[i].items.map(function (x) { return x.s; }).join(' ');
      var 이어 = 글 + ' ' + (lines[i + 1]
        ? lines[i + 1].items.map(function (x) { return x.s; }).join(' ') : '');
      var v = 수찾기(글, 라벨);
      if (v === null) v = 수찾기(이어, 라벨);
      if (v !== null && 값.indexOf(v) === -1) 값.push(v);
      if (값.length > 1) return null;          /* 서로 다르다 — 못 믿는다 */
    }
    return 값.length === 1 ? 값[0] : null;
  }
  var out = 모으기(TOTAL_OUT), into = 모으기(TOTAL_IN);
  return (out === null && into === null) ? null : { out: out, in: into };
}
/* 뽑은 거래의 나간 돈·들어온 돈 합계. 총액 검산의 우리 쪽 값이다 */
function pdfSums(rows) {
  var o = 0, i2 = 0;
  (rows || []).forEach(function (r) {
    var v = r.amount;
    if (typeof v !== 'number') return;
    if (v < 0) o += -v; else i2 += v;
  });
  return { out: o, in: i2 };
}
/* 은행이 적은 총액과 맞는가. 총액이 없으면 「모른다」(null) — 틀렸다고 하지 않는다 */
function pdfTotalsOk(총, 합) {
  if (!총) return null;
  if (총.out !== null && 총.out !== 합.out) return false;
  if (총['in'] !== null && 총['in'] !== 합['in']) return false;
  return true;
}
/* 문서 전체를 훑어 줄을 모은다. 쪽 차례 그대로 이어 붙인다 */
function pdfGrid(doc) {
  var 쪽 = [], i;
  for (i = 1; i <= doc.numPages; i++) 쪽.push(i);
  var 글자수 = 0, lines = [];
  return 쪽.reduce(function (pr, n) {
    return pr.then(function () {
      return doc.getPage(n).then(function (page) {
        return page.getTextContent().then(function (tc) {
          var items = [];
          (tc.items || []).forEach(function (it) {
            var s = String(it.str == null ? '' : it.str).trim();
            if (!s) return;
            글자수 += s.length;
            var t = it.transform || [];
            items.push({ s: s, x: +t[4] || 0, y: +t[5] || 0, w: +it.width || 0 });
          });
          lines = lines.concat(pdfLines(items));
        });
      });
    });
  }, Promise.resolve()).then(function () {
    /* 총액은 머리글을 걷어내기 전에, 줄 그대로에서 읽는다 */
    /* ★ 113차 ①②. 조회 기간과 쪽 꼬리도 같은 자리에서 읽는다 —
       표로 자르고 나면 머리말이 없어져 기간을 찾을 수 없다 */
    var 글줄 = lines.map(function (L) {
      return L.items.map(function (x) { return x.s; }).join(' ');
    });
    return { chars: 글자수, totals: pdfTotals(lines), grids: pdfTables(lines),
             headLines: 글줄.slice(0, 40).concat(글줄.slice(-12)),
             pageFoot: pdfPageFoot(글줄), pages: doc.numPages };
  });
}
/* ★ 113차 ②다. 「n / m」 꼬리에서 m 을 읽는다. 꼬리는 문서 끝에 있다.
   ★ 이 값만으로 판단하지 않는다 — 토스 1쪽짜리에서 「1/11」이 잡혔다.
     부르는 쪽(rangeEvid)이 실제 쪽 수와 같은지 견준다 */
function pdfPageFoot(글줄) {
  for (var i = 글줄.length - 1; i >= 0 && i > 글줄.length - 10; i--) {
    var m = /(^|[^\d])(\d{1,3})\s*\/\s*(\d{1,3})($|[^\d])/.exec(askFlat(글줄[i]));
    if (m) return +m[3];
  }
  return null;
}
/* 표 배열을 엑셀 시트 한 장으로 바꾼다 — 여기서부터는 엑셀과 같은 길이다 */
function pdfWorkbook(grid) {
  var ws = window.XLSX.utils.aoa_to_sheet(grid);
  return { SheetNames: ['PDF'], Sheets: { PDF: ws } };
}

