/* ── core · 예상 잔액의 계산 부품 ─────────────────────────────────
   리팩토링 B-1f-1 (2026-09-26): 16-due.js 에서 매장 자료(UP)를 읽기만 하는 계산을 옮겼다.
   일별 예상 지출(dueDailyIn) · 입금(dueInflowIn) · 자료 범위(dueCoverIn) · 미정 출금 · 목표일 · 예정 지출 셈.
   ★ 날짜별 잔액 표(dueTable)와 예정 지출(planBox)은 UP 에 캐시를 적는 곳이라 아직 앱(16-due.js)에 있다.
     그것을 쓰는 dueProject · dueCard 등도 남아 있다 — B-1f-2 에서 옮긴다.
   단위 테스트: tests/core/due.spec.mjs */
/* ── (원래 16-due.js) ── */
/* ★ 54차 ③. drawResult 는 중간에 return 하는 길이 여럿이라
   (1년치·검산 어긋남) 끝에 한 줄 붙이는 것으로는 다 못 잡는다. 감싼다.
 ★ 56차. 화면이 위로 튀는 것 — 「물음표 문제」가 아니었다.
   scrollTo 도 scrollIntoView 도 호출 0건이다. 아무도 화면을 옮기지 않는다.
   drawResultInner 첫 줄의 host.innerHTML = '' 이 몸통을 한 번 비우는데,
   비어 있는 그 순간 페이지가 짧아지고 브라우저가 스크롤을 그 짧아진 높이에
   맞춰 잘라버린다. 다시 그려도 스크롤은 잘린 자리에 남는다 —
   그래서 아래쪽에 있을수록 크게 튄다 (1년치 422px · 한 달 515px).
   예시 자료는 페이지가 짧아 안 튄다. 진짜 파일을 넣어야 드러난다.
 ★ 가로도 같다. 1년치 표의 .ywrap 이 다시 그려질 때 scrollLeft 0 에서 시작해서,
   5월을 보다가 ? 를 누르면 1월로 돌아온다.
 ★ 화면을 일부러 옮기는 곳(goMonth · goUnset · 보기 바꾸기 · upShow)은
   이 뒤에 부르므로 그쪽이 이긴다. 여기서는 「안 옮기는 것」만 맡는다 */
/* ── 57차 ⑦ · 「다음 달 10일까지 잔액이 충분한가」 (58차에 다시 씀) ──
   39차에 걷어낸 「모자랄 것 같다」를 다른 방식으로 되살린다.
   그때는 미래를 계산해서 판정했고 헛경보를 냈다.
   이번에는 그 매장 자기 과거를 세어 비율만 보여준다 — 예측이 아니라 집계다.
   ★ 남의 매장 숫자를 쓰지 않는다. 16차에 「바깥 기준은 없앴다」고 정한 자리다.
   ★ 「모자랍니다」라고 단정하지 않는다. 늘 「가능성 ○%」다.

   ── 58차에 고친 것 ─────────────────────────────────────
   ⑦-1 「바닥났다」의 뜻. 「잔액이 0원 밑」은 죽은 정의였다 —
        통장은 마이너스가 안 되니 애초에 관측되지 않는다 (9개 매장 1,401일 중 0일).
        「잔액이 하루치 지출보다 적어진 날」로 바꾼다.
        그래서 「내가 넣은 돈을 빼고 잔액을 다시 그리는」 장치를 통째로 걷어냈다 —
        실제 사용자는 스무 곳만 정하시니 「내가 넣은 돈」이 정해져 있지도 않다.
   ⑦-2 구간을 절대 금액에서 비율로. 예상 잔액 ÷ 그날까지 나갈 돈.
        「+2천만원」은 매출 8천만 매장과 3억 매장에게 뜻이 완전히 다르다.
   ⑦-3 구간을 딱딱 자르지 않는다. 지금 배수와 가장 가까웠던 과거 스무 날을 뽑아
        그중 몇 날이 바닥났는지 센다. 경계 문제가 없고 표본이 늘 스물이다.
        ★ 과거만 쓴다. 오늘보다 뒤의 날은 이웃으로 삼지 않는다.
   ⑦-6 카드의 「지금 계좌 잔액」은 표의 것과 늘 같다 —
        가수금을 뺀 잔액을 화면에 올리던 것이 49차 규칙 위반이었다 */
var DUE_DEFAULT = 10; /* 다음 달 며칠까지를 볼 것인가 */
/* ★ 104차 ①. 날짜 대응을 종료일에서 떼어낸다.
   103차까지 과거 구간은 [오늘−k달, 목표−k달] 이었다. 종료일을 하루 늘리면
   과거 구간도 같이 늘어나고, 달 길이가 다르면 새로 들어온 과거 날이
   옛 종료일의 자리로 떨어졌다 — 실측: 목표 12→13 일 때 9/12 이 11만원,
   13→14 일 때 9/13 이 14만원 움직였다 (나머지 공통 날짜는 전부 0원).
   크기가 문제가 아니라 「더 길게 보면 지출이 다른 날로 옮겨간다」가 문제다.
   ★ 기준일이 정해지면 그 자리에 무엇이 오는지도 정해진다.
     과거 구간을 [오늘−k달, 오늘−k달 + 남은날수] 로 고정한다. 목표일은 대응에 안 끼어든다.
   ★ 대응은 「달력 날짜(며칠)」가 아니라 「기준일부터 며칠째」다.
     103차에 달력 날짜로 맞추면 달 길이가 달라 Σ출이 986만원 어긋난다고 이미 쟀다.
     그 판단은 그대로다. 다만 이것이 달력상 지급일 정확도를 푼 것은 아니다 —
     25일 월세가 과거 달 길이에 따라 24일이나 26일 자리에 설 수 있다.
     그건 뒤 회차의 「반복 지출일 찾기」가 할 일이다.
   ★ 104차 정정. 길이를 32일로 박는 것을 철회한다. 남은날수는 32를 넘는다 —
     nextDue 는 늘 다음 달로 가므로 기준일이 달 초이고 목표일이 말일이면
     최대 61일이다 (12월 1일 → 1월 31일). 아래 값은 배열 크기일 뿐이고
     예측 범위의 근거가 아니다. 실제로 쓰는 길이는 남은날수다 */
var DUE_MAXSPAN = 62;
/* 날짜 하나 → 그날의 사업 지출. dueDaily 가 날마다 찾아 쓴다.
   표는 한 번만 만들고 UP.__due 가 비워질 때 같이 사라진다 */
/* ★ 118차 ①. 사업 지출(cc)이 아니라 예측용 출금(fc)을 쓴다 — dueTable 의 설명 참고.
   cc 는 「사업 지출의 몇 %」(dueSpread)와 「하루치」(daily) 잣대로 그대로 남는다 */
function dueCostMap(t) {
  if (t.__cost) return t.__cost;
  var m = {};
  for (var j = 0; j < t.n; j++) m[t.num[j]] = t.fc[j + 1] - t.fc[j];
  t.__cost = m;
  return m;
}
/* 기준일 i 에서 본 「며칠째에 얼마가 나갔나」 — 카드(dueProject)와 곡선(dueCurve)이
   이 하나를 같이 쓴다. 두 곳이 따로 세면 또 어긋난다.

   ★ 104차 정정 ㉰. 표본을 날짜마다 따로 센다. 이게 이번 고침의 핵심이다.
     예전에는 과거 구간이 [오늘−k달, 목표−k달] 이라 자료 기준일을 넘어갔다 —
     기준일 8월 22일에서 25일을 고르면 k=1 구간이 7/22~8/25 로 사흘,
     말일을 고르면 8/30 까지 여드레를 넘었다. 넘어간 날에는 자료가 없는데
     코드는 없으면 0원으로 셌다. 그래서 멀리 볼수록 나갈 돈이 적게 나왔다 —
     실측 하루평균 344만(10일) → 194만(30일). 멀리 볼수록 안전해 보이는,
     방향이 나쁜 결손이었다. 58차의 구간 정의부터 있던 것이지 103차가 만든 것이 아니다.
   ★ 없는 날을 0원으로 세지 않는다. 표본에서 뺀다 — 그래서 분모가 셈[i] 배열이 된다.
     하루 출금 = 몫[i] / 셈[i] 다.
   ★ 셈[i] === 0 인 날부터는 아무 말도 안 한다(한계). 지어내지 않는다.
   ★ 대응은 「달력 날짜(며칠)」가 아니라 「기준일부터 며칠째」다.
     이번 회차는 경과일 대응으로 간다. 달력 날짜 대응은 다음에 견주어 본다 —
     103차에 「Σ출이 986만원 어긋난다」로 기각했던 것은 카드 총액을 옛 방식으로
     둔 채 비교해서 나온 차이였다. 이제 카드도 일별 합이라 다시 볼 여지가 있다.
   ★ 이 고침은 「최저일 예측이 정확해진 것」이 아니다. 일관성과 표본 정직성이다.
   ★ 116차 앞 ③. 상세를 부르면 실제로 채택한 과거 비교 날짜를 같이 들고 나온다.
     보류 판정이 표본 선택을 따로 추정하지 않게 하려는 것이다 —
     고르는 고리는 하나 그대로고, 안 부르면 예전과 똑같이 돈다
   ★ 116차 ④. 같은 고리에서 예정 지출 연결에 쓰는 거래별 기여분(조각)도 같이 모은다.
     채택과 조각은 같은 날짜·같은 표본에서 나온다 — 기여분을 따로 추정하지 않는다.
     조각이 없는 무거래일도 채택과 분모(셈)에는 그대로 들어간다 */
function dueDailyIn(U, t, i, 상세) {
  var 오늘 = t.days[i];
  /* ★ 105차 ⑤. 현재 자료 범위는 최초·최종 거래일로 판단한다.
     조회 기간 안의 무거래일을 일부 제외할 수 있으며,
     예측값에 미치는 영향은 아직 검증하지 않았다.
     조회 기간 파싱은 별도 회차에서 개선한다.
     ── 까닭: dueTable 은 거래가 있는 날만 표에 넣고, 앱은 파일의 조회 기간을
     값으로 읽는 곳이 없다 (안내 문구에만 나온다). 그래서 마지막 거래일 이후가
     거래가 없던 기간인지 파일에 안 담긴 기간인지 구분할 수 없다 —
     오차의 방향도 단정하지 않는다. 은행마다 표기가 달라 회차를 따로 잡아야 한다 */
  /* ★ 102차 추가 ①. 표본의 끝도 공통 기준일이다. 표의 마지막 날이 아니다 —
     기준일을 8월 15일로 당겨놓고 표본만 8월 29일까지 긁으면,
     한 계좌에만 자료가 있는 날이 과거 표본에 섞인다. 과거 잔액에 이후 정보가 섞이는 것이다.
     i 는 dueCard 가 commonAsOf 로 잡아 넘겨준 자리다.
     ★ 이 한 줄로 들어올(30일 매출)·나갈·목표일·곡선 시작점이 전부 같은 기준일 위에 선다.
       dueProject 는 이미 t0 = t.num[i] 로 잘라 쓰고 있었다.
     ★ 최신 거래내역 자체는 그대로 둔다. 예측 카드가 쓰는 범위만 자른다 —
       월별 화면·검산·「마지막 분석일」은 안 건드린다 */
  var 마지막 = t.num[i];
  /* ★ 113차 ①. 「거래가 없던 날」과 「자료가 없는 날」을 가른다.
     예전에는 첫 거래일 뒤부터 기준일까지를 통째로 표본으로 썼다 —
     조회 기간이 첫 거래일보다 앞서 시작하면 그 앞날이 통째로 빠졌고,
     기간을 못 읽는 파일에서는 그것이 유일한 잣대였다.
     이제 계좌마다 확인된 구간을 들고, 그 날이 모든 계좌에서 확인됐을 때만 표본에 넣는다.
     ★ 확인 못 한 계좌는 예전 잣대(첫 거래일 뒤 ~ 기준일)를 그대로 쓴다 —
       조회 기간을 못 읽는 파일에서 112차와 값이 같아야 한다 (완료 기준 13) */
  var cover = dueCoverIn(U, t, 마지막);
  var 시작 = coverStart(cover);
  var cost = dueCostMap(t);
  var 몫 = [],
    셈 = [],
    k,
    x,
    앞부족 = 0;
  var 채택 = 상세 ? [] : null;
  var by = 상세 ? dueCostBy(t) : null,
    조각 = 상세 ? [] : null;
  for (x = 0; x < DUE_MAXSPAN; x++) {
    몫.push(0);
    셈.push(0);
  }
  for (k = 1; k <= 3; k++) {
    var a = dayNum(shiftMonth(오늘, -k));
    for (x = 0; x < DUE_MAXSPAN; x++) {
      var 과거날 = a + 1 + x;
      if (과거날 > 마지막) break; /* 자료 기준일 너머 — 표본이 아니다 */
      if (!coveredAll(cover, 과거날)) {
        /* 자료가 없는 날 — 0원으로 안 센다 */
        /* 자료가 시작되기 전이라 빠진 것인가 (④의 「이전 내역을 더하면」 조건) */
        if (시작 !== null && 과거날 < 시작) 앞부족++;
        continue;
      }
      몫[x] += cost[과거날] || 0; /* 거래가 없던 날은 그날의 0원이다 */
      셈[x]++;
      if (상세) (채택[x] || (채택[x] = [])).push(과거날);
      if (상세) {
        var 줄 = by[과거날];
        if (줄)
          for (var q = 0; q < 줄.length; q++) {
            (조각[x] || (조각[x] = [])).push(줄[q]);
          }
      }
    }
  }
  var 한계 = 0;
  while (한계 < DUE_MAXSPAN && 셈[한계] > 0) 한계++;
  return { 몫: 몫, 셈: 셈, 한계: 한계, 앞부족: 앞부족, 채택: 채택, 조각: 조각 };
}
/* ── 113차 ④ · 「자세히」에 적는 자료 범위 ────────────────────────────
   ★ 기본 화면에는 결과를 둔다. 범위의 출처와 제한은 펼친 자리에만 둔다 (⑤).
   ★ 조회 기간과 거래일이 다르다는 사실만으로는 아무 말도 안 한다 —
     앞뒤에 거래 없는 날이 있는 것은 정상이다.
   ★ 「못 읽었다」로 뭉뚱그리지 않는다. 부분 자료의 징후가 있으면 그 사유를 적는다.
     거래 종류가 걸러진 파일·일부 페이지만 있는 파일은 「못 읽은 것」이 아니다.
   ★ 확장한 경우에도 한 줄 적는다 — 범위가 늘어난 것은 숫자가 움직인 까닭이라
     묻어두면 안 된다. 다만 펼쳐야 보인다 */
function rangeNotesIn(U, c) {
  var bs = (U && U.banks) || [];
  var out = [];
  if (!bs.length) return out;
  var 확정 = 0,
    사유 = null,
    사유문장 = null,
    기간없음 = 0,
    쓴기간 = null;
  bs.forEach(function (b) {
    var r = b && b.range;
    if (r && r.ok) {
      확정++;
      if (!쓴기간 && r.asked) 쓴기간 = r.asked;
      return;
    }
    if (!r || !r.asked) 기간없음++;
    else if (!사유) {
      사유 = r.why;
      사유문장 = r.문장 || null;
    }
  });
  if (확정 === bs.length && 쓴기간) {
    /* ★ 해가 다르면 해까지 적는다. 「11월 22일 ~ 8월 27일」만으로는
       거꾸로 간 기간처럼 읽힌다 */
    var 해다름 = 쓴기간.from.slice(0, 4) !== 쓴기간.to.slice(0, 4);
    out.push(
      '파일에 적힌 조회 기간(' +
        날글(쓴기간.from, 해다름) +
        ' ~ ' +
        날글(쓴기간.to, 해다름) +
        ')을 자료 범위로 썼습니다. 그 기간의 거래 없는 날은 지출 0원으로 셉니다.'
    );
  } else if (사유문장) {
    /* ★ 113차 수정 둘 ①. 통째로 쓰는 완성문 — 사유를 단정할 수 없는 갈래다 */
    out.push(사유문장);
  } else if (사유) {
    /* 부분 자료의 징후 — 실제 사유를 적는다 */
    out.push(사유 + '. 첫 거래일부터 마지막 거래일까지를 기준으로 계산했습니다.');
  } else if (기간없음) {
    out.push(
      '파일의 조회 기간을 확인하지 못해 ' +
        '첫 거래일부터 마지막 거래일까지를 기준으로 계산했습니다.'
    );
  }
  /* ★ 이전 내역을 더하면 실제로 늘어날 자료일 때만 적는다.
     기준일 이후에 비교 날짜가 없는 문제에는 안 붙인다 — 이전 내역을 올려도 안 풀린다 */
  if (c && c.앞부족 > 0) {
    out.push('이전 기간의 거래내역을 추가하면 비교에 사용할 자료가 늘어날 수 있습니다.');
  }
  return out;
}
/* 「2026-05-01」 → 「5월 1일」. 카드가 쓰는 말투 그대로.
   해까지 필요하면 「2026년 5월 1일」 */
function 날글(at, 해까지) {
  var s = String(at);
  return (해까지 ? +s.slice(0, 4) + '년 ' : '') + +s.slice(5, 7) + '월 ' + +s.slice(8, 10) + '일';
}
/* ── 113차 ①⑤⑥ · 자료가 있다고 확인된 날 ────────────────────────────
   ★ 규칙 5. 계좌마다 구간을 배열로 들고 있는다 — 파일 사이의 빈 기간을 자동으로
     안 채우려는 것이다. 지금은 파일 하나가 계좌 하나라 구간도 하나씩이지만,
     한 계좌에 파일을 여럿 묶는 날이 와도 이 모양 그대로 이어 붙이면 된다.
   ★ 규칙 6. 그 날에 계좌마다 자료가 있는지 확인한다. 한 계좌라도 없으면
     그 날 전체 지출을 0원으로 치지 않는다 — 표본에서 뺀다.
   ★ 확인 못 한 계좌를 계좌별 첫 거래일로 좁히지 않는다. 예전 잣대(표 전체의
     첫 거래일)를 그대로 준다 — 좁히면 조회 기간과 상관없이 값이 움직인다 */
function dueCoverIn(U, t, 마지막) {
  var n = accCountIn(U),
    기본 = [[t.num[0] + 1, 마지막]],
    out = [],
    a;
  for (a = 0; a < n; a++) {
    var b = (U.banks || [])[a],
      r = b && b.range;
    if (r && r.ok && r.asked) {
      var lo = dayNum(r.asked.from),
        hi = Math.min(dayNum(r.asked.to), 마지막);
      out.push(hi >= lo ? [[lo, hi]] : []);
    } else {
      out.push(기본);
    }
  }
  return out;
}
/* 모든 계좌가 그 날을 덮는가 */
function coveredAll(cover, day) {
  if (!cover.length) return false;
  for (var a = 0; a < cover.length; a++) {
    var 구간 = cover[a],
      있 = false;
    for (var k = 0; k < 구간.length; k++) {
      if (day >= 구간[k][0] && day <= 구간[k][1]) {
        있 = true;
        break;
      }
    }
    if (!있) return false;
  }
  return true;
}
/* 모든 계좌가 덮기 시작하는 날 — 이 앞은 「자료가 시작되기 전」이다 */
function coverStart(cover) {
  var 늦 = null;
  for (var a = 0; a < cover.length; a++) {
    var 구간 = cover[a],
      이른 = null;
    for (var k = 0; k < 구간.length; k++) {
      if (이른 === null || 구간[k][0] < 이른) 이른 = 구간[k][0];
    }
    if (이른 === null) return null;
    if (늦 === null || 이른 > 늦) 늦 = 이른;
  }
  return 늦;
}
/* 아직 안 정한 출금을 날짜별로 모아 둔다 — 표를 한 번만 만들고 t 와 함께 사라진다.
   ★ 조건 ④⑤⑥ 을 여기서 건다. 기존 기준을 그대로 쓴다 —
     catOf 의 UNSET · 출금(금액 0원 초과) · xferOn 으로 빠지는 계좌 간 이체.
   ★ 미정 입금은 담지 않는다. 입금으로 출금을 상계하지 않는다 (요청서 ②).
   ★ 조건 ① 은 따로 거르지 않는다 — dueTable 이 UP.rows 전체를 쓰므로
     예측이 선 계좌 집합과 여기 담기는 거래의 계좌 집합이 같다.
     계좌 집합이 갈리는 자료에서는 dueCard 가 dueUnknownAccs 로 이미 카드를 안 낸다 */
function dueUnknownOutIn(U, t) {
  if (t.__unkOut) return t.__unkOut;
  var m = {};
  (U.rows || []).forEach(function (r) {
    if (!(r.amount < 0)) return; /* ⑤ 출금만 · 0원은 안 센다 */
    if (xferOnIn(U, r)) return; /* ⑥ 빼기로 정한 계좌 간 이체 */
    if (catOfIn(U, r) !== UNSET) return; /* ④ 아직 안 정한 거래만 */
    var d = dayNum(r.at.slice(0, 10));
    (m[d] || (m[d] = [])).push({
      rid: rowId(r),
      날: d,
      at: r.at.slice(0, 10),
      액: -r.amount,
      이름: keyOfIn(U, r)
    });
  });
  t.__unkOut = m;
  return m;
}
/* 고르신 종료일까지의 예측에 실제로 쓰인 비교 날짜에서 미정 출금을 찾는다.
   ★ 비교 날짜를 따로 추정하지 않는다. dueDaily 가 채택한 날을 그대로 받는다 (③).
   ★ 종료일 밖에서만 쓰이는 표본은 세지 않는다 — 남은날수까지만 본다.
   ★ 자료 기준일 이후 거래는 애초에 채택되지 않는다 (dueDaily 의 「과거날 > 마지막」) — ②.
   ★ 같은 원본 거래가 여러 표본에 쓰여도 한 번만 센다 (rid 로 가린다).
   ★ 비율이나 금액 문턱을 두지 않는다. 한 건이면 한 건이다 */
function dueHoldIn(U, t, i, 남은날수, dd) {
  if (!dd) dd = dueDailyIn(U, t, i, true);
  if (!dd || !dd.채택) return null;
  var 표 = dueUnknownOutIn(U, t),
    본 = {},
    목록 = [],
    합 = 0,
    x,
    k,
    q;
  var 끝 = Math.min(남은날수, dd.한계);
  for (x = 0; x < 끝; x++) {
    var 날들 = dd.채택[x];
    if (!날들) continue;
    for (k = 0; k < 날들.length; k++) {
      var 줄 = 표[날들[k]];
      if (!줄) continue;
      for (q = 0; q < 줄.length; q++) {
        if (본[줄[q].rid]) continue;
        본[줄[q].rid] = 1;
        목록.push(줄[q]);
        합 += 줄[q].액;
      }
    }
  }
  if (!목록.length) return null;
  목록.sort(function (a, b) {
    return a.날 - b.날;
  });
  return { 건수: 목록.length, 합: 합, 목록: 목록, 기준해: t.days[i].slice(0, 4) };
}
/* 날수 → 'YYYY-MM-DD'. dueProject 가 쓰던 셈과 같다 */
function 날짜값(n) {
  return new Date(n * 86400000).toISOString().slice(0, 10);
}
/* ★ 116차 ④. 날짜 → 그날 사업 지출의 거래처별 줄.
   dueTable 이 걸러낸 그 줄들이다 — 여기서 새로 거르지 않는다 */
function dueCostBy(t) {
  if (t.__costBy) return t.__costBy;
  var m = {},
    L = t.지출줄 || [],
    i;
  for (i = 0; i < L.length; i++) (m[L[i].날] || (m[L[i].날] = [])).push(L[i]);
  t.__costBy = m;
  return m;
}
/* ★ 116차 ④. 미래 날짜 한 자리의 거래처별 기여분.
   ★ 분모는 그 날짜의 실제 표본 수(셈[x])다. 그 거래처가 등장한 달 수로 나누지 않는다 —
     그래서 거래처별 기여분을 다 더하면 몫[x]/셈[x] 와 같은 값이 된다.
   ★ 여기서 원 단위로 반올림하지 않는다. 반올림은 맨 끝에서 한 번만 한다 */
function duePayeeDaily(dd, x) {
  var out = {},
    줄 = dd.조각 && dd.조각[x],
    q;
  if (!줄 || !dd.셈[x]) return out;
  for (q = 0; q < 줄.length; q++) out[줄[q].p] = (out[줄[q].p] || 0) + 줄[q].v / dd.셈[x];
  return out;
}
/* ★ 116차 ⑤. 고르신 거래처의 「반영된 내역」.
   한 과거 거래가 여러 미래 날짜에 대응하면 별개 연결로 둔다 — 합치지 않는다.
   ① 원본 거래 식별자 ② 대응하는 미래 날짜 ③ 거래처 식별값 ④ 그 날짜에 기여한 금액 */
function duePlanRows(dd, t0, p, lo, hi) {
  var out = [],
    x,
    q;
  for (x = 0; x < dd.한계; x++) {
    var 날 = t0 + 1 + x;
    if (날 < lo || 날 > hi) continue;
    var 줄 = dd.조각 && dd.조각[x];
    if (!줄 || !dd.셈[x]) continue;
    for (q = 0; q < 줄.length; q++) {
      if (줄[q].p !== p) continue;
      out.push({ rid: 줄[q].rid, 거래처: p, 과거: 줄[q].날, 미래: 날, 액: 줄[q].v / dd.셈[x] });
    }
  }
  return out;
}
/* ── 116차 ⑫ · 계획을 세울 때 본 「예측 입력」의 지문 ──────────────────
   기준일·날짜별 표본 수·거래처별 기여 총합이 같으면 같은 값이 나온다.
   ★ 같은 파일을 다시 열거나 같은 내용을 겹쳐 올려 예측 입력이 실질적으로 같으면
     재확인을 여쭙지 않는다.
   ★ 거래처 이름과 금액을 그대로 남기지 않는다. 섞어 만든 수 하나만 남긴다 */
function dueSig(t, i, dd) {
  if (!dd || !dd.한계) return '';
  var s = t.days[i] + '#' + dd.한계 + '#' + dd.셈.slice(0, dd.한계).join(',') + '#';
  var 합 = {},
    x,
    p,
    ks;
  for (x = 0; x < dd.한계; x++) {
    var m = duePayeeDaily(dd, x);
    for (p in m) if (Object.prototype.hasOwnProperty.call(m, p)) 합[p] = (합[p] || 0) + m[p];
  }
  ks = Object.keys(합).sort();
  for (x = 0; x < ks.length; x++) s += ks[x] + '=' + Math.round(합[ks[x]]) + ';';
  var h = 5381;
  for (x = 0; x < s.length; x++) h = ((h * 33) ^ s.charCodeAt(x)) >>> 0;
  /* ★ 118차 ③. 예측 모델이 바뀌어 판 번호를 올린다 (v1 → v2). 옛 지문과 섞이지 않는다 */
  return 'v' + DUE_MODEL + '-' + h.toString(36) + '-' + s.length.toString(36);
}
/* ── 118차 ③ · 예측 모델 번호 ─────────────────────────────────────
   1 = 116·117차 (사업 지출만) · 2 = 118차 (계좌 밖으로 나간 분류된 출금 전부).
   ★ 계획에 이 번호를 같이 적는다. 번호가 다른 계획은 지우지 않고 적용보류로 둔다 —
     예전에 사업 외 출금을 「추가」로 넣으셨다면 이제 기본 예상에도 들어 있어 두 번 빠질 수 있다.
   ★ 확인하고 다시 반영하시면 새 번호로 저장된다. 그래서 다시 들어와도 또 보류되지 않는다 */
var DUE_MODEL = 2;
/* ★ 118차 ①. 앞 N일 예상 출금을 갈래(사업·사업 외)와 항목별로 가른다.
   기본 화면에는 안 쓴다 — 계산 근거를 확인하는 자리다. 합은 몫/셈 합과 같다 */
function dueCostSplit(dd, N) {
  var out = { 갈래: {}, 항목: {} },
    x,
    q;
  for (x = 0; x < Math.min(N, dd.한계); x++) {
    var 줄 = dd.조각 && dd.조각[x];
    if (!줄 || !dd.셈[x]) continue;
    for (q = 0; q < 줄.length; q++) {
      var v = 줄[q].v / dd.셈[x],
        g = 줄[q].갈래 || '사업',
        k = 줄[q].항목 || '';
      out.갈래[g] = (out.갈래[g] || 0) + v;
      out.항목[k] = (out.항목[k] || 0) + v;
    }
  }
  return out;
}
/* ── 116차 ⑦ · 총액을 비중대로 나눈다 ───────────────────────────────
   ★ 나눈 뒤 날짜별 합이 입력 총액과 정확히 같아야 한다.
   ★ 먼저 내림하고 남은 원을 나머지가 큰 자리부터 하나씩 준다.
     나머지가 같으면 앞자리(이른 날짜)가 먼저다 — 돌릴 때마다 같은 답이 나오게 한다 */
function 몫나누기(총액, 비중) {
  var n = 비중.length,
    s = 0,
    i,
    out = [],
    rem = [],
    쓴 = 0;
  for (i = 0; i < n; i++) s += 비중[i];
  if (!(s > 0)) return null;
  for (i = 0; i < n; i++) {
    var v = (총액 * 비중[i]) / s,
      f = Math.floor(v);
    out.push(f);
    rem.push({ i: i, r: v - f });
    쓴 += f;
  }
  var 남 = 총액 - 쓴;
  rem.sort(function (a, b) {
    return b.r - a.r || a.i - b.i;
  });
  for (i = 0; i < 남; i++) out[rem[i].i]++;
  return out;
}
/* ── 116차 ⑪ · 저장통 ──────────────────────────────────────────────
     fc.picks.<매장>   거래처 분류        ← 내보내기에 들어간다
     fc.manual.<매장>  직접 적은 금액
     fc.banks.<매장>   계좌 부르는 이름
     fc.data.<매장>    거래내역 그 자체
     fc.plan.<매장>    예정 지출          ← 이번에 만든 다섯째 통
   ★ 열쇠는 storeKey 와 같은 매장 식별값을 쓴다 — 화면에 보이는 이름만으로
     따로 만들지 않는다. 이름을 고치면 renameStore 가 같이 옮긴다.
   ★ 내보내기(pickPayload·exportPicks)에 안 들어간다. hasNumber 검사는
     fc.picks 의 것이고 한 글자도 안 건드린다 — 통이 아예 다른 길이다.
   ★ 이 통을 읽어 네트워크로 내보내는 코드는 없다. 서버 약속은 그대로다.
   ★ 원본 거래 전체를 여기에 복사하지 않는다 — 연결은 계산으로 다시 찾는다 */
/* 저장 이름 PLAN_KEY 은 00-storage.js 에 모았다 */
function planEmpty() {
  return { v: 1, items: [] };
}
function duePlanSig(box) {
  return box && box.items && box.items.length ? JSON.stringify(box.items) : '';
}
/* ── 116차 ⑤⑥ · 편집 화면이 보는 「기존 예상 지출」 ────────────────────
   계산 가능한 미래 범위 전체에서 거래처마다 얼마가 잡혀 있는지 모은다.
   ★ 과거 거래 줄은 여기 안 담는다 — [반영된 내역 보기]에서만 보여드린다 */
function duePlanBaseIn(U, t, i) {
  var dd = dueDailyIn(U, t, i, true),
    t0 = t.num[i];
  var 합 = {},
    첫 = {},
    끝 = {},
    날별 = {},
    x,
    p;
  for (x = 0; x < dd.한계; x++) {
    var m = duePayeeDaily(dd, x),
      날 = t0 + 1 + x;
    for (p in m)
      if (Object.prototype.hasOwnProperty.call(m, p)) {
        합[p] = (합[p] || 0) + m[p];
        if (첫[p] == null) 첫[p] = 날;
        끝[p] = 날;
        (날별[p] || (날별[p] = {}))[날] = m[p];
      }
  }
  var list = Object.keys(합).map(function (k) {
    return { 거래처: k, 총액: 합[k], 첫: 첫[k], 끝: 끝[k], 날별: 날별[k] };
  });
  list.sort(function (a, b) {
    return b.총액 - a.총액;
  });
  return { dd: dd, list: list, t0: t0, 시작: t0 + 1, 끝: t0 + dd.한계, 지문: dueSig(t, i, dd) };
}
/* 그 거래처의 적용 기간 안 기존 예상 합계와 날짜별 비중 */
function duePlanSpan(base, p, lo, hi) {
  var 것 = null,
    d;
  for (d = 0; d < base.list.length; d++)
    if (base.list[d].거래처 === p) {
      것 = base.list[d];
      break;
    }
  var 날별 = (것 && 것.날별) || {},
    날 = [],
    값 = [],
    합 = 0;
  for (d = lo; d <= hi; d++) {
    if (!날별[d]) continue;
    날.push(d);
    값.push(날별[d]);
    합 += 날별[d];
  }
  return { 날: 날, 값: 값, 합: 합 };
}
/* 같은 거래처에서 적용 기간이 겹치는 대체 계획이 이미 있는가 (⑥) */
function duePlanClash(box, p, lo, hi, 나) {
  var got = null;
  (box.items || []).forEach(function (pl) {
    if (got || pl.유형 !== '대체' || pl.거래처 !== p || pl.id === 나) return;
    if (dayNum(pl.시작) <= hi && dayNum(pl.종료) >= lo) got = pl;
  });
  return got;
}
/* 계획 하나가 지금 얼마를 넣는가 — 목록과 확인 화면이 같이 쓴다 */
function duePlanTotal(pl) {
  var s = 0;
  (pl.지급 || []).forEach(function (g) {
    s += g.액;
  });
  return s;
}
function dueDayIn(U) {
  var d = U && U.dueDay;
  return d >= 1 && d <= 31 ? d : DUE_DEFAULT;
}
/* ★ 103차 ③. 「매달 지출이 가장 많은 날」을 묻는데 고를 수 있는 것이 1~28 뿐이었다.
   말일에 정산이 몰리는 대표님은 정확히 답할 수가 없었다.
   ★ 「말일」은 31 로 저장한다. 새 저장 칸도 새 모양도 안 만든다 —
     nextDue 와 shiftMonth 가 이미 Math.min(day, last) 로 그 달 마지막 날까지만 간다.
     그래서 31 은 2월이면 28일(윤년 29일), 4월이면 30일이 된다.
     29·30 도 같은 규칙이다 — 그 달에 그 날이 없으면 그 달 마지막 날로 본다.
   ★ 단추만 늘리면 안 된다는 것이 이 자리의 요점이었다. 없는 날의 처리 규칙이
     이미 코드에 있었고(그 둘), 이제 그 규칙 위로 열어준 것이다 */
/* 날수 하나 → 「9월 23일」. 카드가 여러 군데서 쓴다 */
function 날짜글(n) {
  var d = new Date(n * 86400000);
  return d.getUTCMonth() + 1 + '월 ' + d.getUTCDate() + '일';
}
function dueDayShort(n) {
  return n === 31 ? '말일' : String(n);
}
function dueDayText(n) {
  return n === 31 ? '말일' : n + '일';
}
/* 그 날짜에서 「다음 달 며칠」 — 그 달에 없는 날짜면 그 달 마지막 날로 */
function nextDue(at, day) {
  var y = +at.slice(0, 4),
    m = +at.slice(5, 7);
  m += 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  var last = new Date(y, m, 0).getDate();
  return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + Math.min(day, last)).slice(-2);
}
/* 달을 밀어 옮긴 같은 날짜 (지난 3개월의 「같은 구간」을 잡을 때 쓴다) */
function shiftMonth(at, n) {
  var y = +at.slice(0, 4),
    m = +at.slice(5, 7) + n,
    d = +at.slice(8, 10);
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  var last = new Date(y, m, 0).getDate();
  return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + Math.min(d, last)).slice(-2);
}
/* ── 118차 ② · 날짜별 입금 ────────────────────────────────────────
   카드의 들어올 돈·곡선·그래프가 이 배열 하나를 쓴다. 따로 세면 또 어긋난다.
   ★ 균등(운영 기본값): 직전 30일 매출 평균을 매일 같은 금액으로 놓는다.
     기존 결과를 원 단위까지 그대로 지키려고 합계를 먼저 원 단위로 만든 뒤 날수로 나눈다
     (117차까지의 카드·곡선 셈과 같다).
   ★ 요일(비교용): 직전 30일 가운데 같은 요일 날들의 매출 입금 평균. 날마다 원 단위로 반올림한다.
     자료가 없는 날(dueCover 밖)은 0원으로 치지 않고 분모에서 뺀다.
     그 요일에 쓸 날이 하나도 없으면 균등 값으로 대신하고 대체요일에 적는다.
     기준일 뒤 자료는 안 쓴다. 종료일 길이에 맞춰 전체를 다시 늘리거나 줄이지 않는다.
   ★ 요일 방식이 더 낫다는 측정이 나오기 전까지 운영은 균등이다 */
var DUE_INFLOW = '균등';
function dueInflowIn(U, t, i, 남은날수) {
  var t0 = t.num[i],
    매출30 = 0,
    j,
    x;
  for (j = 0; j < t.n; j++) {
    if (t.num[j] <= t0 - 30) continue;
    if (t.num[j] > t0) break;
    매출30 += t.cs[j + 1] - t.cs[j];
  }
  var out = { 방식: DUE_INFLOW === '요일' ? '요일' : '균등', 일별: [], 합: 0, 대체요일: [] };
  if (out.방식 === '균등') {
    var 합 = Math.round((매출30 / 30) * 남은날수),
      하루 = 합 / 남은날수;
    for (x = 0; x < 남은날수; x++) out.일별.push(하루);
    out.합 = 합;
    return out;
  }
  var 날매출 = {},
    cover = dueCoverIn(U, t, t0),
    요합 = [],
    요수 = [],
    w;
  for (w = 0; w < 7; w++) {
    요합.push(0);
    요수.push(0);
  }
  for (j = 0; j < t.n; j++) {
    if (t.num[j] <= t0 - 30 || t.num[j] > t0) continue;
    날매출[t.num[j]] = t.cs[j + 1] - t.cs[j];
  }
  for (var d = t0 - 29; d <= t0; d++) {
    if (!coveredAll(cover, d)) continue; /* 자료 밖 날은 0원으로 안 센다 */
    w = (d + 4) % 7; /* 1970-01-01 은 목요일(4) */
    요합[w] += 날매출[d] || 0;
    요수[w]++;
  }
  for (x = 0; x < 남은날수; x++) {
    w = (t0 + 1 + x + 4) % 7;
    var v;
    if (요수[w]) v = 요합[w] / 요수[w];
    else {
      v = 매출30 / 30;
      if (out.대체요일.indexOf(w) < 0) out.대체요일.push(w);
    }
    v = Math.round(v);
    out.일별.push(v);
    out.합 += v;
  }
  return out;
}
/* ★ 58차 ⑦-1. 그 기간에 잔액이 하루치 지출보다 적어진 날이 있었는가.
   「0원 밑」은 통장에서 일어나지 않는 일이라 세어도 늘 0이었다 */
function dueHitBottom(t, t0, t1) {
  for (var j = 0; j < t.n; j++) {
    if (t.num[j] <= t0) continue;
    if (t.num[j] > t1) break;
    if (t.bal[j] !== null && t.bal[j] < t.daily[j]) return true;
  }
  return false;
}
/* ★ 102차. 계좌마다 마지막 거래일이 다르면, 제일 이른 쪽에 맞춘다.
   dueCard 는 「오늘」을 t.n-1(어느 계좌든 거래가 있었던 마지막 날)로 잡았다.
   계좌가 둘인데 A는 8월 22일까지, B는 7월 15일까지 올리셨다면 오늘이 8월 22일이 되고,
   B의 잔액은 7월 15일 것이 「지금 계좌 잔액」에 그대로 들어간다.
   그 사이 B에서 오간 돈은 화면에 아예 없다. 금액이 커질수록 위험한 자리다 —
   「지금 쓸 수 있는 돈」의 바닥이 되는 숫자다.
   ★ 「제일 늦은 날」이 아니라 「제일 이른 날」이다 — 모든 계좌가 그날까지는 사실이다.
   ★ balanceSum 은 한 줄도 안 건드린다. 그쪽은 계좌마다 그 시점까지의 마지막 잔액을
     따로 잡아 더하는 자리고(36차 4단계) 월별 결과와 검산이 거기 걸려 있다.
     이번에 바꾸는 것은 dueCard 가 서는 자리 하나뿐이다 */
function commonAsOfIn(U, t) {
  var n = accCountIn(U);
  if (n <= 1) return t.n - 1;
  var last = [],
    a; /* 계좌마다 마지막 거래일(dayNum) */
  for (a = 0; a < n; a++) last[a] = null;
  U.rows.forEach(function (r) {
    var d = dayNum(r.at.slice(0, 10)),
      i = accOf(r);
    if (last[i] === null || d > last[i]) last[i] = d;
  });
  var 공통 = null;
  for (a = 0; a < n; a++) {
    if (last[a] === null) continue; /* 거래가 한 건도 없는 계좌는 안 센다 */
    if (공통 === null || last[a] < 공통) 공통 = last[a];
  }
  if (공통 === null) return t.n - 1;
  /* 그 날 이하인 표의 마지막 자리를 찾는다 */
  for (var i = t.n - 1; i >= 0; i--) if (t.num[i] <= 공통) return i;
  return 0;
}
/* ★ 102차 추가 ③. 공통 기준일의 잔액을 복원할 수 없는 계좌를 찾는다.
   ★ 0원으로 넣지 않는다 — 없는 잔액을 0원이라고 하면 거짓이다.
   ★ 조용히 빼고 계산하지도 않는다 — 그 계좌의 입출금은 매출·지출 표본에 그대로
     들어가 있어서, 잔액만 빼면 계산 대상이 어긋난다. 그래서 예측 카드를 아예 안 낸다.
   ★ 까닭을 단정하지 않는다. 「기준일 뒤에 연 계좌」일 수도 있고, 파일에 앞 기간이
     안 담겼거나 잔액 칸이 없는 파일일 수도 있다.
     확인한 것은 「그 기준일의 잔액을 복원할 수 없다」 하나뿐이다.
   ★ 잔액·입금 평균·출금 표본을 같은 계좌 집합으로 맞추는 것이 더 정확하지만
     dueTable 에 계좌 필터를 새로 넣어야 한다. 회차를 따로 잡는다.
   ★ 안 나오는 것은 예측 카드 하나뿐이다.
     월별 화면·계좌 순이익·검산·일별 흐름·계좌 잔액 그래프는 그대로 나온다.
   ★ 세는 방법은 dueTable 의 닫기() 와 같다 — 그날까지 잔액이 한 번이라도 찍혔는가 */
/* 「2026-07-15」 → 「2026년 7월」. 0 을 안 붙인다 */
function 달글(at) {
  return +at.slice(0, 4) + '년 ' + +at.slice(5, 7) + '월';
}
/* ── 116차 ⑤ · 예정 지출 편집 화면 ────────────────────────────────
   ★ 카드 안에 또 다른 접힘을 만들지 않는다. 이건 새 화면이다.
     그래서 카드를 다시 그리지 않고, 닫아도 분석 종료일과 카드 펼침 상태가 그대로다.
   ★ 폰은 전체 화면, PC 는 대화상자 — 114차 그래프 화면의 틀(.fcback/.fcpane)을
     그대로 쓴다. 새 모양을 만들지 않는다 (49차).
   ★ 첫 화면에는 셋만 둔다. 과거 거래 내역은 [반영된 내역 보기]에서만 보인다 —
     대표님이 수백 건을 직접 고르는 것을 필수 절차로 만들지 않는다.
   ★ 편집 중인 값은 [변경 반영] 전까지 계산에 적용하지 않는다 */
function 돈읽기(s) {
  var raw = String(s == null ? '' : s).trim();
  if (!raw) return null; /* 빈 입력을 0원으로 치지 않는다 */
  var v = raw.replace(/[^0-9]/g, '');
  if (!v.length) return null;
  return +v;
}
/* 이름이 비슷한 기존 예상 거래처를 찾는다 — 자동으로 병합하지 않는다.
   찾았다고 같은 거래처라고 단정하지도 않는다. 고르시게만 한다 (⑨) */
function 닮은거래처(base, 이름) {
  var a = String(이름 || '')
    .replace(/\s+/g, '')
    .toLowerCase();
  if (!a) return [];
  return base.list
    .filter(function (x) {
      var b = String(x.거래처).replace(/\s+/g, '').toLowerCase();
      return (
        b === a || (a.length >= 2 && b.indexOf(a) >= 0) || (b.length >= 2 && a.indexOf(b) >= 0)
      );
    })
    .slice(0, 5);
}
