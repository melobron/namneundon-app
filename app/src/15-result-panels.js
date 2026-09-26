/* 본 화면이 지금 예시를 보여주는지 사장님 파일을 보여주는지 —
   창의 「닫기」가 어디로 가는지 적어주려면 알아야 한다 */
var PAGE_DEMO = true;
function syncCloseLabel() {
  var b = document.getElementById('upclose');
  /* ★ 111차 ③. 이름과 목적지를 맞춘다.
     109차에 이름만 고쳤더니 「← 첫 화면으로」가 예시 사업장 화면으로 갔다 —
     closeUpPanel() 이 showDemoBehind(true) 를 부르기 때문이다.
     ★ 분석이 끝난 내 결과가 있을 때만 「내 결과로 돌아가기」다.
       파일을 올렸다는 이유만으로는 아니다 — 아직 거래처를 고르는 중이면 시작 화면이다.
     ★ 하는 일은 closeUpPanel 이 정한다. 화면 이력을 새로 만들지 않는다 —
       읽어둔 파일(PENDING)과 이미 정하신 분류는 그대로 남는다 (7177줄 옛 버그) */
  if (b) b.textContent = 내결과있나() ? '내 결과로 돌아가기' : '← 첫 화면으로';
}

/* 계산은 core/result.js 의 viewableMonthIn — 지금 매장(UP)을 넘긴다 */
function viewableMonth(months, notThis) {
  return viewableMonthIn(UP, months, notThis);
}

/* 계산은 core/result.js 의 bigOutDayIn — 지금 매장(UP)을 넘긴다 */
function bigOutDay(months, m) {
  return bigOutDayIn(UP, months, m);
}
/* ★ 101차 ①. 이 매장에 한 번만 묻는다. 한 번 답하시면 다시 안 묻는다 —
   카드를 펼치면 언제든 바꾸실 수 있다 */
function needDueAsk() {
  if (!UP || UP.demo) return false;
  if (UP.dueAsked) return false;
  var o = null;
  try {
    o = loadPicks(UP.store);
  } catch (e) {}
  if (o && o.목표일) return false; /* 저장통에 이미 답이 있다 */
  return true;
}
function drawDueAsk(months) {
  var host = document.querySelector('#up-duedate .ddwrap');
  if (!host) return;
  host.innerHTML = '';
  var m = UP.month && months.indexOf(UP.month) !== -1 ? UP.month : defaultMonth(months);
  var 권함 = bigOutDay(months, m);
  var 고른날 = 권함 || dueDay();
  document.getElementById('uptitle').textContent = '한 가지만 여쭙겠습니다';

  host.appendChild(el('div', 'ddq', '매달 지출이 가장 많은 날은 언제인가요?'));
  /* ★ 왜 묻는지 한 줄. 이유를 안 적으면 그냥 절차가 된다 */
  host.appendChild(
    el(
      'div',
      'ddsub',
      '고르신 날까지의 예상 잔액 흐름을 보여드립니다. 나중에 언제든 바꾸실 수 있습니다.'
    )
  );
  /* ★ 지어내지 않는다. 자료로 찾은 것이 있을 때만 근거를 적는다 */
  if (권함) {
    host.appendChild(
      el(
        'div',
        'ddsub',
        '지난 3달에는 ' + dueDayText(권함) + '에 제일 많이 나갔습니다. 그대로 두셔도 됩니다.'
      )
    );
  }
  var days = el('div', 'duedays');
  for (var i = 1; i <= 31; i++) {
    /* ★ 103차 ③. 29·30·말일까지 */
    (function (n) {
      var b = el('button', n === 고른날 ? 'on' : '', dueDayShort(n));
      b.type = 'button';
      b.addEventListener('click', function () {
        고른날 = n;
        drawDueAsk2(days, n);
      });
      days.appendChild(b);
    })(i);
  }
  host.appendChild(days);

  var row = el('div', 'ddgo');
  var go = el('button', 'b on big', '이대로 보기');
  go.type = 'button';
  go.addEventListener('click', function () {
    setDueDay(고른날);
    UP.dueAsked = true;
    savePicks();
    showResult();
  });
  row.appendChild(go);
  host.appendChild(row);
  upShow('up-duedate');
}
/* 눌린 날만 바꿔 그린다 — 화면을 통째로 다시 그리면 스크롤이 튄다 */
function drawDueAsk2(days, n) {
  var bs = days.querySelectorAll('button'),
    i;
  for (i = 0; i < bs.length; i++) bs[i].className = i + 1 === n ? 'on' : '';
}

function showResult() {
  utStop(); /* 「결과 보기」·「그만 찍고 결과 보기」 둘 다 여기로 온다 */
  /* ★ 119차. 보류 원인 경로에서 다른 길로 결과에 왔어도 원래 차례로 되돌린다 */
  if (UP && UP.holdAsk) holdAskEnd(false);
  PAGE_DEMO = !!(UP && UP.demo);
  syncCloseLabel();
  syncUpOpen();
  /* ★ 101차 ①. 이 매장에 아직 안 물어봤으면 한 가지만 먼저 여쭙는다.
     ★ 한 번만이다. 답하시면 UP.dueAsked 와 저장통(목표일)이 둘 다 남는다.
     ★ 예시 화면에서는 안 묻는다 — 남의 가게 자료에 목표일을 정하는 것이 된다.
     ★ 되살린 매장(저장통에 목표일이 있는 곳)도 안 묻는다 */
  if (needDueAsk()) {
    var ms0 = monthList();
    UP.month = UP.month && ms0.indexOf(UP.month) !== -1 ? UP.month : defaultMonth(ms0);
    drawDueAsk(ms0);
    return;
  }
  document.getElementById('uptitle').textContent = '남는돈';
  upShow('up-done');
  /* ★ 119차. 예시 전환 보정 — 결과로 가는 길에서는 시작 화면을 다시 그리지 않는다.
     closeUpPanel 은 예시를 「내 결과 없음」으로 보고 drawStart 를 불러,
     예시에서 분류하고 돌아오면 결과 위에 시작 화면(매장 목록·업종·예시 단추)이 같이 섰다 */
  closePanelToResult();
  document.getElementById('up-result').hidden = false;
  document.getElementById('demotop').hidden = !(UP && UP.demo);
  var months = monthList();
  UP.month = UP.month && months.indexOf(UP.month) !== -1 ? UP.month : defaultMonth(months);
  if (!UP.view) UP.view = 'month';
  if (!UP.open) UP.open = {};
  drawResult(months);
}

/* 계산은 core/result.js 의 monthLabelRIn — 지금 매장(UP)을 넘긴다 */
function monthLabelR(m, months) {
  return monthLabelRIn(UP, m, months);
}
/* + 는 파랑, − 는 빨강. 이 앱 어디서나 같다 */
/* ★ 111차 ④. 화면 금액은 원 단위다. 색 규칙은 manwonB 와 같다 —
   + 는 파랑, − 는 빨강. manwon()·manwonB() 는 안 지운다 */
function wonB(v) {
  return el('b', v < 0 ? 'sgn-minus' : 'sgn-plus', won(v) + '원');
}
function manwonB(v) {
  return el('b', v < 0 ? 'sgn-minus' : 'sgn-plus', manwon(v));
}

function moneyLive(inp) {
  inp.addEventListener('input', function () {
    /* 앞의 0은 걷어낸다 — 「007」이 그대로 남으면 콤마 자리가 어긋난다 */
    var raw = String(inp.value)
      .replace(/[^0-9]/g, '')
      .replace(/^0+(?=\d)/, '');
    var t = raw ? won(+raw) : '';
    if (t === inp.value) return;
    /* 가운데를 고치실 때 커서가 끝으로 튀지 않게, 뒤에서 센 자리를 지킨다 */
    var at = inp.selectionStart;
    var 뒤 = inp.value.length - (at == null ? inp.value.length : at);
    inp.value = t;
    var p = t.length - 뒤;
    if (p < 0) p = 0;
    if (p > t.length) p = t.length;
    try {
      inp.setSelectionRange(p, p);
    } catch (e) {}
  });
}

/* 계산은 core/result.js 의 asOfTextIn — 지금 매장(UP)을 넘긴다 */
function asOfText() {
  return asOfTextIn(UP);
}

/* 계산은 core/result.js 의 unsetCountIn — 지금 매장(UP)을 넘긴다 */
function unsetCount() {
  return unsetCountIn(UP);
}

/* 결과 화면에서 항목을 바꾸면 그 거래처 전체에 적용된다 */
function setCat(g, name) {
  g.cardMixed = false;
  if (UP.accounts.indexOf(name) === -1) UP.accounts.push(name);
  /* 결과 화면은 거래처 한 줄로 보여준다. 섞인 곳이면 양쪽 다 이걸로 정한다 */
  if (g.mixed) {
    gSetCat(g, true, name, false);
    gSetCat(g, false, name, false);
  } else {
    g.cat = name;
    g.auto = false;
  }
  var i = UP.queue.indexOf(g);
  if (i >= UP.pos) UP.queue.splice(i, 1); /* 아직 안 물어본 것이면 목록에서 뺀다 */
  savePicks();
  drawResult(monthList());
}

/* 계산은 core/result.js 의 isHiddenIn — 지금 매장(UP)을 넘긴다 */
function isHidden(name) {
  return isHiddenIn(UP, name);
}

function drawChangeMenu(box, g, after) {
  box.innerHTML = '';
  var names = UP.accounts.filter(function (n) {
    return !isHidden(n) || gCats(g).indexOf(n) !== -1;
  });
  if (names.indexOf('매출') === -1) names.unshift('매출');
  names.forEach(function (name) {
    var b = el('button', 'mi', name);
    b.type = 'button';
    if (gCats(g).indexOf(name) !== -1) b.classList.add('on');
    var note2 = noteFor(name);
    if (note2) {
      if (isKeep(name)) b.classList.add('keep');
      b.appendChild(el('span', 'msub', note2));
    }
    b.addEventListener('click', function () {
      if (after) {
        setCatQuiet(g, name);
        after(name);
        return;
      }
      setCat(g, name);
    });
    box.appendChild(b);
  });
  var add = el('button', 'mi add', '+ 항목 추가');
  add.type = 'button';
  add.addEventListener('click', function () {
    drawCatAddHere(box, g);
  });
  box.appendChild(add);
  /* 잘못 찍었을 때 빠져나갈 길 — 다른 항목으로 바꾸는 것만으로는 모자라다 */
  if (gCats(g).length) {
    var off = el('button', 'mi rollback', '아직 안 정함으로 되돌리기');
    off.type = 'button';
    off.addEventListener('click', function () {
      if (after) {
        unsetCatQuiet(g);
        after(null);
        return;
      }
      unsetCatQuiet(g);
      drawResult(monthList());
    });
    box.appendChild(off);
  }
}

function drawCatAddHere(box, g) {
  drawNameBox(box, {
    onCancel: function () {
      drawChangeMenu(box, g);
    },
    onDone: function (name) {
      setCat(g, name);
    }
  });
}

/* ── 36차 H · 매장 이름과 성함 고치기 ─────────────────────
   「어 뭐야? 내 이름 쓰는 거 어디 갔니?」 — 온보딩을 지나면 고칠 길이 없었다.
   성함은 isOwnerName 판정에 쓰이므로 틀리면 계속 틀린다.
   ★ 매장 이름을 고치면 저장된 것이 함께 따라가야 한다.
     안 따라가면 이름 하나 고친 것만으로 지난달 찍은 게 통째로 사라진다 */
function renameStore(oldName, neu) {
  if (!neu || neu === oldName) return;
  var a = lsGet(storeKey(oldName));
  if (a) {
    lsSet(storeKey(neu), a);
    try {
      lsRemove(storeKey(oldName));
    } catch (e) {}
  }
  var b = lsGet(manualKey(oldName));
  if (b) {
    lsSet(manualKey(neu), b);
    try {
      lsRemove(manualKey(oldName));
    } catch (e) {}
  }
  var c = lsGet(bankKey(oldName));
  if (c) {
    lsSet(bankKey(neu), c);
    try {
      lsRemove(bankKey(oldName));
    } catch (e) {}
  }
  /* ★ 91차 ①. 거래내역(fc.data)도 같이 따라간다 — 안 따라가면 이름 하나 고친 것만으로
     이 기기에 남겨둔 거래내역을 못 찾아 다시 올리셔야 한다 */
  var d = lsGet(dataKey(oldName));
  if (d) {
    lsSet(dataKey(neu), d);
    try {
      lsRemove(dataKey(oldName));
    } catch (e) {}
  }
  /* ★ 116차 ⑪. 예정 지출도 같이 따라간다 — 안 따라가면 이름 하나 고친 것만으로
     정해두신 예정 지출을 못 찾는다. 열쇠는 storeKey 와 같은 매장 식별값이다 */
  var e5 = lsGet(planKey(oldName));
  if (e5) {
    lsSet(planKey(neu), e5);
    try {
      lsRemove(planKey(oldName));
    } catch (e) {}
  }
  UP.__plan = null;
  if (lsGet(LAST_KEY) === String(oldName || '(기본)')) lsSet(LAST_KEY, String(neu || '(기본)'));
  DATA_SIG = null; /* 열쇠가 바뀌었으니 다음 저장은 새 자리에 다시 쓴다 */
  UP.store = neu;
}
/* 이 브라우저에 저장된 매장 — 직접 넣기가 몇 달 있는지도 같이 센다 */
function storeRows() {
  var out = [],
    seen = {};
  var s = savedSummary();
  s.keys.forEach(function (k) {
    seen[k.name] = { name: k.name, picks: k.n, months: 0 };
  });
  try {
    var 저장열쇠 = lsKeys();
    for (var i = 0; i < 저장열쇠.length; i++) {
      var key = 저장열쇠[i];
      if (!key || key.indexOf(MANUAL_KEY) !== 0) continue;
      var nm = key.slice(MANUAL_KEY.length);
      var o = null;
      try {
        o = lsReadJSON(key);
      } catch (e) {}
      var mn = o && o.amounts ? Object.keys(o.amounts).length : 0;
      if (!seen[nm]) seen[nm] = { name: nm, picks: 0, months: 0 };
      seen[nm].months = mn;
    }
  } catch (e) {}
  Object.keys(seen).forEach(function (k) {
    out.push(seen[k]);
  });
  return out;
}

var LOAD_ASK = null; /* 지금 덮어쓸지 여쭙는 중인 매장 이름 */
/* ★ 116차 ⑪. 지금 지울지 여쭙는 중인 매장 이름 — 예정 지출도 같이 지워지므로
   덮어쓰기(LOAD_ASK)와 같은 무게로 한 번 여쭙는다 */
var DEL_ASK = null;
function openNames() {
  document.getElementById('uptitle').textContent = BIZ.곳 + '·성함';
  openUpPanel();
  upShow('up-cats');
  drawNames();
}
function drawNames() {
  var host = document.getElementById('up-cats');
  host.innerHTML = '';
  host.appendChild(
    el(
      'div',
      'obsub',
      BIZ.곳 +
        ' 이름을 고치면 지난번에 정하신 것도 함께 따라갑니다. ' +
        '성함은 ' +
        BIZ.주인 +
        ' 이름으로 오간 돈을 가려내는 데 씁니다.'
    )
  );

  var oldStore = UP.store || '';
  var s1 = el('div', 'nmfield');
  s1.appendChild(el('div', 'nmlab', BIZ.곳 + ' 이름'));
  var i1 = document.createElement('input');
  i1.type = 'text';
  i1.className = 'nminput';
  i1.maxLength = 20;
  i1.value = oldStore;
  i1.placeholder = '내 ' + BIZ.곳;
  s1.appendChild(i1);
  host.appendChild(s1);

  var s2 = el('div', 'nmfield');
  s2.appendChild(el('div', 'nmlab', BIZ.주인 + ' 성함'));
  var i2 = document.createElement('input');
  i2.type = 'text';
  i2.className = 'nminput';
  i2.maxLength = 20;
  i2.value = UP.owner || '';
  i2.placeholder = '건너뛰셔도 됩니다';
  s2.appendChild(i2);
  host.appendChild(s2);

  var acts = el('div', 'obdoneacts');
  var ok = el('button', 'b on', '저장');
  ok.type = 'button';
  ok.addEventListener('click', function () {
    var neu = i1.value.trim();
    if (neu && neu !== oldStore) renameStore(oldStore, neu);
    UP.owner = i2.value.trim() || null;
    UP.manual = manualLoad();
    savePicks();
    showResult();
  });
  var back = el('button', 'b', '돌아가기');
  back.type = 'button';
  back.addEventListener('click', showResult);
  acts.appendChild(ok);
  acts.appendChild(back);
  host.appendChild(acts);

  /* H-4. 이 브라우저에 저장된 매장 — 이름을 잘못 적어 둘로 갈린 것도 여기서 보인다 */
  var rows = storeRows();
  if (rows.length) {
    host.appendChild(el('div', 'catspan', '이 브라우저에 저장된 ' + BIZ.곳));
    var list = el('div', 'catlist');
    rows.forEach(function (r) {
      var row = el('div', 'catrow');
      var nm = el('div', 'catnm', r.name);
      var bits = [];
      if (r.picks) bits.push('거래처 ' + won(r.picks) + '곳');
      if (r.months) bits.push('직접 넣기 ' + won(r.months) + '개월');
      nm.appendChild(el('div', 'catnote', bits.join(' · ') || '비어 있습니다'));
      row.appendChild(nm);
      var acts2 = el('div', 'catacts');
      var ld = el('button', 'chbtn', '불러오기');
      ld.type = 'button';
      ld.addEventListener('click', function () {
        /* ★ 36차. 덮어쓰기는 지우기와 같은 무게다 —
           되돌릴 길이 「처음부터 다시 정하기」뿐이다. 한 번 여쭙는다 */
        if (LOAD_ASK !== r.name) {
          LOAD_ASK = r.name;
          DEL_ASK = null;
          drawNames();
          return;
        }
        LOAD_ASK = null;
        UP.store = r.name;
        var saved = loadPicks();
        if (saved) {
          if (saved.accounts && saved.accounts.length) UP.accounts = saved.accounts.slice();
          if (saved.baseCats && saved.baseCats.length) UP.baseCats = saved.baseCats.slice();
          if (saved.keepSet) UP.keepSet = saved.keepSet.slice();
          if (saved.unskip) UP.unskip = saved.unskip.slice();
          UP.payees.forEach(function (g) {
            if (saved.xfer) applyXferKeys(saved.xfer);
            var c = null,
              lst = g.rawList || [];
            for (var i = 0; i < lst.length && !c; i++) c = saved.picks[lst[i]];
            if (!c) c = saved.picks[g.name];
            applySaved(g, c);
          });
        }
        UP.manual = manualLoad();
        UP.queue = buildQueue();
        UP.pos = 0;
        UP.hist = [];
        savePicks();
        showResult();
      });
      acts2.appendChild(ld);
      var del = el('button', 'chbtn del', '지우기');
      del.type = 'button';
      del.addEventListener('click', function () {
        if (DEL_ASK !== r.name) {
          DEL_ASK = r.name;
          LOAD_ASK = null;
          drawNames();
          return;
        }
        DEL_ASK = null;
        try {
          lsRemove(storeKey(r.name));
        } catch (e) {}
        try {
          lsRemove(manualKey(r.name));
        } catch (e) {}
        try {
          lsRemove(bankKey(r.name));
        } catch (e) {}
        /* ★ 116차 ⑪. 그 매장의 예정 지출도 같이 지운다.
           다른 매장의 계획은 그대로 둔다 (완료 기준 ⑫) */
        try {
          lsRemove(planKey(r.name));
        } catch (e) {}
        if (UP && UP.store === r.name) UP.__plan = null;
        drawNames();
      });
      acts2.appendChild(del);
      row.appendChild(acts2);
      list.appendChild(row);
      if (LOAD_ASK === r.name) {
        var ask = el('div', 'catpanel');
        ask.appendChild(
          el(
            'div',
            'addq',
            '「' + r.name + '」에 저장된 것을 지금 올리신 파일에 덮어씁니다. 할까요?'
          )
        );
        var ar = el('div', 'addrow');
        var yes = el('button', 'b on', '덮어쓰기');
        yes.type = 'button';
        yes.addEventListener('click', function () {
          ld.click();
        });
        var no = el('button', 'b', '취소');
        no.type = 'button';
        no.addEventListener('click', function () {
          LOAD_ASK = null;
          drawNames();
        });
        ar.appendChild(yes);
        ar.appendChild(no);
        ask.appendChild(ar);
        list.appendChild(ask);
      }
      /* ★ 116차 ⑪. 지우기 확인. 무엇이 같이 지워지는지를 그대로 적는다 */
      if (DEL_ASK === r.name) {
        var dask = el('div', 'catpanel');
        dask.appendChild(
          el(
            'div',
            'addq',
            '「' +
              r.name +
              '」에 저장된 거래처 분류·직접 넣기·계좌 이름과 예정 지출을 같이 지웁니다. 할까요?'
          )
        );
        var dr = el('div', 'addrow');
        var dyes = el('button', 'b on', '지우기');
        dyes.type = 'button';
        dyes.addEventListener('click', function () {
          del.click();
        });
        var dno = el('button', 'b', '취소');
        dno.type = 'button';
        dno.addEventListener('click', function () {
          DEL_ASK = null;
          drawNames();
        });
        dr.appendChild(dyes);
        dr.appendChild(dno);
        dask.appendChild(dr);
        list.appendChild(dask);
      }
    });
    host.appendChild(list);
  }
}
/* ── 항목 관리 ── */
var CAT_EDIT = null; /* 지금 고치는 중인 항목 이름 */
var CAT_DEL = null; /* 지금 지우려는 항목 이름 */

function openCats() {
  CAT_EDIT = null;
  CAT_DEL = null;
  document.getElementById('uptitle').textContent = '항목 관리';
  openUpPanel();
  upShow('up-cats');
  drawCats();
}

function drawCats() {
  var host = document.getElementById('up-cats');
  host.innerHTML = '';
  host.appendChild(el('div', 'catspan', monthSpan() + ' 올리신 거래 전체 기준입니다'));
  host.appendChild(
    el(
      'div',
      'obsub',
      '이름을 바꾸면 그 항목으로 정하신 거래도 같이 따라갑니다. ' +
        '기본 항목은 이름만 바꿀 수 있고 지울 수 없습니다.'
    )
  );

  var list = el('div', 'catlist');
  UP.accounts.forEach(function (name, idx) {
    var used = catUse(name);
    var row = el('div', 'catrow');

    var mv = el('div', 'catmv');
    [
      ['↑', -1],
      ['↓', 1]
    ].forEach(function (p) {
      var b = el('button', 'mvb', p[0]);
      b.type = 'button';
      b.disabled = (p[1] < 0 && idx === 0) || (p[1] > 0 && idx === UP.accounts.length - 1);
      b.addEventListener('click', function () {
        var j = idx + p[1];
        var t = UP.accounts[idx];
        UP.accounts[idx] = UP.accounts[j];
        UP.accounts[j] = t;
        drawCats();
      });
      mv.appendChild(b);
    });
    row.appendChild(mv);

    var nm = el('div', 'catnm', name);
    if (isKeep(name)) nm.appendChild(el('span', 'cattag', '사업 외'));
    else if (isBase(name)) nm.appendChild(el('span', 'cattag', '기본'));
    var cnote = noteFor(name);
    if (cnote) nm.appendChild(el('div', 'catnote', cnote));
    row.appendChild(nm);
    /* ★ 69차 ①. 「29곳 · 238건」은 숫자만 있고 그 안을 볼 길이 없었다.
       그 숫자를 그대로 펼침 단추로 만든다 — 새 자리를 만들지 않는다.
       ★ 0곳이면 펼칠 것이 없다. 누를 수 없는 그냥 글자로 둔다 (㉡). */
    var 열림 = !!(UP.catOpen && UP.catOpen[name]);
    var 셈글 = used.places ? won(used.places) + '곳 · ' + won(used.rows) + '건' : '0곳';
    var cn;
    if (used.places) {
      cn = el('button', 'catn num catbtn' + (열림 ? ' on' : ''), 셈글 + (열림 ? ' ▲' : ' ▼'));
      cn.type = 'button';
      cn.setAttribute('aria-expanded', 열림 ? 'true' : 'false');
      cn.addEventListener('click', function () {
        UP.catOpen = UP.catOpen || {};
        UP.catOpen[name] = !열림;
        drawCats();
      });
    } else {
      cn = el('div', 'catn num', 셈글);
    }
    if (isHidden(name)) cn.appendChild(el('span', 'cathid', '감춤'));
    row.appendChild(cn);

    var acts = el('div', 'catacts');
    var ed = el('button', 'chbtn', '수정');
    ed.type = 'button';
    ed.addEventListener('click', function () {
      CAT_EDIT = name;
      CAT_DEL = null;
      drawCats();
    });
    acts.appendChild(ed);
    if (!used.places) {
      var hd = el('button', 'chbtn', isHidden(name) ? '다시 보이기' : '감추기');
      hd.type = 'button';
      hd.addEventListener('click', function () {
        UP.hidden = UP.hidden || [];
        var j = UP.hidden.indexOf(name);
        if (j === -1) UP.hidden.push(name);
        else UP.hidden.splice(j, 1);
        savePicks();
        drawCats();
      });
      acts.appendChild(hd);
    }
    /* 35차 C. 이미 만든 항목도 「사업과 무관」을 켜고 끌 수 있게 한다.
       기본 항목은 성격이 정해져 있어 손대지 않는다 — 손대면 손익이 무너진다 */
    if (!isBase(name) && !isLocked(name)) {
      var kp = el('button', 'chbtn', isKeep(name) ? '매출·지출에 넣기' : '매출·지출에서 빼기');
      kp.type = 'button';
      kp.addEventListener('click', function () {
        addAccount(name, !isKeep(name));
        drawCats();
      });
      acts.appendChild(kp);
    }
    /* 미용실 사장님께 「식자재」는 필요 없다. 기본 항목도 지울 수 있게 한다.
       다만 「기타」는 옮길 곳이 없어지고, 사업과 무관한 기본 항목들은 손익이 무너진다.
       그것들은 감추기만 둔다 */
    if (name !== etcName() && !isKeep(name) && !isLocked(name)) {
      var de = el('button', 'chbtn del', '삭제');
      de.type = 'button';
      de.addEventListener('click', function () {
        CAT_DEL = name;
        CAT_EDIT = null;
        drawCats();
      });
      acts.appendChild(de);
    }
    /* ★ 69차 ①. 펼친 거래처 목록 — 수정·삭제 단추 바로 위에 온다 (시안).
       ★ 조회만이다. 여기서는 항목을 바꾸지도 옮기지도 못한다 (요청서 「넣지 않는 것」).
       ★ 그래서 수정·삭제보다 조용해야 한다 — 알약도 글자도 한 단계 작게 (㉢) */
    if (열림 && used.places) {
      var pbox = el('div', 'catpay');
      catPayeeList(name).forEach(function (e) {
        var pr = el('div', 'catprow');
        var top = el('div', 'catpline');
        top.appendChild(el('span', 'catpnm', showName(e.name)));
        var amt = el('span', 'catpamt num');
        amt.appendChild(el('b', null, wonSign(e.sum) + '원'));
        amt.appendChild(el('span', 'catpn', ' · ' + won(e.n) + '건'));
        top.appendChild(amt);
        pr.appendChild(top);
        /* 68차·69차 ③에서 쓰던 그 부품 그대로 — 날짜·요일·시각·금액만, 해석은 없다.
           다시 그리는 것은 이 화면이므로 drawCats 다 */
        if (e.g) drawRawPeek(pr, e.g.rawList || [e.g.name], drawCats);
        pbox.appendChild(pr);
      });
      row.appendChild(pbox);
    }
    row.appendChild(acts);
    list.appendChild(row);

    if (CAT_EDIT === name) {
      var eb = el('div', 'catpanel');
      list.appendChild(eb);
      drawNameBox(eb, {
        value: name,
        self: name,
        okText: '이름 바꾸기',
        onCancel: function () {
          CAT_EDIT = null;
          drawCats();
        },
        onDone: function (neu, existing) {
          if (existing && neu !== name) {
            /* 기존 항목으로 합치기 */
            if (isBase(name)) {
              CAT_EDIT = null;
              drawCats();
              return;
            }
            deleteCat(name, neu);
          } else {
            renameCat(name, neu);
          }
          CAT_EDIT = null;
          drawCats();
        }
      });
    }

    if (CAT_DEL === name) {
      var db = el('div', 'catpanel');
      if (used.rows > 0) {
        db.appendChild(
          el(
            'div',
            'addq',
            '「' +
              name +
              '」' +
              ro(name) +
              ' 정하신 거래가 ' +
              won(used.rows) +
              '건 있습니다. 어떻게 할까요?'
          )
        );
        var r1 = el('div', 'addrow');
        var toEtc = el('button', 'b on', '기타로 옮기기');
        toEtc.type = 'button';
        toEtc.addEventListener('click', function () {
          deleteCat(name, etcName());
          CAT_DEL = null;
          drawCats();
        });
        var toOther = el('button', 'b', '다른 항목으로 옮기기');
        toOther.type = 'button';
        toOther.addEventListener('click', function () {
          db.innerHTML = '';
          db.appendChild(el('div', 'addq', '어느 항목으로 옮길까요?'));
          var menu = el('div', 'menu');
          UP.accounts.forEach(function (o) {
            if (o === name) return;
            /* 지출이던 것이 이익 계산 제외로 가면 순이익이 조용히 늘어난다 */
            if (isKeep(o) && !isKeep(name)) return;
            var b = el('button', 'mi', o);
            b.type = 'button';
            b.addEventListener('click', function () {
              deleteCat(name, o);
              CAT_DEL = null;
              drawCats();
            });
            menu.appendChild(b);
          });
          db.appendChild(menu);
        });
        var toUnset = el('button', 'b', UNSET + '으로 되돌리기');
        toUnset.type = 'button';
        toUnset.addEventListener('click', function () {
          deleteCat(name, null);
          CAT_DEL = null;
          drawCats();
        });
        var cancel = el('button', 'b', '취소');
        cancel.type = 'button';
        cancel.addEventListener('click', function () {
          CAT_DEL = null;
          drawCats();
        });
        r1.appendChild(toEtc);
        r1.appendChild(toOther);
        r1.appendChild(toUnset);
        r1.appendChild(cancel);
        db.appendChild(r1);
      } else {
        db.appendChild(el('div', 'addq', '「' + name + '」을 지울까요? 정하신 거래는 없습니다.'));
        var r2 = el('div', 'addrow');
        var yes = el('button', 'b on', '지우기');
        yes.type = 'button';
        yes.addEventListener('click', function () {
          deleteCat(name, etcName());
          CAT_DEL = null;
          drawCats();
        });
        var no = el('button', 'b', '취소');
        no.type = 'button';
        no.addEventListener('click', function () {
          CAT_DEL = null;
          drawCats();
        });
        r2.appendChild(yes);
        r2.appendChild(no);
        db.appendChild(r2);
      }
      list.appendChild(db);
    }
  });
  host.appendChild(list);

  var acts2 = el('div', 'obdoneacts');
  var add = el('button', 'b', '+ 항목 추가');
  add.type = 'button';
  var addBox = el('div', 'catpanel');
  addBox.hidden = true;
  add.addEventListener('click', function () {
    addBox.hidden = false;
    drawNameBox(addBox, {
      onCancel: function () {
        addBox.hidden = true;
        addBox.innerHTML = '';
      },
      onDone: function (name, existing) {
        if (existing) {
          drawCats();
          return;
        }
        /* 35차 C. 만들 때 한 번 묻는다 */
        askBizKind(addBox, name, function (keep) {
          addAccount(name, keep);
          addBox.hidden = true;
          addBox.innerHTML = '';
          drawCats();
        });
      }
    });
  });
  var back = el('button', 'b on', '돌아가기');
  back.type = 'button';
  back.addEventListener('click', function () {
    showResult();
  });
  acts2.appendChild(back);
  acts2.appendChild(add);
  host.appendChild(acts2);
  host.appendChild(addBox);

  /* ── 저장 ── 이 브라우저에 남는 건 거래처 이름과 항목뿐이다 */
  var box = el('div', 'savebox');
  box.appendChild(el('div', 'obhead', '저장'));
  box.appendChild(
    el(
      'div',
      'obsub',
      /* ★ 36차 J. 첫 화면(upnote)과 같은 말이어야 한다.
       직접 넣기가 생기면서 금액도 남게 됐는데 여기만 옛 문구였다 */
      /* ★ 91차 ①. 거래내역이 이 기기에 남게 됐다. 첫 화면(upnote)과 같은 말을 쓴다 */
      '은행에서 받은 거래내역은 이 기기 안에만 남습니다. ' +
        BIZ.주인 +
        '이 분류하신 항목·적어두신 예정 지출과 마지막으로 분석한 날짜가 함께 남습니다.'
    )
  );
  if (!LS_OK) box.appendChild(el('div', 'lswarn', LS_MSG));

  var srow = el('div', 'obdoneacts');
  var wipe = el('button', 'b', '이 기기의 저장 지우기');
  wipe.type = 'button';
  wipe.addEventListener('click', function () {
    /* ★ 36차. 저장통이 둘이다. 하나만 지우면 사용자는 지웠다고 믿는데
       직접 넣으신 금액이 브라우저에 남는다 — A안에서 제일 아픈 자리다 */
    /* ★ 41차 5번. 통이 셋이 됐다 (fc.picks · fc.manual · fc.banks)
       ★ 91차 ④. 넷이 됐다 — 거래내역(fc.data)도 여기서 같이 지운다 */
    lsDel(storeKey());
    lsDel(manualKey());
    lsDel(bankKey());
    /* ★ 116차 ⑪. 통이 다섯이 됐다 — 예정 지출도 여기서 같이 지운다 */
    lsDel(planKey());
    UP.__plan = null;
    delData();
    UP.manual = { v: 1, items: [], amounts: {} };
    wipe.textContent = '지웠습니다';
    setTimeout(function () {
      wipe.textContent = '이 기기의 저장 지우기';
    }, 1500);
  });
  var out = el('button', 'b', '내보내기');
  out.type = 'button';
  out.addEventListener('click', exportPicks);
  var into = el('button', 'b', '불러오기');
  into.type = 'button';
  into.addEventListener('click', function () {
    IMPORT_WHERE = 'cats';
    document.getElementById('pickfile').click();
  }); /* ★ 119차. 자리를 명시한다 */
  srow.appendChild(wipe);
  srow.appendChild(out);
  srow.appendChild(into);
  box.appendChild(srow);
  /* ★ 119차 B. 「되살리세요」는 다 돌아오는 것처럼 읽혔다 — 파일에는 거래처 분류 설정만 있다.
     옮기는 범위와 차례를 실제 동작대로 적는다. 불러오기는 그 기기에 올린 거래내역의
     거래처에 적용되므로(importApply) 「거래내역을 연 뒤」라고 쓴다 */
  box.appendChild(el('div', 'obsub', '기기를 바꾸거나 브라우저 기록을 지우면 저장이 사라집니다.'));
  box.appendChild(
    el(
      'div',
      'obsub',
      '거래처 분류 설정을 다른 기기로 옮길 수 있습니다. ' +
        '거래내역·예정 지출·직접 적은 금액은 포함되지 않습니다.'
    )
  );
  box.appendChild(
    el(
      'div',
      'obsub',
      '내보낸 파일을 다른 기기로 옮긴 뒤, 그 기기의 남는돈에서 대상 매장의 거래내역을 열고 ' +
        '「불러오기」를 눌러주세요. 메일·메신저·클라우드 등으로 파일을 옮길 수 있습니다.'
    )
  );
  host.appendChild(box);
  drawUseBox(host);
}

/* 진짜 오류일 때만 말한다. 그때도 다음에 할 일을 같이 알려드린다 */
function shareFailed(btn) {
  btn.textContent = '보내지 못했습니다. 복사하기를 눌러주세요';
  setTimeout(function () {
    btn.textContent = '기록 보내기';
  }, 3000);
}

/* ── 사용 기록 상자 ── 항목 관리 맨 아래.
   무엇이 나가는지 사장님이 다 보고 누르신다 */
function drawUseBox(host) {
  var box = el('div', 'savebox');
  box.appendChild(el('div', 'obhead', '사용 기록'));
  box.appendChild(
    el(
      'div',
      'obsub',
      '이 앱이 이 기기에 남겨둔 기록입니다. 금액과 거래처 이름은 들어가지 않습니다.'
    )
  );
  var t = useText();
  if (!t) {
    box.appendChild(el('div', 'obsub', '아직 기록이 없습니다.'));
    host.appendChild(box);
    return;
  }
  box.appendChild(
    el('div', 'obsub', '아래를 복사해서 보내주시면 무엇을 고쳐야 할지 아는 데 큰 도움이 됩니다.')
  );
  var pre = el('div', 'usebox');
  pre.textContent = t;
  box.appendChild(pre);

  var row = el('div', 'obdoneacts');

  /* ── 보내기 ──
     복사 → 카톡 열기 → 방 찾기 → 붙여넣기 네 걸음을 두 걸음으로 줄인다.
     브라우저에 있는 기능이라 아무것도 안 불러오고, 우리는 아무 데도 안 보낸다.
     사장님 폰의 공유 기능에 글자를 넘겨줄 뿐이고, 보내는 건 사장님이 누르신다.
     ★ 아이폰 사파리는 누른 그 순간에 바로 불러야 한다 —
       글자는 위에서 이미 만들어 t 에 담아뒀고, 여기서는 그것만 넘긴다.
       핸들러 안에서 기다렸다가 부르면 브라우저가 막는다 */
  if (navigator.share) {
    var sh = el('button', 'upbtn main', '기록 보내기');
    sh.type = 'button';
    sh.addEventListener('click', function () {
      var r;
      try {
        r = navigator.share({ title: '남는돈 사용 기록', text: t });
      } catch (e) {
        shareFailed(sh);
        return;
      }
      if (r && r.catch) {
        r.catch(function (e) {
          /* 공유 시트에서 그만두신 것이다. 「실패했습니다」가 뜨면
             사장님은 뭘 잘못한 줄 아신다 */
          if (e && e.name === 'AbortError') return;
          shareFailed(sh);
        });
      }
    });
    row.appendChild(sh);
  }

  var cp = el('button', 'upbtn' + (navigator.share ? '' : ' main'), '복사하기');
  cp.type = 'button';
  cp.addEventListener('click', function () {
    var done = function () {
      cp.textContent = '복사했습니다';
      setTimeout(function () {
        cp.textContent = '복사하기';
      }, 1500);
    };
    /* 안 되는 브라우저에서는 긁어서 복사하실 수 있게 글을 통째로 선택해둔다 */
    var fall = function () {
      cp.textContent = '아래 글을 눌러 복사해주세요';
      setTimeout(function () {
        cp.textContent = '복사하기';
      }, 2500);
      try {
        var r = document.createRange();
        r.selectNodeContents(pre);
        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
      } catch (e) {}
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(done, fall);
      } else fall();
    } catch (e) {
      fall();
    }
  });
  row.appendChild(cp);

  var del = el('button', 'upbtn', '기록 지우기');
  del.type = 'button';
  var ask = el('div', 'saveask');
  ask.hidden = true;
  del.addEventListener('click', function () {
    ask.hidden = !ask.hidden;
  });
  row.appendChild(del);
  box.appendChild(row);

  ask.appendChild(el('div', 'addq', '사용 기록을 지울까요? 되돌릴 수 없습니다.'));
  var arow = el('div', 'addrow');
  var yes = el('button', 'b on', '지우기');
  yes.type = 'button';
  yes.addEventListener('click', function () {
    lsDel(USE_KEY);
    openCats();
  });
  var no = el('button', 'b', '취소');
  no.type = 'button';
  no.addEventListener('click', function () {
    ask.hidden = true;
  });
  arow.appendChild(yes);
  arow.appendChild(no);
  ask.appendChild(arow);
  box.appendChild(ask);
  host.appendChild(box);
}

function exportPicks() {
  var body = pickPayload();
  /* ★ 119차 B. 판 번호·곳 수·목표일·순번은 금액이 아니다. savePicks 가 하듯 잠깐 빼고 본다.
     빼지 않아서 hasNumber 가 늘 참이었고, [내보내기]를 눌러도 파일이 안 나왔다
     (118-1차에서 실측). 검사를 푸는 것이 아니다 — 이름 붙은 넷만 빼고 나머지는 그대로 본다 */
  var cv = body.cv,
    n곳 = body.n곳,
    due = body.목표일,
    seq = body.순번;
  delete body.cv;
  delete body.n곳;
  delete body.목표일;
  delete body.순번;
  if (hasNumber(body)) return;
  body.cv = cv;
  body.n곳 = n곳;
  body.목표일 = due;
  body.순번 = seq;
  body.v = 1;
  var blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (UP.store || '내 ' + BIZ.곳) + ' 거래처 분류.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* ── 119차 B · 불러오기 전에 한 번 여쭙는다 ──────────────────────────
   ★ 합치는 방식은 예전 그대로다 (코드로 확인한 것) —
     지금 올린 거래내역의 거래처 가운데 파일에 있는 곳은 파일의 분류로 바뀌고,
     파일에 없는 곳은 기존 분류를 그대로 둔다. 파일에만 있는 거래처는 이번에 쓰이지 않는다.
     항목 목록·계산 밖 항목·다시 묻기로 한 거래처·분석 종료일·업종·이체 설정도 파일 것으로 바뀐다.
   ★ 파일의 매장 이름·성함으로 지금 매장을 바꾸지 않는다 (예전에는 UP.store 를 덮었다).
     저장은 지금 매장 열쇠 하나에만 한다 (savePicks). 다른 매장은 안 건드린다.
   ★ 거래내역·예정 지출·직접 적은 금액은 파일에 없고 여기서 안 바뀐다.
   ★ 저장에 실패하면 불러오기 전 상태로 되돌리고 실패를 알린다. 성공이라고 쓰지 않는다 */
/* ★ 119차. 불러오기를 세 자리에서 쓴다 —
     'cats'    항목 관리의 [불러오기]
     'onboard' 거래처 확인 화면의 [저장해둔 분류 파일 불러오기] (거래내역을 먼저 올린 순서)
     'start'   거래내역 올리기 화면의 [분류 파일 불러오기] (분류 파일을 먼저 불러오는 순서)
   ★ 파일 읽기·검사(importPicks) · 확인 화면(importAsk) · 적용(importApply / importToStore)을
     세 자리가 같이 쓴다. 자리는 어디에 그리고 어디로 돌아갈지만 가른다.
   ★ 거래내역이 있으면 importApply(화면 분류에 합치고 savePicks),
     아직 없으면 importToStore(같은 규칙으로 그 매장 저장통의 분류에 합친다).
     분류 파일만으로 잔액이나 분석 결과를 만들지 않는다 */
var IMPORT_WHERE = 'cats';
function importHost(자리) {
  return document.getElementById(
    자리 === 'onboard' || 자리 === 'choose'
      ? 'up-onboard'
      : 자리 === 'start'
        ? 'upimport'
        : 'up-cats'
  );
}
function importRedraw(자리) {
  if (자리 === 'onboard') drawOnboard();
  else if (자리 === 'choose') drawImportChoose(); /* ★ 119차. 취소·실패면 선택 단계에 머문다 */
  else if (자리 === 'start') drawImportStart();
  else drawCats();
}
function importNote(글, 성공, 자리) {
  var host = importHost(자리 || 'cats');
  var n = el('div', 성공 ? 'obdone' : 'lswarn', 글);
  if (host) host.insertBefore(n, host.firstChild);
  return n;
}
function importPicks(file) {
  var 자리 = IMPORT_WHERE;
  IMPORT_WHERE = 'cats';
  var fr = new FileReader();
  fr.onload = function () {
    var o = null;
    try {
      o = JSON.parse(fr.result);
    } catch (e) {}
    if (!o || o.v !== 1 || !o.picks) {
      importRedraw(자리);
      importNote('이 파일은 읽지 못했습니다. 바뀐 것은 없습니다.', false, 자리);
      return;
    }
    /* 거래내역을 올리기 전 — 어느 매장에 넣을지부터 고르신다 */
    if (자리 === 'start') {
      importChooseStore(o);
      return;
    }
    /* 대상 매장이 없으면 먼저 매장을 정하시게 한다 — 예시 화면도 여기로 온다 */
    if (!UP || !UP.payees || UP.demo || !UP.store) {
      importRedraw(자리);
      importNote(
        '불러올 매장이 정해지지 않았습니다. 대표님 매장의 거래내역을 연 뒤 불러와주세요.',
        false,
        자리
      );
      return;
    }
    importAsk(o, UP.store, 자리, false, false);
  };
  fr.readAsText(file);
}
/* 확인 화면. 여기까지는 아무것도 안 바뀌었다.
   저장통만: 거래내역이 아직 없는 매장이다 (importToStore) · 새매장: 파일로 새 매장을 만든다 */
function importAsk(o, 대상, 자리, 저장통만, 새매장) {
  importRedraw(자리);
  var host = importHost(자리);
  var 이름 = 대상 || '이름 없이 정해둔 것';
  var box = el('div', 'catpanel');
  box.appendChild(
    el(
      'div',
      'addq',
      새매장
        ? '새 매장 「' + 이름 + '」을 만들고 이 분류 설정을 불러올까요?'
        : '이 분류 설정을 「' + 이름 + '」에 불러올까요?'
    )
  );
  box.appendChild(
    el('div', 'obsub', '파일의 매장 이름: ' + (o.store ? o.store : '파일에 매장 이름 없음'))
  );
  box.appendChild(el('div', 'obsub', '불러올 매장: ' + 이름));
  box.appendChild(
    el(
      'div',
      'obsub',
      새매장
        ? '파일의 거래처 분류로 새 매장을 만듭니다.'
        : '같은 거래처는 파일의 분류로 바뀌고, 파일에 없는 기존 분류는 유지됩니다.' +
            (저장통만 ? '' : ' 지금 올린 거래내역에 있는 거래처에만 적용됩니다.')
    )
  );
  var 함께 = [];
  if ((o.accounts && o.accounts.length) || (o.baseCats && o.baseCats.length) || o.keepSet)
    함께.push('항목 목록');
  if (o.목표일) 함께.push('분석 종료일');
  if (o.업종 && TRADES[o.업종]) 함께.push('업종');
  if (o.xfer && o.xfer.length) 함께.push('이체 설정');
  if (함께.length) {
    box.appendChild(el('div', 'obsub', 함께.join('·') + ' 등 함께 저장된 설정도 적용됩니다.'));
  }
  var r = el('div', 'addrow');
  var no = el('button', 'b', '취소');
  no.type = 'button';
  no.addEventListener('click', function () {
    importRedraw(자리);
  });
  var yes = el('button', 'b on', 새매장 ? '새 매장으로 불러오기' : '이 매장에 불러오기');
  yes.type = 'button';
  yes.addEventListener('click', function () {
    if (저장통만) importToStore(o, 대상, 새매장);
    else importApply(o, 자리);
  });
  r.appendChild(no);
  r.appendChild(yes);
  box.appendChild(r);
  host.insertBefore(box, host.firstChild);
  try {
    box.scrollIntoView({ block: 'center' });
  } catch (e) {}
}
function importApply(o, 자리) {
  자리 = 자리 || 'cats';
  /* 되돌릴 수 있게 지금 상태를 들고 있는다 */
  var 전 = {
    accounts: UP.accounts.slice(),
    baseCats: UP.baseCats.slice(),
    keepSet: UP.keepSet.slice(),
    unskip: UP.unskip ? UP.unskip.slice() : UP.unskip,
    dueDay: UP.dueDay,
    trade: tradeNow(),
    xfer: UP.xfer ? JSON.parse(JSON.stringify(UP.xfer)) : UP.xfer,
    queue: UP.queue,
    pos: UP.pos,
    hist: UP.hist,
    target: UP.target,
    g: UP.payees.map(function (g) {
      return {
        g: g,
        cat: g.cat,
        auto: g.auto,
        catIn: g.catIn,
        catOut: g.catOut,
        autoIn: g.autoIn,
        autoOut: g.autoOut
      };
    })
  };
  o = migrateCats(o); /* 옛 판 이름과 늘어난 기본 항목을 여기서도 맞춘다 */
  if (o.accounts && o.accounts.length) UP.accounts = o.accounts.slice();
  /* 35차 C. 여기도 길이로 견주지 않는다 */
  if (o.baseCats && o.baseCats.length) UP.baseCats = o.baseCats.slice();
  if (o.keepSet) UP.keepSet = o.keepSet.slice();
  if (o.unskip) UP.unskip = o.unskip.slice();
  if (o.목표일) setDueDay(o.목표일); /* 57차 ⑦ · 60차 ① */
  if (o.업종 && TRADES[o.업종]) setTrade(o.업종); /* 62차 ② */
  if (o.xfer) applyXferKeys(o.xfer);
  /* ★ 119차. 파일의 매장 이름으로 UP.store 를 덮지 않는다 */
  var n = 0;
  UP.payees.forEach(function (g) {
    var c = null,
      list = g.rawList || [];
    for (var i = 0; i < list.length && !c; i++) c = o.picks[list[i]];
    if (!c) c = o.picks[g.name];
    if (applySaved(g, c)) n++;
  });
  UP.queue = buildQueue(false);
  UP.pos = 0;
  UP.hist = [];
  var 됨;
  try {
    됨 = savePicks();
  } catch (e) {
    됨 = false;
  }
  if (!됨) {
    /* 저장하지 못했다 — 기존 저장본은 그대로다. 화면의 분류와 물음 차례도 불러오기 전으로 돌린다 */
    UP.accounts = 전.accounts;
    UP.baseCats = 전.baseCats;
    UP.keepSet = 전.keepSet;
    UP.unskip = 전.unskip;
    UP.xfer = 전.xfer;
    if (UP.dueDay !== 전.dueDay) UP.dueDay = 전.dueDay;
    if (tradeNow() !== 전.trade) setTrade(전.trade);
    전.g.forEach(function (v) {
      v.g.cat = v.cat;
      v.g.auto = v.auto;
      v.g.catIn = v.catIn;
      v.g.catOut = v.catOut;
      v.g.autoIn = v.autoIn;
      v.g.autoOut = v.autoOut;
    });
    UP.queue = 전.queue;
    UP.pos = 전.pos;
    UP.hist = 전.hist;
    UP.target = 전.target;
    UP.__due = null;
    importRedraw(자리);
    importNote('저장하지 못해 불러오지 않았습니다. 기존 분류는 그대로입니다.', false, 자리);
    return;
  }
  if (자리 === 'onboard' || 자리 === 'choose') {
    /* ★ 119차 분류 파일 선택 단계. 불러온 뒤에는 거래처 확인 화면으로 넘어간다 */
    자리 = 'onboard';
    /* ★ 119차. 거래처 확인 중이었다 — 정해진 곳은 빼고 아직 안 정한 곳만 이어서 묻는다.
       다 정해졌으면 drawOnboard 가 기존 완료 화면([결과 보기])을 낸다 */
    UP.queue = buildQueue();
    UP.pos = 0;
    UP.hist = [];
    UP.ask = null;
    UP.said = null;
  }
  importRedraw(자리);
  importNote(won(n) + '곳을 불러왔습니다', true, 자리);
}
/* ★ 119차. 거래내역을 올리기 전 — 파일의 분류를 그 매장 저장통에 합친다.
   합치는 규칙은 importApply 와 같다: 같은 거래처는 파일 것으로, 파일에 없는 기존 분류는 그대로.
   항목 목록·계산 밖 항목·다시 묻기로 한 거래처·분석 종료일·업종은 파일 것, 이체·섞인 카드는 합친다.
   ★ 파일의 성함은 옮기지 않는다. 매장 이름은 고르신 이름이다.
   ★ 저장에 실패하면 lsSet 이 못 쓴 것뿐이라 기존 저장본은 그대로다 */
function importToStore(o, 이름, 새매장) {
  var o2 = migrateCats(JSON.parse(JSON.stringify(o)));
  var 기존 = 새매장 ? null : loadPicks(이름);
  var body = 기존 ? JSON.parse(JSON.stringify(기존)) : {};
  function 합(a, b) {
    var out = (a || []).slice();
    (b || []).forEach(function (x) {
      if (out.indexOf(x) === -1) out.push(x);
    });
    return out;
  }
  body.picks = {};
  Object.keys((기존 && 기존.picks) || {}).forEach(function (k) {
    body.picks[k] = 기존.picks[k];
  });
  Object.keys(o2.picks).forEach(function (k) {
    body.picks[k] = o2.picks[k];
  });
  if (o2.accounts && o2.accounts.length) body.accounts = o2.accounts.slice();
  if (o2.baseCats && o2.baseCats.length) body.baseCats = o2.baseCats.slice();
  if (o2.keepSet) body.keepSet = o2.keepSet.slice();
  if (o2.unskip) body.unskip = o2.unskip.slice();
  if (새매장 && o2.hidden) body.hidden = o2.hidden.slice();
  if (o2.목표일) body.목표일 = o2.목표일;
  if (o2.업종 && TRADES[o2.업종]) body.업종 = o2.업종;
  if (o2.xfer) body.xfer = 합(기존 && 기존.xfer, o2.xfer);
  if (o2.cardMixed) body.cardMixed = 합(기존 && 기존.cardMixed, o2.cardMixed);
  body.계좌 = (기존 && 기존.계좌) || o2.계좌 || [];
  body.store = 이름 || null;
  body.n곳 = Object.keys(body.picks).length;
  body.순번 = nextPickSeq();
  body.cv = CAT_CV;
  var cv = body.cv,
    n곳 = body.n곳,
    due = body.목표일,
    seq = body.순번;
  delete body.cv;
  delete body.n곳;
  delete body.목표일;
  delete body.순번;
  delete body.v;
  var 숫자 = hasNumber(body); /* 금액이 섞인 파일은 안 남긴다 (savePicks 와 같은 검사) */
  body.cv = cv;
  body.n곳 = n곳;
  if (due != null) body.목표일 = due;
  body.순번 = seq;
  body.v = 1; /* 판 번호는 검사 뒤에 붙인다 (savePicks 와 같은 차례) */
  var 됨 = !숫자 && lsSet(storeKey(이름), JSON.stringify(body));
  if (!됨) {
    drawImportStart();
    importNote('저장하지 못해 불러오지 않았습니다. 기존 분류는 그대로입니다.', false, 'start');
    return;
  }
  /* 거래내역을 올리면 이 매장으로 이어진다 (afterFiles) */
  PICKED_STORE = { key: storeKey(이름), name: 이름 || '(기본)', n: n곳, 불러옴: true };
  drawUpMine();
  drawImportStart();
  var 알림 = importNote('분류를 불러왔습니다. 이 매장의 거래내역을 올려주세요.', true, 'start');
  var go = el('button', 'b on', '거래내역 올리기');
  go.type = 'button';
  go.style.marginLeft = '8px';
  go.addEventListener('click', function () {
    var inp = document.getElementById('upinput');
    if (inp) {
      inp.value = '';
      inp.click();
    }
  });
  알림.appendChild(go);
}
/* ★ 119차. 거래내역 올리기 전 불러오기 — 어느 매장에 넣을지 고르신다.
   ★ 같은 이름이라는 이유로 저절로 덮지 않는다. 기존 매장은 합치고, 새 매장은 없는 이름이어야 한다 */
function importChooseStore(o) {
  drawImportStart();
  var host = importHost('start');
  var box = el('div', 'catpanel');
  box.appendChild(el('div', 'addq', '어느 매장에 불러올까요?'));
  box.appendChild(
    el('div', 'obsub', '파일의 매장 이름: ' + (o.store ? o.store : '파일에 매장 이름 없음'))
  );
  var mine = [];
  try {
    mine = savedStores();
  } catch (e) {
    mine = [];
  }
  if (mine.length) {
    var 줄 = el('div', 'addrow');
    mine.forEach(function (k) {
      var b = el('button', 'b', k.name === '(기본)' ? '이름 없이 정해둔 것' : k.name);
      b.type = 'button';
      b.addEventListener('click', function () {
        importAsk(o, k.name === '(기본)' ? null : k.name, 'start', true, false);
      });
      줄.appendChild(b);
    });
    box.appendChild(줄);
  }
  box.appendChild(el('div', 'obsub', '새 매장으로 만들기'));
  var 새줄 = el('div', 'addrow');
  var inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'nminput';
  inp.value = o.store || '';
  inp.placeholder = BIZ.곳 + ' 이름';
  새줄.appendChild(inp);
  var mk = el('button', 'b on', '새 매장으로');
  mk.type = 'button';
  var msg = el('div', 'lswarn');
  msg.hidden = true;
  mk.addEventListener('click', function () {
    var nm = String(inp.value || '').trim();
    if (!nm) {
      msg.textContent = BIZ.곳 + ' 이름을 적어주세요.';
      msg.hidden = false;
      return;
    }
    var 있음 =
      !!lsGet(storeKey(nm)) ||
      mine.some(function (k) {
        return k.name === nm;
      });
    if (있음) {
      msg.textContent =
        '이미 있는 매장 이름입니다. 위에서 그 매장을 고르시거나 다른 이름을 적어주세요.';
      msg.hidden = false;
      return;
    }
    importAsk(o, nm, 'start', true, true);
  });
  새줄.appendChild(mk);
  box.appendChild(새줄);
  box.appendChild(msg);
  var no = el('button', 'b', '취소');
  no.type = 'button';
  no.style.marginTop = '8px';
  no.addEventListener('click', function () {
    drawImportStart();
  });
  box.appendChild(no);
  host.insertBefore(box, host.firstChild);
  try {
    box.scrollIntoView({ block: 'center' });
  } catch (e) {}
}
/* ★ 119차. 거래내역 올리기 화면의 [분류 파일 불러오기] 자리 — 파일 고르는 자리 바로 아래.
   주 단추(파일 고르기)보다 한 단계 낮은 모양이다 */
function drawImportStart() {
  var drop = document.getElementById('updrop');
  if (!drop || !drop.parentNode) return;
  var host = document.getElementById('upimport');
  if (!host) {
    host = el('div', 'upimport');
    host.id = 'upimport';
  }
  if (host.previousSibling !== drop) drop.parentNode.insertBefore(host, drop.nextSibling);
  host.innerHTML = '';
  var row = el('div', 'upimportrow');
  row.appendChild(el('div', 'obsub', '다른 기기에서 받은 분류 파일을 먼저 불러올 수 있습니다.'));
  var b = el('button', 'b', '분류 파일 불러오기');
  b.type = 'button';
  b.addEventListener('click', function () {
    useScreen('분류 파일 불러오기');
    IMPORT_WHERE = 'start';
    var f = document.getElementById('pickfile');
    if (f) f.click();
  });
  row.appendChild(b);
  host.appendChild(row);
}

/* 계산은 core/result.js 의 etcNameIn — 지금 매장(UP)을 넘긴다 */
function etcName() {
  return etcNameIn(UP);
}

/* 계산은 core/compute.js 의 catPayeesIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function catPayees(d, cat) {
  return catPayeesIn(UP, d, cat);
}

/* 계산은 core/result.js 의 keepPayeesIn — 지금 매장(UP)을 넘긴다 */
function keepPayees(d, cat, isIn, skipOnly) {
  return keepPayeesIn(UP, d, cat, isIn, skipOnly);
}
/* 계산은 core/result.js 의 keepCountIn — 지금 매장(UP)을 넘긴다 */
function keepCount(d, cat, isIn, skipOnly) {
  return keepCountIn(UP, d, cat, isIn, skipOnly);
}
/* 펼친 목록. 「그 밖의 입금」과 같은 모양으로 맞춘다 —
   거래처 줄마다 [항목 바꾸기]가 붙는다 */
function drawKeepDetail(host, d, cat, isIn, skipOnly, after) {
  var list = keepPayees(d, cat, isIn, skipOnly);
  var box = el('div', 'dtl');
  list.slice(0, DTL_STEP).forEach(function (e) {
    var g = UP.byName[e.name];
    var row = el('div', 'drow');
    var nm = el('div', 'dnm');
    var au = g && (g.mixed ? g.autoIn || g.autoOut : g.auto);
    nm.appendChild(el('span', au ? 'mark auto' : 'mark mine', au ? '⚙' : '✓'));
    nm.appendChild(document.createTextNode(showName(e.name) + ' · ' + e.n + '건'));
    if (g && g.askSkip) nm.appendChild(el('span', 'autotag', '(앱이 넘김)'));
    else if (au) nm.appendChild(el('span', 'autotag', '(앱이 넣음)'));
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
      /* 앱이 넘긴 것을 손으로 바꾸시면 다시 넘기지 않는다 */
      if (g && g.askSkip) unskipAsk(g);
      drawChangeMenu(menu, g, after);
      menu.hidden = false;
    });
  });
  if (list.length > DTL_STEP) {
    box.appendChild(
      el(
        'div',
        'subnote',
        '금액이 큰 ' + DTL_STEP + '곳만 보여드립니다 (전부 ' + won(list.length) + '곳)'
      )
    );
  }
  host.appendChild(box);
}

var DTL_STEP = 12; /* 한 번에 보여주는 거래처 수 */

/* ── 43차 4단계 · 그 자리에서 정하기 ────────────────────────
   「아직 안 정한 돈 2,327만원」을 읽고 나서 할 수 있는 게 없었다.
   온보딩으로 돌아가야 하는데 사장님은 그러지 않으신다.
   ★ 금액 큰 순으로 늘어놓고, 그 줄에서 항목을 찍으면 바로 위 숫자가 다시 계산된다.
   ★ 버튼은 온보딩에서 쓰던 drawChangeMenu 를 그대로 쓴다. 새로 만들지 않는다 */
function drawUnsetDetail(host, d, months) {
  var list = Object.keys(d.unkPayees || {})
    .map(function (nm) {
      return { name: nm, sum: d.unkPayees[nm] };
    })
    .sort(function (a, b) {
      return b.sum - a.sum;
    });
  if (!list.length) return;
  /* ★ 119차. 차례로 정하기 — 첫 거래처 위 오른쪽에 단추 하나.
     보이는 목록의 거래처를 기존 거래처 확인 화면에서 차례로 묻는다. 물을 곳이 없으면 안 낸다 */
  var 보이는 = list.slice(0, DTL_STEP).map(function (e) {
    return e.name;
  });
  var 물을 = 보이는.filter(function (nm) {
    var g = UP.byName[nm];
    return g && !gDone(g) && !g.cardMixed;
  });
  if (물을.length) {
    var gorow = el('div', 'unsetgo');
    var go = el('button', 'b on', '차례로 정하기'); /* ★ 119차. 주요 실행 단추 색 (b on) */
    go.type = 'button';
    go.addEventListener('click', function (e) {
      e.stopPropagation();
      useScreen('차례로 정하기');
      listAskStart(보이는, months);
    });
    gorow.appendChild(go);
    host.appendChild(gorow);
  }
  var box = el('div', 'dtl');
  list.slice(0, DTL_STEP).forEach(function (e) {
    var g = UP.byName[e.name];
    if (!g) return;
    var row = el('div', 'drow');
    var nm = el('div', 'dnm');
    nm.appendChild(el('span', 'mark mine', '?'));
    nm.appendChild(document.createTextNode(showName(e.name)));
    row.appendChild(nm);
    row.appendChild(el('div', 'dv num', won(e.sum)));
    var ch = el('div', 'dch');
    var btn = el('button', 'chbtn', '정하기');
    btn.type = 'button';
    ch.appendChild(btn);
    row.appendChild(ch);
    box.appendChild(row);
    /* ★ 68차 ①. 「이 사람이 누구지」가 바로 이 목록에서 생긴다.
       정하기 화면에 넣은 부품을 그대로 단다 — 같은 모양·같은 원칙(사실만).
       ★ 결과 화면이므로 다시 그리는 것은 drawResult 다 */
    drawRawPeek(
      box,
      g.rawList || [g.name],
      function () {
        drawResult(months);
      },
      nm
    );
    var menu = el('div', 'menu');
    menu.hidden = true;
    box.appendChild(menu);
    btn.addEventListener('click', function () {
      if (!menu.hidden) {
        menu.hidden = true;
        return;
      }
      /* 앱이 넘긴 것을 손으로 바꾸시면 다시 넘기지 않는다 */
      if (g.askSkip) unskipAsk(g);
      drawChangeMenu(menu, g, function () {
        drawResult(months);
      });
      menu.hidden = false;
    });
  });
  if (list.length > DTL_STEP) {
    box.appendChild(
      el(
        'div',
        'subnote',
        '금액이 큰 ' + DTL_STEP + '곳만 보여드립니다 (전부 ' + won(list.length) + '곳)'
      )
    );
  }
  host.appendChild(box);
}

function drawDetail(host, d, cat) {
  var list = catPayees(d, cat);
  var box = el('div', 'dtl');
  var shown = UP.open[cat] === true ? DTL_STEP : UP.open[cat];
  var n = Math.min(list.length, shown);
  var catTotal = 0;
  list.forEach(function (e) {
    catTotal += Math.abs(e.sum);
  });

  list.slice(0, n).forEach(function (e) {
    var g = UP.byName[e.name];
    var auto = !!(g && g.auto);
    var row = el('div', 'drow');
    var nm = el('div', 'dnm');
    if (e.unknown) nm.appendChild(el('span', 'unk', '(아직 안 정함)'));
    else nm.appendChild(el('span', auto ? 'mark auto' : 'mark mine', auto ? '⚙' : '✓'));
    nm.appendChild(document.createTextNode(showName(e.name) + ' · ' + e.n + '건'));
    if (auto) nm.appendChild(el('span', 'autotag', '(앱이 넣음)'));
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
      drawChangeMenu(menu, g);
      menu.hidden = false;
    });

    /* 자동으로 잡은 것 중 금액이 큰 것은 사장님이 본 적이 없다. 확인을 권한다 */
    if (auto && catTotal > 0 && Math.abs(e.sum) / catTotal >= 0.2) {
      var ask = el('div', 'autoask');
      ask.appendChild(el('span', null, '↑ 이거 ' + cat + ' 맞나요?'));
      var yes = el('button', 'chbtn', '확인');
      yes.type = 'button';
      yes.addEventListener('click', function () {
        g.auto = false; /* 사장님이 확인한 것으로 바꾼다 */
        drawResult(monthList());
      });
      var no = el('button', 'chbtn', '다른 항목으로');
      no.type = 'button';
      no.addEventListener('click', function () {
        drawChangeMenu(menu, g);
        menu.hidden = false;
      });
      ask.appendChild(yes);
      ask.appendChild(no);
      box.appendChild(ask);
    }
  });
  if (list.length > n) {
    var more = el('div', 'dmore');
    var mb = el('button', 'oblink', '나머지 ' + (list.length - n) + '개 더 보기');
    mb.type = 'button';
    mb.addEventListener('click', function () {
      UP.open[cat] = n + DTL_STEP;
      drawResult(monthList());
    });
    more.appendChild(mb);
    box.appendChild(more);
  }
  host.appendChild(box);
}

/* ── 이미지로 저장 ──
   라이브러리를 불러오면 파일이 밖으로 안 나간다는 원칙이 깨진다.
   그래서 화면을 SVG의 foreignObject에 담아 canvas로 옮겨 직접 그린다 */
function saveImage(btn, ready) {
  var src = document.getElementById('up-result');
  var W = 760;
  var wrap = document.createElement('div');
  wrap.setAttribute(
    'style',
    /* ★ 88차 ①. 저장 그림은 늘 1단으로 그린다 — 종이 폭이 760px 이라 줄을 쌓을 까닭이 없고,
       그림은 body 밖(SVG 안)에서 그려져서 :root 의 「글씨 한 칸」이 안 닿는다.
       여기서 한 번 못 박아 두면 어느 단에서 저장하셔도 그림은 같다 */
    '--fu:1px;width:' +
      W +
      'px;background:var(--paper);padding:28px 30px 24px;' +
      'font-family:inherit;color:var(--ink);box-sizing:border-box'
  );

  var head = document.createElement('div');
  head.setAttribute('style', 'font-size:17px;font-weight:800;margin-bottom:4px');
  head.textContent = storeName();
  wrap.appendChild(head);
  var sub = document.createElement('div');
  sub.setAttribute('style', 'font-size:13px;color:var(--gray);margin-bottom:14px');
  var lastD = lastDayIn(UP.month),
    mmN = +UP.month.slice(5, 7);
  /* 1년치를 저장하는데 한 달 기간이 적혀 있으면 받는 사람이 헷갈린다.
     보고 있는 화면이 무엇인지에 따라 머리를 달리 쓴다 */
  if (UP.view === 'year') {
    var ms = monthList();
    var a = ms[0],
      b = ms[ms.length - 1];
    sub.textContent =
      a.slice(0, 4) +
      '년 ' +
      +a.slice(5, 7) +
      '월 ~ ' +
      (a.slice(0, 4) === b.slice(0, 4) ? '' : b.slice(0, 4) + '년 ') +
      +b.slice(5, 7) +
      '월 · 실제 숫자입니다';
    if (isRunning(b, ms)) {
      var sub2 = document.createElement('div');
      sub2.setAttribute('style', 'font-size:13px;color:var(--gray);margin:-10px 0 14px');
      sub2.textContent = +b.slice(5, 7) + '월은 ' + lastDayIn(b) + '일까지입니다';
      wrap.appendChild(sub);
      wrap.appendChild(sub2);
    } else {
      wrap.appendChild(sub);
    }
  } else {
    sub.textContent =
      UP.month.slice(0, 4) +
      '년 ' +
      mmN +
      '월 1일 ~ ' +
      mmN +
      '월 ' +
      lastD +
      '일 · 실제 숫자입니다';
    wrap.appendChild(sub);
  }

  var body = src.cloneNode(true);
  /* ★ 42차 4번. 화면이 아니라 이 사본에서만 가린다 */
  if (!UP || UP.hideNames !== false) maskPersons(body);
  /* 눌러야 뜻이 있는 것들은 이미지에서 뺀다 */
  [
    'button',
    '.rmode',
    '.rsel select',
    '.unsetacts',
    '.ckbtns',
    '.ckfix',
    '.menu',
    '.dmore',
    '.dsc'
  ].forEach(function (sel) {
    [].slice.call(body.querySelectorAll(sel)).forEach(function (e) {
      e.remove();
    });
  });
  /* ★ 88차 ②. 「자세히 ▾」 상자도 눌러야 뜻이 있는 것이라 그림에서는 뺀다 */
  [].slice.call(body.querySelectorAll('.chev, .foldchip')).forEach(function (e) {
    e.remove();
  });
  var sel = body.querySelector('.rsel');
  if (sel) sel.remove();
  body.hidden = false;
  body.setAttribute('style', 'display:block');
  wrap.appendChild(body);

  var foot = document.createElement('div');
  foot.setAttribute(
    'style',
    'margin-top:18px;padding-top:12px;border-top:1px solid var(--line);' +
      'font-size:12px;color:var(--gray);line-height:1.6'
  );
  foot.textContent = DISCLAIMER;
  wrap.appendChild(foot);

  /* 저장 파일은 폭 제한이 없다. 표가 잘리면 저장한 뜻이 없다 —
     폰에서는 두 달씩밖에 안 보여서 이 그림이 여덟 달을 보는 유일한 길이다 */
  [].slice.call(body.querySelectorAll('.ywrap')).forEach(function (w) {
    w.setAttribute('style', 'overflow:visible');
  });

  /* 재는 동안만 화면 밖에 붙여둔다 */
  var stage = document.createElement('div');
  stage.setAttribute('style', 'position:fixed;left:-10000px;top:0;width:' + W + 'px');
  stage.appendChild(wrap);
  document.body.appendChild(stage);
  /* ★ 88차 ①. 재는 동안만 큰 단을 벗긴다 — 종이는 늘 1단이다.
     안 벗기면 재는 자리(body 안)에서는 줄이 쌓이고 그려지는 자리(SVG 안)에서는 안 쌓여,
     잰 높이와 그린 높이가 어긋나 그림 아래에 빈 자리가 남는다.
     그림을 다 뜬 뒤 그대로 되돌린다 (아래 removeChild 자리) */
  var 벗긴단 = 글씨단 > FONT_MIN ? 'fs' + 글씨단 : '';
  if (벗긴단) document.body.classList.remove(벗긴단);

  /* 표가 화면 폭보다 넓으면 그만큼 종이를 넓힌다 */
  var wide = 0;
  [].slice.call(wrap.querySelectorAll('table')).forEach(function (t) {
    wide = Math.max(wide, Math.ceil(t.getBoundingClientRect().width));
  });
  if (wide + 60 > W) {
    W = wide + 60;
    wrap.style.width = W + 'px';
    stage.style.width = W + 'px';
  }
  var H = Math.ceil(wrap.getBoundingClientRect().height);

  var css = '';
  [].slice.call(document.styleSheets).forEach(function (sheet) {
    try {
      [].slice.call(sheet.cssRules).forEach(function (rule) {
        css += rule.cssText + '\n';
      });
    } catch (e) {}
  });

  var html = new XMLSerializer().serializeToString(wrap);
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    W +
    '" height="' +
    H +
    '">' +
    '<foreignObject width="100%" height="100%">' +
    '<div xmlns="http://www.w3.org/1999/xhtml">' +
    '<base href="' +
    document.baseURI +
    '" />' +
    '<style>' +
    css +
    '</style>' +
    html +
    '</div>' +
    '</foreignObject></svg>';
  document.body.removeChild(stage);
  if (벗긴단) document.body.classList.add(벗긴단);

  var img = new Image();
  img.onload = function () {
    var s = 2; /* 폰에서도 읽히게 두 배로 */
    var cv = document.createElement('canvas');
    cv.width = W * s;
    cv.height = H * s;
    var cx = cv.getContext('2d');
    cx.fillStyle = '#fff';
    cx.fillRect(0, 0, cv.width, cv.height);
    cx.setTransform(s, 0, 0, s, 0, 0);
    cx.drawImage(img, 0, 0);
    cv.toBlob(function (blob) {
      if (!blob) {
        if (ready) ready(null);
        if (btn) btn.textContent = '전체보기';
        return;
      }
      /* 전체보기에서는 바로 내려받지 않고, 실제 저장될 그림을 먼저 돌려준다. */
      if (ready) {
        ready(blob);
        if (btn) btn.textContent = '전체보기';
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = storeName() + ' ' + UP.month + ' 남는돈.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
      if (btn) btn.textContent = '전체보기';
    }, 'image/png');
  };
  img.onerror = function () {
    if (ready) ready(null);
    if (btn) btn.textContent = '저장하지 못했습니다';
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return { w: W, h: H };
}

/* ── 78차 · 전체보기 ─────────────────────────────────────────
   지금까지는 잘린 화면에서 곧바로 저장을 눌러야 했다.
   saveImage가 만드는 실제 그림을 먼저 보여 주고, 그 그림을 확인한 뒤 저장한다. */
function openImagePreview(btn) {
  if (document.querySelector('.imgpreview')) return;
  if (UP.hideNames === undefined) UP.hideNames = true;

  var oldOverflow = document.body.style.overflow;
  var url = null,
    closed = false,
    turn = 0;
  var over = el('div', 'imgpreview');
  over.setAttribute('role', 'dialog');
  over.setAttribute('aria-modal', 'true');
  over.setAttribute('aria-label', UP.view === 'year' ? '1년 전체보기' : '한 달 전체보기');

  var head = el('div', 'imgprevhead');
  head.appendChild(
    el('div', 'imgprevtitle', UP.view === 'year' ? '1년 전체보기' : '한 달 전체보기')
  );
  var headActs = el('div', 'imgprevheadacts');
  var down = el('button', 'b on', '이미지 저장');
  down.type = 'button';
  down.disabled = true;
  var headClose = el('button', 'b', '닫기');
  headClose.type = 'button';
  headActs.appendChild(down);
  headActs.appendChild(headClose);
  head.appendChild(headActs);
  over.appendChild(head);

  var body = el('div', 'imgprevbody');
  var loading = el('div', 'imgprevloading', '전체 화면 만드는 중…');
  body.appendChild(loading);
  over.appendChild(body);

  var foot = el('div', 'imgprevfoot');
  var hide = el('label', 'savehide');
  var check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = UP.hideNames !== false;
  hide.appendChild(check);
  hide.appendChild(document.createTextNode(' 사람 이름 가리기 (홍○○)'));
  foot.appendChild(hide);
  over.appendChild(foot);

  function finish() {
    if (closed) return;
    closed = true;
    turn++;
    if (url) URL.revokeObjectURL(url);
    if (over.parentNode) over.parentNode.removeChild(over);
    document.body.style.overflow = oldOverflow;
    if (btn) btn.textContent = '전체보기';
  }
  function renderPreview() {
    var mine = ++turn;
    if (url) {
      URL.revokeObjectURL(url);
      url = null;
    }
    down.disabled = true;
    body.innerHTML = '';
    body.appendChild(el('div', 'imgprevloading', '전체 화면 만드는 중…'));
    if (btn) btn.textContent = '만드는 중…';
    setTimeout(function () {
      saveImage(btn, function (blob) {
        if (closed || mine !== turn) return;
        body.innerHTML = '';
        if (!blob) {
          body.appendChild(el('div', 'imgprevloading', '전체 화면을 만들지 못했습니다'));
          return;
        }
        url = URL.createObjectURL(blob);
        var picture = document.createElement('img');
        picture.className = 'imgprevimg';
        picture.alt = UP.view === 'year' ? '1년 결과 전체 이미지' : '한 달 결과 전체 이미지';
        picture.src = url;
        body.appendChild(picture);
        body.scrollTop = 0;
        down.disabled = false;
      });
    }, 30);
  }
  headClose.addEventListener('click', finish);
  check.addEventListener('change', function () {
    UP.hideNames = check.checked;
    renderPreview();
  });
  down.addEventListener('click', function () {
    if (!url) return;
    useScreen('이미지로 저장');
    var a = document.createElement('a');
    a.href = url;
    a.download = storeName() + ' ' + UP.month + ' 남는돈.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  document.body.appendChild(over);
  document.body.style.overflow = 'hidden';
  useScreen('전체보기');
  renderPreview();
}

/* 매출이 아닌 입금이 어디서 들어왔는지 */
function drawInDetail(host, d) {
  var m = d.otherInPayees;
  var list = Object.keys(m)
    .map(function (k) {
      return { name: k, sum: m[k] };
    })
    .sort(function (a, b) {
      return b.sum - a.sum;
    });
  var box = el('div', 'dtl');
  list.slice(0, 12).forEach(function (e) {
    var g = UP.byName[e.name];
    var row = el('div', 'drow');
    var nm = el('div', 'dnm');
    if (!gDone(g)) nm.appendChild(el('span', 'unk', '(아직 안 정함)'));
    nm.appendChild(document.createTextNode(showName(e.name)));
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
      drawChangeMenu(menu, g);
      menu.hidden = false;
    });
  });
  if (list.length > 12) {
    box.appendChild(el('div', 'dmore', '외 ' + won(list.length - 12) + '곳'));
  }
  host.appendChild(box);
}

/* ★ 82차 ④. 몇 달 미만이면 「평균이 아직 안 잡힐 수 있다」를 적는가.
   여섯 달 안팎이 적당하다는 요청서 판단을 그대로 쓴다 */
var SHORT_SPAN_MONTHS = 6;
/* ★ 82차 ⑤. 나눠 올려도 합쳐진다 — 71차 ②로 기능은 이미 있는데 화면에 안 적혀 있었다.
   ○○ 약사가 파일 용량 때문에 5개월치만 넣으셨다.
   ★ 두 가지를 다 말해야 한다. 「합쳐진다」만 있으면
     「그럼 처음부터 다시 분류해야 하나」 싶어 안 하시게 된다 */
var SPLIT_UPLOAD_TIP = '나눠 올려도 합쳐집니다. 이미 정하신 거래처는 다시 묻지 않습니다.';

/* 화면 맨 아래 면책 문구. 숫자를 가리지 않게 회색 작은 글씨로 끝에만 둔다 */
/* 「추정치」가 아니다 — 계좌에 찍힌 것을 더한 것이고 검산까지 맞춰놨다.
   그렇게 써두면 사장님이 우리 숫자를 안 믿으신다.
   자문이냐 아니냐보다 무엇이 안 들어 있는지가 훨씬 쓸모 있다 */
var DISCLAIMER_1 = '이 계좌에 들어오고 나간 돈만 셌습니다.';
var DISCLAIMER_2 = [
  '현금 매출 · 다른 계좌 · 개인카드로 쓰신 사업비 · 외상 · 재고는 들어 있지 않습니다.',
  '회계상 계산하는 순이익과는 다를 수 있습니다.'
];
/* 이미지로 저장할 때는 접을 수가 없으니 한 덩이로 쓴다 */
var DISCLAIMER = DISCLAIMER_1 + ' ' + DISCLAIMER_2.join(' ');
/* ★ 76차. 결과 화면에는 회계상 순이익과 다를 수 있다는 핵심 한 줄만 남긴다.
   자세히 단추도 두지 않는다 — 설명보다 결론 숫자가 먼저 보이게 한다. */
function dscLine(host) {
  var box = el('div', 'dsc');
  box.appendChild(el('div', null, DISCLAIMER_2[1]));
  host.appendChild(box);
}

/* ── 53차 ① · 낱말 뜻 ─────────────────────────────────────────
   49차에 이름을 하나로 맞췄다. 그런데 이름이 하나여도 그 이름이 무슨 뜻인지는
   화면 어디에도 없었다. 「계좌 순이익」이 뭔지 물어볼 자리가 없다.
   ★ 설명서를 통째로 넣지 않는다 — 43차 원칙(숫자와 설명 최소화)과 부딪히고,
     설명서를 읽어야 쓸 수 있는 앱이면 이미 진 것이다.
     필요한 순간에, 그 자리에서, 두 줄만.
   ★ 「통장」은 화면 금지어라 「계좌」로 적는다 (검사 5). 뜻은 그대로다.
   ★ 열쇠는 'why:' 로 가른다 — 같은 줄에 ▾(안을 본다)와 ?(이게 뭔지)가
     둘 다 있어서, 안 가르면 하나를 누를 때 다른 하나가 같이 열린다.
     51차에 항목 열쇠를 안 가른 것은 맞았지만 여기는 같은 이름에 두 상태다 */
var WHY = {
  in: [
    '이 계좌에 들어온 돈 중에서 매출과 그 밖의 입금을 더한 금액입니다.',
    '대출로 들어온 돈이나 {{주인}}이 넣으신 돈은 여기 안 들어갑니다.'
  ],
  out: [
    '이 계좌에서 나간 돈 중에서 사업에 쓴 것만 더한 금액입니다.',
    '{{주인}}이 가져가신 돈이나 개인 지출은 여기 안 들어갑니다.'
  ],
  profit: [
    '사업으로 번 돈에서 사업에 쓴 돈을 뺀 금액입니다.',
    '회계상 계산하는 순이익과는 다를 수 있습니다.',
    /* ★ 82차 ③. ○○ 약사 지적 — 약국은 매입한 의약품을 반품할 수 있고
              재고로도 남는다. 식당처럼 그달에 다 소모되는 업종이 아니다.
              ★ 업종으로 가르지 않는다. 물음표 안에만 두고 기본 화면에는 안 보인다 —
                DISCLAIMER_2 는 안 건드린다 (그쪽이 기본 화면에 나가는 줄이다) */
    '산 물건이 재고로 남는 업종은 계좌에서 나간 돈이 그달의 비용과 다를 수 있습니다.',
    '이 계좌에 실제로 오간 돈만 셉니다. 현금 매출·외상·재고는 안 들어 있습니다.',
    '대출 상환은 지출에 들어갑니다.'
  ],
  unset: [
    '매출인지 지출인지 아직 안 정하신 거래입니다.',
    '정하기 전까지는 매출에도 지출에도 안 넣습니다. 그래서 순이익이 달라질 수 있습니다.',
    /* ★ 82차 ⑥. 0으로 만들어야 하는 자리가 아니다 */
    '다 채우지 않으셔도 됩니다. 확실하지 않은 것을 억지로 정하면 숫자가 오히려 틀어집니다.'
  ],
  keep: [
    '사업이 아니라 {{주인}} 개인으로 오간 돈입니다.',
    '매출도 지출도 아니라 순이익에서 뺐습니다. 잔액에는 반영됩니다.'
  ],
  bal: [
    '그 달 마지막 날 계좌에 남아 있던 돈입니다.',
    '순이익과 다릅니다 — 사업 외 용도까지 오간 뒤의 금액이라서요.'
  ],
  /* 진행 중인 달에는 「지금 계좌 잔액」이라 첫 줄이 달라야 한다 */
  balnow: [
    '오늘까지 계좌에 남아 있는 돈입니다.',
    '순이익과 다릅니다 — 사업 외 용도까지 오간 뒤의 금액이라서요.'
  ]
};
function whyKey(id) {
  return 'why:' + id;
}
/* 누르면 그 줄의 ▾ 는 안 열린다. 반대도 마찬가지다.
   ★ 54차 ③. 열어둔 ? 는 채워진다. data-why 로 짝을 지어
     아래 fixWhyTails() 가 말풍선 꼬리를 이 ? 밑에 맞춘다 */
function whyMark(id, redraw) {
  var q = el('span', 'why' + (whyOpen(id) ? ' on' : ''), '?');
  q.title = '이게 무슨 뜻인가요';
  q.setAttribute('data-why', id);
  q.addEventListener('click', function (e) {
    e.stopPropagation();
    var k = whyKey(id);
    if (UP.open[k]) delete UP.open[k];
    else UP.open[k] = true;
    redraw();
  });
  return q;
}
function whyOpen(id) {
  return !!UP.open[whyKey(id)];
}
/* ★ 66차 ⑤. WHY 는 파일을 읽을 때 한 번 만들어지는데 업종은 나중에 정해진다.
   그래서 글에는 {{주인}} 을 넣어두고 그릴 때 채운다 —
   정적 화면의 fillBiz 와 같은 방식이다 (새 장치를 만들지 않는다) */
function bizWord(t) {
  return String(t).split('{{주인}}').join(BIZ.주인).split('{{곳}}').join(BIZ.곳);
}
function whyBox(id) {
  var b = el('div', 'whytip');
  b.setAttribute('data-why', id);
  WHY[id].forEach(function (t, i) {
    var line = el('div', null);
    /* ★ 54차 ③. 첫 줄에만 붙인다 — 꼬리가 「어디서 왔는지」를,
       이 ? 가 「이게 무엇인지」를 말한다. 둘 다 있어야 한다 */
    if (i === 0) line.appendChild(el('span', 'why whyq', '?'));
    line.appendChild(document.createTextNode(bizWord(t)));
    b.appendChild(line);
  });
  return b;
}
var WHY_TAIL = 7; /* 꼬리 높이 (border-width 와 같아야 한다) */
/* ── 54차 ③ · 말풍선 꼬리를 누른 ? 밑에 맞춘다 ─────────────────
   라벨 길이가 줄마다 달라 ? 자리가 다르다. 그릴 때마다 새로 잰다.
   ★ x 를 두 번 맞춘다. 가운데에서 상자를 위로 끌어올리기 때문에
     한 번만 맞추면 그만큼 어긋난다.
   ★ 1년치 표에서도 같다 — 상자와 ? 가 같은 가로 스크롤 상자 안이라
     둘의 상대 거리가 스크롤과 무관하다 */
function fixWhyTails() {
  var boxes = document.querySelectorAll('.whytip[data-why]');
  for (var i = 0; i < boxes.length; i++) {
    var box = boxes[i];
    var q = document.querySelector('.why[data-why="' + box.getAttribute('data-why') + '"]');
    if (!q) continue;
    box.style.marginTop = ''; /* 다시 잴 때는 CSS 값에서 시작한다 */
    var qr = q.getBoundingClientRect(),
      br = box.getBoundingClientRect();
    box.style.setProperty('--tx', Math.round(qr.left - br.left + 1) + 'px');
    /* 줄의 아래 여백만큼 꼬리가 떠 있다. 그 틈을 재서 없앤다 */
    var gap = box.getBoundingClientRect().top - q.getBoundingClientRect().bottom;
    var m = parseFloat(getComputedStyle(box).marginTop) || 0;
    box.style.marginTop = m - gap + WHY_TAIL + 'px';
    /* 상자가 움직였으니 x 를 한 번 더 맞춘다 */
    var qr2 = q.getBoundingClientRect(),
      br2 = box.getBoundingClientRect();
    box.style.setProperty('--tx', Math.round(qr2.left - br2.left + 1) + 'px');
  }
}
/* 창 크기가 바뀌면 ? 자리가 달라진다 */
window.addEventListener('resize', function () {
  try {
    fixWhyTails();
  } catch (e) {}
});
