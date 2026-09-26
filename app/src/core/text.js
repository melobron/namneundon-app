/* ── core · 글자 도우미 — 조사(으로/로 · 이/가 · 은/는 · 을/를) · HTML 막기(escHtml).
   옛 02-text-loaders · 11-upload-flow 의 일부.
   단위 테스트: tests/core/files.spec.mjs
   리팩토링 B-1i (2026-09-26). */
/* ── (원래 02-text-loaders.js) ── */
/* 마이너스는 하이픈이 아니라 빼기 기호로 — 화면 어디서나 같게 보이게 */
/* ★ 2026-09-25 보안. 파일 이름·은행 이름처럼 밖에서 온 글자를 HTML 문자열에 넣을 때 쓴다.
   파일 이름이 <img src=x onerror=…>.xlsx 이면 그대로 넣는 순간 스크립트가 돈다.
   (el() 로 만드는 곳은 textContent 라 괜찮다 — innerHTML 에 넣는 곳만 이것을 거친다) */
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
/* 조사: 받침 없거나 'ㄹ'이면 "로", 아니면 "으로" (공과금으로 / 인건비로) */
function ro(word) {
  var c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return '로';
  var jong = (c - 0xac00) % 28;
  return jong === 0 || jong === 8 ? '로' : '으로';
}
/* 받침이 있으면 '이', 없으면 '가' */
function ga(word) {
  var c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return '가';
  return (c - 0xac00) % 28 === 0 ? '가' : '이';
}
/* 받침이 있으면 '은', 없으면 '는' */
function neun(word) {
  var c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return '는';
  return (c - 0xac00) % 28 === 0 ? '는' : '은';
}
/* 받침이 있으면 '을', 없으면 '를' */
function eul(word) {
  var c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return '를';
  return (c - 0xac00) % 28 === 0 ? '를' : '을';
}
/* ── (원래 11-upload-flow.js) ── */
/* 받침이 있으면 「은」, 없으면 「는」. 「하나은행은」 / 「새마을금고는」 */
/* ★ 109차 ②. 단추 이름이 상황마다 달라지면 조사도 같이 달라진다.
   은는() 과 같은 방식이다 — 마지막 글자의 받침만 본다.
   ★ 112차 ②㉯ 뒤로 확인 카드의 빼는 단추는 이름이 하나뿐이라(「확인 필요로 분류」)
     그 자리에서는 안 쓴다. 이름을 끼워 넣는 다음 문장을 위해 남겨 둔다 */
function 을를(s) {
  var c = String(s || '').charCodeAt(String(s).length - 1) - 0xac00;
  if (!(c >= 0 && c <= 11171)) return '를';
  return c % 28 ? '을' : '를';
}
function 은는(s) {
  var c = String(s || '').charCodeAt(String(s).length - 1) - 0xac00;
  if (!(c >= 0 && c <= 11171)) return '는';
  return c % 28 ? '은' : '는';
}
