/* ── 정렬 + 검산 ──
   연번(NO)은 쓰지 않는다. 시각과 반대로 매겨진 구간이 있기 때문. */
/* 이 거래가 잔액을 실제로 움직인 값. 확인 안 된 차액(residual)까지 합쳐서 본다 */
function amtOf(r) {
  return r.amount === null ? null : r.amount + (r.residual || 0);
}

/* 몇 건의 순서를 바꿔가며 앞 잔액 ± 금액 = 뒤 잔액이 이어지는 배열을 찾는다.
   그리디로는 놓치는 경우가 있어 되돌아가며 전부 시도한다 (최대 6건 = 720가지) */
function chainOrder(list, start) {
  var n = list.length, used = new Array(n), out = new Array(n);
  function step(k, run) {
    if (k === n) return true;
    for (var i = 0; i < n; i++) {
      if (used[i]) continue;
      var a = amtOf(list[i]);
      if (a === null || list[i].balance !== run + a) continue;
      used[i] = true; out[k] = list[i];
      if (step(k + 1, list[i].balance)) return true;
      used[i] = false;
    }
    return false;
  }
  return step(0, start) ? out.slice() : null;
}

var FIX_WIN  = 6;    /* 이보다 넓은 구간은 건드리지 않는다 — 경우의 수가 폭발한다 */
var FIX_SPAN = 60;   /* 구간 안 시각 차이가 이 초를 넘으면 건드리지 않는다 */

function secOf(at) {
  var s = Date.UTC(+at.slice(0, 4), +at.slice(5, 7) - 1, +at.slice(8, 10)) / 1000;
  if (at.length >= 19) {
    s += (+at.slice(11, 13)) * 3600 + (+at.slice(14, 16)) * 60 + (+at.slice(17, 19));
  }
  return s;
}

/* 잔액이 끊긴 자리에서 붙어 있는 몇 건의 순서를 바꿔본다.
   은행 파일은 같은 초에 여러 건이거나 1초 차이로 붙은 거래의 순서가 뒤바뀌어 있다 */
function repairRun(rows, opening) {
  var out = [], run = opening, moved = 0, i = 0;
  while (i < rows.length) {
    var a = amtOf(rows[i]);
    if (a !== null && rows[i].balance === run + a) {
      out.push(rows[i]); run = rows[i].balance; i++; continue;
    }
    var done = false;
    for (var w = 2; w <= FIX_WIN && i + w <= rows.length; w++) {
      var win = rows.slice(i, i + w);
      if (secOf(win[w - 1].at) - secOf(win[0].at) > FIX_SPAN) break;
      var ord = chainOrder(win, run);
      if (!ord) continue;
      var changed = false;
      for (var t = 0; t < w; t++) {
        if (ord[t] !== win[t]) changed = true;
        out.push(ord[t]);
      }
      if (changed) moved += w;
      run = ord[w - 1].balance;
      i += w; done = true; break;
    }
    if (!done) { out.push(rows[i]); run = rows[i].balance; i++; }
  }
  return { rows: out, moved: moved };
}

function orderAndVerify(raw) {
  var rows = raw.slice().sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });

  /* 첫 시각 묶음에서 시작 잔액을 잡는다 */
  var end = 1;
  while (end < rows.length && rows[end].at === rows[0].at) end++;
  var head = rows.slice(0, end), opening = null;
  for (var c = 0; c < head.length; c++) {
    var a0 = amtOf(head[c]);
    if (a0 === null) continue;
    var guess = head[c].balance - a0;
    if (chainOrder(head, guess)) { opening = guess; break; }
  }
  if (opening === null) opening = rows[0].balance - (amtOf(rows[0]) || 0);

  var fixed = repairRun(rows, opening);
  var out = fixed.rows;

  var breaks = [];
  var prev = opening;
  for (var k = 0; k < out.length; k++) {
    var row = out[k], a = amtOf(row);
    if (a === null) {
      breaks.push({ row: row, prev: prev, gap: row.balance - prev,
                    why: '금액 칸이 비어 있습니다' });
    } else if (row.balance !== prev + a) {
      breaks.push({ row: row, prev: prev, gap: row.balance - (prev + a),
                    why: '앞 잔액에 금액을 더한 값과 다릅니다' });
    }
    prev = row.balance;
  }
  return { rows: out, opening: opening, closing: prev,
           breaks: breaks, moved: fixed.moved };
}

/* ── 113차 ① · 파일에 적힌 조회 기간 ──────────────────────────────────
   지금까지 앱은 자료의 범위를 첫 거래일과 마지막 거래일로 잡았다.
   그런데 은행 파일에는 「조회기간」이 따로 적혀 있다.

     조회기간   2026.05.01 ~ 2026.08.21
     첫 거래    2026.05.03
     마지막 거래 2026.08.19

   앱이 보던 범위는 5월 3일 ~ 8월 19일이라 앞뒤로 닷새가 빠졌다.
   그 닷새는 「거래가 없던 날」이지 「자료가 없는 날」이 아니다. 둘은 다르다 —
   지출 평균의 분모(표본 날 수)가 달라져 예측값이 바뀐다.

   ★ 핵심은 「날짜가 적혀 있다」와 「그 기간의 내역이 확인된다」를 가르는 것이다.
     날짜만 보고 빈 날을 0원으로 확정하지 않는다 (②).

   ★ 실물 아홉을 열어 확인한 것 (2026-09-20 검증방) —
       「조회기간」은 붙여 쓴다. 띄어쓰기가 없다
       날짜는 세 모양이 다 온다
         케이뱅크·카카오·우리 HTML   2024.01.18 ~ 2026.09.18   점
         우리 PDF                  2024-01-01 ~ 2026-09-18   하이픈
         토스                      2026년 09월 18일 ~ ...     한글
       엑셀(bank.xlsx)에는 조회기간이 아예 없다 → ④ 갈래로 보낸다
   ★ pdf.js 는 양식에 따라 글자를 한 자씩 내놓는다 — 「조 회 기 간」으로 온다.
     그래서 공백을 걷어내고 본다. 걷어내면 금액의 쉼표도 붙지만 날짜만 뽑으므로 상관없다 */
var ASK_LABEL = /(조회기간|거래기간|조회대상기간|조회하신기간)/;
function askFlat(s) {
  return String(s == null ? '' : s).replace(/[\s 　]+/g, '');
}
/* 날짜 세 모양을 한 자로 읽는다. 달·날이 말이 안 되면 버린다 */
function askDates(t, 몇) {
  var out = [], m;
  var re = /(20\d{2})(?:[.\-\/](\d{1,2})[.\-\/](\d{1,2})|년(\d{1,2})월(\d{1,2})일)/g;
  while ((m = re.exec(t))) {
    var mo = +(m[2] || m[4]), d = +(m[3] || m[5]);
    if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) continue;
    out.push(m[1] + '-' + (mo < 10 ? '0' : '') + mo + '-' + (d < 10 ? '0' : '') + d);
    if (out.length >= (몇 || 4)) break;
  }
  return out;
}
/* 줄 묶음에서 조회 기간 하나를 찾는다. 못 찾으면 null —
   ★ 라벨 뒤부터만 읽는다. 앞에 있는 신규일·발급일을 기간으로 삼으면 안 된다
     (케이뱅크는 「신규일 2021.07.14 조회기간 2024.01.18 ~ 2026.09.18」 한 줄이다) */
function askedRange(lines) {
  for (var i = 0; i < (lines || []).length; i++) {
    var t = askFlat(lines[i]);
    if (!ASK_LABEL.test(t)) continue;
    var 뒤 = t.slice(t.search(ASK_LABEL)) + askFlat(lines[i + 1] || '');
    var d = askDates(뒤, 2);
    if (d.length < 2 || d[0] > d[1]) continue;
    /* 터무니없이 긴 기간은 라벨을 잘못 짚은 것이다 */
    if (dayNum(d[1]) - dayNum(d[0]) > 4000) continue;
    return { from: d[0], to: d[1] };
  }
  return null;
}
/* ── 113차 ② · 완전성 근거 ────────────────────────────────────────
   조회 기간이 적혀 있다는 것만으로 빈 날짜를 0원으로 확정하지 않는다.
   파일 형식마다 아래를 확인한다.

     가 계좌 구분과 조회 기간이 같이 적혀 있는가
     나 전체 입출금 내역인가 — 입금만·출금만 받은 파일이 아닌가
     다 쪽 누락이 없는가
     라 파일에 적힌 합계가 실제로 읽어낸 것과 맞는가
     마 파싱 누락이 없는가 — 날짜는 읽혔는데 못 세운 줄이 몇인가

   ★ 「필터 표기가 없다」는 사실은 근거가 안 된다. 필터를 걸었다는 표시가 없는
     파일이 훨씬 많다. 그래서 나 는 「없음 → null(모름)」이지 true 가 아니다.
     파일이 스스로 「거래내역증명서」라고 말할 때만 true 다.
   ★ 잔액 사슬이 맞는다는 사실 하나로도 완전하다고 하지 않는다.
     앞뒤가 통째로 잘린 파일도 그 안에서는 사슬이 맞는다. 그래서 사슬은 근거에 안 넣었다.
   ★ 다 는 「n/m」 글자만 믿으면 안 된다 — 토스 1쪽짜리에서 「1/11」이 잡혔다.
     m 이 실제 쪽 수와 같을 때만 근거로 쓴다.
   ★ 라 는 우리 HTML 에서 빼야 한다. 본문에
     「거래건수가 999건을 초과하는 경우 영업점을 방문해 주세요」가 있어
     글자로 찾으면 이 안내문이 건수로 잡힌다. 실제 건수가 아니다 —
     그래서 건수는 아예 안 세고, 합계 표기가 있는 형식에서만 라 를 본다 */
/* ★★ 113차 보류분 (2026-09-20 GPT 최종). 이 상수는 지금 아무도 안 쓴다 ★★
   rangeEvid 의 「나」가 이것을 근거로 삼고 있었는데, 제목 낱말만으로는
   「고른 기간의 모든 입출금을 담았는가」를 알 수 없다는 판단으로 그 길을 닫았다.
   ★ 지우지 않고 남겨둔다 — 나중에 「이 형식은 내보내기 설정상 전체가 담긴다」가
     확인되는 날, 그 형식을 가려내는 자리가 여기다.
   ★ 다시 쓰게 되는 날 반드시 같이 볼 것 —
     제목이 아니라 「내보내기 설정이 확인됐는가」로 판단해야 한다.
     아래 목록은 실물에서 본 제목일 뿐 완전성의 근거가 아니다.
   ★ 이 목록을 도로 연결하기 전에는 아래 주석도 같이 고쳐야 한다.

   파일이 스스로 「이건 그 계좌의 거래내역이다」라고 말하는 표기.
   ★ 실물에서 직접 확인한 것만 넣는다 (2026-09-20) —
       거래내역증명·예금거래실적증명   케이뱅크 PDF
       예금거래실적증명·거래실적증명   우리 PDF
       거래내역서                     카카오뱅크 PDF
     안 열어본 은행의 표기를 짐작으로 넣지 않는다 (46차 ①의 태도 그대로).
   ★ 113차 수정 셋. 「계좌거래내역」과 「거래내역조회」를 뺀다.
     우리 이메일 HTML 둘이 이 두 낱말로 「전체 내역」이 되어 조회 기간을 쓰고 있었다.
     그런데 이건 문서 종류·조회 화면을 가리키는 제목일 뿐이다 — 전체 입출금인지,
     모든 거래처가 들어 있는지, 쪽이 다 왔는지까지 말해주는 말이 아니다.
     확인된 것은 계좌와 조회 기간 둘뿐이었다.
     ★ 「계좌거래내역」만 빼면 「거래내역조회」가 같은 일을 그대로 한다 (실측).
       한 낱말만 빼는 것은 고친 것이 아니다.
   ★ 파싱 누락 0건도 완전성 근거가 아니다. 그건 「받은 줄을 다 처리했다」는 뜻이지
     「원본이 다 왔다」는 뜻이 아니다. 앞뒤가 잘린 파일도 받은 줄은 다 처리된다.
   ★ 「거래내역서」는 남긴다 — 카카오 실물에서 확인한 표기다.
     토스도 이 낱말로 계속 걸리지만 토스는 쪽 근거에서 먼저 걸러진다.
   ★ 아래 셋(입출금거래내역·거래명세표·입출금내역조회)은 아직 실물로 확인 못 했다.
     실물 아홉 가운데 이 셋에 걸리는 파일은 없다 (암호가 걸린 국민·신한 빼고 실측).
     확인되면 남기고, 아니면 같은 잣대로 빼야 한다 — 남겨둔 빚이다 */
var FULL_DOC = /(거래내역증명|예금거래실적증명|거래실적증명|입출금거래내역|거래명세표|입출금내역조회|거래내역서)/;
/* 「일부만 받았다」고 파일이 말하는 표기. 이쪽이 먼저 이긴다 —
   「입금 거래내역서」처럼 제목에 갈래가 박힌 파일이 FULL_DOC 로 새지 않게 한다 */
var PART_DOC = /(입금만|출금만|입금내역만|출금내역만|입금거래내역|출금거래내역|입금내역서|출금내역서|거래종류[:：]?(입금|출금)|조회구분[:：]?(입금|출금))/;
var ACCT_LABEL = /(계좌번호|계좌구분|출금계좌|입출금계좌)/;
function rangeEvid(lines, opt) {
  var 글 = (lines || []).map(askFlat).join('\n');
  var o = opt || {};
  var e = { acct: null, all: null, pages: null, totals: null, parsed: null };
  /* 가 — 계좌와 조회 기간이 같이 적혀 있는가 */
  e.acct = (ACCT_LABEL.test(글) && ASK_LABEL.test(글)) ? true : false;
  /* 나 — 「일부만 받았다」고 파일이 말할 때만 false. 그 밖에는 모름(null)이다.
     ★ 113차 보류분 (2026-09-20 GPT 최종). 제목 낱말(FULL_DOC)을 근거로 안 쓴다.
       은행이 발급한 증명서라는 사실은 문서의 출처를 뒷받침하지만,
       고른 기간의 모든 입출금을 담았는지까지는 말해주지 않는다.
       「증명서냐 조회 화면이냐」라는 제목 차이로 채택 여부를 나누지 않는다.
     ★ 그래서 나 는 이제 false 아니면 null 이다. true 가 되는 길이 없고,
       rangeVerdict 의 e.all !== true 에서 모든 형식이 거래일 기준으로 떨어진다.
       조회 기간을 읽는 일(askedRange)과 range.asked 보존은 그대로다 —
       나중에 내보내기 설정이 확인된 형식이 생기면 그 값으로 확장하면 된다.
     ★ PART_DOC 은 그대로 쓴다. 「입금만」처럼 파일이 스스로 일부라고 말하는 것은
       확인된 사실이고, 그때는 조회 기간이 있어도 쓰면 안 된다 */
  e.all = PART_DOC.test(글) ? false : null;
  /* 다 — 쪽 꼬리가 실제 쪽 수와 맞을 때만 */
  if (o.pages != null) {
    e.pages = (o.pageFoot != null) ? (o.pageFoot === o.pages) : null;
  }
  /* 라 — 파일에 적힌 합계와 우리가 뽑은 합계 (pdfTotalsOk 가 null 이면 표기가 없다) */
  if (o.totals !== undefined) e.totals = o.totals;
  /* 마 — 파싱 누락. 재는 자가 형식마다 다르다.
     ★ 엑셀·HTML 은 한 거래가 한 줄이다. 날짜는 읽혔는데 잔액을 못 읽어
       못 세운 줄이 곧 흘린 거래다 (dropped).
     ★ PDF 는 한 거래가 여러 줄에 걸친 양식이 있다 — 케이뱅크는 날짜 줄과
       시각 줄이 따로 온다. 그 줄들은 잔액이 없는 것이 정상이라 dropped 로 세면
       멀쩡한 파일이 전부 「누락 있음」이 된다 (실측: 128건·15건 둘 다 그랬다).
       그래서 PDF 는 다른 자를 쓴다 — 표를 가르는 방법을 여럿 시도해 보고,
       고른 것이 가장 많이 뽑은 것과 같은지 본다. 다른 방법이 더 많이 뽑았다면
       고른 쪽이 흘린 것이다 (lost). 이 값은 92-2차 ②가 이미 세고 있던 것이다 */
  if (o.lost != null) e.parsed = (o.lost === 0);
  else if (o.dropped != null) e.parsed = (o.dropped === 0);
  return e;
}
/* 근거를 종합한다. 애매하면 확장하지 않는 쪽이 기본값이다 (②) */
function rangeVerdict(asked, e, 밖) {
  if (!asked) return { ok: false, why: '파일에 조회 기간이 적혀 있지 않습니다' };
  if (e.all === false) return { ok: false, why: '일부 거래만 받은 파일로 보입니다' };
  /* ★ 113차 수정 둘 ①. 「쪽이 이어지지 않습니다」라고 쓰지 않는다.
     e.pages 가 false 가 되는 길은 둘이다 — 정말로 쪽이 빠졌거나,
     쪽 꼬리를 잘못 읽었거나. 토스 1쪽짜리에서 「1/11」이 잡힌 것이 뒤쪽이다.
     둘을 가를 방법이 없으니 확인한 것만 적는다 — 「기간을 계산에 적용하지 못했다」.
     ★ 「거래일 기준으로 돌아갔으니 안전하다」고도 안 적는다. 오차의 방향은 모른다.
     ★ 쪽 꼬리를 제대로 읽는 것(파서)은 이 회차가 아니다. 문구만 고친다.
     ★ 문장: 는 통째로 쓰는 완성문이다 — 아래 넷은 실제로 확인한 것이라
       지금까지처럼 사유 조각으로 두고 rangeNotes 가 뒷말을 붙인다 */
  if (e.pages === false) {
    return { ok: false, why: '쪽 표기를 확인하지 못했습니다',
             문장: '파일의 조회 기간을 계산에 적용하지 못해 거래일 기준으로 계산했습니다.' };
  }
  if (e.totals === false) return { ok: false, why: '파일에 적힌 합계와 읽은 합계가 다릅니다' };
  if (e.parsed === false) return { ok: false, why: '읽지 못한 거래 줄이 있습니다' };
  /* 규칙 4 — 조회 기간 밖의 거래가 나오면 버리지 않고, 기간 인식을 접는다 */
  if (밖 > 0) return { ok: false, why: '조회 기간 밖의 거래가 있습니다' };
  if (e.acct !== true) return { ok: false, why: '계좌와 조회 기간이 같이 적혀 있지 않습니다' };
  /* ★ 113차 수정 셋. 조회 기간은 읽었는데 전체 내역인지를 못 밝힌 갈래다.
     「확인했지만」과 「확인하지 못해」를 한 문장에 정확히 갈라 적는다 —
     조회 기간을 아예 못 읽은 갈래(엑셀)와 다른 말이어야 한다.
     ★ 읽어낸 조회 기간은 버리지 않는다. makeRange 가 range.asked 에 그대로 담아
       돌려주므로, 나중에 내보내기 설정이 확인되면 그때 그 값으로 확장하면 된다 */
  if (e.all !== true) {
    return { ok: false, why: '전체 입출금 내역인지 확인할 수 없습니다',
             문장: '조회 기간은 확인했지만 전체 거래내역인지 확인하지 못해 ' +
                   '거래일 기준으로 계산했습니다.' };
  }
  if (e.parsed !== true) return { ok: false, why: '읽지 못한 줄이 있는지 확인할 수 없습니다' };
  return { ok: true, why: '조회 기간·계좌가 같이 적혀 있고 읽지 못한 줄이 없습니다' };
}
/* 파일 하나의 자료 범위를 정한다. rows 는 이미 검산까지 끝난 줄들이다.
   ★ 조회 기간을 읽었다고 마지막 거래의 잔액이 종료일까지 유효하다고 늘리지 않는다 —
     여기서 정하는 것은 「지출 표본으로 쓸 수 있는 날」이지 잔액이 아니다 */
function makeRange(lines, rows, opt) {
  var asked = askedRange(lines);
  var 첫 = null, 끝 = null, 밖 = 0, i;
  for (i = 0; i < (rows || []).length; i++) {
    var d = rows[i].at.slice(0, 10);
    if (첫 === null || d < 첫) 첫 = d;
    if (끝 === null || d > 끝) 끝 = d;
    if (asked && (d < asked.from || d > asked.to)) 밖++;
  }
  var e = rangeEvid(lines, opt);
  var v = rangeVerdict(asked, e, 밖);
  return { asked: asked, seen: (첫 ? { from: 첫, to: 끝 } : null),
           evid: e, 밖: 밖, ok: v.ok, why: v.why, 문장: v.문장 || null };
}

