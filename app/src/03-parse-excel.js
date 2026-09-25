/* ── 열 찾기 ── 행 번호를 고정하지 않고 "거래일시"가 있는 행을 헤더로 잡는다 */
/* nz()가 공백·괄호를 지우고 소문자로 만들어주니 「거래후 잔액」과 「거래후잔액」은
   같은 것으로 잡힌다. 여기 적는 건 표기 자체가 다른 것들이다 */
var COLSPEC = {
  at: [
    '거래일시',
    '거래일자',
    '거래일',
    '거래날짜',
    '일자',
    '거래시간',
    '날짜',
    '일시',
    '거래년월일',
    '처리일시',
    '처리일자',
    '승인일시',
    '승인일자',
    '이체일시',
    '입출금일시',
    '거래일자시간',
    '거래일시(원장)'
  ],
  memo: [
    '적요',
    '내용',
    '기재내용',
    '거래내용',
    '거래기록사항',
    '통장기재내용',
    '비고',
    '적요내용',
    '메모',
    '거래메모'
  ],
  payee: [
    '의뢰인/수취인',
    '의뢰인',
    '수취인',
    '보내는분',
    '받는분',
    '상대방',
    '입금자명',
    '받는사람',
    '보낸사람',
    '거래상대',
    /* ★ 54차 ①. 기업은행은 「상대계좌예금주명」으로 준다 —
               「상대계좌예금주」와도 「예금주명」과도 정확히 안 맞아
               이름으로 못 찾고 pickPayeeCol 로 빠졌고, 거기서 값 종류가 제일 많은
               「거래내용」(송금 메모)이 뽑혔다. 「순정이정」·「순동정정」이 거래처가 되면
               같은 곳이 매달 다른 이름으로 와서 자동분류가 영영 안 된다.
               ★ 이 열이 빈 줄에서는 지금처럼 「거래내용」으로 내려간다 —
                 payee → memo → note 사다리가 이미 그 일을 한다 */
    '거래상대방',
    '상대계좌예금주',
    '상대계좌예금주명',
    '예금주명',
    '상대방명',
    /* ★ 79차. 경남은행 HTML에서는 거래처명이 「거래내역」 열에 들어 있다. */
    '거래내역',
    '의뢰인(수취인)',
    '받는분/보내는분',
    /* ★ 92차 ④. 국민 PDF 가 「보낸분/받는분」으로 준다.
               엑셀에서는 65차의 채움율(nameColByFill)이 이 열을 겨우 찾아냈다 —
               이름으로 알려주는 열을 이름으로 못 찾고 있었던 것이다.
               PDF 는 칸이 좌표로 갈리는 자리라 이름으로 못 박아두는 편이 안전하다 */
    '보낸분/받는분',
    '보낸분',
    '상대'
  ],
  inAmt: [
    '입금',
    '입금액',
    '입금액(원)',
    '맡기신금액',
    '입금금액',
    '입금(원)',
    '받은금액',
    '입금금액(원)',
    '받으신금액',
    '입금액(₩)',
    '입금(₩)',
    '맡기신금액(원)'
  ],
  outAmt: [
    '출금',
    '출금액',
    '출금액(원)',
    '찾으신금액',
    '출금금액',
    '출금(원)',
    '보낸금액',
    '출금금액(원)',
    '보내신금액',
    '지급',
    '지급액',
    '지급금액',
    '출금액(₩)',
    '찾으신금액(원)'
  ],
  balance: ['거래후잔액', '잔액', '잔액(원)', '거래후 잔액', '남은잔액', '잔액원'],
  note: ['출금계좌메모', '메모', '메모내용'],
  /* 카카오·토스처럼 한 열에 부호로 들어오는 형식 */
  amount: [
    '거래금액',
    '금액',
    '거래액',
    '출금/입금',
    '입출금액',
    '거래금액(원)',
    '금액(원)',
    '입출금',
    '입출금액(원)'
  ],
  kind: ['거래구분', '구분', '거래종류', '유형'],
  /* 날짜와 시각이 두 칸으로 나뉜 은행이 있다 (신한·부산).
     at 목록에도 「거래시간」이 있지만 그건 한 칸에 다 든 은행용이라,
     같은 열이 둘 다로 잡히면 덮어쓰지 않는다 */
  time: ['거래시간', '시간', '거래시각', '시각', '처리시간', '거래시분초']
};
/* 「(₩)」과 「(원)」이 서로 다르게 걸리면 안 된다.
   ★ 「원」 자체는 안 지운다 — 「원장」「원화」 같은 말이 통째로 뜻이 바뀐다.
   「(원)」은 괄호가 지워져 「잔액원」이 되고 그 꼴이 목록에 있어서 이미 걸린다 */
function nz(s) {
  return String(s == null ? '' : s)
    .replace(/[\s()（）₩¥]/g, '')
    .toLowerCase();
}
/* ── 50차 ① · 괄호 안에 다른 말이 붙은 열 이름 ────────────────────
   우리은행은 「찾으신금액(출금)」·「맡기신금액(입금)」으로 준다.
   nz() 는 괄호 기호만 지우고 안의 글자는 남겨서 「찾으신금액출금」이 되고,
   COLSPEC 에 「찾으신금액」이 있는데도 안 걸렸다.
   ★ 반드시 두 단계다. 1단계에서 안 걸렸을 때만 괄호를 통째로 떼고 한 번 더 본다.
     처음부터 떼면 「잔액(외화)」가 「잔액」으로 걸려
     원화 잔액 자리에 외화 잔액이 들어간다 — 검산이 통째로 무너진다.
   ★ 「출금」·「입금」 같은 조각으로 부분 일치시키지 않는다.
     「출금가능잔액」이 출금액으로 잡힌다 (15차에 겪은 일) */
function nzOuter(s) {
  var t = String(s == null ? '' : s);
  t = t.replace(/[(（][^)）]*[)）]/g, ''); /* 괄호를 안째로 뗀다 */
  return nz(t);
}

/* ── 열은 이름으로 후보만 모으고, 판정은 그 열에 든 값이 한다 ──
   「일련번호」가 이름으로 걸려도 값이 날짜가 아니라 떨어진다.
   15차에서 가짜 「출금가능잔액」이 검산으로 떨어진 것과 같은 방식이다 */
function colLooks(grid, h, c, kind) {
  var seen = 0,
    ok = 0;
  for (var r = h + 1; r < grid.length && seen < 20; r++) {
    var v = (grid[r] || [])[c];
    if (v === '' || v == null) continue;
    /* ★ 95차 ②. 「-」는 「이 줄엔 이 금액이 없다」는 빈칸 표시다 (우리은행).
       이걸 「숫자가 아닌 값」으로 세면, 출금이 드문 계좌에서 출금 열이
       숫자 열로 안 보여 통째로 버려진다 — 실측 24건짜리에서 출금 6건
       (22,000,000원 포함)이 전부 0 이 됐다.
       ★ 우리은행만의 문제가 아니다. 한쪽 방향이 드문 계좌면 어느 은행이든
         터진다. 거래가 활발한 계좌는 우연히 잘 읽혀서 조용한 계좌에서만
         터지는 종류다 */
    if (/^[-‒–—―−]$/.test(String(v).trim())) continue;
    seen++;
    if (kind === 'date') {
      /* 엑셀은 날짜도 숫자로 들고 있어서, 일련번호 1·2·3 도 날짜로 읽힌다
         (1 → 1899년). 연도를 봐야 진짜 날짜인지 갈린다 */
      var t = toStamp(v);
      if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
        var y = +t.slice(0, 4);
        if (y >= 2000 && y <= 2099) ok++;
      }
    } else if (toNum(v) !== null) ok++;
  }
  return seen > 0 && ok * 2 >= seen; /* 절반 이상 */
}

/* 이름은 넓게, 판정은 값으로. 「일련번호」는 여기 안 걸린다 */
var DATE_WIDE = /(일시|일자|날짜|년월일)$|^거래일$/;

/* ── 51차 ① · 머리글은 멀쩡한데 그 아래가 통째로 빈 시트인가 ──────
   조회를 안 하고 「내려받기」만 누르면 은행이 이런 파일을 준다.
   ★ 이름만으로 가리므로 반드시 좁게 잡는다 —
     날짜 이름과 금액 이름이 둘 다 있는 줄만 머리글로 본다 */
function headerLooksReal(row) {
  var atW = COLSPEC.at.map(nz);
  var amtW = COLSPEC.inAmt.concat(COLSPEC.outAmt, COLSPEC.amount).map(nz);
  var 날짜 = false,
    금액 = false;
  for (var c = 0; c < row.length; c++) {
    var v = nz(row[c]);
    if (!v) continue;
    if (atW.indexOf(v) !== -1) 날짜 = true;
    if (amtW.indexOf(v) !== -1) 금액 = true;
  }
  return 날짜 && 금액;
}
function emptyAfterHeader(grid) {
  for (var r = 0; r < Math.min(grid.length, 60); r++) {
    if (!headerLooksReal(grid[r] || [])) continue;
    /* 이 줄 아래에 값이 한 칸이라도 있으면 빈 파일이 아니다 */
    for (var q = r + 1; q < grid.length; q++) {
      var 줄 = grid[q] || [];
      for (var q2 = 0; q2 < 줄.length; q2++) {
        if (줄[q2] !== '' && 줄[q2] != null) return false;
      }
    }
    return true;
  }
  return false;
}
function findHeader(grid) {
  var want = COLSPEC.at.map(nz);
  var r, c, row;
  /* 1) 이름이 정확히 맞고 값도 날짜인 줄 */
  for (r = 0; r < Math.min(grid.length, 60); r++) {
    row = grid[r] || [];
    for (c = 0; c < row.length; c++)
      if (want.indexOf(nz(row[c])) !== -1 && colLooks(grid, r, c, 'date')) return r;
  }
  /* 2) 못 찾으면 넓게 훑는다 — 값이 날짜인 열이 있어야 한다 */
  for (r = 0; r < Math.min(grid.length, 60); r++) {
    row = grid[r] || [];
    for (c = 0; c < row.length; c++)
      if (DATE_WIDE.test(nz(row[c])) && colLooks(grid, r, c, 'date')) return r;
  }
  return -1;
}

function mapColumns(grid, h) {
  var header = grid[h] || [];
  var map = {};
  /* 거래처·적요는 글자면 다 맞다. 값 검사를 하지 않는다 */
  var CHECK = { at: 'date', inAmt: 'num', outAmt: 'num', amount: 'num' };
  Object.keys(COLSPEC).forEach(function (key) {
    var want = COLSPEC[key].map(nz);
    /* 1단계 — 지금까지 그대로. 걸리면 그대로 쓴다 */
    for (var c = 0; c < header.length; c++) {
      if (want.indexOf(nz(header[c])) === -1) continue;
      if (CHECK[key] && !colLooks(grid, h, c, CHECK[key])) continue; /* 값이 아니면 다음 후보 */
      map[key] = c;
      return;
    }
    /* 2단계 — 1단계에서 아무것도 안 걸렸을 때만 괄호를 떼고 한 번 더 (50차 ①) */
    for (var c3 = 0; c3 < header.length; c3++) {
      var raw = header[c3];
      var 안쪽 = nzOuter(raw);
      if (!안쪽 || 안쪽 === nz(raw)) continue; /* 괄호가 없던 열은 볼 것도 없다 */
      if (want.indexOf(안쪽) === -1) continue;
      if (CHECK[key] && !colLooks(grid, h, c3, CHECK[key])) continue;
      map[key] = c3;
      return;
    }
  });
  /* 이름이 하나도 안 맞았을 때만, 값이 날짜인 열을 날짜로 쓴다 */
  if (map.at == null) {
    for (var c2 = 0; c2 < header.length; c2++) {
      if (DATE_WIDE.test(nz(header[c2])) && colLooks(grid, h, c2, 'date')) {
        map.at = c2;
        break;
      }
    }
  }
  /* ★ 거래처 열을 이름으로 찾았으면 여기는 아예 안 탄다 — 하나·국민은 그대로다 */
  if (map.payee == null) {
    var pk = pickPayeeCol(grid, h, map);
    if (pk) {
      map.payee = pk.col;
      map.payeePick = pk;
    }
  }
  /* ★ 65차 ①. 거래처 열을 못 잡았거나 적요 계열로 내려앉았으면
     채움율로 진짜 이름 열을 찾아본다.
     ★ 파일럿 1호 국민은행 실파일이 바로 「못 잡은」 쪽이었다 —
       「보낸분/받는분」은 열 이름 목록에 없고, pickPayeeCol 은 적요만 후보로 보는데
       적요는 값이 20가지뿐이라 1% 문턱(21.6가지)에도 못 미쳐 떨어진다.
       그래서 map.payee 가 아예 비고, buildRows 사다리가 적요로 내려가
       「스마트출금」이 거래처가 됐다. payeePick 이 있는 경우만 보면 여기를 못 잡는다.
     ★ 은행이 열 이름으로 알려준 파일(하나 「의뢰인/수취인」)은 여전히 안 건드린다 */
  if (map.payeePick || map.payee == null) {
    var nc = nameColByFill(grid, h, map, map.payee);
    if (nc) {
      if (map.memo == null) map.memo = map.payee;
      map.payee = nc.col;
      map.payeeFill = nc;
    }
  }
  return map;
}

/* 거래처 열이 아예 없는 은행이 있다. 신한·부산은 「적요」와 「내용」뿐인데
   「적요」에는 「인터넷뱅킹」처럼 거래 방법이 들어 있어
   이름 순서로 고르면 685건짜리 거래처가 하나 생긴다.
   그래서 목록을 늘리지 않고, 후보 열에 실제로 든 값이 몇 가지인지를 세서 고른다.
   15차에서 잔액 열을 검산으로 고른 것과 같은 방식이다 — 목록은 또 샌다 */
var PAYEE_MIN_RATIO = 0.01; /* 줄 수의 1%도 안 되면 거래처가 아니라 거래 방법이다 */
function pickPayeeCol(grid, h, map) {
  var header = grid[h] || [];
  var want = COLSPEC.memo.concat(COLSPEC.note).map(nz);
  var lines = 0,
    r,
    row;
  for (r = h + 1; r < grid.length; r++) {
    row = grid[r] || [];
    if (map.at != null) {
      if (/^\d{4}-\d{2}-\d{2}/.test(toStamp(row[map.at]))) lines++;
    } else if (row.join('').trim() !== '') lines++;
  }
  if (!lines) return null;
  var best = null;
  for (var c = 0; c < header.length; c++) {
    if (want.indexOf(nz(header[c])) === -1) continue;
    var seen = {},
      n = 0;
    for (r = h + 1; r < grid.length; r++) {
      var v = (grid[r] || [])[c];
      v = String(v == null ? '' : v).trim();
      if (v === '') continue; /* 빈 값은 세지 않는다 */
      if (!seen['#' + v]) {
        seen['#' + v] = 1;
        n++;
      }
    }
    if (n < lines * PAYEE_MIN_RATIO) continue;
    /* 같은 개수면 왼쪽 열이 남는다 — 부등호를 > 로 둔다 */
    if (!best || n > best.n) best = { col: c, n: n, name: String(header[c]).trim() };
  }
  return best;
}

/* ── 65차 ① · 이름 열 채움율로 거래처 열을 다시 본다 ──────────────────
   국민은행 파일은 「적요」가 거래처가 아니라 채널명이다 —
   전자금융 1,263 · 스마트출금 386 · 가맹입금 161 처럼 몇 마디 말이 파일을 덮는다.
   그래서 폰으로 보낸 돈이 전부 「스마트출금」 한 곳으로 묶여
   거래처 단위로 정하는 이 앱의 방식이 통째로 안 통했다 (파일럿 1호 급소).

   ★ 채널명 목록을 은행별로 들고 있지 않는다 — 목록은 늘 샌다.
     pickPayeeCol 이 열 이름 목록 대신 값 가짓수를 센 것과 같은 생각이다.
     대신 「이름 열은 거의 다 차 있고, 값이 여러 가지다」라는 성질로 고른다.

   ★ 실측이 정확히 갈린다 (검증방 측정 · 이 파일에서도 다시 쟀다)
       국민 「보낸분/받는분」  채움율 100%  (금액 있는 2,160줄 중 빈 칸 0)
       하나 「의뢰인/수취인」  채움율 27.9% (2,361줄 중 659)
     문턱을 어디에 두어도 안 헷갈린다. 0.8 로 둔다.

   ★ 은행이 열 이름으로 「여기가 거래처다」라고 알려준 파일은 안 건드린다 —
     하나은행이 그렇다. 적요 계열로 내려앉았을 때(pickPayeeCol)만 다시 본다.
     그래서 하나·신한·부산은 한 글자도 안 바뀐다 (지문으로 확인). */
var NAME_FILL_MIN = 0.8; /* 이름 열은 거의 다 차 있다 */
var NAME_MIN_LINES = 20; /* 줄이 너무 적으면 채움율이 뜻이 없다 */
var NAME_UNIQ_MAX = 0.95; /* 줄마다 다 다르면 일련번호다 */
function nameColByFill(grid, h, map, curCol) {
  var header = grid[h] || [];
  /* 이미 다른 자리로 쓰기로 한 열은 후보가 아니다.
     적요를 거래처로 다시 뽑으면 고치려던 그 문제로 되돌아간다 */
  var used = {};
  Object.keys(map).forEach(function (k) {
    if (typeof map[k] === 'number') used[map[k]] = 1;
  });
  var amtKeys = ['inAmt', 'outAmt', 'amount'];
  var wide = header.length,
    c,
    r,
    row,
    v;
  var fill = [],
    cnt = [],
    seen = [];
  for (c = 0; c < wide; c++) {
    fill.push(0);
    cnt.push(0);
    seen.push({});
  }
  /* 금액이 있는 줄만 센다 — 맨 아래 합계 줄·빈 줄이 채움율을 흐린다 */
  var lines = 0;
  for (r = h + 1; r < grid.length; r++) {
    row = grid[r] || [];
    var 금액있음 = false;
    for (var a = 0; a < amtKeys.length && !금액있음; a++) {
      var mc = map[amtKeys[a]];
      if (mc != null && toNum(row[mc])) 금액있음 = true;
    }
    if (!금액있음) continue;
    lines++;
    for (c = 0; c < wide; c++) {
      v = String(row[c] == null ? '' : row[c]).trim();
      if (v === '') continue;
      fill[c]++;
      if (!seen[c]['#' + v]) {
        seen[c]['#' + v] = 1;
        cnt[c]++;
      }
    }
  }
  if (lines < NAME_MIN_LINES) return null;
  var curN = curCol != null && cnt[curCol] != null ? cnt[curCol] : 0;
  var best = null;
  for (c = 0; c < wide; c++) {
    if (used[c]) continue;
    if (fill[c] < lines * NAME_FILL_MIN) continue;
    /* 숫자·날짜만 든 열은 이름이 아니다 — 부산은행 「번호」가 99.9% 차 있고
       값도 1,115가지라 이 걸음이 없으면 그 열이 거래처가 된다 */
    if (colLooks(grid, h, c, 'num') || colLooks(grid, h, c, 'date')) continue;
    /* 줄마다 값이 다 다르면 일련번호지 거래처가 아니다.
       거래처는 반드시 되풀이된다 — 그게 이 앱이 거래처로 정하게 하는 근거다.
       ★ 숫자가 아닌 일련번호(「No.0001」 같은)는 위 걸음에 안 걸린다 */
    if (fill[c] > 0 && cnt[c] > fill[c] * NAME_UNIQ_MAX) continue;
    /* 지금 쓰는 열보다 값이 여러 가지여야 한다.
       적으면 거래점·구분 같은 분류값이지 거래처가 아니다 */
    if (cnt[c] <= curN) continue;
    /* 같은 가짓수면 왼쪽 열이 남는다 — 부등호를 > 로 둔다 */
    if (!best || cnt[c] > best.n) {
      best = { col: c, n: cnt[c], fill: fill[c], lines: lines, name: String(header[c]).trim() };
    }
  }
  return best;
}

/* 시각이 따로 오는 은행을 위해. 「05:48:54」·「054854」·54854·0.2422·Date 를 다 받는다 */
function toClock(v) {
  if (v == null || v === '') return '';
  var p = function (n) {
    return (n < 10 ? '0' : '') + n;
  };
  var fmt = function (sec) {
    if (!isFinite(sec)) return '';
    sec = Math.round(sec);
    if (sec < 0 || sec >= 86400) return '';
    return p(Math.floor(sec / 3600)) + ':' + p(Math.floor(sec / 60) % 60) + ':' + p(sec % 60);
  };
  if (v instanceof Date) return p(v.getHours()) + ':' + p(v.getMinutes()) + ':' + p(v.getSeconds());
  if (typeof v === 'number') {
    if (v > 0 && v < 1) return fmt(v * 86400); /* 엑셀은 하루의 몇 분의 몇으로 담는다 */
    var i = Math.round(v);
    if (i < 0 || i > 235959) return '';
    return fmt(Math.floor(i / 10000) * 3600 + (Math.floor(i / 100) % 100) * 60 + (i % 100));
  }
  var t = String(v).trim();
  var m = t.match(/^(\d{1,2})\s*[:시]\s*(\d{1,2})(?:\s*[:분]\s*(\d{1,2}))?/);
  if (!m) m = t.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!m) return '';
  var hh = +m[1],
    mi = +m[2],
    ss = +(m[3] || 0);
  if (hh > 23 || mi > 59 || ss > 59) return '';
  return p(hh) + ':' + p(mi) + ':' + p(ss);
}

function toStamp(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) {
    var p = function (n) {
      return (n < 10 ? '0' : '') + n;
    };
    return (
      v.getFullYear() +
      '-' +
      p(v.getMonth() + 1) +
      '-' +
      p(v.getDate()) +
      ' ' +
      p(v.getHours()) +
      ':' +
      p(v.getMinutes()) +
      ':' +
      p(v.getSeconds())
    );
  }
  if (typeof v === 'number') {
    var ms = Math.round((v - 25569) * 86400 * 1000);
    var d = new Date(ms);
    return toStamp(new Date(d.getTime() + d.getTimezoneOffset() * 60000));
  }
  return String(v)
    .trim()
    .replace(/\./g, '-')
    .replace(/-(\d)(?!\d)/g, '-0$1');
}
function toNum(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Math.round(v);
  var t = String(v).replace(/[,\s원]/g, '');
  if (t === '' || t === '-') return null;
  var n = Number(t);
  return isFinite(n) ? Math.round(n) : null;
}

var IN_WORDS = ['입금', '이체입금', '입금이체', '받음', '수입'];
/* 「이체」「지급」「결제」는 방향을 말해주지 않는다 —
   카드사가 보내주는 정산 입금도 「지급」「결제」로 찍힌다 */
var OUT_WORDS = ['출금', '이체출금', '출금이체', '송금', '보냄', '지출'];

/* 거래구분 칸이 방향을 말해주는 경우 */
function dirFromKind(v) {
  var t = nz(v);
  if (!t) return 0;
  for (var i = 0; i < OUT_WORDS.length; i++) if (t.indexOf(nz(OUT_WORDS[i])) !== -1) return -1;
  for (var j = 0; j < IN_WORDS.length; j++) if (t.indexOf(nz(IN_WORDS[j])) !== -1) return 1;
  return 0;
}

/* 부호가 없으면 잔액이 어느 쪽으로 움직였는지로 정한다.
   잔액은 은행이 찍은 사실이고 거래구분은 말이라, 사실을 먼저 본다.
   둘이 어긋나거나 둘 다 없으면 비워둔 채 확인 카드로 넘긴다 — 추측하지 않는다 */
function resolveSigns(rows) {
  var sorted = rows.slice().sort(function (a, b) {
    return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
  });
  var prev = null;
  sorted.forEach(function (r) {
    if (r.amount === null && r.mag != null) {
      if (prev !== null) {
        var d = r.balance - prev;
        if (Math.abs(d) === r.mag) r.amount = d; /* 잔액이 말한 대로 */
        /* 잔액과 안 맞으면 거래구분이 뭐라 하든 확인 카드로 보낸다 */
      } else if (r.kindDir) {
        r.amount = r.kindDir * r.mag; /* 앞 잔액이 없을 때만 */
      }
    }
    prev = r.balance;
  });
}

/* 헤더 후보 — 못 읽는 파일일 때 사장님께 보여줄 열 이름 */
function headerNames(grid, h) {
  var row = h >= 0 ? grid[h] : null;
  if (!row) {
    for (var r = 0; r < Math.min(grid.length, 30); r++) {
      var g = grid[r] || [];
      var filled = g.filter(function (v) {
        return String(v).trim() !== '';
      });
      if (filled.length >= 3) {
        row = g;
        break;
      }
    }
  }
  if (!row) return [];
  return row
    .map(function (v) {
      return String(v).trim();
    })
    .filter(function (v) {
      return v !== '';
    })
    .slice(0, 12);
}

/* 잔액 열은 은행마다 이름이 다르다. 목록을 늘리는 방식은 계속 샌다 —
   은행이 몇 개인지 우리는 모른다. 그래서 「잔액/잔고로 끝나는 열」을 전부 후보로 잡고,
   검산이 맞는 열을 고른다. 「지급가능잔액」「출금가능잔액」처럼 뜻이 다른 열은
   잔액 사슬이 안 이어져서 저절로 떨어진다 */
var BAL_MAX_TRY = 5;
function balanceCandidates(header) {
  var out = [];
  for (var c = 0; c < header.length; c++) {
    if (/(잔액|잔고)(원|₩)?$/.test(nz(header[c]))) out.push(c);
  }
  return out;
}

/* 잔액 열 하나를 정해두고 그 시트를 읽는다 */
function buildRows(grid, h, map, balCol) {
  var split = map.inAmt != null || map.outAmt != null;
  /* 이 파일이 부호를 쓰는지 먼저 본다.
     한 건이라도 음수가 있으면 양수는 곧 입금이다 — 거래구분을 볼 필요가 없다 */
  var signed = false;
  if (!split) {
    for (var s = h + 1; s < grid.length && !signed; s++) {
      var sv = (grid[s] || [])[map.amount];
      if (toNum(sv) < 0 || /^\s*[-−]/.test(String(sv))) signed = true;
    }
  }
  var rows = [],
    needSign = false;
  /* ★ 113차 ②마. 「파싱 누락」을 앱이 스스로 센다.
     ★ 날짜가 없는 줄은 누락이 아니다 — 머리말·안내문·맨 아래 합계 행이 그렇다.
       날짜는 읽혔는데 잔액을 못 읽어 못 세운 줄만 센다. 그게 진짜 흘린 거래다 */
  var 버린 = 0;
  for (var r = h + 1; r < grid.length; r++) {
    var row = grid[r] || [];
    var at = toStamp(row[map.at]);
    /* 날짜가 없는 줄은 여기서 빠진다 — 맨 아래 합계 행이 그렇다 */
    if (!/^\d{4}-\d{2}-\d{2}/.test(at)) continue;
    /* 시각이 따로 온 은행이면 붙인다. 안 붙이면 같은 날 거래 순서가 뒤섞인다 */
    if (
      map.time != null &&
      map.time !== map.at &&
      (at.length <= 10 || at.slice(11, 19) === '00:00:00')
    ) {
      var ck = toClock(row[map.time]);
      if (ck) at = at.slice(0, 10) + ' ' + ck;
    }
    var bal = toNum(row[balCol]);
    if (bal === null) {
      버린++;
      continue;
    } /* ★ 113차 ②마 */
    var amt = null,
      mag = null,
      kd = 0;
    if (split) {
      var inA = map.inAmt != null ? toNum(row[map.inAmt]) : null;
      var outA = map.outAmt != null ? toNum(row[map.outAmt]) : null;
      /* ★ 95차 ③. 입금·출금이 칸으로 갈려 있으면 방향은 칸이 말해준다.
         값에 붙은 부호는 방향을 한 번 더 말하는 것일 뿐이다
         (케이뱅크는 출금액 칸에 「- 220,008」로 준다).
         그대로 뒤집으면 부호가 두 번 뒤집혀 출금이 입금이 된다 —
         실측 128건에서 43건이 그랬다.
         그래서 크기만 취하고 방향은 칸으로만 정한다 */
      amt = inA ? Math.abs(inA) : outA ? -Math.abs(outA) : null;
    } else {
      /* 한 열에 부호로 들어오는 형식 */
      var v = toNum(row[map.amount]);
      if (v !== null && v !== 0) {
        var raw = String(row[map.amount]);
        if (v < 0 || /^\s*[-−]/.test(raw)) amt = -Math.abs(v);
        else if (signed) amt = Math.abs(v); /* 부호를 쓰는 파일이면 양수는 입금 */
        else {
          /* 방향은 잔액으로 먼저 본다 (resolveSigns).
             거래구분은 앞 잔액이 없을 때만 쓰는 예비 근거다 */
          mag = Math.abs(v);
          kd = map.kind != null ? dirFromKind(row[map.kind]) : 0;
          needSign = true;
        }
      }
    }
    var payee =
      String(row[map.payee] != null ? row[map.payee] : '').trim() ||
      String(row[map.memo] != null ? row[map.memo] : '').trim() ||
      String(row[map.note] != null ? row[map.note] : '').trim() ||
      '(이름 없음)';
    /* ★ 81차 ③. 적요를 담는 칸을 하나 더한다.
       추천이 거래처 이름만 봐서 「적요=급여 / 수취인=직원A」 같은 줄을 못 잡았다.
       ★ 기존 일곱 칸은 한 글자도 안 바꾼다 — 칸을 더하기만 한다.
         파서 지문은 rows·open·close·breaks·moved·rawnames 와 달별 합계만 재고
         rawnames 는 r.payee 가짓수라, 칸이 늘어도 그 값들은 안 움직인다.
       ★ 거래처 이름이 비었을 때 적요를 대신 쓰는 위 사다리는 그대로 둔다 */
    rows.push({
      at: at,
      payee: payee,
      amount: amt,
      mag: mag,
      kindDir: kd,
      balance: bal,
      excelRow: r + 1,
      memo: String(row[map.memo] != null ? row[map.memo] : '').trim()
    });
  }
  if (needSign) resolveSigns(rows);
  return { rows: rows, oneCol: !split, dropped: 버린 }; /* ★ 113차 ②마 */
}

/* ★ 113차 ①. 조회 기간을 찾을 자리만 글자로 뽑는다 —
   머리글 위 전부와, 머리글 아래 몇 줄(우리 이메일 HTML 은 기간이 표 안에 있다).
   ★ 거래 줄 전체를 들고 있지 않는다. 기간은 거기 없다 */
function gridHead(grid, h) {
  var out = [],
    끝 = Math.min(grid.length, Math.max(h, 0) + 4);
  for (var i = 0; i < 끝; i++) {
    var c = (grid[i] || [])
      .map(function (x) {
        return String(x == null ? '' : x).trim();
      })
      .filter(function (x) {
        return x;
      });
    if (c.length) out.push(c.join(' '));
  }
  return out;
}
/* ★ 113차 ①. 조회 기간은 거래 표와 다른 곳에 있을 수 있다.
   우리 이메일 HTML 이 그렇다 — 기간·계좌·예금주가 표 하나에 있고
   거래 줄은 다른 표에 있다. SheetJS 는 표마다 시트를 만들므로,
   거래를 뽑은 시트만 보면 기간을 영영 못 찾는다. 시트를 다 훑는다.
   ★ 시트마다 앞 30줄만 본다. 기간은 늘 머리에 있고, 거래 줄까지 들고 있을 까닭이 없다 */
function headLinesAll(wb) {
  var out = [];
  for (var i = 0; i < wb.SheetNames.length; i++) {
    var g = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[i]], {
      header: 1,
      raw: false,
      defval: ''
    });
    for (var r = 0; r < Math.min(30, g.length); r++) {
      var c = (g[r] || [])
        .map(function (x) {
          return String(x == null ? '' : x).trim();
        })
        .filter(function (x) {
          return x;
        });
      if (c.length) out.push(c.join(' '));
    }
  }
  return out;
}
function extractRows(wb) {
  var seen = [];
  /* ★ 50차 ③. 머리글은 다 맞는데 줄이 0건인 파일을 가려낸다 */
  var 형식맞음 = false;
  /* 머리글 아래에 줄이 한 개도 없는가 — 조회를 안 하고 내려받으면 그렇게 나온다 */
  var 빈표 = false;
  for (var i = 0; i < wb.SheetNames.length; i++) {
    var grid = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[i]], {
      header: 1,
      raw: true,
      defval: ''
    });
    var h = findHeader(grid);
    var names = headerNames(grid, h);
    if (names.length) seen = seen.concat(names);
    /* ★ 51차 ①. 줄이 0건인 파일은 findHeader 가 머리글조차 못 알아본다 —
       머리글인지 아닌지를 아랫줄의 값으로 가리기 때문이다.
       그러면 「날짜 열이 없다」로 끝나는데, 열은 멀쩡하고 줄만 없는 것이다.
       ★ 50차에는 「시트에 값이 든 줄이 하나뿐」으로 좁게 잡아서
         진짜 은행 파일에 안 걸렸다 — 머리글 위에 안내 줄이 다섯이나 있다.
       ★ 넓히는 쪽이 더 위험하다. 머리글을 헐겁게 잡으면
         「열 이름이 다르다」가 「거래가 없다」로 둔갑하고,
         사장님이 있는 거래내역을 두고 다시 받으러 가신다. 지금보다 나쁘다.
       ★ 그래서 머리글로 인정하는 조건을 이름 세 개가 아니라
         「날짜 이름과 금액 이름이 둘 다 있는 줄」로 못 박는다.
         그 아래에 값이 든 줄이 하나라도 있으면 empty 가 아니다 — 읽어보고 판단한다 */
    if (h < 0 && emptyAfterHeader(grid)) {
      빈표 = true;
      continue;
    }
    if (h < 0) continue;
    var map = mapColumns(grid, h);
    if (map.at == null) continue;
    var split = map.inAmt != null || map.outAmt != null;
    if (!split && map.amount == null) continue;

    var cand = balanceCandidates(grid[h]);
    if (!cand.length) continue; /* 잔액이 없으면 읽지 않는다 */
    형식맞음 = true; /* 여기까지 왔으면 열은 다 있다. 남은 건 줄이 있느냐뿐 */
    if (cand.length > BAL_MAX_TRY) {
      console.warn('잔액 후보가 ' + cand.length + '개입니다. 앞 ' + BAL_MAX_TRY + '개만 봅니다.');
      cand = cand.slice(0, BAL_MAX_TRY);
    }

    var best = null;
    for (var k = 0; k < cand.length; k++) {
      var built = buildRows(grid, h, map, cand[k]);
      if (!built.rows.length) continue;
      /* 후보가 하나뿐이면 굳이 재보지 않는다 — 검산은 원래 자리에서 돈다 */
      if (cand.length === 1) {
        best = { built: built, col: cand[k], breaks: null };
        break;
      }
      var res = orderAndVerify(
        built.rows.map(function (x) {
          return {
            at: x.at,
            payee: x.payee,
            amount: x.amount,
            mag: x.mag,
            kindDir: x.kindDir,
            balance: x.balance,
            excelRow: x.excelRow
          };
        })
      );
      var n = res.breaks.length;
      if (!best || n < best.breaks) best = { built: built, col: cand[k], breaks: n };
      if (n === 0) break; /* 더 볼 것 없다 */
    }
    if (!best) continue;

    if (best.breaks !== null && best.breaks > 0) {
      console.warn(
        '잔액 후보 ' +
          cand.length +
          '개 중 가장 적게 어긋난 열을 골랐습니다 (' +
          best.breaks +
          '건).'
      );
    }
    return {
      rows: best.built.rows,
      sheet: wb.SheetNames[i],
      header: h + 1,
      oneCol: best.built.oneCol,
      /* ★ 113차 ①. 조회 기간은 머리글 위(엑셀)나 다른 표(우리 이메일 HTML)에 있다.
                그래서 이 시트만이 아니라 시트를 다 훑은 것을 넘긴다 */
      headLines: gridHead(grid, h).concat(headLinesAll(wb)),
      dropped: best.built.dropped /* ★ 113차 ②마 */,
      bankHint: bankFromHead(grid, h) /* 39차 4번 */,
      /* ★ 65차 ①. 채움율로 옮겨 잡았으면 그쪽 이름이 이긴다 —
                「어느 열을 거래처로 봤는가」는 검증할 때 첫 번째로 볼 값이다 */
      payeeName: map.payeeFill ? map.payeeFill.name : map.payeePick ? map.payeePick.name : null,
      payeeKinds: map.payeeFill ? map.payeeFill.n : map.payeePick ? map.payeePick.n : null,
      payeeFill: map.payeeFill
        ? Math.round((map.payeeFill.fill / map.payeeFill.lines) * 1000) / 10
        : null,
      timeName:
        map.time != null && map.time !== map.at ? String(grid[h][map.time] || '').trim() : null,
      balName: String(grid[h][best.col] || '').trim(),
      balTried: cand.length
    };
  }
  var uniq = [],
    m = {};
  seen.forEach(function (v) {
    if (!m[v]) {
      m[v] = 1;
      uniq.push(v);
    }
  });
  /* 왜 못 읽었는지를 사용 기록에 남긴다. 열 이름만 보고 가른다 —
     파일 이름도 거래처도 금액도 안 남는다 */
  var why = 'nodate';
  for (var z = 0; z < uniq.length; z++) {
    if (DATE_WIDE.test(nz(uniq[z])) || nz(uniq[z]).indexOf('거래일') !== -1) {
      why = 'noamt';
      break;
    }
  }
  if (!uniq.length) why = 'norows';
  /* ★ 50차 ③. 열이 다 있는데 못 읽었다면 줄이 0건인 것이다.
     이건 제대로 된 .xlsx 라, 「엑셀로 다시 받으세요」는 거짓말이 된다 */
  if (형식맞음 || 빈표) why = 'empty';
  return { fail: true, found: uniq.slice(0, 12), why: why };
}
