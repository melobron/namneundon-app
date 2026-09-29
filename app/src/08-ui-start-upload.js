function el(tag, cls, txt) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}
/* ── 88차 ② · 접힌다는 것을 글자로 알리는 상자 ─────────────────────
   파일럿 1호 대표가 접히는 줄 모르셨다. 작은 화살표(▾) 하나뿐이었기 때문이다.
   ★ button 이 아니라 span 이다 — 부모 줄이 이미 눌리는 자리라, button 을 넣으면
     누름이 두 겹이 된다. span 이면 상자를 눌러도 줄을 눌러도 같은 한 번이다.
     지금 되는 것(줄 아무 데나 누르기)을 하나도 없애지 않는다.
   ★ 새 모양을 여기 하나만 둔다 — 붙이는 자리가 여럿이라 흩어 놓으면
     또 자리마다 다른 말이 된다 (49차 — 같은 것은 한 모양으로) */
function foldChip(open, 무엇) {
  return el('span', 'foldchip', (무엇 ? 무엇 + ' ' : '') + (open ? '접기 ▴' : '자세히 ▾'));
}
function upShow(which) {
  /* ★ NAM-9 (2026-09-29). 결과 전에 분석 종료일을 묻던 up-duedate 화면을 없앴다.
     예상 기간은 이제 묻지 않고 정해진다 (자료 기준일이 속한 달의 다음 달 말일) */
  [
    'up-trade',
    'up-pick',
    'up-files',
    'up-name',
    'up-owner',
    'up-cats',
    'up-onboard',
    'up-done'
  ].forEach(function (id) {
    document.getElementById(id).hidden = id !== which;
  });
  var topImage = document.getElementById('topimage');
  if (topImage) topImage.hidden = which !== 'up-done';
  /* 단계만 바꾸고 창을 안 열면 사장님 눈에는 아무 일도 안 일어난다.
     'up-done' 은 결과를 본 화면에 그리는 자리라 창을 열지 않는다 */
  if (which === 'up-done') return;
  openUpPanel();
  var box = document.getElementById('up');
  if (box) box.scrollTop = 0; /* 아래에서 눌렀어도 새 화면은 위부터 */
  window.scrollTo(0, 0);
}
function upStat(html) {
  document.getElementById('upstat').innerHTML = html;
}
/* ── 119차 업로드 안내 · 읽은 뒤에는 처음 올리기 안내를 접는다 ──────────
   실제 휴대폰에서 거래내역을 읽은 뒤에도 큰 올리기 상자가 남아, 대표님이
   파일을 못 읽은 것으로 보셨다. 확인 카드 단계(showBreakCards)에서만 켠다.
   파일을 고르기만 했거나 읽기에 실패한 화면에서는 켜지 않는다.
   ★ 요약은 startFromBanks 가 쓴 그 줄(#upstat)을 그대로 쓴다. 건수를 새 자리에 또 적지 않는다.
   ★ 추가 올리기는 요약 안의 작은 [거래내역 추가하기] 하나로 둔다 */
var ADD_FROM_READ = false; /* [거래내역 추가하기]로 파일 고르기를 열었는가 */
function upReadState(on) {
  var pick = document.getElementById('up-pick');
  if (pick) pick.classList[on ? 'add' : 'remove']('upread');
  if (!on) {
    ADD_FROM_READ = false;
    return;
  }
  var st = document.getElementById('upstat');
  if (!st) return;
  var old = st.querySelector('.upaddrow');
  if (old) st.removeChild(old);
  /* 읽기 실패로 요약이 지워졌다가 카드로 돌아온 경우 같은 요약을 되살린다 */
  if (UP && st.innerHTML) UP.__요약 = st.innerHTML;
  else if (UP && UP.__요약) st.innerHTML = UP.__요약;
  var row = el('div', 'upaddrow');
  var add = el('button', 'b upadd', '거래내역 추가하기');
  add.type = 'button';
  add.addEventListener('click', function () {
    useScreen('거래내역 추가하기');
    ADD_FROM_READ = true;
    var inp = /** @type {HTMLInputElement} */ (document.getElementById('upinput'));
    inp.value = ''; /* 같은 파일을 다시 고를 수 있게 비운다 */
    inp.click();
  });
  row.appendChild(add);
  st.appendChild(row);
}
/* [거래내역 추가하기]로 고른 파일이면 이미 읽은 계좌를 파일 목록에 먼저 올려둔다.
   startPending 이 PENDING 을 비운 뒤라, 그냥 두면 새 파일만 남고 읽은 거래가 사라진다.
   ★ 고르기를 취소하면 이 함수까지 오지 않는다. 카드와 읽은 거래는 그대로다 */
function addFromRead() {
  var on = ADD_FROM_READ;
  ADD_FROM_READ = false;
  if (!on || !UP || UP.demo || !UP.banks || !UP.banks.length || PENDING.length) return false;
  PENDING = UP.banks.slice();
  return true;
}
/* ★ 106차 ③. 읽은 자리로 화면을 옮긴다. 사장님이 찾아 내려가지 않게 한다.
   ★ 빈 칸에는 안 옮긴다 — 아무것도 안 쓴 자리로 내려가면 더 헷갈린다.
   ★ upShow 가 맨 위로 올린 뒤에 부른다. 순서가 거꾸로면 이 줄이 지워진다.
   ★ scrollIntoView 의 옵션 객체를 못 받는 브라우저가 있어 한 단 물러설 길을 둔다 */
function upFocus(id) {
  var e = document.getElementById(id);
  if (!e || !e.firstChild) return;
  try {
    e.scrollIntoView({ block: 'start', behavior: 'smooth' });
  } catch (x) {
    try {
      e.scrollIntoView(true);
    } catch (y) {}
  }
}

/* ── 62차 ②④ · 업종 고르기 화면 ─────────────────────────────
   파일을 고르기 전에 업종부터 묻는다. 항목·비율 줄·부르는 말이 업종마다 다르다.
   ★ 준비 중이어도 눌러서 그 업종으로 갈 수 있다 — 표시만 하는 것이다.
   ★ 아이콘은 data URI 로 박아 넣는다. A안이라 외부 URL 도 딴 파일도 없다 */
/* ── 62차 ① · 환영 카드 ──────────────────────────────────────
   스플래시가 아니다. 저절로 사라지지 않고, 버튼을 누르실 때까지 그 자리에 있다.
   ★ 저장된 분류가 하나도 없을 때만 나온다 — 한 곳이라도 정하시면 자연히 안 나온다.
     그래서 「닫았다」를 따로 저장할 것이 없다.
   ★ 「가계부」가 아니라 「월마감」이다. 하시던 일의 이름으로 부른다 */
/* ── 62-2차 ⑤ · 시작 화면 ────────────────────────────────────
   처음 오신 분께 남의 숫자가 첫인상이 되면 안 된다 —
   예시 대시보드가 통째로 깔리고 그 위에 환영 카드가 얹혀 있어서
   「뭐지 이거?」가 됐다.
   ★ 환영 카드와 타일 화면을 합쳐 시작 화면 하나로 만든다.
     환영 카드라는 별도 물건은 여기 흡수되어 사라진다.
   ★ 시작 화면에서는 예시 숫자가 한 글자도 안 보인다 —
     밑에 깔아두고 가리는 것이 아니라 예시 화면 자체를 감춘다.
   ★ 62차에 만든 문구·타일·아이콘·「준비 중」·간격·모서리를 그대로 쓴다 (49차) */
/* ── 63-13 · 앱을 열면 언제나 시작 화면부터 ────────────────────
   62-2차에는 「분류가 한 곳이라도 저장돼 있으면 시작 화면을 건너뛴다」였다.
   그래서 두 번째로 오신 분은 남의 숫자(예시 사업장)를 첫 화면으로 보셨고,
   업종 타일은 [내 거래내역 올려보기] 안에 숨어 있었다.
   ★ 이제 저장이 있든 없든 시작 화면부터다. 돌아오신 분께는
     타일 위에 「이어서 보기」 구역을 놓아 자기 매장으로 가는 길을 만든다.
   ★ 112차 ④. 「지난번에 올리신 파일이 사라졌습니다」 안내를 그리던 함수는 지웠다 —
     45차에 만들고 63-13 에 자리를 옮긴 뒤로 부르는 곳이 없는 채 60줄이 남아 있었다.
     그 말이 필요한 자리는 goSavedStore 하나이고, 거기서는 112차 ③의 매장 머리가 대신한다 */
/* 이 브라우저에 저장된 매장들 — 최근 저장한 순, 같으면 많이 정해두신 순
   ★ 93차. 분류(fc.picks)만 훑어서, 올려서 결과만 보고 분류를 안 하신 매장은
     「이어서 보기」에 안 떴다 — 거래내역(fc.data)이 남아 있는데도 다시 올리라고 했다.
     거래내역이 남은 매장도 넣는다 (dataDay 가 붙어 있다).
   ★ savedSummary() 는 안 건드린다 — 내보내기·세는 곳이 그것을 쓴다.
     여기서 넣는 것은 목록에 이름을 띄우는 것뿐이고 금액은 한 푼도 안 옮긴다 */
function savedStores() {
  var list;
  try {
    list = savedSummary().keys.slice();
  } catch (e) {
    return [];
  }
  try {
    var have = {};
    list.forEach(function (k) {
      have[k.name] = k;
    });
    var 저장열쇠 = lsKeys();
    for (var i = 0; i < 저장열쇠.length; i++) {
      var dk = 저장열쇠[i];
      if (!dk || dk.indexOf(DATA_KEY) !== 0) continue;
      var name = dk.slice(DATA_KEY.length);
      var o = loadData(name); /* 모양이 아니면 눌러도 못 여니 안 띄운다 */
      if (!o) continue;
      if (have[name]) {
        have[name].day = o.저장일 || '';
        continue;
      }
      var k = { key: storeKey(name), name: name, n: 0, day: o.저장일 || '' };
      have[name] = k;
      list.push(k);
    }
  } catch (e) {} /* 거래내역을 못 훑어도 분류 매장은 그대로 띄운다 */
  return list.sort(function (a, b) {
    var da = a.day || '',
      db = b.day || '';
    if (da !== db) return da < db ? 1 : -1;
    return b.n - a.n;
  });
}
/* 예시 화면(대시보드·머리말·올려보기 버튼)을 통째로 감추거나 되돌린다 */
function showDemoBehind(on) {
  /* ★ 90차 ①. 「전체보기」(topimage)도 이 목록에 든다.
     이 단추는 결과 화면(up-result)에 딸린 것이다 — 결과를 그리는 코드가
     save.hidden = false 로 풀어 놓는데, 시작 화면(drawStart)이 결과를 도로 감출 때
     이 단추만 빠져 있었다. 그래서 자료를 하나도 안 올린 첫 화면 오른쪽 위에
     「전체보기」가 떠 있었고, 누르면 남의 가게 예시 결과가 통째로 열렸다.
     ★ 새 잣대는 안 만든다 — upShow 의 「결과 화면일 때만 보인다」와 같은 말이다.
       결과와 같은 자리에서 함께 여닫으면 판단하는 곳이 늘지 않는다.
     ★ drawStart 에 한 줄만 넣지 않은 이유 — 「예시 먼저 보기」(leaveStart)는
       결과를 다시 그리지 않고 감춰둔 것을 도로 펼 뿐이라, 감추기만 하면
       예시 결과 화면에서 이 단추가 영영 안 돌아온다 (요청서 ② 「이건 맞다」) */
  ['a2hs-top', 'up-result', 'applinks', 'topimage'].forEach(function (id) {
    var e = document.getElementById(id);
    if (e) e.hidden = !on;
  });
  /* 실제 거래내역 화면에서 공통 닫기 동작이 예시 안내까지 되살리면 안 된다.
     이 안내는 「예시 먼저 보기」로 만든 자료에서만 보인다. */
  var demoNote = document.getElementById('demotop');
  if (demoNote) demoNote.hidden = !(on && UP && UP.demo);
  var b = document.getElementById('upopen');
  if (b) b.hidden = !on;
}
function drawStart() {
  var host = document.getElementById('welcome');
  if (!host) return;
  /* ★ 112차 ③. 매장 고르는 화면으로 돌아왔다 — 붙들어 뒀던 매장을 놓는다.
     안 놓으면 다음에 올려보기를 열 때 지난 매장 머리가 그대로 서 있다 */
  PICKED_STORE = null;
  host.innerHTML = '';
  host.hidden = false;
  showDemoBehind(false); /* 예시 숫자가 한 글자도 안 보이게 */

  var box = el('div', 'startcard');
  /* ★ 71차 ③. 로고를 눌러 여기로 오실 수 있게 됐다. 그러면 돌아갈 길도 있어야 한다.
     ★ 열어둔 결과가 있을 때만 나온다. 실수로 누르셔도 한 번에 되돌아온다.
     ★ 올려둔 파일도 계산 결과도 안 버린다 — 버리면 돌아갈 곳이 없다.
       그래서 UP 은 그대로 두고 창만 여닫는다 (지우는 것은 「지우기」뿐이다) */
  /* ★ 100차 ②. 거래처 확인 전(매장 이름·성함 화면)에도 돌아올 수 있어야 한다.
     그때는 UP.payees 가 아직 없고 UP.rows 만 있다 */
  if (UP && !UP.demo && (UP.payees || (UP.rows && UP.rows.length))) {
    var 되돌 = el('button', 'b on backview', '보던 화면으로 돌아가기');
    되돌.type = 'button';
    되돌.addEventListener('click', function () {
      host.hidden = true;
      openUpPanel();
    });
    box.appendChild(되돌);
  } else if (UP && UP.demo && MY_UP) {
    /* ★ 119차. 예시를 보기 전에 보던 내 자료가 메모리에 있으면 돌아갈 길을 둔다.
       저장에 실패해 아래 매장 목록에 없는 자료도 여기로는 돌아간다 (새로고침 뒤는 아니다) */
    var 내결과 = el('button', 'b on backview', '내 결과로 돌아가기');
    내결과.type = 'button';
    내결과.addEventListener('click', function () {
      useScreen('내 결과로 돌아가기');
      restoreMyUp();
    });
    box.appendChild(내결과);
  }
  var mine = savedStores();
  /* ★ 64-5차. 📗 대신 브랜드 마크를 둔다. 자리도 크기도 그대로다 (요청서 4·6) */
  var wmk = document.createElement('img');
  wmk.className = 'welmark';
  wmk.src = BRAND_MARK;
  wmk.alt = '';
  box.appendChild(wmk);
  /* ★ 119차 문구 보정. 시간(10분)과 거래처 수(20곳)를 약속하지 않는다 */
  box.appendChild(el('div', 'welbig', '이번 달 번 돈과 쓴 돈을 확인하세요'));
  box.appendChild(el('div', 'welsub', '거래내역 파일을 불러오고, 거래처의 용도를 정해주세요'));

  /* 안심 고지는 새로 쓰지 않고 이미 있는 것을 그대로 옮겨 온다 (49차)
     ★ NAM-9. 「보내지 않습니다」는 파일 선택 단추 아래(.upsafe)로 옮겼다 —
       그 줄을 먼저, 이 기기에 남는 것(.upnote)을 뒤에 붙여 예전과 같은 차례로 둔다 */
  ['#up .upsafe', '#up .upnote'].forEach(function (sel) {
    var note = document.querySelector(sel);
    if (!note) return;
    var copy = el('div', 'upnote');
    copy.innerHTML = note.innerHTML;
    box.appendChild(copy);
  });

  /* ★ 63-13. 돌아오신 분이 먼저 볼 것은 자기 매장이다. 타일 위에 둔다.
     처음 오신 분(저장 0)께는 이 구역이 아예 없다 — 62-2차 그대로다 */
  if (mine.length) {
    box.appendChild(el('div', 'tradehead', '전에 하시던 것'));
    var back = el('div', 'gostores');
    mine.forEach(function (k) {
      var 이름 = k.name === '(기본)' ? '이름 없이 정해둔 것' : k.name;
      /* ★ 64-1. 여기에도 지우기를 둔다 — 매장 이름 화면(askName)에는 있는데
         시작 화면에는 없어서, 시험 삼아 만든 매장을 지울 길이 이 화면엔 없었다.
         모양과 자리 톤은 askName 의 것을 그대로 쓴다 (49차) */
      var line = el('div', 'gsline');
      var b = el('button', 'gostore');
      b.type = 'button';
      b.appendChild(el('span', 'gsname', '〈' + 이름 + '〉 이어서 보기'));
      b.appendChild(
        el('span', 'gssub', k.n ? '거래처 ' + won(k.n) + '곳 정해두심' : '거래내역 저장됨')
      );
      b.addEventListener('click', function () {
        goSavedStore(k);
      });
      line.appendChild(b);
      /* ★ 115차. [지우기]를 「마지막 분석」 칸보다 먼저 붙인다.
         .gsrun 이 flex:1 0 100% 라 한 줄을 통째로 차지한다 —
         그 뒤에 붙이면 지우기가 셋째 줄 맨 왼쪽으로 밀렸다
         (서래마을 실측: 이어서 보기 top 462 · 마지막 분석 top 542 · 지우기 top 622 left 30).
         ★ 64-1 이 적어둔 뜻(「이어서 보기 + 지우기」 한 줄, 그 아래 마지막 분석 칸)은
           처음부터 이것이었다. CSS 는 맞았고 붙이는 차례가 반대였다.
         ★ CSS 에 order 를 주는 길도 있지만, 붙이는 차례를 보이는 차례와 맞추는 쪽이
           나중에 읽기 쉽다 — 눈에 보이는 순서와 코드 순서가 같아진다 */
      var del = el('button', 'oslink', '지우기');
      del.type = 'button';
      var ask = el('div', 'saveask');
      ask.hidden = true;
      del.addEventListener('click', function () {
        ask.hidden = !ask.hidden;
      });
      line.appendChild(del);
      /* ★ 105차 ④. 마지막으로 분석한 날과 그 뒤로 지난 날수.
         ★ 윗줄은 상태고, 아랫줄과 단추는 고르실 수 있는 행동이다. 요구가 아니다 —
           그래서 상태와 행동을 한 문장에 섞지 않는다.
         ★ 「최신 거래내역을 올려보시겠어요?」는 안 쓴다. 어제 분석하신 대표님께 그 문장이
           뜨면 「어제 올린 걸로는 부족한가?」로 읽힌다. 날짜가 사실인 것과
           재업로드가 필요한 것은 다르다.
         ★ 날수에 경계를 두지 않는다. 7일이든 14일이든 근거가 없는 숫자였다 —
           날짜와 날수는 사실이라 언제 보여줘도 거짓이 아니다. 1일만 지나도 같은 모양이다.
           재촉이 되지 않게 하는 것은 경계가 아니라 문장이 한다.
         ★ 경고색도 팝업도 안 쓴다. 금액도 안 쓴다 (마스터 ■2-1 #4) */
      /* ★ 111차 ⑦. nd_lastrun 이 없으면 이 줄을 아예 안 그린다.
         105차 이전에 저장된 매장은 분석 완료일이 없어 저장일이 대신 나왔다 —
         이름은 「마지막 분석」인데 값은 저장한 날이라 틀린 말이었다.
         저장일을 보여줄 다른 까닭이 없으므로 새 설명을 만들지 않는다.
         다시 분석하시면 그때부터 실제 분석 완료일이 나온다 */
      /* ★ 115-1차. 기록 유무를 같은 자리에서 말한다.
         전에는 기록이 없으면 줄을 아예 안 그려서, 매장이 여럿일 때
         「왜 하나만 보이지?」로 읽혔다 (요한 제보 2026-09-21).
         ★ 이름을 「최근 거래내역 추가」로 바꾼다 — 실제로 찍히는 것은
           새 거래내역이 늘어난 날이지 화면을 본 날이 아니다 (markLastRun 의 __새거래).
           「이어서 보기」로 열거나 같은 파일을 다시 올려서는 안 찍힌다.
         ★ 저장 열쇠 nd_lastrun 은 안 바꾼다. 저장값을 새 뜻으로 옮기거나
           없는 날짜를 지어내지 않는다.
         ★ 목록에서는 경과 일수를 생략한다 — 짧아야 목록이 읽힌다.
         ★ 「기록 없음」을 「거래내역이 없다」는 뜻으로 쓰지 않는다.
           거래처 분류도 거래내역도 살아 있고, 없는 것은 이 기록 하나뿐이다.
         ★ 경고색·아이콘·덧붙이는 설명을 안 넣는다 */
      var 분석날 = lastRunDay(k.name) || '';
      var run = el('div', 'gsrun');
      run.appendChild(
        el(
          'div',
          'gsrunday',
          '최근 거래내역 추가: ' +
            (분석날
              ? daysSince(분석날) === 0
                ? '오늘'
                : +분석날.slice(5, 7) + '월 ' + +분석날.slice(8, 10) + '일'
              : '기록 없음')
        )
      );
      if (분석날) {
        run.appendChild(el('div', 'gsrunsub', '새로운 거래내역이 있으면 추가할 수 있습니다.'));
        var 추가 = el('button', 'oslink gsrunbtn', '거래내역 추가');
        추가.type = 'button';
        추가.addEventListener('click', function () {
          goSavedStore(k);
          try {
            openAddFiles();
          } catch (e) {}
        });
        run.appendChild(추가);
      }
      line.appendChild(run); /* ★ 115차. 지우기 뒤에 붙는다 — 아랫줄로 간다 */
      back.appendChild(line);
      /* ★ 실수로 146곳짜리를 날리면 되돌릴 길이 없다. 먼저 묻는다 */
      ask.appendChild(
        el(
          'div',
          'addq',
          '「' +
            이름 +
            '」을 지울까요? ' +
            (k.n ? '정하신 거래처 ' + won(k.n) + '곳이' : '저장된 거래내역이') +
            ' 함께 지워집니다.'
        )
      );
      var arow = el('div', 'addrow');
      var yes = el('button', 'b on', '지우기');
      yes.type = 'button';
      yes.addEventListener('click', function () {
        /* 지우는 것은 이 매장뿐이다. 다른 매장은 안 건드린다.
           ★ 91차 ④. 거래내역(fc.data)도 같이 지운다 — 한 번 누르면 깨끗이 사라져야 한다.
             분류만 지우고 거래내역을 두면 다음에 열 때 그것이 도로 살아난다 */
        lsDel(k.key);
        delData(k.name);
        drawStart();
      });
      var no = el('button', 'b', '취소');
      no.type = 'button';
      no.addEventListener('click', function () {
        ask.hidden = true;
      });
      arow.appendChild(yes);
      arow.appendChild(no);
      ask.appendChild(arow);
      back.appendChild(ask);
    });
    box.appendChild(back);
  }

  /* 폰에서만 보이는 작은 보조 단추. 시작의 주 행동은 업종 선택이다. */
  if (installCase()) {
    var inst = el('button', 'instcorner', '홈 화면 추가');
    inst.type = 'button';
    var instbody = el('div', 'instcornerbody');
    instbody.hidden = true;
    inst.addEventListener('click', function () {
      instbody.hidden = !instbody.hidden;
      if (!instbody.hidden && !instbody.firstChild) instbody.appendChild(drawInstallTip());
    });
    box.appendChild(inst);
    box.appendChild(instbody);
  }

  box.appendChild(
    el('div', 'tradehead', mine.length ? '새로 불러오기' : '어떤 곳의 거래내역인가요?')
  );
  box.appendChild(
    el(
      'div',
      'tradesub',
      '고르시면 그 곳에 맞는 항목으로 시작합니다. 나중에 항목 관리에서 고치실 수 있습니다.'
    )
  );
  box.appendChild(tradeTiles());

  /* ★ 64-2차 3. 밑줄 글자라 묻혔다. 박스 단추로 올린다 —
     타일(주 행동)보다는 약한 무게로. 기존 파랑(--now 계열)과 기존 radius 다 */
  var see = el('button', 'demobtn startdemo', '예시 먼저 보기');
  see.type = 'button';
  see.addEventListener('click', function () {
    useScreen('예시 먼저 보기');
    /* ★ 119차. 예시 전환 보정 — 예시는 앱을 열 때 한 번만 세워 두고 여기서는 뒤를 드러내기만 했다.
       그래서 내 매장을 본 뒤 누르면 UP 에 남은 내 매장이 그대로 나왔다.
       내 매장이면 그 자료를 메모리에 맡겨 두고(MY_UP) 예시를 새로 세운다.
       저장통은 건드리지 않는다 — 예시는 저장하지 않는다 (savePicks·planSave 가 예시면 안 쓴다) */
    if (UP && !UP.demo) {
      if (UP.holdAsk) holdAskEnd(false);
      MY_UP = UP;
      startDemo();
    }
    leaveStart();
    window.scrollTo(0, 0);
  });
  box.appendChild(see);
  host.appendChild(box);
  window.scrollTo(0, 0);
}
/* ★ 119차. 예시 전환 보정 — 예시로 가기 전에 보던 내 매장 자료 (메모리에만 둔다).
   같은 매장을 「이어서 보기」로 다시 열면 이것을 그대로 되돌린다 — 저장하지 못한 변경도 잃지 않는다.
   다른 매장을 열거나 새 파일을 올리면 비운다 */
var MY_UP = null;
/* 맡겨 둔 내 자료를 그대로 되돌린다 — 거래내역·분류·예정 지출·선택 월·종료일이 UP 에 함께 있다.
   저장통은 읽지도 쓰지도 않는다 (저장 실패를 성공으로 바꾸지 않는다) */
function restoreMyUp() {
  if (!MY_UP) return false;
  UP = MY_UP;
  MY_UP = null;
  if (UP.trade && TRADES[UP.trade]) setTrade(UP.trade);
  leaveStart();
  showResult();
  return true;
}
/* 시작 화면을 접고 그 뒤(예시·결과)를 되살린다 */
function leaveStart() {
  var host = document.getElementById('welcome');
  if (host) {
    host.hidden = true;
    host.innerHTML = '';
  }
  showDemoBehind(true);
}
/* ★ 63-13. 「이어서 보기」 — 그 매장을 열고, 파일이 사라졌다는 안내를 여기서 한다.
   같은 계좌 파일을 다시 올리시면 63-1 이 그 매장으로 되살린다 */
function goSavedStore(k) {
  useScreen('이어서 보기');
  /* ★ 119차. 예시 전환 보정 — 예시로 가기 전에 보던 그 매장이면 맡겨 둔 자료를 그대로 되돌린다 */
  var 이름 = k.name === '(기본)' ? null : k.name;
  if (MY_UP && (MY_UP.store || null) === 이름) {
    restoreMyUp();
    return;
  }
  MY_UP = null;
  var saved = loadPicks(k.name === '(기본)' ? null : k.name);
  if (saved && saved.업종 && TRADES[saved.업종]) setTrade(saved.업종);
  leaveStart();
  /* ★ 91차 ②. 거래내역이 이 기기에 남아 있으면 파일을 다시 안 올려도 된다.
     「사라졌습니다」는 정말 사라졌을 때만 할 말이다 — 남아 있으면 바로 보여드린다 */
  if (openSavedData(k.name)) {
    PICKED_STORE = null;
    return;
  }
  /* ★ 112차 ③. 여기서부터는 파일을 올려야 이어진다.
     고르신 매장을 붙들어 둔다 — drawUpMine 이 같은 목록을 또 그리지 않고
     이 매장 이름·안내·파일 고르기를 맨 위에 세운다 */
  PICKED_STORE = k;
  /* ★ 106차 ①. 저장된 거래내역이 없으면 그 사실을 「보이는 화면」에 적는다.
     안내가 감춰진 자리에 남으면 사장님께는 아무 일도 안 일어난 것으로 보인다.
     ★ 「사라졌습니다」로 시작하지 않는다 — 거래처 분류는 살아 있다.
       잃은 것은 거래내역 파일 하나뿐이고, 그 사실만 적는다 (91차 ②의 원칙 그대로).
     ★ 이 매장으로 업종·이름이 이미 세팅돼 있다. 파일만 올리면 바로 이어진다.
     ★ 글자는 DOM 으로 붙인다 — 매장 이름이 그대로 innerHTML 에 들어가지 않게 한다 */
  /* ★ 112차 ③. 안내는 #upstat(파일 고르기 아래)이 아니라 맨 위 매장 머리에 선다.
     upstat 은 폰에서 화면 하나를 내려야 보이는 자리였다 (106차 ①이 여기로 옮겼지만
     그때도 같은 목록이 위에 그대로 남아 있어 「안 눌린다」가 남았다) */
  openUpPanel();
  openPick();
  drawA2HS();
  loadSheetJS().catch(function (e) {
    upStat('<b>' + escHtml(e.message) + '</b>');
  });
}
/* 예시를 보다가 「내 거래내역 올려보기」를 누르면 시작 화면으로 돌아온다 */
function backToStart() {
  closeUpPanel();
  drawStart();
  return true;
}

/* ── 63-12 · 홈 화면에 추가 ────────────────────────────────────
   ★ 13차에 있던 설치 안내는 업로드 화면 안(#a2hs)에 있다. 그 장치를 그대로 쓴다 —
     크롬이 beforeinstallprompt 를 주면 [설치] 단추를 띄우고, 아니면 방법을 적는다.
   ★ 여기서는 시작 화면에 맞게 한 줄 + 펼침으로만 감싼다 (49차) */
function drawInstallTip() {
  var wrap = el('div', 'insttip');
  /* ★ 64-2차 2. 이미 홈 화면 앱 안에서 열고 계시면 이 상자는 아예 없다 */
  if (isStandalone()) return wrap;
  var kind = inAppKind();
  var box = el('div', 'instcard');
  if (kind) {
    /* ★ 카톡 안에서는 설치가 안 된다. 크롬으로 나가는 것이 먼저다 —
       두 안내를 같이 띄우면 어느 것부터 할지 모르신다 */
    var ios = isIOS();
    var br = ios ? '사파리' : '크롬';
    box.appendChild(el('div', 'instbig', br + ro(br) + ' 먼저 열어주세요'));
    box.appendChild(
      el(
        'div',
        'instsub',
        '카톡 안에서 정하시면 다음에 안 남습니다. ' + br + ro(br) + ' 여시면 그대로 이어집니다.'
      )
    );
    if (!ios && isAndroid()) {
      var go2 = el('button', 'b on', '크롬으로 열기');
      go2.type = 'button';
      go2.addEventListener('click', function () {
        var u = location.href.replace(/^https?:\/\//, '');
        location.href =
          'intent://' +
          u +
          '#Intent;scheme=' +
          location.protocol.replace(':', '') +
          ';package=com.android.chrome;end';
      });
      box.appendChild(go2);
    }
    box.appendChild(
      el(
        'div',
        'instwhy',
        ios
          ? '오른쪽 아래 [⋯] → 「Safari로 열기」'
          : '오른쪽 위 메뉴 → 「다른 브라우저로 열기」 → Chrome'
      )
    );
    wrap.appendChild(box);
    return wrap;
  }
  box.appendChild(el('div', 'instbig', '먼저 홈 화면에 추가하고 시작하세요'));
  box.appendChild(el('div', 'instsub', '앱처럼 열 수 있고, 분류하신 항목이 이 앱에 남습니다.'));
  /* ★ 64-4차 1. 크롬 메뉴 이름이 판마다 다르다. 둘 다 적는다 —
     하나만 적으면 그 이름이 없는 판에서는 못 찾으신다.
     ★ 「설치 및 바로가기 만들기」의 「설치」는 화면 금지어지만,
       여기는 크롬 메뉴 이름을 따옴표로 그대로 인용하는 자리다.
       우리가 쓰는 말이 아니라 크롬이 화면에 쓴 글자라 바꾸면 못 찾으신다.
       검사 5 는 이 글자만 예외로 둔다 (mask.ps1 에 예전부터 적혀 있다) */
  var 손안내 = isIOS()
    ? '아이폰 사파리 — 아래 공유 단추(□↑) → 「홈 화면에 추가」'
    : '크롬(안드로이드) — 오른쪽 위 ⋮ → 「홈 화면에 추가」 또는 「설치 및 바로가기 만들기」';
  /* ★ 64-4차 2. 크롬이 프롬프트를 줬으면 단추가 주된 길이다 —
     탭 한 번이면 끝나는데 메뉴를 찾아 들어가시게 두면 안 된다.
     손으로 하는 방법은 「단추가 안 보이면」으로 접어 예비로 둔다 */
  if (INSTALL_EVT) {
    /* 「설치」는 화면 금지어다 (검사 5) — 앱이 이미 쓰는 말로 맞춘다 (49차) */
    var go = el('button', 'b on instgo', '홈 화면에 추가');
    go.type = 'button';
    go.addEventListener('click', function () {
      var e = INSTALL_EVT;
      INSTALL_EVT = null;
      e.prompt();
    });
    box.appendChild(go);
    var 접기 = el('button', 'oblink instfold', '단추가 안 보이면 ▾');
    접기.type = 'button';
    var 예비 = el('div', 'instwhy');
    예비.hidden = true;
    예비.textContent = 손안내;
    접기.addEventListener('click', function () {
      예비.hidden = !예비.hidden;
    });
    box.appendChild(접기);
    box.appendChild(예비);
  } else {
    box.appendChild(el('div', 'instwhy', 손안내));
  }
  wrap.appendChild(box);
  return wrap;
}

/* ★ 62-2차 ⑤. 환영 카드(drawWelcome)를 걷어냈다 — 시작 화면에 흡수됐다.
   따로 두면 예시 대시보드 위에 얹히는 그 모양이 되살아난다 */

function openTrade() {
  /* ★ 112차 ③. 업종부터 고르는 길은 「이 매장을 이어서」가 아니다 */
  PICKED_STORE = null;
  document.getElementById('uptitle').textContent = '어떤 곳인가요';
  var host = document.getElementById('up-trade');
  host.innerHTML = '';
  host.appendChild(el('div', 'tradehead', '어떤 곳의 거래내역인가요?'));
  host.appendChild(
    el(
      'div',
      'tradesub',
      '고르시면 그 곳에 맞는 항목으로 시작합니다. 나중에 항목 관리에서 고치실 수 있습니다.'
    )
  );
  host.appendChild(tradeTiles());
  upShow('up-trade');
}
/* ★ 62-2차 ⑤. 타일 넷은 시작 화면과 업종 화면이 같은 것을 쓴다 —
   두 벌로 만들면 한쪽만 고쳐지는 날이 온다 (49차) */
function tradeTiles() {
  var grid = el('div', 'tiles');
  TRADE_ORDER.forEach(function (name) {
    var t = TRADES[name];
    var b = el('button', 'tile');
    b.type = 'button';
    var img = document.createElement('img');
    img.src = TRADE_ICON[name];
    img.alt = '';
    b.appendChild(img);
    b.appendChild(el('div', 'tilename', name));
    /* 식당에는 아무 표시가 없다 */
    if (t.준비중) b.appendChild(el('div', 'tilesoon', '준비 중'));
    b.addEventListener('click', function () {
      pickTrade(name);
    });
    grid.appendChild(b);
  });
  return grid;
}
/* 업종을 고르면 부르는 말이 바뀌고, 파일 고르기로 넘어간다 */
function pickTrade(name) {
  setTrade(name);
  useScreen('업종 고르기');
  /* ★ 62-2차 ⑤. 시작 화면에서 눌렀을 수도 있다 — 창을 열어 파일 고르기로 */
  leaveStart();
  openUpPanel();
  openPick();
  drawA2HS();
  loadSheetJS().catch(function (e) {
    upStat('<b>' + escHtml(e.message) + '</b>');
  });
}
/* ★ 62차 ②. 업종별 고지 — 예시는 식당 자료로 만든 것이다.
   ★ 치과·병원에는 한 줄 더. 원장님 통화에서 확인된 한계다 */
function tradeNotice(host) {
  var name = tradeNow();
  if (name === TRADE_DEFAULT) return;
  var t = TRADES[name];
  var box = el('div', 'upmust');
  box.appendChild(
    el(
      'div',
      null,
      '예시는 식당 자료로 만든 것입니다. 파일을 불러오면 ' + name + ' 항목으로 나옵니다.'
    )
  );
  if (t.카드고지) {
    box.appendChild(
      el(
        'div',
        null,
        '카드로 결제하신 지출은 카드 대금 한 줄로만 잡힙니다. 세부 내용은 나뉘지 않습니다.'
      )
    );
  }
  host.appendChild(box);
}

/* ★ 100차 ①. 업종을 고르고 여기까지 오신 분께도 자기 매장으로 가는 길을 둔다.
   시작 화면에만 있어서, 업종부터 누르신 분은 파일을 다시 올려야 하는 줄 아셨다.
   ★ 새 모양을 만들지 않는다 — 시작 화면의 .gostores/.gostore 를 그대로 쓴다 (49차).
   ★ 여기에는 「지우기」를 안 붙인다. 지우는 자리는 시작 화면과 매장 이름 화면 둘로 충분하고,
     파일을 올리기 직전에 지우기 단추가 옆에 있으면 잘못 누르실 수 있다.
   ★ 저장된 매장이 없으면 이 구역은 아예 안 생긴다 (처음 오신 분께는 없다) */
/* ── 112차 ③ · 매장을 고르면 그 매장에 집중한다 ──────────────────────
   「이어서 보기」를 눌러도 같은 매장 목록이 또 그려졌다. 안내는 그 아래
   955px 지점(폰 높이 844px)이라 화면 밖이었고, 그래서 「아무 일도 안 일어났다」로 보였다.
   요한이 매장 다섯에서 직접 겪으셨다.
   ★ 자동 스크롤로 풀지 않는다 — 왜 화면이 움직였는지 알기 어렵다.
     보여야 할 것을 맨 위로 올리고, 안 볼 것(같은 목록)을 치운다.
   ★ 목록이 사라지므로 매장이 다섯이든 스물이든 첫 화면 높이가 같다 */
var PICKED_STORE = null;
var UPDROP_HOME = null; /* #updrop 의 제자리. 처음 한 번만 재 둔다 */
/* 파일 고르는 자리를 고른 매장 바로 아래로 올린다. 안 고르셨으면 제자리로 되돌린다.
   ★ 자바스크립트는 id 로만 찾으니 차례가 바뀌어도 아무 데도 안 깨진다 (49차·106차 ③) */
function updropAfter(afterEl) {
  var drop = document.getElementById('updrop');
  if (!drop || !drop.parentNode) return;
  if (!UPDROP_HOME) UPDROP_HOME = { parent: drop.parentNode, next: drop.nextSibling };
  var 부모 = afterEl ? afterEl.parentNode : UPDROP_HOME.parent;
  var 앞 = afterEl ? afterEl.nextSibling : UPDROP_HOME.next;
  if (!부모 || (drop.nextSibling === 앞 && drop.parentNode === 부모)) return;
  부모.insertBefore(drop, 앞);
}
function drawUpMine() {
  var host = document.getElementById('up-mine');
  if (!host) return;
  host.innerHTML = '';
  /* 고르신 매장이 있으면 그 매장 이름과 안내만 맨 위에 둔다. 목록은 안 그린다 */
  if (PICKED_STORE) {
    var k = PICKED_STORE;
    var 이름 = k.name === '(기본)' ? '이름 없이 정해둔 것' : k.name;
    var sbox = el('div', 'upstore');
    var shead = el('div', 'upstorehead');
    shead.appendChild(el('div', 'upstorename', 이름));
    var chg = el('button', 'upstorechg', '매장 변경');
    chg.type = 'button';
    chg.addEventListener('click', function () {
      useScreen('매장 변경');
      PICKED_STORE = null;
      closeUpPanel();
      drawStart(); /* 매장 고르는 화면으로 돌아간다 */
    });
    shead.appendChild(chg);
    sbox.appendChild(shead);
    sbox.appendChild(
      el(
        'div',
        'upstoresub',
        k.n
          ? '저장된 거래처 분류 ' + won(k.n) + '곳을 이어서 사용합니다.'
          : '이 매장에 정해두신 것을 이어서 사용합니다.'
      )
    );
    sbox.appendChild(el('div', 'upstoresub', '분석할 거래내역 파일을 선택해주세요.'));
    host.appendChild(sbox);
    updropAfter(host); /* 파일 고르는 자리를 바로 아래로 */
    drawImportStart(); /* ★ 119차. 불러오기 자리도 파일 고르는 자리를 따라간다 */
    return;
  }
  updropAfter(null); /* 제자리로 */
  drawImportStart(); /* ★ 119차 */
  var mine;
  try {
    mine = savedStores();
  } catch (e) {
    return;
  }
  if (!mine.length) return;
  host.appendChild(el('div', 'tradehead', '전에 하시던 것'));
  var back = el('div', 'gostores');
  mine.forEach(function (k) {
    var 이름 = k.name === '(기본)' ? '이름 없이 정해둔 것' : k.name;
    var b = el('button', 'gostore');
    b.type = 'button';
    b.appendChild(el('span', 'gsname', '〈' + 이름 + '〉 이어서 보기'));
    b.appendChild(
      el('span', 'gssub', k.n ? '거래처 ' + won(k.n) + '곳 정해두심' : '거래내역 저장됨')
    );
    b.addEventListener('click', function () {
      goSavedStore(k);
    });
    back.appendChild(b);
  });
  host.appendChild(back);
}

/* 창을 열 때마다 파일 고르기로 되돌린다.
   한 번 다음 단계로 넘어가면 up-pick 이 숨겨진 채로 남아,
   창을 닫았다 열어도 아무도 되살리지 않는다 */
function openPick() {
  document.getElementById('uptitle').textContent = '내 거래내역으로 확인하기';
  document.getElementById('upbad').innerHTML = ''; /* 지난 파일의 확인 카드 */
  upStat(''); /* 지난 파일의 안내문 */
  upReadState(false); /* ★ 119차 업로드 안내. 새로 고르는 화면이라 안내를 펼친다 */
  redrawBankHelp(); /* 46차 ① 은행별 안내 */
  /* ★ 62차 ②. 업종별 고지 — 예시는 식당 자료다 */
  var tn = document.getElementById('up-tradenote');
  if (tn) {
    tn.innerHTML = '';
    tradeNotice(tn);
  }
  drawUpMine(); /* ★ 100차 ①. 창을 열 때마다 최신 목록으로 */
  drawImportStart(); /* ★ 119차. 분류 파일 불러오기 */
  upShow('up-pick');
}

document.getElementById('upopen').addEventListener('click', function () {
  /* ★ 71차 ②. 이미 내 거래내역을 보고 계시면 이 단추는 「더 올리기」다.
     첫 화면으로 안 나간다 — 나가면 읽어둔 파일이 사라졌다 (그것이 이 단추의 버그였다) */
  if (openAddFiles()) return;
  /* ★ 63-13. 앱을 열면 늘 시작 화면부터다. 여기서도 그리로 돌아간다 */
  if (backToStart()) return;
  openUpPanel();
  /* ★ 62차 ②. 파일을 고르기 전에 업종부터 묻는다 */
  openTrade();
});

/* ★ 71차 ③. 로고를 누르면 첫 화면. 앱 어디서나 집으로 가는 길이다.
   ★ 올려둔 파일도 결과도 안 버린다 — 첫 화면 맨 위의
     「보던 화면으로 돌아가기」로 한 번에 되돌아오신다 (drawStart) */
(function () {
  var lg = document.getElementById('brandlogo');
  if (!lg) return;
  lg.style.cursor = 'pointer';
  lg.setAttribute('role', 'button');
  lg.tabIndex = 0;
  lg.setAttribute('title', '첫 화면으로');
  var 집 = function () {
    closeUpPanel();
    drawStart();
  };
  lg.addEventListener('click', 집);
  lg.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      집();
    }
  });
})();

/* ★ 100차 ②. 올려보기 창 안에도 같은 길을 둔다.
   ★ id 는 떼어낸다 — 같은 id 가 둘이면 getElementById 가 어느 것을 줄지 모른다.
   ★ 누르셔도 올려둔 파일과 결과는 안 버린다. 창만 닫는다 (71차 ③과 같은 규칙) */
(function () {
  var top = document.querySelector('#up .uptop');
  var src = document.getElementById('brandlogo');
  if (!top || !src) return;
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'uplogo';
  b.title = '첫 화면으로';
  b.setAttribute('aria-label', '첫 화면으로');
  var img = /** @type {HTMLImageElement} */ (src.cloneNode(true));
  img.removeAttribute('id');
  img.alt = '';
  b.appendChild(img);
  b.addEventListener('click', function () {
    closeUpPanel();
    drawStart();
  });
  top.insertBefore(b, top.firstChild);
})();
