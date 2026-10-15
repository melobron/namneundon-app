/* ── 88차 ① · 글씨 크기 세 단 ──────────────────────────────────────
   파일럿 1호 ○○ 대표: 「핸드폰으로 보면 텍스트가 너무 작다」.
   ★ 지금 화면이 가장 작은 단이다. 위로만 키운다 (개발자 확정) —
     1단 지금 그대로 · 2단 약 115% · 3단 약 130%.
   ★ 크기는 그 휴대폰에 남긴다. 매번 다시 키우게 하면 안 쓰신다.
   ★ 거래처 분류(fc.picks)와 통을 나눈다 —
     그쪽은 금액이 섞이면 안 되는 통이라 hasNumber 검사가 걸려 있는데,
     이건 금액이 아니라 설정값이다. 통을 나누면 그 검사도 옛 저장분도 안 건드린다
     (fc.a2hs.later · fc.breaks 와 같은 방식이다) */
/* 저장 이름 FONT_KEY 은 00-storage.js 에 모았다 */
var FONT_MIN = 1,
  FONT_MAX = 3;
var 글씨단 = FONT_MIN;

function 글씨단읽기() {
  var v = +lsGet(FONT_KEY);
  return v >= FONT_MIN && v <= FONT_MAX ? v : FONT_MIN;
}
/* 화면에 단을 입히고, 더 갈 데가 없는 단추를 흐리게 한다 */
function 글씨단그리기() {
  var b = document.body;
  b.classList.remove('fs2');
  b.classList.remove('fs3');
  if (글씨단 > FONT_MIN) b.classList.add('fs' + 글씨단);
  var 작게 = /** @type {HTMLButtonElement} */ (document.getElementById('fsdown'));
  var 크게 = /** @type {HTMLButtonElement} */ (document.getElementById('fsup'));
  if (작게) 작게.disabled = 글씨단 <= FONT_MIN;
  if (크게) 크게.disabled = 글씨단 >= FONT_MAX;
}
function 글씨단옮기기(걸음) {
  var n = Math.min(FONT_MAX, Math.max(FONT_MIN, 글씨단 + 걸음));
  if (n === 글씨단) return;
  글씨단 = n;
  lsSet(FONT_KEY, String(n));
  글씨단그리기();
}
(function () {
  글씨단 = 글씨단읽기();
  글씨단그리기();
  var 작게 = /** @type {HTMLButtonElement} */ (document.getElementById('fsdown'));
  var 크게 = /** @type {HTMLButtonElement} */ (document.getElementById('fsup'));
  if (작게)
    작게.addEventListener('click', function () {
      글씨단옮기기(-1);
    });
  if (크게)
    크게.addEventListener('click', function () {
      글씨단옮기기(1);
    });
})();

/* ── 63-9 · 저장되고 있다는 안심 ────────────────────────────────
   화면 맨 위에 늘 있다. 누르면 무엇이 남고 무엇이 안 남는지 한 번 더 말한다 —
   그 문장은 안심 고지와 똑같아야 한다 (49차 · 63-14) */
(function () {
  var chip = document.getElementById('savedchip');
  var why = document.getElementById('savedwhy');
  if (!chip || !why) return;
  chip.addEventListener('click', function () {
    if (!why.hidden) {
      why.hidden = true;
      return;
    }
    why.innerHTML = '';
    /* ★ 91차 ①. 이제 거래내역도 이 기기에 남는다. 안 남는다고 말하면 그게 거짓말이다 —
       안심 고지(upnote)와 같은 말이어야 한다 (49차 · 63-14) */
    why.appendChild(el('div', null, '거래내역은 이 기기 안에만 저장됩니다.'));
    /* ★ 105차 ④. 브라우저에 남는 것이 하나 늘었다 — 마지막으로 분석한 날짜다.
       서버로 가는 것은 여전히 없다 (앞 줄은 한 글자도 안 바뀐다) */
    /* ★ 116차 ⑪. 브라우저에 남는 것이 하나 늘었다 — 적어두신 예정 지출이다.
       서버로 가는 것은 여전히 없다 (앞 줄은 한 글자도 안 바뀐다) */
    why.appendChild(
      el(
        'div',
        null,
        BIZ.주인 +
          '이 분류하신 항목·적어두신 예정 지출과 마지막으로 분석한 날짜가 이 브라우저에 저장됩니다.'
      )
    );
    if (!LS_OK) why.appendChild(el('div', 'lswarn', LS_MSG));
    /* ★ 119차. 지금 보고 있는 매장의 분류를 여기서도 파일로 받을 수 있게 한다.
       항목 관리의 [내보내기]와 같은 exportPicks 를 쓴다 — 파일 모양·저장 방식은 그대로다.
       예시 화면과 결과가 없는 때에는 안 낸다. 「저장됨」 글자와 저장 상태는 건드리지 않는다 */
    if (UP && !UP.demo && UP.payees && UP.payees.length) {
      why.appendChild(
        el(
          'div',
          null,
          '분류 설정을 파일로 내려받습니다. 거래내역·예정 지출·직접 적은 금액은 포함되지 않습니다.'
        )
      );
      var dl = el('button', 'b dlpick', '분류 파일 다운로드'); /* ★ 119차. 전용 색 (.b.dlpick) */
      dl.type = 'button';
      dl.style.marginTop = '8px';
      dl.addEventListener('click', function (e) {
        e.stopPropagation();
        useScreen('분류 파일 다운로드');
        exportPicks();
      });
      why.appendChild(dl);
      /* ★ 119차. 휴대폰으로 옮기는 순서. 카톡에서 파일을 누르면 앱에 저절로 들어간다고 하지 않는다 */
      why.appendChild(
        el(
          'div',
          null,
          '카톡 ‘나에게 보내기’ 등으로 파일을 옮긴 뒤, 휴대폰에 저장하고 남는돈 첫 화면의 ‘분류 파일 불러오기’에서 선택해주세요.'
        )
      );
    }
    why.hidden = false;
  });
})();
function openUpPanel() {
  document.getElementById('up').classList.add('on');
  document.body.style.overflow = 'hidden';
  /* ★ 64-10. 정하다가 스크롤을 내리면 예시 사업장 숫자가 그대로 나왔다.
     덮는 것으로는 모자란다 — 글자(innerText)에도 남아 검사까지 오염시킨다.
     62-2차 ⑤에서 시작 화면에 한 것과 같은 방법으로 아예 감춘다 */
  showDemoBehind(false);
}
/* ★ 111차 ③. 「분석이 끝난 내 결과」가 있는가 — 단추 이름과 목적지가 같이 본다.
   파일을 올린 것만으로는 아니다. 거래처 확인까지 끝나 결과가 그려진 판이어야 한다 */
function 내결과있나() {
  return !!(UP && !UP.demo && UP.payees && UP.rows && UP.rows.length);
}
function closeUpPanel() {
  /* ★ 119차. 보류 원인 경로 중에 머리의 [내 결과로 돌아가기]를 누르셨으면
     원래 물음 차례로 되돌리고 결과(예상 잔액 카드)로 간다 — 원인 차례가 남지 않게 한다.
     holdAskEnd 가 부르는 showResult 가 다시 여기로 오지만 그때는 holdAsk 가 비어 있다 */
  if (UP && UP.holdAsk) {
    holdAskEnd(true);
    return;
  }
  document.getElementById('up').classList.remove('on');
  document.body.style.overflow = '';
  /* ★ 111차 ③. 나가는 곳을 이름과 맞춘다.
     예전에는 늘 showDemoBehind(true) 라, 「← 첫 화면으로」가 남의 가게 예시 숫자가
     뜨는 화면으로 갔다 — 내 자료가 사라진 줄 아신다.
     ★ 예시 사업장은 일부러 「예시 보기」를 누를 때만 연다 */
  if (내결과있나()) {
    var w0 = document.getElementById('welcome');
    if (w0) w0.hidden = true;
    showDemoBehind(true); /* 내 결과 화면을 되살린다 */
    var r0 = document.getElementById('up-result');
    if (r0) r0.hidden = false;
    syncUpOpen();
    return;
  }
  /* 시작 화면을 보고 계신 중이면 그대로 둔다 — 거기서도 예시는 안 보여야 한다 */
  var w = document.getElementById('welcome');
  if (!w || w.hidden) {
    try {
      drawStart();
    } catch (e) {}
  }
  syncUpOpen();
}
/* ★ 119차. 예시 전환 보정 — 올려보기 창만 닫고 결과를 드러낸다. 시작 화면은 비우고 감춘다.
   (머리의 「← 첫 화면으로」는 지금처럼 closeUpPanel 을 쓴다 — 거기는 시작 화면으로 가는 길이다) */
function closePanelToResult() {
  document.getElementById('up').classList.remove('on');
  document.body.style.overflow = '';
  var w0 = document.getElementById('welcome');
  if (w0) {
    w0.hidden = true;
    w0.innerHTML = '';
  }
  showDemoBehind(true);
  syncUpOpen();
}
/* ★ 64-8. 이미 내 거래내역을 보고 있는데 오른쪽 위에 「내 거래내역 올려보기」가
   계속 떠 있었다. 문맥에 맞는 말로 바꾼다 — 예시를 보고 있을 때만 「올려보기」다 */
function syncUpOpen() {
  var b = document.getElementById('upopen');
  if (!b) return;
  var 내것 = !!(UP && !UP.demo && UP.payees);
  b.textContent = 내것 ? '거래내역 추가하기' : '내 거래내역으로 확인하기';
}
document.getElementById('upclose').addEventListener('click', closeUpPanel);

/* ★ 74차. 긴 보안 고지는 기본으로 접고, 필요할 때만 같은 자리에서 펼친다. */
(function () {
  var b = document.getElementById('upinfobtn');
  var n = document.getElementById('upnote');
  if (!b || !n) return;
  b.addEventListener('click', function () {
    var open = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', open ? 'false' : 'true');
    n.hidden = open;
  });
})();

/* ── 폰 화면에 아이콘 만들기 ──
   겉모습이 아니라 저장 때문이다. 사파리는 7일 쓰지 않으면 저장을 지우는데,
   홈 화면에 넣으면 그 규칙에서 빠진다.
   그리고 홈 화면 앱은 저장소가 따로라, 거래처를 찍기 전에 만들어야 한다 */
/* 저장 이름 A2HS_KEY 은 00-storage.js 에 모았다 */
var INSTALL_EVT = null;

window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  INSTALL_EVT = e;
  drawA2HS();
  /* ★ 64-4차 2. 이 신호는 화면을 다 그린 뒤에 늦게 오기도 한다.
     그때 상자를 다시 안 그리면 단추가 영영 안 나타나고,
     안드로이드 크롬의 기본 길인 「탭 한 번」이 막힌다 */
  try {
    refreshInstallTip();
  } catch (e2) {}
});
/* 시작 화면에 이미 그려둔 홈 화면 상자를 그 자리에서 갈아 끼운다 */
function refreshInstallTip() {
  var old = document.querySelector('#welcome .insttip');
  if (!old) return;
  var neu = drawInstallTip();
  old.parentNode.replaceChild(neu, old);
}

/* 크롬이 [아이콘 만들기] 프롬프트를 주려면 fetch 핸들러를 가진 서비스 워커가 있어야 한다.
   sw.js 는 아무것도 캐시하지 않는다 — respondWith 를 안 부르니 옛 버전이 남을 일이 없다 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}

/* 앱 안 브라우저(WebView)는 홈 화면 추가가 안 되고 저장소도 따로 쓴다.
   표준 판별법이 없으니 흔한 문자열로 잡는다. 못 잡아도 앱은 그대로 돌아간다 */
/* 저장 이름 INAPP_KEY 은 00-storage.js 에 모았다 */
function inAppKind() {
  var u = navigator.userAgent || '';
  if (/KAKAOTALK/i.test(u)) return 'kakao';
  if (/Instagram|FBAN|FBAV|NAVER\(inapp|\bLine\/|\binapp\b/i.test(u)) return 'other';
  return null;
}

function isStandalone() {
  return (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true
  );
}
function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

/* 이 브라우저에 이미 저장된 분류 */
function savedSummary() {
  var out = { keys: [], total: 0 };
  try {
    var 저장열쇠 = lsKeys();
    for (var i = 0; i < 저장열쇠.length; i++) {
      var k = 저장열쇠[i];
      if (!k || k.indexOf(PICK_KEY) !== 0) continue;
      try {
        var o = lsReadJSON(k);
        if (o && o.picks) {
          /* ★ 46차 ⑥. 사장님이 세신 단위는 「곳」이다. 옛 저장분에는 없으니 그때만 키를 센다 */
          var n = typeof o.n곳 === 'number' && o.n곳 >= 0 ? o.n곳 : Object.keys(o.picks).length;
          if (!n) continue;
          out.keys.push({ key: k, name: k.slice(PICK_KEY.length), n: n });
          out.total += n;
        }
      } catch (e) {}
    }
  } catch (e) {
    LS_OK = false;
  }
  return out;
}
function exportRaw(key, name) {
  var raw = lsGet(key);
  if (!raw) return;
  var blob = new Blob([raw], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (name || '내 ' + BIZ.곳) + ' 거래처 분류.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* 공유 버튼 그림 — 글로만 쓰면 못 찾는다 */
function shareIcon() {
  var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', 'shicon');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML =
    '<path d="M12 3l4 4h-3v9h-2V7H8l4-4z" fill="currentColor"/>' +
    '<path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  return s;
}

/* 앱 안 브라우저 안내. 아이콘 얘기보다 이게 먼저다 —
   여기서 찍은 거래처는 나중에 크롬으로 열면 안 보이는데, 사장님은 이유를 모른다 */
/* 지금 어떤 환경인지 앱이 안다. 해당하는 안내 하나만 보여준다 —
   다 보여주면 아무도 안 읽는다. 판별이 틀려도 앱은 그대로 돌아간다 */
function installCase() {
  if (isStandalone()) return null; /* 이미 아이콘으로 열었다 */
  var kind = inAppKind();
  if (kind) return isIOS() ? 'inapp-ios' : 'inapp-and';
  if (isIOS()) return 'safari-ios';
  if (isAndroid()) return INSTALL_EVT ? 'chrome-evt' : 'chrome-menu';
  return null; /* 데스크톱에는 안 띄운다 */
}

/* 「여기를 보세요」를 글로만 쓰면 못 찾는다. 화살표로 자리를 알려준다 */
function pointRow(where, what) {
  var d = el('div', 'a2point');
  d.appendChild(el('span', 'a2arrow', where === 'tr' ? '↗' : where === 'br' ? '↘' : '↓'));
  d.appendChild(document.createTextNode(what));
  return d;
}

function laterBtn(key) {
  var b = el('button', 'b', '나중에');
  b.type = 'button';
  b.addEventListener('click', function () {
    lsSet(key, '1');
    drawA2HS();
    drawTopInApp();
  });
  return b;
}

/* 카톡 같은 앱 안 브라우저 — 홈 화면 추가가 안 되고 저장소도 따로 쓴다.
   여기서 찍은 거래처는 나중에 크롬으로 열면 안 보인다 */
function drawInApp(host, ios) {
  var box = el('div', 'a2in');
  box.appendChild(el('div', 'a2t', '카톡에서 열면 정하신 거래처가 다음에 안 남습니다'));
  var br = ios ? '사파리' : '크롬';
  box.appendChild(el('div', 'a2b', br + ro(br) + ' 여시면 다음부터 다시 안 정하셔도 됩니다.'));
  box.appendChild(
    pointRow(
      ios ? 'br' : 'tr',
      ios
        ? '오른쪽 아래 [⋯] → 「Safari로 열기」'
        : '오른쪽 위 메뉴 → 「다른 브라우저로 열기」 → Chrome'
    )
  );
  box.appendChild(
    el('div', 'a2b2', '안 보이면 — 카톡 대화방에서 이 링크를 꾹 눌러 「링크 복사」 하시고,')
  );
  box.appendChild(el('div', 'a2b2', br + ' 앱을 열어 주소창에 붙여넣으시면 됩니다.'));

  var acts = el('div', 'a2acts');
  /* 안드로이드는 intent:// 로 크롬을 바로 열 수 있다.
     막혀 있으면 아무 일도 안 일어나므로 위의 안내를 항상 같이 둔다 */
  if (!ios && isAndroid()) {
    var go = el('button', 'b on', '크롬으로 열기');
    go.type = 'button';
    go.addEventListener('click', function () {
      var u = location.href.replace(/^https?:\/\//, '');
      location.href =
        'intent://' +
        u +
        '#Intent;scheme=' +
        location.protocol.replace(':', '') +
        ';package=com.android.chrome;end';
    });
    acts.appendChild(go);
  }
  acts.appendChild(laterBtn(INAPP_KEY));
  box.appendChild(acts);
  host.appendChild(box);
}

/* 첫 화면에는 앱 안 브라우저 안내만 띄운다.
   「홈 화면에 아이콘」은 거래처를 찍어본 뒤에나 뜻이 있어서 업로드 화면에 그대로 둔다 */
function drawTopInApp() {
  var host = document.getElementById('a2hs-top');
  if (!host) return;
  host.innerHTML = '';
  var c = installCase();
  if (c !== 'inapp-and' && c !== 'inapp-ios') return;
  if (lsGet(INAPP_KEY)) return;
  drawInApp(host, c === 'inapp-ios');
}

function drawA2HS() {
  var host = document.getElementById('a2hs');
  if (!host) return;
  host.innerHTML = '';
  var c = installCase();
  if (!c) return;

  if (c === 'inapp-and' || c === 'inapp-ios') {
    if (lsGet(INAPP_KEY)) return;
    drawInApp(host, c === 'inapp-ios');
    return;
  }
  if (lsGet(A2HS_KEY)) return; /* 「나중에」를 누르셨으면 안 띄운다 */

  var box = el('div', 'a2hs');
  box.appendChild(el('div', 'a2t', '폰 화면에 아이콘을 만들어두시면 편합니다'));
  box.appendChild(el('div', 'a2b', '다음부터는 아이콘만 누르면 바로 열립니다.'));
  var acts = el('div', 'a2acts');

  if (c === 'safari-ios') {
    var l1 = el('div', 'a2b');
    l1.appendChild(document.createTextNode('아래 '));
    l1.appendChild(shareIcon());
    l1.appendChild(document.createTextNode(' 버튼을 누르고 → 「홈 화면에 추가」를 고르세요.'));
    box.appendChild(l1);
    box.appendChild(pointRow('down', '화면 아래쪽 가운데에 있습니다'));
    box.appendChild(
      el(
        'div',
        'a2warn',
        '한 가지 더 — 아이콘으로 열지 않으면 정하신 거래처가 열흘쯤 뒤에 사라질 수 있습니다. ' +
          '지금 만들어두시는 게 좋습니다.'
      )
    );
    var ok = el('button', 'b on', '알겠습니다');
    ok.type = 'button';
    ok.addEventListener('click', function () {
      lsSet(A2HS_KEY, '1');
      drawA2HS();
    });
    acts.appendChild(ok);
  } else if (c === 'chrome-evt') {
    var mk = el('button', 'b on', '아이콘 만들기');
    mk.type = 'button';
    mk.addEventListener('click', function () {
      if (!INSTALL_EVT) return;
      INSTALL_EVT.prompt();
      INSTALL_EVT.userChoice.then(function () {
        INSTALL_EVT = null;
        lsSet(A2HS_KEY, '1');
        drawA2HS();
      });
    });
    acts.appendChild(mk);
  } else {
    /* 프롬프트가 안 오는 크롬도 있다. 그럴 땐 메뉴 자리를 알려준다 */
    box.appendChild(pointRow('tr', '오른쪽 위 [⋮] → 「설치 및 바로가기 만들기」'));
    box.appendChild(el('div', 'a2b2', '홈 화면이나 앱 목록에 「남는돈」 아이콘이 생깁니다.'));
  }
  acts.appendChild(laterBtn(A2HS_KEY));
  box.appendChild(acts);
  host.appendChild(box);

  /* 이미 이 브라우저에 저장해둔 분이면, 아이콘으로 옮길 방법을 알려준다 */
  var sm = savedSummary();
  if (sm.total) {
    var warn = el('div', 'a2move');
    warn.appendChild(
      el('div', null, '정해두신 거래처 ' + won(sm.total) + '곳이 이 브라우저에 저장돼 있습니다.')
    );
    warn.appendChild(el('div', null, '홈 화면 아이콘으로 열면 이 내용이 따라가지 않습니다.'));
    var row = el('div', 'a2acts');
    sm.keys.forEach(function (k) {
      var b = el('button', 'b', sm.keys.length > 1 ? k.name + ' 내보내기' : '내보내기');
      b.type = 'button';
      b.addEventListener('click', function () {
        exportRaw(k.key, k.name);
      });
      row.appendChild(b);
    });
    warn.appendChild(row);
    /* ★ 119차 B. 긴 설명은 항목 관리에 한 번만 둔다. 여기는 한 문장만 더한다 */
    warn.appendChild(
      el(
        'div',
        'a2b',
        '내보낸 파일을 저장해두시고, 아이콘으로 열어서 항목 관리 → 불러오기 하시면 됩니다. ' +
          '다른 기기에서는 거래처 분류 설정을 불러올 수 있습니다.'
      )
    );
    host.appendChild(warn);
  }
}

/* 거래처를 다 찍고 나서야 아이콘이 필요해지는 분이 있다.
   「나중에」를 눌렀어도 결과 화면 아래에서 다시 부를 수 있게 한다 */
function reopenInstall() {
  try {
    lsRemove(A2HS_KEY);
    lsRemove(INAPP_KEY);
  } catch (e) {}
  drawTopInApp();
  openUpPanel();
  openPick();
  drawA2HS();
  var h = document.getElementById('a2hs');
  if (h) h.scrollIntoView({ block: 'start' });
}

fillBiz(); /* 정적 화면의 {{주인}}·{{곳}} 을 채운다. 그림 그리기 전에 */
drawTopInApp(); /* 첫 화면을 열자마자 — 카톡 안이면 여기서 먼저 알려야 한다 */
/* 빌드 표시는
</body> 바로 앞에 붙고, 이 줄은 그 앞에서 돈다.
   문서가 다 읽힌 뒤에 불러야 판 이름을 읽을 수 있다 */
document.addEventListener('DOMContentLoaded', useOpened);
/* ★ 66-5차. 맨 아래 「남는돈 소개」 아이콘에 마크를 넣는다.
   ★ 이 덩이는 스크립트가 끝난 뒤에 있어서 스크립트가 도는 동안에는 아직 없다.
     스플래시(마크를 쓰는 다른 자리)는 스크립트보다 위라 거기서 바로 넣을 수 있었는데,
     여기는 문서가 다 읽힌 뒤라야 잡힌다.
   ★ 새 그림을 안 넣는다 — 파일에 이미 있는 BRAND_MARK 하나를 나눠 쓴다 */
document.addEventListener('DOMContentLoaded', function () {
  var am = /** @type {HTMLImageElement} */ (document.getElementById('applinkmark'));
  if (am) am.src = BRAND_MARK;
});

document.getElementById('pickfile').addEventListener(
  'change',
  /** @this {HTMLInputElement} */ function () {
    if (this.files && this.files[0]) importPicks(this.files[0]);
    this.value = '';
  }
);

(function bindDrop() {
  var drop = document.getElementById('updrop');
  var input = /** @type {HTMLInputElement} */ (document.getElementById('upinput'));
  input.addEventListener('change', function () {
    if (input.files && input.files.length) handleFiles(input.files);
  });
  ['dragenter', 'dragover'].forEach(function (t) {
    drop.addEventListener(t, function (e) {
      e.preventDefault();
      drop.classList.add('over');
    });
  });
  ['dragleave', 'drop'].forEach(function (t) {
    drop.addEventListener(t, function (e) {
      e.preventDefault();
      drop.classList.remove('over');
    });
  });
  drop.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });
})();

/* 못 읽는 파일 — 무엇이 문제인지 알 수 있게 실제로 읽은 열 이름을 보여준다 */
/* ── 50차 ② · 왜 못 읽었는지 그 자리에서 볼 수 있게 ──────────────
   45차에 만든 showUnreadable() 이 파일 목록 경로에서는 안 불렸다.
   모르는 열을 올려도 「파일에서 찾은 열 이름」을 볼 길이 없었다 —
   열 이름만 알면 그날 안에 넣어 되게 만들 수 있는데 그 길이 막혀 있었다.
   ★ 새로 만들지 않는다. 알맹이를 따로 빼서 두 곳에서 같이 부른다 */
function unreadableBody(host, found) {
  host.appendChild(el('div', 'unrlab', '파일에서 찾은 열 이름'));
  host.appendChild(
    el('div', 'unrcols', found && found.length ? found.join(' · ') : '(열 이름을 찾지 못했습니다)')
  );
  host.appendChild(el('div', 'unrlab', '저희가 찾는 열'));
  host.appendChild(el('div', 'unrcols', '거래일시(또는 거래일자) · 입금 · 출금 · 거래후잔액'));
  var tip = el('div', 'errn');
  /* 그냥 안 된다고만 하면 우리가 못 만든 줄 안다.
     잔액이 있어야 검산을 하고, 검산이 안 되면 숫자를 안 보여주는 게 원칙이다 */
  tip.appendChild(
    el(
      'div',
      null,
      '은행에서 내려받을 때 「거래후 잔액」을 포함하는 항목이 있으면 켜고 다시 받아주세요.'
    )
  );
  tip.appendChild(el('div', null, '잔액이 있어야 계산이 맞는지 확인할 수 있습니다.'));
  tip.appendChild(el('div', null, '거래내역을 엑셀(.xlsx)로 내려받으셨는지도 확인해주세요.'));
  tip.appendChild(el('div', null, '화면을 복사해 붙여넣은 파일은 열 이름이 달라 읽지 못합니다.'));
  /* 은행 목록을 다 모르는 상태에서 쓸 수 있는 유일한 방법 —
     사장님이 열 이름만 알려주면 바로 넣을 수 있다 */
  var 마지막 = el(
    'div',
    null,
    '그래도 안 되면 위에 보이는 열 이름을 그대로 알려주세요. 바로 넣어드리겠습니다. '
  );
  /* ★ 92차 ⑥. 「알려주세요」라고 말만 하고 알릴 자리를 안 줬다. 그 자리를 여기 둔다 */
  마지막.appendChild(kakaoAsk('카카오채널로 알려주기'));
  tip.appendChild(마지막);
  host.appendChild(tip);
}
function showUnreadable(found) {
  upStat('');
  var host = document.getElementById('upbad');
  host.innerHTML = '';
  var box = el('div', 'upbad');
  box.appendChild(el('h4', null, '이 파일은 아직 읽지 못합니다'));

  unreadableBody(box, found);

  var acts = el('div', 'upacts');
  var again = el('button', 'b on', '다른 파일 선택하기');
  again.type = 'button';
  again.addEventListener('click', function () {
    host.innerHTML = '';
    document.getElementById('upinput').click();
  });
  acts.appendChild(again);
  box.appendChild(acts);
  host.appendChild(box);
  upFocus('upbad'); /* ★ 106차 ③ */
}
