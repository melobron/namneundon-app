/* ── core · 예상 잔액의 계산 부품 ─────────────────────────────────
   리팩토링 B-1f-1 (2026-09-26): 16-due.js 에서 매장 자료(UP)를 읽기만 하는 계산을 옮겼다.
   일별 예상 지출(dueDailyIn) · 입금(dueInflowIn) · 자료 범위(dueCoverIn) · 미정 출금 · 목표일 · 예정 지출 셈.
   리팩토링 B-1f-2 (2026-09-26): 잔액 표 만들기(dueTableBuildIn) · 예측(dueProjectIn) · 카드 · 곡선 · 그래프도 옮겼다.
   ★ 캐시·저장소는 앱에 둔다. 이 계산들은 창구 E(= 16-due.js 의 DUE_ENV)를 받아
     E.table() · E.plan() · E.planAt() 를 원래 부르던 자리에서 그대로 부른다 (호출 시점·횟수 그대로).
     앱: dueTable()(UP.__due 캐시) · planBox()/planAt()(저장소) · 화면 그리기는 16-due.js.
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
/* ★ NAM-9 (2026-09-29 요한). 예상 기간을 대표님께 묻지 않는다 — 늘 다음 달 말일까지다.
   「다음 달」은 자료 기준일(모든 계좌가 자료를 가진 마지막 날, commonAsOf)이 속한 달의 다음 달이다.
   오늘 날짜·파일을 고른 날·다시 연 날로 기간을 늘리지 않는다.
   ★ 새 계산을 만들지 않는다. 예전에 고를 수 있던 「말일」(31)을 늘 쓰는 것이다 —
     nextDue 가 그 달에 없는 날을 그 달 마지막 날로 옮긴다 (28·29·30·31일).
   ★ DUE_DEFAULT(옛 기본값 10일)는 테스트의 숫자 모음(collectNumbers)이 예전 기준과
     견주는 데만 쓴다. 화면의 기간은 DUE_END_DAY 다 */
var DUE_DEFAULT = 10;
var DUE_END_DAY = 31;
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
/* ── NAM-9 후속 (2026-09-29 요한) · 포함된 계좌 사이 이체 후보 ────────────────
   ★ 새로 추정하지 않는다. 결과 화면의 「계좌끼리 옮긴 것으로 보이는 거래」 카드가 쓰는
     findTransfersIn 을 그대로 쓴다 — 계좌가 둘 이상일 때, 한 계좌 출금과 다른 계좌 입금이
     같은 금액·하루 안쪽이면 후보다. 계좌가 하나면 후보가 없다.
   ★ 대표님이 「맞습니다」를 누른 것(xferOn)은 후보가 아니라 확인된 이체다 — 여기 안 담는다.
   ★ 출금 쪽만 담는다. 예측 입금은 매출만 세므로 입금 쪽은 예측에 들어갈 일이 없다 */
function dueXferCandIn(U) {
  var m = {};
  findTransfersIn(U).forEach(function (p) {
    /* ★ NAM-9 요한 승인. 「계좌끼리 옮긴 돈이 아닙니다」로 답한 쌍은 후보가 아니다 — 일반 거래로 센다 */
    if (!xferOnIn(U, p.out) && !xferNoIn(U, p)) m[rowId(p.out)] = 1;
  });
  return m;
}
/* 아직 안 정한 출금을 날짜별로 모아 둔다 — 표를 한 번만 만들고 t 와 함께 사라진다.
   ★ NAM-9 후속. 둘로 가른다.
     보류(t.__unkOut) = 포함된 계좌 사이 이체 후보(확인 전) — 요한 승인으로 분류된 후보도 여기다.
       합친 잔액에서 이것을 나간 돈으로 치면 계좌 안에서 옮긴 돈이 밖으로 나간 것처럼 두 번 빠지고,
       빼 버리면 확인 안 된 이체를 근거 없이 빼는 것이 된다. 그래서 넣지도 빼지도 않고 보류한다.
     포함(t.__unkIn) = 그 밖의 아직 안 정한 출금. 계좌에서 실제로 나간 돈이라 잔액 예측용 출금에 넣는다
       (dueTableBuildIn). 사업 지출·매출에는 안 넣는다 — 월별 손익은 그대로다.
   ★ 조건은 기존 그대로다 — catOf 의 UNSET · 출금(금액 0원 초과) · xferOn 으로 빠지는 이체는 제외.
   ★ 미정 입금은 담지 않는다. 입금으로 출금을 상계하지 않는다 (요청서 ②).
   ★ 조건 ① 은 따로 거르지 않는다 — dueTable 이 UP.rows 전체를 쓰므로
     예측이 선 계좌 집합과 여기 담기는 거래의 계좌 집합이 같다.
     계좌 집합이 갈리는 자료에서는 dueCard 가 dueUnknownAccs 로 이미 카드를 안 낸다 */
function dueUnsetOutSplitIn(U, t) {
  if (t.__unkOut) return;
  var 보류 = {},
    포함 = {},
    후보 = dueXferCandIn(U);
  (U.rows || []).forEach(function (r) {
    if (!(r.amount < 0)) return; /* ⑤ 출금만 · 0원은 안 센다 */
    if (xferOnIn(U, r)) return; /* ⑥ 빼기로 정한 계좌 간 이체 */
    /* ★ NAM-9 요한 승인 (2026-09-29). 확인 전 이체 후보는 분류와 상관없이 보류로 간다.
       분류된 후보도 합친 잔액에서는 두 번 빠질 수 있다. 그 밖에는 아직 안 정한 출금만 담는다 */
    var 후보인가 = !!후보[rowId(r)];
    if (!후보인가 && catOfIn(U, r) !== UNSET) return; /* ④ 아직 안 정한 거래만 */
    var d = dayNum(r.at.slice(0, 10)),
      m = 후보인가 ? 보류 : 포함;
    (m[d] || (m[d] = [])).push({
      rid: rowId(r),
      날: d,
      at: r.at.slice(0, 10),
      액: -r.amount,
      이름: keyOfIn(U, r)
    });
  });
  t.__unkOut = 보류;
  t.__unkIn = 포함;
}
function dueUnknownOutIn(U, t) {
  dueUnsetOutSplitIn(U, t);
  return t.__unkOut;
}
function dueUnsetInIn(U, t) {
  dueUnsetOutSplitIn(U, t);
  return t.__unkIn;
}
/* 고르신 종료일까지의 예측에 실제로 쓰인 비교 날짜에서 미정 출금을 찾는다.
   ★ 비교 날짜를 따로 추정하지 않는다. dueDaily 가 채택한 날을 그대로 받는다 (③).
   ★ 종료일 밖에서만 쓰이는 표본은 세지 않는다 — 남은날수까지만 본다.
   ★ 자료 기준일 이후 거래는 애초에 채택되지 않는다 (dueDaily 의 「과거날 > 마지막」) — ②.
   ★ 같은 원본 거래가 여러 표본에 쓰여도 한 번만 센다 (rid 로 가린다).
   ★ 비율이나 금액 문턱을 두지 않는다. 한 건이면 한 건이다 */
function dueHoldIn(U, t, i, 남은날수, dd) {
  return dueUsedIn(U, t, i, 남은날수, dd, dueUnknownOutIn(U, t));
}
/* ★ NAM-9 후속. 예측에 실제로 쓰인 비교 날짜에 들어간 미분류 출금 — 카드에 건수를 알린다.
   보류와 같은 고리(dueUsedIn)로 센다. 따로 추정하지 않는다 */
function dueUnsetUsedIn(U, t, i, 남은날수, dd) {
  return dueUsedIn(U, t, i, 남은날수, dd, dueUnsetInIn(U, t));
}
function dueUsedIn(U, t, i, 남은날수, dd, 표) {
  if (!dd) dd = dueDailyIn(U, t, i, true);
  if (!dd || !dd.채택) return null;
  var 본 = {},
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
/* ★ NAM-9. 저장통에 예전에 고르신 목표일(U.dueDay)이 있어도 기간에는 안 쓴다.
   값은 지우지 않는다 — 저장 형식을 바꾸지 않으려는 것이다 */
function dueDayIn(U) {
  return DUE_END_DAY;
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

/* ── (원래 16-due.js) ── */
var DUE_NEAR = 20; /* 지금과 가장 가까웠던 과거 이만큼을 센다 */
var DUE_WARMUP = 60; /* 첫 거래일부터 이만큼은 안 센다 — 개업 자본금이 섞인다 */
var DUE_DAILY = 60; /* 하루치 지출을 이만큼의 평균으로 본다 */
/* ── 116차 ②③ · 예정 지출을 반영한 공통 일별 결과 ──────────────────────
   ★ 카드 합계·곡선·최저점·그래프가 이 결과 하나를 쓴다.
     각 화면에서 금액을 따로 보정하지 않는다.
   ★ 수정 예상 지출 = 기본 예상 지출 − 연결된 기존 예상분 + 입력한 예정 지출.
   ★ 예정 지출이 없으면 기본 결과와 한 원도 다르지 않다 (완료 기준 ①).
   ★ 계획은 자료 기준일 자리에서만 적용한다. duePast 의 과거 되짚기는
     앞일의 계획과 상관이 없다 — 섞으면 기준판의 비율이 움직인다 */
function dueDailyUseCalcIn(U, E, t, i) {
  var box = E.plan(),
    있음 = !!(box.items && box.items.length);
  var 기준 = false;
  if (있음) {
    if (t.__asof == null) {
      try {
        t.__asof = commonAsOfIn(U, t);
      } catch (e) {
        t.__asof = -1;
      }
    }
    기준 = i === t.__asof;
  }
  var dd = dueDailyIn(U, t, i, 기준),
    일별 = [],
    x;
  for (x = 0; x < dd.한계; x++) 일별.push(dd.몫[x] / dd.셈[x]);
  /* ★ 116차 통합. 「적용보류」는 예정 지출 하나를 재확인까지 빼 두는 것이다.
     카드의 c.보류(미정 출금 때문에 예상 잔액 전체를 안 보여줌)와 다른 것이라 이름을 가른다.
     적용보류는 예상 잔액을 숨기지 않고, c.보류는 여기서 풀리지 않는다 */
  var out = {
    일별: 일별,
    dd: dd,
    한계: dd.한계,
    계획: 0,
    적용보류: 0,
    적용보류목록: [],
    적용목록: [],
    지문: ''
  };
  if (!기준) return out;
  var 지문 = dueSig(t, i, dd),
    t0 = t.num[i];
  out.지문 = 지문;
  box.items.forEach(function (pl) {
    out.계획++;
    /* ★ ⑫ 계획을 세울 때 본 예측 입력과 지금 것이 다르면 적용을 보류한다.
       계획은 그대로 둔다 — 대체 계획은 기본 예상으로 돌아가고,
       추가 계획은 추가 차감을 멈춘다. 대표님이 확인하신 뒤에 다시 반영한다 */
    /* ★ 118차 ③. 모델 번호가 다른(예전에 저장한) 계획도 같은 적용보류로 둔다 */
    if ((pl.모델 || 1) !== DUE_MODEL || pl.자료 !== 지문) {
      out.적용보류++;
      out.적용보류목록.push(pl);
      return;
    }
    out.적용목록.push(pl);
    if (pl.유형 === '대체') {
      var lo = dayNum(pl.시작),
        hi = dayNum(pl.종료);
      for (x = 0; x < dd.한계; x++) {
        var 날 = t0 + 1 + x;
        if (날 < lo || 날 > hi) continue;
        var m = duePayeeDaily(dd, x);
        if (m[pl.거래처]) 일별[x] -= m[pl.거래처];
      }
    }
    /* ★ ⑧ 지급 일정은 등록할 때 날짜별로 고정해 둔다.
       분석 종료일을 바꿔도 배분이나 연결을 다시 정하지 않는다 */
    (pl.지급 || []).forEach(function (g) {
      var xx = dayNum(g.날) - t0 - 1;
      if (xx >= 0 && xx < dd.한계) 일별[xx] += g.액;
    });
  });
  return out;
}
/* ★ 116차 통합. 캐시가 무엇에 기대는지 적어 둔다.
   ① 이 결과는 표(t) 위에 얹혀 있어 표가 새로 만들어지면 같이 사라진다.
     거래 분류·이체 판정·거래내역·계좌 구성·자료 기준일이 바뀌면 표를 다시 만든다
     (dueFresh 가 입력 지문을 보고 비운다. 분류를 바꾸는 길이 여럿이라 한 자리에서 본다).
   ② 같은 표 위에서는 자리(i)·매장·계획 내용이 같을 때만 다시 쓴다.
   ③ 자리마다 따로 둔다. duePast 가 여러 자리를 돌아도 기준일 결과를 다시 세지 않는다 */
function dueDailyUseIn(U, E, t, i) {
  var sig = E.planAt() + '|' + duePlanSig(E.plan());
  var m = t.__use || (t.__use = {});
  if (m[i] && m[i].sig === sig) return m[i].val;
  var val = dueDailyUseCalcIn(U, E, t, i);
  m[i] = { sig: sig, val: val };
  return val;
}
/* ★ 116차 통합. 예측 표에 들어가는 입력의 지문.
   거래 줄 · 그 줄의 분류 · 이체로 빼는지 · 계산 밖 항목인지 · 계좌별 조회 기간 · 매장.
   ★ 거래 이름과 금액을 남기지 않는다. 섞어 만든 수 하나만 이 화면 안에 둔다 */
function dueInputSigIn(U, E) {
  if (!U) return '';
  var h = 5381,
    n = 0;
  function 섞기(s) {
    s = String(s);
    for (var k = 0; k < s.length; k++) h = ((h * 33) ^ s.charCodeAt(k)) >>> 0;
    n += s.length;
  }
  섞기(E.planAt() + '#' + accCountIn(U) + '#' + baseNameIn(U, '매출') + '#');
  /* ★ NAM-9. 「이체 아님」 판단이 바뀌면 후보가 바뀌어 예측 재료가 달라진다 */
  섞기(
    Object.keys(U.xferNo || {})
      .sort()
      .join('\n') + '#'
  );
  (U.banks || []).forEach(function (b) {
    var r = b && b.range;
    섞기(r && r.ok && r.asked ? r.asked.from + '~' + r.asked.to + ';' : '-;');
  });
  (U.rows || []).forEach(function (r) {
    var c = catOfIn(U, r);
    섞기(
      rowId(r) +
        '|' +
        keyOfIn(U, r) +
        '|' +
        c +
        '|' +
        (xferOnIn(U, r) ? 1 : 0) +
        (c !== UNSET && isKeepIn(U, c) ? 1 : 0) +
        '\n'
    );
  });
  return h.toString(36) + '-' + n.toString(36);
}
function dueTableBuildIn(U) {
  var rows = (U.rows || []).slice().sort(function (a, b) {
    return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
  });
  if (!rows.length) return null;
  var n = accCountIn(U),
    last = [],
    i;
  for (i = 0; i < n; i++) last[i] = null;
  var 매출 = baseNameIn(U, '매출');
  var days = [],
    bal = [],
    sale = [],
    cost = [],
    fcost = [];
  var cur = null,
    dSale = 0,
    dCost = 0,
    dFc = 0;
  /* ★ 116차 ④. 거래처별 기여분의 재료를 같은 고리에서 모은다 —
     아래 걸러내기(이체·미정·매출)를 그대로 지난 줄만 담긴다.
     새 잣대를 만들지 않는다 — 합계는 예측용 출금(dFc)과 같은 줄에서 나온다 (118차) */
  var 지출줄 = [];
  var 후보 = dueXferCandIn(U);
  function 닫기() {
    if (cur === null) return;
    var s = 0,
      any = false;
    for (i = 0; i < n; i++)
      if (last[i] !== null) {
        s += last[i];
        any = true;
      }
    days.push(cur);
    bal.push(any ? s : null);
    sale.push(dSale);
    cost.push(dCost);
    fcost.push(dFc);
  }
  rows.forEach(function (r) {
    var day = r.at.slice(0, 10);
    if (cur !== day) {
      닫기();
      cur = day;
      dSale = 0;
      dCost = 0;
      dFc = 0;
    }
    last[accOf(r)] = r.balance;
    var c = catOfIn(U, r);
    if (xferOnIn(U, r)) return;
    if (c === UNSET) {
      /* ★ NAM-9 후속 (2026-09-29 요한). 아직 안 정한 출금도 잔액 예측용 출금(dFc)에 넣는다 —
         분류와 상관없이 계좌에서 실제로 나간 돈이다. 사업 지출(dCost)·매출에는 안 넣는다.
         ★ 포함된 계좌 사이 이체 후보(확인 전)는 넣지 않고 보류 규칙이 맡는다 (dueUnsetOutSplitIn).
         ★ 아직 안 정한 입금은 여기서도 예측 입금에 안 넣는다 — 예측 입금은 「매출」로 정한 거래만 센다 */
      if (r.amount < 0 && !후보[rowId(r)]) {
        dFc += -r.amount;
        지출줄.push({
          날: dayNum(day),
          p: keyOfIn(U, r),
          rid: rowId(r),
          v: -r.amount,
          갈래: '미분류',
          항목: c
        });
      }
      return;
    }
    if (c === 매출) {
      dSale += r.amount;
      return;
    }
    /* ★ 118차 ①. 잔액 예측용 출금 — 계좌 밖으로 실제 나간, 분류된 출금 전부.
       사업 지출만이 아니라 사업 외 용도·대표 인출·계산 밖(KEEP) 항목으로 정한 출금,
       자동으로 넘긴 작은 출금도 넣는다. 잔액은 그 돈이 나가도 줄기 때문이다.
       ★ 빼는 것 — 확인된 계좌 간 이체(xferOn).
         ★ NAM-9 후속. 아직 안 정한 출금(UNSET)은 위에서 따로 넣는다. 확인 전 이체 후보만 보류 규칙(dueHold)이 맡는다.
       ★ 방향은 실제 금액 부호로만 가른다. 항목 이름(「대출」 등)으로 입금이라 여기지 않는다.
       ★ 매출로 정한 출금(취소·환불)은 예전처럼 매출 쪽에서 빠진다. 여기서 두 번 세지 않는다.
       ★ 월별 사업 수입·지출·계좌 순이익의 정의는 안 바뀐다 — 그쪽은 cost(cc)다.
       ★ 갈래·항목을 줄마다 적어 두어 분류별 기여분을 가를 수 있게 한다 (dueCostSplit) */
    /* ★ NAM-9 요한 승인. 확인 전 이체 후보는 분류됐어도 예측 출금에 안 넣는다 — 보류 규칙이 맡는다.
       사업 지출(dCost)·월별 손익은 그대로다 */
    if (r.amount < 0 && !후보[rowId(r)]) {
      dFc += -r.amount;
      지출줄.push({
        날: dayNum(day),
        p: keyOfIn(U, r),
        rid: rowId(r),
        v: -r.amount,
        갈래: isKeepIn(U, c) ? '사업 외' : '사업',
        항목: c
      });
    }
    if (isKeepIn(U, c)) return;
    if (r.amount < 0) dCost += -r.amount; /* 사업 지출만 (월별·하루치 잣대) */
  });
  닫기();
  var num = days.map(dayNum);
  var cs = [0],
    cc = [0],
    fc = [0];
  for (i = 0; i < days.length; i++) {
    cs.push(cs[i] + sale[i]);
    cc.push(cc[i] + cost[i]);
    fc.push(fc[i] + fcost[i]);
  }
  /* 하루치 지출 — 그날 직전 60일 사업 지출 ÷ 60. 「바닥났다」의 잣대다 (⑦-1) */
  var daily = [],
    a = 0;
  for (i = 0; i < days.length; i++) {
    while (a < i && num[a] <= num[i] - DUE_DAILY) a++;
    daily.push((cc[i + 1] - cc[a]) / DUE_DAILY);
  }
  var t = {
    days: days,
    num: num,
    bal: bal,
    cs: cs,
    cc: cc,
    fc: fc,
    daily: daily,
    지출줄: 지출줄,
    n: days.length
  };
  return t;
}
/* 그날에 서서 목표일까지를 내다본 뺄셈 하나 */
function dueProjectIn(U, E, t, i, day) {
  var 오늘 = t.days[i],
    목표 = nextDue(오늘, day);
  var t0 = t.num[i],
    t1 = dayNum(목표);
  var 남은날수 = t1 - t0;
  if (남은날수 <= 0) return null;
  /* ★ 104차 정정 ㉰. 비교할 과거 표본이 아예 없는 날부터는 계산하지 않는다.
     그 자리가 곧 분석 종료일이 된다 — 화면의 「분석 종료일」 줄도 이 날짜를 쓴다.
     「그 뒤에는 지출이 없다」는 뜻이 아니라 「여기까지가 말할 수 있는 데까지」다 */
  /* ★ 116차 ②. 예정 지출을 반영한 공통 일별 결과 하나를 받는다.
     계획이 없으면 몫[j]/셈[j] 와 한 원도 다르지 않다 (완료 기준 ①) */
  var use = dueDailyUseIn(U, E, t, i),
    dd = use.dd;
  if (!dd.한계) return null;
  var 잘림 = null;
  if (남은날수 > dd.한계) {
    /* ★ 105차 ③. 계산 못 한 데까지 계산한 척하지 않는다.
       종료일을 여기로 당기고, 「어디까지 계산했는지」를 화면에 그대로 적는다 */
    잘림 = 목표;
    남은날수 = dd.한계;
    t1 = t0 + 남은날수;
    목표 = new Date(t1 * 86400000).toISOString().slice(0, 10);
  }
  /* 들어올 돈 — 직전 30일 매출 기준. 전체 입금이 아니라 매출만이다.
     ★ 118차 ②. 날짜별 입금 배열의 합이다. 곡선·그래프가 같은 배열을 쓴다 (dueInflow).
       대출·대표 입금은 앞으로 다시 들어올 돈으로 치지 않는다 — 매출만 본다 */
  var 입금 = dueInflowIn(U, t, i, 남은날수),
    j;
  var 들어올 = 입금.합;
  /* 나갈 돈 — 지난 3개월 같은 자리 날의 실제 사업 지출 평균.
     ★ 오늘부터 목표일까지 전부다. 「다음 달 1~10일만」이 아니다 —
       이번 달 남은 날에 나갈 돈도 잔액을 깎는다.
     ★ 매출은 매일 들어오니 30일 평균이 맞지만, 지출은 월세·급여·보험이
       한 달에 한 번 몰려 나간다. 30일 평균으로 밀면 월초 덩어리가 뭉개진다.
     ★ 104차 ①. 날짜별 몫을 먼저 구하고 남은 날수만큼 잘라 더한다.
       예전에는 구간의 끝을 목표일에 맞췄다 — 그래서 목표일을 하루 늘리면
       과거 구간까지 같이 늘어나 옛 종료일의 값이 움직였다.
       이제 대응은 기준일 하나로 정해지고, 목표일은 어디까지 자를지만 정한다.
       곡선(dueCurve)도 같은 dueDaily 를 잘라 쓰므로 Σ출 = 나갈 이 저절로 선다.
     ★ 104차 정정 ㉱. 분모가 날마다 다르다. 몫[j]/셈[j] 를 더한다 —
       나중 날은 비교할 과거가 둘뿐일 수 있고, 그때 셋으로 나누면 그만큼 적게 나온다.
       가장 적은 표본 수(셈최소)는 화면에 그대로 적는다 (㉲) */
  var 합 = 0,
    셈최소 = dd.셈[0],
    줄자리 = -1;
  for (j = 0; j < 남은날수; j++) {
    합 += use.일별[j];
    if (dd.셈[j] < 셈최소) 셈최소 = dd.셈[j];
    /* ★ 105차 ①. 표본이 처음 줄어드는 자리. 여러 번 줄어도 첫 자리 하나만 쓴다 */
    if (줄자리 < 0 && dd.셈[j] < dd.셈[0]) 줄자리 = j;
  }
  var 나갈 = Math.round(합);
  var 셈줄수 = 줄자리 < 0 ? null : t0 + 1 + 줄자리;
  var 지금 = t.bal[i];
  if (지금 === null) return null;
  var 예상 = 지금 + 들어올 - 나갈;
  /* ★ 58차 ⑦-2. 규모가 달라도 같은 잣대가 되게 나갈 돈으로 나눈다 */
  var 배 = 나갈 > 0 ? 예상 / 나갈 : null;
  return {
    i: i,
    오늘: 오늘,
    목표: 목표,
    남은날수: 남은날수,
    잔액: 지금,
    들어올: 들어올,
    나갈: 나갈,
    예상: 예상,
    배: 배,
    셈최소: 셈최소,
    /* ★ 105차 ①③. 표본이 줄어드는 자리(날수)와, 종료일이 당겨졌으면 원래 날짜 */
    셈줄수: 셈줄수,
    셈줄값: 줄자리 < 0 ? null : dd.셈[줄자리],
    잘림: 잘림,
    /* ★ 113차 ④. 자료가 시작되기 전이라 표본에서 빠진 날이 몇이나 되나.
              이전 내역을 더하면 늘어날 자료인지 아닌지를 여기로 가른다 */
    앞부족: dd.앞부족 || 0,
    /* ★ 116차 ⑫. 적용 보류가 있을 때만 카드가 한 줄로 알린다 */
    계획수: use.계획,
    적용보류수: use.적용보류,
    /* ★ 118차 ②. 곡선·그래프가 그대로 받아 쓰는 날짜별 입금 */
    입금: 입금.일별,
    입금방식: 입금.방식,
    대체요일: 입금.대체요일
  };
}
/* 과거의 모든 날에 같은 계산을 해 둔다 — 끝을 본 구간만 (아직 안 끝난 것은 셀 수 없다) */
function duePastIn(U, E, t, day, upto) {
  var out = [],
    시작 = t.num[0] + DUE_WARMUP,
    끝 = t.num[t.n - 1];
  for (var j = 0; j < t.n && j < upto; j++) {
    /* ★ ⑦-3. 과거만 쓴다 */
    if (t.num[j] < 시작) continue;
    var p = dueProjectIn(U, E, t, j, day);
    if (!p || p.배 === null) continue;
    var t1 = dayNum(p.목표);
    if (t1 > 끝) continue;
    out.push({ 배: p.배, 바닥: dueHitBottom(t, t.num[j], t1), 날: t.days[j] });
  }
  return out;
}
function dueUnknownAccsIn(U, E) {
  var t = E.table();
  if (!t || !t.n) return null;
  var i = commonAsOfIn(U, t),
    n = accCountIn(U),
    D = t.days[i];
  var last = [],
    처음 = [],
    끝 = [],
    a;
  for (a = 0; a < n; a++) {
    last[a] = null;
    처음[a] = null;
    끝[a] = null;
  }
  U.rows.forEach(function (r) {
    var d = r.at.slice(0, 10),
      x = accOf(r);
    if (처음[x] === null || d < 처음[x]) 처음[x] = d;
    if (끝[x] === null || d > 끝[x]) 끝[x] = d;
    if (d <= D) last[x] = r.balance;
  });
  var 목록 = [];
  for (a = 0; a < n; a++) {
    if (last[a] !== null) continue;
    /* 이름은 있는 그대로 쓴다 — 은행을 고르셨으면 「카카오뱅크」, 안 고르셨으면 「계좌 2」.
       그때는 옆의 자료 기간으로 알아보신다 */
    목록.push({
      이름: (U.banks && U.banks[a] && U.banks[a].bank) || '계좌 ' + (a + 1),
      /* ★ 102차 마무리. monthLabel 은 「2026년 07월」처럼 0 이 붙는다.
                   그 함수는 다른 화면이 쓰므로 안 건드리고 여기서만 0 을 뗀다 */
      기간: 처음[a] ? 달글(처음[a]) + ' ~ ' + 달글(끝[a]) : ''
    });
  }
  return 목록.length ? { 총: n, 빠짐: 목록.length, 날: D, 목록: 목록 } : null;
}
/* 오늘 자리에서 본 한 장 */
function dueCardIn(U, E) {
  var t = E.table();
  if (!t || !t.n) return null;
  var day = dueDayIn(U);
  /* ★ 102차. 오늘 = 모든 계좌가 자료를 가진 마지막 날 (계좌 하나면 예전과 같다) */
  var i = commonAsOfIn(U, t);
  /* ★ 102차 추가 ③. 그날 잔액을 복원 못 하는 계좌가 있으면 예측을 안 낸다 (위 설명).
     문지기와 안내가 같은 규칙 하나를 보게 한다 — 둘이 갈리면 카드도 안 뜨고
     까닭도 안 뜨는 빈 자리가 생긴다 */
  if (dueUnknownAccsIn(U, E)) return null;
  var now = dueProjectIn(U, E, t, i, day);
  /* ★ 116차 통합. 예정 지출 때문에 나갈 돈이 0원이 되어도 미정 출금 보류는 그대로다.
     그래서 계획이 있을 때는 보류를 먼저 보고, 배수가 없다는 판단은 그 뒤에 한다.
     계획이 없으면 기준판과 같은 자리에서 같은 판단을 한다 */
  if (!now || (now.배 === null && !now.계획수)) return null;
  /* ★ 102차. 기준일이 당겨졌으면 화면에 그 사실을 적는다 */
  now.공통기준 = i !== t.n - 1;
  /* ★ 116차 앞 ②③. 고르신 종료일까지의 예측에 실제로 쓰인 비교 날짜에
     아직 안 정한 출금이 있으면 예상 잔액 표시를 보류한다.
     ★ 예측 공식·표본 선택·금액 계산은 한 줄도 안 바꾼다. 내놓을지 말지만 정한다.
     ★ 보류면 과거 견주기(duePast)도 하지 않는다 — 안 보여줄 숫자를 만들지 않는다 */
  /* ★ NAM-9 요한 승인 (2026-09-29). 보류 사유를 한꺼번에 센다 — 여러 개면 화면이 함께 보여준다.
     ① 이체: 예측에 쓰인 비교 날짜에 확인 전 이체 후보가 있다 (분류와 상관없이)
     ② 입금: 직전 30일에 「매출」로 정한 입금이 한 건도 없다 — 미분류 입금을 매출로 치지 않는다
     ③ 자료: 첫 예상일조차 비교할 과거 구간이 3개가 안 된다 (곡선의 기존 문턱 FC_MIN_MONTHS)
     ★ 숫자를 안 낸다. 실적 화면은 그대로다 */
  now.보류 = dueHoldIn(U, t, i, now.남은날수);
  now.입금틈 = dueInflowGapIn(U, t, i);
  if (!now.입금틈.매출건) now.입금보류 = now.입금틈;
  var 쓸것 = dueDailyUseIn(U, E, t, i).dd;
  if (쓸것 && 쓸것.셈[0] < FC_MIN_MONTHS) now.자료보류 = { 셈: 쓸것.셈[0] };
  if (now.보류 || now.입금보류 || now.자료보류) return now;
  /* ★ NAM-9 후속. 예측에 들어간 미분류 출금 — 카드가 건수를 한 줄로 알린다 */
  now.미분류 = dueUnsetUsedIn(U, t, i, now.남은날수);
  if (now.배 === null) return null;
  /* ★ 58차 ⑦-3. 구간을 자르지 않는다. 지금 배수와 가장 가까웠던 과거 스무 날을 뽑는다 */
  var past = duePastIn(U, E, t, day, i);
  past.sort(function (a, b) {
    return Math.abs(a.배 - now.배) - Math.abs(b.배 - now.배);
  });
  var near = past.slice(0, DUE_NEAR);
  now.표본 = near.length;
  now.바닥 = 0;
  near.forEach(function (x) {
    if (x.바닥) now.바닥++;
  });
  now.비율 = near.length >= DUE_NEAR ? Math.round((now.바닥 / near.length) * 100) : null;
  /* ★ 58차 ⑦-4. 날이 갈수록 목표일이 가까워져 저절로 좋아 보이는 착시가 있다.
     8월 1일에는 40일을 버텨야 하고 8월 31일에는 10일만 버티면 된다.
     질문이 쉬워진 것인데 「나아졌네」로 읽으신다. 같은 날짜끼리 견준다 */
  var 지난N = dayNum(shiftMonth(now.오늘, -1)),
    best = null;
  for (var j = 0; j < i; j++) {
    if (best === null || Math.abs(t.num[j] - 지난N) < Math.abs(t.num[best] - 지난N)) best = j;
  }
  if (best !== null && Math.abs(t.num[best] - 지난N) <= 3) {
    var pm = dueProjectIn(U, E, t, best, day);
    if (pm && pm.배 !== null) {
      /* ★ 60차 ④. 배수 대신 % 로 말한다 — 「1.82배」가 무엇의 배수인지 안 읽힌다.
         그날 기준으로 최근접 스무 날을 다시 세야 그날의 % 가 나온다 */
      var pp = duePastIn(U, E, t, day, best);
      pp.sort(function (a, b) {
        return Math.abs(a.배 - pm.배) - Math.abs(b.배 - pm.배);
      });
      var pn = pp.slice(0, DUE_NEAR),
        pb = 0;
      pn.forEach(function (x) {
        if (x.바닥) pb++;
      });
      now.지난달 = {
        날: t.days[best],
        배: pm.배,
        비율: pn.length >= DUE_NEAR ? Math.round((pb / pn.length) * 100) : null
      };
    }
  }
  return now;
}
/* ★ 103차 ①. 곡선의 기준을 카드와 하나로 맞춘다 (2026-09-19 요한, 최우선).
   102차까지는 한 화면에 기준이 셋이었다 —
     카드의 나갈 = 지난 3달 「같은 구간」 실제 지출의 평균 (dueProject)
     카드의 들어올 = 직전 30일 매출 평균 × 남은 날수 (dueProject)
     곡선의 모양 = domOutflow·dowInflow — 위 둘과 아무 상관 없는 제3의 자
   곡선은 제3의 자로 모양을 만든 뒤 창 전체 합으로 나눠 카드 총액에 맞춰 늘리고 줄였다.
       입 = 요일몫[i] / 요일합 * 들어올 · 출 = 날짜몫[i] / 날짜합 * 나갈
   요일합·날짜합이 「창 전체의 합」이라, 종료일을 하루 늘리면 배율이 통째로 바뀌고
   앞날이 전부 다시 칠해졌다. 실측: 같은 자료·같은 기준일에서 종료일만 옮겼더니
   9월 11일 예상 잔액이 1억 1,467만 ~ 1억 2,017만 사이를 오갔다 (550만원 차이).

   ★ 총액에서 거꾸로 내려오지 않는다. 하루를 먼저 정의하고 그것을 더한다.
       하루 출금 = 지난 3달 같은 구간의 「그 자리 날」 실제 지출 평균
                  — dueProject 의 나갈과 같은 3달·같은 구간·같은 건너뛰기 규칙이다.
                    그래서 날마다 더하면 나갈과 저절로 같다. 맞출 필요가 없다.
       하루 입금 = 들어올 ÷ 남은 날수 (균등)
                  — 들어올이 「30일 평균 × 남은 날수」라 균등하게 펴면 합이 저절로 맞는다.
   ★ dowInflow 의 요일 모양은 버린다. 최저점을 만드는 것은 출금 덩어리지
     요일별 매출 잔물결이 아니다. 요일 모양을 살리려고 창 전체로 정규화하면
     방금 고친 병이 그대로 돌아온다.
   ★ 건너뛰기 규칙(if (a < t.num[0]) continue)을 날짜별로도 똑같이 쓴다. 이게 핵심이다.
   ★ 104차 ①. 날짜 대응은 dueDaily 가 기준일 하나로 정해 둔다. 여기서는 자르기만 한다 —
     얹지 않는다. 그래서 목표일을 늘려도 앞선 날의 몫이 한 원도 안 움직인다.
     카드의 나갈도 같은 dueDaily 를 잘라 쓰므로 Σ출 = 나갈 이 저절로 선다.
   ★ 「바닥」의 뜻은 58차 ⑦-1 그대로 쓴다 — 잔액이 그날 하루치 지출보다 적어진 것.
   ★ 자료가 모자라면 아무것도 안 내놓는다 (null). 지어내지 않는다.
   ★ months 는 이제 안 쓴다 — 뒤 회차의 「종료일 뒤 저점」이 쓸 자리라 남겨 둔다 */
function dueCurveIn(U, E, months, c) {
  /* ★ 116차 앞 ③. 카드와 같은 보류 상태를 쓴다. 보류면 곡선을 아예 안 만든다 */
  if (!c || c.보류 || c.입금보류 || c.자료보류 || c.잔액 === null) return null;
  var t = E.table();
  if (!t || !t.n) return null;
  var 시작 = dayNum(c.오늘),
    끝 = dayNum(c.목표);
  var 남은날수 = 끝 - 시작;
  if (남은날수 <= 1) return null; /* 하루짜리는 곡선이 뜻이 없다 */

  /* 하루 출금 — 카드의 나갈과 같은 표를 잘라 쓴다 */
  /* ★ 116차 ②. 카드와 같은 공통 일별 결과를 잘라 쓴다 — 여기서 따로 보정하지 않는다 */
  var use = dueDailyUseIn(U, E, t, c.i),
    dd = use.dd;
  if (!dd || 남은날수 > dd.한계) return null;
  var 셈 = dd.셈,
    i;
  /* 3달이 다 차야 그린다 — 101차의 「자료 3달 미만이면 안 나온다」를 그대로 지킨다.
     첫날조차 셋이 안 되면 3달이 안 쌓인 것이다 */
  if (셈[0] < FC_MIN_MONTHS) return null;

  /* 하루치 지출 — 「바닥」의 잣대. 오늘 자리의 것을 그대로 쓴다 (58차 ⑦-1) */
  var 하루치 = t.daily[t.n - 1] || 0;
  /* ★ 118차 ②. 하루 입금은 카드와 같은 날짜별 입금 배열에서 받는다.
     균등 방식이면 예전의 「들어올 ÷ 남은날수」와 같은 값이다 */
  var 입금 = c.입금;
  /* ★ 오늘 잔액도 최저 후보에 넣는다 — 오늘이 이미 제일 낮을 수 있다 */
  var bal = c.잔액,
    최저 = c.잔액,
    최저날 = 시작,
    점 = [],
    출합 = 0,
    입합 = 0;
  /* ★ 118차 ④. 하루 출금·입금을 「누적값을 원 단위로 반올림한 차이」로 둔다.
     카드는 합을 먼저 반올림하고(나갈·들어올) 곡선은 빼고 나서 반올림해서,
     합이 꼭 ○.5원에 걸리는 날 끝값이 1원 갈렸다 (118차 예시 28일 종료에서 실측).
     이렇게 하면 앞 N일의 합이 언제나 카드의 반올림 합과 같다 — 끝값이 예상과 같고,
     누적이 종료일과 상관없어 종료일을 늘려도 앞날 출금이 안 움직인다.
     ★ 날마다 값은 원래 값과 1원 안쪽으로 다르다. 금액을 새로 만드는 것이 아니다 */
  var 출일 = [],
    입일 = [],
    누출 = 0,
    누입 = 0,
    앞출 = 0,
    앞입 = 0;
  for (i = 0; i < 남은날수; i++) {
    누출 += use.일별[i];
    누입 += 입금[i];
    출일.push(Math.round(누출) - 앞출);
    앞출 = Math.round(누출);
    입일.push(Math.round(누입) - 앞입);
    앞입 = Math.round(누입);
  }
  for (i = 0; i < 남은날수; i++) {
    var 출 = 출일[i]; /* ★ 116차 ②. 카드와 같은 결과 하나다 */
    var 입 = 입일[i];
    출합 += 출;
    입합 += 입;
    /* ★ 하루 안에서는 출금 먼저, 입금 나중. 같은 날 아침에 급여가 나가면
       일말 잔고가 플러스여도 장중에 펑크다. 낮은 쪽을 최저 후보로 쓴다.
       ★ 이건 가정이다. 화면에도 가정이라고 적는다 (103차 ②) */
    var 낮은 = bal - 출;
    bal = 낮은 + 입;
    점.push({ 날: 시작 + 1 + i, 잔액: bal });
    if (낮은 < 최저) {
      최저 = 낮은;
      최저날 = 시작 + 1 + i;
    }
    if (bal < 최저) {
      최저 = bal;
      최저날 = 시작 + 1 + i;
    }
  }
  var at = new Date(최저날 * 86400000);
  var 날글 = at.getUTCMonth() + 1 + '월 ' + at.getUTCDate() + '일';
  return {
    점: 점,
    최저: Math.round(최저),
    최저날: 날글,
    최저날수: 최저날,
    하루치: Math.round(하루치),
    바닥: 최저 < 하루치,
    모자람: 최저 < 0 ? Math.round(-최저) : 0,
    출합: Math.round(출합),
    입합: Math.round(입합),
    /* ★ 118차 ④. 그래프가 같은 하루 출금을 쓴다 */
    출일: 출일
  };
}
/* ── 114차 · 예상 잔액 그래프가 그릴 점들 ──────────────────────────────
   ★ 새 예측을 만들지 않는다. dueCurve 가 이미 낸 값을 그대로 쓴다 (요청서 ④).
     총액에 맞추려고 다시 늘리거나 줄이지도 않는다.

   [왜 이 함수가 따로 있나]
   dueCurve 의 점[] 에는 일말 잔액만 들어 있다. 그런데 카드가 말하는 최저는
   「당일 출금 후·입금 전」 값일 수 있다 (dueCurve 의 낮은).
   일말 잔액만 이은 선에서는 그 최저점이 안 보이고, 그림과 카드가 서로 다른 값을
   가리키게 된다. 그래서 하루에 두 상태를 같은 날짜에 차례로 둔다.

   [어떻게 같은 값을 내나 — dueCurve 를 한 글자도 안 건드리고]
   dueCurve 의 산수는  낮은 = bal − 출  ·  bal = 낮은 + 입  다.
   여기서는 직전 일말 잔액을 dueCurve 가 낸 점[i−1].잔액 에서 그대로 받아
   같은 출(몫[i]/셈[i])을 빼서 낮은을 되살린다 — 같은 수에 같은 셈이라 같은 값이 나온다.
   입을 더했다 빼는 식으로 되돌리지 않는다. 그건 부동소수에서 제자리로 안 온다.
   ★ 실측(예시 자료·종료일 31가지): 되살린 최저가 cv.최저 와 0원 차이,
     마지막 점이 카드의 예상과 0원 차이.

   [겹침 — 자료는 보존하고 표시만 합친다 (114차 보정 ④)]
   그날 반영할 입금이 0원이면 두 시점의 잔액이 정확히 같다.
   ★ 그때도 두 시점을 다 들고 있는다. 없애지 않는다 —
     두 시점 자체가 같아진 것이 아니라 잔액이 같을 뿐이고,
     고르셨을 때 상세에서 둘을 각각 보여드려야 한다.
   ★ 합치는 것은 마커와 금액 표시뿐이다 (같음 표시를 보고 그리는 쪽이 정한다).
   ★ 반올림한 표시값이 아니라 계산값으로 견준다. 1원이라도 다르면 따로 둔다.
   ★ 날짜가 다르면 금액이 같아도 안 합친다.

   [가상의 시각을 안 붙인다]
   「10:00 출금 · 14:00 입금」 같은 시각을 지어내면 자료에 없는 것을 그린 것이 된다.
   같은 날짜 안에 두 상태를 차례로 둘 뿐이다 (2026-09-20 GPT 확정) */
function dueGraphPtsIn(U, E, c, cv) {
  /* ★ 116차 앞 ③. 카드·곡선과 같은 보류 상태를 쓴다 */
  if (!c || c.보류 || !cv || !cv.점 || !cv.점.length) return null;
  var t = E.table();
  if (!t) return null;
  /* ★ 116차 ②. 카드·곡선과 같은 공통 일별 결과다 */
  var use = dueDailyUseIn(U, E, t, c.i);
  if (!use || !use.일별.length) return null;
  var 시작 = dayNum(c.오늘);
  /* ★ 114차 보정 ①. 자료 기준일의 실제 잔액이 시작점이다.
     dueCurve 도 이 값을 최저 후보에 넣는다 — 안 넣으면 기준일이 최저인 매장에서
     카드와 그래프가 어긋난다. 이건 예상이 아니라 자료에 적힌 값이라 갈래를 따로 둔다 */
  var out = [{ 날: 시작, 값: c.잔액, 갈래: '기준' }];
  var bal = c.잔액;
  for (var i = 0; i < cv.점.length; i++) {
    /* ★ 118차 ④. 곡선이 쓴 원 단위 하루 출금을 그대로 받는다 */
    var 출 = cv.출일 ? cv.출일[i] : use.일별[i];
    var 낮은 = bal - 출; /* dueCurve 의 「낮은」과 같은 셈 */
    var 끝 = cv.점[i].잔액; /* dueCurve 가 낸 일말 잔액 그대로 */
    var 날 = cv.점[i].날;
    var 같음 = 낮은 === 끝; /* 그날 반영할 입금이 0원이다 */
    /* ★ 둘 다 들고 있는다. 같아도 안 없앤다 — 합치는 것은 그리는 쪽의 일이다 */
    out.push({ 날: 날, 값: 낮은, 갈래: '입금전', 같음: 같음 });
    out.push({ 날: 날, 값: 끝, 갈래: '일말', 같음: 같음 });
    bal = 끝;
  }
  return { 점: out, 시작: 시작, 끝: dayNum(c.목표) };
}
/* ── NAM-9 · 다음 달 가운데 잔액이 가장 적을 것으로 예상되는 날 ──────────────
   ★ 찾는 범위는 다음 달 1일 ~ 말일이다. 이번 달 남은 날은 넣지 않는다 —
     dueCurve 의 최저(cv.최저)는 이번 달을 포함한 전체 기간의 최저라 뜻이 다르다.
   ★ 새 예측을 만들지 않는다. dueGraphPts 가 dueCurve 값으로 되살린 점을 그대로 고른다.
     그래서 「입금 전」 값(당일 출금 후·입금 전)이 후보다 — 카드의 최저와 같은 자다.
   ★ 같은 값이면 앞선 날·앞선 시점(입금 전)을 쓴다. dueCurve 가 최저를 고르는 방식과 같다.
   ★ 비교 자료가 모자라 예측이 다음 달 중간에서 끝나면(c.잘림) 계산된 날까지만 찾고
     전부 = false 로 알린다. 다음 달에 닿지 못했으면 null 이다 — 지어내지 않는다 */
function dueNextMonthLowIn(c, pts) {
  if (!c || !pts || !pts.점) return null;
  var 달끝 = nextDue(c.오늘, DUE_END_DAY);
  var 첫 = dayNum(달끝.slice(0, 8) + '01'),
    끝 = dayNum(달끝);
  var 최저 = null;
  for (var k = 0; k < pts.점.length; k++) {
    var p = pts.점[k];
    if (p.갈래 === '기준' || p.날 < 첫 || p.날 > 끝) continue;
    if (최저 === null || p.값 < 최저.값) 최저 = p;
  }
  if (!최저) return null;
  var 계산끝 = Math.min(끝, pts.끝);
  return {
    날수: 최저.날,
    값: Math.round(최저.값),
    갈래: 최저.갈래,
    달: 달끝.slice(0, 7),
    첫날: 첫,
    끝날: 끝,
    계산끝: 계산끝,
    전부: 계산끝 === 끝
  };
}
/* ── 예상 금액 표시 — 원 단위 (2026-09-29 요한 확정, 앞서 승인한 만원 표기를 취소) ──────────────
   ★ 계산된 값을 원 단위 그대로 보인다. 만원 반올림 · 하한 내림 · 상한 올림 · 「1만원 미만」을 쓰지 않는다.
   ★ 원 단위는 계산값의 표시 정밀도일 뿐 예측 정확도가 아니다 — 「예상」 · 「임시 참고 범위」 · 한계 안내는 그대로 둔다.
   ★ 계산값에 소수가 섞일 수 있어 원 단위로만 반올림한다 (보이는 자리수) */
function dueWon(v) {
  return won(Math.round(v)) + '원';
}
/* ── NAM-9 배포 전 보완 (2026-09-29 요한) · 다음 달 최저 예상 잔액의 임시 참고 범위 ──────
   중심값 = 다음 달 1일 ~ 말일 안의 최저 예상 잔액 (dueNextMonthLowIn 의 값)
   반폭   = 다음 달 예상 출금 합계 × 0.3 (2026-09-29 요한 승인 — ±50% 에서 ±30% 로, 계수만 바꿨다)
   ★ 「다음 달 예상 출금 합계」는 다음 달 1일 ~ 계산된 마지막 날의 하루 출금(cv.출일)만 더한다.
     기준일 다음 날부터의 전체 출금(c.나갈)과 다르다 — 이번 달 남은 날은 안 넣는다.
   ★ 하한이 음수여도 0원으로 자르지 않는다.
   ★ ±30% 의 근거는 전달받은 118차 최저 잔액 분석 보고(매장 4곳 · 최저 오차 산출 32창, 중앙값 11.7%,
     ±30% 안 27/32)다. 그 분석의 스크립트 · 자료 · 오차율 분모는 이 저장소에서 찾지 못했고,
     현재 작업본(NAM-9 규칙)으로 다시 검증한 값이 아니다 (분석 준비: chore/nam-8-11-13-forecast-analysis 브랜치).
     화면에서 신뢰구간 · 적중률처럼 부르지 않는다.
   ★ 날짜는 최저 예상일이 든 주(월요일 ~ 일요일)다. 그 주가 다음 달 1일 앞이나 말일 뒤로 걸치면
     다음 달 안으로 자른다 (요한 승인). 「최저일 앞뒤 3일」로 바꾸지 않는다 */
var DUE_RANGE_HALF = 0.3;
function dueWeekOf(n) {
  var 요일 = (n + 4) % 7; /* 0 = 일요일 (1970-01-01 은 목요일) */
  var 시작 = n - ((요일 + 6) % 7);
  return { 시작: 시작, 끝: 시작 + 6 };
}
function dueNextMonthRangeIn(c, cv, 월) {
  if (!c || !cv || !cv.출일 || !월) return null;
  var 시작 = dayNum(c.오늘),
    출합 = 0;
  for (var i = 0; i < cv.출일.length; i++) {
    var 날 = 시작 + 1 + i;
    if (날 >= 월.첫날 && 날 <= 월.계산끝) 출합 += cv.출일[i];
  }
  var 반폭 = Math.round(출합 * DUE_RANGE_HALF);
  var 주 = dueWeekOf(월.날수);
  if (주.시작 < 월.첫날) 주.시작 = 월.첫날;
  if (주.끝 > 월.끝날) 주.끝 = 월.끝날;
  return {
    중심: 월.값,
    출합: 출합,
    반폭: 반폭,
    하한: 월.값 - 반폭,
    상한: 월.값 + 반폭,
    주시작: 주.시작,
    주끝: 주.끝
  };
}
/* ── NAM-9 배포 전 보완 · 직전 30일 입금 가운데 아직 분류하지 않은 것 ──────────────
   ★ 예측 입금은 「매출」로 정한 거래만 센다 (dueInflowIn). 매출 입금이 아직 분류되지 않았으면
     예측 입금이 그만큼 빠진다. 그 규모를 알려 주려고 센다 — 예측에 넣지는 않는다.
   ★ 창은 dueInflowIn 과 같다 — 기준일 포함 직전 30일. 확인된 이체는 뺀다 */
function dueInflowGapIn(U, t, i) {
  var t0 = t.num[i],
    j,
    매출30 = 0,
    매출건 = 0,
    입금건 = 0,
    건 = 0,
    합 = 0,
    매출 = baseNameIn(U, '매출');
  for (j = 0; j < t.n; j++) {
    if (t.num[j] <= t0 - 30) continue;
    if (t.num[j] > t0) break;
    매출30 += t.cs[j + 1] - t.cs[j];
  }
  (U.rows || []).forEach(function (r) {
    if (!(r.amount > 0)) return;
    var d = dayNum(r.at.slice(0, 10));
    if (d <= t0 - 30 || d > t0) return;
    if (xferOnIn(U, r)) return;
    입금건++;
    var c = catOfIn(U, r);
    if (c === 매출) 매출건++;
    if (c !== UNSET) return;
    건++;
    합 += r.amount;
  });
  return { 매출30: 매출30, 매출건: 매출건, 입금건: 입금건, 건수: 건, 합: 합 };
}
/* 곡선(그래프)이 안 나오는 까닭 — dueCurveIn 의 문턱을 그대로 따라 읽는다 (새 문턱을 안 만든다) */
function dueCurveWhyIn(U, E, c) {
  if (!c || c.보류 || c.입금보류 || c.자료보류) return '보류';
  if (c.잔액 === null) return '잔액';
  var 남은날수 = dayNum(c.목표) - dayNum(c.오늘);
  if (남은날수 <= 1) return '짧음';
  var t = E.table();
  var dd = dueDailyUseIn(U, E, t, c.i).dd;
  if (!dd || 남은날수 > dd.한계) return '표본';
  if (dd.셈[0] < FC_MIN_MONTHS) return '3개월';
  return null;
}
/* 자료에 적힌 실제 잔액 — 지나온 쪽이다. 예측이 아니다.
   ★ 새로 계산하지 않는다. dueTable 이 이미 날마다 들고 있는 값을 잘라 쓴다.
   ★ bal 이 null 인 날은 「그날 잔액을 복원할 수 없다」는 뜻이라 점을 안 만든다.
     선도 거기서 끊는다 — 없는 것을 이어 그리지 않는다 (완료 기준 11) */
function dueGraphPastIn(U, E, c, 며칠) {
  var t = E.table();
  if (!t || !t.n) return [];
  var 끝 = dayNum(c.오늘),
    첫 = 끝 - (며칠 || 30);
  var out = [];
  for (var i = 0; i < t.n; i++) {
    if (t.num[i] < 첫) continue;
    if (t.num[i] > 끝) break;
    out.push({ 날: t.num[i], 값: t.bal[i] }); /* 값이 null 이면 끊는 자리다 */
  }
  return out;
}
/* 이 매장은 달의 어느 구간에 돈이 제일 많이 나갔나 — 목표일을 고르는 자리에 같이 놓는다 */
function dueSpreadIn(U, E) {
  var t = E.table();
  if (!t || !t.n) return null;
  var a = [0, 0, 0];
  for (var i = 0; i < t.n; i++) {
    var dd = +t.days[i].slice(8, 10);
    var v = t.cc[i + 1] - t.cc[i];
    a[dd <= 10 ? 0 : dd <= 20 ? 1 : 2] += v;
  }
  var s = a[0] + a[1] + a[2];
  if (!(s > 0)) return null;
  var p = a.map(function (v) {
    return Math.round((v / s) * 100);
  });
  var best = p[0] >= p[1] && p[0] >= p[2] ? 0 : p[1] >= p[2] ? 1 : 2;
  return { 비율: p, 제일: best, 이름: ['1일 ~ 10일', '11일 ~ 20일', '21일 ~ 말일'][best] };
}
