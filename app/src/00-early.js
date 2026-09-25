/* 처음부터 있어야 하는 함수들.
   ★ 리팩토링 2단계. 원래 한 <script> 였을 때는 모든 함수가 호이스팅되어 처음부터 있었다.
     파일을 나누자 앞 파일이 뒤 파일의 함수를 첫 화면에서 바로 써서, 그 함수만 여기로 옮겼다.
     내용은 한 글자도 바꾸지 않았다. 옮긴 이유는 tools/check-load-order.mjs 가 찾는다.
   ★ 이 함수들이 쓰는 변수(LS_OK, USE_KEY 등)는 제자리에 그대로 둔다 — 초기화 시점이 원래와 같아야 한다 */

/* ── 브라우저 저장소 읽기·쓰기 (원래 12-storage.js, PICK_KEY 아래)
   09 의 글씨 크기·카톡 안내가 첫 화면에서 부른다 */
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

/* ── (원래 12-storage.js, useEdit 아래)
   09 에서 document.addEventListener('DOMContentLoaded', useOpened) 로 등록하는 순간 이름이 있어야 한다 */
/* 앱을 연 날 — 하루에 한 번만 */
function useOpened() {
  useEdit(function (o) {
    var d = useDay();
    if (o.연날[o.연날.length - 1] !== d) o.연날.push(d);
  });
}
