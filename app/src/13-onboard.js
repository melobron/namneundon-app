/* ── 매장 이름 ── 이름만 남는다. 거래내역과 금액은 창을 닫으면 사라진다 */
function storeName() { return UP && UP.store ? UP.store : '내 ' + BIZ.곳; }

/* ── 금액 옆에는 반드시 그 금액이 어느 기간인지 ──
   사장님은 계좌와 대조하는 사람이다. 기간을 모르면 대조를 못 한다.
   「이번 달 672만원」 아래에 파일 전체 합계 −3,223만원이 라벨 없이 놓이면
   같은 돈인지조차 알 수 없다 */
/* ── 은행에서 잘려 들어온 이름 ──
   적요 칸 글자 수 제한 때문에 원본이 이렇게 들어온다.
     '주식회사 ○○○('  '(주)○○○(쇼'  '홍길동(○○제지서울'
   ★ 안 닫힌 여는 괄호만 증거로 쓴다.
     '_' 나 '-' 뒤의 1~2글자는 잘린 조각일 수도, 온전한 말일 수도 있어 구분이 안 된다
     ('대표_○○' 의 ○○, 'ARS_모빌' 의 모빌, '쿠팡_주' 는 전부 온전한 이름이다).
     닫힌 괄호는 온전하다는 뜻이므로 손대지 않는다 ('코웨이(주)').
   ★ 표시할 때만 다듬는다. 저장 키(rawList)는 원본 그대로 —
     여기 손대면 지난달 찍은 게 다 깨진다 */
function openParenAt(s) {
  var stack = [];
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (c === '(') stack.push(i);
    else if (c === ')') stack.pop();
  }
  return stack.length ? stack[0] : -1;   /* 처음으로 안 닫힌 괄호 */
}
function cutTail(name) {
  var s = String(name == null ? '' : name);
  var i = openParenAt(s);
  if (i >= 0) {
    var inside = s.slice(i + 1);
    /* 한두 글자면 버려도 잃을 게 없고, 세 글자부터는 정보라 남기고 잘렸다고 표시한다 */
    s = inside.length <= 2 ? s.slice(0, i) : s + '…)';
  }
  /* 끝에 남은 구분자만. 중간 것은 절대 안 건드린다 */
  return s.replace(/[\s_,\-]+$/, '');
}
function isCut(name) {
  var t = cutTail(name);
  return !!t && t !== String(name == null ? '' : name);
}
function showName(name) {
  var t = cutTail(name);
  return t || String(name == null ? '' : name);   /* 다 지워지면 원본 그대로 */
}

function payeeSpan(g) {
  var k = Object.keys((g && g.months) || {}).sort();
  if (!k.length) return '';
  var mm = function (m) { return (+m.slice(5, 7)) + '월'; };
  var y0 = k[0].slice(0, 4), y1 = k[k.length - 1].slice(0, 4);
  if (k.length === 1) return y0 + '년 ' + mm(k[0]);
  if (y0 === y1) return y0 + '년 ' + mm(k[0]) + '~' + mm(k[k.length - 1]);
  return y0 + '년 ' + mm(k[0]) + '~' + y1 + '년 ' + mm(k[k.length - 1]);
}
/* ── 35차 B · 거래처 카드의 방향별 사실 줄 ── */
function midOf(xs) {
  var s = xs.slice().sort(function (a, b) { return a - b; });
  return s.length ? s[(s.length - 1) >> 1] : 0;
}
function dayText(at) {
  return (+at.slice(5, 7)) + '월 ' + (+at.slice(8, 10)) + '일';
}
/* 한쪽 방향의 달 범위 — 「4월~8월」
   ★ 해를 넘기면 해를 밝힌다. 안 그러면 2025년 8월~2026년 8월이 「8월~8월」이 된다 */
function sideSpan(g, isIn) {
  return spanOf(Object.keys(isIn ? g.inMonths : g.outMonths).sort());
}
/* 정기성은 규칙에 맞을 때만 말한다. 짐작해서 쓰지 않는다 —
   규칙에 안 맞으면 아무 말도 안 붙인다 (35차 B) */
function repeatLine(g, isIn) {
  var months = Object.keys(isIn ? g.inMonths : g.outMonths).length;
  var n = isIn ? g.inN : g.outN;
  if (months < 3) return null;
  if (n < months || n > months * 2) return null;   /* 매달 1~2건 */
  var amts = isIn ? g.inAmts : g.outAmts;
  var mid = midOf(amts);
  var even = mid > 0 && amts.every(function (a) { return Math.abs(a - mid) <= mid * 0.2; });
  /* ★ 44차 2-1. 건수는 앞줄에서 이미 말했다. 여기서 또 쓰면 한 카드에 세 번 나온다 */
  /* ★ 64-3. 금액이 들쭉날쭉하면 「매달 나갑니다」만 나오고 총액뿐이었다 —
     실파일의 어느 거래처가 「7건 · 매달 나갑니다 — 총액」만 보여 한 달에 얼마인지 알 수 없었다.
     고르게 나가는 곳에는 이미 「매달 4일쯤 2,750,300원씩」이 나온다. 그 자리를 메운다.
     ★ 분모는 그 거래처가 있었던 달 수다. 없던 달을 0으로 세면 평균이 낮아진다 */
  var 합 = 0;
  amts.forEach(function (a) { 합 += a; });
  if (!even) {
    return '매달 ' + (isIn ? '들어옵니다' : '나갑니다') +
           ' — ' + won(months) + '달 평균 ' + won(Math.round(합 / months)) + '원쯤';
  }
  return '매달 ' + midOf(isIn ? g.inDays : g.outDays) + '일쯤 ' + won(mid) + '원씩';
}
/* ★ 44차 2-1. 차례를 기간 → 건수 → 금액으로 바꾼다.
   예전에는 금액이 왼쪽에 빨갛게 먼저 와서 눈이 거기부터 갔다 —
   「이 사람한테 5,600만원을 썼다고?」가 된다.
   기간과 건수를 먼저 읽으면 「10번 나눠 보냈구나」가 된다.
   금액은 오른쪽 끝에 둔다 */
function factLine(g, isIn) {
  var n = isIn ? g.inN : g.outN;
  if (!n) return null;
  var row = el('div', 'obfact');
  row.appendChild(el('span', 'flab', isIn ? '들어온 돈' : '나간 돈'));
  /* 금액에는 반드시 기간을 붙인다 (이름 4원칙 3) */
  var head = (n === 1 ? dayText(isIn ? g.inLast : g.outLast) : sideSpan(g, isIn)) +
             ' · ' + n + '건';
  var rp = repeatLine(g, isIn);
  if (rp) head += ' · ' + rp;
  row.appendChild(el('span', 'fmeta', head));
  row.appendChild(el('span', 'famt ' + (isIn ? 'in' : 'out'),
                     won(isIn ? g.inSum : g.outSum) + '원'));
  return row;
}

/* 한 카드 안에서 위는 +, 아래는 − 로 갈리면 같은 돈인지 헷갈린다.
   확인 카드 안에서는 부호를 늘 드러낸다 */
function wonSign(n) { return (n > 0 ? '+' : '') + won(n); }

function monthSpan() {
  var ms = {};
  UP.rows.forEach(function (r) { ms[r.at.slice(0, 7)] = 1; });
  var k = Object.keys(ms).sort();
  if (!k.length) return '';
  var f = function (m) { return m.slice(0, 4) + '년 ' + (+m.slice(5, 7)) + '월'; };
  return k.length === 1 ? f(k[0]) : f(k[0]) + ' ~ ' + f(k[k.length - 1]);
}

/* 공백·점·가운뎃점만 다른 매장이 이미 있는지. 여럿이면 가장 많이 정해둔 것 하나만 */
function similarStore(name) {
  var flat = function (s) { return s.replace(/[\s.·]/g, ''); };
  var n = flat(name), best = null;
  savedSummary().keys.forEach(function (k) {
    if (k.name === '(기본)' || k.name === name) return;
    if (flat(k.name) === n && (!best || k.n > best.n)) best = k;
  });
  return best;
}

function askName() {
  document.getElementById('uptitle').textContent = BIZ.곳 + ' 이름';
  upShow('up-name');
  var host = document.getElementById('up-name');
  host.innerHTML = '';
  host.appendChild(el('div', 'obsub',
    '파일을 읽었습니다. ' + won(UP.rows.length) + '건 · ' + monthSpan()));
  host.appendChild(el('div', 'obhead', BIZ.곳 + ' 이름을 알려주세요'));

  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'nminput';
  input.maxLength = 20;
  input.placeholder = '예: 1호점';
  input.value = UP.store || '';
  host.appendChild(input);
  host.appendChild(el('div', 'obcov', '건너뛰시면 「내 ' + BIZ.곳 + '」으로 표시됩니다.'));

  /* 한 달 뒤에 이름을 조금만 다르게 치면 다른 매장이 되어 되살림이 0곳이 된다.
     이미 정해두신 매장을 눌러 고르게 한다 */
  var saved = savedSummary();
  if (saved.keys.length) {
    var box = el('div', 'oldstores');
    box.appendChild(el('div', 'oshead', '전에 쓰시던 ' + BIZ.곳));
    var list = el('div', 'osbtns');
    saved.keys.sort(function (a, b) { return b.n - a.n; }).forEach(function (k) {
      var mine = (k.name === '(기본)');
      var label = mine ? '이름 없이 정해둔 것' : k.name;
      var line = el('div', 'osline');
      var b = el('button', 'osb', label + ' · ' + won(k.n) + '곳 정해둠');
      b.type = 'button';
      b.addEventListener('click', function () {
        UP.store = mine ? null : k.name;
        askOwner();
      });
      line.appendChild(b);
      /* 이름을 잘못 넣으면 그 이름을 영영 보게 된다. 지울 수 있어야 한다.
         고르기가 주된 일이라 [지우기]는 옅게 둔다 */
      var del = el('button', 'oslink', '지우기');
      del.type = 'button';
      var ask = el('div', 'saveask');
      ask.hidden = true;
      del.addEventListener('click', function () { ask.hidden = !ask.hidden; });
      line.appendChild(del);
      list.appendChild(line);

      ask.appendChild(el('div', 'addq',
        '「' + label + '」에 정해둔 ' + won(k.n) + '곳이 지워집니다. 되돌릴 수 없습니다.'));
      var arow = el('div', 'addrow');
      var yes = el('button', 'b on', '지우기');
      yes.type = 'button';
      yes.addEventListener('click', function () {
        /* 지우는 것은 이 매장뿐이다. fc_use·다른 매장은 안 건드린다.
           ★ 91차 ④. 거래내역(fc.data)도 같이 지운다 (위 시작 화면의 지우기와 같은 말) */
        lsDel(k.key);
        delData(k.name);
        askName();
      });
      var no = el('button', 'b', '취소');
      no.type = 'button';
      no.addEventListener('click', function () { ask.hidden = true; });
      arow.appendChild(yes); arow.appendChild(no);
      ask.appendChild(arow);
      list.appendChild(ask);
    });
    var neu = el('button', 'osb new', '새 ' + BIZ.곳);
    neu.type = 'button';
    neu.addEventListener('click', function () { input.value = ''; input.focus(); });
    list.appendChild(neu);
    box.appendChild(list);
    host.appendChild(box);
  }

  var askBox = el('div', 'simstore');
  askBox.hidden = true;
  host.appendChild(askBox);

  var acts = el('div', 'obdoneacts');
  var ok = el('button', 'b on', '다음');
  ok.type = 'button';
  ok.addEventListener('click', function () {
    var v = input.value.trim();
    /* 띄어쓰기만 다르게 치면 다른 매장이 되어 정해둔 게 통째로 날아간다.
       자동으로 합치지는 않고, 항목 추가할 때처럼 한 번 물어본다 */
    var near = v ? similarStore(v) : null;
    if (near) {
      askBox.hidden = false;
      askBox.innerHTML = '';
      askBox.appendChild(el('div', 'addq', '「' + v + '」로 새로 시작합니다.'));
      askBox.appendChild(el('div', 'cka',
        '혹시 「' + near.name + '」을 말씀하시는 건가요?'));
      askBox.appendChild(el('div', 'cka',
        '그 ' + BIZ.곳 + '에는 ' + won(near.n) + '곳을 정해두셨습니다.'));
      var row = el('div', 'addrow');
      var yes = el('button', 'b on', '네, 그 ' + BIZ.곳 + '이에요');
      yes.type = 'button';
      yes.addEventListener('click', function () { UP.store = near.name; askOwner(); });
      var no = el('button', 'b', '아니요, 새 ' + BIZ.곳 + '입니다');
      no.type = 'button';
      no.addEventListener('click', function () { UP.store = v; askOwner(); });
      row.appendChild(yes); row.appendChild(no);
      askBox.appendChild(row);
      return;
    }
    UP.store = v || null;
    askOwner();
  });
  var skip = el('button', 'oblink', '건너뛰기');
  skip.type = 'button';
  skip.addEventListener('click', function () { UP.store = null; askOwner(); });
  acts.appendChild(ok); acts.appendChild(skip);
  host.appendChild(acts);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok.click(); });
  input.focus();
}

/* ── 42차 4번 · 이미지로 저장할 때만 사람 이름을 가린다 ──────
   화면에 거래처 이름을 그대로 보여주는 것은 맞다 — 사장님이 통장과 대조하신다.
   문제는 「이미지로 저장」이다. 그 그림은 카톡으로 나가고,
   임대인·직원·거래처 사장 이름이 같이 나간다. 그분들은 동의한 적이 없다.
   ★ 화면은 그대로 두고 그림에서만 가린다. 사장님은 늘 온전한 이름을 보신다.
   ★ 대표자 이름 규칙(isOwnerName)은 여기 못 쓴다 —
     그건 「사장님 성함과 똑같은가」만 본다. 남의 이름은 판별하지 못한다.
   ★ 짐작이라 틀릴 수 있다. 「이마트」는 성씨 「이」로 시작한다.
     그래서 회사로 읽히는 꼬리말을 먼저 걸러내고, 그래도 틀리면
     사장님이 [사람 이름 가리기]를 끄실 수 있게 둔다 */
var SURNAME = ('김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구' +
               '민진지엄채원천방공현함변염여추도소석선설마길연위표명기반라왕금옥육인맹제모탁국' +
               '나사아자차카타파구용점편사')
              .split('');
/* ★ 「사람 이름으로 보이는가」는 이미 looksPersonal 이 판단한다 (CORP_MARKS 로 회사를 걸러낸다).
   같은 것을 두 군데서 다르게 판단하면 42차 2번에서 본 일이 또 생긴다.
   여기서는 그 위에 두 가지를 더 얹는다 — 그림은 밖으로 나가므로 더 좁게 본다.
     ① 성씨로 시작할 것
     ② 세 글자나 네 글자일 것. 두 글자까지 열면 「이자」가 사람이 되고,
        「대출이자」 한가운데가 「이○」로 바뀐다 */
function looksPersonName(w) {
  if (!/^[가-힣]{3,4}$/.test(w)) return false;
  /* 세금·보험·공과금 낱말은 사람이 아니다.
     실파일에서 보험료·세금 납부 항목 두 가지가 성씨로 시작해 사람으로 잡혔다 */
  if (taxLike(w)) return false;
  return looksPersonal(w) && SURNAME.indexOf(w.charAt(0)) !== -1;
}
/* 「홍길동」 → 「홍○○」. 첫 글자만 남긴다 */
function hideName(w) {
  var out = w.charAt(0);
  for (var i = 1; i < w.length; i++) out += '○';
  return out;
}
/* ★ 어떤 글자마디가 사람 이름인지는 짐작으로 못 가린다. 두 번 좁혔다.
     처음에는 아무 마디나 봤다 — 여덟 글자 기관 이름 한가운데가 「소○○○」이 됐다.
     다음에는 괄호·띄어쓰기로 쪼갠 마디를 봤다 — 그래도 세금 항목 이름과
     지역 이름이 성씨로 시작해서 가려졌다. 셋 다 사람이 아니다.
   ★ 그래서 「거래처 이름 통째로가 사람 이름일 때」만 가린다.
     그 이름은 다른 줄 한가운데 있어도 같이 가린다 —
     번호가 앞에 붙은 같은 이름이나 「홍길동현대카드」 같은 것이 여기서 걸린다.
   ★ 대신 「홍길동(○○상회)」처럼 한 번도 홀로 나온 적 없는 이름은 못 가린다.
     덜 가리는 쪽으로 틀린다 — 회사 이름을 망가뜨리는 것보다 낫다.
     사장님은 [사람 이름 가리기]를 끄고 원래대로 저장하실 수 있다 */
function personMask() {
  var map = {};
  ((UP && UP.payees) || []).forEach(function (g) {
    (g.rawList || []).concat([g.name]).forEach(function (nm) {
      var t = String(nm).trim();
      if (looksPersonName(t)) { map[t] = hideName(t); return; }
      /* 「홍길동(○○상회)」 꼴 — 괄호 앞이 통째로 사람 이름이면 그 앞부분만 가린다.
         ★ 세금 이름도 같은 꼴이라(「주민세(사업소분)」) 세금·공과금은 먼저 빼낸다 */
      var m = t.match(/^([가-힣]{3,4})[(（]/);
      if (m && looksPersonName(m[1]) && !taxLike(t)) map[m[1]] = hideName(m[1]);
    });
  });
  return map;
}
function maskPersons(root) {
  var map = personMask();
  var keys = Object.keys(map).sort(function (a, b) { return b.length - a.length; });
  if (!keys.length) return 0;
  var n = 0;
  var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  var nodes = [];
  while (walk.nextNode()) nodes.push(walk.currentNode);
  nodes.forEach(function (t) {
    var v = t.nodeValue;
    if (!v || !/[가-힣]/.test(v)) return;
    var out = v;
    keys.forEach(function (k) {
      if (out.indexOf(k) === -1) return;
      out = out.split(k).join(map[k]);
      n++;
    });
    if (out !== v) t.nodeValue = out;
  });
  return n;
}

/* ── 대표자 성함 ──
   실측: 대표자 이름으로 오간 118건 중 99.1%가 가게에 넣거나 뺀 돈이었다.
   개인 이름 출금은 일곱 갈래로 흩어지는데, 대표자 이름으로 좁히면 출금도 잡힌다 */
function askOwner() {
  var saved = loadPicks();
  if (saved && saved.owner) {          /* 두 번째 달부터는 안 묻는다 */
    UP.owner = saved.owner;
    startOnboard();
    return;
  }
  document.getElementById('uptitle').textContent = BIZ.주인 + ' 성함';
  upShow('up-owner');
  var host = document.getElementById('up-owner');
  host.innerHTML = '';
  host.appendChild(el('div', 'obhead', BIZ.주인 + ' 성함을 알려주세요'));
  var sub = el('div', 'obsub');
  sub.appendChild(el('div', null,
    BIZ.주인 + ' 이름으로 오간 돈은 우선 사업 외 용도로 봅니다. 필요하면 바꿀 수 있습니다.'));
  host.appendChild(sub);

  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'nminput';
  input.maxLength = 20;
  input.placeholder = '예: 홍길동';
  input.value = UP.owner || '';
  host.appendChild(input);
  host.appendChild(el('div', 'obcov', '건너뛰셔도 됩니다. 그러면 지금처럼만 계산합니다.'));

  var acts = el('div', 'obdoneacts');
  var ok = el('button', 'b on', '다음');
  ok.type = 'button';
  ok.addEventListener('click', function () {
    UP.owner = input.value.trim() || null;
    startOnboard();
  });
  var skip = el('button', 'oblink', '건너뛰기');
  skip.type = 'button';
  skip.addEventListener('click', function () { UP.owner = null; startOnboard(); });
  acts.appendChild(ok); acts.appendChild(skip);
  host.appendChild(acts);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok.click(); });
  input.focus();
}

/* 대표자 이름과 완전히 같을 때만.
   실제 데이터에 「○○가스/대표자이름」 형태가 있어서
   부분일치로 잡으면 가스요금이 「내가 넣은 돈」으로 딸려온다 */
function isOwnerName(g) {
  if (!UP || !UP.owner) return false;
  return canonName(g.name) === canonName(UP.owner);
}

function startOnboard() {
  /* ★ 37차 0번. 펼침 상태는 온보딩에서도 쓴다 (묶음 카드의 「따로따로 정하기」).
     예전에는 결과 화면에서만 만들어져서, 카드 대금 묶음을 그리는 순간
     undefined 를 읽고 그 줄에서 화면 그리기가 통째로 멈췄다 —
     다음 거래처 카드도 [그만 찍고 결과 보기] 버튼도 같이 사라졌다 */
  UP.open = UP.open || {};
  /* ★ 41차 5번. 매장 이름은 파일 목록 다음 화면에서 정해지므로
     계좌 이름을 되살릴 수 있는 가장 이른 자리가 여기다.
     이번에 직접 넣으신 것이 있으면 그걸 저장한다 */
  banksRestore();
  banksSave();
  UP.merge = buildMergeMap(UP.rows);
  UP.payees = groupPayees(UP.rows);
  UP.byName = {};
  UP.payees.forEach(function (g) { UP.byName[g.name] = g; });
  /* ★ 62차 ②. 업종의 기본 항목으로 시작한다 —
     UP_CATS 를 이름만 바꾼 것이라 자리는 그대로다 (baseName 이 자리로 맞춘다).
     감출 것과 더할 것도 여기서 세운다 */
  var 업 = tradeNow(), 업정보 = TRADES[업];
  UP.trade = 업;
  UP.accounts = tradeCats(업).concat(업정보.더함);
  UP.hidden = 업정보.감춤.map(function (c) { return 업정보.바꿈[c] || c; });
  UP.baseCats = tradeCats(업);     /* 기본 항목 — 이름은 바꿔도 지우지는 못한다 */
  UP.keepSet  = tradeKeep(업);     /* 이익 계산에서 빼는 항목 */

  /* 지난번에 정하신 것을 그대로 되살린다 — 두 번째 달부터는 찍을 게 거의 없다 */
  var saved = loadPicks();
  var applied = 0;
  if (saved) {
    /* ★ 62차 ②. 저장된 매장은 저장된 항목이 이긴다 — 타일에서 뭘 누르셨든 */
    if (saved.업종 && TRADES[saved.업종]) { setTrade(saved.업종); UP.trade = saved.업종; }
    if (saved.accounts && saved.accounts.length) UP.accounts = saved.accounts.slice();
    if (saved.hidden) UP.hidden = saved.hidden.slice();
    /* 35차 C. 길이로 견주지 않는다. 이름 목록 그대로 되살린다 —
       길이 검사 때문에 새로 만든 항목은 「매출·지출에 안 넣기」로 정할 수가 없었다.
       그래서 손수 만드신 「대출」이 그 밖의 입금으로 들어가 순이익에 그대로 더해졌다 */
    if (saved.baseCats && saved.baseCats.length) UP.baseCats = saved.baseCats.slice();
    if (saved.keepSet) UP.keepSet = saved.keepSet.slice();
    if (saved.unskip) UP.unskip = saved.unskip.slice();
    if (saved.목표일) setDueDay(saved.목표일);      /* 57차 ⑦ · 60차 ① */
    if (saved.xfer) applyXferKeys(saved.xfer);   /* 37차 6번 */
    UP.manual = manualLoad();          /* 36차 J. 저장통이 따로다 */
    UP.payees.forEach(function (g) {
      /* 원본 표기로 먼저 맞춰본다. 옛 저장값은 다듬은 이름으로 되어 있어 그것도 본다 */
      var c = null, list = g.rawList || [];
      for (var i = 0; i < list.length && !c; i++) c = saved.picks[list[i]];
      if (!c) c = saved.picks[g.name];
      if (applySaved(g, c)) { applied++; g.__restored = true; }
      if (saved.cardMixed && (saved.cardMixed.indexOf(g.name) !== -1 || list.some(function (raw) {
        return saved.cardMixed.indexOf(raw) !== -1;
      }))) {
        g.cardMixed = true;
        if (!g.__restored) applied++;
        g.__restored = true;
      }
    });
  }
  /* 성함과 완전히 같은 거래처만 우선 사업 외 용도로 잡는다.
     이전에 손수 정한 값은 덮어쓰지 않고, 이 자동 판단은 저장하지 않는다. */
  var ownerOutside = baseName('사업 외 용도');
  UP.payees.forEach(function (g) {
    if (!g.__restored && isOwnerName(g)) {
      if (g.mixed) {
        gSetCat(g, false, ownerOutside, true);
        gSetCat(g, true, ownerOutside, true);
      } else {
        gSetCat(g, null, ownerOutside, true);
      }
    }
    delete g.__restored;
  });
  UP.restored = applied;
  UP.queue = buildQueue();
  UP.pos = 0;
  UP.target = UP_TARGET;         /* 이번 회차에 찍기로 한 개수. 더 찍으면 늘어난다 */
  UP.more = false;               /* 사장님이 「더 찍기」를 눌렀는가 */
  UP.hist = [];                  /* 되돌리기용 — 찍은 순서대로 쌓는다 */
  savePicks();                   /* 매장 이름·성함만 넣고 안 찍어도 남게 */
  document.getElementById('uptitle').textContent = '거래처 확인';
  upShow('up-onboard');
  if (applied) showRestored(applied);
  else if (importChooseNow()) drawImportChoose();
  else drawOnboard();
}
/* ── 119차 · 첫 거래처를 묻기 전 분류 파일 선택 단계 ──────────────────
   새로 올린 거래내역으로 첫 거래처를 묻기 직전에 한 번만 여쭙는다.
   ★ 지난 분류가 이 기기에 있어 되살린 매장(applied)·「이어서 하기」로 이은 매장(UP.known)·
     예시·차례로 정하기에서는 안 낸다. 표시(UP.importAsk)는 afterFiles 가 새 매장 갈래에서만 켠다.
   ★ 불러오기는 기존 검사·매장 확인·적용(importPicks·importAsk·importApply)을 그대로 쓴다 */
function importChooseNow() {
  var on = !!UP.importAsk;
  UP.importAsk = false;          /* 한 번만 */
  return on && !UP.demo && !UP.holdAsk && !UP.known && !!UP.store &&
         UP.queue && UP.queue.length > 0;
}
function drawImportChoose() {
  UP.importChosen = true;
  var host = document.getElementById('up-onboard');
  host.innerHTML = '';
  var box = el('div', 'imchoose');
  box.appendChild(el('div', 'imchoosehead', '저장해둔 분류가 있나요?'));
  box.appendChild(el('div', 'imchoosesub',
    '다른 기기에서 받은 분류 파일을 불러오면 다시 정할 일을 줄일 수 있습니다.'));
  var acts = el('div', 'imchooseacts');
  var go = el('button', 'b on', '분류 파일 불러오기');
  go.type = 'button';
  go.addEventListener('click', function () {
    useScreen('분류 파일 선택 단계 불러오기');
    IMPORT_WHERE = 'choose';
    var f = document.getElementById('pickfile');
    if (f) f.click();
  });
  var self = el('button', 'b', '파일 없이 직접 정하기');
  self.type = 'button';
  self.addEventListener('click', function () {
    useScreen('파일 없이 직접 정하기');
    drawOnboard();
  });
  acts.appendChild(go); acts.appendChild(self);
  box.appendChild(acts);
  host.appendChild(box);
}

/* 지난번 것을 그대로 적용했다고 알려준다 */
function showRestored(applied) {
  useRestored(applied);
  var host = document.getElementById('up-onboard');
  host.innerHTML = '';
  var rest = UP.queue.length;
  host.appendChild(el('div', 'obhead',
    '지난번에 정하신 ' + won(applied) + '곳을 그대로 적용했습니다.'));
  host.appendChild(el('div', 'obsub', rest
    ? '새로 나온 거래처 ' + won(rest) + '곳만 정하시면 됩니다.'
    : '새로 정하실 거래처가 없습니다.'));

  var acts = el('div', 'obdoneacts');
  if (rest) {
    /* 숫자를 버튼에 박으면 그 숫자가 「해야 할 일의 크기」로 읽힌다.
       목표도 덮어쓰지 않는다 — 덮어쓰면 「결과 보기」가 영영 안 나온다 */
    var go = el('button', 'b on', '이어서 정하기');
    go.type = 'button';
    go.addEventListener('click', function () { drawOnboard(); });
    acts.appendChild(go);
  } else {
    var see = el('button', 'b on', '결과 보기');
    see.type = 'button';
    see.addEventListener('click', showResult);
    acts.appendChild(see);
  }
  var again = el('button', 'b', '처음부터 다시 정하기');
  again.type = 'button';
  again.addEventListener('click', function () {
    UP.payees.forEach(gAutoInit);
    UP.queue = buildQueue(false);
    UP.pos = 0;
    UP.target = UP_TARGET;
    UP.more = false;
    UP.hist = [];
    UP.restored = 0;
    savePicks();
    drawOnboard();
  });
  acts.appendChild(again);
  host.appendChild(acts);
  if (!LS_OK) host.appendChild(el('div', 'lswarn', LS_MSG));
}

/* ── 항목 추천 ──
   미리 골라두지는 않는다. "푸드"가 들어간다고 다 식자재는 아니다.
   순서만 앞으로 놓고 왜 그랬는지 한 줄 적는다 */
/* ★ 63-11 버그. 낱말은 항목 「자리」를 가리키는데, 그 자리는 업종마다 이름이 다르다.
   치과에서 「주류·음료」 자리는 「기공료」다 — 그래서 이름에 「주류」가 든 거래처에
   「기공료 ✨」가 붙고 「이름에 주류가 있어서」라고 설명했다. 실캡처로 잡혔다.
   ★ trades 가 붙은 줄은 그 업종에서만 켜진다. 나머지는 업종과 상관없는 낱말이다
     (62차 ②의 「자동분류 낱말은 업종 무관만」과 같은 잣대) */
var HINTS = [
  { cat: '식자재',    trades: ['식당'],
    words: ['식자재', '식재료', '농산', '축산', '수산', '청과', '유통', '마트', '푸드'] },
  { cat: '주류·음료', trades: ['식당'],
    words: ['주류', '소주', '맥주', '음료', '주정', '와인'] },
  /* ★ 64-4차. 카페 자리 이름은 원두·재료 / 베이커리·디저트다 (TRADES 의 바꿈).
     여기 적는 것은 늘 「바꾸기 전 자리 이름」이다 — baseName 이 그 업종 이름으로 옮긴다 */
  /* ★ 64-4차 보완. 식당의 식자재 자리 낱말 아홉 개를 카페에도 얹는다 —
     원두를 대는 곳도 은행에는 「○○유통」·「○○푸드」로 찍혀 나온다.
     ★ 주류 자리 낱말(음료·와인 따위)은 안 얹는다. 카페에서 그 자리는 베이커리·디저트라
       「○○음료」에 베이커리·디저트를 권하게 된다 — 63-11 에서 잡은 것과 같은 잘못이다.
     ★ 식당 줄은 그대로 둔다. 여기 얹는 것이지 저기서 옮겨오는 것이 아니다 */
  { cat: '식자재',    trades: ['카페'],
    words: ['커피', '원두', '로스터', '로스팅', '우유', '유제품',
            '식자재', '식재료', '농산', '축산', '수산', '청과', '유통', '마트', '푸드'] },
  { cat: '주류·음료', trades: ['카페'],
    words: ['베이커리', '제과', '제빵'] },
  { cat: '인건비',    words: ['인건비', '급여', '월급', '알바', '상여'] },
  { cat: '월세',      words: ['임대', '월세', '임차', '관리비'] },
  /* 「스피드전기」「씨앤에스에너지」는 전기공사·설비 업체일 수도 있어 추천만 한다 */
  { cat: '전기·가스·수도', words: ['전기', '가스', '수도', '한전', '도시가스', '에너지'] },
  { cat: '세금', words: [
      '세금', '국고_', '국세', '지방세', '부가세', '부가가치세', '소득세', '원천세',
      '종합소득세', '주민세', '재산세', '면허세', '세무서', '국세청', '홈택스', '위택스'] },
  /* 은행 표기에서 이름이 잘린다 — 「국민건강보험」이 아니라 「국민건강」으로 찍힌다 */
  { cat: '보험', words: [
      '보험', '연금', '국민연금', '건강', '건강보험', '건보',
      '고용보험', '산재', '산재보험', '사회보험', '합산보험료', '4대보험', '사대보험',
      '국민연금공단', '건강보험공단', '근로복지공단',
      '화재보험', '배상책임', '삼성화재', 'db손해', 'kb손해', '현대해상', '메리츠화재'] },
  { cat: '세무기장료', words: BOOKKEEPING_WORDS },
  /* ★ 57차 ③. 두 줄을 한 줄로 합친다 — 원금과 이자를 가르지 않기로 했으니
     둘을 갈라 놓을 까닭이 없어졌다 */
  { cat: '대출 상환', words: ['대출이자', '여신이자', '대출원리금', '이자',
                              '대출원금', '원금상환', '대출상환', '상환'], dir: 'out' },
  { cat: '매출',      words: ['카드', '정산', '배달', '배민', '쿠팡이츠', '요기요'], dir: 'in' }
];

/* ── 사람 이름으로 들어온 큰 돈 ──
   실측: 30만원 이상 개인 이름 입금 99건 중 94.9%가 내가 넣은 돈이었다.
   그래도 단정하지 않는다. 추천 순서만 올리고 「매출」을 나란히 둔다 */
var CORP_MARKS = ['주식회사', '(주)', '㈜', '유한회사', '(유)', '농협', '은행', '카드',
                  '공단', '공사', '시스템', '상사', '마트', '푸드', '유통', '산업',
                  '식품', '주류', '축산', '수산', '청과', '물산', '기업', '조합',
                  '센터', '서비스', '컴퍼니', '코리아', '아트', '디자인', '스튜디오',
                  '물류', '전자', '통신', '건설', '개발', '테크', '하우스', '홀딩스'];
var PERSONAL_MIN = 300000;
/* ★ 45차 ③ · 들어온 돈인데 매출이 아닐 게 뻔한 곳 ──────────────
   들어온 쪽 첫 버튼은 「매출」이다. 대개 맞다 — 들어온 돈의 대부분이 카드사 정산이다.
   그런데 대출 8,000만원이 습관적인 탭 한 번에 매출이 되면 매출이 부풀고 순이익도 틀린다.
   게다가 「대출받은 돈」은 [다른 항목 ▾] 안에 숨어 있었다 — 8,000만원짜리 선택지다.
   ★ 이건 추천이 아니라 「이런 곳에서는 고를 목록 자체가 다르다」는 규칙이다.
     44차에서 못 박은 「추천 때문에 자리를 흔들지 않는다」와 어긋나지 않는다.
   ★ 걸리는 조건 — 한두 번만 들어온 큰 돈 · 돈 빌려주는 기관 이름 · 대표자 성함 */
var LOAN_WORDS = ['소상공인', '중소벤처', '진흥공단', '소진공', '보증재단',
                  '신용보증', '기술보증', '미소금융', '저축은행', '캐피탈',
                  '새마을금고', '신용협동', '수협', '농협은행'];
var RARE_IN_MIN = 5000000;     /* 한두 번 들어온 「큰 돈」의 선 */
function loanLikeIn(g) {
  if (!g || !g.inN) return false;
  if (isOwnerName(g)) return true;
  var t = nz(g.name);
  for (var i = 0; i < LOAN_WORDS.length; i++) {
    if (t.indexOf(LOAN_WORDS[i]) !== -1) return true;
  }
  return g.inN <= 2 && (g.inMax || 0) >= RARE_IN_MIN;
}

function looksPersonal(name) {
  var t = name.trim();
  if (!/^[가-힣]{2,4}$/.test(t)) return false;
  for (var i = 0; i < CORP_MARKS.length; i++) {
    if (t.indexOf(CORP_MARKS[i]) !== -1) return false;
  }
  return true;
}
/* 사람 이름 · 30만원 이상 입금이 한 건이라도 있으면.
   순액으로 보면 사장님이 넣었다 뺐다 한 경우를 통째로 놓친다 */
function personalIn(g) {
  return looksPersonal(g.name) && (g.inMax || 0) >= PERSONAL_MIN;
}
/* 사장님이 「매출」을 더 자주 고르셨으면 그 순서를 따른다 */
function personalFirst() {
  var p = UP.personalPick || { sales: 0, put: 0 };
  return p.sales > p.put ? '매출' : baseName('사업 외 용도');
}

/* 거래처 이름을 띄어쓰기·괄호·특수문자로 쪼갠다. 두 글자 이상만 본다 —
   부분 문자열로 보면 엉뚱한 게 걸린다 */
/* 「주식회사」처럼 어느 이름에나 붙는 낱말은 안 본다 —
   실측에서 「주식회사 ○○」 둘이 낱말 하나 때문에 같은 항목으로 걸렸다 */
var WORD_STOP = ['주식회사', '유한회사', '합자회사', '개인사업', '사업자',
                 '이체', '입금', '출금', '송금', '결제', '자동결제', '자동',
                 '카드', '체크카드', '은행', '지점', '본점', '영업소',
                 '대표', '대표자', '본인', '계좌', '거래', '환급'];
function nameWords(name) {
  var s = String(name == null ? '' : name);
  return s.split(/[\s()（）\[\]{}·,.\-_\/|+&#*]+/)
          .filter(function (w) {
            return w.length >= 2 && WORD_STOP.indexOf(w) === -1;
          });
}
/* 사장님이 직접 만드신 항목만 본다. 기본 항목 이름은 「기타」·「월세」처럼 짧아서
   엉뚱한 이름에 걸린다 — 그건 지금 쓰는 자동분류 낱말 목록에 맡긴다.
   이름을 바꾼 기본 항목도 기본이다 (baseCats 로 가린다) */
function madeCats() {
  var base = UP.baseCats || UP_CATS;
  return (UP.accounts || []).filter(function (c) {
    return base.indexOf(c) === -1 && !isKeep(c);
  });
}
/* ★ 추천일 뿐이다. g.auto 로 찍지 않는다 —
   자동으로 찍으면 6,000만원이 조용히 엉뚱한 항목에 들어가고 사장님은 모르신다 */
function madeHint(g) {
  var ws = nameWords(g.name);
  if (!ws.length) return [];
  var hits = [];
  madeCats().forEach(function (cat) {
    var bag = {}, n = 0;
    nameWords(cat).forEach(function (w) { bag[w] = 1; });
    /* 그 항목에 이미 찍어두신 거래처의 낱말도 같이 본다 */
    (UP.payees || []).forEach(function (p) {
      if (gCats(p).indexOf(cat) === -1 || p === g) return;
      n++;
      nameWords(p.name).forEach(function (w) { bag[w] = 1; });
    });
    for (var i = 0; i < ws.length; i++) {
      if (bag[ws[i]]) { hits.push({ cat: cat, word: ws[i], n: n }); return; }
    }
  });
  /* 여러 항목이 걸리면 찍어두신 거래처가 많은 쪽을 앞에 */
  hits.sort(function (a, b) { return b.n - a.n; });
  return hits;
}

function hintFor(name, net) {
  var hits = [], 업 = tradeNow();
  HINTS.forEach(function (h) {
    /* ★ 63-11. 업종 전용 낱말은 그 업종에서만 켠다 */
    if (h.trades && h.trades.indexOf(업) === -1) return;
    if (h.dir === 'in'  && net <= 0) return;
    if (h.dir === 'out' && net >= 0) return;
    var best = '';
    h.words.forEach(function (w) {
      if (name.indexOf(w) !== -1 && w.length > best.length) best = w;
    });
    if (!best) return;
    var cat = h.cat;
    /* ★ 57차 ③. 「이자처럼 보여도 원금·상환이 같이 있으면 갚은 돈이다」라는
       가드가 여기 있었다. 둘이 한 항목이 되어 가를 일이 없어졌다 */
    hits.push({ cat: cat === '매출' ? '매출' : baseName(cat), word: best });
  });
  hits.sort(function (a, b) { return b.word.length - a.word.length; });
  /* 같은 항목이 두 번 앞에 서지 않게 */
  var seen = {};
  return hits.filter(function (h) {
    if (seen[h.cat]) return false;
    seen[h.cat] = 1;
    return true;
  });
}

/* 은행 표기가 달라 같은 거래처가 갈리는 게 가장 흔한 못정한 원인이다 */
function coreName(s) {
  return s.replace(/\(주\)|\(유\)|㈜|주식회사|유한회사/g, '')
          .replace(/[\s·.,\-_/()\[\]]/g, '')
          .toLowerCase();
}
function likeName(a, b) {
  if (a.length < 3 || b.length < 3) return false;
  return a.indexOf(b) !== -1 || b.indexOf(a) !== -1;
}
/* 아직 안 찍은 거래처 중 이름이 겹치는 곳 */
function similarPayees(g) {
  var a = coreName(g.name);
  if (a.length < 3) return [];
  return UP.payees.filter(function (x) {
    return x !== g && !gDone(x) && likeName(a, coreName(x.name));
  });
}
/* 사장님이 이미 찍은 것 중 이름이 겹치는 곳 — 규칙보다 이게 정확하다.
   ★ 81차 ①. x.askSkip 을 뺀다 — 앱이 넘긴 것을 대표님이 정하신 것으로 배우면 안 된다.
     36차 F 규칙이 안 묻고 넘길 때 gSetCat(g, false, baseName(ASK_SKIP_CAT), false) 로 찍는데,
     auto 는 false 라 여기서 안 걸러졌다. 그래서 앱이 스스로 「내가 가져간 돈」으로 넘긴 것을
     정하신 것으로 읽고, likeName 으로 이름이 겹치는 다른 곳에 그 항목을 추천했다 —
     세 글자짜리 「식자재」 하나가 「식자재A」부터 「식자재G」까지 일곱 곳에 다 걸렸다.
   ★ 저장 쪽(pickPayload)은 이미 「if (g.askSkip) return;」 로 걸러내고 있다. 같은 잣대를 맞춘 것이다 */
function learnedFor(g) {
  var a = coreName(g.name), hit = null;
  if (a.length < 3) return null;
  UP.payees.forEach(function (x) {
    if (hit || x === g || !gDone(x) || gCats(x).length !== 1 ||
        x.askSkip || x.auto || x.autoIn || x.autoOut) return;
    if (likeName(a, coreName(x.name))) hit = { cat: gCats(x)[0], from: x.name };
  });
  return hit;
}

/* ── 81차 ③ · 적요도 낱말 검사에 넣는다 ────────────────────────
   추천 함수가 거래처 이름만 봤다 — hintFor(g.name, …).
   적요는 거래처 이름이 비었을 때 대신 쓰는 값일 뿐이라, 이름이 멀쩡히 있으면
   적요를 아예 안 봤다. 그래서 이런 줄을 못 잡았다 (테스트식당 실측).
     적요=급여 / 수취인=직원A · 적요=7월급여 / 수취인=직원D
     → 직원 17곳에 걸쳐 57건 + 월별 급여 114건
   「급여」는 이미 낱말 목록에 있다. 낱말이 모자란 게 아니라 적요를 안 봐서 못 잡았다.
   ★ 추천까지만이다. 자동 확정(autoCategory)은 여기를 안 탄다 —
     hintFor 를 부르는 곳은 온보딩 카드 한 곳뿐이다 */
function memoHints(g, isIn) {
  var out = [], seen = {};
  (g.memoList || []).forEach(function (m) {
    if (!m) return;
    hintFor(m, isIn ? 1 : -1).forEach(function (h) {
      if (seen[h.cat]) return;
      seen[h.cat] = 1;
      out.push(h);
    });
  });
  return out;
}

/* ── 81차 ④ · 이름이나 적요에 「세무」가 있으면 세무기장료가 첫 추천 (개발자 확정) ──
   세무사·세무법인·세무회계·세무기장이 모두 걸린다.
   지금은 「○○세무사-H」가 미분류로 떨어지고 「○○세무회계」는
   「내가 가져간 돈」으로 간다. 세무기장료는 사업 지출인데 「내가 가져간 돈」은
   사업 외 용도라, 그대로 두면 사업에 쓴 돈이 줄고 계좌 순이익이 커 보인다.
   ★ 자동 확정이 아니다. 추천 순서 맨 앞일 뿐이다 */
function taxAcctWhere(g) {
  if (nz(g.name).indexOf('세무') !== -1) return '이름';
  var list = g.memoList || [];
  for (var i = 0; i < list.length; i++) {
    if (nz(list[i]).indexOf('세무') !== -1) return '적요';
  }
  return null;
}

/* ── 81차 ② · 별표를 안 달았으면 안 달았다고 말한다 ──────────────
   추천 이유가 둘 이상이면 spark 가 null 이 되어 ✨를 아무 곳에도 안 단다 (35차 B).
   판단은 옳다. 그런데 이유 설명은 이유마다 따로 붙어서
   화면에 「✨를 달았습니다」가 두 번 나오는데 별표는 어디에도 없었다 —
   대표님이 별표를 찾아 헤매신다.
   ★ 별표를 단 경우(이유가 하나)의 문장은 예전 그대로 둔다. 여기서 바꾸는 건 안 단 경우뿐이다.
   ★ 낱말과 학습 중 어느 쪽도 우선하지 않는다 — front 차례도 spark 규칙도 안 건드린다.
     아래 정렬은 문장 안에서 읽히는 차례일 뿐이다 */
function whySolo(b) {
  if (b.kind === 'learn') {
    return '비슷한 이름 「' + showName(b.from) + '」' + eul(b.from) + ' ' +
           b.cat + ro(b.cat) + ' 정하셔서 ✨를 달았습니다';
  }
  if (b.kind === 'made') {
    return '이름에 「' + b.word + '」' + ga(b.word) + ' 있고 ' + BIZ.주인 + '이 만드신 항목입니다';
  }
  if (b.kind === 'memo') {
    return '적요에 「' + b.word + '」' + ga(b.word) + ' 있어서 ✨를 달았습니다';
  }
  return '이름에 「' + b.word + '」' + ga(b.word) + ' 있어서 ✨를 달았습니다';
}
/* 「…있」·「…적이 있」 로 끝나 뒤에 「지만」·「어」가 붙는 마디 */
function whyClause(b) {
  if (b.kind === 'learn') {
    return '비슷한 이름을 전에 「' + b.cat + '」' + ro(b.cat) + ' 정하신 적이 있';
  }
  if (b.kind === 'made') {
    return '이름에 「' + b.word + '」' + ga(b.word) + ' 있고 ' + BIZ.주인 + '이 만드신 항목이';
  }
  if (b.kind === 'memo') {
    return '적요에 「' + b.word + '」' + ga(b.word) + ' 있';
  }
  return '이름에 「' + b.word + '」' + ga(b.word) + ' 있';
}
function whyFrom(bits, spark) {
  if (!bits || !bits.length) return [];
  /* 별표를 달았으면 예전 문장 그대로다 */
  if (spark) return bits.map(whySolo);
  /* 낱말(이름·적요)을 먼저 말하고 학습을 나중에 말한다 — 읽는 차례만 정한다 */
  var b = bits.slice().sort(function (x, y) {
    return (x.kind === 'learn' ? 1 : 0) - (y.kind === 'learn' ? 1 : 0);
  });
  if (b.length === 1) {
    return [whyClause(b[0]) + '지만 어느 쪽인지 확실하지 않습니다. 직접 골라주세요.'];
  }
  var s = whyClause(b[0]) + '지만, ' + whyClause(b[1]) + '어 어느 쪽인지 확실하지 않습니다.';
  /* 이유가 셋 이상이면 앞의 둘만 말하고 이렇게 맺는다 */
  if (b.length > 2) s += ' 이유가 더 있습니다.';
  return [s + ' 직접 골라주세요.'];
}

/* ── 물어보는 순서 ──
   첫 화면에 큰 거래처가 나오면 「이걸 내가 다 해야 하나」 하고 멈춘다.
   이름만 봐도 짐작되는 것 세 개를 먼저 보여주면 세 번 눌러보고 계속하게 된다.
   실측: 커버리지 손실 0~2.4%p. 다섯 개로 늘리면 3~6%p라 셋이 적당하다 */
var EASY_FIRST = 0;   /* 38차 11번. 안 쓴다 — 차례는 금액 큰 순 하나다 */

/* ── 36차 F · 작은 거래는 묻지 않는다 ──────────────────────────
   ★ 금액만 보고 넘기면 안 된다. 작은 거래처가 두 종류다.
     실측(어느 대표님 두 계좌 12개월) — 20곳 찍고 남는 166곳 중
       한두 번 나가고 만 곳  120곳 ·   7,995만원  → 안 묻는다
       매달 나가는 곳         46곳 · 1억 5,713만원 → 계속 묻는다  ★ 남는 금액의 66%
     매달 20일에 70만원씩 나가는 곳 같은 것들이라 월세·정기 거래일 수 있다.
     금액만 보고 다 넘기면 1억 5,713만원이 사업에 쓴 돈에서 빠진다.

   ★ 이 선택에는 위험이 있다. 법인 계좌 정답 데이터에서는 반대로 나온다 —
     20곳 찍고 남는 것의 86~97%가 진짜 사업 지출이었다.
     그래서 금액을 화면에 드러내고(F-3) · 펼쳐서 되돌리고(F-4) · 크면 알린다(F-5).
     셋 중 하나라도 빠지면 사업에 쓴 돈이 조용히 줄어든다 */
var ASK_MIN_SHARE  = 0.001;   /* 그 거래처 나간 돈이 전체 금액의 이만큼 미만이면 작다 */
var ASK_MIN_MONTHS = 3;       /* 이만큼 되는 달에 나왔으면 「매달 나가는 곳」이라 계속 묻는다 */
/* ★ 63-3. F 규칙이 안 묻고 넘긴 것이 가는 곳 — 「내가 가져간 돈」.
   버튼(「사업 외 용도」)이 아니라 방향으로 갈려 나온 이름이다. 나간 돈만 넘기므로 이쪽이다 */
var ASK_SKIP_CAT   = '내가 가져간 돈';
/* 화면에서 「사장님이 찍으신 사업 외 용도」와 갈라 부르는 이름 (36차) */
var SKIP_PART      = '앱이 넘긴 작은 거래';

/* 파일 전체 금액 — 「전체 금액의 0.1%」의 분모 */
function totalAbs() {
  var s = 0;
  (UP.payees || []).forEach(function (g) { s += g.abs; });
  return s;
}
/* 이 거래처를 안 묻고 넘길 것인가.
   ★ 들어온 돈이 한 건이라도 있으면 안 넘긴다 — 작은 매출이 조용히 사라지면 안 된다 */
/* ★ 42차 1번. F 규칙이 「사업 외 용도」로 넘기기 전에 세금·보험·공과금 낱말을 본다.
   사업 외 용도는 매출에도 지출에도 안 들어간다 — 사업에 쓴 돈이 손익에서 빠지고
   순이익이 실제보다 커진다. 사장님이 통장과 대조하면 안 맞는다.
   ★ autoCategory 가 이미 같은 낱말을 보지만, 방향이 섞인 거래처는 자동으로 안 잡힌다.
     그 자리를 막는다. 안 넘기면 큐에 남아 사장님께 여쭙는다 */
function taxLike(name) {
  var t = nz(name);
  for (var i = 0; i < TAX_WORDS.length; i++) if (t.indexOf(TAX_WORDS[i]) !== -1) return true;
  for (var j = 0; j < INSURANCE_WORDS.length; j++) if (t.indexOf(INSURANCE_WORDS[j]) !== -1) return true;
  for (var k = 0; k < BOOKKEEPING_WORDS.length; k++) if (t.indexOf(BOOKKEEPING_WORDS[k]) !== -1) return true;
  for (var u = 0; u < UTIL_WORDS.length; u++) if (t.indexOf(UTIL_WORDS[u]) !== -1) return true;
  return startsUtil(t);
}
function askSkippable(g, total) {
  /* 사장님이 손수 되돌리신 곳은 다시 넘기지 않는다 — 창을 닫았다 열어도 그대로다 */
  if (UP.unskip && UP.unskip.indexOf(g.name) !== -1) return false;
  if (gDone(g)) return false;              /* 이미 정해진 곳은 건드리지 않는다 */
  if (g.inN > 0) return false;             /* 들어온 돈이 섞인 곳은 넘기지 않는다 */
  if (taxLike(g.name)) return false;       /* 세금·보험·공과금은 작아도 안 넘긴다 (42차 1번) */
  if (Object.keys(g.outMonths).length >= ASK_MIN_MONTHS) return false;  /* 매달 나가는 곳 */
  return total > 0 && g.outSum < total * ASK_MIN_SHARE;
}
/* 넘길 것을 찍어두고 목록으로 남긴다. 되돌릴 수 있어야 하므로 표시를 붙인다 */
function applyAskSkip() {
  var total = totalAbs();
  UP.skipped = [];
  (UP.payees || []).forEach(function (g) {
    if (!askSkippable(g, total)) return;
    g.askSkip = true;
    gSetCat(g, false, baseName(ASK_SKIP_CAT), false);
    UP.skipped.push(g);
  });
}
/* 사장님이 되돌리시면 다시 묻는 줄에 세운다 */
function unskipAsk(g) {
  g.askSkip = false;
  UP.unskip = UP.unskip || [];
  if (UP.unskip.indexOf(g.name) === -1) UP.unskip.push(g.name);
  gSetCat(g, false, null, false);
  if (g.mixed) gSetCat(g, true, null, false);
  var i = UP.skipped.indexOf(g);
  if (i !== -1) UP.skipped.splice(i, 1);
  if (UP.queue.indexOf(g) === -1) UP.queue.push(g);
  savePicks();
}
/* 앱이 넘긴 작은 거래를 결과 목록에서 하나씩 누르게 하지 않는다.
   한 번에 다시 묻는 줄로 옮기고, 금액이 큰 곳부터 거래처 확인 화면에서 정한다. */
function unskipAllAsk() {
  var list = (UP.skipped || []).slice().sort(function (a, b) {
    return b.outSum - a.outSum;
  });
  if (!list.length) return;
  UP.unskip = UP.unskip || [];
  list.forEach(function (g) {
    g.askSkip = false;
    if (UP.unskip.indexOf(g.name) === -1) UP.unskip.push(g.name);
    gSetCat(g, false, null, false);
    if (g.mixed) gSetCat(g, true, null, false);
  });
  var chosen = {};
  list.forEach(function (g) { chosen[g.name] = 1; });
  var before = UP.queue.slice(0, UP.pos);
  var after = UP.queue.slice(UP.pos).filter(function (g) { return !chosen[g.name]; });
  UP.queue = before.concat(list, after);
  UP.skipped = [];
  UP.target = Math.min(UP.queue.length, UP.pos + 10);
  UP.more = true;
  savePicks();
}
/* 넘긴 것 합계 — 파일 전체 기간 기준이다 (원칙 3: 기간을 붙여 쓴다) */
function skipTotals() {
  var n = 0, sum = 0;
  (UP.skipped || []).forEach(function (g) { n++; sum += g.outSum; });
  return { n: n, sum: sum };
}
/* 큐를 새로 만든다 — 넘길 것을 먼저 찍고 남은 것만 줄에 세운다 */
function buildQueue(ordered) {
  applyAskSkip();
  var rest = UP.payees.filter(function (g) { return !gDone(g) && !g.cardMixed; });
  return ordered === false ? rest : orderQueue(rest);
}

/* ── 36차 G · 같은 곳을 또 묻지 않는다 ──────────────────────
   「왜 똑같은 거 계속 물어보노. 아까 이거 나왔는데」
   실파일에서 「삼성」이 든 거래처가 16그룹으로 갈린다. 「롯데」 4 · 「현대」 3.
   전각·반각 때문이 아니라 뒤에 붙는 글자가 실제로 달라서 canonName 이 못 묶는다.
   ★ canonName 은 건드리지 않는다. 묶어서 한 번에 찍게만 한다.
   ★ 입금 쪽과 출금 쪽은 절대 같이 묶지 않는다 —
     카드 정산(들어온 돈)과 카드 대금(나간 돈)이 한 덩어리가 되면
     매출이 지출로, 지출이 매출로 넘어간다 */
var GROUP_PREFIX = 4;      /* 앞 이 글자 수 이상이 같으면 한 줄로 묶는다 */

/* 아직 안 정한 곳만 묶는다. 이미 정하신 곳은 건드리지 않는다 */
function bundlePool() {
  return (UP.queue || []).slice(UP.pos).filter(function (g) { return !gDone(g); });
}
/* 나가는 카드 대금인가 — 카드사 이름이 있고 나간 쪽이다.
   ★ autoCategory 는 net > 0 일 때만 카드사를 매출로 잡는다. 분리는 이미 되고 있다 */
function isCardOut(g) {
  if (g.net > 0 || g.outN === 0) return false;
  var t = String(g.name).toLowerCase().replace(/\s/g, '');
  if (t.indexOf('카드') === -1) return false;
  for (var i = 0; i < CARD_WORDS.length; i++) {
    if (t.indexOf(CARD_WORDS[i]) !== -1) return true;
  }
  return false;
}
function spanOf(keys) {
  if (!keys.length) return '';
  var mm = function (m) { return (+m.slice(5, 7)) + '월'; };
  var y0 = keys[0].slice(0, 4), y1 = keys[keys.length - 1].slice(0, 4);
  if (keys.length === 1) return y0 + '년 ' + mm(keys[0]);
  if (y0 === y1) return y0 + '년 ' + mm(keys[0]) + '~' + mm(keys[keys.length - 1]);
  return y0 + '년 ' + mm(keys[0]) + '~' + y1 + '년 ' + mm(keys[keys.length - 1]);
}
function makeBundle(label, mems, kind) {
  var sum = 0, n = 0, ms = {};
  mems.forEach(function (g) {
    sum += (g.net > 0) ? g.inSum : g.outSum;
    n += g.n;
    Object.keys(g.months).forEach(function (k) { ms[k] = 1; });
  });
  return { label: label, mems: mems, sum: sum, n: n, kind: kind,
           into: mems[0].net > 0, span: spanOf(Object.keys(ms).sort()) };
}
/* 이 거래처와 한 줄로 묶을 것들 */
function bundleFor(g) {
  var pool = bundlePool();
  if (pool.length < 2) return null;
  var mems;
  /* G-2. 나가는 카드 대금은 카드사가 달라도 한 덩어리 */
  if (isCardOut(g)) {
    mems = pool.filter(isCardOut);
    if (mems.length >= 2) return makeBundle('카드 대금', mems, 'card');
  }
  /* G-1. 앞 네 글자 이상이 같은 것끼리. 방향이 같은 것만 */
  var mine = g.net > 0;
  var head = coreName(g.name).slice(0, GROUP_PREFIX);
  if (head.length < GROUP_PREFIX) return null;
  mems = pool.filter(function (x) {
    return (x.net > 0) === mine && coreName(x.name).slice(0, GROUP_PREFIX) === head;
  });
  if (mems.length < 2) return null;
  return makeBundle(showName(mems[0].name).slice(0, GROUP_PREFIX), mems, 'prefix');
}
/* ── 64-4 · 원거래 펼쳐보기 ─────────────────────────────────────
   「(주)비 …」처럼 이름이 잘린 카드에서 「무슨 거래인지 알 수가 없다」는 말이 나왔다.
   앱이 아는 것은 은행이 준 그대로다. 그것을 보여드리는 것이 정직하다.
   ★ 최근 다섯 건이면 무슨 거래인지 알기에 충분하다. 다 늘어놓으면 카드가 길어진다.
   ★ 이름이 은행 파일에서부터 잘려 있으면 그 사정도 한 줄로 —
     앱이 자른 것으로 오해하시면 안 된다 */
var RAW_PEEK = 5;
/* ── 67차 ① · 요일과 시각 ────────────────────────────────────────
   거래처 이름만 보고는 「이게 뭐였더라」가 안 풀린다. 날짜에 요일과 시각을 붙이면
   그 순간이 떠오른다 — 화요일 오후 2시에 4만원이면 무엇이었는지는 대표님이 아신다.
   ★ 앱은 뜻을 풀지 않는다. 사실만 놓는다 (요청서 「하지 말 것」).
   ★ 시각은 파일에 있을 때만. r.at 에 이미 붙어 있으므로 파서는 안 건드린다 —
     buildRows 가 「거래일시」나 따로 온 시각 칸을 여기에 담아 둔다.
   ★ 00:00:00 은 시각이 없는 것으로 본다 — buildRows 도 같은 판정을 쓴다 */
var 요일글 = ['일', '월', '화', '수', '목', '금', '토'];
function dowText(at) {
  var y = +String(at).slice(0, 4), m = +String(at).slice(5, 7), d = +String(at).slice(8, 10);
  if (!y || !m || !d) return '';
  /* 날짜만 있는 글자라 UTC 로 만들어야 시간대 때문에 하루가 안 밀린다 */
  return 요일글[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
function clockText(at) {
  var s = String(at);
  if (s.length < 16) return '';
  var hh = s.slice(11, 13), mm = s.slice(14, 16);
  if (!/^\d\d$/.test(hh) || !/^\d\d$/.test(mm)) return '';
  if (hh === '00' && mm === '00' && s.slice(17, 19) === '00') return '';
  return hh + ':' + mm;
}
/* ★ 68차 ①. 다시 그리는 함수를 밖에서 받는다 —
   정하기 화면에서는 drawOnboard, 결과 화면에서는 drawResult 를 불러야 한다.
   같은 부품을 두 자리에서 쓰되 그리는 자리만 갈아 끼운다 */
/* ★ 69차 ③. 단추가 항목 알약들 아래에 한 줄을 따로 차지하고 있었다.
   「박서연이 누구지?」라는 의문이 생기는 자리는 이름 칸인데 답은 카드 맨 아래에 있었다.
   ★ 그래서 단추만 이름 옆으로 옮긴다 (붙일 자리 = 넷째 인자).
     펼친 내용은 그대로 카드 아래 전체 폭이다 — 좁은 칸에 밀어넣지 않는다.
   ★ 넷째 인자를 안 주면 예전처럼 카드에 붙는다 */
function drawRawPeek(card, raws, redraw, anchor) {
  if (!raws || !raws.length || !UP || !UP.rows) return;
  var 다시 = redraw || drawOnboard;
  var 원 = UP.rows.filter(function (r) { return raws.indexOf(r.payee) !== -1; });
  if (!원.length) return;
  원.sort(function (a, b) { return a.at < b.at ? 1 : (a.at > b.at ? -1 : 0); });
  var 열쇠 = 'raw:' + raws[0], 몇쇠 = 'rawn:' + raws[0];
  var open = !!(UP.open && UP.open[열쇠]);
  /* ★ 67차 ①. 「이 거래처의 원거래 보기」는 길고 「원거래」가 은행 말이다.
     짧고 하는 일 그대로인 이름으로 바꾼다 */
  var b = el('button', 'oblink', '최근 거래 보기 ' + (open ? '▴' : '▾'));
  b.type = 'button';
  b.addEventListener('click', function () {
    UP.open = UP.open || {};
    UP.open[열쇠] = !open;
    다시();
  });
  (anchor || card).appendChild(b);
  if (!open) return;
  var 몇 = (UP.open && UP.open[몇쇠]) || RAW_PEEK;
  var box = el('div', 'rawpeek');
  원.slice(0, 몇).forEach(function (r) {
    var row = el('div', 'rawrow');
    var when = el('span', 'rawat');
    when.appendChild(document.createTextNode(dayText(r.at) + ' '));
    var dw = dowText(r.at);
    if (dw) when.appendChild(el('span', 'rawdow', '(' + dw + ')'));
    var ck = clockText(r.at);
    if (ck) when.appendChild(document.createTextNode(' ' + ck));
    row.appendChild(when);
    var rnm = el('span', 'rawnm', r.payee);
    if (r.patched) rnm.appendChild(el('span', 'estmark', '추정'));   /* ★ 108차 ④ */
    /* ★ 112차 ②㉰. 이 자리는 한 줄이라 긴 말을 못 넣는다. 짧은 딱지로 갈라만 둔다 —
       무엇이 정해졌고 무엇이 남았는지는 그날 펼친 목록(dayRow)에 다 적는다 */
    else if (r.byStated) rnm.appendChild(el('span', 'estmark', '차액 확인'));
    else if (r.unsure) rnm.appendChild(el('span', 'estmark', '계산 제외'));
    row.appendChild(rnm);
    row.appendChild(el('span', 'rawamt num', won(r.amount)));
    box.appendChild(row);
  });
  /* ★ 67차 ①. 「외 N건」은 알려만 주고 갈 곳이 없었다. 눌러서 다섯 건씩 더 본다 */
  if (원.length > 몇) {
    var more = el('button', 'oblink rawmorebtn',
      '외 ' + won(원.length - 몇) + '건 보기');
    more.type = 'button';
    more.addEventListener('click', function () {
      UP.open = UP.open || {};
      UP.open[몇쇠] = 몇 + RAW_PEEK;
      다시();
    });
    box.appendChild(more);
  }
  /* 은행이 이름을 자른 것인지 — 원문 그대로가 잘려 있으면 그렇게 적는다 */
  var 잘림 = raws.some(function (x) { return /[…\.]{1,3}$/.test(String(x).trim()); });
  if (잘림) {
    box.appendChild(el('div', 'rawmore',
      '받으신 거래내역에 이름이 이렇게 잘려 있습니다. 앱이 자른 것이 아닙니다'));
  }
  card.appendChild(box);
}

/* 묶은 것을 한 장으로 그린다. 펼치면 개별로 다르게 정할 수 있다 (G-1) */
function drawBundle(host, b) {
  var card = el('div', 'obcard');
  /* ★ 69차 ③. 이름과 단추가 한 줄에 앉는다. 이름은 span 으로 싸 둔다 —
     긴 이름이 줄바꿈될 때 단추가 딸려가지 않게 하려면 둘이 각각 한 덩이여야 한다 */
  var 이름칸 = el('div', 'obname');
  이름칸.appendChild(el('span', 'obnm', b.label + (b.kind === 'card' ? '' : ' …')));
  card.appendChild(이름칸);
  /* ★ 38차 9번. 금액을 건수 옆에 붙인다.
     큰 빨간 숫자가 따로 한 줄을 차지하니 「카드대금??? 6000만원???」 하고 놀라신다 */
  var meta = el('div', 'obmeta bunmeta');
  meta.appendChild(el('span', 'bunspan',
    b.span + ' · ' + won(b.mems.length) + '곳 · ' + b.n + '건'));
  meta.appendChild(el('span', 'bunamt ' + (b.into ? 'in' : 'out'), won(b.sum) + '원'));
  card.appendChild(meta);
  /* ★ 38차 13번. 처음부터 펼쳐서 보여준다. 합계만 보면 놀라신다 */
  card.appendChild(el('div', 'obsub',
    b.kind === 'card' ? '카드를 다 합치면 이렇게 됩니다'
                      : b.mems.length + '곳을 한 번에 정합니다'));
  /* ★ 64-4. 「2곳을 한 번에 정합니다」만으로는 뭘 묶었는지 알 수 없다 —
     이름이 잘려 있으면 더 그렇다. 묶인 이름을 그대로 보여준다 */
  card.appendChild(el('div', 'obwhy',
    '묶은 곳 — ' + b.mems.map(function (m) { return showName(m.name); }).join(' · ')));
  var 원본 = [];
  b.mems.forEach(function (m) { (m.rawList || [m.name]).forEach(function (r) {
    if (원본.indexOf(r) === -1) 원본.push(r); }); });
  drawRawPeek(card, 원본, null, 이름칸);

  /* ★ 카드 대금은 어디로 보낼지 앱이 정하지 않는다.
     사업용 카드를 쓰시는 분은 「기타(지출)」이고 개인 카드가 섞인 분은 「사업 외 용도」다.
     앱은 어느 쪽인지 알 수 없다 (36차 G-2). 그래서 ✨를 안 단다 */
  var quick = (b.into ? UP_QUICK_IN : UP_QUICK_OUT).map(function (c) {
    return c === '매출' ? '매출' : baseName(c);
  }).filter(function (c) { return c === '매출' || !isHidden(c); });   /* 감춘 항목은 버튼에도 없다 */
  var outside = baseName('사업 외 용도');
  if (UP.accounts.indexOf(outside) !== -1 && quick.indexOf(outside) === -1) {
    var at = quick.indexOf(etcName());
    quick.splice(at === -1 ? quick.length : at + 1, 0, outside);
  }
  var btns = el('div', 'obbtns');
  quick.forEach(function (c) {
    var bt = el('button', 'b', c);
    bt.type = 'button';
    bt.addEventListener('click', function () { pickBundle(b, c); });
    btns.appendChild(bt);
  });
  var more = el('button', 'upbtn plain', '다른 항목');
  more.type = 'button';
  more.appendChild(el('span', 'chev', ' ▾'));
  btns.appendChild(more);
  card.appendChild(btns);

  var menu = el('div', 'menu');
  menu.hidden = true;
  card.appendChild(menu);
  more.addEventListener('click', function () {
    if (!menu.hidden) { menu.hidden = true; more.classList.remove('on'); return; }
    more.classList.add('on');
    menu.innerHTML = '';
    UP.accounts.forEach(function (name) {
      var mb = el('button', 'mi', name);
      mb.type = 'button';
      var note = noteFor(name);
      if (note) { if (isKeep(name)) mb.classList.add('keep'); mb.appendChild(el('span', 'msub', note)); }
      mb.addEventListener('click', function () { pickBundle(b, name); });
      menu.appendChild(mb);
    });
    menu.hidden = false;
  });

  /* 펼치면 개별로 다르게 정할 수 있어야 한다.
     ★ 37차 0번. 없을 때도 안 죽게 한다 — 화면 그리다 죽으면 그 아래가 통째로 사라진다 */
  UP.open = UP.open || {};
  /* 기본이 펼침이다. 접는 것은 되게 두되 처음엔 다섯 줄이 다 보인다 (38차 13번) */
  var okey = '__bun:' + b.label;
  var open = UP.open[okey] === undefined ? true : !!UP.open[okey];
  var tog = el('button', 'oblink', open ? '접기 ▴' : '따로따로 보기 ▾');
  tog.type = 'button';
  tog.addEventListener('click', function () {
    UP.open = UP.open || {};
    UP.open[okey] = !open;
    drawOnboard();
  });
  if (open) {
    var box = el('div', 'dtl');
    b.mems.slice().sort(function (x, y) {
      return ((y.net > 0 ? y.inSum : y.outSum) - (x.net > 0 ? x.inSum : x.outSum));
    }).forEach(function (m) {
      var r2 = el('div', 'drow');
      var nm = el('div', 'dnm');
      nm.appendChild(document.createTextNode(showName(m.name)));
      nm.appendChild(el('div', 'dspan', payeeSpan(m) + ' · ' + m.n + '건'));
      r2.appendChild(nm);
      r2.appendChild(el('div', 'dv num', won(m.net > 0 ? m.inSum : m.outSum)));
      var ch = el('div', 'dch');
      var cb = el('button', 'chbtn', '항목 고르기');
      cb.type = 'button';
      ch.appendChild(cb);
      r2.appendChild(ch);
      box.appendChild(r2);
      var m2 = el('div', 'menu');
      m2.hidden = true;
      box.appendChild(m2);
      cb.addEventListener('click', function () {
        if (!m2.hidden) { m2.hidden = true; return; }
        drawChangeMenu(m2, m, function () { drawOnboard(); });
        m2.hidden = false;
      });
    });
    card.appendChild(box);
  }

  var later = el('div', 'oblater');
  var prev = el('button', 'upbtn plain', '← 이전');
  prev.type = 'button';
  prev.disabled = !UP.hist.length;
  prev.addEventListener('click', undoPick);
  later.appendChild(prev);
  later.appendChild(tog);
  var skip = el('button', 'oblink', '나중에');
  skip.type = 'button';
  skip.addEventListener('click', function () {
    UP.hist.push({ i: UP.pos, g: b.mems[0], cat: b.mems[0].cat, auto: b.mems[0].auto,
                   name: b.label, kind: 'skip' });
    UP.pos++;
    utPick();
    drawOnboard();
  });
  later.appendChild(skip);
  card.appendChild(later);
  host.appendChild(card);
}

/* 묶음을 한 번에 찍는다. 되돌릴 수 있게 하나로 쌓는다 */
function pickBundle(b, cat) {
  UP.hist.push({ kind: 'bundle', i: UP.pos, name: b.label, newCat: cat,
    mems: b.mems.map(function (g) {
      return { g: g, cat: g.cat, auto: g.auto, catIn: g.catIn, catOut: g.catOut,
               autoIn: g.autoIn, autoOut: g.autoOut };
    }) });
  b.mems.forEach(function (g) {
    if (g.mixed) { gSetCat(g, true, cat, false); gSetCat(g, false, cat, false); }
    else { g.cat = cat; g.auto = false; }
    var i = UP.queue.indexOf(g);
    if (i > UP.pos) UP.queue.splice(i, 1);      /* 지금 보는 것은 남기고 뒤엣것만 뺀다 */
  });
  UP.said = isKeep(cat) ? cat : null;
  UP.ask = null;
  UP.pos++;
  utPick();
  savePicks();
  drawOnboard();
}

/* ★ 38차 11번. 금액 큰 순 하나로 통일한다.
   예전에는 추천 낱말이 걸린 곳을 금액과 무관하게 앞으로 당겼다(EASY_FIRST = 3).
   36차에서 진행 바를 넣으면서 그게 역효과가 됐다 —
   눌러도 바가 거의 안 오르는 순간이 생기면 「도대체 얼마나 눌러야 하나」로 읽힌다.
   ★ 추천(✨)은 그대로 둔다. 차례만 금액순이고 걸린 곳에는 여전히 ✨가 붙는다.
   ★ G(비슷한 이름 묶기)로 당기는 것은 그대로다 —
     「방금 ○○를 찍으셔서 앞에 두었습니다」는 방금 하신 일과 이어져 있어 뜻이 다르다.
   금액이 같으면 이름 순으로 갈라 회차마다 같은 차례가 되게 한다 */
function orderQueue(list) {
  return list.slice().sort(function (a, b) {
    if (b.abs !== a.abs) return b.abs - a.abs;
    return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
  });
}

/* ── 36차 K · 목표선은 파일이 정한다 ────────────────────────
   고정 %로 두면 파일마다 뜻이 달라진다. 실측에서 도달하는 %가 81~96%로 흩어졌다.
     목표선 = 다음에 물을 거래처가 전체 금액의 0.5% 미만이 되는 지점
             단, 그 지점에서 안 정한 금액이 아직 전체의 20%를 넘으면 넘지 않을 때까지 뒤로 민다
   ★ 41차 2번. 예전 주석은 「흑자·적자가 뒤집힐 수 있으면(blocked) 뒤로 민다」였다.
     코드는 monthNumbers().blocked 를 한 번도 안 봤다 — 하는 일은 금액 몫 하나뿐이다.
     이름도 goalBlocked 라서 읽는 사람이 지켜진다고 여겼다. 하는 일대로 맞춘다
   ★ F에서 안 묻기로 한 곳은 세지 않는다. 안 물을 것을 세면 목표선이 영영 안 온다.
     매달 나가는 곳은 묻는 대상이라 목표선 계산에 넣는다 (줄에 그대로 남아 있다) */
var GOAL_MIN_SHARE = 0.005;

/* 37차 3번. 큰 숫자가 분모를 가져갔으니 작은 줄에는 남은 곳 이야기만 둔다.
   짐작해서 쓰지 않는다 — 남은 곳이 없거나 금액을 못 재면 아무 말도 안 붙인다 */
function goalRestText() {
  var pend = (UP.queue || []).filter(function (g) { return !gDone(g); });
  if (!pend.length) return '';
  var biggest = 0;
  pend.forEach(function (g) { var v = gOpenAbs(g); if (v > biggest) biggest = v; });
  if (!biggest) return '';
  /* ★ 안심시키는 말일 때만 한다. 남은 것이 아직 큰데
     「남은 곳은 하나에 4,794만원이 안 됩니다」라고 하면 겁주는 말이 된다.
     목표선 기준(전체 금액의 0.5%) 아래로 내려왔을 때만 말한다 */
  var tot = totalAbs();
  if (!tot || biggest >= tot * GOAL_MIN_SHARE) return '';
  /* ★ 63-8. 「남은 곳은 하나에 3,170,000원이 안 됩니다」는 뜻이 안 통했다 —
     「하나에」가 어디에 걸리는지 읽히지 않는다. 먼저 결론을 말하고 근거를 뒤에 붙인다.
     만원 단위로 올려 말한다 — 넘겨도 된다는 말이라 올림이 안전한 쪽이다 */
  var man = Math.ceil(biggest / 10000) * 10000;
  return '남은 곳들은 다 자잘합니다 — 가장 큰 곳도 ' + won(man) + '원이 안 됩니다';
}

function goalLine() {
  var tot = totalAbs();
  if (!tot) return { share: 1, next: 0 };
  /* 이미 정한 금액 + 큐에서 앞으로 물을 것들을 큰 것부터 더해 나간다 */
  var acc = 0;
  UP.payees.forEach(function (g) { acc += g.abs - gOpenAbs(g); });
  var pend = (UP.queue || []).filter(function (g) { return !gDone(g); })
    .map(function (g) { return gOpenAbs(g); })
    .sort(function (a, b) { return b - a; });
  var i = 0;
  /* 다음에 물을 것이 0.5% 미만이 될 때까지 */
  while (i < pend.length && pend[i] >= tot * GOAL_MIN_SHARE) { acc += pend[i]; i++; }
  /* 그 지점에서 안 정한 금액이 아직 전체의 20%를 넘으면 넘지 않을 때까지 뒤로 민다 */
  var guard = 0;
  while (i < pend.length && guard++ < 500 && goalShareLeft(tot, acc)) { acc += pend[i]; i++; }
  return { share: Math.min(1, acc / tot), next: pend.length - i };
}
/* 그 지점까지 정해도 안 정한 금액이 아직 전체의 20%를 넘는가.
   ★ 흑자·적자가 뒤집히는지(blocked)는 안 본다 — 이름이 그렇게 말하지 않게 한다 (41차 2번) */
function goalShareLeft(tot, acc) {
  var rest = tot - acc;
  return rest > tot * ONBOARD_MAX_UNKNOWN;
}

/* 18차 A의 RATIO_MAX_UNKNOWN 과 같은 값. 비율을 보여줄 수 있는 선이다 */
var ONBOARD_MAX_UNKNOWN = 0.20;
function onboardDone() {
  if (UP.pos >= UP.queue.length) return true;                  /* 다 봤으면 끝 */
  if (UP.pos >= UP.target) return true;
  /* 건수가 아니라 금액이다. 220곳 중 152곳이 남아도 그게 금액의 2%면 할 일이 없다.
     다만 첫 회차에 서너 곳 찍고 끝나면 「이게 다야?」가 되니 최소 스무 곳은 보여준다.
     지난번 것을 되살린 달은 이미 보실 게 다 있으니 그 최소치를 안 건다.
     사장님이 직접 「더 찍기」를 누른 회차에는 어느 쪽이든 끼어들지 않는다 */
  if (UP.more) return false;
  var floorN = UP.restored ? 0 : UP_TARGET;
  return UP.pos >= floorN && 1 - coverage(0) <= ONBOARD_MAX_UNKNOWN;
}

/* 지금까지 금액의 몇 %를 분류했는지 */
function coverage(extra) {
  var tot = 0, done = 0;
  /* 섞인 거래처는 안 정한 쪽 금액만 남은 것으로 센다 (35차 B) */
  UP.payees.forEach(function (g) { tot += g.abs; done += g.abs - gOpenAbs(g); });
  if (extra) {
    var c = 0;
    for (var i = UP.pos; i < UP.queue.length && c < extra; i++) {
      var open = gOpenAbs(UP.queue[i]);
      if (!open) continue;
      done += open;
      c++;
    }
  }
  return tot ? done / tot : 1;
}
/* ★ 42차 3번. 이 둘은 「무엇의 몇 %」를 말한다. 100%가 되면 그건 「전부」다.
   세 자리 %는 사장님께 뜻이 없다 — 100%도 세 자리다 */
function pctTxt(x) {
  var n = Math.round(x * 100);
  return n >= 100 ? '전부' : n + '%';
}

/* 남은 거래처 수 — 이 회차 목록에서 아직 안 물어본 것 */
function restCount() { return Math.max(0, UP.queue.length - UP.pos); }

/* 한 걸음 되돌리기. 여러 번 누르면 계속 뒤로 간다 */
function undoPick() {
  /* 36차 H-1. 찍은 게 하나도 없으면 성함 칸으로 되돌아간다.
     「어 뭐야? 내 이름 쓰는 거 어디 갔니?」 — 돌아갈 길이 없었다 */
  if (!UP.hist.length) { askOwner(); return; }
  var h = UP.hist.pop();
  /* 36차 G. 묶어서 한 번에 찍은 것은 한 번에 되돌린다 */
  if (h.kind === 'bundle') {
    h.mems.forEach(function (m) {
      m.g.cat = m.cat; m.g.auto = m.auto;
      if (m.g.mixed) {
        m.g.catIn = m.catIn; m.g.catOut = m.catOut;
        m.g.autoIn = m.autoIn; m.g.autoOut = m.autoOut;
      }
      if (UP.queue.indexOf(m.g) === -1) UP.queue.push(m.g);
    });
    UP.pos = h.i;
    UP.said = null;
    UP.ask = null;
    savePicks();
    drawOnboard();
    return;
  }
  var g = h.g || UP.queue[h.i];
  g.cat = h.cat;
  g.auto = h.auto;
  if (h.kind === 'cardmixed') {
    g.cardMixed = h.cardMixed;
    savePicks();
  }
  if (g.mixed) {                      /* 방향별로 찍은 것도 되돌린다 (35차 B) */
    g.catIn = h.catIn; g.catOut = h.catOut;
    g.autoIn = h.autoIn; g.autoOut = h.autoOut;
  }
  UP.said = null;
  if (h.kind === 'same') {
    if (h.qi >= 0) UP.queue.splice(h.qi, 0, g);   /* 목록에서 뺐던 것을 되돌린다 */
  } else {
    UP.pos = h.i;
  }
  UP.ask = null;
  drawOnboard();
}

/* 결과 화면에서 이어 찍기 — 이미 찍은 건 건너뛰고 못정한부터 */
/* ── 119차 A · 보류 원인부터 분류하기 ─────────────────────────────
   보류 카드의 [분류하고 예상 잔액 보기]가 여는 길이다.
   ★ 새 분류 화면을 만들지 않는다. 기존 거래처 확인 화면(drawOnboard·pickCat)을 쓰고
     물을 차례만 이 길에서 잠깐 바꾼다. 돌아갈 때 원래 차례로 되돌린다 —
     일반 「아직 안 정한 곳」 동선과 다른 매장에는 남기지 않는다.
   ★ 누르는 순간의 보류 원인(c.보류.목록)만 묻는다. 줄마다 적힌 이름은 keyOf(r) 라
     UP.byName 으로 앱의 거래처 하나에 그대로 닿는다. 같은 거래처는 한 번만 묻는다.
   ★ 원인의 출금 쪽이 이미 정해진 거래처, 섞인 카드로 답하신 거래처는 다시 묻지 않는다.
   ★ 원인을 다 보면 결과로 돌아간다. 비교 구간 밖의 미정 거래처는 이어서 묻지 않는다 */
function holdAskStart(hold, months) {
  if (!UP || !hold || !hold.목록) return false;
  if (UP.holdAsk) holdAskEnd(false);          /* 남아 있던 원인 차례부터 되돌린다 */
  var 합 = {}, list = [];
  hold.목록.forEach(function (r) {
    var g = UP.byName[r.이름];
    if (!g || g.cardMixed) return;
    if (gCatFor(g, false)) return;               /* 출금 쪽이 이미 정해졌다 */
    if (합[g.name] == null) { 합[g.name] = 0; list.push(g); }
    합[g.name] += r.액;
  });
  if (!list.length) return false;
  list.sort(function (a, b) { return 합[b.name] - 합[a.name]; });
  return askListBegin(list, months, '원인');
}
/* ★ 119차. 차례로 정하기 — 원인 경로와 목록 경로가 같은 틀을 쓴다.
   종류 '원인' = 보류 원인(출금 쪽만 정한다) · '목록' = 「아직 안 정한 돈」 목록 (기존 분류 규칙 그대로).
   물을 차례만 잠깐 바꾸고 holdAskEnd 가 원래 차례·월·종료일·카드 펼침으로 되돌린다 */
function askListBegin(list, months, 종류) {
  UP.holdAsk = {
    queue: list, months: months, 종류: 종류,
    저장: { queue: UP.queue, pos: UP.pos, target: UP.target, more: UP.more,
            hist: UP.hist, ask: UP.ask, said: UP.said },
    복귀: { dueDay: UP.dueDay, open: !!(UP.open && UP.open.__dueOpen),
            month: UP.month, view: UP.view, store: UP.store }
  };
  UP.queue = list;
  UP.pos = 0;
  UP.target = list.length;
  UP.more = true;
  UP.hist = [];
  UP.ask = null;
  UP.said = null;
  document.getElementById('uptitle').textContent = '거래처 확인';
  upShow('up-onboard');
  drawOnboard();
  return true;
}
/* ★ 119차. 차례로 정하기 — 지금 펼친 「아직 안 정한 돈」 목록에 보이는 거래처만, 보이는 차례대로.
   ★ 이미 정해진 곳·섞인 카드로 답하신 곳은 건너뛴다 (한 항목으로 강제 분류하지 않는다).
   ★ 목록에 없는 거래처(다른 달에만 있는 곳 등)는 더하지 않는다. 같은 거래처는 한 번만 묻는다 */
function listAskStart(names, months) {
  if (!UP) return false;
  if (UP.holdAsk) holdAskEnd(false);
  var 본 = {}, list = [];
  names.forEach(function (nm) {
    var g = UP.byName[nm];
    if (!g || 본[g.name] || gDone(g) || g.cardMixed) return;
    본[g.name] = 1;
    list.push(g);
  });
  if (!list.length) return false;
  return askListBegin(list, months, '목록');
}
/* 원래 물음 차례와 화면 상태로 돌린다. 고르신 분류는 이미 저장됐다 (pickCat → savePicks).
   ★ 결과로 가는 길(showResult)과 일반 동선(moreFromResult)도 먼저 이것을 부른다 —
     다른 길로 빠져나가도 원인 차례가 남지 않게 한다 */
function holdAskEnd(결과로) {
  var h = UP && UP.holdAsk;
  if (!h) return;
  UP.holdAsk = null;
  var sv = h.저장;
  /* 원인 경로에서 다 정한 거래처는 원래 줄의 남은 자리에서 뺀다 (setCat 과 같은 셈) */
  UP.queue = sv.queue.filter(function (g, i) { return i < sv.pos || !gDone(g); });
  UP.pos = sv.pos; UP.target = sv.target; UP.more = sv.more;
  UP.hist = sv.hist; UP.ask = null; UP.said = sv.said;
  var bk = h.복귀;
  if (UP.dueDay !== bk.dueDay) setDueDay(bk.dueDay);
  UP.open = UP.open || {};
  UP.open.__dueOpen = bk.open;
  UP.month = bk.month; UP.view = bk.view;
  if (!결과로) return;
  showResult();
  /* 원인 경로는 예상 잔액 카드 자리로, 목록 경로는 그 목록 자리로 돌아간다.
     ★ 119차. 차례로 정하기 — 목록이 다 비어 없어졌으면 그 달 결과 맨 위다 */
  setTimeout(function () {
    var cd = h.종류 === '목록'
      ? document.querySelector('#up-result .unsetbox')
      : document.querySelector('#up-result .duecard');
    if (cd) cd.scrollIntoView({ block: 'start' });
    else if (h.종류 === '목록') window.scrollTo(0, 0);
  }, 0);
}
function moreFromResult() {
  /* ★ 119차. 보류 원인 차례가 남아 있으면 먼저 원래 차례로 되돌린다 */
  if (UP.holdAsk) holdAskEnd(false);
  var rest = UP.payees.filter(function (g) { return !gDone(g) && !g.cardMixed; });
  if (UP.pos >= UP.queue.length && rest.length) {
    UP.queue = rest;             /* 목록을 다 돌았으면 남은 것으로 새로 만든다 */
    UP.pos = 0;
    UP.hist = [];
    UP.target = Math.min(10, rest.length);
    UP.more = true;
  } else if (onboardDone()) {
    UP.target = Math.min(UP.queue.length, UP.target + 10);
    UP.more = true;
  }
  document.getElementById('uptitle').textContent = '거래처 확인';
  upShow('up-onboard');
  drawOnboard();
}

/* ── 두 문턱이 서로 다른 걸 잰다 ──
   onboardDone 은 전 기간·모든 거래처·입출금 합을 보고,
   ratioMuted 는 그 달·지출만 본다. 못정한가 한 달에 몰리면
   「이제 보실 수 있습니다」라고 해놓고 어떤 달은 비율을 못 보여준다.
   문턱을 맞추면 어떤 매장은 71곳을 찍어야 해서 「149개」 문제가 되살아난다.
   그래서 고치지 않고, 나가시기 전에 미리 말씀드린다.
   미리 알면 놀라움이 아니라 정보다 */
function mutedMonths() {
  if (!UP || !UP.rows || !UP.rows.length) return [];
  var months = monthList(), out = [];
  months.forEach(function (m) {
    var d = monthNumbers(m, isRunning(m, months) ? lastDayIn(m) : null);
    if (ratioMuted(d)) out.push(m);
  });
  return out;
}
/* ★ 41차 1번 (다). 순이익을 못 내놓는 달. ratioMuted 와 다른 것을 잰다 —
     muted 는 「비율을 못 보여준다」이고 blocked 는 「순이익을 못 셉니다」다 */
/* ★ 41차 6번. 파일 전 기간의 「사업에 쓴 돈」 합계.
   skipTotals() 가 전 기간 합계인데 그 옆줄이 「그 달」 사업에 쓴 돈을 분모로 썼다.
   같은 3,229만원이 한 줄에서는 4%, 바로 아랫줄에서는 81%였다 (20곳 찍고 2026-08) */
function costAllSpan() {
  var months = monthList(), t = 0;
  months.forEach(function (m) {
    var d = monthNumbers(m, isRunning(m, months) ? lastDayIn(m) : null);
    t += d.cost || 0;
  });
  return t;
}
function blockedMonths() {
  if (!UP || !UP.rows || !UP.rows.length) return [];
  var months = monthList(), out = [];
  months.forEach(function (m) {
    var d = monthNumbers(m, isRunning(m, months) ? lastDayIn(m) : null);
    if (d.blocked) out.push(m);
  });
  return out;
}
/* 금액 큰 순으로 몇 곳을 더 넣어야 모든 달이 문턱 아래로 내려가는지.
   큐를 실제로 건드리지 않고 항목만 잠깐 넣었다 되돌린다 */
/* 30곳을 넘으면 숫자를 안 쓴다. 「51곳 더」는 어젯밤 그 문제로 돌아간다.
   그래서 30까지만 세어보고 안 되면 −1 이다 */
var MUTED_TRY_MAX = 30;
function picksToClearMonths() {
  var rest = UP.queue.slice(UP.pos), i, hit = -1;
  var n = Math.min(rest.length, MUTED_TRY_MAX);
  for (i = 0; i < n; i++) rest[i].__was = rest[i].cat;
  for (i = 0; i <= n; i++) {
    if (!mutedMonths().length) { hit = i; break; }
    if (i < n) rest[i].cat = '기타경비';
  }
  for (i = 0; i < n; i++) { rest[i].cat = rest[i].__was; delete rest[i].__was; }
  return hit;
}
function mutedNames(ms, months) {
  if (ms.length > 5) {
    return NUM_KO2(months.length) + ' 달 중 ' + NUM_KO2(ms.length) + ' 달은';
  }
  return ms.map(function (m) { return (+m.slice(5, 7)) + '월'; }).join(' · ') + '은';
}
function NUM_KO2(n) {
  var k = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟',
           '아홉', '열'];
  return k[n] || String(n);
}
function drawMutedNote(host) {
  var months = monthList(), ms = mutedMonths();
  if (!ms.length) return;
  var box = el('div', 'obmuted');
  var running = ms.filter(function (m) { return isRunning(m, months); });

  /* 진행 중인 달만 걸렸으면 이건 더 찍어서 풀 문제가 아니다. 기다리면 된다 */
  if (running.length === ms.length) {
    var m0 = ms[0];
    var d0 = monthNumbers(m0, lastDayIn(m0));
    box.appendChild(el('div', null, '달마다 나눠 보면 ' + mutedNames(ms, months) +
      ' 아직 사업에 쓴 돈으로 다 잡혔을 때의 ' + pctTxt(unknownCostShare(d0)) + '입니다.'));
    box.appendChild(el('div', null, (+m0.slice(5, 7)) + '월은 아직 ' +
      lastDayIn(m0) + '일치라 그렇습니다. 달이 끝나면 나아집니다.'));
    host.appendChild(box);
    return;
  }

  var need = picksToClearMonths();
  var one = ms.length === 1 ? monthNumbers(ms[0],
    isRunning(ms[0], months) ? lastDayIn(ms[0]) : null) : null;
  box.appendChild(el('div', null, '달마다 나눠 보면 ' + mutedNames(ms, months) +
    (one ? ' 아직 사업에 쓴 돈으로 다 잡혔을 때의 ' + pctTxt(unknownCostShare(one)) + '라, 그 달 비율은 안 보여드립니다.'
         : ' 아직 비율을 보여드리기 어렵습니다.')));
  if (need > 0) {
    box.appendChild(el('div', null,
      won(need) + '곳 더 정하시면 그 달도 보입니다.'));
  } else {
    /* 51곳 더 찍으라는 말은 어젯밤 그 문제로 돌아가는 것이다 */
    box.appendChild(el('div', null, '거래처를 더 정하실수록 나아집니다.'));
  }
  host.appendChild(box);
}

function drawOnboard() {
  /* ★ 119차. 보류 원인을 다 봤으면 결과로 돌아간다 — 다른 미정 거래처를 이어 묻지 않는다 */
  if (UP.holdAsk && UP.pos >= UP.queue.length) { holdAskEnd(true); return; }
  var host = document.getElementById('up-onboard');
  host.innerHTML = '';
  utStart();                    /* 온보딩 화면을 처음 그릴 때 시계 시작 */

  var done = onboardDone();
  /* ★ 74차. 설명 셋을 걷고 진행 사실 한 줄만 남긴다.
     이 화면의 일은 지금 보이는 거래처 하나를 정하는 것이다. */
  var doneShare = coverage(0);
  var goal = goalLine();
  var reached = doneShare >= goal.share;
  function appendReachedResult() {
    if (UP.holdAsk) return;       /* ★ 119차. 원인 경로는 아래 [결과로 돌아가기]를 쓴다 */
    if (!reached) return;
    var resultGo = el('button', 'b on big', '결과 보기');
    resultGo.type = 'button';
    resultGo.style.marginTop = '12px';
    resultGo.addEventListener('click', showResult);
    host.appendChild(resultGo);
  }
  var covline = el('div', 'obcovline');
  covline.appendChild(el('span', 'obcov', won(UP.pos) + '곳 확인'));
  covline.appendChild(el('b', 'obcovnum' + (reached ? ' ok' : ''),
                         pctTxt(doneShare) + ' 정리됨'));
  host.appendChild(covline);
  var barwrap = el('div', 'obbarwrap nogoal');
  var bar = el('div', 'obbar' + (reached ? ' ok' : ''));
  var fill = el('i');
  fill.style.width = Math.min(100, Math.round(doneShare * 100)) + '%';
  bar.appendChild(fill);
  barwrap.appendChild(bar);
  host.appendChild(barwrap);
  /* ★ 119차. 거래내역을 먼저 올린 순서 — 저장해둔 분류 파일을 여기서 불러온다.
     불러오면 정해진 곳은 빼고 아직 안 정한 곳만 이어서 묻는다 (importApply 'onboard').
     예시와 보류 원인·차례로 정하기 길에서는 안 낸다 */
  /* ★ 119차 분류 파일 선택 단계. 그 단계를 거친 거래내역에는 이 단추를 또 두지 않는다
     (같은 안내를 두 화면에 두지 않는다). 항목 관리의 [불러오기]는 그대로다 */
  if (UP && !UP.demo && !UP.holdAsk && UP.store && !UP.importChosen) {
    var imrow = el('div', 'unsetgo');
    var imb = el('button', 'b', '저장해둔 분류 파일 불러오기');
    imb.type = 'button';
    imb.addEventListener('click', function () {
      useScreen('저장해둔 분류 파일 불러오기');
      IMPORT_WHERE = 'onboard';
      var f = document.getElementById('pickfile');
      if (f) f.click();
    });
    imrow.appendChild(imb);
    host.appendChild(imrow);
  }
  if (UP.pos === 0 && !UP.hist.length) {
    host.appendChild(el('div', 'obsub',
      '한 번 정하면 다음 파일부터 같은 거래처는 다시 묻지 않습니다.'));
  }

  /* 은행 표기만 다른 같은 거래처인지 묻는다. 여기서 묶으면 찍을 개수가 줄어든다 */
  if (UP.ask) {
    var ask = el('div', 'askcard');
    ask.appendChild(el('div', 'ckq', '「' + showName(UP.ask.g.name) + '」도 같은 곳인가요?'));
    ask.appendChild(el('div', 'cka',
      UP.ask.g.n + '건 · ' + (UP.ask.g.net > 0 ? '+' : '−') +
      won(Math.abs(UP.ask.g.net)) + '원 · 방금 「' + showName(UP.ask.from) + '」' +
      eul(UP.ask.from) + ' ' + UP.ask.cat + ro(UP.ask.cat) + ' 정하셨습니다'));
    var ab = el('div', 'ckbtns');
    var yes = el('button', 'b on', '같은 곳입니다 — ' + UP.ask.cat + ro(UP.ask.cat));
    yes.type = 'button';
    yes.addEventListener('click', function () { takeAsk(true); });
    var no = el('button', 'b', '다른 곳입니다');
    no.type = 'button';
    no.addEventListener('click', function () { takeAsk(false); });
    ab.appendChild(yes); ab.appendChild(no);
    ask.appendChild(ab);
    host.appendChild(ask);
  }

  /* 방금 찍은 것 — 미끄러졌을 때 바로 되돌릴 수 있게 */
  if (UP.hist.length) {
    var last = UP.hist[UP.hist.length - 1];
    var now = el('div', 'obnow');
    var nm = el('span', 'nm', '방금: ' + showName(last.name) + ' → ');
    nm.appendChild(el('span', 'to', last.kind === 'skip' ? '나중에' : last.newCat));
    now.appendChild(nm);
    var ub = el('button', 'obprev', '되돌리기');
    ub.type = 'button';
    ub.addEventListener('click', undoPick);
    now.appendChild(ub);
    host.appendChild(now);
    /* 35차 A. 찍는 순간 결과를 한 줄로 말한다.
       「매출·지출에 넣지 않습니다」만으로는 내 순이익이 어떻게 되는지 안 보인다 */
    if (UP.said) {
      host.appendChild(el('div', 'obsaid',
        '이렇게 정하면 순이익은 그대로입니다'));
    }
  }

  if (done) {
    var allDone = unsetCount() === 0;
    var dn = el('div', 'obdone');
    /* ★ 64-5차. 다 정하신 순간에만 마크가 나온다 — 축하 자리 하나다 (요청서 4).
       아직 남으신 경우는 ✓ 그대로다. 마크를 여기저기 뿌리지 않는다 */
    if (allDone) {
      var dmk = document.createElement('img');
      dmk.className = 'obmark'; dmk.src = BRAND_MARK; dmk.alt = '';
      dn.appendChild(dmk);
    } else {
      dn.appendChild(el('span', 'obtick', '✓'));
    }
    /* ★ 41차 1번 (다). 「이제 보실 수 있습니다」라고 해놓고 다음 화면이
       「셀 수 없습니다」면 안 된다. 막힌 달이 있으면 실제로 보이는 데까지 말한다 */
    var vm = null;
    if (!allDone && blockedMonths().length) vm = viewableMonth(monthList(), null);
    dn.appendChild(document.createTextNode(
      allDone ? '다 정하셨습니다'
              : (vm ? (+vm.slice(5, 7)) + '월까지는 보실 수 있습니다'
                    : '이제 보실 수 있습니다')));
    host.appendChild(dn);
    /* 왜 됐는지 말해주지 않으면 남은 개수가 계속 마음에 걸린다.
       ★ 36차 K. 막대는 올라가는데 이 문장만 내려가면 한 화면에 두 방향이 섞인다.
         여기도 「정리했습니다」 쪽으로 말한다 */
    if (!allDone) {
      host.appendChild(el('div', 'obthr',
        '정리했습니다 ' + pctTxt(coverage(0)) +
        '. 나머지는 숫자를 거의 안 바꿉니다.'));
    }
    drawMutedNote(host);
    if (allDone) {
      /* 다음 달엔 이 일을 안 해도 된다는 걸 알려준다 */
      host.appendChild(el('div', 'obnext',
        '이제 매달 새로 올리셔도 이 거래처들은 자동으로 잡힙니다.'));
    }
    var acts = el('div', 'obdoneacts');
    var go = el('button', 'b on big', '결과 보기');
    go.type = 'button';
    go.addEventListener('click', showResult);
    acts.appendChild(go);

    var rest = restCount();
    if (rest > 0) {
      var n = Math.min(10, rest);
      var more = el('button', 'b dim',
        rest < 10 ? '남은 ' + rest + '곳 정하기' : '10곳 더 정하기');
      more.type = 'button';
      more.addEventListener('click', function () {
        UP.target = Math.min(UP.queue.length, UP.target + n);
        UP.more = true;
        drawOnboard();
      });
      acts.appendChild(more);
    }
    if (UP.hist.length) {
      var back = el('button', 'obprev', '← 이전');
      back.type = 'button';
      back.addEventListener('click', undoPick);
      acts.appendChild(back);
    }
    host.appendChild(acts);

    /* 위의 obthr 이 이미 「정리했습니다 98%」를 말한다.
       여기서는 더 찍었을 때 실제로 줄어드는 경우에만 그 값을 덧붙인다.
       2% → 2% 는 더 찍으라는 말이 아니라 안 해도 된다는 말이다 */
    if (rest > 0) {
      var n2 = Math.min(10, rest);
      var now2 = 1 - coverage(0), then2 = 1 - coverage(n2);
      if (now2 - then2 >= 0.01) {
        var line = el('div', 'obnext');
        line.appendChild(document.createTextNode(n2 + '곳 더 정하면 '));
        line.appendChild(el('b', null, pctTxt(1 - then2)));
        line.appendChild(document.createTextNode('까지 정리됩니다.'));
        host.appendChild(line);
      }
    }
    return;
  }

  var g = UP.queue[UP.pos];
  var cardQuestion = isCardOut(g) && !g.cardBiz;
  host.appendChild(el('div', 'obquestion',
    cardQuestion ? '이 카드는 어떻게 쓰셨나요?' : '이 거래는 무엇인가요?'));
  /* 36차 G. 같은 앞글자·같은 카드 대금이 여럿이면 한 줄로 묶어 한 번에 찍게 한다 */
  /* ★ 119차. 보류 원인 경로에서는 묶지 않는다 — 묶음에는 원인이 아닌 거래처가 섞인다 */
  var bun = (isCardOut(g) || UP.holdAsk) ? null : bundleFor(g);
  if (bun) { drawBundle(host, bun); appendReachedResult(); return; }
  var card = el('div', 'obcard');
  /* ★ 69차 ③. 이름 오른쪽에 「최근 거래 보기」가 붙는다 (아래 drawRawPeek) */
  var 이름칸 = el('div', 'obname');
  이름칸.appendChild(el('span', 'obnm', showName(g.name)));
  card.appendChild(이름칸);
  if (isCut(g.name)) card.appendChild(el('div', 'namecut', '은행에서 이름이 잘려 들어왔습니다'));

  /* ── 35차 B ──
     예전에는 제목에 순합(+1,025,141원) · 본문에 그중 한 건(4,500,000원) ·
     꼬리에 또 다른 건의 날짜(최근 8월 18일)가 놓여 숫자 셋이 서로 안 맞았다.
     이제 머리줄은 기간과 건수만 말하고, 금액은 아래 방향별 줄에서 날짜와 함께 말한다 */
  /* ★ 44차 2-1. 한쪽만 있는 거래처는 아래 줄이 같은 기간·건수를 또 말한다.
     양쪽 다 있는 곳에서만 합계로서 뜻이 있다 */
  if (g.mixed) {
    var meta = el('div', 'obmeta');
    meta.appendChild(document.createTextNode(payeeSpan(g) + ' · 통틀어 ' + g.n + '건'));
    card.appendChild(meta);
  }

  var facts = el('div', 'obfacts');
  var fOut = factLine(g, false), fIn = factLine(g, true);
  if (fOut) facts.appendChild(fOut);
  if (fIn) facts.appendChild(fIn);
  card.appendChild(facts);

  /* 카드사 출금은 사용처 여럿이 한 번에 빠져나가니 일반 거래처와 같이 짐작하지 않는다. */
  if (cardQuestion) {
    card.appendChild(el('div', 'obsub', '사업·개인 사용이 섞여 있으면 정확히 나눌 수 없습니다.'));
    var cardBtns = el('div', 'obbtns');
    var onlyBiz = el('button', 'b on', '사업에만 쓴 카드');
    onlyBiz.type = 'button';
    onlyBiz.addEventListener('click', function () {
      g.cardBiz = true;
      drawOnboard();
    });
    var mixedCard = el('button', 'b', '사업·개인이 섞인 카드');
    mixedCard.type = 'button';
    mixedCard.addEventListener('click', function () {
      UP.hist.push({ i: UP.pos, g: g, cat: g.cat, auto: g.auto,
                     catIn: g.catIn, catOut: g.catOut,
                     autoIn: g.autoIn, autoOut: g.autoOut,
                     cardMixed: !!g.cardMixed, name: g.name,
                     newCat: '아직', kind: 'cardmixed' });
      g.cardMixed = true;
      UP.said = null;
      UP.pos++;
      utPick();
      savePicks();
      drawOnboard();
    });
    cardBtns.appendChild(onlyBiz);
    cardBtns.appendChild(mixedCard);
    card.appendChild(cardBtns);
    drawRawPeek(card, g.rawList || [g.name], null, 이름칸);
    host.appendChild(card);
    appendReachedResult();
    return;
  }

  /* ── 35차 B · 방향마다 따로 묻는다 ──
     한쪽만 있는 거래처는 지금까지처럼 한 번만 묻는다.
     설명 문장은 빼고 그 자리에 사실을 놓았다 (위 obfacts) —
     「사장님이 넣으신 돈이라면…」 같은 말은 사장님이 결정하시는 데 필요가 없다 */
  var isOwner = isOwnerName(g);
  var whyAll = [];
  /* ★ 63-4. 한 거래처에는 항목 하나다. 「나간 돈은?」·「들어온 돈은?」 두 줄을 없앤다.
     납품처에서 들어온 돈(환불·반품)은 같은 항목에서 빠진 것으로 센다.
     방향이 갈려야 하는 것 둘 — 「대출」·「사업 외 용도」 — 은 항목 쪽이 가른다 (sideOf).
     ★ 44차 2-2 에서 「아직 아무 쪽도 안 정한 곳만 한 번 묻는다」로 반쯤 와 있던 것을
       모든 거래처로 넓힌 것이다 */
  var sides = [null];
  var single = true;
  /* 어느 쪽 목록을 보여드릴지는 그 거래처가 어느 쪽인지로 정한다.
     ★ 나간 돈이 한 건도 없는 곳만 들어온 쪽으로 묻는다 —
       그렇게 안 하면 「결산이자」처럼 들어오기만 하는 곳에 나간 쪽 목록이 나오고,
       「이자」 낱말이 나간 쪽 추천(대출 상환)을 끌고 온다 (63-2 ★) */
  var askIn = !g.outN;

  sides.forEach(function (isIn) {
    var side = single ? null : isIn;
    /* 양쪽 다 있는 곳은 나간 쪽 기준으로 본다 (건수가 많은 쪽이다) */
    if (isIn === null) isIn = askIn;
    var cur = gCatFor(g, isIn);
    /* 지운 항목은 고르기 버튼에도 안 나와야 한다.
       감춘 항목(약국의 「주류·음료」)도 마찬가지다 — 감춰놓고 버튼에 두면 감춘 게 아니다 */
    var quick = (isIn ? UP_QUICK_IN : UP_QUICK_OUT).map(function (c) {
      return c === '매출' ? '매출' : baseName(c);
    }).filter(function (c) { return c === '매출' || !isHidden(c); });
    /* 35차 D. 「사업 외 용도」는 늘 보이게 둔다.
       모를 때 누를 곳이 「기타」뿐이면 그건 지출이라 순이익이 깎인다 */
    var outside = baseName('사업 외 용도');
    if (UP.accounts.indexOf(outside) !== -1 && quick.indexOf(outside) === -1) {
      var at = quick.indexOf(etcName());
      quick.splice(at === -1 ? quick.length : at + 1, 0, outside);
    }
    /* ★ 44차 2-2. 한 번만 묻는 카드는 나간 쪽 목록을 쓴다.
       그런데 들어온 돈이 있는 거래처인데 「매출」이 목록에 없으면
       제일 흔한 답을 [다른 항목] 안에 숨기는 셈이 된다. 넣어준다 */
    /* ★ 45차 ③. 매출이 아닐 게 뻔한 들어온 돈은 고를 목록을 바꾼다.
       「대출」을 숨기지 않고 맨 앞에 둔다 */
    if (isIn && loanLikeIn(g)) {
      var loan = baseName('대출'), put = baseName('사업 외 용도');
      [put, loan].forEach(function (c) {
        if (UP.accounts.indexOf(c) === -1) return;
        var at3 = quick.indexOf(c);
        if (at3 !== -1) quick.splice(at3, 1);
        quick.unshift(c);
      });
    }
    if (side === null && g.mixed && g.inN > 0 && quick.indexOf('매출') === -1) {
      var at2 = quick.indexOf(etcName());
      quick.splice(at2 === -1 ? quick.length : at2, 0, '매출');
    }
    /* ★ 81차 ②. 이유를 완성된 문장이 아니라 조각으로 모은다.
       별표를 달았는지(spark) 정해진 뒤에야 어떤 문장으로 말할지 갈리기 때문이다 */
    var front = [], bits = [];
    /* ★ 81차 ④. 이름이나 적요에 「세무」가 있으면 세무기장료가 첫 추천이다 (개발자 확정).
       ★ 다른 규칙보다 먼저 본다. 대표자 성함 규칙에 밀리면
         「○○세무회계」가 「사업 외 용도」로 추천되어, 사업 지출인 기장료가
         손익에서 통째로 빠진다 — 고치려는 것이 바로 그 길이다.
       ★ front 에 이것 하나만 두어 spark 가 붙게 한다. 그래야 첫 버튼이 된다.
         자동 확정은 하지 않는다 — 어디까지나 ✨ 하나다 */
    var 기장 = baseName('세무기장료');
    var 세무자리 = taxAcctWhere(g);
    if (세무자리 && UP.accounts.indexOf(기장) !== -1) {
      front.push(기장);
      bits.push({ kind: 세무자리 === '적요' ? 'memo' : 'name', word: '세무' });
    }
    /* 대표자 성함과 완전히 같으면 이 규칙이 먼저다 — 출금까지 잡힌다.
       ★ 「매출」을 같이 밀지 않는다. 정반대 둘을 나란히 추천하던 것이 문제였다 */
    if (!front.length && isOwner) front.push(baseName('사업 외 용도'));
    /* 사람 이름으로 들어온 큰 돈 — 매출이 아닐 수 있다 */
    var isPersonalIn = !front.length && !isOwner && isIn && personalIn(g);
    if (isPersonalIn) front.push(personalFirst());
    if (!front.length) {
      var learned = learnedFor(g);
      if (learned) {
        front.push(learned.cat);
        bits.push({ kind: 'learn', cat: learned.cat, from: learned.from });
      }
      /* 직접 만드신 항목이 먼저다 — 만드셨다는 건 자주 쓰시겠다는 뜻이다 */
      madeHint(g).forEach(function (h) {
        if (front.length >= 3 || front.indexOf(h.cat) !== -1) return;
        front.push(h.cat);
        bits.push({ kind: 'made', word: h.word });
      });
      hintFor(g.name, isIn ? 1 : -1).forEach(function (h) {
        if (front.length >= 3 || front.indexOf(h.cat) !== -1) return;
        /* 지운 항목을 가리키는 추천은 버린다 — 없는 항목을 권하면 안 된다 */
        if (UP.accounts.indexOf(baseName(h.cat)) === -1) return;
        front.push(h.cat);
        /* 38차 11번. 차례는 금액순이라 「앞에 두었습니다」는 이제 틀린 말이다 */
        bits.push({ kind: 'name', word: h.word });
      });
      /* ★ 81차 ③. 이름에서 걸린 것과 적요에서 걸린 것을 둘 다 후보로 삼는다.
         적요에서 걸린 것은 설명을 따로 말한다 — 「적요에 …」 */
      memoHints(g, isIn).forEach(function (h) {
        if (front.length >= 3 || front.indexOf(h.cat) !== -1) return;
        if (UP.accounts.indexOf(baseName(h.cat)) === -1) return;
        front.push(h.cat);
        bits.push({ kind: 'memo', word: h.word });
      });
    }
    /* 버튼이 일곱 개가 되면 375px 에서 줄이 바뀐다. 추천이 늘어난 만큼
       그 파일에서 제일 안 쓰는 기본 항목을 [다른 항목] 안으로 밀어넣는다 */
    /* ★ 44차. front 를 빼지 않는다 — 추천이라고 자리를 옮기지 않기 때문이다 */
    var pool = quick.slice();
    /* 추천이 늘어난 만큼만 잘라낸다.
       ★ 여섯으로 자르면 「식자재」가 빠진다 — 그 파일에서 아직 아무도 안 찍었다는 이유로
         식당에서 제일 큰 지출이 사라진다. 기본 여섯에 「사업 외 용도」(35차 D)를 더한
         일곱까지는 그대로 두고, 추천이 더 붙을 때만 제일 안 쓰는 것을 밀어넣는다 */
    /* ★ 44차. front 는 이제 pool 안에 있다. 따로 더하면 두 번 세어
       멀쩡한 「식자재」가 잘려 나간다 (실파일에서 실제로 그랬다) */
    /* 한 번만 묻는 카드는 「매출」이 하나 더 붙으므로 여덟까지 둔다 */
    var QUICK_MAX = (side === null && g.mixed) ? 8 : 7;
    var merged = pool.slice();
    front.forEach(function (c) { if (merged.indexOf(c) === -1) merged.push(c); });
    var extra = Math.max(0, merged.length - QUICK_MAX);
    if (extra > 0 && pool.length) {
      var usedN = {};
      pool.forEach(function (c) { usedN[c] = 0; });
      (UP.payees || []).forEach(function (p) {
        gCats(p).forEach(function (c) { if (usedN[c] != null) usedN[c]++; });
      });
      /* 「기타」와 「사업 외 용도」는 옮길 곳이라 맨 마지막까지 남긴다 */
      var keepLast = [etcName(), outside];
      var drop = pool.filter(function (c) { return front.indexOf(c) === -1; })
        .sort(function (a, b) {
          var ka = keepLast.indexOf(a) !== -1, kb = keepLast.indexOf(b) !== -1;
          if (ka !== kb) return ka ? 1 : -1;
          return usedN[a] - usedN[b];
        }).slice(0, extra);
      pool = pool.filter(function (c) { return drop.indexOf(c) === -1; });
    }
    /* ★ 44차 2-3·2-4. 예전에는 추천을 맨 앞으로 당겼다. 두 가지가 나빴다.
       ① 양쪽 자리가 달라져서 뒤죽박죽으로 보였다 —
          나간 쪽 첫 버튼이 「사업 외 용도」, 들어온 쪽이 「내가 넣은 돈」이었다.
       ② 대표자 성함 규칙이 「사업 외 용도」를 첫 버튼으로 밀어 올렸다.
          빨리 넘기려고 첫 버튼을 누르면 그 돈이 손익에서 통째로 빠진다 —
          9,832만원짜리 거래처가 습관적인 탭 한 번에 사라진다.
       ★ 자리는 늘 같은 차례(UP_QUICK_*)로 두고, 추천은 ✨ 로만 알린다.
         그러면 첫 버튼은 나간 쪽 「식자재」·들어온 쪽 「매출」이다 —
         잘못 눌러도 손해가 작은 항목이 앞에 온다 */
    var order = pool.slice();
    front.forEach(function (c) { if (order.indexOf(c) === -1) order.push(c); });
    /* ✨는 하나만. 둘 이상 추천되면 아무것도 안 단다 (35차 B) —
       「내가 넣은 돈」과 「매출」에 ✨가 같이 붙던 것이 정반대 추천이었다 */
    var spark = front.length === 1 ? front[0] : null;
    /* ★ 64-2. ✨가 붙은 추천은 늘 첫 버튼이다.
       실파일의 어느 거래처 카드에서 「식자재✨」가 다섯 번째에 있었다 —
       추천해 놓고 찾아야 하면 추천이 아니다.
     ★ 위 44차 2-4 를 되돌리는 것이다. 그때 걱정한 것은
       대표자 성함 규칙이 계산 밖 항목을 첫 버튼으로 밀어 올리는 것이었다 —
       습관적인 탭 한 번에 큰 돈이 손익에서 빠지는 길.
       그 길은 아직 열려 있다 (성함과 같은 거래처면 「내가 가져간 돈✨」이 맨 앞).
       앞으로 당기기로 정해졌다 */
    if (spark) {
      var si = order.indexOf(spark);
      if (si > 0) { order.splice(si, 1); order.unshift(spark); }
    }

    /* ★ 63-4. 「나간 돈은?」·「들어온 돈은?」 이름표는 없앴다 —
       한 거래처에 한 항목이라 물을 것이 하나뿐이다 */
    var btns = el('div', 'obbtns');
    order.forEach(function (c) {
      var b = el('button', 'b' + (c === spark ? ' hint' : '') + (c === cur ? ' on' : ''), c);
      b.type = 'button';
      if (c === spark) b.appendChild(el('span', 'spark', '✨'));
      b.addEventListener('click', function () { pickCat(g, c, side); });
      btns.appendChild(b);
    });
    /* 고르는 버튼이 아니라 목록을 여는 버튼이다. 색만으로 구분하지 않는다 —
       ▾ 로 「더 있다」를 글자로도 보인다 */
    var more = el('button', 'upbtn plain', '다른 항목');
    more.type = 'button';
    more.appendChild(el('span', 'chev', ' ▾'));
    btns.appendChild(more);
    card.appendChild(btns);

    var menu = el('div', 'menu');
    menu.hidden = true;
    card.appendChild(menu);
    more.addEventListener('click', function () {
      if (!menu.hidden) { menu.hidden = true; more.classList.remove('on'); return; }
      more.classList.add('on');
      drawCatMenu(menu, g, side, order);
      menu.hidden = false;
    });
    /* ★ 81차 ②. 여기서 spark 가 정해져 있다 — 별표를 달았으면 예전 문장,
       안 달았으면 「어느 쪽인지 확실하지 않습니다」 한 줄로 묶는다 */
    whyFrom(bits, spark).forEach(function (w) { if (whyAll.indexOf(w) === -1) whyAll.push(w); });
  });
  if (whyAll.length) card.appendChild(el('div', 'obwhy', '↑ ' + whyAll.join(' · ')));
  drawRawPeek(card, g.rawList || [g.name], null, 이름칸);
  /* 통장과 대조할 수 있게 원본 표기를 남긴다 */
  if (g.rawList && g.rawList.length > 1) {
    card.appendChild(el('div', 'obwhy',
      '거래내역에는 ' + g.rawList.slice(0, 4).join(' · ') +
      (g.rawList.length > 4 ? ' 외 ' + (g.rawList.length - 4) + '개' : '') +
      ' 로 적혀 있어 한 곳으로 묶었습니다'));
  }

  var later = el('div', 'oblater');
  var prev = el('button', 'upbtn plain', '← 이전');
  prev.type = 'button';
  prev.disabled = !UP.hist.length && !(isCardOut(g) && g.cardBiz);
  prev.addEventListener('click', function () {
    if (isCardOut(g) && g.cardBiz) {
      g.cardBiz = false;
      drawOnboard();
      return;
    }
    undoPick();
  });
  later.appendChild(prev);
  var skip = el('button', 'oblink', '나중에');
  skip.type = 'button';
  skip.addEventListener('click', function () {
    UP.hist.push({ i: UP.pos, g: g, cat: g.cat, auto: g.auto, name: g.name, kind: 'skip' });
    UP.pos++;
    utPick();
    drawOnboard();
  });
  later.appendChild(skip);
  card.appendChild(later);
  /* ★ 119차. 보류 원인 경로 — 적용 범위를 한 번 적고, 중간에 돌아갈 길을 둔다.
     분류는 거래처 단위 그대로다. 섞인 거래처는 출금 쪽에만 넣는다 (pickCat) */
  if (UP.holdAsk) {
    /* ★ 119차. 차례로 정하기 — 목록 경로는 기존 규칙대로 양쪽에 같이 넣으므로 「거래」 문장이다 */
    card.appendChild(el('div', 'obsub', (g.mixed && UP.holdAsk.종류 === '원인')
      ? '선택한 항목은 이 거래처의 다른 날짜 출금에도 적용됩니다.'
      : '선택한 항목은 이 거래처의 다른 날짜 거래에도 적용됩니다.'));
    var hb = el('button', 'b', '결과로 돌아가기');
    hb.type = 'button';
    hb.style.marginTop = '10px';
    hb.addEventListener('click', function () { holdAskEnd(true); });
    card.appendChild(hb);
  }

  host.appendChild(card);
  /* ★ 76차. 목표 비율에 닿으면 남은 거래처가 있어도 결과를 볼 수 있다.
     완료 화면의 단추와 같은 길을 쓰되, 아직 목표 전에는 보이지 않는다. */
  appendReachedResult();
}

/* side : 섞인 거래처에서 어느 쪽을 정하는 중인가 (35차 B). 한쪽만 있는 곳은 null */
function drawCatMenu(menu, g, side, shown) {
  menu.innerHTML = '';
  /* 감춘 항목(약국의 「주류·음료」 등)은 목록에도 안 나온다.
     다만 그 항목으로 이미 정해둔 거래처라면 보여야 바꾸실 수 있다 */
  UP.accounts.filter(function (n) {
    return (!isHidden(n) || gCats(g).indexOf(n) !== -1) &&
           (!shown || shown.indexOf(n) === -1);
  }).forEach(function (name) {
    var b = el('button', 'mi', name);
    b.type = 'button';
    var note = noteFor(name);
    if (note) {
      if (isKeep(name)) b.classList.add('keep');
      b.appendChild(el('span', 'msub', note));
    }
    b.addEventListener('click', function () { pickCat(g, name, side); });
    menu.appendChild(b);
  });
  var add = el('button', 'mi add', '+ 항목 추가');
  add.type = 'button';
  add.addEventListener('click', function () { drawCatAdd(menu, g, side, shown); });
  menu.appendChild(add);
}

/* 항목 이름 입력 한 곳에서 처리한다.
   같은 이름은 못 만들게 하고, 기호만 다른 비슷한 이름이면 먼저 물어본다.
   항목이 불어나는 것을 입구에서 막는 것이 목적이다 (인수인계 §5) */
function drawNameBox(box, opt) {
  box.innerHTML = '';
  var wrap = el('div', 'addbox');
  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = opt.placeholder || '항목 이름';
  input.maxLength = 12;
  input.value = opt.value || '';
  var msg = el('div', 'addmsg');
  msg.hidden = true;
  var row = el('div', 'addrow');
  var ok = el('button', 'b on', opt.okText || '저장');
  ok.type = 'button';
  var cancel = el('button', 'b', '취소');
  cancel.type = 'button';
  row.appendChild(ok); row.appendChild(cancel);
  wrap.appendChild(input); wrap.appendChild(msg); wrap.appendChild(row);
  box.appendChild(wrap);
  input.focus();
  input.select();
  cancel.addEventListener('click', opt.onCancel);

  ok.addEventListener('click', function () {
    var name = input.value.trim();
    if (!name) { input.focus(); return; }
    if (opt.self && name === opt.self) { opt.onDone(name); return; }
    var same = findSame(name);
    if (same && same.hit === opt.self) { opt.onDone(name); return; }
    if (!same) { opt.onDone(name); return; }

    msg.hidden = false;
    msg.innerHTML = '';
    msg.appendChild(el('div', 'addq', same.exact
      ? '「' + same.hit + '」이 이미 있습니다.'
      : '「' + same.hit + '」이 이미 있습니다. 이걸 쓰시겠어요?'));
    var acts = el('div', 'addrow');
    var use = el('button', 'b on', '기존 것 쓰기');
    use.type = 'button';
    use.addEventListener('click', function () { opt.onDone(same.hit, true); });
    acts.appendChild(use);
    if (!same.exact) {
      var mk = el('button', 'b', '새로 만들기');
      mk.type = 'button';
      mk.addEventListener('click', function () { opt.onDone(name); });
      acts.appendChild(mk);
    }
    msg.appendChild(acts);
  });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok.click(); });
  input.addEventListener('input', function () { msg.hidden = true; });
}

/* ── 35차 C · 새 항목을 만들 때 한 번 묻는다 ──
   이걸 안 물어서, 손수 만드신 「대출」이 그 밖의 입금으로 들어가
   8천만원이 순이익에 그대로 더해졌다 */
function askBizKind(box, name, after) {
  box.innerHTML = '';
  var wrap = el('div', 'addbox');
  wrap.appendChild(el('div', 'addq',
    '「' + name + '」은 사업으로 번 돈(또는 사업에 쓴 돈)인가요?'));
  var row = el('div', 'addrow2');
  var yes = el('button', 'b on', '예');
  yes.type = 'button';
  yes.addEventListener('click', function () { after(false); });
  var no = el('button', 'b');
  no.type = 'button';
  no.appendChild(document.createTextNode('아니요'));
  no.appendChild(el('span', 'bsub', '매출·지출에 넣지 않습니다'));
  no.addEventListener('click', function () { after(true); });
  row.appendChild(yes); row.appendChild(no);
  wrap.appendChild(row);
  box.appendChild(wrap);
}
/* 새 항목을 목록에 넣고, 사업과 무관하다고 하셨으면 keepSet 에도 넣는다 */
function addAccount(name, keep) {
  if (UP.accounts.indexOf(name) === -1) UP.accounts.push(name);
  var at = UP.keepSet.indexOf(name);
  if (keep && at === -1) UP.keepSet.push(name);
  if (!keep && at !== -1) UP.keepSet.splice(at, 1);
  savePicks();
}

function drawCatAdd(menu, g, side, shown) {
  drawNameBox(menu, {
    onCancel: function () { drawCatMenu(menu, g, side, shown); },
    onDone: function (name, existing) {
      if (existing) { pickCat(g, name, side); return; }
      askBizKind(menu, name, function (keep) {
        addAccount(name, keep);
        pickCat(g, name, side);
      });
    }
  });
}

/* 한 번 찍으면 같은 거래처 전체에 적용된다 */
/* isIn : 섞인 거래처에서 어느 쪽을 정하셨는가 (true 들어온 돈 · false 나간 돈).
   한쪽만 있는 거래처는 null 로 들어오고 지금까지처럼 한 번에 끝난다 (35차 B) */
function pickCat(g, cat, isIn) {
  g.cardMixed = false;
  /* 사람 이름 입금에 사장님이 뭘 고르시는지 익힌다 */
  if (personalIn(g) && isIn !== false) {
    if (!UP.personalPick) UP.personalPick = { sales: 0, put: 0 };
    if (cat === '매출') UP.personalPick.sales++;
    else if (isKeep(cat)) UP.personalPick.put++;
  }
  UP.hist.push({ i: UP.pos, g: g, cat: g.cat, auto: g.auto,
                 catIn: g.catIn, catOut: g.catOut,
                 autoIn: g.autoIn, autoOut: g.autoOut,
                 name: g.name, newCat: cat, kind: 'pick' });
  /* ★ 119차. 보류 원인 경로에서는 원인인 출금 쪽만 정한다.
     입금 쪽은 정해져 있든 아니든 건드리지 않는다 */
  var 원인길 = !!(UP.holdAsk && UP.holdAsk.종류 === '원인');
  if (원인길 && g.mixed) gSetCat(g, false, cat, false);
  else if (g.mixed && isIn === null) {
    /* ★ 63-4. 한 번 묻고 양쪽에 같이 넣는다. 되묻지 않는다 —
       방향이 뜻을 가르는 항목(「대출」·「사업 외 용도」)은 sideOf 가 화면과
       계산에서 갈라 준다. 사장님께 두 번 여쭐 까닭이 없다 */
    gSetCat(g, false, cat, false);
    gSetCat(g, true, cat, false);
  } else if (g.mixed) gSetCat(g, isIn, cat, false);
  else { g.cat = cat; g.auto = false; }
  /* 찍은 결과를 그 자리에서 한 줄로 말한다 (35차 A).
     「매출·지출에 넣지 않습니다」만으로는 순이익이 어떻게 되는지 안 보인다 */
  UP.said = isKeep(cat) ? cat : null;
  /* 섞인 거래처는 양쪽을 다 정하셔야 다음으로 넘어간다
     ★ 119차. 보류 원인 경로는 출금 쪽이 정해지면 넘어간다 */
  if (gDone(g) || (원인길 && gCatFor(g, false))) UP.pos++;
  utPick();
  savePicks();                     /* 찍을 때마다 바로 남긴다 */
  /* 은행 표기만 다른 같은 거래처가 있으면 이어서 물어본다
     ★ 119차. 보류 원인 경로에서는 원인이 아닌 거래처를 이어서 묻지 않는다 */
  /* ★ 119차. 차례로 정하기 — 목록 경로도 목록 밖 거래처를 이어 묻지 않는다 */
  var sim = (!UP.holdAsk && gDone(g)) ? similarPayees(g) : [];
  UP.ask = sim.length ? { g: sim[0], cat: cat, from: g.name } : null;
  drawOnboard();
}

/* 「○○도 같은 곳인가요?」에 같은 곳이라고 답한 경우 */
function takeAsk(yes) {
  var a = UP.ask;
  UP.ask = null;
  if (!a) { drawOnboard(); return; }
  if (yes) {
    var qi = UP.queue.indexOf(a.g);
    UP.hist.push({ i: UP.pos, g: a.g, cat: a.g.cat, auto: a.g.auto,
                   catIn: a.g.catIn, catOut: a.g.catOut,
                   autoIn: a.g.autoIn, autoOut: a.g.autoOut,
                   name: a.g.name, newCat: a.cat, kind: 'same',
                   qi: (qi >= UP.pos ? qi : -1) });
    /* 섞인 곳이면 양쪽에 같은 것을 넣는다. 방향에 따라 뜻이 갈리는 이름은 화면이 돌려 준다 */
    if (a.g.mixed) { gSetCat(a.g, true, a.cat, false); gSetCat(a.g, false, a.cat, false); }
    else { a.g.cat = a.cat; a.g.auto = false; }
    savePicks();
    if (qi >= UP.pos) UP.queue.splice(qi, 1);
  }
  drawOnboard();
}

