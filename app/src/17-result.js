function drawResult(months) {
  var y = window.pageYOffset;
  var xs = [],
    ws = document.querySelectorAll('#up-result .ywrap'),
    i;
  for (i = 0; i < ws.length; i++) xs.push(ws[i].scrollLeft);
  drawResultInner(months);
  try {
    fixWhyTails();
  } catch (e) {}
  ws = document.querySelectorAll('#up-result .ywrap');
  for (i = 0; i < ws.length && i < xs.length; i++) ws[i].scrollLeft = xs[i];
  if (window.pageYOffset !== y) window.scrollTo(0, y);
  /* ★ 105차 ④. 결과가 실제로 그려진 뒤다. 여기가 「분석이 끝난 날」이다 */
  try {
    markLastRun();
  } catch (e) {}
}
/* ★ 77차. 진행 안내와 행동 단추를 한 문장으로 합친다.
   새 파일에서 생긴 곳으로 오해하지 않도록 「아직 안 정한 곳」이라고 부른다. */
function resultNewButton(n) {
  if (!n) return null;
  var b = el('button', 'resultnew', '아직 안 정한 곳 ' + won(n) + '곳');
  b.type = 'button';
  b.addEventListener('click', function () {
    useScreen('거래처 더 찍기');
    moreFromResult();
  });
  return b;
}
function drawResultInner(months) {
  var host = document.getElementById('up-result');
  host.innerHTML = '';
  /* ★ 116차 통합. 그리기 전에 예측 입력이 바뀌었는지 본다 (dueFresh) */
  try {
    dueFresh();
  } catch (e) {}

  var all = months;

  /* ── 매장 이름 — 눌러서 고칠 수 있다 ──
     ★ 38차 1-1. 점선만으로는 누를 수 있는 줄인지 안 보인다. [수정]을 옆에 둔다.
       예시 화면에서도 고쳐볼 수 있어야 「내 것으로 바꿀 수 있구나」가 보인다 */
  var nameRow = el('div', 'rstore');
  var nb = el('button', 'rstorebtn', storeName());
  nb.type = 'button';
  nb.title = '눌러서 ' + BIZ.곳 + ' 이름과 성함 고치기';
  nb.addEventListener('click', function () {
    useScreen('이름 고치기');
    openNames();
  });
  nameRow.appendChild(nb);
  /* ★ 76-2-1차. 매장명 글자 형식은 유지하고 중복 「수정」 단추는 없앤다.
     매장명 자체를 누르면 기존 이름·성함 편집 화면이 그대로 열린다. */
  var mng = el('button', 'rstoreedit', '항목 관리');
  mng.type = 'button';
  mng.addEventListener('click', function () {
    useScreen('항목 관리');
    openCats();
  });
  nameRow.appendChild(mng);
  /* ★ 91차 ③. 한 달치를 더 얹는 자리. 예전에는 머리의 「파일 더 올리기」뿐이라
     결과를 보시던 자리에서는 보탤 길이 안 보였다.
     ★ 하는 일은 71차 ②의 보태기 그대로다 — 새 합치기를 짜지 않는다.
       openAddFiles 가 지금 계좌들을 목록에 얹어두고, 고르신 파일이 그 위에 쌓인다.
       같은 파일·겹치는 기간은 이미 있는 검사(같은 이름·overlapWith·겹친건수)가 거른다 */
  if (!UP.demo && UP.banks && UP.banks.length) {
    var more = el('button', 'rstoreedit', '＋ 거래내역 추가');
    more.type = 'button';
    more.addEventListener('click', function () {
      useScreen('거래내역 추가');
      if (!openAddFiles()) return;
      var inp = /** @type {HTMLInputElement} */ (document.getElementById('upinput'));
      if (inp) {
        inp.value = '';
        inp.click();
      }
    });
    nameRow.appendChild(more);
  }
  host.appendChild(nameRow);
  /* ★ 66차 ②. 머리 배지 — 「언제까지의 자료인가」와 「최근 마감한 달」.
     ★ 여기 있던 「…까지의 거래내역입니다」 줄을 이 배지가 대신한다.
       같은 날짜를 두 줄로 말하면 한 화면에 같은 것이 두 자리가 된다 (49차) */
  var 배지 = el('div', 'hbadge');
  var 끝날 = asOfText();
  /* ★ 119차 문구 보정. 「오늘 8월 22일 기준」은 실제 오늘 날짜로 읽혔다.
     자료의 날짜(asOfText)를 연도까지 그대로 쓰고 「자료 기준일」이라고 부른다 */
  배지.appendChild(el('span', 'hb1', 끝날 ? '자료 기준일 ' + 끝날 : '자료 기준일'));
  var 마감달 = lastClosedMonth(months);
  if (마감달) 배지.appendChild(el('span', 'hb2', '최근 마감: ' + monNum(마감달)));
  host.appendChild(배지);
  /* ★ 78차. 화면 위에서는 「전체보기」만 누른다.
     실제 저장 이미지 전체를 먼저 확인하고, 그 화면 안에서 저장한다. */
  var save = document.getElementById('topimage');
  if (save) {
    save.hidden = false;
    save.textContent = '전체보기';
    save.onclick = function () {
      openImagePreview(save);
    };
  }
  /* 자료가 짧으면 견줄 것도 예상할 것도 없다. 왜 안 나오는지 알려준다 */
  if (months.length < 3) {
    host.appendChild(
      el('div', 'shortnote', '지난 1년치를 올리시면 지난달과 견주고 이번 달 말도 예상해드립니다.')
    );
  }
  /* ★ 82차 ④. ○○ 약사가 5개월치를 넣고 「진짜 수익이 어떤지는 아직 잘 모르겠다」고 했다.
     개업 초기라 매입이 몰린 시기였다. 사실만 적는다 —
     「나중엔 좋아집니다」 같은 앞일은 단정하지 않는다.
     ★ 여섯 달 미만일 때만이다. 자료가 넉넉하면 이 줄은 아예 안 나온다 */
  if (months.length && months.length < SHORT_SPAN_MONTHS) {
    host.appendChild(
      el(
        'div',
        'shortnote',
        won(months.length) + '개월치입니다. 달마다 들쭉날쭉해 평균이 아직 안 잡힐 수 있습니다.'
      )
    );
  }

  /* ── 툴바 두 줄 ──
     줄 1: 보는 달 · 보기 방식   줄 2: 누르는 것들
     한 줄에 다 넣으면 「거래처 더 정하기 (149곳 남음)」에서 줄이 저절로 바뀐다 */
  var sel = el('div', 'rsel');
  /* ★ 71차 ⑤-2. 한 해 화면에는 「보는 해 ▾」가 온다.
     자리도 모양도 한 달 화면의 「보는 달 ▾」과 같게 둔다 — 같은 문법이라야
     두 화면이 한 앱으로 읽힌다. 자료가 있는 해만 목록에 넣는다 */
  var yearView = UP.view === 'year';
  /* ★ 76-1차 긴급 수정. 관리 영역을 옮길 때 함께 빠졌던 값이다.
     월 화면은 보고 있는 달의 미분류 거래처 수, 1년 화면은 전체 미분류 수를 쓴다. */
  var restN = yearView ? unsetCount() : monthNumbers(UP.month).unkGroups || 0;
  var row1 = el('div', 'rselrow');
  drawYearPicker(months, sel, yearView, row1);
  var pick = document.createElement('select');
  all.forEach(function (m) {
    var o = document.createElement('option');
    o.value = m;
    o.textContent = monthLabelR(m, months);
    pick.appendChild(o);
  });
  pick.value = UP.month;
  pick.addEventListener('change', function () {
    UP.month = pick.value;
    /* 38차 6번. 펼친 상태는 그 달 안에서만 기억한다 — 이미 그렇게 되어 있다 */
    UP.open = {};
    UP.ckPin = {}; /* 달을 바꾸면 그때 다시 센다 */
    drawResult(months);
  });
  if (!yearView) {
    row1.appendChild(pick);
    sel.appendChild(row1);
  }

  var mode = el('div', 'rmode');
  drawViewToggle(months, mode);
  row1.appendChild(mode);
  host.appendChild(sel);

  if (UP.view === 'year') {
    drawYear(host, months);
    dscLine(host);
    return;
  }

  var d = monthNumbers(UP.month);

  /* 검산: 월초 잔액 + 들어온 돈 − 나간 돈 = 월말 잔액 (통장 그대로) */
  var expect = d.open + d.inTotal - d.outTotal;
  if (expect !== d.close) {
    var bad = el('div', 'upbad');
    bad.appendChild(el('h4', null, '계산을 확인해주세요'));
    bad.appendChild(el('div', 'errb', '거래 합계와 파일의 월말 계좌 잔액이 다릅니다.'));
    var calc = el('div', 'upbadcalc');
    function calcRow(label, value) {
      var row = el('div', 'upbadcalcrow');
      row.appendChild(el('span', null, label));
      row.appendChild(el('span', 'num', won(value) + '원'));
      return row;
    }
    calc.appendChild(calcRow('계산한 현재 계좌 잔액', expect));
    calc.appendChild(calcRow('파일의 월말 계좌 잔액', d.close));
    bad.appendChild(calc);

    var trades = el('div', 'upbadtrades');
    trades.hidden = true;
    var monthRows = (UP && UP.rows ? UP.rows : [])
      .filter(function (r) {
        return r.at && r.at.slice(0, 7) === UP.month;
      })
      .slice()
      .sort(function (a, b) {
        return a.at < b.at ? 1 : a.at > b.at ? -1 : 0;
      });
    monthRows.forEach(function (r) {
      var tr = el('div', 'upbadtrade');
      tr.appendChild(el('span', 'at', +r.at.slice(5, 7) + '월 ' + +r.at.slice(8, 10) + '일'));
      tr.appendChild(el('span', 'payee', r.payee || '이름 없음'));
      tr.appendChild(el('span', 'amt num', wonSign(r.amount || 0) + '원'));
      trades.appendChild(tr);
    });

    var acts = el('div', 'upacts');
    var see = el('button', 'b on', '확인할 거래 보기');
    see.type = 'button';
    see.addEventListener('click', function () {
      trades.hidden = !trades.hidden;
      see.textContent = trades.hidden ? '확인할 거래 보기' : '거래 접기';
    });
    acts.appendChild(see);
    var again = el('button', 'b', '파일 다시 올리기');
    again.type = 'button';
    again.addEventListener('click', function () {
      PENDING = [];
      UP = null;
      var inp = /** @type {HTMLInputElement} */ (document.getElementById('upinput'));
      if (inp) inp.value = '';
      openUpPanel();
      openPick();
      if (inp) inp.click();
    });
    acts.appendChild(again);
    bad.appendChild(acts);
    bad.appendChild(trades);
    host.appendChild(bad);
    return;
  }

  /* ★ 76-2차. 다음 달 초까지 모자랄 가능성은 월 결과의 첫 핵심정보다.
     숫자 검산이 맞은 뒤, 손익 숫자와 그래프보다 먼저 한 번만 보여준다.
   ★ 86차 ①. 82차 ②의 「여유가 뚜렷하면 아래로 내린다」를 철회했다.
     어느 대표님이든 늘 맨 위에 · 늘 펼친 채로 둔다. 접는 것은 대표님이 정하신다 */
  drawDueCard(host, months);

  /* 눌러서 그 안의 거래처를 펼쳐 보는 줄 */

  var mm = +UP.month.slice(5, 7);
  var running = isRunning(UP.month, months);
  var lastDay = lastDayIn(UP.month);

  /* 예상 잔액은 걷어냈다 — 실데이터 57건에서 금액 예측이 안 맞았다.
     대신 통장에 이미 있는 숫자로 「얼마가 필요한가」를 센다.
     forecastSpan/forecastError 는 화면 뒤 로그에서 옛 방식과 견주려고 남겨둔다 */
  /* ★ 43차. 큰 잔액 카드를 걷어냈다. 잔액은 이제 손익 칸 아래
     「계좌 잔액」 한 줄로 들어간다 — 접힌 화면을 22줄에서 줄이려는 것이고,
     통장에 찍힌 값이라 순이익과 나란히 두면 어느 쪽이 확정인지 헷갈린다.
     월초·들어온·나간·월말은 그 줄을 펼치면 그대로 나온다 */

  /* 전월 대비 — 첫 달에는 비교할 게 없어 붙이지 않는다.
     기본은 짧게, 누르면 금액까지 보여준다 */
  var pm = prevMonth(UP.month, months);
  /* 진행 중인 달이면 지난달도 같은 날짜까지만 잘라서 견준다 */
  var pCut = pm && running ? Math.min(lastDay, monthDays(pm)) : null;
  var pd = pm ? monthNumbers(pm, pCut) : null;
  var pLab = '';
  if (pm) {
    var pmN = +pm.slice(5, 7);
    if (!pCut) pLab = pmN + '월 전체';
    else if (pCut < lastDay)
      pLab = pmN + '월 같은 기간(1~' + pCut + '일, 그 달은 ' + pCut + '일까지)';
    else pLab = pmN + '월 같은 기간(1~' + pCut + '일)';
  }
  if (!UP.cmpOpen) UP.cmpOpen = {};
  /* 그 항목에 거래처 몇 곳, 거래 몇 건인지 */

  /* ── 손익 카드 ── 계산 순서 그대로 위에서 아래로 내려온다.
     들어온 돈 → (그중 매출 · 그 밖의 입금) → 나간 돈 → 가로줄 → 계좌 순이익.
     가로줄 위의 두 숫자를 빼면 아래 숫자가 나오는 게 눈에 보여야 한다 —
     이게 이 카드의 전부다.
     예전에는 순이익 옆에 「(들어온 돈 ○○ − 나간 돈 ○○)」를 적고
     그 옆에 「24% 매출 대비」를 붙였다. 뺄셈에 쓰인 건 들어온 돈인데
     강조되는 건 매출이라, 두 숫자가 비슷해서 어느 게 계산에 들어갔는지 알 수 없었다 */
  var lastD = lastDayIn(UP.month);
  var full = lastD >= monthDays(UP.month);
  var leftDays = monthDays(UP.month) - lastD;
  var checkCards = collectChecks(d, months);
  /* ★ 86차 ⑦. 여기서 세던 checkLeft 는 없앤 상자에만 쓰이던 값이다.
     남은 건수는 drawChecks 가 제 자리에서 다시 센다 (같은 자 — warnOk) */

  var card = el('div', 'pnl');
  var hostSave = host;
  host = card;

  /* 36차 J 규칙 3 — 핵심 숫자보다 먼저 보이지 않게 카드 아래로 옮긴다. */
  var mLeft = manualLeft(months);
  var chead = el('div', 'pnlhead');
  var ph1 = el('div', 'ph1');
  ph1.appendChild(
    document.createTextNode(full ? mm + '월 한 달' : mm + '월 1일 ~ ' + lastD + '일')
  );
  ph1.appendChild(el('span', 'phcount', '(거래 ' + won(d.rows.length) + '건)'));
  chead.appendChild(ph1);
  if (!full) chead.appendChild(el('div', 'ph2', '아직 ' + leftDays + '일 남았습니다'));
  host.appendChild(chead);
  /* ★ 59차 ①. 표 맨 아래에 있던 것을 머리줄 바로 아래로 올린다.
     390×844 폰에서 top 827px 에서 시작해 제목 줄만 걸치고
     근거 문장이 화면 밖에서 잘렸다. 스크롤을 내려야 다 보였다.
   ★ 59차 ②. 「진행 중인 달에만」을 걷어낸다 —
     기본 달은 끝난 달이라(defaultMonth 가 isRunning 인 달을 거른다)
     화면을 처음 열면 카드가 아예 없었다. 8월을 직접 고르셔야 나오는데
     고를 이유를 모르신다.
     이 카드가 말하는 「지금 잔액 → 다음 달 10일까지」는 보고 있는 달과 무관하다 —
     7월을 보시든 8월을 보시든 값이 같다. 달에 묶을 이유가 없었다.
   ★ 카드 안의 이름은 「지금 계좌 잔액」 그대로 둔다. 끝난 달 표의
     「월말 계좌 잔액」과 값이 달라도 이름이 다르니 어긋남이 아니다 —
     58차 ⑦-6 은 이름이 같은데 값이 다른 것이 문제였다 */
  /* ── 들어온 돈 ──
     ▾ 는 라벨 바로 옆에. 맨 오른쪽 끝에 두면 금액에 묻혀서 안 보인다.
     항목 줄(식자재 ▾ · 10곳 · 26건)이 이미 그렇게 하고 있다.
     이 줄은 아래 줄들을 보이고 감추는 것만 한다 — 상세는 각 줄이 연다.
     기본은 접힘이다. 더해지는 것은 가로줄 위 계산식이 대신 보여준다 */
  /* 이 달의 나간 돈 속 항목들 — 아래 두 덩어리가 같이 쓴다 */
  /* 35차 E. 안 정한 돈은 이제 지출에 안 섞인다. 그 자체를 한 칸으로 보여준다 */
  var unsetAmt = d.unknown || 0;
  /* ★ 43차. 항목 순서를 금액 큰 순에서 고정 순서로 바꾼다.
     매달 자리가 바뀌면 지난달과 견줄 수가 없다 — 「식자재가 어디 갔지」가 된다.
     UP.accounts 가 이미 사장님이 보시는 항목 차례다. 그 차례를 그대로 쓴다 */
  var catOrder = (UP.accounts || []).slice();
  var keys = Object.keys(d.cats)
    .filter(function (k) {
      return k !== UNSET;
    })
    .sort(function (a, b) {
      var ia = catOrder.indexOf(a),
        ib = catOrder.indexOf(b);
      if (ia === -1) ia = 999;
      if (ib === -1) ib = 999;
      if (ia !== ib) return ia - ib;
      return d.cats[b] - d.cats[a];
    });
  var allKeys = keys.slice();
  if (d.cats[UNSET]) allKeys.push(UNSET);

  /* 오른쪽 끝을 윗줄과 맞춘다 — % 칸을 두면 54px 만큼 어긋난다 */
  function calcRow(label, value) {
    var r = el('div', 'orow');
    r.appendChild(el('div', 'lab', label));
    r.appendChild(el('div', 'v num', value));
    return r;
  }
  /* ── 38차 1·6번 ── 펼치면 나오는 것 */
  /* ── 87차 ② · 회색 글씨는 「자세히」 안으로 다 넣는다 ─────────────────
     86차 ②에서는 설명 한 줄만 접고 견주는 줄은 「사실이라 안 접는다」고 했다.
     개발자가 그것을 뒤집었다 — 회색 글씨는 다 접는다.
     ★ 두 자리(사업으로 번 돈 · 사업에 쓴 돈)의 모양을 맞춘다.
     ★ 안 접는 것 둘 —
       ① 붉은 줄(subnote warn)은 회색이 아니라 짚어드리는 말이다
       ② 나간 쪽 「아래 %는 매출 …원 기준입니다」는 바로 아래 줄들의 % 를
          읽는 자라, 그 줄들보다 먼저 보여야 뜻이 선다 */
  var 회색모음 = null;
  function 회색펴기(side) {
    var 줄들 = 회색모음 || [];
    회색모음 = null;
    if (!줄들.length) return;
    var 열쇠 = 'manwhy:' + side;
    var 열림 = !!UP.open[열쇠];
    var b = el('button', 'oblink dtlbtn', '자세히 ' + (열림 ? '▴' : '▾'));
    b.type = 'button';
    b.addEventListener('click', function () {
      UP.open[열쇠] = !열림;
      drawResult(months);
    });
    host.appendChild(b);
    if (열림)
      줄들.forEach(function (n) {
        host.appendChild(n);
      });
  }

  function manualBox(side, label, value, isFull) {
    var items = manualItems(side);
    var mine = side === 'in' ? d.manIn : d.manOut;
    var key = '__man' + side;
    var open = !!UP.open[key];
    var row = el('div', 'orow tapx bigrow mcalc ' + (side === 'in' ? 'minearn' : 'mspend'));
    row.appendChild(el('div', 'msign', side === 'out' ? '−' : ''));
    var lab = el('div', 'lab', label + (d.blocked && isFull ? ' — 직접 넣기' : ''));
    lab.appendChild(el('span', 'chev', open ? '▴' : '▾'));
    lab.appendChild(
      whyMark(side, function () {
        drawResult(months);
      })
    );
    row.appendChild(lab);
    row.appendChild(el('div', 'v num', d.blocked ? '' : won(value)));
    row.addEventListener('click', function () {
      UP.open[key] = !UP.open[key];
      drawResult(months);
    });
    host.appendChild(row);
    if (whyOpen(side)) host.appendChild(whyBox(side));
    if (!open) return;
    /* ★ 38차 1번. 펼치면 먼저 항목별이 나온다. 그다음이 직접 넣기 칸이다 */
    /* ★ 87차 ②. 여기서부터 나오는 회색 줄은 모았다가 「자세히」 뒤로 넣는다 */
    회색모음 = [];
    drawSideParts(d, months, host, 회색모음, pd, pLab, keys, side);
    /* 규칙 6 — 얼마가 직접 넣으신 것인지 늘 밝힌다 */
    if (mine) {
      회색줄(회색모음, host, el('div', 'subnote', '직접 넣으신 ' + won(mine) + '원 포함'));
    }
    회색펴기(side);
    /* ★ 83차 ①③. 매출 쪽에는 「현금매출」이 처음부터 한 줄로 있다.
       만들라고 시키지 않는다 — 이미 있는 상태로 보인다.
       이름은 고정이고 대표님이 바꾸거나 지울 수 없다 */
    if (side === 'in') drawCashRow(months, host, isFull);
    /* ★ 86차 ⑨. 나간 쪽은 무엇을 적을지 미리 알 수 없어 항목 이름도 대표님이 적으신다.
       날짜 규칙은 들어온 쪽과 똑같다 — 그래서 진행 중인 달에도 이 자리가 열린다 */
    if (side === 'out') {
      drawOutManual(months, host, isFull);
      return;
    }
    if (!isFull) return; /* 진행 중인 달에는 적는 칸을 안 연다 (규칙 2) */
    /* ★ 86차 ⑧. 들어온 쪽 「＋ 항목 추가」를 없앤다 — 직접 넣는 길을
       「현금매출을 날짜별로」 하나로 좁힌다. 그 자리에 비슷한 단추가 둘이었다.
       ★ 단추만 없앤다. 이미 만들어 두신 항목은 그대로 줄로 보이고 금액 칸도 있고
         합계에도 그대로 든다 — 항목까지 없애면 적어두신 금액이 화면에서 사라진다.
       ★ 저장 모양(items)은 한 글자도 안 바꾼다 */
    items.forEach(function (it) {
      var r2 = el('div', 'orow manrow');
      var l2 = el('div', 'lab', '　' + it.name);
      l2.appendChild(el('span', 'manmark', ' ✎'));
      r2.appendChild(l2);
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'numeric';
      inp.className = 'maninput';
      inp.value = manualAmt(UP.month, it.id) ? won(manualAmt(UP.month, it.id)) : '';
      inp.placeholder = '0';
      inp.addEventListener('change', function () {
        var v = Math.max(0, Math.round(+String(inp.value).replace(/[^0-9]/g, '') || 0));
        manualSet(UP.month, it.id, v);
        drawResult(months);
      });
      r2.appendChild(inp);
      var del = el('button', 'chbtn', '지우기');
      del.type = 'button';
      del.addEventListener('click', function () {
        manualRemove(it.id);
        drawResult(months);
      });
      r2.appendChild(del);
      host.appendChild(r2);
    });
  }

  /* ── 덩어리 1 · 순이익을 만드는 두 줄 ── */
  /* ★ 44차 1-2. 「들어온 돈」은 통장에 들어온 전부로 읽힌다 —
     이 값은 매출 + 그 밖의 입금이라 통장과 172만원 어긋났다.
     「사업에 쓴 돈」과 짝이 맞고 뜻도 맞는 이름으로 바꾼다. 계산은 그대로다 */
  manualBox('in', '사업으로 번 돈', d.sales + d.otherIn, full);
  manualBox('out', '사업에 쓴 돈', d.cost, full);

  /* ── 덩어리 2 · 순이익 ── */
  var res = el('div', 'res restop mcalc mprofit');
  res.appendChild(el('div', 'msign', '='));
  /* ★ 이름은 「계좌 순이익」 그대로 둔다 — 계좌에 오간 돈만으로 낸 값이라
     세무사가 내는 순이익과 다르다. 그 뜻이 이름에 들어 있다 */
  /* ★ 57차. 이름이 pLab 이었다. 위쪽(10914행)에 이미 같은 이름의 전월 라벨이
     있는데 var 는 함수 스코프라 둘이 같은 변수가 되어, 여기서 만든 DOM 요소가
     전월 라벨을 덮어썼다. 그래서 아래 cmpLine 이 그것을 글자로 찍어
     화면에 [object HTMLDivElement] 가 나왔다 (55차부터 · 예시 여덟 달 중 다섯 달) */
  var profLab = el('div', 'lab', '계좌 순이익');
  profLab.appendChild(
    whyMark('profit', function () {
      drawResult(months);
    })
  );
  res.appendChild(profLab);
  /* ★ 41차 1번 (나). 진행 중인 달은 더 정해도 안 나온다 — 달이 끝나야 나온다.
   ★ 64-3차. 그런데 「달이 끝나면」은 「기다리면 된다」로 읽힌다 —
     막힌 까닭이 안 정한 돈인데 기다리라고 하면 반대로 이끄는 말이 된다.
     막힌 까닭에 맞는 쪽을 보여준다.
   ★ 지금 blocked 는 lo < 0 && hi > 0 이고 lo·hi 는 안 정한 돈으로만 벌어진다 —
     안 정한 것이 없으면 lo === hi 라 이 자리에 아예 안 온다.
     그래서 아래 else 는 지금 규칙에서는 안 닿는다. 규칙이 바뀌어도
     맞는 말이 나오게 까닭으로 갈라 둔다 */
  var runNow = isRunning(UP.month, months);
  drawBlockedReason(d, unsetAmt, res);
  host.appendChild(res);
  if (whyOpen('profit')) host.appendChild(whyBox('profit'));
  /* ★ 118차 ⑤. blocked 조건은 그대로 두고, 안 정한 거래 때문에 막힌 경우의 주 문장과
     범위를 이 자리 한 곳에 모은다. lo·hi 는 기존 계산값을 원 단위로 그대로 쓴다.
     ★ 범위를 앞날 예측이나 계좌 잔액으로 부르지 않는다 — 이 달 계좌 순이익이
       분류에 따라 어디서 어디까지 달라지는가다.
     ★ 아래 「아직 안 정한 곳 N곳」 단추가 바로 뒤에 선다. 카드 아래에서 같은 범위를
       한 번 더 풀어 쓰던 줄은 지웠다 (같은 말을 두 자리에 두지 않는다) */
  var 분류탓 = d.blocked && (d.uOut > 0 || d.uIn > 0);
  if (분류탓) {
    host.appendChild(el('div', 'resbase', '거래 분류에 따라 계좌 순이익이 달라집니다.'));
    host.appendChild(
      el(
        'div',
        'resbase',
        '분류에 따른 범위: ' + won(Math.round(d.lo)) + '원 ~ ' + won(Math.round(d.hi)) + '원'
      )
    );
  }
  if (d.blocked && !runNow && !분류탓) {
    host.appendChild(el('div', 'resbase', '아직 안 정한 돈이 많아 순이익을 셀 수 없습니다'));
  }
  drawBlockedRunning(months, host, d, lastD, runNow, 분류탓);
  drawUnsetShiftLine(months, host, d, unsetAmt);
  /* ★ 74차. 핵심 숫자와 아직 안 정한 돈을 본 다음에만 다음 행동을 보여준다. */
  var 새로정할 = resultNewButton(restN);
  if (새로정할) host.appendChild(새로정할);
  /* ★ 66차 ④. 이 달이 어떻게 흘러왔는지. 위 숫자는 손대지 않고 그림만 더한다 */
  drawDayChart(host, UP.month, d, months);
  /* ── 덩어리 3 · 계산에 안 들어가는 것 ──
     ★ 여기 셋은 순이익 뺄셈에 안 들어간다. 확인만 하는 자리다.
       색을 죽여 위 덩어리와 갈라 보이게 한다 */
  host.appendChild(el('div', 'pnlrule'));
  drawBalanceRow(months, host, d, full, calcRow);
  var keepTot = (d.keepIn || 0) + (d.keepOut || 0);
  drawKeepRow(months, host, d, keepTot);
  /* 앱이 질문을 생략한 작은 거래는 계산상 「아직 안 정한 돈」이 아니다.
     임시로 사업 외 용도에 둔 값이지만, 다시 확인할 돈이라는 사용자 흐름은 같다.
     따라서 아직 안 정한 돈을 펼치면 제일 먼저 보여주되 둘을 합산하지 않는다. */
  var sk = skipTotals();
  drawHoldRow(months, host);
  drawUnsetRow(months, host, d, unsetAmt, calcRow, sk);

  /* 아직 안 정한 돈이 없으면 안전 안내 자체가 사라지지 않도록 원래 자리에 남긴다. */
  if (!unsetAmt) drawSkippedSmall(sk, months, host, false);

  drawTransferCards(months, host);

  drawRangeStepNote(host);

  /* 이대로 가면 이번 달이 지난달보다 나을지 — 매출만, 세 조건이 다 맞을 때만.
     들어온 돈과 나간 돈 사이에 두면 두 숫자를 나란히 못 본다 */
  var proj = salesProjection(months, UP.month);
  drawSalesProjection(host, proj);

  /* ★ 86차 ⑦. 여기 있던 「확인할 게 N가지 있습니다」 상자를 없앤다.
     「보기 ↓」를 눌러도 조금만 내려갔다 — 손가락으로 내려도 보이는 자리라
     눌러야 할 까닭이 없었고 자리만 먹었다.
     그 경고는 아래 「확인이 필요합니다 · N건」 제목으로 옮겼다 (drawChecks).
     상자가 두 자리에서 같은 말을 하지 않는다 (49차) */

  host = hostSave;
  host.appendChild(card);

  if (mLeft) {
    host.appendChild(el('div', 'manleft', '직접 넣으실 달이 ' + won(mLeft) + '개 남았습니다'));
  }

  drawBlockedProfitNote(months, host, d, pd, pLab);

  /* ★ 60차 ⑤. 「지난 N달 동안, 월말 계좌 순이익이 … 평균 ○○원 많았습니다」 줄을 걷어냈다.
     말하려던 것은 참말이었다 — 예시 자료로 보면 7월 1~22일은 적자 −417,734원인데
     7월 전체는 흑자 7,312,306원이다. 마지막 아흐레에 7,730,040원이 붙는다.
     그런데도 빼는 까닭 셋 —
       ① 바로 위 머리줄이 이미 「8월 1일 ~ 22일 · 아직 9일 남았습니다」라고 말한다
       ② 「지난 7달 평균 1,225만원 많았다」가 「이번에도 늘겠구나」로 읽힌다.
          주석으로 「예측이 아니라 지난 기록」이라고 방어하고 있었는데,
          방어 문구가 필요하다는 것 자체가 그렇게 읽힌다는 뜻이다
       ③ 「앞으로 어떻게 될까」는 이제 ⑦ 카드가 맡는다
     ★ 「7월 같은 기간(1~22일) 대비」(cmprow) 는 그대로 둔다 —
       지난달과 견주는 사실이라 예측으로 안 읽힌다 */

  drawChecks(host, d, months, checkCards);

  /* ★ 86차 ①. 여기 있던 「내려온 카드」 자리를 없앤다 — 카드는 늘 맨 위 하나뿐이다 */

  var foot = el('div', 'upstat');
  foot.style.marginTop = '14px';
  /* 한 줄에 다 붙이면 어느 숫자가 무엇인지 안 읽힌다. 줄을 나눈다 */
  var lines = [];
  if (UP.patched) {
    /* ★ 108차 ④. 「반영」을 눌렀다고 실제 거래 금액이 확인된 것은 아니다.
       잔액 차이로 뽑은 값 그대로다 — 그 사실을 이름에 남긴다 */
    lines.push('잔액 차이로 금액을 추정한 거래 ' + UP.patched + '건');
  }
  /* ★ 112차 ②㉲. 미응답은 「사용자 확인 완료」가 아니다. 다른 말로 적는다 */
  if (UP.autoPatched) {
    lines.push('그 가운데 ' + UP.autoPatched + '건은 선택하지 않아 임시로 반영한 것입니다');
  }
  /* ★ 107차 ②. 알림으로만 두지 않는다 — 눌러서 그 카드로 돌아갈 수 있어야 한다.
     한 번 넘어가면 「아닙니다」를 고를 길이 아예 없었다.
     ★ 예시 화면에서는 안 붙인다. 남의 가게 자료를 고치는 일이 된다 */
  /* ★ 112차 ②. 어느 상태에서 와도 그 카드로 돌아갈 수 있어야 한다 —
     예전에는 patched 한 갈래만 길이 있었다 */
  var ck있 = (UP.rows || []).some(ckRow);
  var 되돌 = ck있 && !UP.demo ? el('button', 'oslink', '다시 보기') : null;
  if (되돌) {
    되돌.type = 'button';
    되돌.addEventListener('click', function () {
      showPatchedCards();
    });
  }
  /* ★ 112차 ②㉰. 「파일 금액 반영」은 거래 금액을 고르신 것이다.
     「거래 금액도 모르는 것」과 한 덩어리로 세지 않는다 — 남은 것은 잔액 차이 하나다 */
  if (UP.byStated) {
    lines.push(
      '파일에 적힌 금액으로 반영한 거래 ' +
        UP.byStated +
        '건 · 잔액 차이는 확인 필요로 따로 두었습니다'
    );
  }
  /* ★ 112차 ②㉯. 거래 전체가 매출·지출에서 빠진 것들이다. 미응답과 다른 말로 적는다 */
  if (UP.unsure) {
    lines.push('확인 필요로 분류해 매출·지출 계산에서 뺀 거래 ' + UP.unsure + '건');
  }
  /* ★ 112차 ②. 이 줄은 맨 아래로 내린다 — 안 물은 줄이라 「다시 보기」에 안 뜬다.
     위에 두면 그 단추가 이 줄에 붙어 「눌러도 그 거래가 없다」가 된다 */
  if (UP.zeroed) {
    lines.push(
      '금액 칸이 비어 있지만 잔액도 안 움직인 거래 ' + won(UP.zeroed) + '건은 0원으로 두었습니다'
    );
  }
  lines.forEach(function (t, i) {
    var row = el('div', null, t);
    if (i === 0 && 되돌) {
      row.appendChild(document.createTextNode(' '));
      row.appendChild(되돌);
    }
    foot.appendChild(row);
  });
  if (lines.length) host.appendChild(foot);
  drawSaveFailNote(host);

  if (installCase()) {
    var ib = el('button', 'upbtn instlink', '폰 화면에 아이콘 만들기');
    ib.type = 'button';
    ib.addEventListener('click', reopenInstall);
    host.appendChild(ib);
  }
  dscLine(host);
}
/* drawResultInner 에서 뺀 부분 (B-4) */
function drawYearPicker(months, sel, yearView, row1) {
  if (yearView) {
    var ypick = document.createElement('select');
    var 해목록 = yearsWithData(months);
    해목록.forEach(function (y) {
      var o = document.createElement('option');
      o.value = y;
      o.textContent = y + '년';
      ypick.appendChild(o);
    });
    ypick.value = yearNow(months) || '';
    ypick.addEventListener('change', function () {
      UP.year = ypick.value;
      UP.open = {};
      UP.ckPin = {};
      drawResult(months);
    });
    row1.appendChild(ypick);
    sel.appendChild(row1);
  }
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawViewToggle(months, mode) {
  [
    ['month', '한 달'],
    ['year', '1년']
  ].forEach(function (p) {
    var b = el('button', UP.view === p[0] ? 'on' : '', p[1]);
    b.type = 'button';
    b.addEventListener('click', function () {
      var 바뀜 = p[0] !== UP.view;
      if (바뀜) useScreen(p[0] === 'year' ? '1년치' : '한 달');
      if (바뀜) UP.ckPin = {}; /* 화면을 옮기면 다시 센다 */
      UP.view = p[0];
      drawResult(months);
      /* ★ 56차. 보기를 바꾸는 것은 「옮기려는 것」이라 위부터 본다.
         예전에는 스크롤이 잘리는 덕에 우연히 위로 갔다 —
         고쳐서 그런 것이 아니었다. 위를 고치면 그 우연이 사라지므로
         여기서 일부러 부른다. 같은 보기를 다시 누르면 안 움직인다 */
      if (바뀜) window.scrollTo(0, 0);
    });
    mode.appendChild(b);
  });
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawBlockedReason(d, unsetAmt, res) {
  if (d.blocked) {
    res.classList.add('waiting');
    var 안정한탓 = d.uOut > 0 || d.uIn > 0;
    if (안정한탓) {
      /* ★ 85차 ①. 여기까지는 문장일 뿐 갈 곳이 없었다. 흰 상자로 감싸 눌리게 한다.
         ★ 갈 곳은 이미 있는 것을 그대로 쓴다 — resultNewButton 이 하는 일과 같다.
           새 길을 만들지 않는다 */
      var wg = el('button', 'v wait waitgo', '조금만 더 정하면 나옵니다 ›');
      wg.type = 'button';
      wg.addEventListener('click', function () {
        useScreen('거래처 더 찍기');
        moreFromResult();
      });
      res.appendChild(wg);
    } else {
      /* 「달이 끝나면」은 기다리는 것 말고 하실 일이 없다. 상자를 안 씌우고 안 눌린다 */
      res.appendChild(el('div', 'v wait', '달이 끝나면 나옵니다'));
    }
  } else {
    /* ★ 44차 1-1. 색은 「확정인가」만 말한다. 흑자·적자는 숫자 앞 − 가 말한다.
       43차에는 흑자일 때만 색을 붙여서, 적자 달은 안 정한 돈이 2,328만원인데도
       검정으로 나왔다 — 적자 달이 오히려 중요한데 거기서 「변동 가능」이 안 보였다.
       ★ 빨강은 「확정된 적자」와 「아직 안 정한 돈」에 쓴다 (54차 ④).
         순이익 칸에서는 여전히 확정된 적자에만 쓴다 —
         안 정한 것이 남아 있으면 적자든 흑자든 호박이다 */
    res.classList.toggle('minus', d.profit < 0 && !unsetAmt);
    res.classList.add(unsetAmt ? 'est' : d.profit < 0 ? 'minus' : 'fixed');
    res.appendChild(el('div', 'v num', won(d.profit)));
  }
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawBlockedRunning(months, host, d, lastD, runNow, 분류탓) {
  if (d.blocked && runNow) {
    /* ★ 64-3차. 윗줄이 「조금만 더 정하면」이라고 했는데 여기서 「아직 N일치라」라고 하면
       한 화면이 두 까닭을 말한다. 안 정한 돈이 까닭이면 그 말을 그대로 잇는다 */
    if (!분류탓) {
      host.appendChild(
        el(
          'div',
          'resbase',
          +UP.month.slice(5, 7) + '월은 아직 ' + lastD + '일치라 흑자인지 적자인지 아직 못 정합니다'
        )
      );
    }
    var goM = viewableMonth(months, UP.month);
    if (goM) {
      var gb = el('div', 'resbase');
      gb.appendChild(document.createTextNode(+goM.slice(5, 7) + '월은 보실 수 있습니다 '));
      var gbtn = el('button', 'upbtn est', +goM.slice(5, 7) + '월 보기');
      gbtn.type = 'button';
      gbtn.addEventListener('click', function () {
        UP.month = goM;
        UP.open = {};
        UP.ckPin = {};
        drawResult(months);
      });
      gb.appendChild(gbtn);
      host.appendChild(gb);
    }
  }
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawUnsetShiftLine(months, host, d, unsetAmt) {
  /* ★ 43차 3단계 · 오차범위 한 줄.
     뒤집히지 않는다고 정확한 것은 아니다. lo·hi 는 이미 계산되어 있다.
     안 정한 돈은 나간 쪽이 들어온 쪽의 일곱 배라 순이익은 내려가기만 한다 —
     그래서 「내려갈 수 있습니다」라고 단정한다.
     ★ 두 줄이 되면 다시 안 읽힌다. 한 줄만 쓴다 */
  if (!d.blocked && unsetAmt && d.uOut) {
    /* ★ 49차 ⑤. 앞에 ▸ 가 붙어 있어 눌릴 것처럼 보이는데 안 눌렸다.
       누르고 싶어지는 게 맞다 — 그 줄이 말하는 것을 바로 보고 싶은 자리다.
       그리고 그걸 하는 자리가 바로 아래에 이미 있다 (「아직 안 정한 돈」 상자).
       새 화면을 만들지 않고 그 상자를 편다.
     ★ 이 줄은 여는 손잡이지 접는 손잡이가 아니다. 다시 눌러도 안 접는다.
     ★ 화살표를 ▾ 로 맞춘다. 화면의 다른 손잡이가 전부 ▾·▴ 인데
       여기만 ▸ 였다. 모양이 다르면 다른 일을 한다는 뜻이 된다 */
    /* ★ 50차 ⑥. 다른 손잡이는 전부 tapx 가 붙어 손 모양이 나온다.
       모양이 다르면 다른 일을 한다는 뜻이 된다 — 49차 ①과 같은 규칙 */
    /* ★ 68차 ②. 문장 전체가 호박이라 어디를 봐야 할지 안 보였다.
       문장은 회색으로 낮추고 금액 둘만 호박 굵게 — 눈이 숫자로 먼저 간다.
       ★ 글자는 한 글자도 안 바꾼다. 마디만 나눈다 */
    var er = el('div', 'errline tapx');
    er.appendChild(document.createTextNode('▾ 아직 안 정한 ' + won(d.unknownN || 0) + '건 '));
    er.appendChild(el('b', 'errnum', won(unsetAmt) + '원'));
    er.appendChild(document.createTextNode(' 때문에 '));
    er.appendChild(el('b', 'errnum', won(d.lo) + '원까지'));
    er.appendChild(document.createTextNode(' 내려갈 수 있습니다'));
    er.addEventListener('click', function () {
      UP.open = UP.open || {};
      UP.open.__unset = true;
      drawResult(months);
      /* 폈는데 화면 밖이면 안 누른 것과 같다 */
      setTimeout(function () {
        var rows = document.querySelectorAll('#up-result .orow');
        for (var i = 0; i < rows.length; i++) {
          if (rows[i].textContent.indexOf('아직 안 정한 돈') === 0) {
            rows[i].scrollIntoView({ block: 'center' });
            return;
          }
        }
      }, 0);
    });
    host.appendChild(er);
  }
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawBalanceRow(months, host, d, full, calcRow) {
  /* ★ 62-2차 ⑧. 자리만 바꾼다 —
     지금 계좌 잔액 → 사업 외 용도 → 아직 안 정한 돈.
     이름·금액·색·펼침은 그대로다 */
  /* ★ 43차. 계좌 잔액을 이 칸으로 데려온다.
     통장에 찍힌 그대로라 안 바뀐다 — 순이익과 달리 확정값이다. 파랑(--now)으로 갈라 쓴다.
     펼치면 월초·들어온·나간·월말이 나온다. 계좌 검산은 거기서 그대로 돈다 */
  boxRow(
    months,
    host,
    '__bal',
    (full ? +UP.month.slice(5, 7) + '월 말' : '현재') + ' 계좌 잔액',
    won(d.close),
    null,
    function () {
      host.appendChild(calcRow('　' + +UP.month.slice(5, 7) + '월 1일', won(d.open)));
      host.appendChild(calcRow('　들어온 돈', won(d.inTotal)));
      host.appendChild(calcRow('　나간 돈', won(d.outTotal)));
      host.appendChild(calcRow('　' + (full ? '월말' : '현재'), won(d.close)));
      if (UP.banks && UP.banks.length > 1) {
        var per = [];
        UP.banks.forEach(function (b, i) {
          var v = balanceSum(function (r) {
            return accOf(r) === i && r.at.slice(0, 7) <= UP.month;
          });
          if (v !== null) per.push(b.bank + ' ' + won(v) + '원');
        });
        if (per.length) host.appendChild(el('div', 'subnote', per.join(' · ')));
        /* ★ B-9. 늦게 시작한 계좌가 있으면 달과 달 사이 잔액이 안 이어진다 — 숫자는 그대로 두고 까닭만 알린다 */
        lateAccounts(UP.month).forEach(function (x) {
          var 이름 = (UP.banks[x.acc] && UP.banks[x.acc].bank) || '계좌 ' + (x.acc + 1);
          host.appendChild(
            el(
              'div',
              'subnote',
              x.state === 'before'
                ? 이름 +
                    은는(이름) +
                    ' ' +
                    +x.from.slice(5, 7) +
                    '월부터 자료가 있어 이 달 잔액에 빠져 있습니다'
                : 이름 + 은는(이름) + ' 이 달부터 자료가 있어 1일 잔액이 지난달 말과 다릅니다'
            )
          );
        });
      }
      /* 이 뺄셈이 「들어온 돈 − 나간 돈」과 안 맞으면 그 달에 확인 안 된 거래가 있다 */
      var diff2 = d.close - d.open,
        flow2 = d.inTotal - d.outTotal;
      if (diff2 !== flow2) {
        host.appendChild(
          el(
            'div',
            'subnote warn',
            '확인이 필요한 거래 때문에 ' +
              won(Math.abs(diff2 - flow2)) +
              '원이 들어온 돈·나간 돈에 안 잡혀 있습니다'
          )
        );
      }
    },
    'balrow2',
    full ? 'bal' : 'balnow'
  );
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawKeepRow(months, host, d, keepTot) {
  if (keepTot) {
    boxRow(
      months,
      host,
      '__keep',
      '사업 외 용도',
      won(keepTot),
      null,
      function () {
        /* ★ 36차. 한 줄 한 줄이 펼쳐지고, 펼친 거래처 줄마다 [항목 바꾸기]가 붙는다 */
        var rows = [];
        Object.keys(d.keepOutParts).forEach(function (k) {
          rows.push({ k: k, isIn: false, name: keepSideName(k, '출금'), v: d.keepOutParts[k] });
        });
        Object.keys(d.keepInParts).forEach(function (k) {
          rows.push({ k: k, isIn: true, name: keepSideName(k, '입금'), v: d.keepInParts[k] });
        });
        rows
          .sort(function (a, b) {
            return b.v - a.v;
          })
          .forEach(function (r) {
            keepRow(d, months, host, r.name, r.v, r.k, r.isIn);
          });
      },
      'sidebox',
      'keep'
    );
  }
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawHoldRow(months, host) {
  /* ★ 116차 앞 ⑤. 예상 잔액 표시를 보류한 거래.
     「아직 안 정한 돈」 상자는 보고 계신 달만 담지만, 보류 원인은 과거 비교 구간에
     있어 그 달 밖일 수 있다. 그래서 달과 상관없이 따로 낸다.
     ★ 카드가 낸 보류를 그대로 쓴다 — 두 자리가 따로 세면 또 어긋난다 */
  if (DUE_HOLD_NOW) {
    var 보류것 = DUE_HOLD_NOW;
    boxRow(
      months,
      host,
      '__hold',
      '예상 잔액 표시를 보류한 거래 (출금 ' + won(보류것.건수) + '건)',
      won(보류것.합),
      null,
      function () {
        host.appendChild(
          el(
            'div',
            'subnote',
            '예상 지출을 계산할 때 쓰는 과거 비교 날짜에 있던 거래입니다. ' +
              '아직 안 정한 거래라 예상 지출에 들어가지 않았습니다.'
          )
        );
        host.appendChild(el('div', 'subnote', '분류 후 예상 잔액 표시 여부를 다시 확인합니다.'));
        host.appendChild(el('div', 'subnote', '자료 부족 같은 다른 조건이 남아 있을 수 있습니다.'));
        drawHoldDetail(host, 보류것, months);
      },
      'sidebox unsetbox holdrow',
      null
    );
  }
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawUnsetRow(months, host, d, unsetAmt, calcRow, sk) {
  if (unsetAmt) {
    var 작은거래표시 = sk.n ? '작은 거래 ' + won(sk.n) + '곳 · ' + won(sk.sum) + '원 별도' : null;
    boxRow(
      months,
      host,
      '__unset',
      '아직 안 정한 돈 (거래 ' + won(d.unknownN) + '건)',
      won(unsetAmt),
      작은거래표시,
      function () {
        drawSkippedSmall(sk, months, host, true);
        if (d.uOut) host.appendChild(calcRow('　나간 돈', won(d.uOut)));
        if (d.uIn) host.appendChild(calcRow('　들어온 돈', won(d.uIn)));
        host.appendChild(el('div', 'subnote', '이 돈은 매출에도 지출에도 넣지 않았습니다'));
        /* ★ 82차 ⑥. 펼친 자리에서는 왜 여기 두는 편이 나은지까지 말한다.
         ○○ 약사가 「사업·개인이 섞인 카드」를 억지로 의약품 매입으로 찍으셨다 —
         개인이 쓴 돈이 지출로 들어가 순이익이 실제보다 나쁘게 나왔다 */
        host.appendChild(
          el(
            'div',
            'subnote',
            '사업과 개인이 섞인 카드처럼 한쪽으로 정할 수 없는 것은 여기 두는 것이 맞습니다.'
          )
        );
        /* ★ 43차 4단계. 여기서 바로 정하실 수 있게 한다 */
        drawUnsetDetail(host, d, months);
      },
      'sidebox unsetbox',
      'unset'
    );
    /* ★ 82차 ⑥. 이번 통화에서 가장 값어치 있는 발견 —
       앱은 설계대로 혼용 카드를 안 나누고 여기 뒀는데, ○○ 약사가 그것을
       「덜 끝난 숙제」로 느껴 하나하나 억지로 채우셨다. 그래서 숫자가 틀어졌다.
       화면이 사용자로 하여금 정확도를 스스로 망가뜨리게 만들고 있었다.
       ★ 0으로 만들라고 재촉하지 않는다는 것을 펼치지 않아도 보이게 둔다 */
    host.appendChild(
      el('div', 'unsetok', '다 채우지 않으셔도 됩니다. 확실하지 않은 것은 여기 두는 편이 낫습니다.')
    );
  }
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawTransferCards(months, host) {
  /* ── 36차 4단계 · 계좌 간 이체 확인 카드 ─────────────────
     ★ 자동으로 안 뺀다. 후보가 0건이면 아무것도 안 띄운다.
     ★ 각 건을 따로 뺄 수 있다 — 금액이 같은 우연도 있다 */
  if (UP.banks && UP.banks.length > 1) {
    var pairs = findTransfers();
    var onN = 0;
    pairs.forEach(function (p) {
      if (xferOn(p.out)) onN++;
    });
    if (pairs.length) {
      var xsum = 0;
      pairs.forEach(function (p) {
        xsum += p.amount;
      });
      /* ★ 45차 ⑤. 여덟 건이 펼쳐진 채로 나와 결과 화면을 길게 만들었다.
         43차 원칙(숫자와 설명 최소화)이 이 줄에도 걸린다. 접어 둔다 —
         머리줄이 건수와 금액을 이미 말하므로 접혀 있어도 숨기는 게 아니다 */
      var xOpen = !!UP.open.__xfer;
      var xb = el('div', 'xferbox');
      var xh = el('div', 'xfhead tapx');
      xh.appendChild(
        document.createTextNode(
          '계좌끼리 옮긴 것으로 보이는 거래가 ' + won(pairs.length) + '건 있습니다'
        )
      );
      xh.appendChild(foldChip(xOpen));
      xh.addEventListener('click', function () {
        UP.open.__xfer = !UP.open.__xfer;
        drawResult(months);
      });
      xb.appendChild(xh);
      xb.appendChild(
        el(
          'div',
          'xfsub',
          monthSpan() +
            ' · 모두 ' +
            won(xsum) +
            '원. ' +
            '한 계좌에서 나가 다른 계좌로 들어온 같은 돈이라면 매출·지출에서 뺍니다.'
        )
      );
      var xl = el('div', 'dtl');
      if (xOpen)
        pairs.forEach(function (p) {
          var on = xferOn(p.out);
          var row = el('div', 'drow');
          var nm = el('div', 'dnm');
          nm.appendChild(
            document.createTextNode(
              dayText(p.out.at) +
                ' · ' +
                bankName(p.out.acc) +
                ' 나감 → ' +
                bankName(p.into.acc) +
                ' 들어옴'
            )
          );
          nm.appendChild(
            el('div', 'dspan', showName(p.out.payee) + ' → ' + showName(p.into.payee))
          );
          row.appendChild(nm);
          row.appendChild(el('div', 'dv num', won(p.amount)));
          var ch = el('div', 'dch');
          var bt = el('button', 'chbtn' + (on ? ' on' : ''), on ? '뺐습니다' : '이 건은 아닙니다');
          bt.type = 'button';
          bt.addEventListener('click', function () {
            if (on) dropXfer(p);
            else takeXfer([p]);
            drawResult(months);
          });
          ch.appendChild(bt);
          row.appendChild(ch);
          xl.appendChild(row);
        });
      var xa = el('div', 'addrow');
      if (onN < pairs.length) {
        var yes = el('button', 'b on', won(pairs.length) + '건 다 빼기');
        yes.type = 'button';
        yes.addEventListener('click', function () {
          takeXfer(pairs);
          drawResult(months);
        });
        xa.appendChild(yes);
      }
      if (onN) {
        var undo = el('button', 'b', '되돌리기');
        undo.type = 'button';
        undo.addEventListener('click', function () {
          pairs.forEach(dropXfer);
          drawResult(months);
        });
        xa.appendChild(undo);
      }
      xb.appendChild(xa);
      xb.appendChild(xl);
      host.appendChild(xb);
    }
  }
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawRangeStepNote(host) {
  /* ── 36차 4단계 · 기간이 다른 구간 ────────────────────────
     계좌마다 연 날짜가 다르면 합친 잔액이 계단처럼 뛴다.
     밝혀두지 않으면 「3월에 갑자기 1천만원이 늘었다」로 보인다.
     ★ 파일 이름을 그대로 쓰지 않는다 — 사장님 이름·계좌번호가 화면에 나온다 */
  if (UP.banks && UP.banks.length > 1) {
    var starts = UP.banks
      .map(function (b) {
        return b.from;
      })
      .filter(Boolean)
      .sort();
    if (starts.length > 1 && starts[0] !== starts[starts.length - 1]) {
      var early = UP.banks.filter(function (b) {
        return b.from === starts[0];
      });
      var late = UP.banks.filter(function (b) {
        return b.from !== starts[0];
      });
      var lastEarly = late
        .map(function (b) {
          return b.from;
        })
        .sort()[0];
      host.appendChild(
        el(
          'div',
          'xfnote',
          monLabel(starts[0]) +
            ' ~ ' +
            monLabel(prevMonthOf(lastEarly)) +
            '은 ' +
            early
              .map(function (b) {
                return b.bank;
              })
              .join('·') +
            '만 있습니다. ' +
            late
              .map(function (b) {
                return b.bank;
              })
              .join('·') +
            '은 ' +
            monLabel(lastEarly) +
            '부터입니다.'
        )
      );
    }
  }
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawSalesProjection(host, proj) {
  if (proj) {
    /* 예상 금액은 최대 30%까지 틀린다. 방향만 말하고 금액은 안 쓴다 */
    var pbox = el('div', 'projbox');
    pbox.appendChild(
      el(
        'div',
        null,
        '이대로 가면 ' +
          proj.mm +
          '월 매출은 ' +
          proj.prevM +
          '월 전체 ' +
          won(proj.prev) +
          '원보다 ' +
          (proj.up ? '늘어날' : '줄어들') +
          ' 것으로 보입니다'
      )
    );
    host.appendChild(pbox);
  }
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawBlockedProfitNote(months, host, d, pd, pLab) {
  /* ── 카드 아래 ── 순이익을 어떻게 읽어야 하는지 */
  /* ★ 115차 ②-3. 여기 있던 「계좌에서 나간 돈을 모두 뺀 금액」을 지웠다.
     되풀이라서가 아니라 틀린 말이라서다 — 앱은 계좌 간 이체와 대표 입출금을
     사업 지출에서 뺀다. 「계좌에서 나간 돈을 모두」가 아니다.
     ★ 물음표(WHY.profit)의 첫 줄이 이미 정확하다 —
       「사업으로 번 돈에서 사업에 쓴 돈을 뺀 금액입니다.」 거기는 안 건드린다.
     ★ 「회계상 계산하는 순이익과는 다를 수 있습니다」 안내도 그대로 둔다 */
  if (d.blocked) {
    /* ★ 118차 ⑤. 여기 있던 「전부 사업에 쓴 돈으로 보면 … 전부 매출로 보면 …」 세 줄을 지웠다.
       같은 범위를 카드 안 「분류에 따른 범위」 줄이 이미 말한다 */
    /* ★ 47차 ②. 뒤집힌 달에는 「정확해집니다」라고 쓰지 않는다 —
       거기서는 흑자·적자 자체가 안 정해진다. 「지금 몇 %」라는 사실만 적는다 */
    var np = nowPct(d);
    if (np !== null) {
      host.appendChild(
        el('div', 'nowpct', '지금 ' + np + '% — 거래처 ' + won(d.unkGroups) + '곳을 정하면 100%')
      );
    }
  } else {
    if (pd && !pd.blocked) {
      var pc = cmpLine(d.profit, pd.profit, pLab, true);
      /* ★ 115차 ②-1. 카드 밖에 서는 비교 줄에만 다른 이름을 준다.
         .cmprow 는 카드 안에서도 쓰는데 거기서는 -4px 이 맞다 (윗줄에 붙어야 한다).
         카드 밖에서는 상관없는 문장 밑에 붙어서 4px 겹쳤다.
         ★ cmpRow 함수 자체는 안 고친다 — 고치면 카드 안 쓰임이 같이 움직인다 */
      if (pc) {
        var pr = cmpRow(months, pc, 'profit');
        pr.classList.add('cmpfree');
        host.appendChild(pr);
      }
    }
    if (d.unknownN) {
      var b2 = el('div', 'resnote');
      /* ★ 46차 ④. 예전에는 세 줄이었고 둘째 줄이 첫째 줄과 같은 말이었다 —
         「…흑자입니다」 다음에 「그래서 흑자인 건 확실합니다」. 지운다 */
      /* ★ 115차 ②-5. 「어떻게 정해도 이번 달은 흑자입니다」를 고친다.
         확인한 것보다 넓게 말하고 있었다 — 확인한 것은
         「지금 자료에서 안 정한 거래를 어느 쪽으로 정해도 계좌 순이익의 부호가
         안 바뀐다」까지다. 이번 달 남은 기간도, 회계상 흑자도 아니다.
         ★ 「흑자」·「적자」·「이번 달」을 안 쓴다.
         ★ 「미분류 거래」 대신 「아직 안 정한 거래」로 적는다 —
           화면 전체가 그 이름으로 통일돼 있다 (49차 이름 통일). 뜻은 같다 */
      /* ★ 115차 보정. 0원 경계가 빠져 있었다 — lo = 0 도 lo >= 0 이고,
         lo < 0 이어도 hi = 0 일 수 있다. 그 두 자리에서 「0원보다 크다/작다」가 거짓이다.
           lo = 0 < hi    안 정한 것을 전부 지출로 보면 순이익이 정확히 0원이다
           lo < 0 = hi    전부 매출로 봐도 순이익이 정확히 0원이다
         ★ 갈래 조건(d.lo >= 0)은 그대로 둔다. 판단이 아니라 표현만 고친다 */
      b2.appendChild(
        el(
          'div',
          null,
          '지금 자료에서는 아직 안 정한 거래를 어느 쪽으로 정해도 계좌 순이익이 0원 ' +
            (d.lo >= 0 ? '이상입니다.' : '이하입니다.')
        )
      );
      /* ★ 115차 ②-4. 「금액만 … 사이에서 달라집니다」를 갈래를 따져 뺀다.
         일괄로 지우면 안 된다 — 갈래마다 카드가 말해주는 것이 다르다.
           uOut>0 · uIn=0   카드에 순이익(=hi)과 errline 의 lo 가 다 있다 → 완전한 중복. 뺀다
           uOut>0 · uIn>0   errline 이 lo 만 말한다. hi 가 화면 어디에도 없다 → 남긴다
           uOut=0 · uIn>0   errline 이 없다. 카드에 순이익(=lo)만 있다 → 남긴다
         ★ 글자는 한 글자도 안 바꾼다. 나오는 조건만 좁힌다 */
      if (!(d.uOut > 0 && d.uIn === 0)) {
        /* 이 자리는 원 단위가 필요 없다 */
        var l3 = el('div');
        l3.appendChild(document.createTextNode('금액만 '));
        l3.appendChild(wonB(d.lo));
        l3.appendChild(document.createTextNode(' ~ '));
        l3.appendChild(wonB(d.hi));
        l3.appendChild(document.createTextNode(' 사이에서 달라집니다.'));
        b2.appendChild(l3);
      }
      host.appendChild(b2);
    }
  }
}

/* drawResultInner 에서 뺀 부분 (B-4) */
function drawSaveFailNote(host) {
  /* ★ 112차 ③. 저장이 안 됐으면 그 자리에서 알린다 — 다음에 열었을 때
     「왜 아무것도 없지」가 되지 않게 한다.
     ★ 「현재 분석은 계속 볼 수 있다」는 참이다. 올려둔 것은 이 창이 살아 있는 동안
       메모리에 그대로 있고, 이 화면도 그 값으로 그려져 있다. 창을 닫으면 사라진다.
     ★ 「분류는 저장됐습니다」를 무조건 붙이지 않는다 — 거래처 분류가 남았는지는
       PICK_SAVED 로 따로 확인하고, 그것도 실패했으면 그 사실을 적는다.
     ★ 「매장 몇 개까지 저장됩니다」 같은 약속은 안 적는다. 브라우저마다 다르다 */
  if (!UP.demo && SAVE_STATE !== 'ok') {
    var sv = el('div', 'upstat');
    sv.style.marginTop = '10px';
    if (SAVE_STATE === 'kept') {
      sv.appendChild(el('b', null, '새 거래내역을 저장하지 못했습니다.'));
      sv.appendChild(document.createElement('br'));
      sv.appendChild(document.createTextNode('이전 저장본은 유지됩니다.'));
    } else {
      sv.appendChild(el('b', null, '거래내역을 이 브라우저에 저장하지 못했습니다.'));
      sv.appendChild(document.createElement('br'));
      sv.appendChild(
        document.createTextNode(
          '현재 분석은 계속 볼 수 있지만, 다음에 이용할 때 파일을 다시 올려야 합니다.'
        )
      );
    }
    if (!PICK_SAVED) {
      sv.appendChild(document.createElement('br'));
      sv.appendChild(document.createTextNode('정하신 거래처 분류도 남기지 못했습니다.'));
    }
    host.appendChild(sv);
  }
}

/* ── 36차 F-3·4·5 ── 안 묻고 넘긴 것을 반드시 화면에 드러낸다.
     이 셋이 이 선택의 안전장치다. 숨기면 사업에 쓴 돈이 조용히 줄어든다.
     ★ 파일 전체 기간 합계다. 기간을 안 적으면 한 달치로 읽히신다 (원칙 3) */
function drawSkippedSmall(sk, months, host, inUnset) {
  if (!sk.n) return;
  var skOpen = !!UP.open.__skip;
  var sr = el('div', 'skipline');
  var s1 = el('div', 'sk1 tapx');
  if (inUnset) {
    s1.appendChild(document.createTextNode('앱이 넘긴 작은 거래 · '));
  }
  s1.appendChild(document.createTextNode(monthSpan() + ' · ' + won(sk.n) + '곳 · '));
  s1.appendChild(el('b', null, won(sk.sum) + '원'));
  var outAll = 0;
  (UP.payees || []).forEach(function (g) {
    outAll += g.outSum;
  });
  if (outAll > 0) {
    s1.appendChild(document.createTextNode('(나간 돈의 ' + pctStr(sk.sum / outAll) + ')'));
  }
  s1.appendChild(
    document.createTextNode(
      '은 묻지 않고 「' + sayCat(ASK_SKIP_CAT) + '」' + ro(sayCat(ASK_SKIP_CAT)) + ' 두었습니다'
    )
  );
  s1.appendChild(foldChip(skOpen));
  s1.addEventListener('click', function () {
    UP.open.__skip = !UP.open.__skip;
    drawResult(months);
  });
  sr.appendChild(s1);
  /* F-5. 그 금액이 「사업에 쓴 돈」의 10%를 넘으면 한 줄 더.
       ★ 41차 6번. 분모를 윗줄과 같은 기간으로 맞춘다 — 윗줄은 전 기간 합계인데
         여기만 「그 달」이었다. 온보딩을 거의 안 한 상태에서는 1726%까지 갔다.
       ★ 세 자리 %는 어떤 경우에도 뜻이 없다. 분모보다 크면 비율을 안 쓰고 금액만 말한다 */
  var costSpan = costAllSpan();
  if (costSpan > 0 && sk.sum / costSpan > 0.1) {
    var big = sk.sum >= costSpan;
    sr.appendChild(
      el(
        'div',
        'sk2',
        big
          ? '같은 기간 사업에 쓴 돈 ' + won(costSpan) + '원보다 큰 금액입니다. 한 번 펼쳐보세요'
          : '같은 기간 사업에 쓴 돈 ' +
              won(costSpan) +
              '원의 ' +
              pctStr(sk.sum / costSpan) +
              '입니다. 한 번 펼쳐보세요'
      )
    );
  }
  host.appendChild(sr);
  /* F-4. 펼치면 금액 큰 순으로 보여준다. 정하기는 한 단추로 분류 화면에서 이어 한다. */
  if (skOpen) {
    var goSmallWrap = el('div', 'ckbtns');
    var goSmall = el('button', 'b on', '작은 거래 정하러 가기');
    goSmall.type = 'button';
    goSmall.addEventListener('click', function () {
      unskipAllAsk();
      useScreen('거래처 더 찍기');
      moreFromResult();
    });
    goSmallWrap.appendChild(goSmall);
    host.appendChild(goSmallWrap);
    var box = el('div', 'dtl');
    UP.skipped
      .slice()
      .sort(function (a, b) {
        return b.outSum - a.outSum;
      })
      .slice(0, 40)
      .forEach(function (g) {
        var row = el('div', 'drow');
        var nm = el('div', 'dnm');
        nm.appendChild(document.createTextNode(showName(g.name)));
        nm.appendChild(el('div', 'dspan', sideSpan(g, false) + ' · ' + g.outN + '건'));
        row.appendChild(nm);
        row.appendChild(el('div', 'dv num', won(g.outSum)));
        box.appendChild(row);
      });
    if (UP.skipped.length > 40) {
      box.appendChild(
        el(
          'div',
          'subnote',
          '금액이 큰 40곳만 보여드립니다 (전부 ' + won(UP.skipped.length) + '곳)'
        )
      );
    }
    host.appendChild(box);
  }
}

/* ── 86차 ⑨ · 「사업에 쓴 돈」에 직접 넣기 — 항목명·금액·날짜 ──────────
     ⑧에서 들어온 쪽 단추를 없애면 나간 쪽까지 직접 넣을 길이 막힌다.
     그래서 나간 쪽은 없애지 않고 제대로 다시 만든다 (개발자 지시).
     ★ 들어온 쪽은 「현금매출」 하나로 충분하지만 나간 쪽은 무엇을 적을지
       미리 알 수 없다 — 그래서 항목 이름도 대표님이 적으신다.
     ★ 계산은 새로 만들 것이 없다. 여기 적은 금액은 manualSum('out') 으로
       이미 manOut 에 배선돼 있어 「사업에 쓴 돈」에 더해진다.
       계좌 잔액·검산(입금·출금 합계)·일별 흐름 막대에는 안 들어간다 —
       계좌에서 나간 돈이 아니다. 들어온 쪽과 같은 규칙이다.
     ★ 아무것도 안 적으면 숫자가 한 자리도 안 움직인다 (83차 ⑥과 같은 까닭) */
function drawOutManual(months, host, isFull) {
  var m = UP.month;
  var 진행 = !isFull;
  var 끝날 = 진행 ? lastDayIn(m) : monthDays(m);
  var 고침 = UP.open.__outEdit || '';
  /* ★ 87차 ③. 방금 「넣기」를 누른 항목은 이 판에서만 펼친 채로 둔다 —
       넣자마자 접혀 사라지면 「들어갔나?」 하게 된다.
       다음에 화면을 다시 그릴 때는 접힌다 (여기서 한 번 쓰고 지운다) */
  var 방금 = UP.open.__manJust || '';
  UP.open.__manJust = '';
  manualItems('out').forEach(function (it) {
    var 날들 = manualDays(m, it.id);
    var 달합 = manualAmt(m, it.id);
    /* ★ 87차 ③. 오른쪽에 그 항목의 합계. 세는 자는 현금매출과 한 글자도 같다 */
    var 합 =
      (진행 ? 0 : 달합) +
      날들.reduce(function (s, x) {
        return s + (진행 && x.day > 끝날 ? 0 : +x.amt || 0);
      }, 0);
    /* ★ 87차 ③. 위 항목들(인건비·월세·…)과 같은 줄 모양이다 —
         혼자만 늘 펼쳐져 있어서 눈에 걸렸다. 처음에는 접혀 있다 */
    var 열쇠 = 'manopen:' + it.id;
    var 폄 = !!UP.open[열쇠] || 방금 === it.id;
    var head = el('div', 'orow manrow manitem tapx');
    var l = el('div', 'lab', '　' + it.name);
    l.appendChild(el('span', 'manmark', ' ✎'));
    l.appendChild(el('span', 'chev', 폄 ? '▴' : '▾'));
    head.appendChild(l);
    head.appendChild(el('div', 'v num', 합 ? won(합) : ''));
    head.addEventListener('click', function () {
      UP.open[열쇠] = !폄;
      drawResult(months);
    });
    host.appendChild(head);
    if (!폄) return; /* 접으면 날짜 줄도 수정·지우기도 안 보인다 */
    날들.forEach(function (x) {
      var 열쇠 = it.id + '|' + x.day + '|' + x.amt;
      if (고침 === 열쇠) {
        /* ★ 86차 ⑤. 그 줄이 추가 칸과 같은 모양으로 바뀐다 — 이미 채워진 채로 */
        drawEntryBox(months, host, {
          금액: x.amt,
          날: x.day,
          끝날: 끝날,
          진행: 진행,
          넣기: function (nm, v, 날) {
            넣어두기(m, it.id, v, 날, x);
            UP.open.__outEdit = '';
          },
          닫기: function () {
            UP.open.__outEdit = '';
          }
        });
        return;
      }
      날줄(months, host, m, it.id, x, 열쇠, function (k) {
        /* 고치는 동안 그 항목이 접혀 사라지면 고칠 칸도 같이 사라진다 */
        UP.open['manopen:' + it.id] = true;
        UP.open.__outEdit = k;
        UP.open.__outAdd = false;
      });
    });
    /* 옛 저장분 — 날짜 없이 달로만 적으신 것. 있을 때만 보인다 (규칙 7) */
    if (달합) 달전체줄(host, months, m, it.id, 달합, 진행);
    /* ★ 87차 ③. 항목을 통째로 지우는 단추는 펼친 안쪽에 둔다.
         건 하나를 지우는 「지우기」와 헷갈리지 않게 이름을 갈라 둔다 */
    var del = el('div', 'manitemdel');
    var rm = el('button', 'chbtn', '항목 지우기');
    rm.type = 'button';
    rm.addEventListener('click', function () {
      manualRemove(it.id);
      drawResult(months);
    });
    del.appendChild(rm);
    host.appendChild(del);
  });
  if (고침) return; /* 고치는 중에는 새로 넣는 칸을 안 연다 */
  if (UP.open.__outAdd) {
    drawEntryBox(months, host, {
      이름칸: true,
      끝날: 끝날,
      진행: 진행,
      넣기: function (nm, v, 날) {
        /* 같은 이름을 또 적으시면 새 항목을 안 만들고 그 항목에 붙인다 */
        var id = manualFind(nm, 'out') || manualAdd(nm, 'out');
        넣어두기(m, id, v, 날, null);
        UP.open.__manJust = id; /* ★ 87차 ③. 방금 넣은 것은 펼쳐서 보여드린다 */
      },
      닫기: function () {
        UP.open.__outAdd = false;
      }
    });
    return;
  }
  var add = el('button', 'oblink', '＋ 항목 추가');
  add.type = 'button';
  add.addEventListener('click', function () {
    UP.open.__outAdd = true;
    drawResult(months);
  });
  host.appendChild(add);
}

/* 직접 넣기 칸. 끝난 달에만 나온다 (규칙 2) */
/* ── 83차 ①②③ · 「현금매출」 한 줄과 그 아래 날짜별 목록 ──────────
     ★ 병원·치과는 한 건에 3천만원씩 들어오는 경우가 있어 날짜가 필요하다.
       식당·카페는 매출의 2~3%라 달에 한 번으로 충분하다 — 둘 다 되게 둔다.
     ★ 날짜를 안 적으면 그 달 전체로 친다 (amounts). 적으면 days 로 간다.
     ★ 진행 중인 달에는 오늘까지만, 그리고 날짜 있는 것만 받는다 (83차 ④) */
function drawCashRow(months, host, isFull) {
  var m = UP.month;
  var 진행 = !isFull;
  var 끝날 = 진행 ? lastDayIn(m) : monthDays(m);
  var 달합 = manualAmt(m, CASH_ID);
  var 날들 = manualDays(m, CASH_ID);
  var 합 =
    (진행 ? 0 : 달합) +
    날들.reduce(function (s, it) {
      return s + (진행 && it.day > 끝날 ? 0 : +it.amt || 0);
    }, 0);
  var open = !!UP.open.__cash;
  var row = el('div', 'orow manrow tapx');
  var lab = el('div', 'lab', '　' + CASH_NAME);
  lab.appendChild(el('span', 'manmark', ' ✎'));
  lab.appendChild(el('span', 'chev', open ? '▴' : '▾'));
  row.appendChild(lab);
  row.appendChild(el('div', 'v num', 합 ? won(합) : ''));
  row.addEventListener('click', function () {
    UP.open.__cash = !UP.open.__cash;
    drawResult(months);
  });
  host.appendChild(row);
  if (!open) return;
  /* 날짜별로 적으신 것 */
  var 고침 = UP.open.__cashEdit || '';
  날들.forEach(function (it) {
    var 열쇠 = it.day + '|' + it.amt;
    if (고침 === 열쇠) {
      /* ★ 86차 ⑤. 그 줄이 추가 칸과 같은 모양으로 바뀐다 — 금액과 날짜가 채워진 채로 */
      drawEntryBox(months, host, {
        금액: it.amt,
        날: it.day,
        끝날: 끝날,
        진행: 진행,
        넣기: function (nm, v, 날) {
          넣어두기(m, CASH_ID, v, 날, it);
          UP.open.__cashEdit = '';
        },
        닫기: function () {
          UP.open.__cashEdit = '';
        }
      });
      return;
    }
    날줄(months, host, m, CASH_ID, it, 열쇠, function (k) {
      UP.open.__cashEdit = k;
      UP.open.__cashAdd = false;
    });
  });
  /* 날짜 없이 달로만 적으신 것 — 끝난 달에서만 받는다 (83차 ④-3) */
  달전체줄(host, months, m, CASH_ID, 달합, 진행);
  /* ★ 86차 ④. 「＋ 추가」는 열림 상태만 켠다. 상자는 그리는 자가 낸다 —
       그래야 「넣기」 뒤에도 상자가 그대로 남는다 */
  if (UP.open.__cashAdd && !고침) {
    drawEntryBox(months, host, {
      끝날: 끝날,
      진행: 진행,
      넣기: function (nm, v, 날) {
        넣어두기(m, CASH_ID, v, 날, null);
      },
      닫기: function () {
        UP.open.__cashAdd = false;
      }
    });
  } else if (!고침) {
    var add = el('button', 'oblink', '＋ 추가');
    add.type = 'button';
    add.addEventListener('click', function () {
      UP.open.__cashAdd = true;
      drawResult(months);
    });
    host.appendChild(add);
  }
}

/* 날짜 없이 달로만 적으신 것 — 옛 저장분이라 있을 때만 보인다 (규칙 7) */
function 달전체줄(host, months, m, id, 달합, 진행) {
  if (진행) {
    if (달합) {
      /* 끝난 뒤에 세겠다는 것을 밝힌다 — 조용히 빼면 숫자가 안 맞아 보인다 */
      host.appendChild(
        el('div', 'subnote', '날짜 없이 적으신 ' + won(달합) + '원은 이 달이 끝나면 더합니다')
      );
    }
    return;
  }
  var r2 = el('div', 'orow cashday');
  r2.appendChild(el('div', 'lab', '　　날짜 없이 이 달 전체'));
  var inp = document.createElement('input');
  inp.type = 'text';
  inp.inputMode = 'numeric';
  inp.className = 'maninput';
  inp.value = 달합 ? won(달합) : '';
  inp.placeholder = '0';
  moneyLive(inp); /* ★ 85차 ②. 치는 동안 콤마가 붙는다 */
  inp.addEventListener('change', function () {
    manualSet(m, id, moneyRead(inp.value));
    drawResult(months);
  });
  r2.appendChild(inp);
  r2.appendChild(el('span', 'fixlab', '원'));
  host.appendChild(r2);
}

/* 넣기·고치기가 실제로 저장하는 자리. 날 0 은 「날짜 없이 이 달 전체」다.
     고칠 때는 지우고 다시 넣는다 — manualDayAdd 가 날짜순으로 꽂아 주므로
     줄 차례가 안 튄다 (86차 ⑤) */
function 넣어두기(m, id, v, 날, 옛것) {
  if (옛것) manualDayRemove(m, id, 옛것.day, 옛것.amt);
  if (날) manualDayAdd(m, id, 날, v);
  else manualSet(m, id, manualAmt(m, id) + v);
}

/* 날짜별로 적으신 한 줄 — [수정] [지우기] (86차 ⑤) */
function 날줄(months, host, m, id, x, 열쇠, 고치기) {
  var r = el('div', 'orow cashday');
  r.appendChild(el('div', 'lab', '　　' + monNum(m) + ' ' + x.day + '일'));
  r.appendChild(el('div', 'v num', won(x.amt)));
  var ed = el('button', 'chbtn', '수정');
  ed.type = 'button';
  ed.addEventListener('click', function () {
    고치기(열쇠);
    drawResult(months);
  });
  r.appendChild(ed);
  var del = el('button', 'chbtn', '지우기');
  del.type = 'button';
  del.addEventListener('click', function () {
    manualDayRemove(m, id, x.day, x.amt);
    drawResult(months);
  });
  r.appendChild(del);
  host.appendChild(r);
}

/* 금액·날짜(·항목 이름) 한 줄. opt.넣기(이름, 금액, 날) 이 참을 내면 넣은 것이다 */
function drawEntryBox(months, host, opt) {
  var m = UP.month;
  var box = el('div', 'catpanel cashadd');
  var nameInp = null;
  if (opt.이름칸) {
    nameInp = document.createElement('input');
    nameInp.type = 'text';
    nameInp.className = 'maninput nameinput';
    nameInp.placeholder = '항목 이름';
    nameInp.value = opt.이름 || '';
    box.appendChild(nameInp);
  }
  var amt = document.createElement('input');
  amt.type = 'text';
  amt.inputMode = 'numeric';
  amt.className = 'maninput';
  amt.placeholder = '금액';
  if (opt.금액) amt.value = won(opt.금액);
  moneyLive(amt); /* ★ 85차 ②. 치는 동안 콤마가 붙는다 */
  var 금액칸 = el('div', 'fixgrp');
  금액칸.appendChild(amt);
  /* ★ 85차 ②. 「원」은 칸 바깥에 글자로 둔다 — 안에 넣으면 지울 때 같이 지워진다 */
  금액칸.appendChild(el('span', 'fixlab', '원'));
  box.appendChild(금액칸);
  var day = document.createElement('input');
  day.type = 'number';
  day.className = 'maninput cashdayin';
  day.min = '1';
  day.max = opt.끝날;
  if (opt.날) day.value = opt.날;
  /* ★ 85차 ③. 앞에 지금 보고 있는 달, 뒤에 「일」. 달을 옮기면 앞의 달도 같이 바뀐다 */
  var 날짜칸 = el('div', 'fixgrp');
  날짜칸.appendChild(el('span', 'fixlab', monNum(m)));
  날짜칸.appendChild(day);
  날짜칸.appendChild(el('span', 'fixlab', '일'));
  box.appendChild(날짜칸);
  box.appendChild(
    el(
      'div',
      'cashhint',
      opt.진행
        ? '오늘까지만 넣을 수 있습니다 (1~' + opt.끝날 + '일)'
        : '비워도 됩니다 — 비우면 이 달 전체로 칩니다'
    )
  );
  var msg = el('div', 'subnote', '');
  var ok = el('button', 'upbtn on', '넣기');
  ok.type = 'button';
  ok.addEventListener('click', function () {
    var nm = nameInp ? String(nameInp.value).trim() : null;
    if (nameInp && !nm) {
      msg.textContent = '항목 이름을 적어주세요.';
      return;
    }
    var v = moneyRead(amt.value); /* ★ 85차 ②. 예전 식 그대로다 — 콤마는 걷힌다 */
    if (!v) {
      msg.textContent = '금액을 적어주세요.';
      return;
    }
    var 잰것 = 날짜재기(m, opt.진행, opt.끝날, String(day.value).replace(/[^0-9]/g, ''));
    if (잰것.말) {
      msg.textContent = 잰것.말;
      return;
    }
    opt.넣기(nm, v, 잰것.day);
    drawResult(months);
  });
  /* ★ 86차 ④. 「취소」가 아니라 「닫기」다 — 넣은 것을 무르는 것이 아니라 칸을 접는 것이다 */
  var no = el('button', 'upbtn plain', '닫기');
  no.type = 'button';
  no.addEventListener('click', function () {
    opt.닫기();
    drawResult(months);
  });
  box.appendChild(ok);
  box.appendChild(no);
  box.appendChild(msg);
  host.appendChild(box);
  /* 이어서 바로 치실 수 있게 — 화면은 안 움직인다 */
  try {
    (nameInp || amt).focus({ preventScroll: true });
  } catch (e) {}
}

/* 같은 이름을 또 적으시면 새 항목을 안 만들고 그 항목에 붙인다 —
     안 그러면 「월세」가 달마다 새로 생겨 줄이 쌓인다 (86차 ⑨) */
function manualFind(name, side) {
  var t = String(name).trim();
  var f = ((UP.manual && UP.manual.items) || []).filter(function (it) {
    return it.side === side && String(it.name).trim() === t;
  })[0];
  return f ? f.id : null;
}

/* ── 86차 ④⑤⑨ · 직접 넣는 칸을 하나로 ────────────────────────────
     들어온 쪽(현금매출)과 나간 쪽이 같은 칸·같은 규칙을 쓴다.
     ★ 예전에는 「＋ 추가」를 누르면 그 자리에서 상자를 만들어 붙였다.
       그래서 「넣기」로 다시 그리면 상자가 사라져, 하나 더 넣으려면
       올라와서 또 눌러야 했다 — 여러 건 넣는 것이 이 기능의 뜻인데 그게 막혔다.
       이제 열림·고침을 UP.open 에 두고 그리는 자가 상자를 낸다.
       그래서 넣은 뒤에도 상자가 그대로 남고 칸만 비워진다.
     ★ 화면은 안 움직인다 — drawResult 가 스크롤 자리를 지키고(56차),
       칸으로 되돌아가는 focus 도 preventScroll 로 부른다.
     ★ 저장은 fc.manual 의 items·amounts·days 그대로다. 새 칸을 안 만든다 */

/* 날짜 막는 규칙 — 들어온 쪽과 나간 쪽이 같은 자를 쓴다.
     말은 83차에서 통과한 그대로다. 한 글자도 안 바꾼다 */
function 날짜재기(m, 진행, 끝날, dtxt) {
  if (!dtxt) {
    /* ★ 83차 ④-3. 진행 중인 달에는 날짜 없는 값을 안 받는다 */
    if (진행) return { 말: '이 달은 아직 진행 중입니다. 며칠인지 적어주세요.' };
    return { day: 0 }; /* 0 = 날짜 없이 이 달 전체 */
  }
  var dd = +dtxt;
  if (dd < 1 || dd > 끝날) {
    return {
      말: 진행
        ? '오늘까지만 넣을 수 있습니다 — 1일에서 ' + 끝날 + '일 사이로 적어주세요.'
        : monNum(m) + '은 ' + 끝날 + '일까지입니다.'
    };
  }
  return { day: dd };
}

function drawSideParts(d, months, host, 회색모음, pd, pLab, keys, side) {
  if (d.blocked) return; /* 안 정한 게 많으면 숫자를 안 보여준다 */
  if (side === 'in') {
    /* 이 둘을 더하면 윗줄이다 */
    /* ★ 51차 ①. 여기가 안 열렸다. subRow 는 바로 옆에 있는데
         「들여쓴 작은 줄. 각자 눌려서 각자 열린다」라고 주석까지 달아두고
         정작 calcRow(그냥 글줄)를 쓰고 있었다.
       ★ 열쇠는 항목 이름 그대로 쓴다 — drawDetail 이 UP.open[cat] 으로
         몇 개를 보일지도 정하기 때문에, 앞을 붙여 갈면 열려도 0개가 된다.
         keepRow 는 이미 'keep:…' 로 갈라져 있고 tapLine 은 아무도 안 부른다 */
    subRow(months, host, '매출', '매출', won(d.sales), null, function () {
      drawDetail(host, d, '매출');
    });
    if (d.otherIn) {
      /* drawInDetail 은 만들어만 두고 아무도 안 부르고 있었다.
           UP.open 을 안 보므로 subRow 가 열렸을 때만 부르면 그대로 된다.
           항목이 아니라서 열쇠는 __otherin 으로 갈라 둔다 */
      subRow(months, host, '그 밖의 입금', '__otherin', won(d.otherIn), null, function () {
        drawInDetail(host, d);
      });
      /* ★ 87차 ②. 회색 줄은 모아서 「자세히」 뒤로 넣는다 (회색펴기가 낸다) */
      회색줄(
        회색모음,
        host,
        el(
          'div',
          'subnote',
          '매출로 정하지 않으신 입금입니다. 환급·되돌려받은 돈이 여기 들어갑니다'
        )
      );
      /* 매출의 10%를 넘으면 한 번 짚어드린다 — 매출로 정하셔야 할 것이 섞여 있을 수 있다.
           ★ 붉은 줄은 안 접는다. 짚어드리는 말이라 접으면 뜻이 없다 */
      if (d.sales > 0 && d.otherIn / d.sales > 0.1) {
        host.appendChild(
          el('div', 'subnote warn', '매출로 정하지 않으신 입금이 큽니다. 확인해보세요')
        );
      }
    }
    if (d.salesOut) {
      회색줄(
        회색모음,
        host,
        el('div', 'subnote', '매출 환불 ' + won(d.salesOut) + '원은 이미 매출에서 뺐습니다')
      );
    }
    if (pd) {
      var ci = cmpLine(d.sales + d.otherIn, pd.sales + pd.otherIn, pLab, true);
      if (ci) 회색줄(회색모음, host, el('div', 'subnote', ci.full));
    }
    /* ★ 51차 ①. 무조건 부르던 것을 지운다. 이제 subRow 가 열렸을 때만 부른다 */
    return;
  }
  /* ★ 54차 ⑥. 원칙 4 — 비율에는 분모를 붙인다.
       항목마다 분모를 쓰면 아홉 줄이 두 배가 된다. 머리줄 아래 한 번만 적는다.
       ★ 비율을 못 내는 달에는 왜 없는지를 그 자리에 적는다 —
         빈 칸만 남기면 「왜 안 나오지」가 된다 */
  host.appendChild(
    el(
      'div',
      'subnote',
      d.sales > 0
        ? '아래 %는 매출 ' + won(d.sales) + '원 기준입니다'
        : '아직 다 정하지 않아 비율을 내지 않았습니다'
    )
  );
  /* 나간 쪽 — 항목별.
       ★ 43차. 금액 큰 순이 아니라 늘 같은 순서다.
         매달 자리가 바뀌면 지난달과 견줄 수가 없다 */
  keys.forEach(function (k) {
    subRow(
      months,
      host,
      k,
      k,
      won(d.cats[k]),
      null,
      function () {
        drawDetail(host, d, k);
      },
      pctCell(d, d.cats[k])
    );
  });
  /* 원가율 — 「제일 보고 싶은 건 원가」라고 하셨다.
       원칙 4대로 분모 금액을 같이 적는다 */
  var food = (d.cats[baseName('식자재')] || 0) + (d.cats[baseName('주류·음료')] || 0);
  if (food > 0 && d.sales > 0) {
    /* ★ 62차 ②. 업종마다 이름도 재료도 다르다. 1년치 표와 같은 이름을 쓴다 (49차) */
    var 재료이름 =
      baseName('식자재') + (isHidden(baseName('주류·음료')) ? '' : '·' + baseName('주류·음료'));
    /* ★ 87차 ②. 나간 쪽 회색 줄도 「자세히」 안으로 — 두 자리의 모양을 맞춘다 */
    회색줄(
      회색모음,
      host,
      el(
        'div',
        'subnote',
        tradeInfo().비율이름 +
          ' ' +
          pctStr(food / d.sales) +
          ' ' +
          '(' +
          재료이름 +
          ' ' +
          won(food) +
          '원 ÷ 매출 ' +
          won(d.sales) +
          '원)'
      )
    );
  }
  if (pd) {
    var co = cmpLine(d.cost, pd.cost, pLab, false);
    if (co) 회색줄(회색모음, host, el('div', 'subnote', co.full));
  }
}

function 회색줄(회색모음, host, node) {
  if (회색모음) 회색모음.push(node);
  else host.appendChild(node);
}

/* 눌러서 안을 펼쳐 보는 칸 */
function boxRow(months, host, key, label, value, note, draw, cls, whyId) {
  var open = !!UP.open[key];
  var row = el('div', 'orow tapx' + (cls ? ' ' + cls : ''));
  var lab = el('div', 'lab', label);
  lab.appendChild(el('span', 'chev', open ? '▴' : '▾'));
  if (note) lab.appendChild(el('span', 'gcount', note));
  if (whyId)
    lab.appendChild(
      whyMark(whyId, function () {
        drawResult(months);
      })
    );
  row.appendChild(lab);
  row.appendChild(el('div', 'v num', value));
  row.addEventListener('click', function () {
    UP.open[key] = !UP.open[key];
    drawResult(months);
  });
  host.appendChild(row);
  /* ? 상자가 먼저다 — 낱말 뜻을 보고 나서 안을 편다 */
  if (whyId && whyOpen(whyId)) host.appendChild(whyBox(whyId));
  if (open) draw();
}

/* 「나간 돈 75% 증가」의 차이가 전부 사장님 인출일 때가 있다.
     비교 줄의 분모는 안 건드리고, 제외분을 뺀 %를 한 줄 덧붙인다.
     ① 비교 줄이 없는 달에는 안 그린다 — 같은 숫자를 두 번 말하게 된다
     ② 두 %가 3%p 미만이면 소음이다
     ③ 방향이 뒤집히면 문턱과 상관없이 그린다 */

/* ══ 43차 · 위에서 아래로 한 번에 읽히게 ══════════════════
     ★ 왜 다시 짰는가. 만든 사람이 1년치 표를 보고 자기 숫자를 못 읽었다 —
       「매출 5500 − 지출 5100인데 왜 순이익 1000?」. 답은 「그 밖의 입금」이었고
       그 줄은 화면에 있었다. 있는데 안 읽혔다.
     ★ 그래서 순이익 바로 위 두 줄이 순이익을 만드는 두 값이 되게 놓는다.
         들어온 돈(매출 + 그 밖의 입금) − 사업에 쓴 돈 = 순이익
       세 줄이 그대로 뺄셈이라 더 설명할 것이 없다.
     ★ 계좌로 들어오고 나간 전부(inTotal·outTotal)는 이 뺄셈의 값이 아니다.
       그건 「계좌 잔액」을 펼치면 나온다 — 검산은 거기서 그대로 돈다.
     ★ 접힌 화면에는 한 줄에 숫자 하나, 설명 없음. 설명은 펼쳤을 때만 */

/* 어느 쪽 줄인지로 이름을 정한다. 항목 이름만 믿으면 뜻이 반대가 된다 —
     같은 거래처가 넣기도 하고 가져가기도 한다 */
function keepSideName(cat, side) {
  /* 계좌 간 이체는 나간 쪽과 들어온 쪽이 같은 이름이라
       두 줄이 똑같아 보인다. 방향을 붙여 갈라 부른다 (36차 4단계) */
  if (cat === XFER_PART) {
    return XFER_PART + (side === '입금' ? ' (들어옴)' : ' (나감)');
  }
  return sideOf(cat, side === '입금');
}

function cmpRow(months, c, key) {
  var open = UP.cmpOpen[key];
  var s = el('div', 'cmprow tapx ' + c.cls, open ? c.full : c.short);
  s.addEventListener('click', function () {
    if (open) delete UP.cmpOpen[key];
    else UP.cmpOpen[key] = true;
    drawResult(months);
  });
  return s;
}

/* 매출·지출에 안 넣는 돈 — 항목 제 이름을 쓰고 꼬리표만 단다 */
/* ★ 36차. 다른 항목처럼 펼쳐진다. 안 그러면 잘못 찍은 것을 되돌릴 길이
     「처음부터 다시 정하기」뿐이다 — [항목 바꾸기]가 펼친 줄에 붙기 때문이다.
     partKey 는 monthNumbers 가 담은 이름이고, SKIP_PART 면 F가 넘긴 몫이다 */
function keepRow(d, months, host, name, amount, partKey, isIn) {
  var skipOnly = partKey === SKIP_PART;
  var cat = skipOnly ? baseName(ASK_SKIP_CAT) : partKey;
  if (partKey === XFER_PART) cat = XFER_PART; /* 이체는 줄 단위로 거른다 */
  var key = 'keep:' + partKey + ':' + (isIn ? 'in' : 'out');
  var open = !!UP.open[key];
  var row = el('div', 'orow tapx');
  var lb = el('div', 'lab', '　' + name);
  lb.appendChild(el('span', 'chev', open ? '▴' : '▾'));
  lb.appendChild(el('span', 'keeptag', '사업 외'));
  var cnt = keepCount(d, cat, isIn, skipOnly);
  if (cnt) lb.appendChild(el('span', 'gcount', cnt));
  row.appendChild(lb);
  row.appendChild(el('div', 'v num', won(amount)));
  row.appendChild(el('div', 'p num', ''));
  row.addEventListener('click', function () {
    if (UP.open[key]) delete UP.open[key];
    else UP.open[key] = true;
    drawResult(months);
  });
  host.appendChild(row);
  if (open)
    drawKeepDetail(host, d, cat, isIn, skipOnly, function () {
      drawResult(months);
    });
}

/* 들여쓴 작은 줄. 각자 눌려서 각자 열린다 */
function subRow(months, host, label, key, value, sub, draw, pct) {
  var row = el('div', 'orow tapx');
  var lb = el('div', 'lab', '　' + label);
  lb.appendChild(el('span', 'chev', UP.open[key] ? '▴' : '▾'));
  if (sub) lb.appendChild(el('span', 'gcount', sub));
  row.appendChild(lb);
  row.appendChild(el('div', 'v num', value));
  row.appendChild(el('div', 'p num', pct || ''));
  row.addEventListener('click', function () {
    if (UP.open[key]) delete UP.open[key];
    else UP.open[key] = true;
    drawResult(months);
  });
  host.appendChild(row);
  if (UP.open[key]) draw(host);
}

/* ★ 54차 ⑥ · 매출 대비 비율.
   ★ 42차·43차 규칙은 그대로다 — 세 자리 %는 뜻이 없다.
   ★ 67차 ②. 매출보다 큰 항목을 예전에는 「N배」로 적었는데, 배수도 화면에서 뺀다.
     그 자리에는 사실만 놓는다 — 「매출 초과」. 얼마나 넘었는지는 바로 옆 금액 칸이 말한다.
     여러 항목의 합이 100%를 넘는 것은 막지 않는다. 그게 답이다 —
     번 돈보다 더 썼다는 뜻이고 한눈에 보여야 한다 */
function pctCell(d, n) {
  var p = pctOf(d, n);
  if (!p) return '';
  if (Math.abs(n) < d.sales) return p.txt;
  return '매출 초과';
}

/* ★ 36차. 음수를 아스키 하이픈으로 내면 화면에서 마이너스로 안 읽히고
     색 규칙(나간 돈·적자는 빨강)에도 안 걸린다. 부호를 떼어 따로 돌려준다 */
function pctOf(d, n) {
  if (d.blocked) return null; /* 못정한가 많으면 비율도 뜻이 없다 */
  if (!(d.sales > 0)) return null;
  var p = Math.round((n / d.sales) * 100);
  return { txt: (p < 0 ? '−' : '') + Math.abs(p) + '%', minus: p < 0 };
}

/* 계산은 core/result.js 의 warnOkIn — 지금 매장(UP)을 넘긴다 */
function warnOk(m, id) {
  return warnOkIn(UP, m, id);
}
function setWarnOk(m, id, on) {
  if (!UP.okWarn) UP.okWarn = {};
  if (on) UP.okWarn[m + '|' + id] = 1;
  else delete UP.okWarn[m + '|' + id];
}

/* 카드 목록을 먼저 뽑아둔다 — 제목 아래 요약 줄에서도 개수가 필요하다 */
function collectChecks(d, months) {
  var m = UP.month,
    cards = [];
  ratioWarnings(d, m, months).forEach(function (w) {
    cards.push({ kind: 'ratio', w: w });
  });
  /* ★ 112차 ②㉰. 두 갈래를 가른다.
       unsure — 거래 금액을 모른다. 거래 전체가 매출·지출에서 빠졌다
       resid  — 파일 금액으로 반영했고, 잔액 차이만 아직 설명이 안 됐다
     한 덩어리로 세면 「거래 금액도 모르는 것」과 같아져 버린다 */
  d.rows.forEach(function (r) {
    if (r.unsure) cards.push({ kind: 'unsure', row: r });
    else if (r.byStated) cards.push({ kind: 'resid', row: r });
  });
  newPayees(d, m, months).forEach(function (p) {
    cards.push({ kind: 'new', p: p });
  });
  grownPayees(d, m, months).forEach(function (p) {
    cards.push({ kind: 'grow', p: p });
  });
  return cards;
}
/* 계산은 core/result.js 의 checksLeftIn — 지금 매장(UP)을 넘긴다 */
function checksLeft(cards) {
  return checksLeftIn(UP, cards);
}

/* 사장님이 손보는 중에 카드가 사라지면 하던 일을 잃는다.
   거래처 하나를 옮기면 비율이 문턱 아래로 내려가 카드 조건이 깨지는데,
   사장님은 아직 일을 안 끝내셨다.
   한 번 펼친 카드는 조건이 깨져도 그 자리에 두고, 카드 안에 한 줄만 단다.
   달을 바꾸거나 다른 화면으로 갔다 오면 그때 다시 센다 */
function ckPinned() {
  return (UP.ckPin = UP.ckPin || {});
}
function ckPin(m, c) {
  ckPinned()[m + '|' + checkId(c)] = c;
}

function drawChecks(host, d, months, cards) {
  var m = UP.month;
  /* 조건이 풀려 목록에서 빠진 카드라도, 펼쳐두신 것이면 되살려 붙인다 */
  var live = {},
    pinBack = [];
  cards.forEach(function (c) {
    live[checkId(c)] = 1;
  });
  Object.keys(ckPinned()).forEach(function (k) {
    var p = k.split('|');
    if (p[0] !== m) return;
    if (live[k.slice(p[0].length + 1)]) return;
    var c = ckPinned()[k];
    c.__eased = true;
    pinBack.push(c);
  });
  cards = cards.concat(pinBack);
  if (!cards.length) return;

  var box = el('div', 'checks');
  /* 「확인이 필요합니다」에는 아직 안 본 것만 센다.
     확인이 끝난 건 따로 묶어 접어둔다 */
  var todo = cards.filter(function (c) {
    return !warnOk(m, checkId(c));
  });
  var done = cards.filter(function (c) {
    return warnOk(m, checkId(c));
  });
  var left = todo.length;
  if (left) {
    /* ★ 86차 ⑦. 위에 있던 「확인할 게 N가지 있습니다」 상자가 여기로 왔다.
       느낌표와 붉은 상자를 이 제목에 씌운다 — 색은 그 상자가 쓰던 것 그대로다.
       0건이면 이 제목 자체가 안 나오므로 상자도 같이 사라진다 */
    var hd = el('div', 'ckhead ckheadrow ckwarn');
    var hs = el('span', null);
    hs.appendChild(el('span', 'ctmark', '⚠'));
    hs.appendChild(document.createTextNode(' 확인이 필요합니다 · ' + won(left) + '건'));
    hd.appendChild(hs);
    /* ★ 38차 3번. 「맞습니다」를 누르면 카드가 접혀 사라진 것처럼 보인다.
       온보딩의 [되돌리기]와 같은 자리·같은 모양으로 되돌릴 길을 둔다 */
    if (UP.lastOk && UP.lastOk.m === m) {
      var un = el('button', 'obprev', '되돌리기');
      un.type = 'button';
      un.addEventListener('click', function () {
        useCard('되돌리기');
        setWarnOk(UP.lastOk.m, UP.lastOk.id, false);
        UP.lastOk = null;
        drawResult(months);
      });
      hd.appendChild(un);
    }
    box.appendChild(hd);
  }

  todo.concat(done).forEach(function (c) {
    /* 확인이 끝난 묶음이 시작되는 자리에 제목을 넣는다 */
    if (c === done[0]) {
      var dh = el('div', 'ckhead done2');
      var chev = foldChip(UP.doneOpen);
      dh.textContent = '확인했습니다 · ' + won(done.length) + '건';
      dh.appendChild(chev);
      dh.setAttribute('role', 'button');
      dh.tabIndex = 0;
      var flip = function () {
        UP.doneOpen = !UP.doneOpen;
        drawResult(months);
      };
      dh.addEventListener('click', flip);
      dh.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          flip();
        }
      });
      box.appendChild(dh);
    }
    if (warnOk(m, checkId(c)) && !UP.doneOpen) return; /* 접혀 있으면 안 그린다 */
    var card = el('div', 'ckcard');
    var id,
      title,
      body,
      cat = null;

    if (c.kind === 'ratio') {
      id = c.w.id;
      title = c.w.title;
      body = c.w.body;
      cat = c.w.cat;
      var top = cat ? topPayee(d, cat) : null;
      if (top)
        body += '  가장 큰 거래처: ' + showName(top.name) + ' ' + won(Math.abs(top.sum)) + '원';
    } else if (c.kind === 'unsure' || c.kind === 'resid') {
      /* ★ 112차 ②㉰. 두 갈래가 서로 다른 말을 해야 한다 */
      id = checkId(c);
      var 날 =
        +c.row.at.slice(5, 7) + '월 ' + +c.row.at.slice(8, 10) + '일 ' + showName(c.row.payee);
      var 파일금액 = c.row.stated === null || c.row.stated === undefined ? null : c.row.stated;
      if (c.kind === 'unsure') {
        title = 날 + ' 거래를 확인 필요로 분류하셨습니다.';
        body =
          (파일금액 === null
            ? '파일에 거래 금액이 없습니다. '
            : '파일 금액 ' + won(Math.abs(파일금액)) + '원. ') +
          '이 거래는 매출·지출 계산에서 제외했습니다.';
      } else {
        title = 날 + ' 거래는 파일에 적힌 금액으로 반영했습니다.';
        body =
          '파일 금액 ' +
          won(Math.abs(파일금액 === null ? c.row.amount : 파일금액)) +
          '원 · 잔액 차이 ' +
          won(Math.abs(c.row.residual)) +
          '원은 아직 설명되지 않았습니다. 매출·지출에는 넣지 않았습니다.';
      }
    } else if (c.kind === 'new') {
      id = 'new:' + c.p.name;
      /* ★ 44차 2-5. 바로 앞에서 찍었는데도 「내가 안 찍었나?」가 된다.
         찍으신 항목을 같이 보여드리면 그 물음이 안 생긴다 */
      var gNew = UP.byName[c.p.name];
      var cNew = gNew ? gCats(gNew).join(' · ') : '';
      title =
        '처음 보는 거래처가 있습니다 — ' + showName(c.p.name) + (cNew ? ' (' + cNew + ')' : '');
      body = +UP.month.slice(5, 7) + '월 ' + wonSign(c.p.net) + '원. 지난달에는 없던 곳입니다.';
    } else {
      id = 'grow:' + c.p.name;
      /* ★ 42차 3번. 「5705% 늘었습니다」를 배수로. 금액 두 개는 바로 아랫줄에 있다 */
      /* ★ 69차 ②. 「금액이 50% 늘었습니다」만 보면 무엇에 견준 50%인지가 없다.
         바로 아랫줄에 「3월 → 4월」이 있지만 제목만 읽고 지나가신다.
         견준 대상을 제목 안에 넣는다 — 아랫줄 금액 줄은 그대로 둔다 */
      var mv3 = moveTxt(c.p.was, c.p.amt);
      title =
        showName(c.p.name) +
        ' 금액이 지난달에 비해 ' +
        (!mv3 || mv3.txt === null
          ? '늘었습니다'
          : mv3.배
            ? mv3.txt + '로 늘었습니다'
            : mv3.txt + ' 늘었습니다');
      body =
        +prevMonth(UP.month, months).slice(5, 7) +
        '월 ' +
        wonSign(c.p.wasNet) +
        '원 → ' +
        +UP.month.slice(5, 7) +
        '월 ' +
        wonSign(c.p.net) +
        '원';
    }

    /* 이미 답한 카드는 접어두되 되돌릴 수 있게 남긴다 */
    if (warnOk(m, id)) {
      card.classList.add('done');
      var dq = el('div', 'ckq');
      dq.appendChild(el('span', 'mark mine', '✓'));
      dq.appendChild(document.createTextNode(title));
      card.appendChild(dq);
      /* 회색 글씨로 두면 안 보인다 — 사장님이 실기기에서 못 찾으셨다 */
      var undo = el('button', 'chbtn rollback', '되돌리기');
      undo.type = 'button';
      undo.addEventListener('click', function () {
        useCard('되돌리기');
        setWarnOk(m, id, false);
        drawResult(months);
      });
      var ub = el('div', 'ckbtns');
      ub.appendChild(undo);
      card.appendChild(ub);
      box.appendChild(card);
      return;
    }

    card.appendChild(el('div', 'ckq', title));
    if (body) card.appendChild(el('div', 'cka', body));
    /* 카드를 지우지 않는다. 사장님이 하시던 일이 화면에 남아 있어야 한다 */
    if (c.__eased) {
      card.appendChild(el('div', 'ckeased', '✓ 이제 문턱 아래로 내려왔습니다'));
    }

    var btns = el('div', 'ckbtns');
    /* 화면 글자는 「확인」, 기록 키는 「맞습니다」 그대로다 (38차 2번).
       기록 키를 바꾸면 옛 사용 기록과 안 맞는다 */
    var ok = el('button', 'b', '확인');
    ok.type = 'button';
    ok.addEventListener('click', function () {
      useCard('맞습니다');
      setWarnOk(m, id, true);
      UP.lastOk = { m: m, id: id }; /* 38차 3번. 되돌릴 수 있게 기억한다 */
      drawResult(months);
    });
    btns.appendChild(ok);

    /* ★ 78-1차. 아직 안 정한 거래가 많다는 안내에는 확인만 두지 않는다.
       바로 옆에서 거래처 확인 화면으로 돌아가 한 곳씩 항목을 정할 수 있게 한다. */
    if (c.kind === 'ratio' && id === 'unset') {
      var goPick = el('button', 'b on', '정하러 가기');
      goPick.type = 'button';
      goPick.addEventListener('click', function () {
        useScreen('거래처 더 찍기');
        moreFromResult();
      });
      btns.appendChild(goPick);
    }

    var panel = el('div', 'ckfix');
    panel.hidden = true;
    /* 「확인해볼게요」를 누르면 이 카드를 붙여두고, 되돌릴 길을 같이 그린다.
       회색 12px 로 두면 세 번째로 「없다」는 말을 듣는다 */
    var pinned = !!ckPinned()[m + '|' + id];
    var fixDraw = null;
    function showFix(draw) {
      ckPin(m, c);
      panel.hidden = false;
      panel.innerHTML = '';
      draw();
      var back = el('button', 'upbtn plain ckback', '되돌리기');
      back.type = 'button';
      back.addEventListener('click', function () {
        delete ckPinned()[m + '|' + id];
        drawResult(months);
      });
      panel.appendChild(back);
    }
    function openFix(draw) {
      fixDraw = draw;
      if (!panel.hidden) {
        panel.hidden = true;
        return;
      }
      showFix(draw);
    }

    if (c.kind === 'ratio' && c.w.find) {
      fixDraw = function () {
        drawFindFor(panel, d, c.w.find);
      };
      var fb = el('button', 'b on', c.w.find + '부터 찾아보기');
      fb.type = 'button';
      fb.addEventListener('click', function () {
        if (!panel.hidden) {
          panel.hidden = true;
          /* 찍는 동안은 화면을 안 흔들고, 닫을 때 한 번에 반영한다 */
          if (panel._st && Object.keys(panel._st.picked).length) drawResult(months);
          return;
        }
        showFix(fixDraw);
      });
      btns.appendChild(fb);
    } else if (cat) {
      fixDraw = function () {
        drawCatFix(panel, d, cat);
      };
      var fix = el('button', 'b on', '다시 정할게요');
      fix.type = 'button';
      fix.addEventListener('click', function () {
        openFix(fixDraw);
      });
      btns.appendChild(fix);
    } else if (c.kind === 'new' || c.kind === 'grow') {
      fixDraw = function () {
        drawPayeeFix(panel, d, c.p.name);
      };
      var see = el('button', 'b on', '항목 확인'); /* 38차 2번. 기록 키는 그대로 둔다 */
      see.type = 'button';
      see.addEventListener('click', function () {
        if (panel.hidden) useCard('확인해볼게요');
        openFix(fixDraw);
      });
      btns.appendChild(see);
    } else if (c.kind === 'unsure' || c.kind === 'resid') {
      fixDraw = function () {
        panel.appendChild(
          el(
            'div',
            'cka',
            '거래내역 ' + c.row.excelRow + '행 · ' + c.row.at + ' · ' + showName(c.row.payee)
          )
        );
        /* ★ amount + residual 은 이 거래가 잔액을 움직인 금액이다 (네 상태 모두) */
        panel.appendChild(
          el(
            'div',
            'cka',
            '계좌 잔액은 ' +
              won(c.row.balance - (c.row.amount + c.row.residual)) +
              '원에서 ' +
              won(c.row.balance) +
              '원이 되었습니다. ' +
              '계좌 거래내역에서 이 거래를 확인해보세요.'
          )
        );
        drawPayeeFix(panel, d, c.row.payee);
      };
      var see2 = el('button', 'b on', '항목 확인');
      see2.type = 'button';
      see2.addEventListener('click', function () {
        if (panel.hidden) useCard('확인해볼게요');
        openFix(fixDraw);
      });
      btns.appendChild(see2);
      /* ★ 112차 ②. 그 자리에서 다시 고르실 수 있어야 한다 — 되살린 카드로 간다.
         ★ 예시 화면에서는 안 붙인다 (107차 ②와 같은 규칙) */
      if (!UP.demo) {
        var again2 = el('button', 'b', '금액 다시 고르기');
        again2.type = 'button';
        again2.addEventListener('click', function () {
          showPatchedCards();
        });
        btns.appendChild(again2);
      }
    }
    card.appendChild(btns);
    card.appendChild(panel);
    /* 다시 그려도 펼친 채로 둔다. 안에 있던 거래처 목록도 다시 그린다 */
    if (pinned && fixDraw) showFix(fixDraw);
    box.appendChild(card);
  });
  host.appendChild(box);
}

/* 사장님이 찍은 것과 앱이 넣은 것이 같은 검정색이면 구분이 안 간다.
   빨강은 이 앱에서 적자라 호박색을 쓴다 */
function autoTag(g) {
  var au = g && (g.mixed ? g.autoIn || g.autoOut : g.auto);
  return gDone(g) && au ? el('span', 'autotag', '(앱이 넣음)') : null;
}

/* 항목 하나를 정해두고, 거기에 넣을 거래처를 골라 담는 화면.
   ── 사장님은 여러 곳을 연달아 찍는다. 한 번 찍을 때마다 닫히면 안 된다.
   그래서 여기서는 화면 전체를 다시 그리지 않고 이 목록만 고쳐 그린다.
   패널을 닫을 때 한 번에 반영한다 (drawResult) */
var FIND_PAGE = 12;

/* 저장만 하고 화면은 안 건드린다 */
function setCatQuiet(g, name) {
  if (UP.accounts.indexOf(name) === -1) UP.accounts.push(name);
  if (g.mixed) {
    gSetCat(g, true, name, false);
    gSetCat(g, false, name, false);
  } else {
    g.cat = name;
    g.auto = false;
  }
  var i = UP.queue.indexOf(g);
  if (i >= UP.pos) UP.queue.splice(i, 1);
  savePicks();
}
function unsetCatQuiet(g) {
  if (g.mixed) {
    gSetCat(g, true, null, false);
    gSetCat(g, false, null, false);
  } else {
    g.cat = null;
    g.auto = false;
  }
  savePicks();
}

function drawFindFor(panel, d, cat) {
  if (!panel._st) panel._st = { q: '', amt: false, shown: FIND_PAGE, picked: {} };
  var st = panel._st;
  panel.innerHTML = '';

  panel.appendChild(
    el(
      'div',
      'cka',
      '매달 비슷한 금액이 나간 곳을 위로 올렸습니다. ' + cat + ga(cat) + ' 여기 있을 수 있습니다.'
    )
  );

  /* ── 찾기 칸 ── 목록에 없으면 사장님은 찾을 방법이 없다 */
  var bar = el('div', 'findbar');
  var inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'findinp';
  inp.placeholder = '거래처 이름으로 찾기';
  inp.value = st.q;
  bar.appendChild(inp);
  var sortB = el(
    'button',
    'chbtn' + (st.amt ? ' on' : ''),
    st.amt ? '원래 순서로' : '금액순으로 보기'
  );
  sortB.type = 'button';
  bar.appendChild(sortB);
  panel.appendChild(bar);

  var count = el('div', 'findcount');
  panel.appendChild(count);
  var box = el('div', 'dtl');
  panel.appendChild(box);
  var moreWrap = el('div', 'findmore');
  panel.appendChild(moreWrap);

  function list() {
    /* 이번에 찍은 것도 자리를 지킨다 — 빠지면 되돌릴 수가 없다 */
    var all = UP.payees.filter(function (g) {
      return !gDone(g) || st.picked[g.name];
    });
    var q = findKey(st.q);
    if (q)
      all = all.filter(function (g) {
        return findKey(g.name).indexOf(q) !== -1;
      });
    all.sort(
      st.amt
        ? function (a, b) {
            return b.abs - a.abs;
          }
        : function (a, b) {
            var s = steadyScore(b) - steadyScore(a);
            return s !== 0 ? s : b.abs - a.abs;
          }
    );
    return all;
  }

  function render() {
    var all = list();
    var n = 0;
    Object.keys(st.picked).forEach(function () {
      n++;
    });
    count.textContent = n ? '이번에 ' + n + '곳 정하셨습니다' : '';
    count.hidden = !n;

    box.innerHTML = '';
    if (!all.length) {
      box.appendChild(
        el(
          'div',
          'cka',
          st.q
            ? '그런 이름으로 아직 안 정한 거래처가 없습니다. 이미 다른 항목으로 정하셨을 수 있습니다.'
            : '아직 안 정한 거래처가 없습니다.'
        )
      );
      moreWrap.innerHTML = '';
      return;
    }
    all.slice(0, st.shown).forEach(function (g) {
      var row = el('div', 'drow');
      var nm = el('div', 'dnm');
      var au2 = g.mixed ? g.autoIn || g.autoOut : g.auto;
      if (gDone(g)) nm.appendChild(el('span', au2 ? 'mark auto' : 'mark mine', au2 ? '⚙' : '✓'));
      else nm.appendChild(el('span', 'unk', '(아직 안 정함)'));
      nm.appendChild(document.createTextNode(gShowCat(g) ? gShowCat(g) + ' ' : ''));
      var tg1 = autoTag(g);
      if (tg1) nm.appendChild(tg1);
      nm.appendChild(document.createTextNode(' ' + showName(g.name)));
      if (isCut(g.name)) nm.appendChild(el('div', 'namecut', '은행에서 이름이 잘려 들어왔습니다'));
      nm.appendChild(el('div', 'dspan', payeeSpan(g) + ' · ' + g.n + '건'));
      row.appendChild(nm);
      row.appendChild(el('div', 'dv num', wonSign(g.net)));

      var ch = el('div', 'dch');
      var menu = el('div', 'menu');
      menu.hidden = true;
      if (gCats(g).length) {
        var undo = el('button', 'chbtn', '되돌리기');
        undo.type = 'button';
        undo.addEventListener('click', function () {
          unsetCatQuiet(g);
          delete st.picked[g.name];
          render();
        });
        ch.appendChild(undo);
      } else {
        var btn = el('button', 'chbtn on', cat + ro(cat));
        btn.type = 'button';
        btn.addEventListener('click', function () {
          setCatQuiet(g, cat);
          st.picked[g.name] = 1;
          render();
        });
        var other = el('button', 'chbtn', '다른 항목');
        other.type = 'button';
        other.addEventListener('click', function () {
          if (!menu.hidden) {
            menu.hidden = true;
            return;
          }
          drawChangeMenu(menu, g, function (name) {
            st.picked[g.name] = 1;
            render();
          });
          menu.hidden = false;
        });
        ch.appendChild(btn);
        ch.appendChild(other);
      }
      row.appendChild(ch);
      box.appendChild(row);
      box.appendChild(menu);
    });

    moreWrap.innerHTML = '';
    var left = all.length - st.shown;
    if (left > 0) {
      var more = el('button', 'chbtn wide', '더 보기 (' + won(left) + '곳 남음)');
      more.type = 'button';
      more.addEventListener('click', function () {
        st.shown += FIND_PAGE;
        render();
      });
      moreWrap.appendChild(more);
    }
  }

  inp.addEventListener('input', function () {
    st.q = inp.value;
    st.shown = FIND_PAGE;
    render();
  });
  sortB.addEventListener('click', function () {
    st.amt = !st.amt;
    sortB.textContent = st.amt ? '원래 순서로' : '금액순으로 보기';
    sortB.classList.toggle('on', st.amt);
    render();
  });
  render();
}
/* 거래처 한 곳만 골라 항목을 바꾸게 한다 */
function drawPayeeFix(panel, d, name) {
  var g = UP.byName[name];
  if (!g) return;
  var box = el('div', 'dtl');
  var row = el('div', 'drow');
  var nm = el('div', 'dnm');
  var au3 = g.mixed ? g.autoIn || g.autoOut : g.auto;
  if (!gDone(g)) nm.appendChild(el('span', 'unk', '(아직 안 정함)'));
  else nm.appendChild(el('span', au3 ? 'mark auto' : 'mark mine', au3 ? '⚙' : '✓'));
  nm.appendChild(document.createTextNode(showName(name) + ' · ' + (gShowCat(g) || UNSET) + ' '));
  var tg2 = autoTag(g);
  if (tg2) nm.appendChild(tg2);
  if (isCut(name)) nm.appendChild(el('div', 'namecut', '은행에서 이름이 잘려 들어왔습니다'));
  /* 카드는 8월 이야기를 하는데 여기에 여덟 달 합계가 나오면 사장님이 놀라신다.
     그 달 금액을 앞에, 전 기간은 작은 글씨로 뒤에 */
  var mSum = 0,
    mN = 0;
  UP.rows.forEach(function (r) {
    if (keyOf(r) !== name || monthOf(r.at) !== UP.month) return;
    mSum += r.amount;
    mN++;
  });
  nm.appendChild(el('div', 'dspan', payeeSpan(g) + ' 통틀어 ' + g.n + '건 · ' + wonSign(g.net)));
  row.appendChild(nm);
  row.appendChild(
    el('div', 'dv num', mN ? spanWord(UP.month, null) + ' ' + wonSign(mSum) : wonSign(g.net))
  );
  var ch = el('div', 'dch');
  var btn = el('button', 'chbtn', '항목 바꾸기');
  btn.type = 'button';
  ch.appendChild(btn);
  row.appendChild(ch);
  box.appendChild(row);
  var menu = el('div', 'menu');
  menu.hidden = true;
  box.appendChild(menu);
  btn.addEventListener('click', function () {
    if (!menu.hidden) {
      menu.hidden = true;
      return;
    }
    drawChangeMenu(menu, g);
    menu.hidden = false;
  });
  panel.appendChild(box);
}

/* 그 항목으로 찍은 거래처를 그 자리에서 다시 찍게 한다 */
function drawCatFix(panel, d, cat) {
  panel.innerHTML = '';
  var list = catPayees(d, cat);
  if (!list.length) {
    panel.appendChild(el('div', 'cka', '이 항목으로 정하신 거래처가 없습니다.'));
    return;
  }
  panel.appendChild(
    el('div', 'cka', '「' + cat + '」' + ro(cat) + ' 정하신 거래처입니다. 눌러서 바꾸세요.')
  );
  var box = el('div', 'dtl');
  list.slice(0, 12).forEach(function (e) {
    var row = el('div', 'drow');
    var nm = el('div', 'dnm');
    if (e.unknown) nm.appendChild(el('span', 'unk', '(아직 안 정함)'));
    nm.appendChild(document.createTextNode(showName(e.name) + ' · ' + e.n + '건'));
    row.appendChild(nm);
    row.appendChild(el('div', 'dv num', won(e.sum)));
    var ch = el('div', 'dch');
    var btn = el('button', 'chbtn', '항목 바꾸기');
    btn.type = 'button';
    ch.appendChild(btn);
    row.appendChild(ch);
    box.appendChild(row);
    var menu = el('div', 'menu');
    menu.hidden = true;
    box.appendChild(menu);
    btn.addEventListener('click', function () {
      if (!menu.hidden) {
        menu.hidden = true;
        return;
      }
      drawChangeMenu(menu, UP.byName[e.name]);
      menu.hidden = false;
    });
  });
  panel.appendChild(box);
}
