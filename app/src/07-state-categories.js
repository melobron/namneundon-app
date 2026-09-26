/* ── 화면 ── */
var UP = null; /* 지금 올린 파일의 상태. 창을 닫으면 사라진다 */

/* ★ 38차. baseCats 는 UP_CATS 와 자리를 맞춰 저장된다.
   36차에 한 칸 빠졌을 때 그 뒤가 전부 밀려 「투자받은 돈」이 「내가 가져간 돈」으로
   보일 뻔했다. 이번엔 빼고·넣고·차례까지 바꾸므로 자리로 맞추는 것을 그만둔다.
   옛 판은 「그때의 차례」로 이름을 읽어낸 뒤 지금 차례로 다시 세운다.
   새로 저장하는 것부터는 cv:2 를 달아 이 일을 두 번 안 한다 */
/* ★ 57차. cv 를 3 으로 올린다 — UP_CATS 에서 셋이 빠지고 하나가 들어와
   자리가 통째로 밀렸다. cv 2 로 저장된 것은 아래 표로 이름을 읽어낸 뒤
   지금 차례로 다시 세운다. 길이(16)가 옛 판과 같아서 길이로는 못 가른다 */
/* ★ 63차. cv 를 4 로 올린다 — 「내가 넣은 돈」이 목록에서 빠지고
   「대출받은 돈」이 「대출」로 이름을 옮기며 자리가 또 밀렸다 */
var CAT_CV = 5;
var CAT_LEGACY_CV4 = [
  '사업 외 용도',
  '식자재',
  '주류·음료',
  '인건비',
  '월세',
  '전기·가스·수도',
  '세금·보험',
  '소모품',
  '수수료',
  '대출 상환',
  '대출',
  '광고비',
  '기타'
];
var CAT_LEGACY_CV3 = [
  '사업 외 용도',
  '식자재',
  '주류·음료',
  '인건비',
  '월세',
  '공과금',
  '세금·보험',
  '소모품',
  '수수료',
  '대출 상환',
  '광고비',
  '기타',
  '내가 넣은 돈',
  '대출받은 돈'
];
var CAT_LEGACY_CV2 = [
  '사업 외 용도',
  '식자재',
  '주류·음료',
  '인건비',
  '월세',
  '공과금',
  '세금·보험',
  '소모품',
  '수수료',
  '대출',
  '대출이자',
  '광고비',
  '기타',
  '내가 넣은 돈',
  '은행 원금 상환',
  '대출받은 돈'
];
var CAT_LEGACY = {
  15: [
    '식자재',
    '주류·음료',
    '인건비',
    '월세',
    '공과금',
    '세금·보험',
    '소모품',
    '수수료',
    '대출이자',
    '광고비',
    '기타',
    '내가 가져간 돈',
    '투자받은 돈',
    '내가 넣은 돈',
    '은행 원금 상환'
  ],
  17: [
    '식자재',
    '주류·음료',
    '인건비',
    '월세',
    '공과금',
    '세금·보험',
    '소모품',
    '수수료',
    '대출이자',
    '광고비',
    '기타',
    '내가 가져간 돈',
    '투자받은 돈',
    '내가 넣은 돈',
    '은행 원금 상환',
    '대출받은 돈',
    '사업 외 용도'
  ],
  16: [
    '식자재',
    '주류·음료',
    '인건비',
    '월세',
    '공과금',
    '세금·보험',
    '소모품',
    '수수료',
    '대출이자',
    '광고비',
    '기타',
    '투자받은 돈',
    '내가 넣은 돈',
    '은행 원금 상환',
    '대출받은 돈',
    '사업 외 용도'
  ]
};

/* 대출이자와 대출 상환은 섞이면 안 된다.
   원금 500만원을 갚은 것을 비용으로 잡으면 멀쩡한 달이 적자로 보인다 */
/* ★ 「이익」과 「뺀다」를 한 문장에 같이 쓰지 않는다 (35차 A).
   「이익에서 뺍니다」를 사장님이 「내 이익이 깎인다」로 읽으시고
   정반대로 「기타」에 찍으셨다. 기타는 지출이라 순이익이 실제로 깎였다.
   말은 언제나 「매출에/지출에 넣지 않습니다」로 한다 */
/* ★ 63-5. 몇 개만 설명이 있으면, 설명 없는 항목은 「설명할 것도 없이 뻔한 것」으로
   읽힌다. 안 해보신 분께는 하나도 안 뻔하다. 전부 한 줄씩 붙인다.
   ★ 한 줄은 「무슨 돈인가」다. 「어디에 쓰는 항목인가」가 아니다 */
var CAT_NOTE = {
  '사업 외 용도': '사업과 상관없이 오간 돈. 매출에도 지출에도 넣지 않습니다',
  식자재: '재료 사는 데 쓴 돈',
  '주류·음료': '술·음료 사는 데 쓴 돈',
  인건비: '직원 급여·상여·아르바이트 삯',
  월세: '한 달 세로 낸 돈. 관리비도 여기에',
  '전기·가스·수도': '통신 요금도 여기에',
  세금: '국세·지방세처럼 나라나 지방자치단체에 낸 돈',
  보험: '4대보험·화재보험처럼 보험으로 낸 돈',
  세무기장료: '세무사·세무법인에 기장 업무로 낸 돈',
  소모품: '쓰고 나면 없어지는 것을 산 돈',
  수수료: '카드사·배달앱·은행이 떼어간 돈',
  '대출 상환': '은행에 갚은 돈. 원금과 이자를 나누실 필요는 없습니다',
  대출: '은행에서 빌린 돈. 나간 돈은 「대출 상환」으로 갑니다',
  광고비: '광고·홍보에 쓴 돈',
  기타: '어디에도 안 맞는 사업 지출',
  '장비 리스': '장비를 빌려 쓰고 다달이 내는 돈'
};
/* 이름을 바꿔도 설명은 따라간다.
   ★ 63-5. 업종마다 뜻이 다른 자리는 그 업종의 설명이 먼저다 —
     치과의 「기공료」에 술·음료 이야기를 붙일 수는 없다 */
function noteFor(name) {
  var t = TRADES[tradeNow()];
  if (t && t.설명 && t.설명[name]) return t.설명[name];
  var list = UP && UP.baseCats ? UP.baseCats : UP_CATS;
  var i = list.indexOf(name);
  var orig = i >= 0 ? UP_CATS[i] : name;
  return CAT_NOTE[orig] || (isKeep(name) ? '매출에도 지출에도 넣지 않습니다' : null);
}
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
var TRADE_ORDER = ['식당', '카페', '병원', '치과', '약국', '미용실'];
var TRADE_DEFAULT = '식당';
/* 어느 업종으로 보고 있는가. 저장된 매장을 되살리면 저장된 항목이 이긴다 */
/* ★ 62-2차 ⑥. 타일에서 고른 업종을 여기 들고 있는다.
   예전에는 setTrade 가 UP.trade 에만 넣었는데, 타일을 누르는 시점에는
   아직 파일을 안 올려서 UP 이 null 이다 — 고른 업종이 그대로 사라지고
   새 매장이 늘 식당 항목으로 만들어졌다. 부르는 말(BIZ)만 바뀌어서 안 보였다.
   ★ 저장된 매장을 열면 그 매장의 업종이 이긴다 (UP.trade) */
var TRADE_PICKED = null;
function tradeNow() {
  var t = (UP && UP.trade) || TRADE_PICKED;
  return TRADES[t] ? t : TRADE_DEFAULT;
}
function tradeInfo() {
  return TRADES[tradeNow()];
}
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
/* 부르는 말을 업종에 맞춘다. 정적 화면의 {{주인}}·{{곳}} 은 이미 채워졌으므로
   원본을 들고 있다가 다시 채운다 */
var BIZ_RAW = null;
function setTrade(name) {
  if (!TRADES[name]) name = TRADE_DEFAULT;
  BIZ.주인 = TRADES[name].주인;
  BIZ.곳 = TRADES[name].곳;
  refillBiz();
  TRADE_PICKED = name; /* ★ 62-2차 ⑥. UP 이 아직 없어도 남는다 */
  if (UP) UP.trade = name;
}

/* ── 64-5차 · 브랜드 「남는돈」 마크 ─────────────────────────
   TRADE_ICON 과 같은 방식으로 data URI 로 박아 넣는다 (A안 — 외부 URL 금지).
   글꼴(주아체)은 안 넣는다 — 2MB급이라 용량이 안 맞는다. 로고는 이미지로 충분하다.
   ★ 표시 크기의 2배(64px)로 넣어 레티나에서 안 뭉개지게 한다.
   ★ 쓰는 자리는 둘뿐이다 — 시작 화면 환영 자리, 다 정하셨을 때 (요청서 4) */
var BRAND_MARK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAwHSURBVHhe7ZuLV9VVFsf7H2ZNTeWjl01l2qxpzUxjb81MRUFFKtPMR2rjVL4AuYA88gWi4qCOpICAL1IRRRFM862gImo1aqjlo3wUaSBP4e5Zn3354e0ncO+PC0rLDuu7+PE75+zXOfucffb5cU/HcN/TT0f6FXUM972rUKvz6Xs6hvuWdJ7+tnT65M27CuiM7higiBdPhw+8q4DO6P67AX43wO8G8MwAT4X5yp9D+8kjtj7SfnJvaRfYq0UBD3jBE95medyFxwZ4NLivtA3sKY+H+kiXme/JwPgAGZU6VT5cFSUfrYpuEUAbHvCC5+MhPioDspjlc4UmGwBmjEKv/3woMVtSZHdhvpz7+aKUVFyXGzU3xC41ImJv9h8HzRrlAS94whsZkAWZrBjCsgGeChug1u4+9wNJO5Qj18qKhVJjr5ayqnIpqSiV4orr8kt5SYsCHvCCJ7wpyLLyYLZ0nztGZURWs/xmuG2ATuED1d8eDvKSyI2fyk/XryrT0sqyW4S7U0AWCrKFbViksiIzspv1sWQACDwe2k99LWV/pjKpuFEh1+oR4k4DmZCNkrw/U2VG9oaM4JYBngjtLx1CvGXt4a1KGN8zM25tQEbK2vytKjs6mPVyywAdw32l3eResmjnGiV4O/y7uYCslP/uXK06oItZP5cGoOOI5Ahdda9Xlt7CpClgdKqqq3RFd94pjL+pa65Zdr2yTGUfnhwu7Sf3ukW/Rg3wxJT+0jnyTfny+0KptlffQtwqjEWKlbvg/AlJ3LteorKTxH9NrASsidVn3h05f0LK1Y/tqoCZjlUgOzqgCzq5bQC2Etu6+Sq0magVFJczFe36nLJ/owYwBn1zhMe7TuF+4vdpoKTmbtI+9IWGma4VUIIz5it9twzw1JQB8mTYADl09muPRp8RpGR9tUd6x32kAjwU5CVPTml4j6aONrSlT9aXe5SGJ7MBHQ5997XSRjeXBiDOZqSM4MZM0B2UVpVJVU2VzN26TPdkcFNJx87yWLC3dKiFPod4a53RDkPQL3brcl0boGnm4w7QobSyXHVCN5cGwPozspOaPP2vV5Sq1Zl2D/i/rkoxtRkBFP3btMHis3CCjF42VSasnq3gmXfU0Ya2jj795QH/HhKSsUBpQtvMzx1QZmYn/coNGjRA+6Dekn54W53vWgX9FmxPkwcD3tCQFEUISv4S+ZaMTI2Uhbs+kxUHN8vS3A0Sv3utgmfeLdz5mYxMiZRnIt/SPvSFRpvAN5SmJzIRy7QPurkb1GsAmGH1vacKpLrGuv/b7TWyqzBfR5FVFwU6hPjI81HDJXpLsqw6lCMzshNlUEKwdJ09Sv4+fYiC50EJNq1blZ8j0VuWyvNRw7QvNAhmoLm78LDyMPN1BXTZc6pAZTLOCfUagKnXOeJNKTh3Qv3OTKgx4GvlVeXy9uIg3Xc7RThG/rmZQyVu+ypZmpsp7yQE6xn+UVtfDVMxNuCZd9QNTgiW5NxMidu+UvvqTIjwU5qDlth0m7S6NqELOqGbsQg3YID+Ov2OXjgplRYNwFF1w9Gd8lBQb428dPpH+Mn0zQmSkpspfeaPk/smdVc/dPj4zdWfZ95Rd9/E7tqWPtM2L6l1A1/pGOartDOP7lReZv6NAV3QCd2MhbZZDVBcXiI19hoZu2JG3ULzWHBfGZIYImn5W2TY0jBdEwYsmqTRpTkwMQIv6mhD22HJ4ZKWnyODE0J0+tMO2mNXzlRe8DTL0RBa3ABsmeevXpIXooZrhshIVeH3sduWaaIiKD1OQ1PKhqM7HPtyGDPFV595R6ENbekTu225rgfQYgbgDi/NGiHfX7usPM1yNIQWNwCJiR0nD+peroKG9pNuc0arL5PC+tOk7rqAUcqrKjSweSXmfceRNcRHXp09SsNl6ih7Cgu0D9sja0fXOaP1fA9t4obtJw8qT7McDaHFDcA2k17whaalHNPfW0PaZQeyNKJDGfZho6AAyhBxMvo87zh5qK5+xuZEuX9Sd/GK+1iWH8jSIMZwA3jAy8qWeFsMkLg3Q0+QhgHeTQrV0Xtt7ge1wU1/TWqSVfrHjHd1RI01gGfeUffvlVGOPESwt6bfmEVDEkPrDAAPDk6tzgDL8jb9ygBsWSl5G6XHvLGqIO7xh/Gvyr0TutXFCIYBdK+f0l/raENb+tAXGtByNsDyvKzWZQDO9BxcHrF56RaIsH0XjJPlB7PEN95fV2+fheNl/ZEd4rvIX8Nb58Qlz7yjLuPIDvFeMF77+MUHqAtAixkBbeL57K/2WtoKW9wAHHwKzh2vpTFAR/OfM4fK4r3pErB2nvxxQjeZ83mq+veVkiL5OG2WrvJtAnsqCILGpcVoHSXm81SdDYHp82TxnnSlBU0jiIEXPM1yNIQWN0BJpSMlzsihDCPFFLZlxEnSvvXSJeo9eTrcV2eAUXZ9k68RIiB8NkrGke3av0vUMEnav16CMuIcOwB3Era+4r1wvCM1biFL1eIGAJSpm5bIgwE9HNnkEB95bc4Y9eGIjfHyqK2PPGzzkpicZLlS8nOdwkbhXXROsh6BmR2Rmz6VlNyN0m3OmNqD0UClPT0rQdub+TeG22KAyupKTT89Q5RXu8J3CPbREyDRoP/aufr+3ond5OVZIzV/v/JAtoLnl2aN1Dra+K+N1T4jUiKUBrR4D214wMvMvzGoAc67ZQCHj5FBseJjBijhmYvkfv/X62J4tjR8nlMesT1b28O2PqrsfRNfU/DM4kYdbWj7cVq0Kg0NzhTkFqBtdfQB0eWBb79SNzSyQvUaQCOtEG/ZdjxP420zIVfgYuLC1Usa5THdEZxgBx8eunSKLNm3TlLzNsknWYvl/dRP9HQIeOYddUv2rtMYgj70hQa0oHnh6mXlYebrCuiy9Xie7k7o2KABAPssvtcUS18r577QLvtPH9WtDV9GAZjCnDM+s2HeFyskcV+GBjmAZ95RRxtDUPpCA1rQZLuFh5mvK1C4LTLilMYNENhLJq2Zq8zMhNwFhWMr9JzzgUZARHboxVkj5PXYfylejB6h74wAyGhv9IVWUwbEALpMWj1HdXNpALIwr8aMksvFRZZOXGZQ8r79UrrOHq1BjrNijCj+bRyGHL5+MzCiLX3oCw1PlEeHS8U/ySsxo1Q3lwZgDyYju04PHE1nDIjWLv7yo0TnLJVnp72j53ySGurftekpIw3HO+poQ1v60NdKxFcfKOkF2+oSNS4NAFh0/OIDNcXlybUYN7aOmx6Rwstn9Z5xaNIUeW7GUN2SiO4Az7yjjja0pdC3KT5vANnRgdMkOjnr2KgBAMdOPjqgNMd1eMWNSqXFb77uOHbhG40AAc+8c25j7m8VyExZcWBz3THdkgFYkEhKnvnxgubkPRkJZxDG4pcEJ9AFPDsuYjy7BjOArNA9deWcHrPRxayfSwMQyLBtDFps0ywsQjaXEVoSyIisyEyGGh2cj95uG8BAm4A35IPl09WfmnMmtASMkUfWMcumqexmfSwbALQN6CnvLLHJ2aIf1K+s5uVvB5CJ8l3R9xpdtm1EecsGAO0m95QXoofrtZljsbK3ig+lHN8e2KXyRqWsyd+qkaRzxNcQLBsAPyJEJUZ4a3GQbDq2W66W/eJ2sMTtLqc4jOcJuOVhmjuKXX4uvSYbj+1SmdjrkbE+nzfDsgEMOG5ovPT0Rjj7xYkDUl1z4xaFnYHAl4t/kq9/OCXHL55pGi6dkf9dPKNfmJBiZ7Rt6+I06YosyGQcdNxBkw1ggAiOYy8ZnIYSlIZfsteTHOkc4Sd/nTrII+itUmi/uu+SnU94VuC5AWrz+blnjul521lxgpAyveSwS/K+TA11HV+HOCI/T2CE0GZ5rMJjA5DoeHbqIDl5+btfndHZiowvy/iwgQXJ1VebdwIeG4BT3MsxI/XAUuq0EBpbEUEIOTxPPmlvSXhsADK0/RZO1A+V8XXD3/cUHpYXo4ff8lVWa4PHBnhocm+9zibsdHyje9PfWZXd2YruJDw2AL7Nh46U1u7v9cFjA7Sd3FPid62RK8VFrd7f64PHBuBDCK69vGo/gjTXt3Z4bAD9CKo2ydna/b0+eGwAwH2d+d1vBc1igN8ynA1w1//z9F397/P/B5Lz2u2igEFmAAAAAElFTkSuQmCC';
/* ★ 66차 ①. 스플래시를 띄우고 걷는다.
   ★ 재는 자리는 「이 스크립트가 돈 때」가 아니라 「화면을 열 때」다.
     이 파일은 한 덩이라 다 읽는 데 시간이 걸리는데, 그때부터 2초를 또 세면
     느린 폰에서는 4초를 기다리게 된다. 사장님이 기다리시는 시간은
     주소를 누른 순간부터다 — performance.now() 가 그 시간이다.
   ★ 그래도 마크가 한 번은 보여야 하니 최소 0.4초는 둔다.
   ★ 끝나면 아예 지운다. 남겨두면 투명한 판이 화면 위를 덮는다 */
(function () {
  var s = document.getElementById('splash');
  if (!s) return;
  var m = document.getElementById('splashmark');
  if (m) m.src = BRAND_MARK;
  var 지난 = window.performance && performance.now ? performance.now() : 0;
  var 남은 = Math.max(400, 1600 - 지난);
  setTimeout(function () {
    s.className = 'splash gone';
    setTimeout(function () {
      if (s.parentNode) s.parentNode.removeChild(s);
    }, 450);
  }, 남은);
})();
var TRADE_ICON = {
  식당: 'data:image/png;base64,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',
  카페: 'data:image/png;base64,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',
  병원: 'data:image/png;base64,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',
  치과: 'data:image/png;base64,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',
  약국: 'data:image/png;base64,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',
  미용실:
    'data:image/png;base64,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'
};

var UP_QUICK_OUT = ['식자재', '주류·음료', '인건비', '월세', '전기·가스·수도', '기타'];
var UP_QUICK_IN = ['매출', '사업 외 용도', '기타'];

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
/* 계산은 core/compute.js 의 isKeepIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function isKeep(c) {
  return isKeepIn(UP, c);
}
function isBase(c) {
  return (UP && UP.baseCats ? UP.baseCats : UP_CATS).indexOf(c) !== -1;
}
/* 공백·기호를 뗀 비교용 이름 — 「주류 음료」와 「주류·음료」를 같은 것으로 본다 */
function normName(s) {
  return s.replace(/[\s·.,\-_/()]/g, '').toLowerCase();
}

function allCatNames() {
  return UP.accounts.concat(['매출']);
}

/* 이미 있는 항목인지 — 똑같으면 exact, 기호만 다르면 비슷한 것으로 본다 */
function findSame(name) {
  var all = allCatNames(),
    i;
  for (i = 0; i < all.length; i++) if (all[i] === name) return { hit: all[i], exact: true };
  for (i = 0; i < all.length; i++) {
    if (normName(all[i]) === normName(name)) return { hit: all[i], exact: false };
  }
  return null;
}

/* 그 항목으로 찍은 거래처 몇 곳 · 거래 몇 건 */
function catUse(name) {
  var n = 0,
    places = 0;
  UP.payees.forEach(function (g) {
    if (gCats(g).indexOf(name) !== -1) places++;
  });
  /* ★ 63-3. catOf 는 방향으로 갈린 이름을 돌려준다 —
     「사업 외 용도」로 정하신 거래는 줄마다 「내가 넣은 돈」·「내가 가져간 돈」이 된다.
     그것만 세면 「1곳 · 0건」이 되어 곳 수와 건수가 서로 다른 말을 한다.
     정하신 항목과 갈려 나온 이름을 둘 다 본다 */
  UP.rows.forEach(function (r) {
    var c = gCatFor(UP.byName[keyOf(r)], r.amount > 0);
    if (c === name || (c && sideOf(c, r.amount > 0) === name)) n++;
  });
  return { places: places, rows: n };
}

/* ★ 69차 ①. 그 항목으로 정해둔 거래처를 하나하나 — 항목 관리에서 펼쳐 보는 목록.
   ★ 세는 규칙은 바로 위 catUse 와 한 글자도 다르면 안 된다.
     알약에 적힌 「N곳 · M건」과 펼친 목록이 어긋나면 둘 중 하나는 거짓말이 된다.
     그래서 곳은 gCats, 건은 gCatFor + sideOf — catUse 가 쓰는 그 판정을 그대로 쓴다
     (63-3 「사업 외 용도」가 방향 따라 이름이 갈리는 것까지 같이 따라간다).
   ★ 계산에는 손대지 않는다. 이미 정해진 것을 다시 세어 보여주기만 한다 */
function catPayeeList(name) {
  var map = {},
    out = [];
  var 담기 = function (key) {
    if (!map[key]) {
      map[key] = { name: key, g: UP.byName[key], sum: 0, n: 0 };
      out.push(map[key]);
    }
    return map[key];
  };
  /* 곳 — catUse 의 places 와 같은 판정 */
  UP.payees.forEach(function (g) {
    if (gCats(g).indexOf(name) !== -1) 담기(g.name);
  });
  /* 건과 합계 — catUse 의 rows 와 같은 판정 */
  UP.rows.forEach(function (r) {
    var key = keyOf(r);
    var c = gCatFor(UP.byName[key], r.amount > 0);
    if (c === name || (c && sideOf(c, r.amount > 0) === name)) {
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
function renameCat(oldName, neu) {
  var swap = function (x) {
    return x === oldName ? neu : x;
  };
  UP.accounts = UP.accounts.map(swap);
  UP.baseCats = UP.baseCats.map(swap);
  UP.keepSet = UP.keepSet.map(swap);
  /* 섞인 거래처는 방향마다 따로 들고 있어 양쪽을 다 본다 (35차 B) */
  UP.payees.forEach(function (g) {
    if (g.catIn === oldName) g.catIn = neu;
    if (g.catOut === oldName) g.catOut = neu;
    if (g.cat === oldName) g.cat = neu;
  });
  savePicks();
  if (UP.open && UP.open[oldName] != null) {
    UP.open[neu] = UP.open[oldName];
    delete UP.open[oldName];
  }
  (UP.hist || []).forEach(function (h) {
    if (h.cat === oldName) h.cat = neu;
    if (h.newCat === oldName) h.newCat = neu;
  });
}

/* 항목만 없어지고 거래처는 다른 항목으로 간다. 거래를 지우면 검산이 깨진다.
   moveTo 가 null 이면 「아직 안 정함」으로 되돌린다 */
function deleteCat(name, moveTo) {
  UP.payees.forEach(function (g) {
    if (g.catIn === name) {
      g.catIn = moveTo || null;
      if (!moveTo) g.autoIn = false;
    }
    if (g.catOut === name) {
      g.catOut = moveTo || null;
      if (!moveTo) g.autoOut = false;
    }
    if (g.cat === name) {
      g.cat = moveTo || null;
      if (!moveTo) g.auto = false;
    }
  });
  UP.accounts = UP.accounts.filter(function (x) {
    return x !== name;
  });
  savePicks();
  (UP.hist || []).forEach(function (h) {
    if (h.cat === name) h.cat = moveTo;
    if (h.newCat === name) h.newCat = moveTo;
  });
}
