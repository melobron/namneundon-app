/* 계산은 core/due.js 의 dueDailyIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function dueDaily(t, i, 상세) {
  return dueDailyIn(UP, t, i, 상세);
}
/* 계산은 core/due.js 의 rangeNotesIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function rangeNotes(c) {
  return rangeNotesIn(UP, c);
}
/* 계산은 core/due.js 의 dueCoverIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function dueCover(t, 마지막) {
  return dueCoverIn(UP, t, 마지막);
}

/* ── 116차 앞 · 예측 표본에서 빠진 「아직 안 정한 출금」 ────────────────
   dueTable 은 아직 안 정한 거래(UNSET)를 사업 지출에 안 넣는다. 그래서
   예상 지출이 그만큼 적게 잡히고, 그 값으로 만든 예상 잔액이 실제보다 넉넉해 보인다.
   ★ 이번에는 미정 출금을 예상 지출에 더하지 않는다. 예측 공식도 한 줄 안 바꾼다.
     그런 거래가 예측에 실제로 쓰인 비교 날짜에 있으면 예상 잔액 표시를 보류할 뿐이다.
   ★ 보류를 0원으로 표시하지 않는다. 안 보여주는 것이지 0원이 아니다.
   ★ 사업 외 지출로 분류되어 보류가 풀려도 그 지출이 예측에 반영됐다는 뜻은 아니다.
     계산 범위를 넓히는 일은 뒤 회차로 둔다 */

/* 계산은 core/due.js 의 dueUnknownOutIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function dueUnknownOut(t) {
  return dueUnknownOutIn(UP, t);
}
/* 계산은 core/due.js 의 dueHoldIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function dueHold(t, i, 남은날수, dd) {
  return dueHoldIn(UP, t, i, 남은날수, dd);
}
/* 카드가 낸 보류를 목록 쪽이 그대로 본다 — 두 자리가 따로 세면 또 어긋난다 */
var DUE_HOLD_NOW = null;
/* ── 116차 · 예정 지출 ─────────────────────────────────────────────
   대표님이 앞으로 나갈 지출의 날짜와 금액을 고치시면, 이미 예상에 들어 있던
   같은 지출을 빼고 새 금액을 넣는다. 두 번 빠지지 않게 하려는 것이다.
   ★ 원본 거래·실제 월별 집계·계좌 순이익은 이것 때문에 안 바뀐다.
     바뀌는 것은 앞일을 내다보는 자리(카드·곡선·그래프) 하나뿐이다.
   ★ 누적해서 또 빼지 않는다. 늘 기본 예상과 지금 살아 있는 계획들로 다시 센다 */

function planLoad() {
  if (!UP) return planEmpty();
  /* ★ 예시 화면에서 만든 계획은 실제 매장 저장값에 섞지 않는다 */
  if (UP.demo) return UP.__planDemo || (UP.__planDemo = planEmpty());
  var raw = lsGet(planKey());
  if (!raw) return planEmpty();
  var o;
  try {
    o = JSON.parse(raw);
  } catch (e) {
    return planEmpty();
  }
  if (!o || !o.items || !o.items.length) return planEmpty();
  return { v: o.v || 1, items: o.items.slice() };
}
/* ★ 116차 통합. 들고 있는 계획이 어느 매장의 것인지 같이 적어 둔다.
   매장을 바꿔 불러도 UP.__plan 을 비우는 곳이 없어, 앞 매장의 계획이 뒤 매장 예상에
   그대로 적용될 수 있었다. 열쇠가 다르면 그 매장 것을 다시 읽는다 */
function planAt() {
  return UP && UP.demo ? '(예시)' : planKey();
}
function planBox() {
  if (!UP) return planEmpty();
  if (!UP.__plan || UP.__planAt !== planAt()) {
    UP.__plan = planLoad();
    UP.__planAt = planAt();
  }
  return UP.__plan;
}
/* 저장 실패 시 기존 저장본은 건드리지 않는다 — 실패를 돌려주고 화면이 알린다 */
function planSave(box) {
  UP.__plan = box;
  UP.__planAt = planAt();
  if (UP.demo) {
    UP.__planDemo = box;
    return true;
  }
  if (!box.items.length) {
    lsDel(planKey());
    return true;
  }
  return lsSet(planKey(), JSON.stringify(box));
}
function planNewId() {
  return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
}

/* 계산은 core/due.js 의 dueDailyUseCalcIn — 지금 매장(UP)과 캐시·저장소 창구(DUE_ENV)를 넘긴다 */
function dueDailyUseCalc(t, i) {
  return dueDailyUseCalcIn(UP, DUE_ENV, t, i);
}
/* 계산은 core/due.js 의 dueDailyUseIn — 지금 매장(UP)과 캐시·저장소 창구(DUE_ENV)를 넘긴다 */
function dueDailyUse(t, i) {
  return dueDailyUseIn(UP, DUE_ENV, t, i);
}
/* 계산은 core/due.js 의 dueInputSigIn — 지금 매장(UP)과 캐시·저장소 창구(DUE_ENV)를 넘긴다 */
function dueInputSig() {
  return dueInputSigIn(UP, DUE_ENV);
}
/* 결과를 그리기 전에 한 번 본다. 입력이 달라졌으면 표와 그 위의 캐시를 비운다 —
   예상 지출·미정 출금 보류·예정 지출 연결이 같이 새로 계산된다 */
function dueFresh() {
  if (!UP) return;
  var s = dueInputSig();
  if (UP.__dueIn !== s) {
    UP.__due = null;
    UP.__dueIn = s;
  }
}
/* 계산은 core/due.js 의 duePlanBaseIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function duePlanBase(t, i) {
  return duePlanBaseIn(UP, t, i);
}

/* 계산은 core/due.js 의 dueDayIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function dueDay() {
  return dueDayIn(UP);
}
/* ★ 60차 ①. 목표일을 건드리는 자리를 하나로 모은다.
   되살림 자리(startOnboard·importPicks)에서 UP.dueDay 만 넣고 캐시를 안 비우면,
   파일을 파싱하는 동안 담긴 옛 목표일짜리 결과가 그대로 남는다.
   화면은 「9월 10일 · 80%」인데 dueDay() 는 17을 돌려주는 어긋남이 된다.
 ★ .whybox · pLab · dayNum 은 이름이 부딪힌 것이었고 이건 값이 낡는 것이다.
   캐시를 두는 곳마다 「누가 비우는가」를 한 자리에 적어둔다 —
   UP.__due 를 비우는 곳은 여기와 savePicks · takeXfer · dropXfer 넷뿐이다 */
function setDueDay(n) {
  if (!UP) return;
  UP.dueDay = n;
  UP.__due = null;
}

/* 하루 단위 표를 한 번만 만든다 — 날짜 · 그날까지의 잔액 · 그날의 매출 · 그날의 사업 지출.
   ★ 58차 ⑦-6. 잔액은 통장에 찍힌 그대로다. 아무것도 빼지 않는다 —
     표의 「지금 계좌 잔액」과 카드의 것이 같은 수여야 한다 */
/* 날짜별 잔액 표 — 캐시(UP.__due)는 여기서만 다룬다. 표를 세우는 계산은 dueTableBuild.
   ★ 리팩토링 B-1f-2. 원래 한 함수였던 것을 캐시와 계산으로 나눴다 — 캐시가 비었을 때만 세우고,
     자료가 없으면 null 을 캐시에 적는 것까지 원래와 같다 */
function dueTable() {
  if (UP.__due) return UP.__due;
  return (UP.__due = dueTableBuild());
}
/* 계산 쪽이 부르는 캐시·저장소 창구 — core 의 예측 함수는 이것을 E 로 받아
   원래 dueTable() · planBox() · planAt() 을 부르던 바로 그 자리에서 부른다 (부르는 때와 순서가 같다) */
var DUE_ENV = {
  table: function () {
    return dueTable();
  },
  plan: function () {
    return planBox();
  },
  planAt: function () {
    return planAt();
  }
};
/* 계산은 core/due.js 의 dueTableBuildIn — 지금 매장(UP)을 넘긴다 */
function dueTableBuild() {
  return dueTableBuildIn(UP);
}
/* 계산은 core/due.js 의 dueInflowIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function dueInflow(t, i, 남은날수) {
  return dueInflowIn(UP, t, i, 남은날수);
}
/* 계산은 core/due.js 의 dueProjectIn — 지금 매장(UP)과 캐시·저장소 창구(DUE_ENV)를 넘긴다 */
function dueProject(t, i, day) {
  return dueProjectIn(UP, DUE_ENV, t, i, day);
}
/* 계산은 core/due.js 의 duePastIn — 지금 매장(UP)과 캐시·저장소 창구(DUE_ENV)를 넘긴다 */
function duePast(t, day, upto) {
  return duePastIn(UP, DUE_ENV, t, day, upto);
}
/* 계산은 core/due.js 의 commonAsOfIn — 지금 매장(UP)을 넘긴다 (리팩토링 B-1e) */
function commonAsOf(t) {
  return commonAsOfIn(UP, t);
}
/* 계산은 core/due.js 의 dueUnknownAccsIn — 지금 매장(UP)과 캐시·저장소 창구(DUE_ENV)를 넘긴다 */
function dueUnknownAccs() {
  return dueUnknownAccsIn(UP, DUE_ENV);
}
/* 계산은 core/due.js 의 dueCardIn — 지금 매장(UP)과 캐시·저장소 창구(DUE_ENV)를 넘긴다 */
function dueCard() {
  return dueCardIn(UP, DUE_ENV);
}
/* 계산은 core/due.js 의 dueCurveIn — 지금 매장(UP)과 캐시·저장소 창구(DUE_ENV)를 넘긴다 */
function dueCurve(months, c) {
  return dueCurveIn(UP, DUE_ENV, months, c);
}

/* 계산은 core/due.js 의 dueGraphPtsIn — 지금 매장(UP)과 캐시·저장소 창구(DUE_ENV)를 넘긴다 */
function dueGraphPts(c, cv) {
  return dueGraphPtsIn(UP, DUE_ENV, c, cv);
}
/* 계산은 core/due.js 의 dueNextMonthLowIn — 다음 달 1일 ~ 말일 가운데 가장 낮은 예상 잔액 */
function dueNextMonthLow(c, pts) {
  return dueNextMonthLowIn(c, pts);
}
/* ── NAM-9 · 예상 영역의 기간 이름 ────────────────────────────────
   「8월 22일 자료 기준 · 9월 말까지 예상 잔액」 — 보통 카드와 보류 카드가 같이 쓴다.
   ★ 실제 달을 적는다. 「다음 달」만 쓰지 않는다.
   ★ 자료가 올해 것이 아니면 해도 적는다 — 옛 자료로 낸 값을 지금 시점의 전망처럼 읽지 않게.
     오늘 날짜는 해를 적을지 말지에만 쓴다. 예상 기간은 자료 기준일로만 정한다.
   ★ 비교 자료가 모자라 계산이 앞당겨 끝났으면(c.잘림) 계산된 마지막 날을 적는다 */
function dueSpanText(c) {
  var 기준해 = c.오늘.slice(0, 4),
    끝해 = c.목표.slice(0, 4);
  /* ★ NAM-9 배포 전 보완. 예상 대상 기간을 실제 날짜로 적는다 (「9월 말」 → 「9월 30일」) */
  var 앞 = 날글(c.오늘, dueIsOld(c) || 기준해 !== String(new Date().getFullYear())) + ' 자료 기준';
  return 앞 + ' · ' + 날글(c.목표, 끝해 !== 기준해) + '까지 예상 잔액';
}
/* ── NAM-9 배포 전 보완 · 오래된 자료로 낸 예상 ─────────────────────────────
   ★ 계산 기간은 자료 기준일로 정한 그대로다. 오늘 날짜로 늘리거나 옮기지 않는다.
   ★ 오늘은 「예상 종료일이 이미 지났는가」를 가려 이름을 붙이는 데만 쓴다.
   ★ 실제 이후 거래와 견준 것이 아니므로 「백테스트」라 부르지 않는다 */
function dueToday() {
  var d = new Date();
  return (
    d.getFullYear() +
    '-' +
    ('0' + (d.getMonth() + 1)).slice(-2) +
    '-' +
    ('0' + d.getDate()).slice(-2)
  );
}
function dueIsOld(c) {
  return !!c && (c.잘림 || c.목표) < dueToday();
}
function dueOldNote(c, box) {
  if (!dueIsOld(c)) return;
  box.appendChild(
    el(
      'div',
      'duewhy dueas dueold',
      날글(c.오늘, true) +
        ' 자료를 기준으로 계산한 예상입니다.' +
        (UP && UP.demo ? '' : ' 현재 잔액을 보려면 최근 거래내역을 추가해 주세요.')
    )
  );
}
/* 모자람 문장 — 오래된 자료면 지금의 자금 부족 경고로 읽히지 않게 「계산됐습니다」로 적는다 */
function dueShortText(c, 날, 금액) {
  return dueIsOld(c)
    ? 날 + '에 ' + dueMan(금액) + '이 모자랄 수 있는 것으로 계산됐습니다'
    : 날 + '에 ' + dueMan(금액) + '이 모자랄 수 있습니다';
}
/* 계산은 core/due.js 의 dueCurveWhyIn — 그래프가 안 나오는 까닭 */
function dueCurveWhy(c) {
  return dueCurveWhyIn(UP, DUE_ENV, c);
}
/* ── NAM-9 후속 · 여러 계좌의 공통 기준일 안내 ─────────────────────────
   ★ 기준은 102차 그대로다 — 모든 계좌에 자료가 있는 마지막 날(commonAsOf).
     가장 늦은 계좌의 날짜로 다른 계좌까지 최신인 것처럼 늘리지 않는다.
   ★ 그 때문에 기간이 짧아졌다는 것을 한 문장으로 알린다 */
function dueCommonText(c) {
  return (
    '여러 계좌를 함께 계산할 수 있는 ' +
    날글(c.오늘) +
    '을 기준으로, ' +
    날글(c.목표) +
    '까지 예상했습니다. 계좌별 자료 기간을 확인해주세요.'
  );
}
/* ── 116차 앞 ④ · 보류 카드 ─────────────────────────────────────────
   ★ 예상 잔액 카드 자리에 안내를 한 번만 둔다.
   ★ 종료일 예상 잔액·최저 예상 잔액과 그 날짜·그래프와 진입 단추를 안 낸다.
   ★ 0원으로 적지 않는다. 이전에 계산한 숫자나 열려 있던 그림도 남기지 않는다.
   ★ NAM-9. 분석 종료일을 고르는 자리를 없앴다. 기간은 보통 카드와 같다 (다음 달 말일).
     접어서 감출 것이 없어져 여닫는 머리도 뺐다 — 안내와 단추가 늘 보인다.
   ★ 색과 세모 느낌표를 안 쓴다. 보여드릴 결과가 없는데 색이 붙으면 뜻이 생긴다 */
function drawDueHoldCard(host, c, months) {
  var box = el('div', 'duecard noicon');
  var top = el('div', 'duetop');
  var res = el('div', 'dueres');
  res.appendChild(el('div', 'duereslab', dueSpanText(c)));
  res.appendChild(el('div', 'dueholdlab', '예상 잔액을 아직 계산하지 않았습니다.'));
  top.appendChild(res);
  box.appendChild(top);
  /* ★ NAM-9 요한 승인 (2026-09-29). 보류될 때만 이유와 할 일을 적는다. 사유가 여럿이면 함께 적고,
     하나를 끝내면 반드시 열린다고 약속하지 않는다 */
  var 사유 = dueHoldReasons(c);
  if (사유.length > 1) {
    box.appendChild(el('div', 'duewhy dueas', '확인할 것이 ' + 사유.length + '가지 있습니다.'));
  }
  사유.forEach(function (x) {
    var row = el('div', 'duehold1');
    row.appendChild(el('div', 'dueholdtxt', x.글));
    if (x.단추) {
      var b = el('button', 'fcopen', x.단추);
      b.type = 'button';
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        x.할일(months);
      });
      row.appendChild(b);
    }
    box.appendChild(row);
  });
  /* ★ 116차 통합 ④. 보류 중에도 예정 지출은 미리 고치실 수 있게 둔다 (한 단계 낮은 단추).
     ★ 자료가 모자라 표본이 없으면 편집 화면도 뜻이 없어 안 둔다 */
  if (!c.자료보류) {
    var pgo = el('button', 'b dueholdsub', '예정 지출 확인·수정');
    pgo.type = 'button';
    pgo.addEventListener('click', function (e) {
      e.stopPropagation();
      openDuePlan(c, months);
    });
    box.appendChild(pgo);
  }
  /* 보류 카드에는 「계산한 예상입니다」 줄을 안 붙인다 — 계산하지 않았다. 과거 자료라는 사실은 머리가 말한다 */
  if (c.공통기준) box.appendChild(el('div', 'duewhy dueas', dueCommonText(c)));
  /* ★ 어디까지의 비교 날짜를 보고 판단했는지는 접든 펴든 같은 무게다 (105차 ③) */
  if (c.잘림) {
    box.appendChild(
      el(
        'div',
        'duewhy dueas',
        +c.목표.slice(5, 7) +
          '월 ' +
          +c.목표.slice(8, 10) +
          '일까지 계산했습니다. 이후 예상 지출을 계산할 비교 자료가 부족합니다.'
      )
    );
  }
  host.appendChild(box);
}
/* 보류 사유마다 한 줄과 할 일 — 순서: 자료 → 이체 → 입금 */
function dueHoldReasons(c) {
  var out = [];
  if (c.자료보류) {
    out.push({
      글: '예상 잔액을 보려면 3개월 이상의 거래내역을 추가해 주세요.',
      단추: UP && !UP.demo && UP.banks && UP.banks.length ? '거래내역 추가하기' : null,
      할일: function () {
        useScreen('보류 거래내역 추가');
        if (!openAddFiles()) return;
        var inp = /** @type {HTMLInputElement} */ (document.getElementById('upinput'));
        if (inp) {
          inp.value = '';
          inp.click();
        }
      }
    });
  }
  if (c.보류) {
    /* 건수 = 확인할 이체 후보 쌍의 수 (후보 하나에 출금 한 줄). 확인할 때마다 다시 센다 */
    out.push({
      글: '예상 잔액을 보려면 계좌끼리 옮긴 돈인지 ' + won(c.보류.건수) + '건을 확인해 주세요.',
      단추: '계좌끼리 옮긴 돈 확인하기',
      할일: function (months) {
        useScreen('보류 원인 이체 확인');
        UP.open = UP.open || {};
        UP.open.__xfer = true;
        drawResult(months);
        setTimeout(function () {
          var bx = document.querySelector('#up-result .xferbox');
          if (bx) bx.scrollIntoView({ block: 'start' });
        }, 0);
      }
    });
  }
  if (c.입금보류) {
    var g = c.입금보류;
    if (g.건수) {
      out.push({
        글:
          '아직 매출로 확인된 입금이 없습니다. 미분류 입금 ' +
          won(g.건수) +
          '건 중 매출이 있는지 확인해 주세요.',
        단추: '들어온 돈 확인하기',
        할일: function (months) {
          useScreen('보류 원인 입금 확인');
          if (!listAskStart(dueUnsetInNames(c), months)) moreFromResult();
        }
      });
    } else if (!g.입금건) {
      out.push({ 글: '직전 30일에 들어온 돈이 없어 예상 입금을 계산할 수 없습니다.' });
    } else {
      out.push({
        글: '직전 30일에 들어온 돈 가운데 매출로 분류한 거래가 없어 예상 입금을 계산할 수 없습니다.'
      });
    }
  }
  return out;
}
/* 직전 30일에 아직 분류하지 않은 입금이 있는 거래처 이름 — 확인 차례(listAskStart)에 넘긴다 */
function dueUnsetInNames(c) {
  var t0 = dayNum(c.오늘),
    본 = {},
    out = [];
  (UP.rows || []).forEach(function (r) {
    if (!(r.amount > 0) || xferOn(r)) return;
    var d = dayNum(r.at.slice(0, 10));
    if (d <= t0 - 30 || d > t0) return;
    if (catOf(r) !== UNSET) return;
    var k = keyOf(r);
    if (본[k]) return;
    본[k] = 1;
    out.push(k);
  });
  return out;
}
/* ── 116차 앞 ⑤ · 보류 원인 거래 목록 ───────────────────────────────
   ★ 전체 미정 목록만 열어 대표님이 원인을 다시 찾게 하지 않는다.
     보류를 만든 거래만 거래처별로 모아 날짜와 출금 금액을 적는다.
   ★ 이 거래는 지금 보고 계신 달 밖에 있을 수 있다 — 「아직 안 정한 돈」 상자는
     그 달만 보여주므로, 원인 목록은 달과 상관없이 따로 낸다.
   ★ 분류는 기존 거래처별 방식 그대로다 (drawChangeMenu).
     적용 범위를 몰래 넓히거나 좁히지 않는다 */
function drawHoldDetail(host, hold, months) {
  var 묶 = {},
    list = [];
  hold.목록.forEach(function (r) {
    var g = 묶[r.이름];
    if (!g) {
      g = 묶[r.이름] = { name: r.이름, sum: 0, 줄: [] };
      list.push(g);
    }
    g.sum += r.액;
    g.줄.push(r);
  });
  list.sort(function (a, b) {
    return b.sum - a.sum;
  });
  var box = el('div', 'dtl');
  list.forEach(function (e) {
    var g = UP.byName[e.name];
    var row = el('div', 'drow');
    var nm = el('div', 'dnm');
    nm.appendChild(el('span', 'mark mine', '?'));
    nm.appendChild(document.createTextNode(showName(e.name)));
    var 날적기 = e.줄
      .slice(0, 6)
      .map(function (r) {
        return 날글(r.at, r.at.slice(0, 4) !== hold.기준해) + ' ' + won(r.액) + '원';
      })
      .join(' · ');
    if (e.줄.length > 6) 날적기 += ' 외 ' + won(e.줄.length - 6) + '건';
    nm.appendChild(el('div', 'dspan', 날적기));
    row.appendChild(nm);
    row.appendChild(el('div', 'dv num', won(e.sum)));
    var ch = el('div', 'dch');
    var btn = el('button', 'chbtn', '정하기');
    btn.type = 'button';
    ch.appendChild(btn);
    row.appendChild(ch);
    box.appendChild(row);
    var menu = el('div', 'menu');
    menu.hidden = true;
    box.appendChild(menu);
    if (!g) {
      btn.disabled = true;
      return;
    }
    btn.addEventListener('click', function () {
      if (!menu.hidden) {
        menu.hidden = true;
        return;
      }
      /* 앱이 넘긴 것을 손으로 바꾸시면 다시 넘기지 않는다 (43차 4단계와 같다) */
      if (g.askSkip) unskipAsk(g);
      drawChangeMenu(menu, g, function () {
        drawResult(months);
      });
      menu.hidden = false;
    });
  });
  host.appendChild(box);
}
function 돈칸(값) {
  var e = document.createElement('input');
  e.type = 'text';
  e.inputMode = 'numeric';
  e.className = 'maninput planmoney';
  if (값 != null) e.value = won(값);
  moneyLive(e);
  return e;
}
function 날칸(값, lo, hi) {
  var e = document.createElement('input');
  e.type = 'date';
  e.className = 'maninput plandate';
  e.min = 날짜값(lo);
  e.max = 날짜값(hi);
  if (값 != null) e.value = 날짜값(값);
  return e;
}

function openDuePlan(c, months, 첫) {
  if (document.querySelector('.fcback')) return;
  var t = dueTable();
  if (!t || !t.n) return;
  var base; /* 아래 try · catch 가 둘 다 정한다 */
  try {
    base = duePlanBase(t, c.i);
  } catch (e) {
    base = null;
  }
  if (!base || !base.dd.한계) return;
  useScreen('예정 지출 확인·수정');
  var 뒤스크롤 = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  var back = el('div', 'fcback');
  var pane = el('div', 'fcpane');
  pane.setAttribute('role', 'dialog');
  pane.setAttribute('aria-modal', 'true');
  pane.setAttribute('aria-label', '예정 지출 확인·수정');

  var head = el('div', 'imgprevhead');
  var 제목 = el('div', 'imgprevtitle', '예정 지출 확인·수정');
  head.appendChild(제목);
  var acts = el('div', 'imgprevheadacts');
  var x = el('button', 'b', '닫기');
  x.type = 'button';
  acts.appendChild(x);
  head.appendChild(acts);
  pane.appendChild(head);

  var body = el('div', 'fcbody');
  pane.appendChild(body);
  var foot = el('div', 'imgprevfoot');
  var x2 = el('button', 'b on', '닫기');
  x2.type = 'button';
  foot.appendChild(x2);
  pane.appendChild(foot);
  back.appendChild(pane);
  document.body.appendChild(back);

  /* ★ B-4 (2026-09-27). 창이 열려 있는 동안 바뀌는 값 둘을 한 객체에 둔다 —
     안쪽 함수들이 이 변수에 새 값을 넣지 않고 속성만 바꾸게 해서, 파일 최상위로 꺼낼 수 있게 했다.
     닫힘은 원래 아래(첫 그리기 뒤)에서 false 로 정했는데, 쓰는 곳이 닫기(단추 · Esc)뿐이라 여기서 정해도 같다 */
  var 창 = { 화면: { 이름: 첫 || '목록' }, 닫힘: false };
  /* ★ 116차 통합. 미정 출금 보류 카드에서 열었는가. 계획을 고쳐도 이 값은 안 바뀐다 */
  var 보류중 = !!c.보류;

  /* ★ B-4 (2026-09-27). 화면 함수들이 쓰는 값을 창에 담는다 — 아래 값들은 여기 뒤로 바뀌지 않는다 (도구가 확인).
     부르지 않고 넘기는 함수(키 · 닫기 등)는 한 번만 묶는다 — removeEventListener 가 같은 함수를 봐야 한다 */
  창.c = c;
  창.months = months;
  창.t = t;
  창.base = base;
  창.뒤스크롤 = 뒤스크롤;
  창.back = back;
  창.제목 = 제목;
  창.body = body;
  창.보류중 = 보류중;
  창.닫기 = 예정닫기.bind(null, 창);
  창.키 = 예정키.bind(null, 창);
  예정그리기(창);

  document.addEventListener('keydown', 창.키);
  x.addEventListener('click', 창.닫기);
  x2.addEventListener('click', 창.닫기);
  back.addEventListener('click', function (e) {
    if (e.target === back) 예정닫기(창);
  });
}
function 예정가기(창, 이름, 옵션) {
  창.화면 = 옵션 || {};
  창.화면.이름 = 이름;
  예정그리기(창);
}

function 예정반영끝(창, ok) {
  /* 저장 실패 시 기존 저장본은 보존된다 (planSave 가 새로 쓰지 못한 것뿐이다).
       현재 화면에는 적용됐으므로 그 사실을 그대로 말한다 (⑪) */
  drawResult(창.months);
  예정가기(창, '목록', {
    알림: ok ? null : '변경 내용은 현재 화면에 반영됐지만 저장하지 못했습니다.'
  });
}

/* ── 첫 화면 ─────────────────────────────────────────────── */
function 예정목록화면(창) {
  창.제목.textContent = '예정 지출 확인·수정';
  머리줄(창.body, 창.c, 창.base);
  알림줄(창.화면, 창.body);
  /* ★ 116차 통합 ④. 미정 출금 보류 카드에서 여신 때만 한 번 적는다.
       이 화면은 지출 금액만 다루고 예상 잔액·최저점·그래프는 내지 않는다.
       저장해도 보류가 풀리지 않는다 (보류 판단은 계획을 넣기 전 기본 예측에서 한다) */
  if (창.보류중) {
    창.body.appendChild(
      el(
        'div',
        'planwarn',
        '예정 지출은 수정할 수 있습니다. 예상 잔액은 아직 안 정한 거래를 확인한 뒤 표시 여부를 다시 판단합니다.'
      )
    );
  }
  var box = planBox(),
    use = dueDailyUse(창.t, 창.c.i);
  if (use.적용보류) {
    var w = el(
      'div',
      'planwarn',
      '예정 지출 ' + won(use.적용보류) + '건의 반영이 보류되어 있습니다.'
    );
    var wb = el('button', 'b', '확인하기');
    wb.type = 'button';
    wb.addEventListener('click', function () {
      예정가기(창, '적용보류');
    });
    w.appendChild(wb);
    창.body.appendChild(w);
  }

  창.body.appendChild(el('div', 'planhead', '기존 예상 지출'));
  창.body.appendChild(
    el(
      'div',
      'fcnote',
      날짜글(창.base.시작) + ' ~ ' + 날짜글(창.base.끝) + ' 에 나갈 것으로 잡혀 있는 금액입니다.'
    )
  );
  if (!창.base.list.length) {
    창.body.appendChild(el('div', 'fcnote', '이 기간에 잡힌 예상 지출이 없습니다.'));
  }
  창.base.list.forEach(function (it) {
    var r = el('div', 'planrow');
    var L = el('div', 'planlab');
    L.appendChild(el('div', 'planname', it.거래처));
    L.appendChild(el('div', 'plansub', 날짜글(it.첫) + ' ~ ' + 날짜글(it.끝)));
    r.appendChild(L);
    r.appendChild(el('div', 'planamt', won(Math.round(it.총액)) + '원'));
    var a = el('div', 'planacts');
    var b1 = el('button', 'b', '수정');
    b1.type = 'button';
    b1.addEventListener('click', function () {
      예정가기(창, '수정', { p: it.거래처 });
    });
    var b2 = el('button', 'b', '반영된 내역 보기');
    b2.type = 'button';
    b2.addEventListener('click', function () {
      예정가기(창, '내역', { p: it.거래처, lo: 창.base.시작, hi: 창.base.끝 });
    });
    a.appendChild(b1);
    a.appendChild(b2);
    r.appendChild(a);
    창.body.appendChild(r);
  });

  창.body.appendChild(el('div', 'planhead', '등록한 예정 지출'));
  if (!box.items.length) {
    창.body.appendChild(el('div', 'fcnote', '아직 등록한 예정 지출이 없습니다.'));
  }
  box.items.forEach(function (pl) {
    var 적용보류 = use.적용보류목록.indexOf(pl) >= 0;
    var r = el('div', 'planrow');
    var L = el('div', 'planlab');
    L.appendChild(el('div', 'planname', pl.유형 === '대체' ? pl.거래처 : pl.이름 || '새 지출'));
    L.appendChild(
      el(
        'div',
        'plansub',
        pl.유형 === '대체'
          ? '기존 예상 대체 · ' + 날글(pl.시작) + ' ~ ' + 날글(pl.종료)
          : '별도 추가 · ' + (pl.지급 && pl.지급[0] ? 날글(pl.지급[0].날) : '')
      )
    );
    if (적용보류) L.appendChild(el('div', 'plansub warnsub', '반영 보류 중'));
    r.appendChild(L);
    r.appendChild(el('div', 'planamt', won(duePlanTotal(pl)) + '원'));
    var a = el('div', 'planacts');
    var b1 = el('button', 'b', '수정');
    b1.type = 'button';
    b1.addEventListener('click', function () {
      if (pl.유형 === '대체') 예정가기(창, '수정', { p: pl.거래처, id: pl.id });
      else 예정가기(창, '추가', { id: pl.id });
    });
    var b2 = el('button', 'b', pl.유형 === '대체' ? '변경 취소' : '삭제');
    b2.type = 'button';
    b2.addEventListener('click', function () {
      /* ★ ⑩ 대체 계획을 취소하면 기본 예상분이 그대로 살아난다 —
           수정 결과에서 또 빼는 것이 아니라 계획 하나를 목록에서 뺄 뿐이다 */
      var nb = {
        v: 1,
        items: box.items.filter(function (y) {
          return y.id !== pl.id;
        })
      };
      예정반영끝(창, planSave(nb));
    });
    a.appendChild(b1);
    a.appendChild(b2);
    r.appendChild(a);
    창.body.appendChild(r);
  });

  var add = el('button', 'fcopen', '새 지출 추가');
  add.type = 'button';
  add.addEventListener('click', function () {
    예정가기(창, '추가');
  });
  창.body.appendChild(add);
  /* ★ 116차 통합 ④. 보류 중에는 「예상 잔액과 그래프에 반영됩니다」가 사실과 다르다.
       그때는 위의 한 문장으로 대신하고 여기서 되풀이하지 않는다 */
  창.body.appendChild(
    el(
      'div',
      'fcnote',
      창.보류중
        ? '원본 거래내역과 월별 결과는 바뀌지 않습니다.'
        : '여기서 고치신 내용은 예상 잔액과 그래프에 함께 반영됩니다. ' +
            '원본 거래내역과 월별 결과는 바뀌지 않습니다.'
    )
  );
}

/* ── 반영된 내역 보기 ────────────────────────────────────── */
function 예정내역화면(창) {
  창.제목.textContent = '반영된 내역';
  var rows = duePlanRows(창.base.dd, 창.base.t0, 창.화면.p, 창.화면.lo, 창.화면.hi);
  창.body.appendChild(el('div', 'planhead', 창.화면.p));
  창.body.appendChild(
    el(
      'div',
      'fcnote',
      날짜글(창.화면.lo) +
        ' ~ ' +
        날짜글(창.화면.hi) +
        ' 의 예상 지출에 쓰인 과거 거래입니다. ' +
        '같은 거래가 여러 날짜에 쓰이면 각각 따로 적습니다.'
    )
  );
  var 합 = 0;
  rows.forEach(function (x) {
    합 += x.액;
  });
  창.body.appendChild(el('div', 'planmine', '합계 ' + won(Math.round(합)) + '원'));
  rows.forEach(function (x) {
    var r = el('div', 'planrow small');
    var L = el('div', 'planlab');
    L.appendChild(
      el('div', 'plansub', 날글(날짜값(x.과거), true) + ' 거래 → ' + 날짜글(x.미래) + ' 예상')
    );
    r.appendChild(L);
    r.appendChild(el('div', 'planamt', won(Math.round(x.액)) + '원'));
    창.body.appendChild(r);
  });
  if (!rows.length) 창.body.appendChild(el('div', 'fcnote', '해당 기간에 반영된 내역이 없습니다.'));
  예정뒤로단추(창);
}

function 예정뒤로단추(창, 텍스트) {
  var b = el('button', 'fcopen', 텍스트 || '목록으로');
  b.type = 'button';
  b.addEventListener('click', function () {
    예정가기(창, '목록');
  });
  창.body.appendChild(b);
}

/* ── 기존 예상 수정 ──────────────────────────────────────── */
function 예정수정화면(창) {
  창.제목.textContent = '기존 예상 수정';
  var box = planBox();
  var 기존 = null;
  if (창.화면.id)
    box.items.forEach(function (y) {
      if (y.id === 창.화면.id) 기존 = y;
    });
  var lo = 기존 ? dayNum(기존.시작) : 창.base.시작;
  var hi = 기존 ? dayNum(기존.종료) : 창.base.끝;

  창.body.appendChild(el('div', 'planhead', 창.화면.p));
  /* ★ ⑥ 한 번만 표시한다. 같은 말을 화면 두 자리에 두지 않는다 */
  창.body.appendChild(el('div', 'planwarn', '선택한 기간의 이 거래처 예상 지출 전체를 바꿉니다.'));

  var g1 = el('div', 'planfield');
  g1.appendChild(el('label', 'planlabel', '적용 시작일'));
  var d1 = 날칸(lo, 창.base.시작, 창.base.끝);
  g1.appendChild(d1);
  창.body.appendChild(g1);
  var g2 = el('div', 'planfield');
  g2.appendChild(el('label', 'planlabel', '적용 종료일'));
  var d2 = 날칸(hi, 창.base.시작, 창.base.끝);
  g2.appendChild(d2);
  창.body.appendChild(g2);

  var 현재줄 = el('div', 'planmine', '');
  창.body.appendChild(현재줄);

  var g3 = el('div', 'planfield');
  g3.appendChild(el('label', 'planlabel', '새 총액'));
  var amt = 돈칸(기존 ? duePlanTotal(기존) : null);
  var 금액칸 = el('div', 'fixgrp');
  금액칸.appendChild(amt);
  금액칸.appendChild(el('span', 'fixlab', '원'));
  g3.appendChild(금액칸);
  창.body.appendChild(g3);
  창.body.appendChild(
    el(
      'div',
      'fcnote',
      '0원을 적으시면 이 기간의 해당 예상 지출을 없앱니다. ' + '비워두면 반영하지 않습니다.'
    )
  );

  /* 지급 일정 */
  창.body.appendChild(el('div', 'planhead2', '지급 일정'));
  var 방식 = (기존 && 기존.일정) || '유지';
  var 줄들 =
    기존 && 기존.일정 === '지정' && 기존.지급 && 기존.지급.length
      ? 기존.지급.map(function (g) {
          return { 날: dayNum(g.날), 액: g.액 };
        })
      : [{ 날: null, 액: null }];
  var 방식칸 = el('div', 'planpick');
  var r1 = el('button', 'planopt', '기존 예상 일정 유지');
  r1.type = 'button';
  var r2 = el('button', 'planopt', '지급일 직접 지정');
  r2.type = 'button';
  방식칸.appendChild(r1);
  방식칸.appendChild(r2);
  창.body.appendChild(방식칸);
  var 방식말 = el('div', 'fcnote', '');
  창.body.appendChild(방식말);
  var 지정칸 = el('div', 'planrows');
  창.body.appendChild(지정칸);

  var msg = el('div', 'planwarn hide', '');
  var 뒤값 = el('div', 'planmine', '');

  function 기간읽기() {
    var a = d1.value ? dayNum(d1.value) : null;
    var b = d2.value ? dayNum(d2.value) : null;
    return { lo: a, hi: b };
  }
  function 현재액() {
    var k = 기간읽기();
    if (k.lo === null || k.hi === null || k.hi < k.lo) return null;
    return duePlanSpan(창.base, 창.화면.p, k.lo, k.hi);
  }
  function 지정그리기() {
    지정칸.innerHTML = '';
    if (방식 !== '지정') return;
    줄들.forEach(function (g, idx) {
      var r = el('div', 'planrow small');
      var dv = 날칸(g.날, 창.base.시작, 창.base.끝);
      dv.addEventListener('change', function () {
        g.날 = dv.value ? dayNum(dv.value) : null;
        새로고침();
      });
      var mv = 돈칸(g.액);
      mv.addEventListener('input', function () {
        g.액 = 돈읽기(mv.value);
        새로고침();
      });
      var 칸 = el('div', 'fixgrp');
      칸.appendChild(mv);
      칸.appendChild(el('span', 'fixlab', '원'));
      r.appendChild(dv);
      r.appendChild(칸);
      if (줄들.length > 1) {
        var dl = el('button', 'b', '지우기');
        dl.type = 'button';
        dl.addEventListener('click', function () {
          줄들.splice(idx, 1);
          지정그리기();
          새로고침();
        });
        r.appendChild(dl);
      }
      지정칸.appendChild(r);
    });
    var ad = el('button', 'b', '날짜 추가');
    ad.type = 'button';
    ad.addEventListener('click', function () {
      줄들.push({ 날: null, 액: null });
      지정그리기();
    });
    지정칸.appendChild(ad);
  }
  function 새로고침() {
    var sp = 현재액();
    현재줄.textContent = sp
      ? '현재 예상에 포함된 금액 ' + won(Math.round(sp.합)) + '원'
      : '적용 기간을 고르시면 현재 예상 금액을 보여드립니다.';
    r1.className = 'planopt' + (방식 === '유지' ? ' on' : '');
    r2.className = 'planopt' + (방식 === '지정' ? ' on' : '');
    방식말.textContent =
      방식 === '유지'
        ? '기존 예상 지출 비중에 따라 날짜별로 나눠 반영합니다.'
        : '한 날짜 또는 여러 날짜에 금액을 적으시면 됩니다. 날짜별 금액 합계가 새 총액과 같아야 반영합니다.';
    var v = 돈읽기(amt.value);
    뒤값.textContent = v === null ? '' : '변경 후 금액 ' + won(v) + '원';
    if (방식 === '유지' && sp && sp.합 <= 0) {
      msg.textContent =
        '이 기간에는 기존 예상 지출이 없어 기존 일정을 쓸 수 없습니다. 지급일을 직접 지정해주세요.';
      msg.className = 'planwarn';
    } else if (msg.className === 'planwarn' && msg.textContent.indexOf('기존 일정') >= 0) {
      msg.textContent = '';
      msg.className = 'planwarn hide';
    }
  }
  d1.addEventListener('change', 새로고침);
  d2.addEventListener('change', 새로고침);
  amt.addEventListener('input', 새로고침);
  r1.addEventListener('click', function () {
    방식 = '유지';
    지정그리기();
    새로고침();
  });
  r2.addEventListener('click', function () {
    방식 = '지정';
    지정그리기();
    새로고침();
  });

  창.body.appendChild(뒤값);
  창.body.appendChild(msg);

  var ok = el('button', 'fcopen', '변경 반영');
  ok.type = 'button';
  ok.addEventListener('click', function () {
    function 틀림(s) {
      msg.textContent = s;
      msg.className = 'planwarn';
    }
    var k = 기간읽기();
    if (k.lo === null || k.hi === null) return 틀림('적용 시작일과 종료일을 골라주세요.');
    if (k.hi < k.lo) return 틀림('적용 종료일이 시작일보다 앞섭니다.');
    if (k.lo < 창.base.시작 || k.hi > 창.base.끝) {
      return 틀림(
        '적용 기간은 ' +
          날짜글(창.base.시작) +
          ' ~ ' +
          날짜글(창.base.끝) +
          ' 안에서 골라주세요. 그 밖은 아직 계산할 수 없습니다.'
      );
    }
    var v = 돈읽기(amt.value);
    if (v === null) return 틀림('새 총액을 적어주세요. 0원도 적으실 수 있습니다.');
    var 부딪 = duePlanClash(box, 창.화면.p, k.lo, k.hi, 창.화면.id);
    if (부딪) {
      return 틀림(
        '이 거래처의 ' +
          날글(부딪.시작) +
          ' ~ ' +
          날글(부딪.종료) +
          ' 계획과 기간이 겹칩니다. 그 계획을 수정해주세요.'
      );
    }
    var sp = duePlanSpan(창.base, 창.화면.p, k.lo, k.hi);
    var 지급 = [];
    if (방식 === '유지') {
      if (sp.합 <= 0) return 틀림('이 기간에는 기존 예상 지출이 없어 기존 일정을 쓸 수 없습니다.');
      var 나눔 = 몫나누기(v, sp.값);
      if (!나눔) return 틀림('기존 예상 비중을 구할 수 없습니다. 지급일을 직접 지정해주세요.');
      for (var q = 0; q < 나눔.length; q++) {
        if (나눔[q] > 0) 지급.push({ 날: 날짜값(sp.날[q]), 액: 나눔[q] });
      }
    } else {
      var 합 = 0,
        빈 = false;
      줄들.forEach(function (g) {
        if (g.날 === null || g.액 === null) {
          빈 = true;
          return;
        }
        합 += g.액;
      });
      if (v > 0 && 빈)
        return 틀림('지급일과 금액을 모두 적어주세요. 빈 칸은 0원으로 치지 않습니다.');
      if (v > 0) {
        for (var w = 0; w < 줄들.length; w++) {
          var 날 = 줄들[w].날;
          if (날 < 창.base.시작 || 날 > 창.base.끝) {
            return 틀림(
              '지급일은 ' +
                날짜글(창.base.시작) +
                ' ~ ' +
                날짜글(창.base.끝) +
                ' 안에서 골라주세요. 그 밖은 아직 계산할 수 없습니다.'
            );
          }
        }
        if (합 !== v) {
          return 틀림(
            '날짜별 금액 합계(' + won(합) + '원)가 새 총액(' + won(v) + '원)과 다릅니다.'
          );
        }
        줄들.forEach(function (g) {
          if (g.액 > 0) 지급.push({ 날: 날짜값(g.날), 액: g.액 });
        });
      }
    }
    var pl = {
      id: 창.화면.id || planNewId(),
      유형: '대체',
      거래처: 창.화면.p,
      시작: 날짜값(k.lo),
      종료: 날짜값(k.hi),
      총액: v,
      일정: 방식,
      지급: 지급,
      확인: true,
      자료: 창.base.지문,
      모델: DUE_MODEL
    };
    /* ★ ⑩ 같은 계획을 다시 수정하면 기존 계획을 교체한다 — 쌓지 않는다 */
    var items = box.items.filter(function (y) {
      return y.id !== pl.id;
    });
    items.push(pl);
    예정반영끝(창, planSave({ v: 1, items: items }));
  });
  창.body.appendChild(ok);
  var view = el('button', 'fcopen', '반영된 내역 보기');
  view.type = 'button';
  view.addEventListener('click', function () {
    var k = 기간읽기();
    예정가기(창, '내역', {
      p: 창.화면.p,
      lo: k.lo === null ? 창.base.시작 : k.lo,
      hi: k.hi === null ? 창.base.끝 : k.hi
    });
  });
  창.body.appendChild(view);
  창.body.appendChild(
    el(
      'div',
      'fcnote',
      '이 기간 밖의 같은 거래처 예상 지출은 그대로 둡니다. ' +
        '일부 지급만 고르는 상세 수정은 아직 없습니다.'
    )
  );
  예정뒤로단추(창);
  지정그리기();
  새로고침();
}

/* ── 새 지출 추가 ────────────────────────────────────────── */
function 예정추가화면(창) {
  창.제목.textContent = '새 지출 추가';
  var box = planBox();
  var 기존 = null;
  if (창.화면.id)
    box.items.forEach(function (y) {
      if (y.id === 창.화면.id) 기존 = y;
    });

  var g1 = el('div', 'planfield');
  g1.appendChild(el('label', 'planlabel', '이름'));
  var nm = document.createElement('input');
  nm.type = 'text';
  nm.className = 'maninput planname-in';
  nm.placeholder = '지출 이름';
  if (기존) nm.value = 기존.이름 || '';
  g1.appendChild(nm);
  창.body.appendChild(g1);

  var g2 = el('div', 'planfield');
  g2.appendChild(el('label', 'planlabel', '지급일'));
  var dv = 날칸(
    기존 && 기존.지급 && 기존.지급[0] ? dayNum(기존.지급[0].날) : null,
    창.base.시작,
    창.base.끝
  );
  g2.appendChild(dv);
  창.body.appendChild(g2);

  var g3 = el('div', 'planfield');
  g3.appendChild(el('label', 'planlabel', '금액'));
  var amt = 돈칸(기존 ? duePlanTotal(기존) : null);
  var 금액칸 = el('div', 'fixgrp');
  금액칸.appendChild(amt);
  금액칸.appendChild(el('span', 'fixlab', '원'));
  g3.appendChild(금액칸);
  창.body.appendChild(g3);

  var 안내 = el('div', 'planfound');
  창.body.appendChild(안내);
  var msg = el('div', 'planwarn hide', '');
  창.body.appendChild(msg);

  function 살피기() {
    안내.innerHTML = '';
    var 닮 = 닮은거래처(창.base, nm.value);
    if (닮.length) {
      안내.appendChild(el('div', 'planwarn2', '이 거래처의 지출이 예상에 포함되어 있습니다.'));
      닮.forEach(function (it) {
        var r = el('div', 'planrow small');
        var L = el('div', 'planlab');
        L.appendChild(el('div', 'planname', it.거래처));
        L.appendChild(el('div', 'plansub', 날짜글(it.첫) + ' ~ ' + 날짜글(it.끝)));
        r.appendChild(L);
        r.appendChild(el('div', 'planamt', won(Math.round(it.총액)) + '원'));
        var b = el('button', 'b', '기존 예상 수정');
        b.type = 'button';
        b.addEventListener('click', function () {
          예정가기(창, '수정', { p: it.거래처 });
        });
        r.appendChild(b);
        안내.appendChild(r);
      });
      안내.appendChild(
        el('div', 'fcnote', '같은 곳이 아니라면 아래에서 별도 지출로 추가하시면 됩니다.')
      );
    } else if (String(nm.value).trim()) {
      안내.appendChild(el('div', 'planwarn2', '기존 예상에서 연결할 지출을 찾지 못했습니다.'));
      /* ★ ⑨ 「기존 예상에 없는 지출」이라고 단정하지 않는다 */
      안내.appendChild(
        el(
          'div',
          'fcnote',
          '기존 예상에 없는 지출인지는 확인하지 못했습니다. ' + '별도 추가가 맞는지 확인해주세요.'
        )
      );
    }
  }
  nm.addEventListener('input', 살피기);
  살피기();

  var ok = el('button', 'fcopen', 기존 ? '변경 반영' : '별도 지출로 추가');
  ok.type = 'button';
  ok.addEventListener('click', function () {
    function 틀림(s) {
      msg.textContent = s;
      msg.className = 'planwarn';
    }
    var 이름 = String(nm.value).trim();
    if (!이름) return 틀림('지출 이름을 적어주세요.');
    if (!dv.value) return 틀림('지급일을 골라주세요.');
    var 날 = dayNum(dv.value);
    if (날 < 창.base.시작 || 날 > 창.base.끝) {
      return 틀림(
        '지급일은 ' +
          날짜글(창.base.시작) +
          ' ~ ' +
          날짜글(창.base.끝) +
          ' 안에서 골라주세요. 그 밖은 아직 계산할 수 없습니다.'
      );
    }
    var v = 돈읽기(amt.value);
    if (v === null) return 틀림('금액을 적어주세요.');
    var pl = {
      id: 창.화면.id || planNewId(),
      유형: '추가',
      이름: 이름,
      총액: v,
      일정: '지정',
      지급: v > 0 ? [{ 날: 날짜값(날), 액: v }] : [],
      확인: true,
      자료: 창.base.지문,
      모델: DUE_MODEL
    };
    var items = box.items.filter(function (y) {
      return y.id !== pl.id;
    });
    items.push(pl);
    예정반영끝(창, planSave({ v: 1, items: items }));
  });
  창.body.appendChild(ok);
  창.body.appendChild(el('div', 'fcnote', '새 지출은 기존 예상에 연결하지 않고 한 번 더합니다.'));
  예정뒤로단추(창);
}

/* ── 보류 확인 (⑫) ──────────────────────────────────────── */
function 예정적용보류화면(창) {
  창.제목.textContent = '예정 지출 확인';
  var use = dueDailyUse(창.t, 창.c.i),
    box = planBox();
  /* ★ 118차 ③. 보류 까닭이 둘이다 — 예측 모델이 바뀐 것과 자료가 바뀐 것.
       실제로 해당하는 까닭만 적는다 */
  var 옛모델 = use.적용보류목록.filter(function (pl) {
    return (pl.모델 || 1) !== DUE_MODEL;
  });
  var 까닭 = [];
  if (옛모델.length) 까닭.push('예상 지출에 사업 외 출금도 들어가도록 계산 범위가 바뀌었습니다.');
  if (옛모델.length < use.적용보류목록.length) {
    /* ★ 116차 통합 ⑥. 재업로드만이 아니라 분류를 바꿔도 여기로 온다. 까닭을 하나로 단정하지 않는다 */
    까닭.push('거래내역이나 분류가 바뀌어 예측에 쓰는 자료가 달라졌습니다.');
  }
  창.body.appendChild(
    el(
      'div',
      'fcnote',
      까닭.join(' ') +
        (까닭.length ? ' ' : '') +
        '이전 차감액을 그대로 쓰지 않고 보류했습니다. 확인 후 다시 반영하실 수 있습니다.'
    )
  );
  if (!use.적용보류목록.length) {
    창.body.appendChild(el('div', 'fcnote', '보류된 예정 지출이 없습니다.'));
    예정뒤로단추(창);
    return;
  }
  use.적용보류목록.forEach(function (pl) {
    var wrap = el('div', 'plancheck');
    wrap.appendChild(el('div', 'planname', pl.유형 === '대체' ? pl.거래처 : pl.이름 || '새 지출'));
    wrap.appendChild(el('div', 'plansub', '저장된 총액 ' + won(duePlanTotal(pl)) + '원'));
    if (pl.유형 === '대체') {
      var sp = duePlanSpan(창.base, pl.거래처, dayNum(pl.시작), dayNum(pl.종료));
      wrap.appendChild(
        el(
          'div',
          'plansub',
          '새 기본 예상분 ' +
            won(Math.round(sp.합)) +
            '원 (' +
            날글(pl.시작) +
            ' ~ ' +
            날글(pl.종료) +
            ')'
        )
      );
    }
    /* ★ 118차 ③. 예전 모델에서 「추가」로 넣은 계획은 새 기본 예상과 겹칠 수 있다.
         이름이 비슷한 기존 예상을 보여드리고 고르시게 한다. 같은 지출이라고 단정하지 않는다 */
    if (pl.유형 !== '대체' && (pl.모델 || 1) !== DUE_MODEL) {
      var 닮 = 닮은거래처(창.base, pl.이름);
      if (닮.length) {
        wrap.appendChild(
          el(
            'div',
            'planwarn2',
            '기본 예상에 이름이 비슷한 지출이 있습니다. 같은 지출이면 다시 반영하지 마시고 계획을 취소하거나 기존 예상을 수정해주세요.'
          )
        );
        닮.forEach(function (it) {
          var r = el('div', 'planrow small');
          var L = el('div', 'planlab');
          L.appendChild(el('div', 'planname', it.거래처));
          L.appendChild(el('div', 'plansub', 날짜글(it.첫) + ' ~ ' + 날짜글(it.끝)));
          r.appendChild(L);
          r.appendChild(el('div', 'planamt', won(Math.round(it.총액)) + '원'));
          var eb = el('button', 'b', '기존 예상 수정');
          eb.type = 'button';
          eb.addEventListener('click', function () {
            예정가기(창, '수정', { p: it.거래처 });
          });
          r.appendChild(eb);
          wrap.appendChild(r);
        });
      } else {
        wrap.appendChild(
          el(
            'div',
            'plansub',
            '기본 예상에서 이름이 비슷한 지출을 찾지 못했습니다. 같은 지출이 없는지는 확인하지 못했습니다.'
          )
        );
      }
    }
    /* 지난 지급분과 남은 지급분을 가른다. 지난 것을 지급 완료로 단정하지 않는다 */
    var 지난 = [],
      남은 = [],
      새날 = {};
    (pl.지급 || []).forEach(function (g, idx) {
      if (dayNum(g.날) <= 창.base.t0) 지난.push({ i: idx, g: g });
      else 남은.push({ i: idx, g: g });
    });
    if (지난.length) {
      wrap.appendChild(
        el(
          'div',
          'planwarn2',
          '지급일이 새 자료 기준일보다 앞섭니다. 지급 완료 여부는 확인하지 않았습니다.'
        )
      );
      지난.forEach(function (o) {
        var r = el('div', 'planrow small');
        var L = el('div', 'planlab');
        L.appendChild(el('div', 'plansub', 날글(o.g.날) + ' · ' + won(o.g.액) + '원'));
        r.appendChild(L);
        var nd = 날칸(null, 창.base.시작, 창.base.끝);
        nd.addEventListener('change', function () {
          새날[o.i] = nd.value ? dayNum(nd.value) : null;
        });
        r.appendChild(nd);
        wrap.appendChild(r);
      });
      wrap.appendChild(
        el(
          'div',
          'fcnote',
          '아직 나가지 않았다면 새 지급일을 정해주세요. ' +
            '정하지 않은 지난 지급분은 반영하지 않습니다. 남은 기간에 자동으로 다시 넣지 않습니다.'
        )
      );
    }
    if (남은.length) {
      wrap.appendChild(
        el(
          'div',
          'plansub',
          '남은 지급분 ' +
            남은
              .map(function (o) {
                return 날글(o.g.날) + ' ' + won(o.g.액) + '원';
              })
              .join(' · ')
        )
      );
    }
    var 말 = el('div', 'planwarn hide', '');
    wrap.appendChild(말);
    var acts = el('div', 'planacts');
    var a1 = el('button', 'b on', '다시 반영');
    a1.type = 'button';
    a1.addEventListener('click', function () {
      var 지급 = [];
      남은.forEach(function (o) {
        지급.push({ 날: o.g.날, 액: o.g.액 });
      });
      var 막힘 = null;
      지난.forEach(function (o) {
        var d = 새날[o.i];
        if (d == null) return; /* 안 정하신 것은 반영하지 않는다 */
        if (d < 창.base.시작 || d > 창.base.끝) {
          막힘 =
            '새 지급일은 ' +
            날짜글(창.base.시작) +
            ' ~ ' +
            날짜글(창.base.끝) +
            ' 안에서 골라주세요.';
          return;
        }
        지급.push({ 날: 날짜값(d), 액: o.g.액 });
      });
      if (막힘) {
        말.textContent = 막힘;
        말.className = 'planwarn';
        return;
      }
      지급.sort(function (a, b) {
        return a.날 < b.날 ? -1 : a.날 > b.날 ? 1 : 0;
      });
      var neo = {
        id: pl.id,
        유형: pl.유형,
        거래처: pl.거래처,
        이름: pl.이름,
        시작: pl.시작,
        종료: pl.종료,
        총액: 지급.reduce(function (s, g) {
          return s + g.액;
        }, 0),
        일정: pl.일정,
        지급: 지급,
        확인: true,
        자료: 창.base.지문,
        모델: DUE_MODEL
      };
      var items = box.items.map(function (y) {
        return y.id === pl.id ? neo : y;
      });
      예정반영끝(창, planSave({ v: 1, items: items }));
    });
    var a2 = el('button', 'b', '계획 취소');
    a2.type = 'button';
    a2.addEventListener('click', function () {
      var items = box.items.filter(function (y) {
        return y.id !== pl.id;
      });
      예정반영끝(창, planSave({ v: 1, items: items }));
    });
    acts.appendChild(a1);
    acts.appendChild(a2);
    wrap.appendChild(acts);
    창.body.appendChild(wrap);
  });
  예정뒤로단추(창);
}

function 예정그리기(창) {
  창.body.innerHTML = '';
  창.body.scrollTop = 0;
  if (창.화면.이름 === '내역') 예정내역화면(창);
  else if (창.화면.이름 === '수정') 예정수정화면(창);
  else if (창.화면.이름 === '추가') 예정추가화면(창);
  else if (창.화면.이름 === '적용보류') 예정적용보류화면(창);
  else 예정목록화면(창);
}

function 예정닫기(창) {
  if (창.닫힘) return;
  창.닫힘 = true;
  if (창.back.parentNode) 창.back.parentNode.removeChild(창.back);
  document.body.style.overflow = 창.뒤스크롤;
  document.removeEventListener('keydown', 창.키);
}

function 예정키(창, e) {
  if (e.key === 'Escape') 예정닫기(창);
}

function 알림줄(화면, body) {
  if (화면.알림) body.appendChild(el('div', 'planwarn', 화면.알림));
}

function 머리줄(body, c, base) {
  body.appendChild(
    el(
      'div',
      'duewhy',
      '자료 기준일 ' + 날글(c.오늘) + ' · 계산 가능한 마지막 날 ' + 날짜글(base.끝)
    )
  );
}

/* ── 114차 · 예상 잔액 그래프 ─────────────────────────────────────
   ★ NAM-9 (2026-09-29 요한). 따로 여는 창(openDueGraph)을 없애고 예상 카드 안에 바로 그린다.
     그리는 셈은 114차 그대로다 — 점(dueGraphPts)·선·날 고르기가 한 줄도 안 바뀐다 */
var FC_GH = 250; /* 그래프 높이 (날짜 줄 포함) */
/* 점과 점을 곧은 선으로 잇는다. 부드러운 곡선 보간을 안 쓴다 —
   계산에 없는 고점·저점이 생긴다 (요청서 ④) */
function drawDueGraph(host, c, cv, pts) {
  host.innerHTML = '';
  /* ★ 지나온 쪽을 앞날과 비슷한 길이로 자른다. 30일로 고정했더니
     19일짜리 앞날이 오른쪽 3분의 1에 눌려 톱니가 뭉개졌다 (실측).
     지나온 쪽은 「어디서 오던 길인가」를 보이는 것이 일이라 길 필요가 없다 */
  var 지난 = dueGraphPast(c, Math.max(10, Math.min(21, pts.끝 - pts.시작)));
  var 앞 = pts.점;
  /* 세로 범위 — 지난 것과 앞날을 다 담는다. 0원은 늘 넣는다 (마이너스가 보이게) */
  var lo = 0,
    hi = 0;
  지난.forEach(function (p) {
    if (p.값 === null) return;
    if (p.값 < lo) lo = p.값;
    if (p.값 > hi) hi = p.값;
  });
  앞.forEach(function (p) {
    if (p.값 < lo) lo = p.값;
    if (p.값 > hi) hi = p.값;
  });
  var rg = axisRange(lo, hi);
  var ticks = axisTicks(rg.lo, rg.hi, rg.step);
  /* ★ 111·112차 규칙. 눈금은 단위를 밝혀 축약하고, 상세 금액은 원 단위다.
     단위는 이 그림 하나의 것이다 — 다른 그림과 변수를 나눠 쓰지 않는다 (112차 ①) */
  var U = axisUnit(Math.max(Math.abs(rg.lo), Math.abs(rg.hi)));
  host.appendChild(
    chHead(
      '예상 잔액 (' + U.name + ')',
      [
        ['know', '— 지나온 잔액'],
        ['kprof', '— 예상 · 0원 미만은 빨강']
      ],
      null
    )
  );

  var 첫날 = 지난.length ? Math.min(지난[0].날, pts.시작) : pts.시작;
  var 끝날 = pts.끝;
  var box = el('div', 'dchart');
  host.appendChild(box);
  drawDueGraphChart(host, c, cv, pts, 지난, 앞, rg, ticks, U, 첫날, 끝날, box);
  /* ★ NAM-9. 그림 아래에 따로 적던 「종료일 예상 잔액 · 기간 중 최저」 줄을 뺐다.
     그래프가 카드 안으로 들어와, 같은 카드의 머리와 다음 달 최저 줄이 그 값을 이미 말한다.
     특히 「기간 중 최저」는 이번 달을 포함한 최저라 다음 달 최저와 섞여 읽힌다 */

  /* ── 114차 보정 ④ · 고른 날의 상세 ────────────────────────────────
     같은 날의 두 시점을 각각 적는다. 잔액이 같아 마커가 하나로 보여도
     여기서는 둘이 따로 선다 — 겹쳐 보이는 것과 자료가 하나인 것은 다르다 */
  var 고른날 = host.__고른날;
  var det = el('div', 'fcdet');
  drawDueGraphDetail(host, c, cv, pts, 지난, 고른날, det);
  host.appendChild(det);
}
/* drawDueGraph 에서 뺀 부분 (B-4) */
function drawDueGraphChart(host, c, cv, pts, 지난, 앞, rg, ticks, U, 첫날, 끝날, box) {
  fitChart(box, FC_GH, function (svg, W) {
    /* ★ B-4 (2026-09-28). i 는 아래 두 반복에서만 쓴다 — 바깥 함수에서 옮겨 왔다 (바깥은 읽지 않는다) */
    var i;
    var LEFT = axisLeft(ticks),
      RIGHT = 12,
      PAD = 16,
      BOT = 18;
    var PH = FC_GH - BOT;
    var 폭 = Math.max(1, 끝날 - 첫날);
    function X(d) {
      return LEFT + ((d - 첫날) / 폭) * (W - LEFT - RIGHT);
    }
    function Y(v) {
      if (rg.hi === rg.lo) return PAD;
      return PAD + ((rg.hi - v) / (rg.hi - rg.lo)) * (PH - PAD * 2);
    }
    /* 눈금 */
    ticks.forEach(function (tv) {
      svg.appendChild(
        svgEl('line', {
          x1: LEFT - 4,
          y1: Y(tv),
          x2: W - RIGHT,
          y2: Y(tv),
          stroke: 'var(--line)',
          'stroke-width': tv === 0 ? 1.2 : 0.6,
          opacity: tv === 0 ? '0.95' : '0.55'
        })
      );
      var tx = svgEl('text', {
        x: LEFT - 8,
        y: Y(tv) + 3.5,
        'text-anchor': 'end',
        'font-size': '11',
        fill: 'var(--gray)'
      });
      tx.textContent = axisTxt(tv, U);
      svg.appendChild(tx);
    });
    /* ── 114차 보정 둘 ① · 예상 구간에 옅은 회색을 깐다 ──────────────
       ★ 그래프 위아래 전체에 깔리는 영역 표시다. 선 아래를 채우지 않는다 —
         채우면 예상 오차 범위처럼 보인다.
       ★ 계산이 중단되면 실제 계산된 마지막 날까지만 깐다 (완료 기준 8).
         마지막 점의 날짜를 쓴다 — 고른 종료일이 아니다.
       ★ 노란색은 안 쓴다.
       ★ 0원 밑에서는 빨강이 이긴다. 두 색을 겹쳐 제3의 색을 만들지 않으므로
         회색은 0원 선에서 멈춘다 (완료 기준 4) */
    var 계산끝 = 앞.length ? 앞[앞.length - 1].날 : pts.시작;
    var 회색밑 = rg.lo < 0 ? Y(0) : PH;
    if (계산끝 > pts.시작 && 회색밑 > 0) {
      svg.appendChild(
        svgEl('rect', {
          x: X(pts.시작),
          y: 0,
          width: Math.max(0, X(계산끝) - X(pts.시작)),
          height: 회색밑,
          fill: '#000000',
          opacity: '0.04'
        })
      );
    }
    /* ★ 요청서 ③-3. 0원 밑을 빨강으로 가른다. 「예상이라서」 빨강을 쓰지 않는다.
       0원 위로는 빨간 선이 한 줄도 안 나온다.
       ★ 회색보다 뒤에 그린다 — 0원 밑에서는 이쪽이 이겨야 한다 */
    if (rg.lo < 0) {
      svg.appendChild(
        svgEl('rect', {
          x: LEFT,
          y: Y(0),
          width: Math.max(0, W - LEFT - RIGHT),
          height: Math.max(0, Y(rg.lo) - Y(0)),
          fill: 'var(--warn)',
          opacity: '0.07'
        })
      );
    }
    /* 지나온 잔액 — 자료에 적힌 값. 없는 날에서 선을 끊는다 (완료 기준 11) */
    var seg = [];
    function 잇기(list, 색, 점선) {
      if (list.length < 2) return;
      var a = {
        d:
          'M ' +
          list
            .map(function (p) {
              return X(p.날) + ' ' + Y(p.값);
            })
            .join(' L '),
        fill: 'none',
        stroke: 색,
        'stroke-width': 2,
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round'
      };
      if (점선) a['stroke-dasharray'] = '5 4';
      svg.appendChild(svgEl('path', a));
    }
    /* ── 119차 · 예상 선을 0원 경계에서 색으로 가른다 ──────────────────
       0원 이상은 초록(--brand), 0원 미만은 빨강(--warn). 정확히 0원은 초록이다.
       ★ 선이 0원을 가로지르면 그 자리(Y(0))에서 잘라 양수 쪽까지 빨갛게 칠하지 않는다.
         같은 날의 입금 전·당일 반영 후 두 점 사이도 같은 규칙이다 (세로 선이 0원에서 갈린다).
       ★ 자르는 자리는 그림에만 있다. pts.점(계산 자료)에는 점을 하나도 안 넣는다.
       ★ 점선 무늬가 조각마다 새로 시작하지 않게 앞 조각까지의 길이만큼 무늬를 민다 */
    function 잇기0(list) {
      if (list.length < 2) return;
      var 조각 = [],
        지금 = null,
        길이 = 0;
      function 색(v) {
        return v < 0 ? 'var(--warn)' : 'var(--brand)';
      }
      function 끊기() {
        if (지금 && 지금.xy.length >= 2) 조각.push(지금);
      }
      var x0 = X(list[0].날),
        y0 = Y(list[0].값);
      지금 = { 색: 색(list[0].값), xy: [[x0, y0]], 시작: 0 };
      for (var k = 1; k < list.length; k++) {
        var a = list[k - 1],
          b = list[k];
        var ax = X(a.날),
          ay = Y(a.값),
          bx = X(b.날),
          by = Y(b.값);
        if (색(a.값) !== 색(b.값)) {
          /* 두 점 사이에서 0원이 되는 자리 */
          var t = (0 - a.값) / (b.값 - a.값);
          var cx = ax + (bx - ax) * t,
            cy = Y(0);
          지금.xy.push([cx, cy]);
          길이 += Math.sqrt((cx - ax) * (cx - ax) + (cy - ay) * (cy - ay));
          끊기();
          지금 = { 색: 색(b.값), xy: [[cx, cy]], 시작: 길이 };
          길이 += Math.sqrt((bx - cx) * (bx - cx) + (by - cy) * (by - cy));
        } else {
          길이 += Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
        }
        지금.xy.push([bx, by]);
      }
      끊기();
      조각.forEach(function (g) {
        svg.appendChild(
          svgEl('path', {
            d:
              'M ' +
              g.xy
                .map(function (q) {
                  return q[0] + ' ' + q[1];
                })
                .join(' L '),
            fill: 'none',
            stroke: g.색,
            'stroke-width': 2,
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round',
            'stroke-dasharray': '5 4',
            'stroke-dashoffset': String(-g.시작)
          })
        );
      });
    }
    지난.forEach(function (p) {
      if (p.값 === null) {
        잇기(seg, 'var(--now)');
        seg = [];
        return;
      }
      seg.push(p);
    });
    잇기(seg, 'var(--now)');
    /* 앞날 — 예상. 점과 점을 곧은 선으로 잇는다.
       ★ 114차 보정 둘 ①. 선 자체를 점선으로 둔다. 색만 다르면 「예상」이 안 읽힌다 —
         세로 경계선만 점선으로 두는 것으로는 모자란다 */
    잇기0(앞);
    /* ★ 요청서 ③-2. 예상이 시작되는 자리를 점선으로 가르고 이름을 적는다 */
    svg.appendChild(
      svgEl('line', {
        x1: X(pts.시작),
        y1: PAD - 8,
        x2: X(pts.시작),
        y2: PH,
        stroke: 'var(--gray)',
        'stroke-width': 1.2,
        'stroke-dasharray': '4 4',
        opacity: '0.85'
      })
    );
    var lab = svgEl('text', {
      x: X(pts.시작) + 5,
      y: PAD - 1,
      'text-anchor': 'start',
      'font-size': '11',
      'font-weight': '700',
      fill: 'var(--gray)'
    });
    lab.textContent = '예상';
    svg.appendChild(lab);
    /* ★ 요청서 ③-4. 종료일 예상 잔액과 기간 중 최저 예상 잔액을 표시한다.
       ★ 값은 카드가 말하는 그 값이다 — 다시 계산하지 않는다 */
    /* ★ 알약이 서로 겹치지 않게 놓는다. 최저와 끝값이 같은 날에 서면
       둘이 포개져 아무것도 안 읽힌다 (실측 — 9월 10일에 둘 다 섰다).
       놓은 자리를 기억해 두고, 겹치면 아래로 밀어 내린다 */
    var 놓은 = [];
    function 알약(dx, vy, 글, 색, 아래로) {
      var pw = Math.ceil(textW(글, 11)) + 16,
        ph = 20;
      var px = dx - pw / 2;
      if (px < LEFT) px = LEFT;
      if (px + pw > W - 1) px = W - 1 - pw;
      var py = 아래로 ? vy + 16 : vy - ph - 9;
      if (py < 1) py = vy + 16;
      if (py + ph > PH) py = Math.max(1, vy - ph - 9);
      /* 이미 놓인 것과 가로로 겹치면 세로로 비킨다 */
      for (var g = 0; g < 놓은.length; g++) {
        var o = 놓은[g];
        var 가로겹 = px < o.x + o.w + 4 && o.x < px + pw + 4;
        var 세로겹 = py < o.y + o.h + 3 && o.y < py + ph + 3;
        if (가로겹 && 세로겹) {
          py = o.y + o.h + 5 + ph <= PH ? o.y + o.h + 5 : Math.max(1, o.y - ph - 5);
          g = -1; /* 자리를 옮겼으니 처음부터 다시 견준다 */
        }
      }
      놓은.push({ x: px, y: py, w: pw, h: ph });
      /* 점과 알약을 가는 선으로 잇는다 — 알약을 선에서 떼어 놓았으니
         어느 점의 값인지 보여야 한다 */
      if (py > vy + 2) {
        svg.appendChild(
          svgEl('line', {
            x1: dx,
            y1: vy + 4,
            x2: dx,
            y2: py,
            stroke: 색,
            'stroke-width': 1,
            opacity: '0.55'
          })
        );
      }
      svg.appendChild(svgEl('rect', { x: px, y: py, width: pw, height: ph, rx: 10, fill: 색 }));
      var tt = svgEl('text', {
        x: px + pw / 2,
        y: py + 14,
        'text-anchor': 'middle',
        'font-size': '11',
        'font-weight': '700',
        fill: 'var(--paper)'
      });
      tt.textContent = 글;
      svg.appendChild(tt);
    }
    var 끝점 = 앞[앞.length - 1];
    /* ★ NAM-9. 표시하는 최저는 다음 달 1일 ~ 말일 가운데의 최저다 — 카드의 다음 달 최저 줄과 같은 값이다.
       다음 달에 닿지 못한 자료에서는 최저 표시를 안 한다 (선의 색이 0원 미만을 따로 보인다) */
    var 월 = dueNextMonthLow(c, pts);
    var 최저날 = 월 ? 월.날수 : null,
      최저값 = 월 ? 월.값 : null;
    /* 최저 자리의 점을 찾는다 — 「입금 전」이면 그렇게 적는다 (요청서 ④) */
    var 최저점 = null;
    for (i = 앞.length - 1; i >= 0; i--) {
      if (앞[i].날 === 최저날 && Math.round(앞[i].값) === 최저값) {
        최저점 = 앞[i];
        break;
      }
    }
    if (!최저점) {
      for (i = 0; i < 앞.length; i++) {
        if (앞[i].날 === 최저날) {
          최저점 = 앞[i];
          break;
        }
      }
    }
    if (최저점) {
      svg.appendChild(
        svgEl('circle', {
          cx: X(최저점.날),
          cy: Y(최저점.값),
          r: 3.6,
          fill: 'var(--paper)',
          stroke: 최저값 < 0 ? 'var(--warn)' : 'var(--brand)',
          'stroke-width': 2
        })
      );
      /* ★ 114차 보정 ①. 기준일 잔액이 최저일 때는 「최저 예상 잔액」이라 안 부른다.
         그건 예상이 아니라 자료에 적힌 실제 잔액이다 —
         카드도 같은 자리에서 「자료 기준일 잔액」이라 부른다 (111차 ①).
       ★ 알약을 선 아래 빈 자리에 놓는다. 선 위에 얹으면 그림을 가린다 (실측) */
      알약(
        X(최저점.날),
        Y(최저점.값),
        최저점.갈래 === '기준'
          ? '자료 기준일 잔액 ' + won(최저값) + '원'
          : +월.달.slice(5, 7) +
              '월 최저 ' +
              dueMan(최저값) +
              (최저점.갈래 === '입금전' ? ' · 입금 전' : ''),
        최저값 < 0 ? 'var(--warn)' : 'var(--brand)',
        true
      );
    }
    /* 끝값 — 최저와 같은 자리면 알약을 겹쳐 놓지 않는다 */
    var 같자리 = 최저점 && 최저점.날 === 끝점.날 && 최저점.값 === 끝점.값;
    /* ★ 119차. 끝점과 끝값 금액표도 예상 선과 같은 기준이다 (0원 미만만 빨강) */
    var 끝색 = 끝점.값 < 0 ? 'var(--warn)' : 'var(--brand)';
    svg.appendChild(
      svgEl('circle', {
        cx: X(끝점.날),
        cy: Y(끝점.값),
        r: 3.2,
        fill: 'var(--paper)',
        stroke: 끝색,
        'stroke-width': 2
      })
    );
    if (!같자리) {
      알약(X(끝점.날), Y(끝점.값), 날글(c.목표) + ' ' + dueMan(c.예상), 끝색, true);
    }
    /* 날짜 줄 — 양 끝과 기준일 */
    [
      [첫날, 'start'],
      [pts.시작, 'middle'],
      [끝날, 'end']
    ].forEach(function (p) {
      var tx = svgEl('text', {
        x: X(p[0]),
        y: PH + 13,
        'text-anchor': p[1],
        'font-size': '10',
        fill: 'var(--gray)'
      });
      tx.textContent = 날글(new Date(p[0] * 86400000).toISOString().slice(0, 10));
      svg.appendChild(tx);
    });
    /* ★ 114차 보정 ④. 날을 고르면 그날 두 시점을 각각 보여드린다.
       잔액이 같아 마커가 하나로 보이는 날도, 상세에서는 두 값이 따로 선다 —
       화면에서 겹쳐 보이는 것과 자료가 하나인 것은 다르다.
       ★ 고른 날을 보이려고 위치나 금액을 벌리지 않는다. 띠만 깐다 */
    var 고른 = host.__고른날;
    if (고른 != null && 고른 >= 첫날 && 고른 <= 끝날) {
      var bw = Math.max(6, (W - LEFT - RIGHT) / Math.max(1, 끝날 - 첫날));
      svg.appendChild(
        svgEl('rect', {
          x: X(고른) - bw / 2,
          y: PAD - 10,
          width: bw,
          height: PH - PAD + 10,
          fill: 'var(--now)',
          opacity: '0.10'
        })
      );
    }
    var hits = svgEl('g', {});
    for (var hd = 첫날; hd <= 끝날; hd++) {
      (function (day) {
        var hw = Math.max(8, (W - LEFT - RIGHT) / Math.max(1, 끝날 - 첫날));
        var r = svgEl('rect', {
          x: X(day) - hw / 2,
          y: 0,
          width: hw,
          height: PH,
          fill: 'transparent',
          style: 'cursor:pointer'
        });
        r.addEventListener('click', function () {
          host.__고른날 = host.__고른날 === day ? null : day;
          그리기다시(host, c, cv, pts);
        });
        hits.appendChild(r);
      })(hd);
    }
    svg.appendChild(hits);
  });
}

/* drawDueGraph 에서 뺀 부분 (B-4) */
function drawDueGraphDetail(host, c, cv, pts, 지난, 고른날, det) {
  if (고른날 == null) {
    det.appendChild(el('div', 'fcdethint', '그래프에서 날짜를 누르면 그날 잔액을 봅니다.'));
  } else {
    var 날문 = 날글(new Date(고른날 * 86400000).toISOString().slice(0, 10));
    var 앞것 = pts.점.filter(function (p) {
      return p.날 === 고른날;
    });
    det.appendChild(el('div', 'fcdetday', 날문));
    if (!앞것.length) {
      /* 기준일 앞 — 자료에 적힌 실제 잔액이다. 예상이 아니다 */
      var 지난것 = null;
      지난.forEach(function (p) {
        if (p.날 === 고른날) 지난것 = p;
      });
      det.appendChild(
        el(
          'div',
          'fcdetrow',
          지난것 && 지난것.값 !== null
            ? '계좌 잔액 ' + won(Math.round(지난것.값)) + '원 (자료에 적힌 값)'
            : '이 날은 잔액을 복원할 수 없어 계산에 안 넣었습니다.'
        )
      );
    } else if (앞것.length === 1 && 앞것[0].갈래 === '기준') {
      det.appendChild(
        el(
          'div',
          'fcdetrow',
          '자료 기준일 잔액 ' + won(Math.round(앞것[0].값)) + '원 (자료에 적힌 값)'
        )
      );
    } else {
      var 전 = null,
        후 = null;
      앞것.forEach(function (p) {
        if (p.갈래 === '입금전') 전 = p;
        if (p.갈래 === '일말') 후 = p;
        if (p.갈래 === '기준') {
          전 = 전 || p;
          후 = 후 || p;
        }
      });
      if (전) det.appendChild(el('div', 'fcdetrow', '입금 전 ' + dueMan(전.값)));
      if (후) det.appendChild(el('div', 'fcdetrow', '당일 반영 후 ' + dueMan(후.값)));
      /* ★ 계산값으로 견준다. 반올림한 표시값이 아니다 */
      if (전 && 후 && 전.값 === 후.값) {
        det.appendChild(el('div', 'fcdetsame', '입금 전·당일 반영 후 잔액 동일'));
      }
    }
    var 끄기 = el('button', 'oslink', '선택 해제');
    끄기.type = 'button';
    끄기.addEventListener('click', function () {
      host.__고른날 = null;
      그리기다시(host, c, cv, pts);
    });
    det.appendChild(끄기);
  }
}

/* 날을 고르면 이 함수가 제 자리를 다시 그린다. 고른 날은 host 에 붙어 있어
     innerHTML 을 비워도 살아남는다 */
function 그리기다시(host, c, cv, pts) {
  drawDueGraph(host, c, cv, pts);
}

/* 계산은 core/due.js 의 dueGraphPastIn — 지금 매장(UP)과 캐시·저장소 창구(DUE_ENV)를 넘긴다 */
function dueGraphPast(c, 며칠) {
  return dueGraphPastIn(UP, DUE_ENV, c, 며칠);
}
/* 계산은 core/due.js 의 dueSpreadIn — 지금 매장(UP)과 캐시·저장소 창구(DUE_ENV)를 넘긴다 */
function dueSpread() {
  return dueSpreadIn(UP, DUE_ENV);
}
/* ★ 61차 ②. dueX(배수 글자) 를 걷어냈다 — 부르는 곳이 없어졌다.
   화면에 「배」 표기는 0건이다 */

/* ── 57차 ⑦ · 화면 ──────────────────────────────────────────
   접히면 「9월 10일까지 모자랄 가능성 53%」와 근거 한 줄,
   펼치면 잔액·들어올 돈·나갈 돈·예상 잔액 네 줄.
   ★ 「모자랍니다」라고 단정하지 않는다. 늘 「~할 수 있습니다」·「예상됩니다」다.
   ★ 2026-09-19 요한 확정. 「예측·전망·추정」이라는 낱말 금지는 푼다 —
     마스터 ■2 에 있는 것은 「앞일 단정 금지」지 낱말 금지가 아니었고,
     금지어 목록(mask.ps1)에도 이 셋은 없었다. 코드 주석만 더 빡빡했다.
     막는 것은 단정형이다 — 「모자랍니다」·「안전합니다」·「보장」·「확실히」.
   ★ 같은 날 「모자랄 가능성 %」는 화면에서 뺐다. 셈은 남아 있다 */
/* ── 86차 ① · 82차 ②를 철회한다 ──────────────────────────────────
   82차 ②는 「모자랄 가능성이 20% 아래면 여유로 보고 카드를 아래로 내린다」였다.
   근거는 「약국은 돈이 모자랄 일이 거의 없고요」(○○ 약사)였고, 고장이 아니라
   일부러 넣은 것이었다. 그런데 개발자 화면이 0%라 카드가 내려갔다 — 설계대로였지만
   맨 위에 있어야 할 것이 안 보였다.
   ★ 이제 어느 대표님이든 늘 맨 위에 두고 늘 펼친 채로 시작한다.
     접는 것은 대표님이 정하신다 — 앱이 미리 접어 두지 않는다.
     ○○ 약사의 말은 「접을 수 있게 된 것」으로 갈음한다.
   ★ dueIsEasy() 와 DUE_EASY_PCT 를 없앤다. 자리를 가르는 길 자체를 없애야
     다음에 또 「왜 안 보이지」가 안 생긴다.
   ★ 펼침 열쇠를 __due(열림) 에서 __dueShut(접힘) 으로 뒤집는다 —
     UP.open 은 달을 옮길 때 비워지는 통이라, 열림으로 두면 비워질 때마다
     접힌 채로 돌아간다. 접힘으로 두어야 「늘 펼친 채로」가 지켜진다 */
function drawDueCard(host, months) {
  var c;
  DUE_HOLD_NOW = null;
  try {
    c = dueCard();
  } catch (e) {
    c = null;
  }
  if (!c) {
    drawDueNoCard(host);
    return;
  }
  /* ★ 116차 앞 ④. 보류면 예상 숫자 대신 안내를 낸다.
     곡선도 그림도 여기서부터 아예 안 만든다 */
  /* ★ NAM-9 배포 전 보완. 오래된 자료면 예상 영역 머리에 그 사실을 붙인다 */
  var 머리 = host.querySelector ? host.querySelector('.duesechead') : null;
  if (머리 && dueIsOld(c)) 머리.textContent = '예상 · 과거 자료 기준';
  /* ★ NAM-9 요한 승인. 보류 사유(이체·입금·자료)는 한 카드가 함께 보여준다.
     ★ DUE_HOLD_NOW 는 더 안 채운다 — 그 목록의 [정하기](분류)로는 이체 후보 보류가 풀리지 않는다 */
  if (c.보류 || c.입금보류 || c.자료보류) {
    drawDueHoldCard(host, c, months);
    return;
  }
  /* ★ 101차. 곡선을 여기서 한 번만 구한다 — 제목과 펼친 자리가 같이 쓴다 */
  var cv;
  try {
    cv = dueCurve(months, c);
  } catch (e) {
    cv = null;
  }
  var mm = +c.목표.slice(5, 7),
    dd = +c.목표.slice(8, 10);
  var 까지 = mm + '월 ' + dd + '일';
  /* ★ 105차 ①. 「지난 2개월」이 아니라 「비교 가능한 과거 구간 2개」다 —
     경과일 대응 구간은 달력 한 달과 일치하지 않는다.
     그리고 어느 날부터인지 적는다. 「뒷부분」만으로는 어디부터인지 모르신다 */
  var 표본줄 = null;
  if (c.셈줄수 && c.셈줄값) {
    var 줄날 = 날짜글(c.셈줄수);
    표본줄 =
      c.셈줄값 >= 2
        ? 줄날 +
          ' 이후 예상 지출은 비교 가능한 과거 구간 ' +
          c.셈줄값 +
          '개를 기준으로 계산했습니다.'
        : 줄날 + ' 이후 예상 지출은 과거 한 구간의 내역을 기준으로 계산했습니다.';
  }
  /* ★ 105차 ③. 표본이 아예 없어 종료일이 당겨졌을 때 */
  var 잘림줄 = c.잘림
    ? 까지 + '까지 계산했습니다. 이후 예상 지출을 계산할 비교 자료가 부족합니다.'
    : null;
  /* ★ 59차 ③. 상자 전체가 그 색이다. 표본이 모자랄 때는 색을 안 입힌다 */
  var 색 = c.비율 === null ? '' : c.비율 >= 60 ? ' warn' : c.비율 >= 20 ? ' est' : ' good';
  var box = el('div', 'duecard' + 색);
  /* ★ 66차 4-2. 겉모습만 새로 한다 — 카드 안 글자는 한 글자도 안 바뀐다.
     ★ 느낌표는 도형으로 그린다. 이모지도 아니고 글자도 아니라
       innerText 에 안 잡힌다 — 그래야 「글자가 완전히 같다」를 지킬 수 있다.
     ★ 66-18차 ①. 동그라미에서 세모로 바꾼다 — 세모 느낌표가 「조심」이라는 뜻을
       모양만으로 말한다. 색은 그대로 구간을 따라간다 (아이콘과 % 숫자가 구간을 말한다).
     ★ 모서리를 둥글린 세모다. 뾰족한 세모는 이 화면의 다른 모서리와 안 맞는다 */
  var 아이콘 = svgEl('svg', { viewBox: '0 0 40 40', width: 30, height: 30 });
  아이콘.setAttribute('class', 'dueicon' + 색);
  아이콘.setAttribute('aria-hidden', 'true');
  아이콘.appendChild(
    svgEl('path', {
      d: 'M20 5.4 L37.2 33.2 A3.4 3.4 0 0 1 34.3 38.4 L5.7 38.4 ' + 'A3.4 3.4 0 0 1 2.8 33.2 Z',
      fill: 'currentColor',
      opacity: '0.16'
    })
  );
  아이콘.appendChild(
    svgEl('path', {
      d: 'M20 5.4 L37.2 33.2 A3.4 3.4 0 0 1 34.3 38.4 L5.7 38.4 ' + 'A3.4 3.4 0 0 1 2.8 33.2 Z',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 3,
      'stroke-linejoin': 'round'
    })
  );
  아이콘.appendChild(
    svgEl('rect', { x: 17.9, y: 16, width: 4.2, height: 11, rx: 2.1, fill: 'currentColor' })
  );
  아이콘.appendChild(svgEl('circle', { cx: 20, cy: 32, r: 2.4, fill: 'currentColor' }));
  /* ★ 111차 ⑤. 구체적인 주의 사유가 있을 때만 붙인다.
     예전에는 조건 없이 늘 붙어서, 여유가 넉넉한 매장에도 경고 표시가 섰다 —
     늘 켜져 있는 경고는 아무 말도 안 하는 것과 같다.
     ★ 「그냥 예상값이라서」는 사유가 아니다.
     ★ 카드 테두리 색 규칙(c.비율)은 그대로다. 아이콘의 유무만 바꾼다.
     ★ 아이콘을 뺀 자리는 왼쪽 여백도 같이 줄인다 (.duecard.noicon) */
  var 주의 =
    !!(cv && (cv.모자람 > 0 || cv.바닥)) ||
    !!c.공통기준 ||
    !!잘림줄 ||
    !!(표본줄 && cv && cv.최저날수 >= c.셈줄수);
  if (주의) box.appendChild(아이콘);
  else box.classList.add('noicon');

  /* ★ 100차 ③. 86차 ①의 「늘 펼친 채로」를 뒤집는다 (2026-09-19 요한).
     ★ NAM-9. 여닫는 것은 계산 근거(자세히)뿐이다. 기간·예상 잔액·다음 달 최저·그래프는
       접혀 있어도 늘 보인다 — 그래프를 따로 여는 단추를 없앴다 */
  var open = !!UP.open.__dueOpen;
  /* ★ NAM-9 (2026-09-29 요한). 머리에 실제 날짜와 달을 적는다 — 「다음 달」만 쓰지 않는다.
     「8월 22일 자료 기준 · 9월 말까지 예상 잔액」.
     ★ 이 한 줄이 자료 기준일을 말하므로 따로 서던 「자료 기준일 ○월 ○일」 줄은 뺐다 (같은 날을 두 줄에 안 적는다) */
  var top = el('div', 'duetop tapx');
  var res = el('div', 'dueres');
  res.appendChild(el('div', 'duereslab', dueSpanText(c)));
  /* ★ NAM-9 요한 승인. 예상값은 만원 단위로 보인다 (계산은 원 단위 그대로) */
  res.appendChild(el('div', 'duresnum', dueMan(c.예상)));
  top.appendChild(res);
  top.appendChild(foldChip(open));
  box.appendChild(top);
  dueOldNote(c, box);

  /* ★ NAM-9. 다음 달 1일 ~ 말일 가운데 잔액이 가장 적을 것으로 예상되는 날.
     이번 달을 포함한 전체 기간의 최저(cv.최저)와 섞지 않는다 */
  var pts;
  try {
    pts = cv ? dueGraphPts(c, cv) : null;
  } catch (e) {
    pts = null;
  }
  var 월 = pts ? dueNextMonthLow(c, pts) : null;
  drawDueNextLow(c, 월, box, cv);
  /* ★ 이번 달 남은 날에 잔액이 0원 밑으로 내려갈 수 있으면 그 사실은 늘 보인다.
     다음 달 최저만 보여주면 그보다 앞선 날의 모자람이 가려진다 */
  if (cv && cv.모자람 > 0 && !(월 && cv.최저날수 >= 월.첫날)) {
    box.appendChild(el('div', 'duewhy dueas', dueShortText(c, cv.최저날, cv.모자람)));
  }
  /* ★ NAM-9. 그래프를 예상 영역 안에 바로 그린다 (114차의 「그래프 보기」 창을 대신한다).
     ★ 곡선이 안 나오는 자료(표본 부족·하루짜리)에서는 그리지 않는다 — 지어내지 않는다 */
  if (pts) {
    var gw = el('div', 'fcwrap duegraph');
    box.appendChild(gw);
    drawDueGraph(gw, c, cv, pts);
    box.appendChild(
      el(
        'div',
        'fcnote',
        '과거 입출금을 바탕으로 한 예상이며 실제 잔액은 달라질 수 있습니다. 지금 사용할 수 있는 금액을 뜻하지 않습니다.'
      )
    );
  } else {
    /* ★ NAM-9 배포 전 보완. 그래프가 안 나오면 까닭을 적는다 — 빈자리로 두지 않는다 */
    var 까닭 = null;
    try {
      까닭 = dueCurveWhy(c);
    } catch (e) {}
    if (까닭) {
      box.appendChild(
        el(
          'div',
          'duewhy dueas',
          (까닭 === '3개월' ? '비교할 지난 3개월 자료가 모자라' : '비교할 과거 자료가 모자라') +
            ' 그래프와 다음 달 최저 예상 잔액은 표시하지 않았습니다.'
        )
      );
    }
  }
  /* ★ NAM-9 후속. 아직 분류하지 않은 출금을 예측에 넣었으면 그 사실을 한 줄로 알린다.
     분류하지 않아도 그래프가 나오는 대신, 무엇이 들어갔는지는 숨기지 않는다 */
  /* ★ NAM-9 배포 전 보완. 입금 쪽도 같이 적는다 — 아직 분류하지 않은 입금은 예상 입금에 안 들어간다 */
  var 미분류줄 = [];
  if (c.미분류) {
    미분류줄.push('아직 분류하지 않은 출금 ' + won(c.미분류.건수) + '건은 예상 출금에 넣었습니다.');
  }
  if (c.입금틈 && c.입금틈.건수) {
    /* ★ NAM-9 요한 승인 문구. 건수·금액은 사실(원 단위)이고, 「꼭 분류할 개수」로 부르지 않는다 */
    미분류줄.push(
      '직전 30일 미분류 입금 ' +
        won(c.입금틈.건수) +
        '건 · ' +
        won(c.입금틈.합) +
        '원. 아직 분류하지 않은 입금은 예상 입금에 넣지 않았습니다. ' +
        '매출이 포함돼 있다면 예상 잔액이 낮게 계산될 수 있습니다.'
    );
  }
  if (미분류줄.length) box.appendChild(el('div', 'duewhy dueas', 미분류줄.join(' ')));
  drawDueHeldPlans(months, c, box);
  /* ★ 102차. 계좌마다 마지막 거래일이 다르면 그 사실을 말한다. 같으면 안 나온다.
     ★ 계좌를 지목하지 않는다 — 이름이 「계좌 2」인 경우가 있어 지목해도 뜻이 없다.
     ★ 확인된 것은 「계좌별 최종 거래일 중 가장 이른 날」 하나뿐이다 */
  if (c.공통기준) box.appendChild(el('div', 'duewhy dueas', dueCommonText(c)));
  if (!open) box.classList.add('shut');
  /* ★ 105차 ①③. 어디까지 계산했는지와 표본이 줄어든 자리는 접든 펴든 같은 무게다 */
  if (!open && 잘림줄) box.appendChild(el('div', 'duewhy dueas', 잘림줄));
  if (!open && 표본줄 && 월 && 월.날수 >= c.셈줄수) {
    box.appendChild(el('div', 'duewhy dueas', 표본줄));
  }

  top.addEventListener('click', function () {
    UP.open.__dueOpen = !UP.open.__dueOpen;
    drawResult(months);
  });
  var 기준날인가 = !!(cv && cv.최저날수 === dayNum(c.오늘));
  drawDueCardDetail(months, c, cv, 까지, 표본줄, 잘림줄, box, open, 기준날인가);
  host.appendChild(box);
}
/* drawDueCard 에서 뺀 부분 (B-4) */
function drawDueNoCard(host) {
  /* ★ 102차 추가 ③. 카드가 안 나오는 까닭이 「그날 잔액을 복원 못 하는 계좌가 있음」
       이면 빈 자리로 두지 않고 그 사실을 적는다.
       ★ 확인이 필요한 계좌는 이름과 자료 기간을 있는 그대로 적는다 —
         은행을 고르셨으면 「카카오뱅크」로, 안 고르셨으면 「계좌 2」로 뜬다.
         그때는 옆의 자료 기간으로 알아보신다 */
  var 못 = null;
  try {
    못 = dueUnknownAccs();
  } catch (e) {}
  if (못) {
    var 안 = el('div', 'duenone');
    안.appendChild(
      el(
        'div',
        null,
        '계좌 ' +
          won(못.총) +
          '개 중 ' +
          won(못.빠짐) +
          '개는 ' +
          +못.날.slice(5, 7) +
          '월 ' +
          +못.날.slice(8, 10) +
          '일 기준 잔액을 확인할 수 없어 예상 잔액을 표시하지 않았습니다.'
      )
    );
    안.appendChild(el('div', null, '계좌별 자료 기간과 잔액 정보를 확인해주세요.'));
    /* ★ 「자료 기간을 맞춰 올려주시면 계산해드리겠습니다」라고 하지 않는다 —
         나중에 연 계좌라면 앞 자료를 넣을 수가 없다. 보장할 수 없는 말이다.
         「최신 내역을 올리면 맞춰집니다」도 쓰지 않는다 */
    안.appendChild(
      el(
        'div',
        'duenonelist',
        '확인이 필요한 계좌: ' +
          못.목록
            .map(function (x) {
              return x.이름 + (x.기간 ? ' (' + x.기간 + ')' : '');
            })
            .join(' · ')
      )
    );
    host.appendChild(안);
  }
}

/* drawDueCard 에서 뺀 부분 (B-4) */
function drawDueHeldPlans(months, c, box) {
  /* ★ 116차 ⑫. 적용 보류가 있을 때만 한 줄 표시한다. 없으면 아무 말도 안 한다 */
  if (c.적용보류수) {
    var pw = el(
      'div',
      'duewhy dueas duehold',
      '예정 지출 ' + won(c.적용보류수) + '건의 반영이 보류되어 있습니다.'
    );
    var pb = el('button', 'b', '확인하기');
    pb.type = 'button';
    pb.addEventListener('click', function (e) {
      e.stopPropagation(); /* 카드 머리의 접기·펴기를 건드리지 않는다 */
      openDuePlan(c, months, '적용보류');
    });
    pw.appendChild(pb);
    box.appendChild(pw);
  }
}

/* drawDueCard 에서 뺀 부분 (B-4) */
function drawDueCardDetail(months, c, cv, 까지, 표본줄, 잘림줄, box, open, 기준날인가) {
  if (open) {
    /* ★ NAM-9 (2026-09-29). 여기 있던 분석 종료일 드롭다운(110차 ④)을 없앴다 —
       예상 기간은 묻지 않고 다음 달 말일까지로 정한다 */
    var t = el('div', 'duepick');
    /* ★ B-4 (2026-09-28). 블록 안 함수 선언을 변수로 바꿨다 — 선언 뒤에서만 부르므로 같다. 블록을 함수로 뺄 수 있게 */
    /* ★ NAM-9 요한 승인. 예상(들어올·나갈)은 만원, 자료에 적힌 잔액은 원 단위다 (예상 = true) */
    var 줄 = function (name, v, sub, sign, 예상) {
      var r = el('div', 'orow');
      var l = el('div', 'lab', '　' + name);
      if (sub) l.appendChild(el('span', 'gcount', sub));
      r.appendChild(l);
      r.appendChild(
        el('div', 'v num', (sign || '') + (예상 ? dueMan(Math.abs(v)) : won(Math.abs(v))))
      );
      t.appendChild(r);
    };
    /* ★ 113차 ①④⑤ (수정). 자료 범위의 출처와 제한은 「자세히」 안에만 둔다.
       ★ 처음에는 if (open) 밖에 붙였다. .shut 에는 자식을 감추는 규칙이 없어서
         접힌 카드에 그대로 보였고, 폰 390×844 에서 카드가 124px → 208·230px 이 됐다.
         접힌 카드가 짧았던 까닭은 본문을 여기(if (open)) 안에서만 붙였기 때문이다.
       ★ dueas 를 안 붙인다. 그건 「접혀도 보이게 한다」는 표시다 —
         접혀도 보여야 하는 것은 자료 기준일·잘림줄·표본줄 셋뿐이다 (101·105차).
       ★ 계산 근거 바로 위에 둔다. 아래 세 줄이 「무엇을 재료로 한 값인가」이고,
         이 줄이 「그 재료를 어디까지로 잡았는가」다. 붙어 있어야 읽힌다 */
    rangeNotes(c).forEach(function (rn) {
      box.appendChild(el('div', 'duewhy', rn));
    });
    /* ★ 103차 ⑤. 「현재」는 자료 기준일의 잔액이지 지금 잔액이 아니다 */
    줄('자료 기준일 계좌 잔액', c.잔액, null, c.잔액 < 0 ? '− ' : '');
    줄(까지 + '까지 들어올 돈', c.들어올, '직전 30일 매출 기준', '+ ', true);
    /* ★ 105차 ②. 창 안에서 표본이 줄면 「지난 3달」이 사실이 아니다 */
    줄(
      까지 + '까지 나갈 돈',
      c.나갈,
      c.셈최소 < 3
        ? '지난 3달 · 뒷부분은 과거 구간 ' + c.셈최소 + '개 기준'
        : '지난 3달 같은 구간 기준',
      '− ',
      true
    );
    /* ★ 109차 ⑥㉰. 「○월 ○일 예상 잔액」과 「잔액이 가장 적을 날」 두 줄을 뺀다 —
       접힌 카드의 결과 상자와 최저 줄이 그 자리를 대신한다.
       같은 값을 화면에 두 번 세우지 않는다 */
    box.appendChild(t);
    /* ★ 단정하지 않는다 — 「모자랍니다」가 아니라 「모자랄 수 있습니다」 (마스터 ■2) */
    if (cv && cv.모자람 > 0) {
      box.appendChild(el('div', 'duewhy', dueShortText(c, cv.최저날, cv.모자람)));
    } else if (cv && cv.바닥) {
      box.appendChild(
        el(
          'div',
          'duewhy',
          cv.최저날 + '에 하루치 나가는 돈(' + won(cv.하루치) + '원)보다 적어질 수 있습니다'
        )
      );
    }
    if (cv) {
      /* ★ 무엇을 전제로 한 숫자인지 밝힌다.
         ★ 103차 ⑤. 「추가 지출이 없다면」은 입금이 줄거나 늦어지는 경우를 빼놓는다.
           둘 다 잔액을 깎는다. 입금과 지출 양쪽을 다 말한다 */
      /* ★ 109차 ⑥㉰. cv.최저 는 그날 「출금 뒤·입금 전」 값이지 그날 끝 잔액이 아니다.
         이 문장만 그 구분을 잃고 있었다.
         ★ ㉯ 최저날이 자료 기준일이면 그 값은 예상이 아니라 자료에 적힌 실제 잔액이다.
           그때는 숫자를 다시 적지 않는다 — 접힌 카드의 최저 줄이 이미 말했고,
           여기서 또 적으면 같은 값이 화면에 두 번 선다 */
      box.appendChild(
        el(
          'div',
          'duewhy',
          기준날인가
            ? '예상한 입출금이 그대로 이뤄질 경우, ' +
                까지 +
                '까지 잔액이 자료 기준일보다 낮아지지 않을 것으로 예상됩니다.'
            : '예상한 입출금이 그대로 이뤄질 경우, ' +
                cv.최저날 +
                '에는 당일 출금 후 입금 전 잔액이 ' +
                dueMan(cv.최저) +
                '으로 예상됩니다.'
        )
      );
      /* ★ 110차 ②. 「예비비」를 안 부른다 — 정하는 자리가 아직 앱에 없다.
         대신 이 숫자가 무엇이 아닌지를 한 문장으로 적는다 */
      box.appendChild(
        el(
          'div',
          'duewhy',
          '예상 잔액은 앞으로의 입출금을 반영한 추정치이며, 지금 사용할 수 있는 금액을 뜻하지 않습니다.'
        )
      );
      /* ★ 103차 추가 ①. 입금은 균등, 지출만 날짜별이다.
         한 문장으로 뭉치면 거짓말이 된다 — 103차 ①에서 입금을 균등으로 바꿔 놓고
         문구만 옛 것이 남아 있었다 */
      /* ★ 118차 ①②. 출금 설명을 실제 계산 범위에 맞춘다 — 이제 사업 지출만이 아니다.
         한 문장에 입금·출금을 같이 두고 따로 줄을 늘리지 않는다 */
      box.appendChild(
        el(
          'div',
          'duewhy',
          (c.입금방식 === '요일'
            ? '입금은 직전 30일 동안 매출로 분류한 거래의 같은 요일 평균을 날짜마다 놓았습니다. '
            : '입금은 직전 30일 동안 매출로 분류한 거래의 평균을 매일 같은 금액으로 놓았습니다. ') +
            '매출이 아닌 입금과 아직 분류하지 않은 입금은 넣지 않았습니다.' +
            (c.대체요일 && c.대체요일.length
              ? ' 매출 자료가 없는 요일은 30일 평균으로 채웠습니다.'
              : '')
        )
      );
      /* ★ NAM-9 후속. 출금 범위를 사실대로 적는다 — 분류와 상관없이 계좌에서 나간 돈이다.
         한 번만 있었던 출금도 같은 셈(지난 3개월 같은 자리 날의 평균)에 들어간다 */
      box.appendChild(
        el(
          'div',
          'duewhy',
          '출금은 지난 3개월 같은 구간의 날짜별 계좌 출금 평균입니다. ' +
            '사업 외 출금과 아직 분류하지 않은 출금도 넣고, 계좌끼리 옮긴 것으로 확인한 돈은 뺐습니다. ' +
            '한 번만 있었던 출금도 같은 방식으로 평균에 들어갑니다.'
        )
      );
      /* ★ 104차 정정 ㉲ · 105차 ①. 날짜마다 비교한 과거 구간 수가 다를 수 있다.
         그때 「모든 날짜가 지난 3개월 평균」은 더는 사실이 아니라 한 줄 더 적는다 */
      if (표본줄) box.appendChild(el('div', 'duewhy', 표본줄));
      if (잘림줄) box.appendChild(el('div', 'duewhy', 잘림줄));
      /* ★ 103차 ②. 최저점은 「출금 뒤, 입금 전」 값이지 일말 잔액이 아니다.
         이건 가정이지 실제 거래 순서가 아니다. 가정이면 가정이라고 적는다 —
         「실제로 아침에 급여가 나갑니다」처럼 사실인 양 쓰지 않는다 */
      box.appendChild(
        el('div', 'duewhy', '같은 날에는 출금이 입금보다 먼저 이뤄지는 것으로 가정했습니다.')
      );
    }
    /* ★ 116차 ⑤. 예정 지출 편집 화면을 여는 단추.
       기존 [자세히] 안에 둔다 — 카드 안에 또 다른 접힘 영역을 만들지 않는다.
       ★ 닫으면 고르신 분석 종료일과 카드 펼침 상태가 그대로다 */
    var pbtn = el('button', 'fcopen planopen', '예정 지출 확인·수정');
    pbtn.type = 'button';
    pbtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openDuePlan(c, months);
    });
    box.appendChild(pbtn);
  }
}

/* ── NAM-9 · 다음 달 최저 예상 잔액 두 줄 ─────────────────────────────
   「9월 중 잔액이 가장 적을 것으로 예상되는 날: 9월 ○일」
   「그날의 최저 예상 잔액: ○○원」 + 입금 전 조건 한 줄.
   ★ 값은 dueGraphPts 의 「입금 전」 점이다 — 당일 출금 후·입금 전 잔액이라 그 조건을 짧게 남긴다.
   ★ 미래의 확정 잔액이나 지금 쓸 수 있는 돈으로 부르지 않는다. 「예상」을 뗀 이름을 안 쓴다.
   ★ 비교 자료가 모자라 다음 달 중간까지만 계산했으면 그 범위를 이름에 적는다.
     다음 달에 아예 닿지 못했으면(월 === null) 아무 말도 안 한다 — 잘림 줄이 까닭을 말한다 */
function drawDueNextLow(c, 월, box, cv) {
  if (!월) return;
  var mm = +월.달.slice(5, 7);
  /* ★ NAM-9 배포 전 보완. 오래된 자료면 「9월」이 올해 9월로 읽히지 않게 해를 붙인다 */
  var 달이름 = (dueIsOld(c) ? 월.달.slice(0, 4) + '년 ' : '') + mm + '월';
  var 범위 = 월.전부 ? 달이름 + ' 중' : 달이름 + ' 1일 ~ ' + 날글(날짜값(월.계산끝)) + ' 중';
  var 날 = 날글(날짜값(월.날수));
  var low = el('div', 'duenext');
  low.appendChild(el('div', 'duenextday', 범위 + ' 잔액이 가장 적을 것으로 예상되는 날: ' + 날));
  var 값줄 = el('div', 'duenextval');
  값줄.appendChild(document.createTextNode('그날의 최저 예상 잔액: '));
  값줄.appendChild(el('b', 월.값 < 0 ? 'sgn-minus' : null, dueMan(월.값)));
  low.appendChild(값줄);
  if (월.갈래 === '입금전') {
    low.appendChild(el('div', 'duenextsub', '당일 출금 후 입금 전 기준'));
  }
  /* ★ NAM-9 배포 전 보완. 임시 참고 범위 — 중심값 ± 다음 달 예상 출금 합계 × 0.5 (dueNextMonthRangeIn).
     ★ 하한이 음수여도 자르지 않는다. 경고색을 안 쓴다 — 하한만으로 부족이 정해진 것이 아니다.
     ★ 80%·적중률·신뢰구간 같은 말을 안 쓴다. 한 달 뒤 잔액 오차로 정한 임시 폭이다 */
  var rg = null;
  try {
    rg = dueNextMonthRangeIn(c, cv, 월);
  } catch (e) {}
  if (rg) {
    var r = el('div', 'duerange');
    var 머리 = el('div', 'duerangeval');
    머리.appendChild(document.createTextNode('임시 참고 범위: '));
    /* 하한은 내림, 상한은 올림 — 만원으로 줄이며 범위가 좁아지지 않게 */
    머리.appendChild(el('b', null, dueManFloor(rg.하한) + ' ~ ' + dueManCeil(rg.상한)));
    머리.appendChild(document.createTextNode(' · ' + 주글(rg.주시작, rg.주끝) + ' 무렵'));
    r.appendChild(머리);
    var 설명 =
      '예상 출금액을 기준으로 임시로 넓혀 표시한 참고 범위입니다. ' +
      '예상에 없는 큰 입출금이 있으면 범위를 벗어날 수 있습니다. ' +
      '실제로 가장 낮아지는 시점은 다른 주일 수 있습니다.';
    if (!월.전부) {
      설명 += ' ' + 달이름 + ' 1일 ~ ' + 날글(날짜값(월.계산끝)) + '의 예상 출금으로 넓혔습니다.';
    }
    r.appendChild(el('div', 'duenextsub', 설명));
    if (rg.하한 < 0) {
      r.appendChild(
        el(
          'div',
          'duenextsub',
          '음수는 예상대로 돈이 들어오고 나갈 경우, 계좌의 돈이 부족할 수 있다는 뜻입니다.'
        )
      );
    }
    low.appendChild(r);
  }
  box.appendChild(low);
}
/* 주의 실제 날짜 범위 — 「9월 4일~10일」, 달이 바뀌면 「9월 29일~10월 5일」 */
function 주글(a, b) {
  var x = 날짜값(a),
    y = 날짜값(b);
  return 날글(x) + '~' + (x.slice(5, 7) === y.slice(5, 7) ? +y.slice(8, 10) + '일' : 날글(y));
}
