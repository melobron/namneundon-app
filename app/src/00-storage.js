/* ── 브라우저 저장소 — 이 앱이 저장하는 모든 것 ──────────────────────
   ★ 리팩토링 B-2 (2026-09-25). 저장소(localStorage)에 닿는 코드는 이 파일에만 있다.
     나중에 「기기 저장 + 서버 동기화」로 바꿀 때 이 파일만 고치면 되게 하려는 것이다.
     다른 파일에서 localStorage 를 직접 쓰면 ESLint 가 막는다.
   ★ 저장 이름(열쇠)과 모양은 절대 바꾸지 않는다 — 바꾸면 사장님이 정해 둔 분류가 사라진다.
     각 통을 왜 이렇게 나눴는지는 원래 기능 자리의 주석에 그대로 있다 (아래 표의 「자세히」).

   저장 이름                 담는 것                          금액   자세히
   fc.picks.<매장>          거래처 분류 · 매장 설정            없음   12-storage.js (hasNumber 검사)
   fc.manual.<매장>         직접 적은 금액 (현금 매출 등)        있음   12-storage.js 36차 J
   fc.data.<매장>           거래내역 그 자체 (이 기기 전용)      있음   12-storage.js 91차 ①
   fc.banks.<매장>          계좌 부르는 이름                    없음   12-storage.js
   fc.plan.<매장>           예정 지출                          있음   16-due.js 116차 ⑪
   nd_lastrun.<매장>        분석이 끝난 날짜 (YYYY-MM-DD)       없음   12-storage.js 105차 ④
   fc.last                  마지막으로 연 매장 이름             없음
   fc.breaks                잔액 끊김 확인 카드의 답            없음   11-upload-flow.js 64-9
   fc_use                   사용 기록 (날짜·횟수만)             없음   12-storage.js
   fc.font                  글씨 크기 단                        없음   09-ui-panel-install.js 88차 ①
   fc.a2hs.later            「홈 화면 추가」 나중에              없음   09-ui-panel-install.js
   fc.inapp.later           「앱 안 브라우저」 안내 나중에        없음   09-ui-panel-install.js
   (fc_log)                 옛 로그 — 열 때 지운다 (39차)                12-storage.js

   탭 저장 (sessionStorage — 탭을 닫으면 사라진다)
   nd.analytics.v1          이용 단계 집계 — 판 · 홍보 글 코드 · 단계별 전송 시도 여부   없음   04-usage-events.js

   ★ 내보내기(분류 파일)에 들어가는 것은 fc.picks 하나다. 금액이 든 통은 이 기기 밖으로 안 나간다.
   ★ <매장> 이 비면 '(기본)' 이다. 이름을 고치면 renameStore 가 매장 통 여섯(storeKeysOf)을 함께 옮긴다 */

var PICK_KEY = 'fc.picks.';
var MANUAL_KEY = 'fc.manual.';
var DATA_KEY = 'fc.data.';
var LAST_KEY = 'fc.last'; /* 마지막으로 남긴 매장 — 열 때 어느 것부터 볼지 */
var LAST_RUN_KEY = 'nd_lastrun.';
var USE_KEY = 'fc_use';
var BANK_KEY = 'fc.banks.';
var BREAK_KEY = 'fc.breaks';
var FONT_KEY = 'fc.font';
var A2HS_KEY = 'fc.a2hs.later';
var INAPP_KEY = 'fc.inapp.later';
var PLAN_KEY = 'fc.plan.';
var USAGE_KEY = 'nd.analytics.v1'; /* sessionStorage — localStorage 가 아니다 */

/* 매장별 저장 이름 — 매장 이름이 없으면 지금 매장(UP.store), 그것도 없으면 '(기본)' */
function storeKey(name) {
  var s = String(name != null ? name : (UP && UP.store) || '').trim();
  return PICK_KEY + (s || '(기본)');
}
function manualKey(name) {
  var s = String(name != null ? name : (UP && UP.store) || '').trim();
  return MANUAL_KEY + (s || '(기본)');
}
function dataKey(name) {
  var s = String(name != null ? name : (UP && UP.store) || '').trim();
  return DATA_KEY + (s || '(기본)');
}
function lastRunKey(name) {
  var s = String(name != null ? name : (UP && UP.store) || '').trim();
  return LAST_RUN_KEY + (s || '(기본)');
}
function bankKey(name) {
  var s = String(name != null ? name : (UP && UP.store) || '').trim();
  return BANK_KEY + (s || '(기본)');
}
function planKey(name) {
  var s = String(name != null ? name : (UP && UP.store) || '').trim();
  return PLAN_KEY + (s || '(기본)');
}
/* ★ NAM-14·15 (2026-09-29). 매장 이름이 저장소에서 가리키는 값 — 위 열쇠들의 <매장> 자리,
   fc.last 에 적히는 값과 같다. 이름 둘이 같은 매장인지는 이것으로 견준다 */
function storeIdOf(name) {
  return String(name == null ? '' : name).trim() || '(기본)';
}
/* 한 매장의 통 여섯 — 이름을 고칠 때 함께 옮기는 것 전부. 차례도 옮기는 차례다 */
function storeKeysOf(name) {
  var s = storeIdOf(name);
  return [storeKey(s), manualKey(s), bankKey(s), dataKey(s), planKey(s), lastRunKey(s)];
}

/* ── 안전한 읽기·쓰기 — 저장이 막힌 브라우저(시크릿 모드 등)에서도 앱이 멈추지 않는다.
   실패하면 LS_OK 를 내리고 빈 값을 준다. LS_OK · LS_MSG 는 12-storage.js 제자리에 있다
   (초기화 시점이 원래와 같아야 한다). 대부분의 저장은 이 셋을 쓴다 */
function lsGet(k) {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    LS_OK = false;
    return null;
  }
}
function lsSet(k, v) {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch (e) {
    LS_OK = false;
    return false;
  }
}
function lsDel(k) {
  try {
    localStorage.removeItem(k);
    return true;
  } catch (e) {
    LS_OK = false;
    return false;
  }
}

/* ── 탭 저장 (sessionStorage) — NAM-20 이용 단계 집계만 쓴다 (2026-09-29).
   ★ 탭을 닫으면 사라지는 것이 목적이다. 방문자 번호를 만들지 않으려는 것이다.
   ★ 막혀 있어도 앱은 그대로 돈다. LS_OK 는 건드리지 않는다 — 분류 저장과 다른 일이다 */
function ssGet(k) {
  try {
    return sessionStorage.getItem(k);
  } catch (e) {
    return null;
  }
}
function ssSet(k, v) {
  try {
    sessionStorage.setItem(k, v);
    return true;
  } catch (e) {
    return false;
  }
}
/* ── ★ NAM-14·15 (2026-09-29). 여러 통을 한꺼번에 옮길 때 쓰는 것.
   lsGet 은 「못 읽음」과 「없음」이 둘 다 null 이라, 없다고 믿고 덮어쓰거나 지울 수 있다.
   이 셋은 실패를 결과로 돌려준다. LS_OK 는 앞선 오류로 이미 false 일 수 있어 그것만 보고 판단하지 않는다 */
function lsRead(k) {
  try {
    return { ok: true, v: localStorage.getItem(k) };
  } catch (e) {
    LS_OK = false;
    return { ok: false, v: null };
  }
}
/* [열쇠, 값] 들을 차례로 쓰고, 다 쓴 뒤 하나하나 다시 읽어 쓴 값과 같은지 본다.
   tried 에는 쓰려고 손댄 열쇠가 다 들어간다 — 실패하면 부르는 쪽이 이것만 정리한다 */
function lsWriteAll(pairs) {
  var tried = [];
  for (var i = 0; i < pairs.length; i++) {
    tried.push(pairs[i][0]);
    if (!lsSet(pairs[i][0], pairs[i][1])) return { ok: false, tried: tried };
  }
  for (var j = 0; j < pairs.length; j++) {
    var r = lsRead(pairs[j][0]);
    if (!r.ok || r.v !== pairs[j][1]) return { ok: false, tried: tried };
  }
  return { ok: true, tried: tried };
}
/* 열쇠들을 지우고 정말 없어졌는지 본다. 하나가 안 지워져도 나머지는 마저 지운다 */
function lsDropAll(keys) {
  var ok = true;
  keys.forEach(function (k) {
    if (!lsDel(k)) ok = false;
    var r = lsRead(k);
    if (!r.ok || r.v !== null) ok = false;
  });
  return ok;
}

/* ── 저장소 전체를 훑거나 한꺼번에 다루는 곳에 쓰는 것.
   ★ 이 셋은 실패를 삼키지 않는다 — 부르는 쪽의 try 가 받는다.
     원래 localStorage 를 직접 만지던 코드를 그대로 옮긴 것이라, 저장이 막혔을 때 어디서 멈추고
     무엇을 건너뛰는지가 원래와 같아야 한다 */
/* 지금 저장된 열쇠 전부 (훑는 도중에 바뀌지 않게 먼저 목록으로 뜬다) */
function lsKeys() {
  var out = [];
  for (var i = 0; i < localStorage.length; i++) out.push(localStorage.key(i));
  return out;
}
/* 읽어서 JSON 으로 푼다. 없으면 null, 모양이 깨졌으면 예외 */
function lsReadJSON(k) {
  return JSON.parse(localStorage.getItem(k));
}
function lsRemove(k) {
  localStorage.removeItem(k);
}
