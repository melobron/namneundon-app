/* ── core · 처음 분류(온보딩)의 계산 부품 ─────────────────────────
   리팩토링 B-1g (2026-09-26): 13-onboard.js 에서 화면 · 저장소에 닿지 않는 계산을 옮겼다.
   이름 다듬기 · 사람 이름 가리기 · 개인 · 대출 짐작 · 비슷한 이름 · 묶음 · 묻는 차례 · 목표선 · 다 됐나.
   매장 자료(UP)를 읽는 것은 fIn(U, …) 이고, 13-onboard.js 에 연결 함수 f(…) 가 남아 있다.
   ★ loanLikeIn 의 In 은 「들어온 돈」이다 — 그래서 core 이름은 loanLikeInIn(U, g).
   BOOKKEEPING_WORDS(06) · UP_TARGET(07) 은 여기 계산이 쓰는 상수라 함께 올라왔다.
   단위 테스트: tests/core/onboard.spec.mjs */
/* ── (원래 06-classify.js) ── */
/* ★ 81차 ④. 단독 「세무」를 더한다 (개발자 확정) — 세무회계·세무기장·세무사·세무법인이 다 걸린다.
   ★ 이 목록은 taxLike 도 본다. 그래서 이 한 줄이 집계를 움직인다 —
     「○○세무회계」처럼 작은 곳이 36차 F 규칙에 걸려 묻지도 않고
     「내가 가져간 돈」으로 넘어가던 것이 이제 큐에 남아 여쭙는다.
     세무기장료는 사업 지출인데 사업 외 용도로 빠지면 사업에 쓴 돈이 줄고
     계좌 순이익이 실제보다 커 보인다 — 넘어가던 쪽이 틀린 숫자였다.
   ★ 계산 지문(판1·판2)이 바뀔 수 있다. 마스터 ■35 는 「지문이 바뀌면 안 된다」가 아니라
     「이유를 모른 채 기준값만 바꾸지 않는다」이고, 이번에는 바뀌는 이유를 알고 바꾼다. */
var BOOKKEEPING_WORDS = ['기장료', '세무기장', '세무사', '세무법인', '회계법인', '세무'];
/* ── (원래 07-state-categories.js) ── */
var UP_TARGET = 20; /* 이만큼만 찍으면 볼 수 있다 */
/* ── (원래 13-onboard.js) ── */
/* ── 금액 옆에는 반드시 그 금액이 어느 기간인지 ──
   사장님은 계좌와 대조하는 사람이다. 기간을 모르면 대조를 못 한다.
   「이번 달 672만원」 아래에 파일 전체 합계 −3,223만원이 라벨 없이 놓이면
   같은 돈인지조차 알 수 없다 */
/* ── 은행에서 잘려 들어온 이름 ──
   적요 칸 글자 수 제한 때문에 원본이 이렇게 들어온다.
     '주식회사 ○○○('  '(주)○○○(쇼'  '홍길동(○○제지서울'
   ★ 안 닫힌 여는 괄호만 증거로 쓴다.
     '_' 나 '-' 뒤의 1~2글자는 잘린 조각일 수도, 온전한 말일 수도 있어 구분이 안 된다
     ('대표_○○' 의 ○○, 'ARS_모빌' 의 모빌, '쿠팡_주' 는 전부 온전한 이름이다).
     닫힌 괄호는 온전하다는 뜻이므로 손대지 않는다 ('코웨이(주)').
   ★ 표시할 때만 다듬는다. 저장 키(rawList)는 원본 그대로 —
     여기 손대면 지난달 찍은 게 다 깨진다 */
function openParenAt(s) {
  var stack = [];
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (c === '(') stack.push(i);
    else if (c === ')') stack.pop();
  }
  return stack.length ? stack[0] : -1; /* 처음으로 안 닫힌 괄호 */
}
function cutTail(name) {
  var s = String(name == null ? '' : name);
  var i = openParenAt(s);
  if (i >= 0) {
    var inside = s.slice(i + 1);
    /* 한두 글자면 버려도 잃을 게 없고, 세 글자부터는 정보라 남기고 잘렸다고 표시한다 */
    s = inside.length <= 2 ? s.slice(0, i) : s + '…)';
  }
  /* 끝에 남은 구분자만. 중간 것은 절대 안 건드린다 */
  return s.replace(/[\s_,-]+$/, '');
}
function isCut(name) {
  var t = cutTail(name);
  return !!t && t !== String(name == null ? '' : name);
}
function showName(name) {
  var t = cutTail(name);
  return t || String(name == null ? '' : name); /* 다 지워지면 원본 그대로 */
}
function payeeSpan(g) {
  var k = Object.keys((g && g.months) || {}).sort();
  if (!k.length) return '';
  var mm = function (m) {
    return +m.slice(5, 7) + '월';
  };
  var y0 = k[0].slice(0, 4),
    y1 = k[k.length - 1].slice(0, 4);
  if (k.length === 1) return y0 + '년 ' + mm(k[0]);
  if (y0 === y1) return y0 + '년 ' + mm(k[0]) + '~' + mm(k[k.length - 1]);
  return y0 + '년 ' + mm(k[0]) + '~' + y1 + '년 ' + mm(k[k.length - 1]);
}
/* ── 35차 B · 거래처 카드의 방향별 사실 줄 ── */
function midOf(xs) {
  var s = xs.slice().sort(function (a, b) {
    return a - b;
  });
  return s.length ? s[(s.length - 1) >> 1] : 0;
}
function dayText(at) {
  return +at.slice(5, 7) + '월 ' + +at.slice(8, 10) + '일';
}
/* 한쪽 방향의 달 범위 — 「4월~8월」
   ★ 해를 넘기면 해를 밝힌다. 안 그러면 2025년 8월~2026년 8월이 「8월~8월」이 된다 */
function sideSpan(g, isIn) {
  return spanOf(Object.keys(isIn ? g.inMonths : g.outMonths).sort());
}
/* 정기성은 규칙에 맞을 때만 말한다. 짐작해서 쓰지 않는다 —
   규칙에 안 맞으면 아무 말도 안 붙인다 (35차 B) */
function repeatLine(g, isIn) {
  var months = Object.keys(isIn ? g.inMonths : g.outMonths).length;
  var n = isIn ? g.inN : g.outN;
  if (months < 3) return null;
  if (n < months || n > months * 2) return null; /* 매달 1~2건 */
  var amts = isIn ? g.inAmts : g.outAmts;
  var mid = midOf(amts);
  var even =
    mid > 0 &&
    amts.every(function (a) {
      return Math.abs(a - mid) <= mid * 0.2;
    });
  /* ★ 44차 2-1. 건수는 앞줄에서 이미 말했다. 여기서 또 쓰면 한 카드에 세 번 나온다 */
  /* ★ 64-3. 금액이 들쭉날쭉하면 「매달 나갑니다」만 나오고 총액뿐이었다 —
     실파일의 어느 거래처가 「7건 · 매달 나갑니다 — 총액」만 보여 한 달에 얼마인지 알 수 없었다.
     고르게 나가는 곳에는 이미 「매달 4일쯤 2,750,300원씩」이 나온다. 그 자리를 메운다.
     ★ 분모는 그 거래처가 있었던 달 수다. 없던 달을 0으로 세면 평균이 낮아진다 */
  var 합 = 0;
  amts.forEach(function (a) {
    합 += a;
  });
  if (!even) {
    return (
      '매달 ' +
      (isIn ? '들어옵니다' : '나갑니다') +
      ' — ' +
      won(months) +
      '달 평균 ' +
      won(Math.round(합 / months)) +
      '원쯤'
    );
  }
  return '매달 ' + midOf(isIn ? g.inDays : g.outDays) + '일쯤 ' + won(mid) + '원씩';
}
/* 한 카드 안에서 위는 +, 아래는 − 로 갈리면 같은 돈인지 헷갈린다.
   확인 카드 안에서는 부호를 늘 드러낸다 */
function wonSign(n) {
  return (n > 0 ? '+' : '') + won(n);
}
function monthSpanIn(U) {
  var ms = {};
  U.rows.forEach(function (r) {
    ms[r.at.slice(0, 7)] = 1;
  });
  var k = Object.keys(ms).sort();
  if (!k.length) return '';
  var f = function (m) {
    return m.slice(0, 4) + '년 ' + +m.slice(5, 7) + '월';
  };
  return k.length === 1 ? f(k[0]) : f(k[0]) + ' ~ ' + f(k[k.length - 1]);
}
/* ── 42차 4번 · 이미지로 저장할 때만 사람 이름을 가린다 ──────
   화면에 거래처 이름을 그대로 보여주는 것은 맞다 — 사장님이 통장과 대조하신다.
   문제는 「이미지로 저장」이다. 그 그림은 카톡으로 나가고,
   임대인·직원·거래처 사장 이름이 같이 나간다. 그분들은 동의한 적이 없다.
   ★ 화면은 그대로 두고 그림에서만 가린다. 사장님은 늘 온전한 이름을 보신다.
   ★ 대표자 이름 규칙(isOwnerName)은 여기 못 쓴다 —
     그건 「사장님 성함과 똑같은가」만 본다. 남의 이름은 판별하지 못한다.
   ★ 짐작이라 틀릴 수 있다. 「이마트」는 성씨 「이」로 시작한다.
     그래서 회사로 읽히는 꼬리말을 먼저 걸러내고, 그래도 틀리면
     사장님이 [사람 이름 가리기]를 끄실 수 있게 둔다 */
var SURNAME = (
  '김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구' +
  '민진지엄채원천방공현함변염여추도소석선설마길연위표명기반라왕금옥육인맹제모탁국' +
  '나사아자차카타파구용점편사'
).split('');
/* ★ 「사람 이름으로 보이는가」는 이미 looksPersonal 이 판단한다 (CORP_MARKS 로 회사를 걸러낸다).
   같은 것을 두 군데서 다르게 판단하면 42차 2번에서 본 일이 또 생긴다.
   여기서는 그 위에 두 가지를 더 얹는다 — 그림은 밖으로 나가므로 더 좁게 본다.
     ① 성씨로 시작할 것
     ② 세 글자나 네 글자일 것. 두 글자까지 열면 「이자」가 사람이 되고,
        「대출이자」 한가운데가 「이○」로 바뀐다 */
function looksPersonName(w) {
  if (!/^[가-힣]{3,4}$/.test(w)) return false;
  /* 세금·보험·공과금 낱말은 사람이 아니다.
     실파일에서 보험료·세금 납부 항목 두 가지가 성씨로 시작해 사람으로 잡혔다 */
  if (taxLike(w)) return false;
  return looksPersonal(w) && SURNAME.indexOf(w.charAt(0)) !== -1;
}
/* 「홍길동」 → 「홍○○」. 첫 글자만 남긴다 */
function hideName(w) {
  var out = w.charAt(0);
  for (var i = 1; i < w.length; i++) out += '○';
  return out;
}
/* ★ 어떤 글자마디가 사람 이름인지는 짐작으로 못 가린다. 두 번 좁혔다.
     처음에는 아무 마디나 봤다 — 여덟 글자 기관 이름 한가운데가 「소○○○」이 됐다.
     다음에는 괄호·띄어쓰기로 쪼갠 마디를 봤다 — 그래도 세금 항목 이름과
     지역 이름이 성씨로 시작해서 가려졌다. 셋 다 사람이 아니다.
   ★ 그래서 「거래처 이름 통째로가 사람 이름일 때」만 가린다.
     그 이름은 다른 줄 한가운데 있어도 같이 가린다 —
     번호가 앞에 붙은 같은 이름이나 「홍길동현대카드」 같은 것이 여기서 걸린다.
   ★ 대신 「홍길동(○○상회)」처럼 한 번도 홀로 나온 적 없는 이름은 못 가린다.
     덜 가리는 쪽으로 틀린다 — 회사 이름을 망가뜨리는 것보다 낫다.
     사장님은 [사람 이름 가리기]를 끄고 원래대로 저장하실 수 있다 */
function personMaskIn(U) {
  var map = {};
  ((U && U.payees) || []).forEach(function (g) {
    (g.rawList || []).concat([g.name]).forEach(function (nm) {
      var t = String(nm).trim();
      if (looksPersonName(t)) {
        map[t] = hideName(t);
        return;
      }
      /* 「홍길동(○○상회)」 꼴 — 괄호 앞이 통째로 사람 이름이면 그 앞부분만 가린다.
         ★ 세금 이름도 같은 꼴이라(「주민세(사업소분)」) 세금·공과금은 먼저 빼낸다 */
      var m = t.match(/^([가-힣]{3,4})[(（]/);
      if (m && looksPersonName(m[1]) && !taxLike(t)) map[m[1]] = hideName(m[1]);
    });
  });
  return map;
}
/* 대표자 이름과 완전히 같을 때만.
   실제 데이터에 「○○가스/대표자이름」 형태가 있어서
   부분일치로 잡으면 가스요금이 「내가 넣은 돈」으로 딸려온다 */
function isOwnerNameIn(U, g) {
  if (!U || !U.owner) return false;
  return canonName(g.name) === canonName(U.owner);
}
/* ── 사람 이름으로 들어온 큰 돈 ──
   실측: 30만원 이상 개인 이름 입금 99건 중 94.9%가 내가 넣은 돈이었다.
   그래도 단정하지 않는다. 추천 순서만 올리고 「매출」을 나란히 둔다 */
var CORP_MARKS = [
  '주식회사',
  '(주)',
  '㈜',
  '유한회사',
  '(유)',
  '농협',
  '은행',
  '카드',
  '공단',
  '공사',
  '시스템',
  '상사',
  '마트',
  '푸드',
  '유통',
  '산업',
  '식품',
  '주류',
  '축산',
  '수산',
  '청과',
  '물산',
  '기업',
  '조합',
  '센터',
  '서비스',
  '컴퍼니',
  '코리아',
  '아트',
  '디자인',
  '스튜디오',
  '물류',
  '전자',
  '통신',
  '건설',
  '개발',
  '테크',
  '하우스',
  '홀딩스'
];
var PERSONAL_MIN = 300000;
/* ★ 45차 ③ · 들어온 돈인데 매출이 아닐 게 뻔한 곳 ──────────────
   들어온 쪽 첫 버튼은 「매출」이다. 대개 맞다 — 들어온 돈의 대부분이 카드사 정산이다.
   그런데 대출 8,000만원이 습관적인 탭 한 번에 매출이 되면 매출이 부풀고 순이익도 틀린다.
   게다가 「대출받은 돈」은 [다른 항목 ▾] 안에 숨어 있었다 — 8,000만원짜리 선택지다.
   ★ 이건 추천이 아니라 「이런 곳에서는 고를 목록 자체가 다르다」는 규칙이다.
     44차에서 못 박은 「추천 때문에 자리를 흔들지 않는다」와 어긋나지 않는다.
   ★ 걸리는 조건 — 한두 번만 들어온 큰 돈 · 돈 빌려주는 기관 이름 · 대표자 성함 */
var LOAN_WORDS = [
  '소상공인',
  '중소벤처',
  '진흥공단',
  '소진공',
  '보증재단',
  '신용보증',
  '기술보증',
  '미소금융',
  '저축은행',
  '캐피탈',
  '새마을금고',
  '신용협동',
  '수협',
  '농협은행'
];
var RARE_IN_MIN = 5000000; /* 한두 번 들어온 「큰 돈」의 선 */
function loanLikeInIn(U, g) {
  if (!g || !g.inN) return false;
  if (isOwnerNameIn(U, g)) return true;
  var t = nz(g.name);
  for (var i = 0; i < LOAN_WORDS.length; i++) {
    if (t.indexOf(LOAN_WORDS[i]) !== -1) return true;
  }
  return g.inN <= 2 && (g.inMax || 0) >= RARE_IN_MIN;
}
function looksPersonal(name) {
  var t = name.trim();
  if (!/^[가-힣]{2,4}$/.test(t)) return false;
  for (var i = 0; i < CORP_MARKS.length; i++) {
    if (t.indexOf(CORP_MARKS[i]) !== -1) return false;
  }
  return true;
}
/* 사람 이름 · 30만원 이상 입금이 한 건이라도 있으면.
   순액으로 보면 사장님이 넣었다 뺐다 한 경우를 통째로 놓친다 */
function personalIn(g) {
  return looksPersonal(g.name) && (g.inMax || 0) >= PERSONAL_MIN;
}
/* 사장님이 「매출」을 더 자주 고르셨으면 그 순서를 따른다 */
function personalFirstIn(U) {
  var p = U.personalPick || { sales: 0, put: 0 };
  return p.sales > p.put ? '매출' : baseNameIn(U, '사업 외 용도');
}
/* 거래처 이름을 띄어쓰기·괄호·특수문자로 쪼갠다. 두 글자 이상만 본다 —
   부분 문자열로 보면 엉뚱한 게 걸린다 */
/* 「주식회사」처럼 어느 이름에나 붙는 낱말은 안 본다 —
   실측에서 「주식회사 ○○」 둘이 낱말 하나 때문에 같은 항목으로 걸렸다 */
var WORD_STOP = [
  '주식회사',
  '유한회사',
  '합자회사',
  '개인사업',
  '사업자',
  '이체',
  '입금',
  '출금',
  '송금',
  '결제',
  '자동결제',
  '자동',
  '카드',
  '체크카드',
  '은행',
  '지점',
  '본점',
  '영업소',
  '대표',
  '대표자',
  '본인',
  '계좌',
  '거래',
  '환급'
];
function nameWords(name) {
  var s = String(name == null ? '' : name);
  return s.split(/[\s()（）[\]{}·,.\-_/|+&#*]+/).filter(function (w) {
    return w.length >= 2 && WORD_STOP.indexOf(w) === -1;
  });
}
/* 사장님이 직접 만드신 항목만 본다. 기본 항목 이름은 「기타」·「월세」처럼 짧아서
   엉뚱한 이름에 걸린다 — 그건 지금 쓰는 자동분류 낱말 목록에 맡긴다.
   이름을 바꾼 기본 항목도 기본이다 (baseCats 로 가린다) */
function madeCatsIn(U) {
  var base = U.baseCats || UP_CATS;
  return (U.accounts || []).filter(function (c) {
    return base.indexOf(c) === -1 && !isKeepIn(U, c);
  });
}
/* ★ 추천일 뿐이다. g.auto 로 찍지 않는다 —
   자동으로 찍으면 6,000만원이 조용히 엉뚱한 항목에 들어가고 사장님은 모르신다 */
function madeHintIn(U, g) {
  var ws = nameWords(g.name);
  if (!ws.length) return [];
  var hits = [];
  madeCatsIn(U).forEach(function (cat) {
    var bag = {},
      n = 0;
    nameWords(cat).forEach(function (w) {
      bag[w] = 1;
    });
    /* 그 항목에 이미 찍어두신 거래처의 낱말도 같이 본다 */
    (U.payees || []).forEach(function (p) {
      if (gCats(p).indexOf(cat) === -1 || p === g) return;
      n++;
      nameWords(p.name).forEach(function (w) {
        bag[w] = 1;
      });
    });
    for (var i = 0; i < ws.length; i++) {
      if (bag[ws[i]]) {
        hits.push({ cat: cat, word: ws[i], n: n });
        return;
      }
    }
  });
  /* 여러 항목이 걸리면 찍어두신 거래처가 많은 쪽을 앞에 */
  hits.sort(function (a, b) {
    return b.n - a.n;
  });
  return hits;
}
/* 은행 표기가 달라 같은 거래처가 갈리는 게 가장 흔한 못정한 원인이다 */
function coreName(s) {
  return s
    .replace(/\(주\)|\(유\)|㈜|주식회사|유한회사/g, '')
    .replace(/[\s·.,\-_/()[\]]/g, '')
    .toLowerCase();
}
function likeName(a, b) {
  if (a.length < 3 || b.length < 3) return false;
  return a.indexOf(b) !== -1 || b.indexOf(a) !== -1;
}
/* 아직 안 찍은 거래처 중 이름이 겹치는 곳 */
function similarPayeesIn(U, g) {
  var a = coreName(g.name);
  if (a.length < 3) return [];
  return U.payees.filter(function (x) {
    return x !== g && !gDone(x) && likeName(a, coreName(x.name));
  });
}
/* 사장님이 이미 찍은 것 중 이름이 겹치는 곳 — 규칙보다 이게 정확하다.
   ★ 81차 ①. x.askSkip 을 뺀다 — 앱이 넘긴 것을 대표님이 정하신 것으로 배우면 안 된다.
     36차 F 규칙이 안 묻고 넘길 때 gSetCat(g, false, baseName(ASK_SKIP_CAT), false) 로 찍는데,
     auto 는 false 라 여기서 안 걸러졌다. 그래서 앱이 스스로 「내가 가져간 돈」으로 넘긴 것을
     정하신 것으로 읽고, likeName 으로 이름이 겹치는 다른 곳에 그 항목을 추천했다 —
     세 글자짜리 「식자재」 하나가 「식자재A」부터 「식자재G」까지 일곱 곳에 다 걸렸다.
   ★ 저장 쪽(pickPayload)은 이미 「if (g.askSkip) return;」 로 걸러내고 있다. 같은 잣대를 맞춘 것이다 */
function learnedForIn(U, g) {
  var a = coreName(g.name),
    hit = null;
  if (a.length < 3) return null;
  U.payees.forEach(function (x) {
    if (
      hit ||
      x === g ||
      !gDone(x) ||
      gCats(x).length !== 1 ||
      x.askSkip ||
      x.auto ||
      x.autoIn ||
      x.autoOut
    )
      return;
    if (likeName(a, coreName(x.name))) hit = { cat: gCats(x)[0], from: x.name };
  });
  return hit;
}
/* ── 81차 ④ · 이름이나 적요에 「세무」가 있으면 세무기장료가 첫 추천 (개발자 확정) ──
   세무사·세무법인·세무회계·세무기장이 모두 걸린다.
   지금은 「○○세무사-H」가 미분류로 떨어지고 「○○세무회계」는
   「내가 가져간 돈」으로 간다. 세무기장료는 사업 지출인데 「내가 가져간 돈」은
   사업 외 용도라, 그대로 두면 사업에 쓴 돈이 줄고 계좌 순이익이 커 보인다.
   ★ 자동 확정이 아니다. 추천 순서 맨 앞일 뿐이다 */
function taxAcctWhere(g) {
  if (nz(g.name).indexOf('세무') !== -1) return '이름';
  var list = g.memoList || [];
  for (var i = 0; i < list.length; i++) {
    if (nz(list[i]).indexOf('세무') !== -1) return '적요';
  }
  return null;
}
/* ── 36차 F · 작은 거래는 묻지 않는다 ──────────────────────────
   ★ 금액만 보고 넘기면 안 된다. 작은 거래처가 두 종류다.
     실측(어느 대표님 두 계좌 12개월) — 20곳 찍고 남는 166곳 중
       한두 번 나가고 만 곳  120곳 ·   7,995만원  → 안 묻는다
       매달 나가는 곳         46곳 · 1억 5,713만원 → 계속 묻는다  ★ 남는 금액의 66%
     매달 20일에 70만원씩 나가는 곳 같은 것들이라 월세·정기 거래일 수 있다.
     금액만 보고 다 넘기면 1억 5,713만원이 사업에 쓴 돈에서 빠진다.

   ★ 이 선택에는 위험이 있다. 법인 계좌 정답 데이터에서는 반대로 나온다 —
     20곳 찍고 남는 것의 86~97%가 진짜 사업 지출이었다.
     그래서 금액을 화면에 드러내고(F-3) · 펼쳐서 되돌리고(F-4) · 크면 알린다(F-5).
     셋 중 하나라도 빠지면 사업에 쓴 돈이 조용히 줄어든다 */
var ASK_MIN_SHARE = 0.001; /* 그 거래처 나간 돈이 전체 금액의 이만큼 미만이면 작다 */
var ASK_MIN_MONTHS = 3; /* 이만큼 되는 달에 나왔으면 「매달 나가는 곳」이라 계속 묻는다 */
/* 파일 전체 금액 — 「전체 금액의 0.1%」의 분모 */
function totalAbsIn(U) {
  var s = 0;
  (U.payees || []).forEach(function (g) {
    s += g.abs;
  });
  return s;
}
/* 이 거래처를 안 묻고 넘길 것인가.
   ★ 들어온 돈이 한 건이라도 있으면 안 넘긴다 — 작은 매출이 조용히 사라지면 안 된다 */
/* ★ 42차 1번. F 규칙이 「사업 외 용도」로 넘기기 전에 세금·보험·공과금 낱말을 본다.
   사업 외 용도는 매출에도 지출에도 안 들어간다 — 사업에 쓴 돈이 손익에서 빠지고
   순이익이 실제보다 커진다. 사장님이 통장과 대조하면 안 맞는다.
   ★ autoCategory 가 이미 같은 낱말을 보지만, 방향이 섞인 거래처는 자동으로 안 잡힌다.
     그 자리를 막는다. 안 넘기면 큐에 남아 사장님께 여쭙는다 */
function taxLike(name) {
  var t = nz(name);
  for (var i = 0; i < TAX_WORDS.length; i++) if (t.indexOf(TAX_WORDS[i]) !== -1) return true;
  for (var j = 0; j < INSURANCE_WORDS.length; j++)
    if (t.indexOf(INSURANCE_WORDS[j]) !== -1) return true;
  for (var k = 0; k < BOOKKEEPING_WORDS.length; k++)
    if (t.indexOf(BOOKKEEPING_WORDS[k]) !== -1) return true;
  for (var u = 0; u < UTIL_WORDS.length; u++) if (t.indexOf(UTIL_WORDS[u]) !== -1) return true;
  return startsUtil(t);
}
function askSkippableIn(U, g, total) {
  /* 사장님이 손수 되돌리신 곳은 다시 넘기지 않는다 — 창을 닫았다 열어도 그대로다 */
  if (U.unskip && U.unskip.indexOf(g.name) !== -1) return false;
  if (gDone(g)) return false; /* 이미 정해진 곳은 건드리지 않는다 */
  if (g.inN > 0) return false; /* 들어온 돈이 섞인 곳은 넘기지 않는다 */
  if (taxLike(g.name)) return false; /* 세금·보험·공과금은 작아도 안 넘긴다 (42차 1번) */
  if (Object.keys(g.outMonths).length >= ASK_MIN_MONTHS) return false; /* 매달 나가는 곳 */
  return total > 0 && g.outSum < total * ASK_MIN_SHARE;
}
/* 넘긴 것 합계 — 파일 전체 기간 기준이다 (원칙 3: 기간을 붙여 쓴다) */
function skipTotalsIn(U) {
  var n = 0,
    sum = 0;
  (U.skipped || []).forEach(function (g) {
    n++;
    sum += g.outSum;
  });
  return { n: n, sum: sum };
}
/* ── 36차 G · 같은 곳을 또 묻지 않는다 ──────────────────────
   「왜 똑같은 거 계속 물어보노. 아까 이거 나왔는데」
   실파일에서 「삼성」이 든 거래처가 16그룹으로 갈린다. 「롯데」 4 · 「현대」 3.
   전각·반각 때문이 아니라 뒤에 붙는 글자가 실제로 달라서 canonName 이 못 묶는다.
   ★ canonName 은 건드리지 않는다. 묶어서 한 번에 찍게만 한다.
   ★ 입금 쪽과 출금 쪽은 절대 같이 묶지 않는다 —
     카드 정산(들어온 돈)과 카드 대금(나간 돈)이 한 덩어리가 되면
     매출이 지출로, 지출이 매출로 넘어간다 */
var GROUP_PREFIX = 4; /* 앞 이 글자 수 이상이 같으면 한 줄로 묶는다 */
/* 아직 안 정한 곳만 묶는다. 이미 정하신 곳은 건드리지 않는다 */
function bundlePoolIn(U) {
  return (U.queue || []).slice(U.pos).filter(function (g) {
    return !gDone(g);
  });
}
/* 나가는 카드 대금인가 — 카드사 이름이 있고 나간 쪽이다.
   ★ autoCategory 는 net > 0 일 때만 카드사를 매출로 잡는다. 분리는 이미 되고 있다 */
function isCardOut(g) {
  if (g.net > 0 || g.outN === 0) return false;
  var t = String(g.name).toLowerCase().replace(/\s/g, '');
  if (t.indexOf('카드') === -1) return false;
  for (var i = 0; i < CARD_WORDS.length; i++) {
    if (t.indexOf(CARD_WORDS[i]) !== -1) return true;
  }
  return false;
}
function spanOf(keys) {
  if (!keys.length) return '';
  var mm = function (m) {
    return +m.slice(5, 7) + '월';
  };
  var y0 = keys[0].slice(0, 4),
    y1 = keys[keys.length - 1].slice(0, 4);
  if (keys.length === 1) return y0 + '년 ' + mm(keys[0]);
  if (y0 === y1) return y0 + '년 ' + mm(keys[0]) + '~' + mm(keys[keys.length - 1]);
  return y0 + '년 ' + mm(keys[0]) + '~' + y1 + '년 ' + mm(keys[keys.length - 1]);
}
function makeBundle(label, mems, kind) {
  var sum = 0,
    n = 0,
    ms = {};
  mems.forEach(function (g) {
    sum += g.net > 0 ? g.inSum : g.outSum;
    n += g.n;
    Object.keys(g.months).forEach(function (k) {
      ms[k] = 1;
    });
  });
  return {
    label: label,
    mems: mems,
    sum: sum,
    n: n,
    kind: kind,
    into: mems[0].net > 0,
    span: spanOf(Object.keys(ms).sort())
  };
}
/* 이 거래처와 한 줄로 묶을 것들 */
function bundleForIn(U, g) {
  var pool = bundlePoolIn(U);
  if (pool.length < 2) return null;
  var mems;
  /* G-2. 나가는 카드 대금은 카드사가 달라도 한 덩어리 */
  if (isCardOut(g)) {
    mems = pool.filter(isCardOut);
    if (mems.length >= 2) return makeBundle('카드 대금', mems, 'card');
  }
  /* G-1. 앞 네 글자 이상이 같은 것끼리. 방향이 같은 것만 */
  var mine = g.net > 0;
  var head = coreName(g.name).slice(0, GROUP_PREFIX);
  if (head.length < GROUP_PREFIX) return null;
  mems = pool.filter(function (x) {
    return x.net > 0 === mine && coreName(x.name).slice(0, GROUP_PREFIX) === head;
  });
  if (mems.length < 2) return null;
  return makeBundle(showName(mems[0].name).slice(0, GROUP_PREFIX), mems, 'prefix');
}
/* ── 67차 ① · 요일과 시각 ────────────────────────────────────────
   거래처 이름만 보고는 「이게 뭐였더라」가 안 풀린다. 날짜에 요일과 시각을 붙이면
   그 순간이 떠오른다 — 화요일 오후 2시에 4만원이면 무엇이었는지는 대표님이 아신다.
   ★ 앱은 뜻을 풀지 않는다. 사실만 놓는다 (요청서 「하지 말 것」).
   ★ 시각은 파일에 있을 때만. r.at 에 이미 붙어 있으므로 파서는 안 건드린다 —
     buildRows 가 「거래일시」나 따로 온 시각 칸을 여기에 담아 둔다.
   ★ 00:00:00 은 시각이 없는 것으로 본다 — buildRows 도 같은 판정을 쓴다 */
var 요일글 = ['일', '월', '화', '수', '목', '금', '토'];
function dowText(at) {
  var y = +String(at).slice(0, 4),
    m = +String(at).slice(5, 7),
    d = +String(at).slice(8, 10);
  if (!y || !m || !d) return '';
  /* 날짜만 있는 글자라 UTC 로 만들어야 시간대 때문에 하루가 안 밀린다 */
  return 요일글[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
function clockText(at) {
  var s = String(at);
  if (s.length < 16) return '';
  var hh = s.slice(11, 13),
    mm = s.slice(14, 16);
  if (!/^\d\d$/.test(hh) || !/^\d\d$/.test(mm)) return '';
  if (hh === '00' && mm === '00' && s.slice(17, 19) === '00') return '';
  return hh + ':' + mm;
}
/* ★ 38차 11번. 금액 큰 순 하나로 통일한다.
   예전에는 추천 낱말이 걸린 곳을 금액과 무관하게 앞으로 당겼다(EASY_FIRST = 3).
   36차에서 진행 바를 넣으면서 그게 역효과가 됐다 —
   눌러도 바가 거의 안 오르는 순간이 생기면 「도대체 얼마나 눌러야 하나」로 읽힌다.
   ★ 추천(✨)은 그대로 둔다. 차례만 금액순이고 걸린 곳에는 여전히 ✨가 붙는다.
   ★ 비슷한 이름(「○○도 같은 곳인가요?」)과 묶음 카드(G)는 차례를 바꾸지 않는다 — 그 카드가 떠 있는 동안만
     관련 거래처를 모아 보여 주고, 답한 거래처는 목록에서 빠진다. 끝나면 남은 목록은 그대로 금액순이다
     (2026-09-29 확인. 예전 주석의 「앞에 두었습니다」는 38차 11번 뒤로 사실이 아니었다).
   금액이 같으면 이름 순으로 갈라 회차마다 같은 차례가 되게 한다 */
/* 되돌린 거래처를 아직 안 물은 자리(from 뒤)에 금액순으로 다시 끼운다 — orderQueue 와 같은 차례 규칙.
   ★ 묶음을 되돌렸을 때 맨 뒤로 가서 금액순이 깨지던 것을 막는다 (2026-09-29 요한 확정: 기능이 끝나면 큰 금액순) */
function queueInsertByAmount(queue, from, g) {
  var j = Math.max(0, from);
  while (
    j < queue.length &&
    (queue[j].abs > g.abs || (queue[j].abs === g.abs && queue[j].name < g.name))
  )
    j++;
  queue.splice(j, 0, g);
}
function orderQueue(list) {
  return list.slice().sort(function (a, b) {
    if (b.abs !== a.abs) return b.abs - a.abs;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
}
/* ── 36차 K · 목표선은 파일이 정한다 ────────────────────────
   고정 %로 두면 파일마다 뜻이 달라진다. 실측에서 도달하는 %가 81~96%로 흩어졌다.
     목표선 = 다음에 물을 거래처가 전체 금액의 0.5% 미만이 되는 지점
             단, 그 지점에서 안 정한 금액이 아직 전체의 20%를 넘으면 넘지 않을 때까지 뒤로 민다
   ★ 41차 2번. 예전 주석은 「흑자·적자가 뒤집힐 수 있으면(blocked) 뒤로 민다」였다.
     코드는 monthNumbers().blocked 를 한 번도 안 봤다 — 하는 일은 금액 몫 하나뿐이다.
     이름도 goalBlocked 라서 읽는 사람이 지켜진다고 여겼다. 하는 일대로 맞춘다
   ★ F에서 안 묻기로 한 곳은 세지 않는다. 안 물을 것을 세면 목표선이 영영 안 온다.
     매달 나가는 곳은 묻는 대상이라 목표선 계산에 넣는다 (줄에 그대로 남아 있다) */
var GOAL_MIN_SHARE = 0.005;
/* 37차 3번. 큰 숫자가 분모를 가져갔으니 작은 줄에는 남은 곳 이야기만 둔다.
   짐작해서 쓰지 않는다 — 남은 곳이 없거나 금액을 못 재면 아무 말도 안 붙인다 */
function goalRestTextIn(U) {
  var pend = (U.queue || []).filter(function (g) {
    return !gDone(g);
  });
  if (!pend.length) return '';
  var biggest = 0;
  pend.forEach(function (g) {
    var v = gOpenAbs(g);
    if (v > biggest) biggest = v;
  });
  if (!biggest) return '';
  /* ★ 안심시키는 말일 때만 한다. 남은 것이 아직 큰데
     「남은 곳은 하나에 4,794만원이 안 됩니다」라고 하면 겁주는 말이 된다.
     목표선 기준(전체 금액의 0.5%) 아래로 내려왔을 때만 말한다 */
  var tot = totalAbsIn(U);
  if (!tot || biggest >= tot * GOAL_MIN_SHARE) return '';
  /* ★ 63-8. 「남은 곳은 하나에 3,170,000원이 안 됩니다」는 뜻이 안 통했다 —
     「하나에」가 어디에 걸리는지 읽히지 않는다. 먼저 결론을 말하고 근거를 뒤에 붙인다.
     만원 단위로 올려 말한다 — 넘겨도 된다는 말이라 올림이 안전한 쪽이다 */
  var man = Math.ceil(biggest / 10000) * 10000;
  return '남은 곳들은 다 자잘합니다 — 가장 큰 곳도 ' + won(man) + '원이 안 됩니다';
}
function goalLineIn(U) {
  var tot = totalAbsIn(U);
  if (!tot) return { share: 1, next: 0 };
  /* 이미 정한 금액 + 큐에서 앞으로 물을 것들을 큰 것부터 더해 나간다 */
  var acc = 0;
  U.payees.forEach(function (g) {
    acc += g.abs - gOpenAbs(g);
  });
  var pend = (U.queue || [])
    .filter(function (g) {
      return !gDone(g);
    })
    .map(function (g) {
      return gOpenAbs(g);
    })
    .sort(function (a, b) {
      return b - a;
    });
  var i = 0;
  /* 다음에 물을 것이 0.5% 미만이 될 때까지 */
  while (i < pend.length && pend[i] >= tot * GOAL_MIN_SHARE) {
    acc += pend[i];
    i++;
  }
  /* 그 지점에서 안 정한 금액이 아직 전체의 20%를 넘으면 넘지 않을 때까지 뒤로 민다 */
  var guard = 0;
  while (i < pend.length && guard++ < 500 && goalShareLeft(tot, acc)) {
    acc += pend[i];
    i++;
  }
  return { share: Math.min(1, acc / tot), next: pend.length - i };
}
/* 그 지점까지 정해도 안 정한 금액이 아직 전체의 20%를 넘는가.
   ★ 흑자·적자가 뒤집히는지(blocked)는 안 본다 — 이름이 그렇게 말하지 않게 한다 (41차 2번) */
function goalShareLeft(tot, acc) {
  var rest = tot - acc;
  return rest > tot * ONBOARD_MAX_UNKNOWN;
}
/* 18차 A의 RATIO_MAX_UNKNOWN 과 같은 값. 비율을 보여줄 수 있는 선이다 */
var ONBOARD_MAX_UNKNOWN = 0.2;
function onboardDoneIn(U) {
  if (U.pos >= U.queue.length) return true; /* 다 봤으면 끝 */
  if (U.pos >= U.target) return true;
  /* 건수가 아니라 금액이다. 220곳 중 152곳이 남아도 그게 금액의 2%면 할 일이 없다.
     다만 첫 회차에 서너 곳 찍고 끝나면 「이게 다야?」가 되니 최소 스무 곳은 보여준다.
     지난번 것을 되살린 달은 이미 보실 게 다 있으니 그 최소치를 안 건다.
     사장님이 직접 「더 찍기」를 누른 회차에는 어느 쪽이든 끼어들지 않는다 */
  if (U.more) return false;
  var floorN = U.restored ? 0 : UP_TARGET;
  return U.pos >= floorN && 1 - coverageIn(U, 0) <= ONBOARD_MAX_UNKNOWN;
}
/* 지금까지 금액의 몇 %를 분류했는지 */
function coverageIn(U, extra) {
  var tot = 0,
    done = 0;
  /* 섞인 거래처는 안 정한 쪽 금액만 남은 것으로 센다 (35차 B) */
  U.payees.forEach(function (g) {
    tot += g.abs;
    done += g.abs - gOpenAbs(g);
  });
  if (extra) {
    var c = 0;
    for (var i = U.pos; i < U.queue.length && c < extra; i++) {
      var open = gOpenAbs(U.queue[i]);
      if (!open) continue;
      done += open;
      c++;
    }
  }
  return tot ? done / tot : 1;
}
/* ★ 42차 3번. 이 둘은 「무엇의 몇 %」를 말한다. 100%가 되면 그건 「전부」다.
   세 자리 %는 사장님께 뜻이 없다 — 100%도 세 자리다 */
function pctTxt(x) {
  var n = Math.round(x * 100);
  return n >= 100 ? '전부' : n + '%';
}
/* 남은 거래처 수 — 이 회차 목록에서 아직 안 물어본 것 */
function restCountIn(U) {
  return Math.max(0, U.queue.length - U.pos);
}
/* ── 두 문턱이 서로 다른 걸 잰다 ──
   onboardDone 은 전 기간·모든 거래처·입출금 합을 보고,
   ratioMuted 는 그 달·지출만 본다. 못정한가 한 달에 몰리면
   「이제 보실 수 있습니다」라고 해놓고 어떤 달은 비율을 못 보여준다.
   문턱을 맞추면 어떤 매장은 71곳을 찍어야 해서 「149개」 문제가 되살아난다.
   그래서 고치지 않고, 나가시기 전에 미리 말씀드린다.
   미리 알면 놀라움이 아니라 정보다 */
function mutedMonthsIn(U) {
  if (!U || !U.rows || !U.rows.length) return [];
  var months = monthListIn(U),
    out = [];
  months.forEach(function (m) {
    var d = monthNumbersIn(U, m, isRunningIn(U, m, months) ? lastDayInIn(U, m) : null);
    if (ratioMuted(d)) out.push(m);
  });
  return out;
}
/* ★ 41차 1번 (다). 순이익을 못 내놓는 달. ratioMuted 와 다른 것을 잰다 —
     muted 는 「비율을 못 보여준다」이고 blocked 는 「순이익을 못 셉니다」다 */
/* ★ 41차 6번. 파일 전 기간의 「사업에 쓴 돈」 합계.
   skipTotals() 가 전 기간 합계인데 그 옆줄이 「그 달」 사업에 쓴 돈을 분모로 썼다.
   같은 3,229만원이 한 줄에서는 4%, 바로 아랫줄에서는 81%였다 (20곳 찍고 2026-08) */
function costAllSpanIn(U) {
  var months = monthListIn(U),
    t = 0;
  months.forEach(function (m) {
    var d = monthNumbersIn(U, m, isRunningIn(U, m, months) ? lastDayInIn(U, m) : null);
    t += d.cost || 0;
  });
  return t;
}
function blockedMonthsIn(U) {
  if (!U || !U.rows || !U.rows.length) return [];
  var months = monthListIn(U),
    out = [];
  months.forEach(function (m) {
    var d = monthNumbersIn(U, m, isRunningIn(U, m, months) ? lastDayInIn(U, m) : null);
    if (d.blocked) out.push(m);
  });
  return out;
}
/* 금액 큰 순으로 몇 곳을 더 넣어야 모든 달이 문턱 아래로 내려가는지.
   큐를 실제로 건드리지 않고 항목만 잠깐 넣었다 되돌린다 */
/* 30곳을 넘으면 숫자를 안 쓴다. 「51곳 더」는 어젯밤 그 문제로 돌아간다.
   그래서 30까지만 세어보고 안 되면 −1 이다 */
var MUTED_TRY_MAX = 30;
function picksToClearMonthsIn(U) {
  var rest = U.queue.slice(U.pos),
    i,
    hit = -1;
  var n = Math.min(rest.length, MUTED_TRY_MAX);
  for (i = 0; i < n; i++) rest[i].__was = rest[i].cat;
  for (i = 0; i <= n; i++) {
    if (!mutedMonthsIn(U).length) {
      hit = i;
      break;
    }
    if (i < n) rest[i].cat = '기타경비';
  }
  for (i = 0; i < n; i++) {
    rest[i].cat = rest[i].__was;
    delete rest[i].__was;
  }
  return hit;
}
function mutedNames(ms, months) {
  if (ms.length > 5) {
    return NUM_KO2(months.length) + ' 달 중 ' + NUM_KO2(ms.length) + ' 달은';
  }
  return (
    ms
      .map(function (m) {
        return +m.slice(5, 7) + '월';
      })
      .join(' · ') + '은'
  );
}
function NUM_KO2(n) {
  var k = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
  return k[n] || String(n);
}
