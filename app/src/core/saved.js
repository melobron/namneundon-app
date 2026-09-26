/* ── core · 저장 자료의 모양 — 옛 판 항목 옮기기(migrateCats) · 모양 검사(manualShapeOk · banksShapeOk) · 저장 서명 · 은행 이름 열쇠.
   ★ 저장 이름(key) · 형식은 그대로다 — 검사 · 옮기기 계산만 여기로 왔고, 읽고 쓰는 것은 00-storage · 12-storage 가 한다.
   옛 07-state-categories(항목 판 번호 CAT_CV 등) · 12-storage 의 일부. 매장 자료(UP)를 읽는 것은 fIn(U, …).
   단위 테스트: tests/core/saved.spec.mjs
   리팩토링 B-1i (2026-09-26). */
/* ── (원래 07-state-categories.js) ── */
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
/* ── (원래 12-storage.js) ── */
/* 바뀌었는가만 본다. 200KB 를 찍을 때마다 다시 쓰지 않으려는 것이다 */
function dataSigIn(U) {
  var n = 0;
  (U.banks || []).forEach(function (b) {
    n += (b.rows || []).length;
  });
  return (
    (U.banks || []).length +
    '|' +
    n +
    '|' +
    (U.store || '') +
    '|' +
    (U.owner || '') +
    '|' +
    (U.trade || '') +
    '|' +
    (U.opening || 0) +
    '|' +
    (U.closing || 0) +
    '|' +
    (U.patched || 0) +
    '|' +
    (U.unsure || 0) +
    '|' +
    (U.zeroed || 0) +
    '|' +
    /* ★ 112차 ②. 다시 고르시면 이 값이 바뀐다 — 안 넣으면 지문이 같아 저장을 건너뛴다 */
    (U.byStated || 0) +
    '|' +
    (U.autoPatched || 0)
  );
}
/* 저장해둔 것을 startFromBanks 가 받는 모양으로 되돌린다.
   ★ breaks 는 비운다 — 확인 카드는 이미 끝났고, 그 결과는 줄마다
     residual·patched·unsure 로 붙어 있다 (amtOf 가 그것을 읽는다) */
function banksFromData(o) {
  return (o.banks || []).map(function (b) {
    return {
      name: b.name,
      file: b.file,
      sheet: b.sheet,
      header: b.header,
      balName: b.balName,
      balTried: b.balTried,
      bankHint: b.bankHint,
      bank: b.bank,
      typed: b.typed || null,
      found: b.found || null,
      from: b.from || null,
      to: b.to || null,
      range: b.range || null /* ★ 113차 ① */,
      opening: +b.opening || 0,
      closing: +b.closing || 0,
      moved: +b.moved || 0,
      breaks: [],
      kept: true /* 이름이 이미 붙은 계좌다 — 번호를 다시 안 붙인다 */,
      rows: (b.rows || []).slice()
    };
  });
}
/* 저장 직전 검사 — 숫자가 하나라도 섞이면 저장하지 않는다 */
function hasNumber(v) {
  if (typeof v === 'number') return true;
  if (Array.isArray(v)) return v.some(hasNumber);
  if (v && typeof v === 'object')
    return Object.keys(v).some(function (k) {
      return hasNumber(v[k]);
    });
  return false;
}
/* 「본 것」은 세지 않는다 — 카드 id 에 거래처 이름이 들어 있어 본 목록을 남길 수 없고,
   창마다 다시 세면 분모가 부풀려진다. 누르신 것만 센다 */
/* ★ 사용 기록의 내부값이다. 화면 글자(「확인」)와 갈라 둔다 —
   여기를 바꾸면 옛 기록과 안 맞아 셀 수가 없다 */
var USE_CARDS = ['맞습니다', '확인해볼게요', '되돌리기'];
function useBlank() {
  var o = {
    v: 1,
    판: '',
    연날: [],
    올림: [],
    올림실패: [],
    찍기: [],
    되살림: [],
    확인카드: {},
    열어본화면: {}
  };
  USE_CARDS.forEach(function (k) {
    o.확인카드[k] = 0;
  });
  return o;
}
/* 화면에 보여줄 글. 사장님이 이걸 그대로 보고 누르신다 */
function useMin(sec) {
  var m = Math.floor(sec / 60),
    s = sec % 60;
  return m ? m + '분 ' + s + '초' : s + '초';
}
function useDot(d) {
  return +d.slice(0, 2) + '/' + +d.slice(3, 5);
}
/* 이름을 바꾼 항목 — 옛 저장분을 새 이름으로 옮긴다.
   안 옮기면 옛 매장은 「대출 갚은 돈」, 새 매장은 「은행 원금 상환」이 되어
   같은 사장님 화면에 두 말이 같이 나온다 */
/* ★ 36차. 「내가 가져간 돈」 → 「사업 외 용도」.
   옛 이름 사슬을 곧바로 마지막 이름으로 잇는다 — 차례에 안 기대게 하려는 것이다.
   「가게에서 뺀 돈」으로 저장하신 분도 한 번에 「사업 외 용도」로 온다 */
/* ★ 57차 ④. 대출 셋을 「대출 상환」으로 모은다.
   「대출이자」는 숫자가 안 바뀌고, 「은행 원금 상환」은 바뀐다 —
   계산 밖에서 지출로 온다. 의도한 변화다 */
/* ★ 63차. 개인 돈 셋을 「사업 외 용도」 하나로 모은다 — 뜻은 그대로다.
   「내가 넣은 돈」으로 저장된 입금 줄은 KEEP_SIDE 가 다시 「내가 넣은 돈」으로
   돌려주고, 출금 줄은 「내가 가져간 돈」이 된다. 이름만 이사하는 것이다.
   ★ 「대출받은 돈」 → 「대출」. 57차에 「대출」을 「대출 상환」으로 보냈던 규칙은
     이 표에서 빼고 CAT_RENAMED_OLD 로 옮긴다 — cv 2 이하에서만 돌아야 한다.
     지금 「대출」은 계산 밖 항목이라, 여기 두면 새 이름이 곧바로 지출로 끌려간다 */
var CAT_RENAMED = {
  '대출 갚은 돈': '대출 상환',
  '은행 원금 상환': '대출 상환',
  대출이자: '대출 상환',
  '대출받은 돈': '대출',
  공과금: '전기·가스·수도' /* 63-6 */,
  '투자받은 돈': '사업 외 용도' /* 38차 7번 */,
  '가게에서 뺀 돈': '사업 외 용도',
  '내가 가져간 돈': '사업 외 용도',
  '내가 넣은 돈': '사업 외 용도',
  '가게에 넣은 돈': '사업 외 용도'
};
/* cv 2 이하에만 쓰는 표. 그때의 「대출」은 그냥 지출 항목이었다 */
var CAT_RENAMED_OLD = { 대출: '대출 상환' };
/* 이름만 바뀐 것이 아니라 성격이 바뀐 것 — 계산 밖에서 지출로 왔다.
   keepSet 에 옛 이름이 남아 있으면 새 이름이 그 자리를 물려받아
   지출 항목이 계산 밖에 남는다. 그 자리는 덜어낸다 */
var CAT_UNKEEP = { '대출 상환': 1 };
function migrateCats(o) {
  /* ★ 38차. baseCats 의 옛 차례를 「이름 바꾸기」보다 먼저 읽어둔다.
     먼저 바꿔버리면 칸이 줄거나 밀려 옛 차례를 못 알아본다 —
     그러면 「사업 외 용도」 자리에 「내가 넣은 돈」이 들어가는 식으로 어긋난다 */
  var renameMap = null;
  if (Array.isArray(o.baseCats) && o.cv !== CAT_CV) {
    /* ★ 57차. cv 2 는 길이가 16 으로 옛 판과 같아 길이로 못 가른다. cv 로 가른다 */
    /* ★ 63차. cv 3 도 마찬가지다 — 길이(14)로는 못 가른다 */
    var lg =
      o.cv === 4
        ? CAT_LEGACY_CV4
        : o.cv === 3
          ? CAT_LEGACY_CV3
          : o.cv === 2
            ? CAT_LEGACY_CV2
            : CAT_LEGACY[o.baseCats.length];
    renameMap = {};
    if (lg) {
      lg.forEach(function (orig, i) {
        if (o.baseCats[i] && o.baseCats[i] !== orig) renameMap[orig] = o.baseCats[i];
      });
    }
  }
  function applyRenames(map) {
    Object.keys(map).forEach(function (old) {
      var neu = map[old];
      ['accounts', 'keepSet'].forEach(function (k) {
        if (!Array.isArray(o[k])) return;
        var i = o[k].indexOf(old);
        if (i === -1) return;
        /* ★ 57차. 계산 밖에서 지출로 옮겨온 이름은 keepSet 에서 아예 덜어낸다 */
        if (k === 'keepSet' && CAT_UNKEEP[neu]) {
          o[k].splice(i, 1);
          return;
        }
        /* 새 이름이 이미 있으면 옛 칸을 덜어낸다. 안 그러면 두 이름이 같이 남는다 */
        if (o[k].indexOf(neu) === -1) o[k][i] = neu;
        else o[k].splice(i, 1);
      });
      Object.keys(o.picks || {}).forEach(function (raw) {
        if (o.picks[raw] === old) o.picks[raw] = neu;
        /* 방향별로 저장된 것도 같이 따라간다 (35차 B) */
        var v = o.picks[raw];
        if (v && typeof v === 'object') {
          if (v['입금'] === old) v['입금'] = neu;
          if (v['출금'] === old) v['출금'] = neu;
        }
      });
    });
  }
  /* ★ 63차. 옛 「대출」(그냥 지출 항목)을 먼저 치운다. 지금의 「대출」은 계산 밖이라
     이 둘이 같은 표에 있으면 새 이름이 곧바로 지출로 끌려간다 */
  if (!(o.cv >= 3)) applyRenames(CAT_RENAMED_OLD);
  applyRenames(CAT_RENAMED);
  /* ── 38차 · baseCats 를 이름으로 옮겨 붙인다 ─────────────────
     ★ 자리로 맞추던 것을 그만둔다. 항목을 빼거나 넣거나 차례를 바꾸면
       그 뒤가 전부 밀려 엉뚱한 이름이 나온다 (36차에 한 번 그럴 뻔했다).
     위에서 미리 읽어둔 renameMap(원래 이름 → 사장님이 고친 이름)을 지금 차례로 다시 세운다.
     cv:2 가 붙은 것은 이미 지금 차례라 손대지 않는다 */
  if (renameMap) {
    /* 없어진 항목의 이름을 고쳐 쓰고 계셨으면 그 이름을 물려받을 항목에 넘긴다 —
       조용히 사라지면 그 항목으로 찍어둔 분류가 갈 곳을 잃는다 */
    Object.keys(renameMap).forEach(function (orig) {
      if (UP_CATS.indexOf(orig) !== -1) return;
      var neu = CAT_RENAMED[orig];
      if (neu && renameMap[neu] === undefined) renameMap[neu] = renameMap[orig];
    });
    o.baseCats = UP_CATS.map(function (c) {
      return renameMap[c] || c;
    });
    o.cv = CAT_CV;
  }
  /* 그 판에는 아예 없던 항목만 더한다. 사장님이 손수 지우신 것은 되살리지 않는다 */
  if (Array.isArray(o.accounts)) {
    var had = {};
    [15, 16, 17].forEach(function (n) {
      (CAT_LEGACY[n] || []).forEach(function (c) {
        had[c] = 1;
      });
    });
    CAT_LEGACY_CV2.forEach(function (c) {
      had[c] = 1;
    }); /* 57차 */
    CAT_LEGACY_CV3.forEach(function (c) {
      had[c] = 1;
    }); /* 63차 */
    CAT_LEGACY_CV4.forEach(function (c) {
      had[c] = 1;
    }); /* 75차 */
    /* ★ 63차. 이름만 옮긴 항목은 옛 판에 있던 것이다.
       안 그러면 「공과금」을 손수 지우신 분께 「전기·가스·수도」가 되살아난다 */
    Object.keys(CAT_RENAMED).forEach(function (old) {
      if (had[old]) had[CAT_RENAMED[old]] = 1;
    });
    UP_CATS.forEach(function (c) {
      if (had[c]) return; /* 옛 판에도 있던 것 */
      if (o.accounts.indexOf(c) === -1) o.accounts.push(c);
      if (Array.isArray(o.keepSet) && UP_KEEP.indexOf(c) !== -1 && o.keepSet.indexOf(c) === -1)
        o.keepSet.push(c);
    });
    /* 75차 전의 묶음 항목은 새 기본 목록에서는 없앤다.
       다만 실제 저장 분류가 남아 있으면 조용히 버리지 않고 옛 항목으로 보존한다. */
    var legacyUsed = false;
    Object.keys(o.picks || {}).forEach(function (raw) {
      var v = o.picks[raw];
      if (
        v === '세금·보험' ||
        (v && typeof v === 'object' && (v['입금'] === '세금·보험' || v['출금'] === '세금·보험'))
      )
        legacyUsed = true;
    });
    if (!legacyUsed) {
      var oldTax = o.accounts.indexOf('세금·보험');
      if (oldTax !== -1) o.accounts.splice(oldTax, 1);
    }
  }
  /* ★ 63-2. 기본 항목은 baseCats 차례대로 다시 세운다.
     이름을 옮기면 그 항목이 있던 자리에 그대로 남는데, 옛 판에서 「대출받은 돈」은
     맨 끝이었다 — 그러면 되살린 매장에서만 「대출」이 목록 맨 아래에 홀로 있고
     「대출 상환」과 안 붙는다. 손수 만드신 항목은 뒤에 그대로 둔다 */
  if (Array.isArray(o.accounts) && Array.isArray(o.baseCats)) {
    var order = {};
    o.baseCats.forEach(function (c, i) {
      order[c] = i;
    });
    var base = [],
      extra = [];
    o.accounts.forEach(function (c) {
      if (order[c] !== undefined) base.push(c);
      else extra.push(c);
    });
    base.sort(function (a, b) {
      return order[a] - order[b];
    });
    o.accounts = base.concat(extra);
  }
  return o;
}
/* ── 저장 직전 모양 검사 ──
   fc.picks 를 지키는 hasNumber 의 짝이다. fc.manual 은 숫자를 담는 통이라
   hasNumber 를 쓸 수 없어, 대신 「모양이 이것뿐인가」를 본다.
     items   : id · name · side 세 글자 키만
     amounts : 달(YYYY-MM) → id → 숫자만
   거래내역이 실수로 흘러드는 길을 막는 것이 목적이다.
   모양이 다르면 저장하지 않는다 */
function manualShapeOk(m) {
  if (!m || typeof m !== 'object') return false;
  /* ★ 83차 ②-4. v:1(days 없음)과 v:2(days 있음)를 둘 다 통과시킨다.
     옛 저장분을 안 읽어버리면 적어두신 금액이 통째로 사라진다 */
  var 열쇠 = Object.keys(m).sort().join(',');
  if (m.v === 1) {
    if (열쇠 !== 'amounts,items,v') return false;
  } else if (m.v === 2) {
    if (열쇠 !== 'amounts,days,items,v') return false;
  } else return false;
  if (!Array.isArray(m.items)) return false;
  var okItem = true,
    ids = {};
  m.items.forEach(function (it) {
    if (!it || typeof it !== 'object') {
      okItem = false;
      return;
    }
    if (Object.keys(it).sort().join(',') !== 'id,name,side') {
      okItem = false;
      return;
    }
    if (typeof it.id !== 'string' || typeof it.name !== 'string') {
      okItem = false;
      return;
    }
    if (it.side !== 'in' && it.side !== 'out') {
      okItem = false;
      return;
    }
    ids[it.id] = 1;
  });
  if (!okItem) return false;
  if (!m.amounts || typeof m.amounts !== 'object' || Array.isArray(m.amounts)) return false;
  var okAmt = true;
  Object.keys(m.amounts).forEach(function (mo) {
    if (!/^[0-9]{4}-[0-9]{2}$/.test(mo)) {
      okAmt = false;
      return;
    }
    var box = m.amounts[mo];
    if (!box || typeof box !== 'object' || Array.isArray(box)) {
      okAmt = false;
      return;
    }
    Object.keys(box).forEach(function (id) {
      if (typeof box[id] !== 'number' || !isFinite(box[id])) okAmt = false;
    });
  });
  if (!okAmt) return false;
  /* ★ 83차 ②. days 도 amounts 와 같은 잣대로 본다 —
     거래내역이 실수로 흘러드는 길을 막는 것이 이 검사의 목적이다.
     칸은 id·day·amt 셋뿐이고, day 는 1~31 숫자, amt 는 숫자다 */
  if (m.v === 1) return true;
  if (!m.days || typeof m.days !== 'object' || Array.isArray(m.days)) return false;
  var okDay = true;
  Object.keys(m.days).forEach(function (mo) {
    if (!/^[0-9]{4}-[0-9]{2}$/.test(mo)) {
      okDay = false;
      return;
    }
    var arr = m.days[mo];
    if (!Array.isArray(arr)) {
      okDay = false;
      return;
    }
    arr.forEach(function (it) {
      if (!it || typeof it !== 'object') {
        okDay = false;
        return;
      }
      if (Object.keys(it).sort().join(',') !== 'amt,day,id') {
        okDay = false;
        return;
      }
      if (typeof it.id !== 'string') {
        okDay = false;
        return;
      }
      if (
        typeof it.day !== 'number' ||
        !isFinite(it.day) ||
        it.day < 1 ||
        it.day > 31 ||
        it.day !== Math.floor(it.day)
      ) {
        okDay = false;
        return;
      }
      if (typeof it.amt !== 'number' || !isFinite(it.amt)) okDay = false;
    });
  });
  return okDay;
}
/* ── 41차 5번 · 계좌 이름만 담는 저장통 ────────────────────
   40차에는 「저장통에 넣지 마세요」였는데, 매달 쓰는 앱에서 매달 다시 넣는 것이
   성가시다고 하셔서 되돌린다. 계좌 이름은 거래내역도 금액도 아니다.
   ★ 담는 것은 이름 글자 하나뿐이다. 잔액·거래·계좌번호는 절대 안 담는다.
   ★ 사장님이 「110-587 통장」처럼 숫자가 든 이름을 넣으실 수 있어
     fc.picks 와 통을 나눈다 — hasNumber 를 풀지 않으려는 것이다 (fc.manual 과 같은 뜻).
   ★ 되살릴 때는 은행 이름을 못 찾은 계좌에만 붙인다.
     자동으로 잡은 이름을 덮어쓰면 40차에 고친 「틀린 것을 확신 있게 말하는」 자리로 되돌아간다.
   ★ 파일 목록 화면은 매장 이름을 묻기 전이라 그때는 되살릴 수 없다.
     매장이 정해진 뒤(온보딩 시작)에 붙인다 */
/* 저장 이름 BANK_KEY 은 00-storage.js 에 모았다 */
/* 계좌를 가리키는 열쇠. 숫자는 통째로 뺀다 —
   내려받을 때마다 바뀌는 시각(20260824170405)이 붙어 있고,
   숫자를 열쇠에 담지 않는 편이 이 통의 뜻에 맞다 */
function bankNameKey(b) {
  var s = String((b.sheet || '') + '|' + (b.name || b.file || ''));
  return s.replace(/[0-9]/g, '').toLowerCase().slice(0, 80);
}
/* ── 63-1 · 같은 계좌면 저장된 매장으로 ─────────────────────────
   ★ 버그였다. 치과로 만들어 저장한 브라우저에서 병원 타일을 누르고 같은 파일을
     다시 올리면, 매장 이름을 새로 물었다. 이름을 안 적거나 다르게 적으면
     그 자리에서 새 매장이 되어 정해둔 것이 통째로 안 살아났다.
     실사용자는 전부 이 길을 밟는다 — 한 번 써 본 사람이 다시 올리는 것이 정상 사용이다.
   ★ 그래서 파일 쪽에서 매장을 알아낸다. 이미 있는 계좌 열쇠를 그대로 쓴다.
   ★ 저장이 타일을 이긴다 (62차 ②). 다만 말없이 이기지 않는다 — askKnownStore 가 말한다 */
/* 계좌 열쇠는 파일을 읽는 그 자리에서 한 번만 만들어 계좌에 붙여둔다.
   ★ 나중에 다시 만들면 그 사이에 b.bank 같은 칸이 바뀌어 값이 흔들릴 수 있다.
     저장할 때와 찾을 때가 한 글자라도 다르면 되살림이 조용히 안 된다 */
function bankKeyOf(b) {
  if (!b) return '';
  if (!b.acckey) b.acckey = bankNameKey(b);
  return b.acckey;
}
function bankKeysNowIn(U) {
  if (!U || !U.banks) return [];
  var out = [];
  U.banks.forEach(function (b) {
    var k = bankKeyOf(b);
    if (k && out.indexOf(k) === -1) out.push(k);
  });
  return out;
}
/* { v:1, names: { 열쇠: '이름' } } — 이 모양이 아니면 안 읽고 안 쓴다 */
function banksShapeOk(o) {
  if (!o || typeof o !== 'object') return false;
  if (o.v !== 1) return false;
  if (Object.keys(o).sort().join(',') !== 'names,v') return false;
  var n = o.names;
  if (!n || typeof n !== 'object' || Array.isArray(n)) return false;
  var keys = Object.keys(n);
  if (keys.length > 40) return false;
  var ok = true;
  keys.forEach(function (k) {
    if (typeof k !== 'string' || k.length > 80) {
      ok = false;
      return;
    }
    if (typeof n[k] !== 'string' || !n[k].length || n[k].length > 20) ok = false;
  });
  return ok;
}
/* 아직 안 적으신 끝난 달이 몇 개인가 (규칙 3) */
function manualLeftIn(U, months) {
  if (!U.manual || !U.manual.items.length) return 0;
  var n = 0;
  (months || []).forEach(function (m) {
    if (isRunningIn(U, m, months)) return; /* 진행 중인 달은 안 센다 (규칙 2) */
    var any = false;
    U.manual.items.forEach(function (it) {
      if (manualAmtIn(U, m, it.id)) any = true;
    });
    if (!any) n++;
  });
  return n;
}
