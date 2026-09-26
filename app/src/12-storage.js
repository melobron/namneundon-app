/* ── 온보딩: 못정한 거래처를 금액 큰 순으로 하나씩 ── */
/* ── 사장님이 정한 분류만 이 브라우저에 남긴다 ──
   거래내역·금액·잔액은 어떤 경로로도 저장하지 않는다.
   자동으로 잡은 것은 규칙이 코드에 있으니 저장할 필요가 없다 */
/* 저장 이름 PICK_KEY 은 00-storage.js 에 모았다 */
/* ── 36차 J · 직접 넣기 ─────────────────────────────────────
   ★ 저장통을 나눈다. fc.picks 의 hasNumber 검사는 그대로 둔다 —
     그것이 A안을 코드로 강제해둔 장치다.
       fc.picks.<매장>    거래처 분류       숫자 0. hasNumber 검사 그대로
       fc.manual.<매장>   직접 적은 금액만   여기만 숫자를 허용한다
     fc.manual 은 pickPayload·내보내기에 들어가지 않는다.
   변호사 확인 — 사용자가 직접 입력한 숫자를 그 사람 브라우저에 남기는 것은 문제없다 */
/* 저장 이름 MANUAL_KEY 은 00-storage.js 에 모았다 */

var LS_OK = true; /* 시크릿 모드에서는 저장이 막힌다 — 앱은 그대로 돌아가야 한다 */
var LS_MSG = '이 브라우저에서는 저장이 안 됩니다. 매번 다시 정하셔야 합니다';

/* 저장소 읽기·쓰기 함수(lsGet · lsSet · lsDel …)와 저장 이름은 00-storage.js 에 모았다 */

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
/* 저장 이름 DATA_KEY 은 00-storage.js 에 모았다 */
/* 저장 이름 LAST_KEY 은 00-storage.js 에 모았다 */
/* ★ 105차 ④. 분석이 끝난 날짜 하나만 남긴다 (2026-09-19 요한 결정).
   ★ 파일을 고른 시각이 아니다 — 거래가 실제로 반영되고 결과 화면까지 간 날이다.
   ★ 「올리신 날」이 아니라 「분석한 날」이다. 같은 파일을 다시 분석할 수도 있다.
   ★ 「자료 기준일」과 다른 값이다 — 오늘 분석했어도 자료는 한 달 전 것일 수 있다.
   ★ 거래내역·금액·잔액은 저장하지 않는다. ■36 은 한 글자도 안 바뀐다.
     들어가는 값은 'YYYY-MM-DD' 열 글자뿐이고 서버로 가는 것은 없다.
   ★ 사업자등록이 나오면 이 날짜를 그대로 올리면 된다. 보내는 기준은 30일 이상 하나뿐이고,
     그건 화면 줄(늘 보인다)과 다른 것이다. 섞지 않는다 */
/* 저장 이름 LAST_RUN_KEY 은 00-storage.js 에 모았다 */
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
/* 계산은 core/saved.js 의 dataSigIn — 지금 매장(UP)을 넘긴다 */
function dataSig() {
  return dataSigIn(UP);
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
    var 저장열쇠 = lsKeys();
    for (var i = 0; i < 저장열쇠.length; i++) {
      var k = 저장열쇠[i];
      if (!k || k.indexOf(PICK_KEY) !== 0) continue;
      var o = null;
      try {
        o = lsReadJSON(k);
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
  lsRemove('fc_log');
} catch (e) {}
/* 저장 이름 USE_KEY 은 00-storage.js 에 모았다 */
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

function loadPicks(name) {
  var raw = lsGet(storeKey(name));
  if (!raw) return null;
  try {
    var o = JSON.parse(raw);
    if (o && o.v === 1 && o.picks) return migrateCats(o);
  } catch (e) {}
  return null;
}

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

/* 계산은 core/saved.js 의 bankKeysNowIn — 지금 매장(UP)을 넘긴다 */
function bankKeysNow() {
  return bankKeysNowIn(UP);
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
    var 저장열쇠 = lsKeys();
    for (var i = 0; i < 저장열쇠.length; i++) {
      var key = 저장열쇠[i];
      if (key && key.indexOf(PICK_KEY) === 0) keys.push(key);
    }
  } catch (e) {
    return null;
  }
  var hits = [];
  keys.forEach(function (key) {
    var o;
    try {
      o = lsReadJSON(key);
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
    var 저장열쇠 = lsKeys();
    for (var i = 0; i < 저장열쇠.length; i++) {
      var k = 저장열쇠[i];
      if (!k || k.indexOf(BANK_KEY) !== 0) continue;
      var o = null;
      try {
        o = lsReadJSON(k);
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
/* 계산은 core/compute.js 의 manualItemsIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function manualItems(side) {
  return manualItemsIn(UP, side);
}
/* 계산은 core/compute.js 의 manualAmtIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function manualAmt(m, id) {
  return manualAmtIn(UP, m, id);
}
function manualSet(m, id, v) {
  manualBag();
  UP.manual.amounts[m] = UP.manual.amounts[m] || {};
  if (v) UP.manual.amounts[m][id] = v;
  else delete UP.manual.amounts[m][id];
  manualSave();
}
/* 계산은 core/compute.js 의 manualDaysIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function manualDays(m, id) {
  return manualDaysIn(UP, m, id);
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
/* 계산은 core/compute.js 의 manualSumIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function manualSum(m, side, cutDay) {
  return manualSumIn(UP, m, side, cutDay);
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
/* 계산은 core/saved.js 의 manualLeftIn — 지금 매장(UP)을 넘긴다 */
function manualLeft(months) {
  return manualLeftIn(UP, months);
}
