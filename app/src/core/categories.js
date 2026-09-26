/* ── core · 항목(카테고리) 이름 — 업종별 기본 항목 · 잠긴 항목 · 같은 이름 찾기 · 항목을 쓰는 거래처.
   옛 07-state-categories 의 일부. 매장 자료(UP)를 읽는 것은 fIn(U, …).
   단위 테스트: tests/core/saved.spec.mjs
   리팩토링 B-1i (2026-09-26). */
/* ── (원래 07-state-categories.js) ── */
/* ── 62차 ② · 업종 다섯 (64-4차에 카페가 붙었다) ───────────────────────────────────────────
   식당만이 아니다. 치과·병원·약국도 계좌 하나로 하신다.
   ★ UP_CATS 는 안 건드린다. 업종은 「이름 바꾸기 + 감추기 + 더하기」로만 만든다 —
     앱에 이미 있는 장치 셋이다 (baseCats · hidden · accounts).
     새 항목표를 따로 만들면 baseName 이 자리로 맞추는 구조가 통째로 흔들린다
     (36차에 한 칸 밀려 엉뚱한 이름이 나올 뻔했고, 57차에 cv 를 3으로 올린 자리다).
   ★ 그래서 저장통 구조도 그대로다 — baseCats 가 매장에 붙어 저장되므로
     식당 매장과 치과 매장이 한 브라우저에서 안 섞인다.
   ★ 저장된 매장을 되살릴 때는 저장된 항목이 이긴다 (타일에서 뭘 누르셨든).
   ★ 자동분류 낱말은 다섯 업종 다 업종과 상관없는 것만 쓴다 —
     덴탈·기공·메디·팜 같은 낱말은 실파일로 확인한 적이 없어 안 넣는다.
   ★ 치과·병원·약국 항목은 실측이 없는 초안이다. 항목 관리로 고치실 수 있다
   ★ 103차 ④. 2026-09-19 요한 결정 — 「준비 중」 딱지를 뗀다.
     초안인 것은 그대로지만, 그것이 쓰지 못할 까닭은 아니다.
     딱지가 실제로 막은 것은 없었고(누르면 그대로 갔다) 안 쓰셔도 될 것처럼 보이게만 했다.
     업종별 실물 검증은 개방의 선행 조건이 아니다 — 쓰시면서 나온 문제를 뒤 회차로 고친다.
     카드고지는 딱지가 아니라 사실 고지라 그대로 둔다 (원장님 통화에서 확인된 한계) */
var TRADES = {
  식당: {
    주인: '대표님',
    곳: '매장',
    바꿈: {},
    감춤: [],
    더함: [],
    설명: { 소모품: '쓰고 나면 없어지는 것 — 포장재·주방용품' },
    비율이름: '원가율',
    비율각주: '원가율 = 식자재와 주류·음료를 합한 금액 ÷ 그 달 매출',
    준비중: false,
    카드고지: false
  },
  /* ★ 64-4차. 카페는 식당과 같은 F&B 구조다 — 이름만 바꿔 세운다.
     준비중 딱지를 안 붙인다: 병원·치과·약국과 달리 항목이 초안이 아니다 */
  카페: {
    주인: '대표님',
    곳: '매장',
    바꿈: { 식자재: '원두·재료', '주류·음료': '베이커리·디저트' },
    감춤: [],
    더함: [],
    설명: {
      '원두·재료': '원두·우유·시럽 등 음료 만드는 재료 산 돈',
      '베이커리·디저트': '케이크·빵 등 납품받은 돈',
      소모품: '컵·빨대·홀더·포장재'
    },
    비율이름: '원가율',
    비율각주: '원가율 = 원두·재료와 베이커리·디저트를 합한 금액 ÷ 그 달 매출',
    준비중: false,
    카드고지: false
  },
  병원: {
    주인: '원장님',
    곳: '병원',
    바꿈: { 식자재: '재료비', '주류·음료': '약제·주사제', 월세: '임차료' },
    감춤: [],
    더함: ['장비 리스'],
    설명: {
      재료비: '진료에 쓰는 재료 산 돈',
      '약제·주사제': '약과 주사제 산 돈',
      임차료: '진료실 세로 낸 돈. 관리비도 여기에'
    },
    비율이름: '재료·약제 비율',
    비율각주: '재료·약제 비율 = 재료비와 약제·주사제를 합한 금액 ÷ 그 달 매출',
    준비중: false,
    카드고지: true
  },
  치과: {
    주인: '원장님',
    곳: '치과',
    바꿈: { 식자재: '재료비', '주류·음료': '기공료', 월세: '임차료' },
    감춤: [],
    더함: ['장비 리스'],
    설명: {
      재료비: '진료에 쓰는 재료 산 돈',
      기공료: '기공소에 낸 돈',
      임차료: '진료실 세로 낸 돈. 관리비도 여기에'
    },
    비율이름: '재료·기공 비율',
    비율각주: '재료·기공 비율 = 재료비와 기공료를 합한 금액 ÷ 그 달 매출',
    준비중: false,
    카드고지: true
  },
  약국: {
    주인: '약사님',
    곳: '약국',
    바꿈: { 식자재: '의약품 매입', 월세: '임차료' },
    감춤: ['주류·음료'],
    더함: [],
    설명: { '의약품 매입': '약 사들이는 데 쓴 돈', 임차료: '약국 세로 낸 돈. 관리비도 여기에' },
    비율이름: '매입 비율',
    비율각주: '매입 비율 = 의약품 매입 ÷ 그 달 매출',
    준비중: false,
    카드고지: false
  },
  /* ★ 66-13차 · 미용실. 64-4차에 카페를 넣은 방식 그대로다 —
     UP_CATS 는 안 건드리고 「이름 바꾸기 + 감추기」로만 만든다.
     ★ 「광고·예약 수수료」는 새 항목이 아니라 「광고비」 자리의 이름이다.
       네이버예약·카카오헤어샵 정산과 광고비가 한 계좌에 정기적으로 찍히는 업종이라
       그 자리를 그 이름으로 부르는 것이 맞다. 자리를 늘리면 baseCats 가 밀린다.
     ★ 항목 낱말은 아직 실측이 없는 판이다. 미용실 대표님 인터뷰 뒤에 다듬는다.
     ★ 카페처럼 「준비 중」을 안 붙인다 — 바로 열린다 */
  미용실: {
    주인: '대표님',
    곳: '미용실',
    바꿈: { 식자재: '시술 재료', 월세: '임차료', 광고비: '광고·예약 수수료' },
    감춤: ['주류·음료'],
    더함: [],
    설명: {
      '시술 재료': '염색약·펌약·샴푸처럼 시술에 쓰는 재료',
      임차료: '미용실 세로 낸 돈. 관리비도 여기에',
      '광고·예약 수수료': '예약 앱 정산 수수료와 광고에 쓴 돈'
    },
    비율이름: '재료 비율',
    비율각주: '재료 비율 = 시술 재료 ÷ 그 달 매출',
    준비중: false,
    카드고지: false
  }
};
var TRADE_DEFAULT = '식당';
/* 그 업종의 기본 항목 — UP_CATS 를 이름만 바꿔 세운다 (자리는 그대로) */
function tradeCats(name) {
  var t = TRADES[name] || TRADES[TRADE_DEFAULT];
  return UP_CATS.map(function (c) {
    return t.바꿈[c] || c;
  });
}
function tradeKeep(name) {
  var t = TRADES[name] || TRADES[TRADE_DEFAULT];
  return UP_KEEP.map(function (c) {
    return t.바꿈[c] || c;
  });
}
/* 항목은 이름으로 구분하지만, 이름을 바꿔도 성격은 따라가야 한다.
   그래서 「기본 항목인가」와 「이익 계산에서 빼는가」를 이름 목록으로 따로 들고 있다가
   이름이 바뀌면 그 목록도 같이 고친다 (renameCat) */
/* autoCategory 가 스스로 내놓는 항목. 지우면 다음 달 파일에서 되살아나는데
   고르는 목록에는 없어서 사장님이 손을 못 대는 항목이 된다.
   「기타」는 옮길 곳이 없어지고, 이익 계산 제외 넷은 손익이 무너진다 */
var CAT_LOCKED = ['매출', '세금', '보험', '전기·가스·수도', '대출 상환'];
function isLocked(c) {
  if (CAT_LOCKED.indexOf(c) !== -1) return true;
  var i = UP_CATS.indexOf(c);
  return i !== -1 && CAT_LOCKED.indexOf(UP_CATS[i]) !== -1;
}
function isBaseIn(U, c) {
  return (U && U.baseCats ? U.baseCats : UP_CATS).indexOf(c) !== -1;
}
/* 공백·기호를 뗀 비교용 이름 — 「주류 음료」와 「주류·음료」를 같은 것으로 본다 */
function normName(s) {
  return s.replace(/[\s·.,\-_/()]/g, '').toLowerCase();
}
function allCatNamesIn(U) {
  return U.accounts.concat(['매출']);
}
/* 이미 있는 항목인지 — 똑같으면 exact, 기호만 다르면 비슷한 것으로 본다 */
function findSameIn(U, name) {
  var all = allCatNamesIn(U),
    i;
  for (i = 0; i < all.length; i++) if (all[i] === name) return { hit: all[i], exact: true };
  for (i = 0; i < all.length; i++) {
    if (normName(all[i]) === normName(name)) return { hit: all[i], exact: false };
  }
  return null;
}
/* 그 항목으로 찍은 거래처 몇 곳 · 거래 몇 건 */
function catUseIn(U, name) {
  var n = 0,
    places = 0;
  U.payees.forEach(function (g) {
    if (gCats(g).indexOf(name) !== -1) places++;
  });
  /* ★ 63-3. catOf 는 방향으로 갈린 이름을 돌려준다 —
     「사업 외 용도」로 정하신 거래는 줄마다 「내가 넣은 돈」·「내가 가져간 돈」이 된다.
     그것만 세면 「1곳 · 0건」이 되어 곳 수와 건수가 서로 다른 말을 한다.
     정하신 항목과 갈려 나온 이름을 둘 다 본다 */
  U.rows.forEach(function (r) {
    var c = gCatFor(U.byName[keyOfIn(U, r)], r.amount > 0);
    if (c === name || (c && sideOfIn(U, c, r.amount > 0) === name)) n++;
  });
  return { places: places, rows: n };
}
/* ★ 69차 ①. 그 항목으로 정해둔 거래처를 하나하나 — 항목 관리에서 펼쳐 보는 목록.
   ★ 세는 규칙은 바로 위 catUse 와 한 글자도 다르면 안 된다.
     알약에 적힌 「N곳 · M건」과 펼친 목록이 어긋나면 둘 중 하나는 거짓말이 된다.
     그래서 곳은 gCats, 건은 gCatFor + sideOf — catUse 가 쓰는 그 판정을 그대로 쓴다
     (63-3 「사업 외 용도」가 방향 따라 이름이 갈리는 것까지 같이 따라간다).
   ★ 계산에는 손대지 않는다. 이미 정해진 것을 다시 세어 보여주기만 한다 */
function catPayeeListIn(U, name) {
  var map = {},
    out = [];
  var 담기 = function (key) {
    if (!map[key]) {
      map[key] = { name: key, g: U.byName[key], sum: 0, n: 0 };
      out.push(map[key]);
    }
    return map[key];
  };
  /* 곳 — catUse 의 places 와 같은 판정 */
  U.payees.forEach(function (g) {
    if (gCats(g).indexOf(name) !== -1) 담기(g.name);
  });
  /* 건과 합계 — catUse 의 rows 와 같은 판정 */
  U.rows.forEach(function (r) {
    var key = keyOfIn(U, r);
    var c = gCatFor(U.byName[key], r.amount > 0);
    if (c === name || (c && sideOfIn(U, c, r.amount > 0) === name)) {
      var e = 담기(key);
      e.n++;
      e.sum += r.amount;
    }
  });
  /* 큰 금액부터 — 어디에 많이 나갔는지가 먼저 보여야 한다 */
  out.sort(function (a, b) {
    return Math.abs(b.sum) - Math.abs(a.sum);
  });
  return out;
}
