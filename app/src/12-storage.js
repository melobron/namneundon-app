/* ── 온보딩: 못정한 거래처를 금액 큰 순으로 하나씩 ── */
/* ── 사장님이 정한 분류만 이 브라우저에 남긴다 ──
   거래내역·금액·잔액은 어떤 경로로도 저장하지 않는다.
   자동으로 잡은 것은 규칙이 코드에 있으니 저장할 필요가 없다 */
var PICK_KEY = 'fc.picks.';
/* ── 36차 J · 직접 넣기 ─────────────────────────────────────
   ★ 저장통을 나눈다. fc.picks 의 hasNumber 검사는 그대로 둔다 —
     그것이 A안을 코드로 강제해둔 장치다.
       fc.picks.<매장>    거래처 분류       숫자 0. hasNumber 검사 그대로
       fc.manual.<매장>   직접 적은 금액만   여기만 숫자를 허용한다
     fc.manual 은 pickPayload·내보내기에 들어가지 않는다.
   변호사 확인 — 사용자가 직접 입력한 숫자를 그 사람 브라우저에 남기는 것은 문제없다 */
var MANUAL_KEY = 'fc.manual.';

var LS_OK = true; /* 시크릿 모드에서는 저장이 막힌다 — 앱은 그대로 돌아가야 한다 */
var LS_MSG = '이 브라우저에서는 저장이 안 됩니다. 매번 다시 정하셔야 합니다';

/* lsGet · lsSet · lsDel 은 00-early.js 에 있다 (첫 화면에서 바로 쓰여서 맨 앞에 둔다) */

function storeKey(name) {
  var s = String(name != null ? name : (UP && UP.store) || '').trim();
  return PICK_KEY + (s || '(기본)');
}

/* ── 91차 ① · 거래내역 데이터셋 (이 기기 전용) ──────────────────────
   ★ 이것은 네 번째 저장통이다. 앞의 셋과 섞지 않는다.
       fc.picks.<매장>   거래처 분류      숫자 0. hasNumber 검사 그대로  ← 내보내기에 들어간다
       fc.manual.<매장>  직접 적은 금액    사장님이 손수 넣으신 수
       fc.banks.<매장>   계좌 부르는 이름
       fc.data.<매장>    거래내역 그 자체  ← 이번에 만든 것. 금액이 들어간다
   ★ fc.data 는 내보내기(pickPayload·exportPicks)에 들어가지 않는다.
     「복사하기로 남한테 넘기는 값에는 금액이 없다」는 원칙은 fc.picks 의 것이고,
     그 hasNumber 검사는 한 글자도 안 건드린다. 둘은 아예 다른 길이다.
   ★ 서버 약속도 그대로다 — 이 통은 이 기기 안에만 있고, 이 통을 읽어
     네트워크로 내보내는 코드는 없다.
   ★ 왜 localStorage 인가 — 1년 약 900건이 대략 200KB다. 통이 약 5MB라
     몇 해·몇 매장도 들어간다. 무엇보다 이 앱의 저장은 전부 lsGet/lsSet 한 길이고,
     그 길은 동기라 화면을 그리기 전에 값이 있다. IndexedDB 로 가면 부팅 순서를
     비동기로 바꿔야 하는데, 얻는 것보다 흔들 자리가 훨씬 많다.
     넘치면 조용히 접는다 — 저장이 안 돼도 앱은 메모리로 그대로 돌아간다 */
var DATA_KEY = 'fc.data.';
var LAST_KEY = 'fc.last'; /* 마지막으로 남긴 매장 — 열 때 어느 것부터 볼지 */
/* ★ 105차 ④. 분석이 끝난 날짜 하나만 남긴다 (2026-09-19 요한 결정).
   ★ 파일을 고른 시각이 아니다 — 거래가 실제로 반영되고 결과 화면까지 간 날이다.
   ★ 「올리신 날」이 아니라 「분석한 날」이다. 같은 파일을 다시 분석할 수도 있다.
   ★ 「자료 기준일」과 다른 값이다 — 오늘 분석했어도 자료는 한 달 전 것일 수 있다.
   ★ 거래내역·금액·잔액은 저장하지 않는다. ■36 은 한 글자도 안 바뀐다.
     들어가는 값은 'YYYY-MM-DD' 열 글자뿐이고 서버로 가는 것은 없다.
   ★ 사업자등록이 나오면 이 날짜를 그대로 올리면 된다. 보내는 기준은 30일 이상 하나뿐이고,
     그건 화면 줄(늘 보인다)과 다른 것이다. 섞지 않는다 */
var LAST_RUN_KEY = 'nd_lastrun.';
function lastRunKey(name) {
  var s = String(name != null ? name : (UP && UP.store) || '').trim();
  return LAST_RUN_KEY + (s || '(기본)');
}
function lastRunDay(name) {
  var v = lsGet(lastRunKey(name));
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}
/* 결과 화면이 실제로 그려진 뒤에만 찍는다. 그리고 「새 거래가 는 판」에만 찍는다 —
   통에서 되살린 판이나, 같은 파일을 또 올려 겹친 거래를 걸러내고 나니
   한 건도 안 는 판은 「자료를 갱신한 것」이 아니다 (startFromBanks 의 __새거래) */
function markLastRun() {
  if (!UP || UP.demo || !UP.__새거래) return;
  lsSet(lastRunKey(), dataDay());
  UP.__새거래 = false; /* 다시 그려도 두 번 찍지 않는다 */
}
var DATA_CAP = 2000000; /* 이 글자 수를 넘으면 안 남긴다 (통이 터지지 않게) */
var DATA_SIG = null; /* 마지막으로 남긴 것의 지문 — 안 바뀌었으면 다시 안 쓴다 */

function dataKey(name) {
  var s = String(name != null ? name : (UP && UP.store) || '').trim();
  return DATA_KEY + (s || '(기본)');
}
/* 그날부터 오늘까지 며칠 — 날짜만 센다. 시각은 안 본다 */
function daysSince(day) {
  if (!day) return 0;
  var a = dayMs(day),
    b = dayMs(dataDay());
  var n = Math.round((b - a) / 86400000);
  return n > 0 ? n : 0;
}
/* 저장한 날. 시각은 안 남긴다 — 사장님 생활을 들여다보지 않는다 (fc_use 와 같은 태도) */
function dataDay() {
  var d = new Date(),
    m = d.getMonth() + 1,
    x = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (x < 10 ? '0' + x : x);
}
/* 바뀌었는가만 본다. 200KB 를 찍을 때마다 다시 쓰지 않으려는 것이다 */
function dataSig() {
  var n = 0;
  (UP.banks || []).forEach(function (b) {
    n += (b.rows || []).length;
  });
  return (
    (UP.banks || []).length +
    '|' +
    n +
    '|' +
    (UP.store || '') +
    '|' +
    (UP.owner || '') +
    '|' +
    (UP.trade || '') +
    '|' +
    (UP.opening || 0) +
    '|' +
    (UP.closing || 0) +
    '|' +
    (UP.patched || 0) +
    '|' +
    (UP.unsure || 0) +
    '|' +
    (UP.zeroed || 0) +
    '|' +
    /* ★ 112차 ②. 다시 고르시면 이 값이 바뀐다 — 안 넣으면 지문이 같아 저장을 건너뛴다 */
    (UP.byStated || 0) +
    '|' +
    (UP.autoPatched || 0)
  );
}
/* 넣을 값을 하나하나 손으로 고른다 — 객체를 통째로 복사하면
   나중에 누가 UP 에 무엇을 붙여도 여기로 따라 들어온다 (fc_use 와 같은 방식) */
function dataPayload() {
  var banks = (UP.banks || []).map(function (b) {
    return {
      name: b.name || null,
      file: b.file || null,
      sheet: b.sheet || null,
      header: b.header != null ? b.header : 0,
      balName: b.balName || null,
      balTried: b.balTried || null,
      bankHint: b.bankHint || null,
      bank: b.bank || null,
      typed: b.typed || null,
      found: b.found || null,
      from: b.from || null,
      to: b.to || null,
      /* ★ 113차 ①. 파일에서 읽은 조회 기간과 완전성 판단.
         이게 빠지면 다음에 열 때 자료 범위가 조용히 좁아진다 */
      range: b.range || null,
      opening: +b.opening || 0,
      closing: +b.closing || 0,
      moved: +b.moved || 0,
      rows: (b.rows || []).map(function (r) {
        var o = {
          at: r.at,
          payee: r.payee,
          amount: r.amount,
          balance: r.balance,
          excelRow: r.excelRow || 0,
          memo: r.memo || ''
        };
        /* 부호를 잔액으로 푸는 파일에서만 쓰는 값들. 없으면 안 넣는다 */
        if (r.mag != null) o.mag = r.mag;
        if (r.kindDir) o.kindDir = r.kindDir;
        /* 확인 카드에서 정하신 결과. 이게 빠지면 다시 물어야 한다 */
        if (r.residual) o.residual = r.residual;
        if (r.patched) o.patched = true;
        if (r.unsure) o.unsure = true;
        /* ★ 112차 ②. 파일에 적혀 있던 금액은 어느 선택에서도 안 잃는다 —
           화면에 「파일 금액 900,000원」을 다시 보여드려야 하기 때문이다.
           ★ stated 는 null 도 뜻이 있다 (파일에 금액이 없었다). 그래서 키가 있으면 다 남긴다 */
        if (r.stated !== undefined) o.stated = r.stated;
        if (r.byStated) o.byStated = true;
        if (r.zeroed) o.zeroed = true;
        if (r.picked) o.picked = true;
        return o;
      })
    };
  });
  return {
    dv: 1,
    저장일: dataDay(),
    store: UP.store || null,
    owner: UP.owner || null,
    trade: UP.trade || null,
    dueDay: UP.dueDay || null,
    patched: +UP.patched || 0,
    unsure: +UP.unsure || 0,
    zeroed: +UP.zeroed || 0,
    banks: banks
  };
}
/* ★ 112차 ③. 저장이 어떻게 됐는지 그 자리에서 알려드리려면 결과를 들고 있어야 한다.
     'ok'   남겼다
     'none' 못 남겼고, 이 매장에 예전 저장본도 없다
     'kept' 못 남겼지만 예전 저장본은 그대로 있다 */
var SAVE_STATE = 'ok';
/* ★ 112차 ③. 예전에는 새 저장이 실패하면 lsDel 로 낡은 것까지 지웠다.
   까닭은 「보태기 전의 숫자가 조용히 살아나지 않게」였는데,
   그 대가로 잘 저장돼 있던 매장 하나가 통째로 없어졌다 — 있던 것마저 잃는다.
   이제는 안 지우고, 대신 「이전 저장본은 유지됩니다」라고 화면에 적는다.
   조용히 살아나는 것이 문제였으므로, 조용하지 않게 하는 쪽으로 푼다 */
function saveFail() {
  var 예전있;
  try {
    예전있 = !!lsGet(dataKey());
  } catch (e) {
    예전있 = false;
  }
  SAVE_STATE = 예전있 ? 'kept' : 'none';
  DATA_SIG = null; /* 다음에 또 해본다 — 자리가 나면 남을 수도 있다 */
  return false;
}
function saveData() {
  if (!UP || UP.demo || !UP.banks || !UP.banks.length) return false;
  var sig = dataSig();
  if (sig === DATA_SIG) return true; /* 안 바뀌었다 */
  var body;
  try {
    body = JSON.stringify(dataPayload());
  } catch (e) {
    return saveFail();
  }
  /* 통이 감당할 크기를 넘으면 안 남긴다 */
  if (body.length > DATA_CAP) return saveFail();
  if (!lsSet(dataKey(), body)) return saveFail();
  lsSet(LAST_KEY, String(UP.store || '(기본)'));
  DATA_SIG = sig;
  SAVE_STATE = 'ok';
  return true;
}
/* 읽기 — 모양이 아니면 아예 없는 것으로 친다 */
function loadData(name) {
  var raw = lsGet(dataKey(name));
  if (!raw) return null;
  var o;
  try {
    o = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  if (!o || o.dv !== 1 || !o.banks || !o.banks.length) return null;
  var ok = o.banks.every(function (b) {
    return (
      b &&
      b.rows &&
      b.rows.length &&
      typeof b.rows[0].at === 'string' &&
      typeof b.rows[0].balance === 'number'
    );
  });
  return ok ? o : null;
}
function delData(name) {
  lsDel(dataKey(name));
  DATA_SIG = null;
  var s = String(name != null ? name : (UP && UP.store) || '').trim() || '(기본)';
  if (lsGet(LAST_KEY) === s) lsDel(LAST_KEY);
}
/* 저장해둔 것을 startFromBanks 가 받는 모양으로 되돌린다.
   ★ breaks 는 비운다 — 확인 카드는 이미 끝났고, 그 결과는 줄마다
     residual·patched·unsure 로 붙어 있다 (amtOf 가 그것을 읽는다) */
function banksFromData(o) {
  return (o.banks || []).map(function (b) {
    return {
      name: b.name,
      file: b.file,
      sheet: b.sheet,
      header: b.header,
      balName: b.balName,
      balTried: b.balTried,
      bankHint: b.bankHint,
      bank: b.bank,
      typed: b.typed || null,
      found: b.found || null,
      from: b.from || null,
      to: b.to || null,
      range: b.range || null /* ★ 113차 ① */,
      opening: +b.opening || 0,
      closing: +b.closing || 0,
      moved: +b.moved || 0,
      breaks: [],
      kept: true /* 이름이 이미 붙은 계좌다 — 번호를 다시 안 붙인다 */,
      rows: (b.rows || []).slice()
    };
  });
}

/* 저장 직전 검사 — 숫자가 하나라도 섞이면 저장하지 않는다 */
function hasNumber(v) {
  if (typeof v === 'number') return true;
  if (Array.isArray(v)) return v.some(hasNumber);
  if (v && typeof v === 'object')
    return Object.keys(v).some(function (k) {
      return hasNumber(v[k]);
    });
  return false;
}

function pickPayload() {
  /* 거래내역에 찍힌 원본 표기를 키로 쓴다.
     다듬은 이름으로 저장하면, 나중에 다듬는 규칙을 한 번만 손대도
     저장된 키가 안 맞아 되살림이 조용히 0곳이 된다 */
  var picks = {},
    mixedCards = [],
    곳 = 0;
  (UP.payees || []).forEach(function (g) {
    /* ★ 46차 ⑥. F 가 안 묻고 넘긴 곳은 auto 가 false 라 「손으로 정한 것」으로
       저장되고 있었다. 세 곳 찍고 나가신 분이 돌아오면 「99곳」이라고 나왔다 —
       뭘 99곳이나 했다는 건지 알 수가 없다.
       ★ 저장통은 사장님이 정하신 것을 담는 곳이다. 앱이 정한 것은 안 담는다.
         F 규칙은 파일을 올릴 때마다 다시 도니 잃는 것도 없다.
         손수 되돌리신 곳은 UP.unskip 에 따로 남는다 */
    if (g.askSkip) return;
    /* 혼용 카드는 금액을 나누지 않고 이름만 남겨 다음 파일에서 다시 묻지 않는다. */
    if (g.cardMixed) {
      곳++;
      (g.rawList || [g.name]).forEach(function (raw) {
        if (mixedCards.indexOf(raw) === -1) mixedCards.push(raw);
      });
      return;
    }
    var v = null;
    if (g.mixed) {
      /* ★ 63-4. 한 거래처에 항목 하나라 양쪽이 같다. 같으면 글자 하나로 남긴다 —
         읽을 때 applySaved 가 양쪽에 같이 넣어 준다.
         방향마다 다르게 저장된 옛 것도 그대로 읽히므로 모양은 둘 다 살려 둔다 */
      var o = {};
      if (g.catIn && !g.autoIn) o['입금'] = g.catIn;
      if (g.catOut && !g.autoOut) o['출금'] = g.catOut;
      if (o['입금'] && o['입금'] === o['출금']) v = o['입금'];
      else if (Object.keys(o).length) v = o;
    } else if (g.cat && !g.auto) v = g.cat; /* 손으로 정한 것만 */
    if (!v) return;
    /* ★ 46차 ⑥. 저장은 원본 표기별로 한다(되살릴 때 그래야 맞다).
       그런데 한 거래처가 표기 여럿을 가지면 키가 여럿이 된다 —
       세 곳 찍고 아홉 곳이라고 나왔다. 사장님이 세신 단위는 「곳」이다 */
    곳++;
    (g.rawList || [g.name]).forEach(function (raw) {
      picks[raw] = v;
    });
  });
  return {
    n곳: 곳,
    목표일: UP.dueDay || null,
    업종: UP.trade || null,
    /* ★ 63-1. 이 매장이 어느 계좌 파일에서 나왔는지 열쇠만 남긴다.
              열쇠는 (시트 이름 + 파일 이름에서 숫자를 뺀 것)이라 계좌번호도 잔액도 아니다 —
              hasNumber 검사를 그대로 지난다 (bankNameKey 가 숫자를 통째로 뺀다) */
    계좌: bankKeysNow(),
    store: UP.store || null,
    owner: UP.owner || null,
    xfer: xferKeys(),
    unskip: (UP.unskip || []).slice() /* 36차 F. 손수 되돌리신 곳 — 이름만, 숫자 없음 */,
    accounts: UP.accounts.slice(),
    hidden: (UP.hidden || []).slice(),
    baseCats: UP.baseCats.slice(),
    keepSet: UP.keepSet.slice(),
    /* ★ 63-1. 저장한 차례. 같은 계좌에 매장이 둘이면 마지막에 쓰신 쪽이 그 계좌의 주인이다 */
    순번: nextPickSeq(),
    cv: CAT_CV,
    picks: picks,
    cardMixed: mixedCards
  };
}
/* 저장통에 있는 가장 큰 순번 + 1. 금액도 시각도 아니고 차례를 세는 수다 —
   「이 계좌를 마지막에 쓴 매장이 어디인가」만 알면 되므로 시계는 안 본다 */
function nextPickSeq() {
  var max = 0;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(PICK_KEY) !== 0) continue;
      var o = null;
      try {
        o = JSON.parse(localStorage.getItem(k));
      } catch (e) {
        continue;
      }
      if (o && typeof o.순번 === 'number' && o.순번 > max) max = o.순번;
    }
  } catch (e) {
    return 1;
  }
  return max + 1;
}

function savePicks() {
  if (!UP || !UP.payees) return false;
  /* ★ 57차 ⑦. 분류가 바뀌면 매출·사업 지출이 바뀌므로 하루 표를 다시 만든다 */
  UP.__due = null;
  if (UP.demo) return false; /* 예시는 이 브라우저에 남기지 않는다 */
  /* ★ 91차 ①. 거래내역 데이터셋(fc.data)도 여기서 같이 남긴다 —
     분류가 남는 자리마다 거래내역도 같이 있어야 다음에 열 때 짝이 맞는다.
     통은 따로다. 아래 hasNumber 검사는 fc.picks 의 것이고 한 글자도 안 건드린다.
     바뀐 게 없으면 saveData 가 지문만 보고 바로 돌아 나온다 */
  try {
    saveData();
  } catch (e) {}
  var body = pickPayload();
  /* ★ 41차. cv 는 저장 모양의 판 번호지 금액이 아니다. 그런데 hasNumber 는
     「숫자면 무조건」이라, 38차에 cv:2 를 붙인 뒤로 이 함수가 늘 false 를 돌려줬다 —
     그 뒤로 fc.picks 에 아무것도 안 남았다. 정하신 분류가 다음 달에 하나도 안 살아난다.
     ★ 검사를 푸는 게 아니다. 판 번호만 잠깐 빼고 나머지 전부를 그대로 본다 */
  /* ★ 57차 ⑦. 목표일도 금액이 아니라 날짜 하나(1~28)다. 판 번호와 같이 뺀다.
     ★ 63-1. 순번도 같다 — 저장한 차례를 세는 수지 금액이 아니다.
     ★ 검사는 여전히 안 푼다 — 이름 붙은 넷만 잠깐 빼고 나머지 전부를 그대로 본다 */
  var cv = body.cv,
    n곳 = body.n곳,
    due = body.목표일,
    seq = body.순번;
  delete body.cv;
  delete body.n곳; /* 판 번호와 같이 — 금액이 아니다 */
  delete body.목표일;
  delete body.순번;
  if (hasNumber(body)) return false; /* 금액이 섞였으면 안 남긴다 */
  body.cv = cv;
  body.n곳 = n곳;
  body.목표일 = due;
  body.순번 = seq;
  body.v = 1;
  /* ★ 112차 ③. 거래처 분류가 남았는지는 거래내역이 남았는지와 다른 일이다.
     「분류는 저장됐습니다」를 근거 없이 붙이지 않으려면 이 결과를 들고 있어야 한다 */
  PICK_SAVED = lsSet(storeKey(), JSON.stringify(body));
  return PICK_SAVED;
}
var PICK_SAVED = true;

/* ── 사용 기록 ──────────────────────────────────────────────
   파일이 서버로 안 가니 「그분들이 실제로 쓰고 계신가」를 알 방법이 없다.
   그 원칙은 안 깬다 — 앱이 이 기기에서만 재고, 보내는 것은
   사장님이 「복사하기」를 누르는 것으로만 한다. 네트워크로 나가는 코드는 없다.

   fc_use 는 fc_picks(pickPayload·내보내기)와 별개다.
   금액·거래처 이름·매장 이름은 하나도 안 들어간다.
   그래서 저장할 때 객체를 통째로 복사하지 않고 넣을 값을 하나하나 손으로 고른다.
   날짜는 월-일만 남긴다 — 시각까지 남기면 사장님 생활을 들여다보는 것이 된다 */
/* ★ 39차 5번. 「모자랄 것 같다」 카드를 걷어내면서 그 로그통도 비운다.
   쓰던 분 브라우저에 남아 있을 수 있어 한 번 지우고 간다 */
try {
  localStorage.removeItem('fc_log');
} catch (e) {}
var USE_KEY = 'fc_use';
var USE_MAX = 30; /* 줄은 최근 30개까지 */
var USE_CAP = 120; /* 한 곳에 2분을 넘기면 2분으로 자른다 */
var USE_FAIL_MAX = 10; /* 못 읽은 파일은 최근 10개까지 */
/* 왜 못 읽었는지는 이 중 하나로만 남긴다. 파일 이름은 절대 안 남는다 */
var USE_FAIL_WHY = {
  notxlsx: '엑셀 아님',
  nodate: '거래일시 열 못 찾음',
  noamt: '금액 열 못 찾음',
  norows: '줄 없음',
  balance: '잔액 검산 안 맞음',
  unknown: '읽다가 멈춤',
  /* ★ 102차 추가 ②. 이 줄이 없으면 새 열쇠가 '읽다가 멈춤'으로 기록돼
     「엑셀이 암호 걸려 되돌아간 건이 몇 건인가」를 셀 수가 없다 — 가른 뜻이 없어진다 */
  xlsx_locked: '엑셀 암호 걸림',
  /* ★ 92차 ⑤. PDF 사유. 어느 은행 양식을 먼저 넣어야 하는지 알 길이 이것뿐이다.
     여기에도 파일 이름은 안 들어간다 — 왜 못 읽었는지 한 마디뿐이다 */
  pdf_no_header: 'PDF 양식 모름',
  pdf_image: 'PDF 가 사진',
  pdf_locked: 'PDF 비밀번호 안 넣음',
  pdf_open: 'PDF 열다가 멈춤',
  pdf_total: 'PDF 합계 안 맞음'
};
/* 「본 것」은 세지 않는다 — 카드 id 에 거래처 이름이 들어 있어 본 목록을 남길 수 없고,
   창마다 다시 세면 분모가 부풀려진다. 누르신 것만 센다 */
/* ★ 사용 기록의 내부값이다. 화면 글자(「확인」)와 갈라 둔다 —
   여기를 바꾸면 옛 기록과 안 맞아 셀 수가 없다 */
var USE_CARDS = ['맞습니다', '확인해볼게요', '되돌리기'];

function useDay() {
  var d = new Date(),
    m = d.getMonth() + 1,
    x = d.getDate();
  return (m < 10 ? '0' + m : m) + '-' + (x < 10 ? '0' + x : x);
}
/* 빌드가 심어주는 표시. 개발본에는 없다 */
function useStamp() {
  var e = document.getElementById('buildstamp');
  return e ? String(e.textContent || '').trim() : '(개발본)';
}
function useBlank() {
  var o = {
    v: 1,
    판: '',
    연날: [],
    올림: [],
    올림실패: [],
    찍기: [],
    되살림: [],
    확인카드: {},
    열어본화면: {}
  };
  USE_CARDS.forEach(function (k) {
    o.확인카드[k] = 0;
  });
  return o;
}
function useRead() {
  try {
    var o = JSON.parse(lsGet(USE_KEY) || 'null');
    if (!o || o.v !== 1) return useBlank();
    var b = useBlank();
    b.판 = String(o.판 || '');
    (o.연날 || []).forEach(function (d) {
      b.연날.push(String(d));
    });
    (o.올림 || []).forEach(function (x) {
      var e = { 날: String(x.날), 기간: String(x.기간) };
      if (x.못정한 != null) e.못정한 = +x.못정한;
      b.올림.push(e);
    });
    (o.올림실패 || []).forEach(function (x) {
      b.올림실패.push({ 날: String(x.날), 왜: String(x.왜) });
    });
    (o.찍기 || []).forEach(function (x) {
      b.찍기.push({ 날: String(x.날), 곳: +x.곳 || 0, 초: +x.초 || 0 });
    });
    (o.되살림 || []).forEach(function (x) {
      b.되살림.push({ 날: String(x.날), 곳: +x.곳 || 0 });
    });
    USE_CARDS.forEach(function (k) {
      b.확인카드[k] = +(o.확인카드 || {})[k] || 0;
    });
    Object.keys(o.열어본화면 || {}).forEach(function (k) {
      b.열어본화면[String(k)] = +o.열어본화면[k] || 0;
    });
    return b;
  } catch (e) {
    return useBlank();
  }
}
/* 저장은 이 함수 하나로만 한다. 넣는 값을 여기서 전부 손으로 고른다 —
   객체를 통째로 넘기면 나중에 누가 금액이 든 필드를 붙여도 안 걸린다 */
function useWrite(o) {
  var out = {
    v: 1,
    판: String(o.판 || ''),
    연날: [],
    올림: [],
    올림실패: [],
    찍기: [],
    되살림: [],
    확인카드: {},
    열어본화면: {}
  };
  (o.연날 || []).slice(-USE_MAX).forEach(function (d) {
    out.연날.push(String(d));
  });
  (o.올림 || []).slice(-USE_MAX).forEach(function (x) {
    var e = { 날: String(x.날), 기간: String(x.기간) };
    /* 온보딩을 끝냈을 때의 못 정한 금액 비율. 소수 둘째 자리까지 */
    if (x.못정한 != null) e.못정한 = Math.round((+x.못정한 || 0) * 100) / 100;
    out.올림.push(e);
  });
  /* 실패는 왜 실패했는지만. 파일 이름·거래처·금액은 절대 안 넣는다 */
  (o.올림실패 || []).slice(-USE_FAIL_MAX).forEach(function (x) {
    out.올림실패.push({ 날: String(x.날), 왜: String(x.왜) });
  });
  (o.찍기 || []).slice(-USE_MAX).forEach(function (x) {
    out.찍기.push({ 날: String(x.날), 곳: +x.곳 || 0, 초: +x.초 || 0 });
  });
  (o.되살림 || []).slice(-USE_MAX).forEach(function (x) {
    out.되살림.push({ 날: String(x.날), 곳: +x.곳 || 0 });
  });
  USE_CARDS.forEach(function (k) {
    out.확인카드[k] = +(o.확인카드 || {})[k] || 0;
  });
  Object.keys(o.열어본화면 || {})
    .slice(0, 12)
    .forEach(function (k) {
      out.열어본화면[String(k)] = +o.열어본화면[k] || 0;
    });
  return lsSet(USE_KEY, JSON.stringify(out));
}
/* 예시 화면은 사장님이 실제로 쓰신 것이 아니다 —
   다만 「앱을 연 날」은 예시로 여셨어도 연 것이라 따로 센다 */
function useSkip() {
  return !!(window.UP && UP.demo);
}
function useEdit(fn) {
  var o = useRead();
  o.판 = useStamp();
  fn(o);
  useWrite(o);
}
/* useOpened 는 00-early.js 에 있다 (09 에서 첫 화면에 등록해서 맨 앞에 둔다) */
function useUpload(span) {
  if (useSkip()) return;
  useEdit(function (o) {
    o.올림.push({ 날: useDay(), 기간: String(span) });
  });
}
/* 온보딩이 끝난 시점의 못 정한 금액 비율을 방금 올린 줄에 적는다.
   「20곳만 찍으면 됩니다」가 처음 보는 파일에서도 성립하는지 재는 유일한 숫자다 */
function useUnknownShare(x) {
  if (useSkip()) return;
  useEdit(function (o) {
    if (!o.올림.length) return;
    o.올림[o.올림.length - 1].못정한 = +x || 0;
  });
}
/* 못 읽은 파일. 사장님은 「안 되네」 하고 닫으시고 우리는 아무것도 모른다 */
function useFail(key) {
  if (useSkip()) return;
  var why = USE_FAIL_WHY[key] || USE_FAIL_WHY.unknown;
  useEdit(function (o) {
    o.올림실패.push({ 날: useDay(), 왜: why });
  });
}
function useRestored(n) {
  if (useSkip()) return;
  useEdit(function (o) {
    o.되살림.push({ 날: useDay(), 곳: +n || 0 });
  });
}
function useAddPick(places, sec) {
  if (useSkip()) return;
  useEdit(function (o) {
    o.찍기.push({ 날: useDay(), 곳: +places || 0, 초: +sec || 0 });
  });
}
function useScreen(name) {
  if (useSkip()) return;
  useEdit(function (o) {
    o.열어본화면[name] = (+o.열어본화면[name] || 0) + 1;
  });
}
function useCard(kind) {
  if (useSkip()) return;
  useEdit(function (o) {
    o.확인카드[kind] = (+o.확인카드[kind] || 0) + 1;
  });
}

/* ── 온보딩 시계 ──
   이 숫자로 파일럿을 계속할지 정한다. 부풀려지면 안 된다.
   탭이 안 보이면 멈추고(카톡 보러 간 시간), 한 곳이 2분을 넘으면 2분으로 자른다
   (전화를 받거나 손님이 오면 한 곳에 20분이 찍힌다) */
var UT = { on: false, at: 0, sec: 0, cur: 0, places: 0 };
function utAccrue() {
  if (!UT.on || !UT.at) return;
  var s = Math.round((Date.now() - UT.at) / 1000);
  UT.at = Date.now();
  if (s > 0) UT.cur += s;
}
function utClose() {
  /* 지금 보고 있던 한 곳을 닫는다 */
  utAccrue();
  UT.sec += Math.min(UT.cur, USE_CAP);
  UT.cur = 0;
}
function utStart() {
  if (UT.on) return;
  UT = { on: true, at: Date.now(), sec: 0, cur: 0, places: 0 };
}
function utPick() {
  /* 한 곳을 정했거나 미뤘다 */
  if (!UT.on) return;
  utClose();
  UT.places++;
}
function utStop() {
  /* 「결과 보기」·「그만 찍고 결과 보기」 */
  if (!UT.on) return;
  utClose();
  var p = UT.places,
    s = UT.sec;
  UT.on = false;
  UT.at = 0;
  UT.cur = 0;
  if (p > 0) useAddPick(p, s);
  /* 여기가 온보딩이 끝나는 자리다 */
  if (UP && UP.payees && UP.payees.length) useUnknownShare(1 - coverage(0));
}
document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    utAccrue();
    UT.at = 0;
  } else if (UT.on && !UT.at) {
    UT.at = Date.now();
  }
});

/* 화면에 보여줄 글. 사장님이 이걸 그대로 보고 누르신다 */
function useMin(sec) {
  var m = Math.floor(sec / 60),
    s = sec % 60;
  return m ? m + '분 ' + s + '초' : s + '초';
}
function useDot(d) {
  return +d.slice(0, 2) + '/' + +d.slice(3, 5);
}
function useText() {
  var o = useRead();
  if (!o.연날.length && !o.올림.length && !o.올림실패.length && !o.찍기.length) return null;
  var L = [];
  L.push('판 ' + (o.판 || '(개발본)'));
  if (o.연날.length) {
    L.push('앱을 연 날   ' + o.연날.map(useDot).join(' · ') + '   (' + o.연날.length + '번)');
  }
  if (o.올림.length) {
    L.push('파일 올림    ' + o.올림.length + '번');
    o.올림.forEach(function (x) {
      L.push(
        '  ' +
          useDot(x.날) +
          '  ' +
          x.기간 +
          (x.못정한 != null ? '  못 정한 금액 ' + Math.round(x.못정한 * 100) + '%' : '')
      );
    });
  }
  if (o.올림실패.length) {
    L.push('못 읽은 파일  ' + o.올림실패.length + '번');
    o.올림실패.forEach(function (x) {
      L.push('  ' + useDot(x.날) + '  ' + x.왜);
    });
  }
  if (o.찍기.length || o.되살림.length) {
    L.push('거래처 정하기');
    o.찍기.forEach(function (x) {
      L.push('  ' + useDot(x.날) + '  ' + x.곳 + '곳 · ' + useMin(x.초));
    });
    o.되살림.forEach(function (x) {
      L.push('  ' + useDot(x.날) + '  지난번 ' + x.곳 + '곳 되살아남');
    });
  }
  var c = o.확인카드;
  /* 「N장 중」은 안 쓴다. 창을 새로 열면 「본 것」이 다시 세어져 분모가 부풀려지고,
     그러면 「4/16 = 25%밖에 안 봤네」로 잘못 읽힌다.
     분모가 틀린 건 없는 것보다 나쁘다. 아래 셋은 누르신 횟수라 정확하다 */
  if (c.맞습니다 || c.확인해볼게요 || c.되돌리기) {
    L.push(
      '확인 카드   ' +
        c.맞습니다 +
        '장 확인 · ' +
        c.확인해볼게요 +
        '장 확인해볼게요 · ' +
        c.되돌리기 +
        '장 되돌림'
    );
  }
  var ks = Object.keys(o.열어본화면);
  if (ks.length) {
    L.push(
      '열어본 화면  ' +
        ks
          .map(function (k) {
            return k + ' ' + o.열어본화면[k] + '번';
          })
          .join(' · ')
    );
  }
  return L.join('\n');
}
/* 이름을 바꾼 항목 — 옛 저장분을 새 이름으로 옮긴다.
   안 옮기면 옛 매장은 「대출 갚은 돈」, 새 매장은 「은행 원금 상환」이 되어
   같은 사장님 화면에 두 말이 같이 나온다 */
/* ★ 36차. 「내가 가져간 돈」 → 「사업 외 용도」.
   옛 이름 사슬을 곧바로 마지막 이름으로 잇는다 — 차례에 안 기대게 하려는 것이다.
   「가게에서 뺀 돈」으로 저장하신 분도 한 번에 「사업 외 용도」로 온다 */
/* ★ 57차 ④. 대출 셋을 「대출 상환」으로 모은다.
   「대출이자」는 숫자가 안 바뀌고, 「은행 원금 상환」은 바뀐다 —
   계산 밖에서 지출로 온다. 의도한 변화다 */
/* ★ 63차. 개인 돈 셋을 「사업 외 용도」 하나로 모은다 — 뜻은 그대로다.
   「내가 넣은 돈」으로 저장된 입금 줄은 KEEP_SIDE 가 다시 「내가 넣은 돈」으로
   돌려주고, 출금 줄은 「내가 가져간 돈」이 된다. 이름만 이사하는 것이다.
   ★ 「대출받은 돈」 → 「대출」. 57차에 「대출」을 「대출 상환」으로 보냈던 규칙은
     이 표에서 빼고 CAT_RENAMED_OLD 로 옮긴다 — cv 2 이하에서만 돌아야 한다.
     지금 「대출」은 계산 밖 항목이라, 여기 두면 새 이름이 곧바로 지출로 끌려간다 */
var CAT_RENAMED = {
  '대출 갚은 돈': '대출 상환',
  '은행 원금 상환': '대출 상환',
  대출이자: '대출 상환',
  '대출받은 돈': '대출',
  공과금: '전기·가스·수도' /* 63-6 */,
  '투자받은 돈': '사업 외 용도' /* 38차 7번 */,
  '가게에서 뺀 돈': '사업 외 용도',
  '내가 가져간 돈': '사업 외 용도',
  '내가 넣은 돈': '사업 외 용도',
  '가게에 넣은 돈': '사업 외 용도'
};
/* cv 2 이하에만 쓰는 표. 그때의 「대출」은 그냥 지출 항목이었다 */
var CAT_RENAMED_OLD = { 대출: '대출 상환' };
/* 이름만 바뀐 것이 아니라 성격이 바뀐 것 — 계산 밖에서 지출로 왔다.
   keepSet 에 옛 이름이 남아 있으면 새 이름이 그 자리를 물려받아
   지출 항목이 계산 밖에 남는다. 그 자리는 덜어낸다 */
var CAT_UNKEEP = { '대출 상환': 1 };
function migrateCats(o) {
  /* ★ 38차. baseCats 의 옛 차례를 「이름 바꾸기」보다 먼저 읽어둔다.
     먼저 바꿔버리면 칸이 줄거나 밀려 옛 차례를 못 알아본다 —
     그러면 「사업 외 용도」 자리에 「내가 넣은 돈」이 들어가는 식으로 어긋난다 */
  var renameMap = null;
  if (Array.isArray(o.baseCats) && o.cv !== CAT_CV) {
    /* ★ 57차. cv 2 는 길이가 16 으로 옛 판과 같아 길이로 못 가른다. cv 로 가른다 */
    /* ★ 63차. cv 3 도 마찬가지다 — 길이(14)로는 못 가른다 */
    var lg =
      o.cv === 4
        ? CAT_LEGACY_CV4
        : o.cv === 3
          ? CAT_LEGACY_CV3
          : o.cv === 2
            ? CAT_LEGACY_CV2
            : CAT_LEGACY[o.baseCats.length];
    renameMap = {};
    if (lg) {
      lg.forEach(function (orig, i) {
        if (o.baseCats[i] && o.baseCats[i] !== orig) renameMap[orig] = o.baseCats[i];
      });
    }
  }
  function applyRenames(map) {
    Object.keys(map).forEach(function (old) {
      var neu = map[old];
      ['accounts', 'keepSet'].forEach(function (k) {
        if (!Array.isArray(o[k])) return;
        var i = o[k].indexOf(old);
        if (i === -1) return;
        /* ★ 57차. 계산 밖에서 지출로 옮겨온 이름은 keepSet 에서 아예 덜어낸다 */
        if (k === 'keepSet' && CAT_UNKEEP[neu]) {
          o[k].splice(i, 1);
          return;
        }
        /* 새 이름이 이미 있으면 옛 칸을 덜어낸다. 안 그러면 두 이름이 같이 남는다 */
        if (o[k].indexOf(neu) === -1) o[k][i] = neu;
        else o[k].splice(i, 1);
      });
      Object.keys(o.picks || {}).forEach(function (raw) {
        if (o.picks[raw] === old) o.picks[raw] = neu;
        /* 방향별로 저장된 것도 같이 따라간다 (35차 B) */
        var v = o.picks[raw];
        if (v && typeof v === 'object') {
          if (v['입금'] === old) v['입금'] = neu;
          if (v['출금'] === old) v['출금'] = neu;
        }
      });
    });
  }
  /* ★ 63차. 옛 「대출」(그냥 지출 항목)을 먼저 치운다. 지금의 「대출」은 계산 밖이라
     이 둘이 같은 표에 있으면 새 이름이 곧바로 지출로 끌려간다 */
  if (!(o.cv >= 3)) applyRenames(CAT_RENAMED_OLD);
  applyRenames(CAT_RENAMED);
  /* ── 38차 · baseCats 를 이름으로 옮겨 붙인다 ─────────────────
     ★ 자리로 맞추던 것을 그만둔다. 항목을 빼거나 넣거나 차례를 바꾸면
       그 뒤가 전부 밀려 엉뚱한 이름이 나온다 (36차에 한 번 그럴 뻔했다).
     위에서 미리 읽어둔 renameMap(원래 이름 → 사장님이 고친 이름)을 지금 차례로 다시 세운다.
     cv:2 가 붙은 것은 이미 지금 차례라 손대지 않는다 */
  if (renameMap) {
    /* 없어진 항목의 이름을 고쳐 쓰고 계셨으면 그 이름을 물려받을 항목에 넘긴다 —
       조용히 사라지면 그 항목으로 찍어둔 분류가 갈 곳을 잃는다 */
    Object.keys(renameMap).forEach(function (orig) {
      if (UP_CATS.indexOf(orig) !== -1) return;
      var neu = CAT_RENAMED[orig];
      if (neu && renameMap[neu] === undefined) renameMap[neu] = renameMap[orig];
    });
    o.baseCats = UP_CATS.map(function (c) {
      return renameMap[c] || c;
    });
    o.cv = CAT_CV;
  }
  /* 그 판에는 아예 없던 항목만 더한다. 사장님이 손수 지우신 것은 되살리지 않는다 */
  if (Array.isArray(o.accounts)) {
    var had = {};
    [15, 16, 17].forEach(function (n) {
      (CAT_LEGACY[n] || []).forEach(function (c) {
        had[c] = 1;
      });
    });
    CAT_LEGACY_CV2.forEach(function (c) {
      had[c] = 1;
    }); /* 57차 */
    CAT_LEGACY_CV3.forEach(function (c) {
      had[c] = 1;
    }); /* 63차 */
    CAT_LEGACY_CV4.forEach(function (c) {
      had[c] = 1;
    }); /* 75차 */
    /* ★ 63차. 이름만 옮긴 항목은 옛 판에 있던 것이다.
       안 그러면 「공과금」을 손수 지우신 분께 「전기·가스·수도」가 되살아난다 */
    Object.keys(CAT_RENAMED).forEach(function (old) {
      if (had[old]) had[CAT_RENAMED[old]] = 1;
    });
    UP_CATS.forEach(function (c) {
      if (had[c]) return; /* 옛 판에도 있던 것 */
      if (o.accounts.indexOf(c) === -1) o.accounts.push(c);
      if (Array.isArray(o.keepSet) && UP_KEEP.indexOf(c) !== -1 && o.keepSet.indexOf(c) === -1)
        o.keepSet.push(c);
    });
    /* 75차 전의 묶음 항목은 새 기본 목록에서는 없앤다.
       다만 실제 저장 분류가 남아 있으면 조용히 버리지 않고 옛 항목으로 보존한다. */
    var legacyUsed = false;
    Object.keys(o.picks || {}).forEach(function (raw) {
      var v = o.picks[raw];
      if (
        v === '세금·보험' ||
        (v && typeof v === 'object' && (v['입금'] === '세금·보험' || v['출금'] === '세금·보험'))
      )
        legacyUsed = true;
    });
    if (!legacyUsed) {
      var oldTax = o.accounts.indexOf('세금·보험');
      if (oldTax !== -1) o.accounts.splice(oldTax, 1);
    }
  }
  /* ★ 63-2. 기본 항목은 baseCats 차례대로 다시 세운다.
     이름을 옮기면 그 항목이 있던 자리에 그대로 남는데, 옛 판에서 「대출받은 돈」은
     맨 끝이었다 — 그러면 되살린 매장에서만 「대출」이 목록 맨 아래에 홀로 있고
     「대출 상환」과 안 붙는다. 손수 만드신 항목은 뒤에 그대로 둔다 */
  if (Array.isArray(o.accounts) && Array.isArray(o.baseCats)) {
    var order = {};
    o.baseCats.forEach(function (c, i) {
      order[c] = i;
    });
    var base = [],
      extra = [];
    o.accounts.forEach(function (c) {
      if (order[c] !== undefined) base.push(c);
      else extra.push(c);
    });
    base.sort(function (a, b) {
      return order[a] - order[b];
    });
    o.accounts = base.concat(extra);
  }
  return o;
}

function loadPicks(name) {
  var raw = lsGet(storeKey(name));
  if (!raw) return null;
  try {
    var o = JSON.parse(raw);
    if (o && o.v === 1 && o.picks) return migrateCats(o);
  } catch (e) {}
  return null;
}

/* ── 36차 J · 직접 넣기 칸 ────────────────────────────────
   「현금 매출을 입력하게끔 그것도 해야 돼」 · 「그냥 텍스트로 적을 수 있게끔」
   항목 이름은 매장 단위로, 금액은 달 단위로 저장한다.
   ★ 「매달 같은 금액」 같은 선택지는 두지 않는다. 배달·현금은 달마다 다르다.
   ★ 계좌 잔액과 검산에는 절대 안 넣는다 —
     현금 매출은 계좌에 안 들어온 돈이라 검산에 넣으면 그 달이 통째로 안 나온다 */
function manualKey(name) {
  var s = String(name != null ? name : (UP && UP.store) || '').trim();
  return MANUAL_KEY + (s || '(기본)');
}
/* ── 83차 ① · 「현금매출」은 처음부터 있는 항목이다 ──────────────
   예전에는 대표님이 「＋ 항목 추가」를 눌러 이름을 손수 치셔야 했다.
   안내글에 「현금 매출」이라고 적혀 있었지만 그건 힌트일 뿐이라,
   이런 칸이 있는 줄도 모르고 지나치셨다.
   ★ items 에는 안 담는다. 화면에만 늘 있는 줄로 두고, 금액은 이 열쇠로 찾는다.
     그래서 아무것도 안 적으면 fc.manual 이 아예 안 생기고
     manualSum 이 예전과 똑같이 0을 돌려준다 (83차 ⑥) */
var CASH_ID = 'cash';
var CASH_NAME = '현금매출';
/* { v:2, items: [{id, name, side}],
     amounts: { '2023-07': { id: 금액 } },      ← 달 단위. 옛 판 그대로다
     days:    { '2023-07': [{id, day, amt}] } } ← 83차 ②. 날짜 있는 것만 여기
   ★ day 는 1~31 숫자다. 달은 이미 열쇠에 있으니 「그 달 안」이 저절로 지켜진다 */
function manualLoad(name) {
  try {
    var o = JSON.parse(lsGet(manualKey(name)) || 'null');
    if (o && typeof o === 'object') {
      o.amounts = o.amounts || {};
      o.items = o.items || [];
      if (manualShapeOk(o)) {
        /* ★ 83차 ②-3. 옛 판(v:1)은 빈 days 를 붙여 2로 올린다.
           적어두신 금액은 amounts 에 그대로 있어 하나도 안 사라진다 */
        if (o.v === 1) {
          o.days = {};
          o.v = 2;
        }
        return o;
      }
    }
  } catch (e) {}
  return { v: 2, items: [], amounts: {}, days: {} };
}
/* ── 저장 직전 모양 검사 ──
   fc.picks 를 지키는 hasNumber 의 짝이다. fc.manual 은 숫자를 담는 통이라
   hasNumber 를 쓸 수 없어, 대신 「모양이 이것뿐인가」를 본다.
     items   : id · name · side 세 글자 키만
     amounts : 달(YYYY-MM) → id → 숫자만
   거래내역이 실수로 흘러드는 길을 막는 것이 목적이다.
   모양이 다르면 저장하지 않는다 */
function manualShapeOk(m) {
  if (!m || typeof m !== 'object') return false;
  /* ★ 83차 ②-4. v:1(days 없음)과 v:2(days 있음)를 둘 다 통과시킨다.
     옛 저장분을 안 읽어버리면 적어두신 금액이 통째로 사라진다 */
  var 열쇠 = Object.keys(m).sort().join(',');
  if (m.v === 1) {
    if (열쇠 !== 'amounts,items,v') return false;
  } else if (m.v === 2) {
    if (열쇠 !== 'amounts,days,items,v') return false;
  } else return false;
  if (!Array.isArray(m.items)) return false;
  var okItem = true,
    ids = {};
  m.items.forEach(function (it) {
    if (!it || typeof it !== 'object') {
      okItem = false;
      return;
    }
    if (Object.keys(it).sort().join(',') !== 'id,name,side') {
      okItem = false;
      return;
    }
    if (typeof it.id !== 'string' || typeof it.name !== 'string') {
      okItem = false;
      return;
    }
    if (it.side !== 'in' && it.side !== 'out') {
      okItem = false;
      return;
    }
    ids[it.id] = 1;
  });
  if (!okItem) return false;
  if (!m.amounts || typeof m.amounts !== 'object' || Array.isArray(m.amounts)) return false;
  var okAmt = true;
  Object.keys(m.amounts).forEach(function (mo) {
    if (!/^[0-9]{4}-[0-9]{2}$/.test(mo)) {
      okAmt = false;
      return;
    }
    var box = m.amounts[mo];
    if (!box || typeof box !== 'object' || Array.isArray(box)) {
      okAmt = false;
      return;
    }
    Object.keys(box).forEach(function (id) {
      if (typeof box[id] !== 'number' || !isFinite(box[id])) okAmt = false;
    });
  });
  if (!okAmt) return false;
  /* ★ 83차 ②. days 도 amounts 와 같은 잣대로 본다 —
     거래내역이 실수로 흘러드는 길을 막는 것이 이 검사의 목적이다.
     칸은 id·day·amt 셋뿐이고, day 는 1~31 숫자, amt 는 숫자다 */
  if (m.v === 1) return true;
  if (!m.days || typeof m.days !== 'object' || Array.isArray(m.days)) return false;
  var okDay = true;
  Object.keys(m.days).forEach(function (mo) {
    if (!/^[0-9]{4}-[0-9]{2}$/.test(mo)) {
      okDay = false;
      return;
    }
    var arr = m.days[mo];
    if (!Array.isArray(arr)) {
      okDay = false;
      return;
    }
    arr.forEach(function (it) {
      if (!it || typeof it !== 'object') {
        okDay = false;
        return;
      }
      if (Object.keys(it).sort().join(',') !== 'amt,day,id') {
        okDay = false;
        return;
      }
      if (typeof it.id !== 'string') {
        okDay = false;
        return;
      }
      if (
        typeof it.day !== 'number' ||
        !isFinite(it.day) ||
        it.day < 1 ||
        it.day > 31 ||
        it.day !== Math.floor(it.day)
      ) {
        okDay = false;
        return;
      }
      if (typeof it.amt !== 'number' || !isFinite(it.amt)) okDay = false;
    });
  });
  return okDay;
}

/* ── 41차 5번 · 계좌 이름만 담는 저장통 ────────────────────
   40차에는 「저장통에 넣지 마세요」였는데, 매달 쓰는 앱에서 매달 다시 넣는 것이
   성가시다고 하셔서 되돌린다. 계좌 이름은 거래내역도 금액도 아니다.
   ★ 담는 것은 이름 글자 하나뿐이다. 잔액·거래·계좌번호는 절대 안 담는다.
   ★ 사장님이 「110-587 통장」처럼 숫자가 든 이름을 넣으실 수 있어
     fc.picks 와 통을 나눈다 — hasNumber 를 풀지 않으려는 것이다 (fc.manual 과 같은 뜻).
   ★ 되살릴 때는 은행 이름을 못 찾은 계좌에만 붙인다.
     자동으로 잡은 이름을 덮어쓰면 40차에 고친 「틀린 것을 확신 있게 말하는」 자리로 되돌아간다.
   ★ 파일 목록 화면은 매장 이름을 묻기 전이라 그때는 되살릴 수 없다.
     매장이 정해진 뒤(온보딩 시작)에 붙인다 */
var BANK_KEY = 'fc.banks.';
function bankKey(name) {
  var s = String(name != null ? name : (UP && UP.store) || '').trim();
  return BANK_KEY + (s || '(기본)');
}
/* 계좌를 가리키는 열쇠. 숫자는 통째로 뺀다 —
   내려받을 때마다 바뀌는 시각(20260824170405)이 붙어 있고,
   숫자를 열쇠에 담지 않는 편이 이 통의 뜻에 맞다 */
function bankNameKey(b) {
  var s = String((b.sheet || '') + '|' + (b.name || b.file || ''));
  return s.replace(/[0-9]/g, '').toLowerCase().slice(0, 80);
}
/* ── 63-1 · 같은 계좌면 저장된 매장으로 ─────────────────────────
   ★ 버그였다. 치과로 만들어 저장한 브라우저에서 병원 타일을 누르고 같은 파일을
     다시 올리면, 매장 이름을 새로 물었다. 이름을 안 적거나 다르게 적으면
     그 자리에서 새 매장이 되어 정해둔 것이 통째로 안 살아났다.
     실사용자는 전부 이 길을 밟는다 — 한 번 써 본 사람이 다시 올리는 것이 정상 사용이다.
   ★ 그래서 파일 쪽에서 매장을 알아낸다. 이미 있는 계좌 열쇠를 그대로 쓴다.
   ★ 저장이 타일을 이긴다 (62차 ②). 다만 말없이 이기지 않는다 — askKnownStore 가 말한다 */
/* 계좌 열쇠는 파일을 읽는 그 자리에서 한 번만 만들어 계좌에 붙여둔다.
   ★ 나중에 다시 만들면 그 사이에 b.bank 같은 칸이 바뀌어 값이 흔들릴 수 있다.
     저장할 때와 찾을 때가 한 글자라도 다르면 되살림이 조용히 안 된다 */
function bankKeyOf(b) {
  if (!b) return '';
  if (!b.acckey) b.acckey = bankNameKey(b);
  return b.acckey;
}
function bankKeysNow() {
  if (!UP || !UP.banks) return [];
  var out = [];
  UP.banks.forEach(function (b) {
    var k = bankKeyOf(b);
    if (k && out.indexOf(k) === -1) out.push(k);
  });
  return out;
}
/* 이 계좌들로 저장해둔 매장이 있는가.
   ★ 여럿이면 반드시 같은 답이 나와야 한다. 저장통을 훑는 차례(localStorage.key)는
     브라우저가 정하는 것이라 믿을 수 없다 — 실제로 같은 계좌를 여러 매장에 붙여 두면
     실행마다 다른 매장이 뽑혔다. 그래서 넷으로 줄 세운다.
       ① 이번 파일의 계좌를 더 많이 맞힌 매장
       ② 마지막에 저장하신 매장 (순번) — 사람이 뜻하는 「그 계좌의 주인」이 이것이다
       ③ 정해둔 곳이 많은 매장
       ④ 그래도 같으면 이름 차례 (마지막 못)
   ★ 하나라도 훑다가 깨져도 나머지는 본다 — 통 하나가 망가졌다고 되살림을 통째로 버리지 않는다 */
function storeForBanks(banks) {
  var want = {},
    any = false;
  (banks || []).forEach(function (b) {
    var k = bankKeyOf(b);
    if (k) {
      want[k] = 1;
      any = true;
    }
  });
  if (!any) return null;
  var keys = [];
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf(PICK_KEY) === 0) keys.push(key);
    }
  } catch (e) {
    return null;
  }
  var hits = [];
  keys.forEach(function (key) {
    var o;
    try {
      o = JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return;
    }
    if (!o || !o.picks || !Array.isArray(o.계좌)) return;
    var m = 0;
    o.계좌.forEach(function (k2) {
      if (want[k2]) m++;
    });
    if (!m) return;
    /* ★ 63-1 재수정. 예전에는 「정해둔 곳이 0이면 되살릴 것이 없다」고 건너뛰었다.
       그게 이 버그였다 — 매장 이름만 짓고 거래처는 한 곳도 안 정한 채 나가신 분이
       바로 그 「한 번 써 본 사람」이다. 그분이 같은 파일을 다시 올리면
       0곳이라는 이유로 못 알아보고 새 매장 이름을 또 물었다.
       ★ 되살릴 것은 분류만이 아니다 — 매장 이름·업종·항목·성함이 그 계좌에 붙어 있다.
         0곳이어도 그 계좌의 매장은 그 매장이다. 줄 세울 때만 뒤로 민다 */
    var n = typeof o.n곳 === 'number' && o.n곳 >= 0 ? o.n곳 : Object.keys(o.picks).length;
    var nm = key.slice(PICK_KEY.length);
    hits.push({
      key: key,
      name: nm === '(기본)' ? null : nm,
      label: nm,
      n: n,
      m: m,
      seq: typeof o.순번 === 'number' ? o.순번 : 0,
      /* ★ 71차 ④. 「이어서 하기」인데 성함을 또 물었다.
                   저장된 답을 여기서 같이 들고 온다 — 저장 모양은 안 건드린다.
                   읽기만 한다 (pickPayload 는 예전부터 owner 를 넣어 왔다).
                   ★ 「답이 없다」와 「건너뛰기로 답했다」는 다른 것이다 —
                     건너뛰신 분께 같은 질문을 또 하면 그것도 안 이어진 것이다.
                     그래서 값이 아니라 열쇠가 있는지로 가른다 */
      owner: typeof o.owner === 'string' && o.owner ? o.owner : null,
      owner답함: Object.prototype.hasOwnProperty.call(o, 'owner'),
      업종: o.업종 && TRADES[o.업종] ? o.업종 : TRADE_DEFAULT
    });
  });
  if (!hits.length) return null;
  hits.sort(function (a, b) {
    if (b.m !== a.m) return b.m - a.m;
    if (b.seq !== a.seq) return b.seq - a.seq;
    if (b.n !== a.n) return b.n - a.n;
    return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
  });
  return hits[0];
}
/* { v:1, names: { 열쇠: '이름' } } — 이 모양이 아니면 안 읽고 안 쓴다 */
function banksShapeOk(o) {
  if (!o || typeof o !== 'object') return false;
  if (o.v !== 1) return false;
  if (Object.keys(o).sort().join(',') !== 'names,v') return false;
  var n = o.names;
  if (!n || typeof n !== 'object' || Array.isArray(n)) return false;
  var keys = Object.keys(n);
  if (keys.length > 40) return false;
  var ok = true;
  keys.forEach(function (k) {
    if (typeof k !== 'string' || k.length > 80) {
      ok = false;
      return;
    }
    if (typeof n[k] !== 'string' || !n[k].length || n[k].length > 20) ok = false;
  });
  return ok;
}
function banksLoad(name) {
  try {
    var o = JSON.parse(lsGet(bankKey(name)) || 'null');
    if (banksShapeOk(o)) return o;
  } catch (e) {}
  return { v: 1, names: {} };
}
function banksSave() {
  if (!UP || UP.demo || !UP.banks || !UP.banks.length) return false;
  var box = banksLoad();
  UP.banks.forEach(function (b) {
    var t = String(b.typed || '').trim();
    if (!t || t.length > 20) return;
    box.names[bankNameKey(b)] = t;
  });
  if (!banksShapeOk(box)) return false; /* 모양이 다르면 저장하지 않는다 */
  return lsSet(bankKey(), JSON.stringify(box));
}
/* ── 45차 ⑥ · 매장을 고르기 전에도 계좌 이름을 되살린다 ─────────────
   41차에는 「그 화면이 매장 이름을 묻기 전이라 어느 저장통을 열지 모른다」고 두었다.
   그런데 사장님이 처음 보는 화면이 파일 목록이다. 거기서 「계좌 2」로 보인다.
   ★ 열쇠는 (시트 이름 + 파일 이름에서 숫자 뺀 것)이라 매장이 달라도 같은 파일이면 같다.
     그래서 fc.banks.* 를 통째로 훑어 같은 열쇠를 찾는다.
   ★ 여러 매장에 같은 열쇠가 있는데 이름이 서로 다르면 안 쓴다 —
     40차에 고친 「틀린 이름을 확신 있게 붙이는」 자리로 되돌아간다.
     하나로 모일 때만 쓴다. 모르는 것은 모른다고 둔다 */
function bankNameAnyStore(key) {
  var found = null,
    many = false;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(BANK_KEY) !== 0) continue;
      var o = null;
      try {
        o = JSON.parse(localStorage.getItem(k));
      } catch (e) {
        continue;
      }
      if (!banksShapeOk(o)) continue;
      var v = o.names[key];
      if (!v) continue;
      if (found === null) found = v;
      else if (found !== v) many = true;
    }
  } catch (e) {
    return null;
  }
  return many ? null : found; /* 서로 다르면 안 쓴다 */
}
function banksRestore() {
  if (!UP || UP.demo || !UP.banks || !UP.banks.length) return 0;
  var box = banksLoad(),
    n = 0;
  UP.banks.forEach(function (b) {
    if (b.found) return; /* 자동으로 잡은 이름은 안 건드린다 */
    if (b.typed) return; /* 이번에 직접 넣으신 것이 먼저다 */
    var v = box.names[bankNameKey(b)];
    if (!v) return;
    b.typed = v;
    b.bank = v;
    n++;
  });
  return n;
}

function manualSave() {
  if (!UP || UP.demo) return false;
  var m = UP.manual || { v: 2, items: [], amounts: {}, days: {} };
  m.days = m.days || {};
  m.v = 2;
  if (!manualShapeOk(m)) return false; /* 모양이 다르면 안 남긴다 */
  return lsSet(manualKey(), JSON.stringify(m));
}
/* 손대기 전에 통을 만든다. ★ 아무것도 안 적으면 이 함수가 안 불려
   fc.manual 이 아예 안 생긴다 (83차 ⑥) */
function manualBag() {
  UP.manual = UP.manual || { v: 2, items: [], amounts: {}, days: {} };
  UP.manual.days = UP.manual.days || {};
  return UP.manual;
}
function manualItems(side) {
  return ((UP.manual && UP.manual.items) || []).filter(function (it) {
    return it.side === side;
  });
}
function manualAmt(m, id) {
  var box = (UP.manual && UP.manual.amounts && UP.manual.amounts[m]) || {};
  return +box[id] || 0;
}
function manualSet(m, id, v) {
  manualBag();
  UP.manual.amounts[m] = UP.manual.amounts[m] || {};
  if (v) UP.manual.amounts[m][id] = v;
  else delete UP.manual.amounts[m][id];
  manualSave();
}
/* ── 83차 ② · 날짜 있는 것 ────────────────────────────────── */
function manualDays(m, id) {
  var arr = (UP.manual && UP.manual.days && UP.manual.days[m]) || [];
  return arr.filter(function (it) {
    return it.id === id;
  });
}
function manualDayAdd(m, id, day, amt) {
  manualBag();
  UP.manual.days[m] = UP.manual.days[m] || [];
  UP.manual.days[m].push({ id: id, day: day, amt: amt });
  UP.manual.days[m].sort(function (a, b) {
    return a.day - b.day;
  });
  manualSave();
}
function manualDayRemove(m, id, day, amt) {
  if (!UP.manual || !UP.manual.days || !UP.manual.days[m]) return;
  var arr = UP.manual.days[m],
    i;
  for (i = 0; i < arr.length; i++) {
    if (arr[i].id === id && arr[i].day === day && arr[i].amt === amt) {
      arr.splice(i, 1);
      break;
    }
  }
  if (!arr.length) delete UP.manual.days[m];
  manualSave();
}
/* ── 그 달에 직접 넣으신 합계 ──────────────────────────────────
   ★ 83차 ④. cutDay 가 있으면(진행 중인 달) 자를 둘로 쓴다.
     - 날짜 있는 것은 cutDay 까지만 더한다 — 계좌 거래를 자르는 자와 같다
     - 날짜 없이 달로만 적은 값은 안 더한다 —
        그 달 전체를 뜻하는 값이라 반쪽 달에 통째로 넣으면 거짓이 된다
   ★ 83차 ⑥. 아무것도 안 적으면 두 갈래 다 0이라 예전과 한 자리도 안 다르다 */
function manualSum(m, side, cutDay) {
  var s = 0,
    ids = manualItems(side).map(function (it) {
      return it.id;
    });
  if (side === 'in' && ids.indexOf(CASH_ID) === -1) ids.push(CASH_ID);
  ids.forEach(function (id) {
    if (!cutDay) s += manualAmt(m, id);
    manualDays(m, id).forEach(function (it) {
      if (cutDay && it.day > cutDay) return;
      s += +it.amt || 0;
    });
  });
  return s;
}
function manualAdd(name, side) {
  manualBag();
  var id = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
  UP.manual.items.push({ id: id, name: name, side: side });
  manualSave();
  return id;
}
/* 항목을 지워도 과거 달에 적힌 금액은 남긴다 (규칙 7) */
function manualRemove(id) {
  if (!UP.manual) return;
  UP.manual.items = UP.manual.items.filter(function (it) {
    return it.id !== id;
  });
  manualSave();
}
/* 아직 안 적으신 끝난 달이 몇 개인가 (규칙 3) */
function manualLeft(months) {
  if (!UP.manual || !UP.manual.items.length) return 0;
  var n = 0;
  (months || []).forEach(function (m) {
    if (isRunning(m, months)) return; /* 진행 중인 달은 안 센다 (규칙 2) */
    var any = false;
    UP.manual.items.forEach(function (it) {
      if (manualAmt(m, it.id)) any = true;
    });
    if (!any) n++;
  });
  return n;
}
