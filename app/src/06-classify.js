/* 계산은 core/compute.js 의 keyOfIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function keyOf(r) {
  return keyOfIn(UP, r);
}

/* 지금 매장(UP)의 규칙표로 거래처를 묶는다 — 계산은 core 의 groupPayeesWith */
function groupPayees(rows) {
  return groupPayeesWith(rows, UP && UP.merge);
}
