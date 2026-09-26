/* ── core · 날짜 ──────────────────────────────────────────────
   ★ app/src/core/ 는 「순수한 계산」만 둔다 — 화면·저장소·바뀌는 전역(UP)에 닿지 않고,
     같은 입력이면 늘 같은 답을 낸다. 그래서 화면 없이 Node 에서도 돈다 (tests/core, 테스트베드 VDI).
     규칙은 tools/check-core.mjs 가 지킨다 (npm run check). */
/* ── (원래 14-compute.js) ── */
function dayNum(at) {
  return Math.floor(dayMs(at) / 86400000);
}
function dayMs(at) {
  return Date.UTC(+at.slice(0, 4), +at.slice(5, 7) - 1, +at.slice(8, 10));
}
