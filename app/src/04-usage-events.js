/* ── NAM-20·21 · 이용 단계 집계와 데이터 처리 안내 (2026-09-29) ─────────────────
   홍보 글에서 온 분이 앱에 닿고(도착) · 파일을 고르고(파일선택) · 결과를 보셨는지(결과표시)를
   건수로만 센다. 보내는 것은 { step, s } 둘뿐이다 — s 는 홍보 글 코드(없으면 뺀다).
   ★ 거래내역 · 파일 이름 · 계좌 · 금액 · 매장 이름 · 방문자 번호는 보내지 않는다.
     이 창구는 단계 이름만 받는다. UP 도, 파일도, 사용 기록(fc_use)도 받지 않는다.
   ★ 탭마다 단계별로 한 번만 보내 본다. 보내기 전에 표시를 세워 두 번 가지 않게 하고,
     실패해도 다시 보내지 않는다 — 번호 없는 요청을 다시 보내면 중복을 막을 길이 없다.
     그래서 이 숫자는 빠질 수 있는 운영 지표다. 회계 숫자가 아니다.
   ★ 보내다 실패해도, 저장이 막혀도 앱은 멈추지 않는다. 기다리지도 않는다.
   ★ 03-usage-config.js 의 세 값이 다 있어야 켜진다. 꺼져 있으면 안내에도 집계 문장이 없다 —
     안내는 실제로 하는 일과 같아야 한다 */
var USAGE = (function () {
  var STEPS = ['도착', '파일선택', '결과표시'];
  /* 글 코드 — 대소문자를 살린 영숫자 · 밑줄 1~12자 */
  var CODE = /^[A-Za-z0-9_]{1,12}$/;
  var cfg = typeof USAGE_CONFIG === 'object' && USAGE_CONFIG ? USAGE_CONFIG : {};
  /* 판 · 이 탭에 처음 들어올 때의 글 코드 · 단계별로 보내 봤는지. 이것 말고는 담지 않는다 */
  var st = { v: 1, s: null, sent: {} };
  /* 새 파일로 만든 분석 자료(UP 객체) — 그 자료의 결과가 처음 그려질 때 한 번 센다 */
  var newData = null;

  function isLocal(host) {
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      /\.localhost$/.test(host) ||
      /\.test$/.test(host)
    );
  }
  function usable() {
    if (!cfg.endpoint || !cfg.keepFor || !cfg.contact) return false;
    if (!/^https?:$/.test(location.protocol)) return false;
    var u = new URL(cfg.endpoint, location.href);
    var there = isLocal(u.hostname);
    /* 시험(내 컴퓨터)과 운영이 서로의 수신처로 보내지 않는다 */
    if (isLocal(location.hostname) !== there) return false;
    return u.protocol === 'https:' || (there && u.protocol === 'http:');
  }
  var on = false;
  try {
    on = usable();
  } catch (e) {}

  function codeFrom(search) {
    var all = new URLSearchParams(search).getAll('s');
    /* 두 번 적혔거나 모양이 틀리면 없는 것으로 친다 (출처 미확인) */
    return all.length === 1 && CODE.test(all[0]) ? all[0] : null;
  }
  function load() {
    var o = null;
    try {
      o = JSON.parse(ssGet(USAGE_KEY) || 'null');
    } catch (e) {}
    if (!o || o.v !== 1 || !o.sent || typeof o.sent !== 'object') return false;
    st.s = typeof o.s === 'string' && CODE.test(o.s) ? o.s : null;
    STEPS.forEach(function (k) {
      if (o.sent[k]) st.sent[k] = 1;
    });
    return true;
  }
  /* 저장이 막히면 메모리로만 든다 — 그때는 새로고침하면 도착을 한 번 더 셀 수 있다 */
  function save() {
    ssSet(USAGE_KEY, JSON.stringify(st));
  }
  /* 주소에서 s 만 뺀다. 다른 값과 # 뒤는 그대로 둔다 */
  function stripCode() {
    var p = new URLSearchParams(location.search);
    if (!p.has('s')) return;
    p.delete('s');
    var q = p.toString();
    history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }
  if (on) {
    try {
      /* 이 탭에서 처음 들어온 글 코드를 끝까지 쓴다 — 새로고침 · 다른 글로 다시 와도 안 바꾼다 */
      if (!load()) {
        st.s = codeFrom(location.search);
        save();
      }
      stripCode();
    } catch (e) {}
  }

  function step(name) {
    if (!on || STEPS.indexOf(name) < 0 || st.sent[name]) return false;
    st.sent[name] = 1;
    save();
    var body = { step: name };
    if (st.s) body.s = st.s;
    try {
      fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store'
      }).catch(function () {});
    } catch (e) {}
    return true;
  }

  function node(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function item(list, head, body) {
    var li = node('li');
    li.appendChild(node('b', null, head + ' '));
    if (body.nodeType) li.appendChild(body);
    else li.appendChild(document.createTextNode(body));
    list.appendChild(li);
  }
  /* 첫 화면 · 파일 올리는 칸 곁의 안내. 꺼져 있으면 아무것도 만들지 않는다 */
  function notice() {
    if (!on) return null;
    var box = node('div', 'usenote');
    var line = node(
      'p',
      null,
      '거래내역 파일과 분석 결과 금액은 서버로 전송되지 않습니다. ' +
        '서비스 개선을 위해 이용 단계와 홍보 글 코드를 집계합니다. '
    );
    var more = node('button', 'usemore', '데이터 처리 안내');
    more.type = 'button';
    more.setAttribute('aria-expanded', 'false');
    line.appendChild(more);
    box.appendChild(line);

    var detail = node('ul', 'usedetail');
    detail.hidden = true;
    item(
      detail,
      '보내는 것',
      '이용 단계 세 가지(앱 첫 화면 도착 · 파일 선택 · 결과 표시)와, 홍보 글 링크로 오셨을 때의 글 코드. ' +
        '한 탭에서 단계마다 한 번만 보냅니다.'
    );
    item(
      detail,
      '보내지 않는 것',
      '거래내역 파일과 파일 이름, 계좌번호, 거래 금액, 분석 결과 금액, 매장 이름과 성함, 방문자를 구별하는 번호.'
    );
    item(detail, '이 탭에 남는 것', '글 코드와 단계별로 보냈는지 여부. 탭을 닫으면 사라집니다.');
    item(detail, '보관', '날짜 · 글 코드 · 단계별 건수로 모아 ' + cfg.keepFor + ' 보관합니다.');
    item(
      detail,
      '접속 기록',
      '앱 화면과 집계 요청은 Cloudflare 를 거칩니다. 이 과정에서 Cloudflare 가 IP 주소 등 접속 정보를 처리할 수 있습니다.'
    );
    var who;
    if (/^https:\/\//.test(cfg.contact)) {
      who = node('a', null, cfg.contact);
      who.href = cfg.contact;
      who.target = '_blank';
      who.rel = 'noopener noreferrer';
    } else who = document.createTextNode(cfg.contact);
    item(detail, '문의', who);
    box.appendChild(detail);
    more.addEventListener('click', function () {
      detail.hidden = !detail.hidden;
      more.setAttribute('aria-expanded', String(!detail.hidden));
    });
    return box;
  }
  /* 파일 올리는 칸 위에 한 번 세워 둔다 (그 칸은 index.html 에 늘 있다) */
  if (on) {
    try {
      var drop = document.getElementById('updrop');
      if (drop && drop.parentNode) drop.parentNode.insertBefore(notice(), drop);
    } catch (e) {}
  }

  return {
    on: function () {
      return on;
    },
    notice: notice,
    /* 첫 화면이 안내와 함께 그려진 뒤 — 탭에서 한 번만 센다 (첫 화면으로 돌아와도 안 센다) */
    arrive: function (host) {
      if (host && !host.hidden && host.querySelector('.usenote')) step('도착');
    },
    /* 사용자가 파일을 한 개 이상 고르거나 끌어다 놓았을 때 */
    filesPicked: function (n) {
      if (n > 0) step('파일선택');
    },
    /* 새 파일로 분석 자료를 만들었을 때 — 예시 · 저장본 되살리기는 여기로 오지 않는다 */
    markNew: function (up) {
      newData = up || null;
    },
    /* 결과가 그려진 뒤. 새 파일로 만든 그 자료의 첫 결과일 때만 센다 */
    resultShown: function (up) {
      if (!up || up.demo || up !== newData) return;
      newData = null;
      step('결과표시');
    }
  };
})();
