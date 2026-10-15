/* ── core · 거래처 묶기 · 자동 분류 ────────────────────────────
   리팩토링 B-1d (2026-09-26): 06-classify.js 의 순수한 함수와, 부르던 낱말 목록·monthOf 를 옮겼다.
   바꾼 것 하나 — 거래처 묶기가 합치기 규칙표를 전역(UP.merge)에서 꺼내던 것을 매개변수로 받는다:
     groupPayeesWith(rows, merge) · mergedName(merge, r)
   앱의 groupPayees(rows) · keyOf(r) 는 06-classify.js 에 남아 UP.merge 를 넘겨 이것을 부른다.
   단위 테스트: tests/core/classify.spec.mjs */
/* ── (원래 06-classify.js) ── */
/* ── 미리 아는 패턴만 자동 분류. 나머지는 추측하지 않는다 ── */
var CARD_WORDS = [
  '비씨',
  'bc',
  '현대카드',
  '삼성',
  '신한카드',
  '롯데',
  'kb',
  '하나',
  'nh',
  '국민카드'
];
/* 뜻이 하나뿐인 표기만 자동으로 잡는다.
   「건강」「연금」처럼 짧아서 다른 가게 이름에도 걸릴 말은 추천으로만 쓴다 (HINTS) */
var TAX_WORDS = [
  '국세',
  '국고',
  '지방세',
  '부가가치세',
  '종합소득세',
  '원천세',
  '세무서',
  '국세청',
  '홈택스',
  '위택스',
  /* 「지방소득세」에는 「지방세」라는 글자가 없다 (지방·소득·세). */
  '지방소득세',
  /* 이 둘도 세금인데 목록에 없어서 안 잡히고 있었다 */
  '주민세',
  '자동차세'
];
/* ★ 75차. 세금과 보험은 사용 목적이 다르므로 기본 항목부터 나눈다. */
var INSURANCE_WORDS = [
  '사회보험',
  '4대보험',
  '사대보험',
  '국민연금',
  '국민건강',
  '건강보험',
  '고용보험',
  '산재보험',
  '합산보험료',
  '국민연금공단',
  '건강보험공단',
  '근로복지공단',
  '화재보험',
  '삼성화재',
  'db손해',
  'kb손해',
  '현대해상',
  '메리츠화재',
  '삼성화'
];
/* 7개 매장 실측: 예전 목록은 공과금 금액의 80.6%만 잡았다.
   도시가스 회사 이름과 요금 표기를 넣어 나머지를 메운다 */
var UTIL_WORDS = [
  '한전',
  '한국전력',
  '전기요금',
  '전기료',
  '전기세',
  '도시가스',
  '가스공사',
  '가스요금',
  '가스비',
  '예스코',
  '서울가스',
  '코원에너지',
  '삼천리',
  '대성에너지',
  '경동도시가스',
  '귀뚜라미에너지',
  '인천도시가스',
  '부산도시가스',
  '에너지서비스',
  '상수도',
  '상하수도',
  '수도요금',
  '수도료',
  '수도세'
];
/* 「수도2306○○」처럼 년월이 이름 가운데 있는 것.
   앞자리 제한만으로는 「수도권물류」가 걸리므로 뒤에 숫자가 오는 것만 잡는다 */
function startsUtil(t) {
  return /^수도\d/.test(t);
}
function autoCategory(name, net) {
  var t = nz(name);
  /* 세금·보험을 카드보다 먼저 본다.
     CARD_WORDS 의 「삼성」은 느슨한 낱말이라 「삼성화」(삼성화재)에도 걸린다.
     지금은 나간 돈이라 매출로 안 가지만, 환급이 한 번 들어오면 그 순간 매출이 된다.
     「삼성화재」는 뜻이 하나뿐이고 「삼성」은 여럿이다. 좁은 쪽을 먼저 본다 */
  for (var j = 0; j < TAX_WORDS.length; j++) if (t.indexOf(TAX_WORDS[j]) !== -1) return '세금';
  for (var h = 0; h < INSURANCE_WORDS.length; h++)
    if (t.indexOf(INSURANCE_WORDS[h]) !== -1) return '보험';
  if (net > 0) {
    for (var i = 0; i < CARD_WORDS.length; i++) if (t.indexOf(CARD_WORDS[i]) !== -1) return '매출';
    if (/^[a-z가-힣]{1,4}\d{6,}$/.test(t) || /^\d{6,}[a-z]{1,3}$/.test(t)) return '매출';
  }
  for (var k = 0; k < UTIL_WORDS.length; k++)
    if (t.indexOf(UTIL_WORDS[k]) !== -1) return '전기·가스·수도';
  if (startsUtil(t)) return '전기·가스·수도';
  return null;
}
/* ── 년월 접두어 묶기 ──
   2303국민연금 / 2404국민연금이 매달 다른 거래처로 잡히면
   사장님이 찍어둔 항목이 다음 달에 재사용되지 않는다 */
function okYear(y) {
  return y.length === 2 ? true : +y >= 2000 && +y <= 2099;
}
function okBase(b) {
  /* 글자가 하나도 없는 이름이나 숫자에 붙은 조각은 묶지 않는다 */
  return b.length >= 2 && /[^\d]/.test(b);
}
function stripYm(name) {
  var m = name.match(/^(\d{4}|\d{2})[-_. ]?(\d{2})[-_. ]?(.+)$/);
  if (m && +m[2] >= 1 && +m[2] <= 12 && okYear(m[1])) {
    var b1 = m[3].trim();
    if (okBase(b1) && !/^\d/.test(b1)) return { base: b1, ym: m[1] + m[2] };
  }
  m = name.match(/^(.+?)[-_. ]?(\d{4}|\d{2})[-_. ]?(\d{2})$/);
  if (m && +m[3] >= 1 && +m[3] <= 12 && okYear(m[2])) {
    var b2 = m[1].trim();
    /* 전화번호·계약번호 뒤 네 자리를 년월로 보면 안 된다 */
    if (okBase(b2) && !/\d$/.test(b2)) return { base: b2, ym: m[2] + m[3] };
  }
  return null;
}
/* ── 거래처명 다듬기 ──
   같은 곳이 표기만 달라 갈리는 걸 막는다. 원본 표기는 카드에 그대로 남긴다 */
var BANK_PREFIX = [
  '농협',
  '기업',
  '우리',
  '신한',
  '국민',
  '하나',
  '수협',
  '씨티',
  '새마을',
  '신협',
  '우체국',
  '카카오',
  '토스',
  '케이'
];
/* 은행 이름 뒤에 이것만 남으면 그건 금융회사 이름이지 접두어가 아니다 */
var BANK_KEEP = [
  '카드',
  '은행',
  '증권',
  '보험',
  '생명',
  '화재',
  '캐피탈',
  '저축',
  '페이',
  '정산',
  '결제',
  '수수료',
  '금융',
  '투자',
  '자산',
  '상호'
];
var CORP_HEAD = ['주식회사', '㈜', '(주)', '유한회사', '(유)'];
/* ★ 공단 입금 보완 (2026-10-15). 「국민」 뒤가 3~4자면 사람 이름으로 보고 뗐는데,
   「국민건강초심」이 「건강초심」이 되어 같은 공단 돈(「국민건강가지급」)과 갈리고 보험 낱말에서도 빠졌다.
   이 둘로 시작하는 이름은 은행 접두어가 아니라 공단 이름이다. 다른 은행 접두어·사람 이름 규칙은 그대로다 */
var BANK_NOT_PREFIX = ['국민건강', '국민연금'];
function canonName(name) {
  /* 전각 공백(U+3000)·전각 영숫자를 반각으로 통일 */
  var t = String(name).normalize('NFKC').trim();
  for (var n = 0; n < BANK_NOT_PREFIX.length; n++)
    if (t.indexOf(BANK_NOT_PREFIX[n]) === 0) return t;
  return bankStrip(t);
}
/* ★ 공단 입금 보완 (2026-10-15 보완 1번). 자동 분류는 「국민」을 떼던 예전 이름으로 판정한다.
   이름을 살린 것만으로 다른 업종의 미분류 입금(「건강초심」)이 자동 '보험'이 되면 안 된다 —
   병원·치과·약국의 공단 입금은 어차피 nhisHoldIn 이 걷어 여쭌다 */
function autoName(name) {
  return bankStrip(String(name).normalize('NFKC').trim());
}
function bankStrip(t) {
  for (var i = 0; i < BANK_PREFIX.length; i++) {
    var p = BANK_PREFIX[i];
    if (t.indexOf(p) !== 0) continue;
    var rest = t.slice(p.length).trim();
    if (rest.length < 2) break; /* 너무 짧으면 그냥 둔다 */
    if (BANK_KEEP.indexOf(rest) !== -1) break; /* 국민카드·농협은행 */
    var corp = false;
    for (var j = 0; j < CORP_HEAD.length; j++) {
      if (rest.indexOf(CORP_HEAD[j]) === 0) {
        corp = true;
        break;
      }
    }
    /* 사람 이름은 3~4자만. 2자까지 열면 「국민카드」가 「카드」가 된다 */
    var person = /^[가-힣]{3,4}$/.test(rest);
    if (corp || person) return rest;
    break;
  }
  return t;
}
/* ── 42차 2번 · 납부번호 떼기 ────────────────────────────
   세금 줄처럼 이름 뒤에 스무 자리 가까운 납부번호가 붙으면
   매달 다른 거래처가 된다. 실파일에서 국세청 13곳 · 삼성화재 12곳 ·
   지방소득세 6곳으로 갈렸다.
   ★ 갈리면 한 곳당 「한두 번 나간 작은 돈」이 되어 36차 F 규칙이
     사업 외 용도로 넘긴다 — 매달 나가는 것을 매달 나간다고 못 본다 (42차 1번).
   ★ 그리고 41차에 고친 저장이 이 곳들에는 소용이 없다.
     다음 달에 새 납부번호로 새 거래처가 되기 때문이다.
   ★ 네 자리 이상만 뗀다. 실파일에서 네 자리와 다섯 자리 결과가 같고,
     여섯 자리로 하면 보험료 줄의 다섯 자리 번호를 놓친다.
     세 자리까지 열면 「삼성카드267」이 「삼성카드」와 엉킨다.
   ★ 두 곳 이상이 같은 이름으로 모일 때만 묶는다.
     한 곳뿐이면 이름만 바뀌고 얻는 게 없다 —
     번호가 붙은 카드 정산 한 곳이 브랜드 이름만 남으면 통장과 대조가 안 된다 */
/* ── 45차 ④ · 꼬리표와 띄어쓰기로 갈리는 것을 묶는다 ─────────────
   42차는 숫자만 뗐다. 「(주)○○」와 「(주)○ ○」가 띄어쓰기 하나로 갈려 있고,
   갈리니 각각 작아 보여 한쪽이 F 규칙에 걸려 「사업 외 용도」로 빠졌다 —
   42차 1번과 똑같은 구조다. 실파일 두 개에서 7곳 → 3곳, 13개월 7,515만원.
   ★ 「환불」·「취소」는 절대 떼지 않는다. 매출과 반대 방향이라 따로 봐야 한다.
   ★ 화면에 보이는 이름은 원문 그대로다. 묶는 열쇠만 다듬는다 */
var CORP_TAG = [
  '(주)',
  '（주）',
  '㈜',
  '주식회사',
  '(유)',
  '（유）',
  '유한회사',
  '(사)',
  '재단법인',
  '사단법인',
  '합자회사',
  '(합)'
];
var SP_WIDE = String.fromCharCode(0x3000); /* 전각 공백 — 은행 파일에 실제로 들어온다 */
function stripCorp(name) {
  var t = String(name);
  CORP_TAG.forEach(function (w) {
    t = t.split(w).join('');
  });
  /* ★ 띄어쓰기를 뗀다. 전각 공백(U+3000)도 같이 —
     은행 파일에 전각 공백이 실제로 들어온다.
     ★ 여기에는 백슬래시가 든 글자 부류를 안 쓴다. 한 번 백슬래시가 먹혀
       /s+/ 가 됐고, 아무것도 안 지우면서 조용히 통과했다 —
       웰컴·롯데는 묶였는데 띄어쓰기로 갈린 곳만 안 묶여서야 알았다.
       그래서 지울 글자를 눈에 보이게 적어 둔다 */
  t = t.split(' ').join('').split(SP_WIDE).join('');
  t = t.trim();
  if (t.length < 2) return null; /* 다 지워지면 안 묶는다 */
  if (!/[^0-9]/.test(t)) return null;
  return t;
}
function stripLongNum(name) {
  var t = String(name)
    .replace(/[0-9]{4,}/g, ' ')
    .replace(/s+/g, ' ')
    .trim();
  if (t.length < 2) return null;
  if (!/[^0-9]/.test(t)) return null; /* 숫자만 남으면 안 묶는다 */
  return t;
}
/* 이름을 먼저 다듬고, 그 결과에 년월 묶기를 건다. 순서가 반대면 둘 다 놓친다 */
function buildMergeMap(rows) {
  var canon = {},
    seen = {},
    map = {};
  rows.forEach(function (r) {
    if (canon[r.payee] === undefined) canon[r.payee] = canonName(r.payee);
  });
  rows.forEach(function (r) {
    var s = stripYm(canon[r.payee]);
    if (!s) return;
    (seen[s.base] || (seen[s.base] = {}))[s.ym] = 1;
  });
  rows.forEach(function (r) {
    var c = canon[r.payee];
    var s = stripYm(c);
    var final = s && Object.keys(seen[s.base]).length >= 2 ? s.base : c;
    if (final !== r.payee) map[r.payee] = final;
  });
  /* ★ 42차 2번. 여기까지 온 이름에서 긴 숫자를 뗀다.
     년월 묶기를 먼저 걸어야 「2303○○」 꼴이 이미 한 곳으로 묶여 있다 */
  var byStrip = {};
  rows.forEach(function (r) {
    var cur = map[r.payee] || canon[r.payee];
    var t = stripLongNum(cur);
    if (!t || t === cur) return;
    (byStrip[t] || (byStrip[t] = {}))[cur] = 1;
  });
  rows.forEach(function (r) {
    var cur = map[r.payee] || canon[r.payee];
    var t = stripLongNum(cur);
    if (!t || t === cur) return;
    if (Object.keys(byStrip[t]).length < 2) return; /* 두 곳 이상일 때만 */
    map[r.payee] = t;
  });
  /* ★ 45차 ④. 그다음에 꼬리표와 띄어쓰기를 뗀다. 숫자를 먼저 떼야
     「(주)○○123」과 「(주)○ ○」가 같은 자리로 모인다 */
  /* ★ 꼬리표가 「없는」 쪽도 같이 등록해야 한다.
     「○○(주)」만 넣고 「○○」를 빼면 짝이 하나뿐이라 영영 안 묶인다 —
     실제로 그렇게 만들었다가 한 곳도 안 묶였다 */
  var byCorp = {};
  rows.forEach(function (r) {
    var cur = map[r.payee] || canon[r.payee];
    var t = stripCorp(cur);
    if (!t) return;
    (byCorp[t] || (byCorp[t] = {}))[cur] = 1;
  });
  rows.forEach(function (r) {
    var cur = map[r.payee] || canon[r.payee];
    var t = stripCorp(cur);
    if (!t) return;
    if (Object.keys(byCorp[t]).length < 2) return;
    /* 가장 긴 원문을 대표 이름으로 쓴다 — 통장과 대조할 때 알아보기 쉽다 */
    var names = Object.keys(byCorp[t]).sort(function (a, b) {
      return b.length - a.length;
    });
    map[r.payee] = names[0];
  });
  return map;
}
/* 거래처를 묶는 이름 — 합치기 규칙표(merge)에 있으면 그 이름, 없으면 원래 이름.
   ★ 리팩토링 B-1d. 규칙표를 전역(UP.merge)에서 꺼내던 것을 매개변수로 받게 나눴다 (core 로 가는 쪽) */
function mergedName(merge, r) {
  return (merge && merge[r.payee]) || r.payee;
}
/* ★ 리팩토링 B-1d. 원래 groupPayees 의 본문이다. 달라진 것은 keyOf(r) → mergedName(merge, r) 하나 */
function groupPayeesWith(rows, merge) {
  var m = {};
  rows.forEach(function (r) {
    var k = mergedName(merge, r);
    var g =
      m[k] ||
      (m[k] = {
        name: k,
        n: 0,
        net: 0,
        abs: 0,
        last: '',
        raw: {},
        months: {},
        amts: [],
        inSum: 0,
        inN: 0,
        inMax: 0,
        outSum: 0,
        outN: 0,
        inDays: [],
        outDays: [],
        inAmts: [],
        outAmts: [],
        inMonths: {},
        outMonths: {},
        inLast: '',
        outLast: '',
        /* ★ 81차 ③. 이 거래처의 적요들 — 낱말 검사에만 쓴다.
                                 저장(pickPayload)은 칸을 하나하나 적어 만드는 방식이라
                                 여기 무엇을 더해도 fc.picks 로는 안 새어 나간다 */
        memos: {}
      });
    g.n++;
    g.net += r.amount;
    g.abs += Math.abs(r.amount);
    if (r.amount > 0) {
      g.inSum += r.amount;
      g.inN++;
      if (r.amount > g.inMax) g.inMax = r.amount;
      g.inDays.push(+r.at.slice(8, 10));
      g.inAmts.push(r.amount);
      g.inMonths[monthOf(r.at)] = 1;
      if (r.at > g.inLast) g.inLast = r.at;
    } else {
      g.outSum += -r.amount;
      g.outN++;
      g.outDays.push(+r.at.slice(8, 10));
      g.outAmts.push(-r.amount);
      g.outMonths[monthOf(r.at)] = 1;
      if (r.at > g.outLast) g.outLast = r.at;
    }
    g.raw[r.payee] = 1; /* 통장과 대조할 수 있게 원본 표기를 남긴다 */
    /* ★ 81차 ③. 몇 번 찍힌 적요인지 같이 센다 — 자주 나온 적요를 먼저 본다 */
    if (r.memo) g.memos[r.memo] = (g.memos[r.memo] || 0) + 1;
    g.months[monthOf(r.at)] = 1;
    g.amts.push(Math.abs(r.amount));
    if (r.at > g.last) g.last = r.at;
  });
  var list = Object.keys(m).map(function (k) {
    var g = m[k];
    g.rawList = Object.keys(g.raw);
    /* ★ 81차 ③. 자주 찍힌 적요부터 본다. 같은 수면 파일에 나온 차례 그대로다 */
    g.memoList = Object.keys(g.memos).sort(function (a, b) {
      return g.memos[b] - g.memos[a];
    });
    g.monthN = Object.keys(g.months).length;
    /* 35차 B. 한 거래처에 들어온 돈과 나간 돈이 섞여 있으면 방향마다 따로 묻는다.
       한쪽만 있는 곳은 지금까지처럼 한 번만 묻는다 — 실파일 213곳 중 섞인 곳은 11곳뿐이다 */
    g.mixed = g.inN > 0 && g.outN > 0;
    return g;
  });
  list.sort(function (a, b) {
    return b.abs - a.abs;
  });
  list.forEach(gAutoInit);
  return list;
}
/* 자동분류를 처음 상태로 돌려놓는다. 「처음부터 다시 정하기」도 이걸 쓴다 */
function gAutoInit(g) {
  if (g.mixed) {
    /* 방향마다 따로 짐작한다. net 부호로 한 번에 짐작하면 반대쪽이 뜻이 뒤집힌다 */
    g.catIn = autoCategory(autoName(g.name), 1);
    g.catOut = autoCategory(autoName(g.name), -1);
    g.autoIn = !!g.catIn;
    g.autoOut = !!g.catOut;
    g.cat = null;
    g.auto = false;
  } else {
    g.cat = autoCategory(autoName(g.name), g.net);
    g.auto = !!g.cat;
  }
}
/* ── 35차 B · 방향별 항목 ──
   섞인 거래처는 catIn·catOut 두 벌을 들고, 한쪽만 있는 곳은 지금까지처럼 cat 한 벌만 쓴다.
   ★ 「정해졌는가」를 묻는 곳은 전부 gDone() 을 쓴다. g.cat 만 보면 섞인 곳이 늘 안 정한 것이 된다 */
function gCatFor(g, isIn) {
  if (!g) return null;
  if (g.mixed) return (isIn ? g.catIn : g.catOut) || null;
  return g.cat || null;
}
function gAutoFor(g, isIn) {
  if (!g) return false;
  if (g.mixed) return isIn ? !!g.autoIn : !!g.autoOut;
  return !!g.auto;
}
function gSetCat(g, isIn, cat, auto) {
  if (g.mixed) {
    if (isIn) {
      g.catIn = cat;
      g.autoIn = !!auto;
    } else {
      g.catOut = cat;
      g.autoOut = !!auto;
    }
  } else {
    g.cat = cat;
    g.auto = !!auto;
  }
}
/* 섞인 거래처에서 대표님이 한쪽만 손수 정해 두셨으면 남은 쪽 (true 들어온 돈 · false 나간 돈), 아니면 null.
   앱이 넣은 것(auto)은 「정한 쪽」으로 치지 않는다 */
function gOpenSideByHand(g) {
  if (!g || !g.mixed) return null;
  if (g.catIn && !g.autoIn && !g.catOut) return false;
  if (g.catOut && !g.autoOut && !g.catIn) return true;
  return null;
}
/* 출금만 있는 거래처인가 — 이곳을 「매출」로 두면 출금이 매출을 줄인다 */
function gOutOnly(g) {
  return !!g && !g.mixed && !(g.inN > 0) && g.outN > 0;
}
/* 쪽 없이 받은 답을 넣는다 — 섞인 거래처는 한 번 묻고 양쪽에 같이 (63-4).
   ★ 123차. 출금은 묻지 않고는 「매출」이 되지 않는다. 출금을 매출로 두는 것은 카드 취소 · 환불 같은
     「매출 차감」일 수 있어 막지는 않지만, 대표님이 확인 창에서 정하셔야 한다 (2026-10-16 결정).
     그래서 쪽 없이 받은 「매출」은 들어온 쪽에만 넣고, 나간 쪽은 두던 대로(정해 둔 것은 그대로, 아니면 아직 안 정함) 둔다.
   ★ 123차. 한쪽을 손수 정해 두셨으면 그쪽은 두고 아직 안 정한 쪽에만 넣는다.
     들어온 돈을 매출로 정한 곳이 다시 물어질 때(다시 열기 · 이어서 정하기 · 차례로 정하기 · 같은 곳 · 묶음)
     다른 항목을 고르셔도 입금 쪽 매출을 덮지 않는다 */
function gSetCatAnswer(g, cat) {
  var 남은 = gOpenSideByHand(g);
  if (남은 !== null) {
    if (남은 || cat !== '매출') gSetCat(g, 남은, cat, false);
    return;
  }
  if (cat !== '매출') gSetCat(g, false, cat, false);
  gSetCat(g, true, cat, false);
}
/* ★ 63-4. sideSplits 는 없앴다 — 방향이 뜻을 가르는 항목이라고 되묻던 함수인데,
   이제 한 거래처에 항목 하나만 고르므로 되물을 일이 없다.
   방향을 가르는 일은 sideOf 한 곳에서만 한다 */
/* 그 거래처를 다 정하셨는가 */
function gDone(g) {
  if (!g) return false;
  return g.mixed ? !!(g.catIn && g.catOut) : !!g.cat;
}
/* 아직 안 정한 쪽이 어디인가 — 섞인 곳은 나간 돈부터 묻는다 (건수가 많은 쪽이다) */
function gPendingSide(g) {
  if (!g.mixed) return null;
  if (!g.catOut) return false; /* false = 나간 돈 */
  if (!g.catIn) return true; /* true  = 들어온 돈 */
  return null;
}
/* 그 거래처에 찍힌 항목 전부 (섞인 곳은 둘) */
function gCats(g) {
  if (!g) return [];
  if (!g.mixed) return g.cat ? [g.cat] : [];
  var out = [];
  if (g.catOut) out.push(g.catOut);
  if (g.catIn && out.indexOf(g.catIn) === -1) out.push(g.catIn);
  return out;
}
/* 화면에 한 줄로 보여줄 이름. 섞인 곳에서 양쪽이 다르면 둘 다 말한다 —
   하나만 보여주면 나머지 한쪽이 조용히 사라진 것처럼 보인다 */
function gShowCat(g) {
  var cs = gCats(g);
  return cs.length ? cs.join(' · ') : null;
}
/* 아직 안 정한 금액 — 섞인 곳은 안 정한 쪽 금액만 센다 */
function gOpenAbs(g) {
  if (!g.mixed) return g.cat ? 0 : g.abs;
  return (g.catIn ? 0 : g.inSum) + (g.catOut ? 0 : g.outSum);
}
/* ── 공단 입금 보완 (2026-10-15 · C안) ────────────────────────────
   병원·치과·약국에서 이름이 「국민건강」·「의료급여」로 시작하는 입금은
   진료·조제 대금(매출)일 수도, 보험료 환급일 수도 있다. 이름만으로는 갈리지 않는다.
   그런데 「국민건강」은 보험 낱말이라 입금도 자동 '보험'이 되어, 조제료가 매출에서 조용히 빠졌다.
   ★ 그래서 입금 쪽의 자동 '보험'만 걷어 「아직 안 정함」으로 두고 대표님께 여쭌다.
     아직 안 정한 입금은 매출에도 그 밖의 입금에도 안 들어간다 (35차 E) — 이름만으로 매출로 확정하지 않는다.
   ★ 출금(보험료)은 지금처럼 '보험'이다. 대표님이 손수 정하신 것(auto 가 아닌 것)은 건드리지 않는다.
   ★ 업종은 매장 자료(U.trade)에서 읽는다. 저장된 업종이 이기므로 업종이 정해진 뒤에 부른다 (buildQueue) */
var NHIS_TRADES = ['병원', '치과', '약국'];
var NHIS_HEADS = ['국민건강', '의료급여'];
function nhisAskIn(U, g) {
  if (!U || !g || !(g.inN > 0) || NHIS_TRADES.indexOf(U.trade) === -1) return false;
  var t = String(g.name);
  for (var i = 0; i < NHIS_HEADS.length; i++) if (t.indexOf(NHIS_HEADS[i]) === 0) return true;
  return false;
}
function nhisHoldIn(U, g) {
  if (nhisAskIn(U, g)) {
    if (gCatFor(g, true) && gAutoFor(g, true)) {
      gSetCat(g, true, null, false);
      g.nhisHeld = true;
    }
    return;
  }
  /* 다른 업종의 분류 파일을 불러와 후보가 아니게 되면 걷어 둔 자동 항목을 되돌린다.
     그 사이 대표님이 정하신 것이 있으면 그대로 둔다 */
  if (g && g.nhisHeld) {
    if (!gCatFor(g, true)) {
      var c = autoCategory(autoName(g.name), 1);
      gSetCat(g, true, c, !!c);
    }
    delete g.nhisHeld;
  }
}
/* 섞인 공단 거래처에서 입금 쪽만 남았는가 — 이때 받은 답은 입금 쪽에만 넣는다.
   한 번에 양쪽에 넣으면(63-4) 출금 보험료가 매출로 바뀐다 */
function nhisInOnlyIn(U, g) {
  return !!g && !!g.mixed && nhisAskIn(U, g) && !!g.catOut && !g.catIn;
}
/* 저장해둔 것을 되살린다. 옛 저장값은 방향이 없는 글자 하나였고,
   35차부터 섞인 거래처는 {입금:…, 출금:…} 로 남긴다.
   ★ 옛 값을 섞인 거래처에 되살릴 때는 양쪽에 같은 것을 넣는다.
     방향에 따라 뜻이 뒤집히는 이름은 화면에서 keepSideName 이 돌려 준다 */
function applySaved(g, c) {
  if (!c) return false;
  if (typeof c === 'string') {
    if (g.mixed) {
      g.catIn = c;
      g.autoIn = false;
      g.catOut = c;
      g.autoOut = false;
    } else {
      g.cat = c;
      g.auto = false;
    }
    return true;
  }
  if (typeof c !== 'object') return false;
  var did = false;
  if (g.mixed) {
    if (c['입금']) {
      g.catIn = c['입금'];
      g.autoIn = false;
      did = true;
    }
    if (c['출금']) {
      g.catOut = c['출금'];
      g.autoOut = false;
      did = true;
    }
  } else {
    var one = c['입금'] || c['출금'];
    if (one) {
      g.cat = one;
      g.auto = false;
      did = true;
    }
  }
  return did;
}
/* ── (원래 14-compute.js) ── */
/* ── 결과 ── */
function monthOf(at) {
  return at.slice(0, 7);
}
