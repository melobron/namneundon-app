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
/* ★ 81차 ④. 단독 「세무」를 더한다 (개발자 확정) — 세무회계·세무기장·세무사·세무법인이 다 걸린다.
   ★ 이 목록은 taxLike 도 본다. 그래서 이 한 줄이 집계를 움직인다 —
     「○○세무회계」처럼 작은 곳이 36차 F 규칙에 걸려 묻지도 않고
     「내가 가져간 돈」으로 넘어가던 것이 이제 큐에 남아 여쭙는다.
     세무기장료는 사업 지출인데 사업 외 용도로 빠지면 사업에 쓴 돈이 줄고
     계좌 순이익이 실제보다 커 보인다 — 넘어가던 쪽이 틀린 숫자였다.
   ★ 계산 지문(판1·판2)이 바뀔 수 있다. 마스터 ■35 는 「지문이 바뀌면 안 된다」가 아니라
     「이유를 모른 채 기준값만 바꾸지 않는다」이고, 이번에는 바뀌는 이유를 알고 바꾼다. */
var BOOKKEEPING_WORDS = ['기장료', '세무기장', '세무사', '세무법인', '회계법인', '세무'];
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

function canonName(name) {
  /* 전각 공백(U+3000)·전각 영숫자를 반각으로 통일 */
  var t = String(name).normalize('NFKC').trim();
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
function keyOf(r) {
  return (UP && UP.merge && UP.merge[r.payee]) || r.payee;
}

function groupPayees(rows) {
  var m = {};
  rows.forEach(function (r) {
    var k = keyOf(r);
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
    g.catIn = autoCategory(g.name, 1);
    g.catOut = autoCategory(g.name, -1);
    g.autoIn = !!g.catIn;
    g.autoOut = !!g.catOut;
    g.cat = null;
    g.auto = false;
  } else {
    g.cat = autoCategory(g.name, g.net);
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
