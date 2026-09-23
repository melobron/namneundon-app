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
var DUE_DEFAULT = 10;          /* 다음 달 며칠까지를 볼 것인가 */
var DUE_NEAR = 20;             /* 지금과 가장 가까웠던 과거 이만큼을 센다 */
var DUE_WARMUP = 60;           /* 첫 거래일부터 이만큼은 안 센다 — 개업 자본금이 섞인다 */
var DUE_DAILY = 60;            /* 하루치 지출을 이만큼의 평균으로 본다 */
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
function dueDaily(t, i, 상세) {
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
  var cover = dueCover(t, 마지막);
  var 시작 = coverStart(cover);
  var cost = dueCostMap(t);
  var 몫 = [], 셈 = [], k, x, 앞부족 = 0;
  var 채택 = 상세 ? [] : null;
  var by = 상세 ? dueCostBy(t) : null, 조각 = 상세 ? [] : null;
  for (x = 0; x < DUE_MAXSPAN; x++) { 몫.push(0); 셈.push(0); }
  for (k = 1; k <= 3; k++) {
    var a = dayNum(shiftMonth(오늘, -k));
    for (x = 0; x < DUE_MAXSPAN; x++) {
      var 과거날 = a + 1 + x;
      if (과거날 > 마지막) break;                   /* 자료 기준일 너머 — 표본이 아니다 */
      if (!coveredAll(cover, 과거날)) {             /* 자료가 없는 날 — 0원으로 안 센다 */
        /* 자료가 시작되기 전이라 빠진 것인가 (④의 「이전 내역을 더하면」 조건) */
        if (시작 !== null && 과거날 < 시작) 앞부족++;
        continue;
      }
      몫[x] += (cost[과거날] || 0);                 /* 거래가 없던 날은 그날의 0원이다 */
      셈[x]++;
      if (상세) (채택[x] || (채택[x] = [])).push(과거날);
      if (상세) {
        var 줄 = by[과거날];
        if (줄) for (var q = 0; q < 줄.length; q++) {
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
function rangeNotes(c) {
  var bs = (UP && UP.banks) || [];
  var out = [];
  if (!bs.length) return out;
  var 확정 = 0, 사유 = null, 사유문장 = null, 기간없음 = 0, 쓴기간 = null;
  bs.forEach(function (b) {
    var r = b && b.range;
    if (r && r.ok) {
      확정++;
      if (!쓴기간 && r.asked) 쓴기간 = r.asked;
      return;
    }
    if (!r || !r.asked) 기간없음++;
    else if (!사유) { 사유 = r.why; 사유문장 = r.문장 || null; }
  });
  if (확정 === bs.length && 쓴기간) {
    /* ★ 해가 다르면 해까지 적는다. 「11월 22일 ~ 8월 27일」만으로는
       거꾸로 간 기간처럼 읽힌다 */
    var 해다름 = 쓴기간.from.slice(0, 4) !== 쓴기간.to.slice(0, 4);
    out.push('파일에 적힌 조회 기간(' + 날글(쓴기간.from, 해다름) + ' ~ ' +
             날글(쓴기간.to, 해다름) +
             ')을 자료 범위로 썼습니다. 그 기간의 거래 없는 날은 지출 0원으로 셉니다.');
  } else if (사유문장) {
    /* ★ 113차 수정 둘 ①. 통째로 쓰는 완성문 — 사유를 단정할 수 없는 갈래다 */
    out.push(사유문장);
  } else if (사유) {
    /* 부분 자료의 징후 — 실제 사유를 적는다 */
    out.push(사유 + '. 첫 거래일부터 마지막 거래일까지를 기준으로 계산했습니다.');
  } else if (기간없음) {
    out.push('파일의 조회 기간을 확인하지 못해 ' +
             '첫 거래일부터 마지막 거래일까지를 기준으로 계산했습니다.');
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
  return (해까지 ? (+s.slice(0, 4)) + '년 ' : '') +
         (+s.slice(5, 7)) + '월 ' + (+s.slice(8, 10)) + '일';
}
/* ── 113차 ①⑤⑥ · 자료가 있다고 확인된 날 ────────────────────────────
   ★ 규칙 5. 계좌마다 구간을 배열로 들고 있는다 — 파일 사이의 빈 기간을 자동으로
     안 채우려는 것이다. 지금은 파일 하나가 계좌 하나라 구간도 하나씩이지만,
     한 계좌에 파일을 여럿 묶는 날이 와도 이 모양 그대로 이어 붙이면 된다.
   ★ 규칙 6. 그 날에 계좌마다 자료가 있는지 확인한다. 한 계좌라도 없으면
     그 날 전체 지출을 0원으로 치지 않는다 — 표본에서 뺀다.
   ★ 확인 못 한 계좌를 계좌별 첫 거래일로 좁히지 않는다. 예전 잣대(표 전체의
     첫 거래일)를 그대로 준다 — 좁히면 조회 기간과 상관없이 값이 움직인다 */
function dueCover(t, 마지막) {
  var n = accCount(), 기본 = [[t.num[0] + 1, 마지막]], out = [], a;
  for (a = 0; a < n; a++) {
    var b = (UP.banks || [])[a], r = b && b.range;
    if (r && r.ok && r.asked) {
      var lo = dayNum(r.asked.from), hi = Math.min(dayNum(r.asked.to), 마지막);
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
    var 구간 = cover[a], 있 = false;
    for (var k = 0; k < 구간.length; k++) {
      if (day >= 구간[k][0] && day <= 구간[k][1]) { 있 = true; break; }
    }
    if (!있) return false;
  }
  return true;
}
/* 모든 계좌가 덮기 시작하는 날 — 이 앞은 「자료가 시작되기 전」이다 */
function coverStart(cover) {
  var 늦 = null;
  for (var a = 0; a < cover.length; a++) {
    var 구간 = cover[a], 이른 = null;
    for (var k = 0; k < 구간.length; k++) {
      if (이른 === null || 구간[k][0] < 이른) 이른 = 구간[k][0];
    }
    if (이른 === null) return null;
    if (늦 === null || 이른 > 늦) 늦 = 이른;
  }
  return 늦;
}

/* ── 116차 앞 · 예측 표본에서 빠진 「아직 안 정한 출금」 ────────────────
   dueTable 은 아직 안 정한 거래(UNSET)를 사업 지출에 안 넣는다. 그래서
   예상 지출이 그만큼 적게 잡히고, 그 값으로 만든 예상 잔액이 실제보다 넉넉해 보인다.
   ★ 이번에는 미정 출금을 예상 지출에 더하지 않는다. 예측 공식도 한 줄 안 바꾼다.
     그런 거래가 예측에 실제로 쓰인 비교 날짜에 있으면 예상 잔액 표시를 보류할 뿐이다.
   ★ 보류를 0원으로 표시하지 않는다. 안 보여주는 것이지 0원이 아니다.
   ★ 사업 외 지출로 분류되어 보류가 풀려도 그 지출이 예측에 반영됐다는 뜻은 아니다.
     계산 범위를 넓히는 일은 뒤 회차로 둔다 */

/* 아직 안 정한 출금을 날짜별로 모아 둔다 — 표를 한 번만 만들고 t 와 함께 사라진다.
   ★ 조건 ④⑤⑥ 을 여기서 건다. 기존 기준을 그대로 쓴다 —
     catOf 의 UNSET · 출금(금액 0원 초과) · xferOn 으로 빠지는 계좌 간 이체.
   ★ 미정 입금은 담지 않는다. 입금으로 출금을 상계하지 않는다 (요청서 ②).
   ★ 조건 ① 은 따로 거르지 않는다 — dueTable 이 UP.rows 전체를 쓰므로
     예측이 선 계좌 집합과 여기 담기는 거래의 계좌 집합이 같다.
     계좌 집합이 갈리는 자료에서는 dueCard 가 dueUnknownAccs 로 이미 카드를 안 낸다 */
function dueUnknownOut(t) {
  if (t.__unkOut) return t.__unkOut;
  var m = {};
  (UP.rows || []).forEach(function (r) {
    if (!(r.amount < 0)) return;                 /* ⑤ 출금만 · 0원은 안 센다 */
    if (xferOn(r)) return;                       /* ⑥ 빼기로 정한 계좌 간 이체 */
    if (catOf(r) !== UNSET) return;              /* ④ 아직 안 정한 거래만 */
    var d = dayNum(r.at.slice(0, 10));
    (m[d] || (m[d] = [])).push({ rid: rowId(r), 날: d, at: r.at.slice(0, 10),
                                 액: -r.amount, 이름: keyOf(r) });
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
function dueHold(t, i, 남은날수, dd) {
  if (!dd) dd = dueDaily(t, i, true);
  if (!dd || !dd.채택) return null;
  var 표 = dueUnknownOut(t), 본 = {}, 목록 = [], 합 = 0, x, k, q;
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
  목록.sort(function (a, b) { return a.날 - b.날; });
  return { 건수: 목록.length, 합: 합, 목록: 목록, 기준해: t.days[i].slice(0, 4) };
}
/* 그래프가 열려 있으면 닫을 수 있게 들고 있는다 —
   보류로 바뀌었는데 예전 그림이 떠 있으면 안 보여주기로 한 값이 그대로 남는다 */
var DUE_GRAPH_CLOSE = null;
/* 카드가 낸 보류를 목록 쪽이 그대로 본다 — 두 자리가 따로 세면 또 어긋난다 */
var DUE_HOLD_NOW = null;
/* ── 116차 · 예정 지출 ─────────────────────────────────────────────
   대표님이 앞으로 나갈 지출의 날짜와 금액을 고치시면, 이미 예상에 들어 있던
   같은 지출을 빼고 새 금액을 넣는다. 두 번 빠지지 않게 하려는 것이다.
   ★ 원본 거래·실제 월별 집계·계좌 순이익은 이것 때문에 안 바뀐다.
     바뀌는 것은 앞일을 내다보는 자리(카드·곡선·그래프) 하나뿐이다.
   ★ 누적해서 또 빼지 않는다. 늘 기본 예상과 지금 살아 있는 계획들로 다시 센다 */

/* 날수 → 'YYYY-MM-DD'. dueProject 가 쓰던 셈과 같다 */
function 날짜값(n) { return new Date(n * 86400000).toISOString().slice(0, 10); }

/* ★ 116차 ④. 날짜 → 그날 사업 지출의 거래처별 줄.
   dueTable 이 걸러낸 그 줄들이다 — 여기서 새로 거르지 않는다 */
function dueCostBy(t) {
  if (t.__costBy) return t.__costBy;
  var m = {}, L = t.지출줄 || [], i;
  for (i = 0; i < L.length; i++) (m[L[i].날] || (m[L[i].날] = [])).push(L[i]);
  t.__costBy = m;
  return m;
}
/* ★ 116차 ④. 미래 날짜 한 자리의 거래처별 기여분.
   ★ 분모는 그 날짜의 실제 표본 수(셈[x])다. 그 거래처가 등장한 달 수로 나누지 않는다 —
     그래서 거래처별 기여분을 다 더하면 몫[x]/셈[x] 와 같은 값이 된다.
   ★ 여기서 원 단위로 반올림하지 않는다. 반올림은 맨 끝에서 한 번만 한다 */
function duePayeeDaily(dd, x) {
  var out = {}, 줄 = dd.조각 && dd.조각[x], q;
  if (!줄 || !dd.셈[x]) return out;
  for (q = 0; q < 줄.length; q++) out[줄[q].p] = (out[줄[q].p] || 0) + 줄[q].v / dd.셈[x];
  return out;
}
/* ★ 116차 ⑤. 고르신 거래처의 「반영된 내역」.
   한 과거 거래가 여러 미래 날짜에 대응하면 별개 연결로 둔다 — 합치지 않는다.
   ① 원본 거래 식별자 ② 대응하는 미래 날짜 ③ 거래처 식별값 ④ 그 날짜에 기여한 금액 */
function duePlanRows(dd, t0, p, lo, hi) {
  var out = [], x, q;
  for (x = 0; x < dd.한계; x++) {
    var 날 = t0 + 1 + x;
    if (날 < lo || 날 > hi) continue;
    var 줄 = dd.조각 && dd.조각[x];
    if (!줄 || !dd.셈[x]) continue;
    for (q = 0; q < 줄.length; q++) {
      if (줄[q].p !== p) continue;
      out.push({ rid: 줄[q].rid, 거래처: p, 과거: 줄[q].날, 미래: 날,
                 액: 줄[q].v / dd.셈[x] });
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
  var 합 = {}, x, p, ks;
  for (x = 0; x < dd.한계; x++) {
    var m = duePayeeDaily(dd, x);
    for (p in m) if (m.hasOwnProperty(p)) 합[p] = (합[p] || 0) + m[p];
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
  var out = { 갈래: {}, 항목: {} }, x, q;
  for (x = 0; x < Math.min(N, dd.한계); x++) {
    var 줄 = dd.조각 && dd.조각[x];
    if (!줄 || !dd.셈[x]) continue;
    for (q = 0; q < 줄.length; q++) {
      var v = 줄[q].v / dd.셈[x], g = 줄[q].갈래 || '사업', k = 줄[q].항목 || '';
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
  var n = 비중.length, s = 0, i, out = [], rem = [], 쓴 = 0;
  for (i = 0; i < n; i++) s += 비중[i];
  if (!(s > 0)) return null;
  for (i = 0; i < n; i++) {
    var v = 총액 * 비중[i] / s, f = Math.floor(v);
    out.push(f); rem.push({ i: i, r: v - f }); 쓴 += f;
  }
  var 남 = 총액 - 쓴;
  rem.sort(function (a, b) { return (b.r - a.r) || (a.i - b.i); });
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
var PLAN_KEY = 'fc.plan.';
function planKey(name) {
  var s = String(name != null ? name : (UP && UP.store) || '').trim();
  return PLAN_KEY + (s || '(기본)');
}
function planEmpty() { return { v: 1, items: [] }; }
function planLoad() {
  if (!UP) return planEmpty();
  /* ★ 예시 화면에서 만든 계획은 실제 매장 저장값에 섞지 않는다 */
  if (UP.demo) return UP.__planDemo || (UP.__planDemo = planEmpty());
  var raw = lsGet(planKey());
  if (!raw) return planEmpty();
  var o = null;
  try { o = JSON.parse(raw); } catch (e) { return planEmpty(); }
  if (!o || !o.items || !o.items.length) return planEmpty();
  return { v: o.v || 1, items: o.items.slice() };
}
/* ★ 116차 통합. 들고 있는 계획이 어느 매장의 것인지 같이 적어 둔다.
   매장을 바꿔 불러도 UP.__plan 을 비우는 곳이 없어, 앞 매장의 계획이 뒤 매장 예상에
   그대로 적용될 수 있었다. 열쇠가 다르면 그 매장 것을 다시 읽는다 */
function planAt() { return (UP && UP.demo) ? '(예시)' : planKey(); }
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
  if (UP.demo) { UP.__planDemo = box; return true; }
  if (!box.items.length) { lsDel(planKey()); return true; }
  return lsSet(planKey(), JSON.stringify(box));
}
function planNewId() {
  return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
}
function duePlanSig(box) {
  return (box && box.items && box.items.length) ? JSON.stringify(box.items) : '';
}

/* ── 116차 ②③ · 예정 지출을 반영한 공통 일별 결과 ──────────────────────
   ★ 카드 합계·곡선·최저점·그래프가 이 결과 하나를 쓴다.
     각 화면에서 금액을 따로 보정하지 않는다.
   ★ 수정 예상 지출 = 기본 예상 지출 − 연결된 기존 예상분 + 입력한 예정 지출.
   ★ 예정 지출이 없으면 기본 결과와 한 원도 다르지 않다 (완료 기준 ①).
   ★ 계획은 자료 기준일 자리에서만 적용한다. duePast 의 과거 되짚기는
     앞일의 계획과 상관이 없다 — 섞으면 기준판의 비율이 움직인다 */
function dueDailyUseCalc(t, i) {
  var box = planBox(), 있음 = !!(box.items && box.items.length);
  var 기준 = false;
  if (있음) {
    if (t.__asof == null) { try { t.__asof = commonAsOf(t); } catch (e) { t.__asof = -1; } }
    기준 = (i === t.__asof);
  }
  var dd = dueDaily(t, i, 기준), 일별 = [], x;
  for (x = 0; x < dd.한계; x++) 일별.push(dd.몫[x] / dd.셈[x]);
  /* ★ 116차 통합. 「적용보류」는 예정 지출 하나를 재확인까지 빼 두는 것이다.
     카드의 c.보류(미정 출금 때문에 예상 잔액 전체를 안 보여줌)와 다른 것이라 이름을 가른다.
     적용보류는 예상 잔액을 숨기지 않고, c.보류는 여기서 풀리지 않는다 */
  var out = { 일별: 일별, dd: dd, 한계: dd.한계,
              계획: 0, 적용보류: 0, 적용보류목록: [], 적용목록: [], 지문: '' };
  if (!기준) return out;
  var 지문 = dueSig(t, i, dd), t0 = t.num[i];
  out.지문 = 지문;
  box.items.forEach(function (pl) {
    out.계획++;
    /* ★ ⑫ 계획을 세울 때 본 예측 입력과 지금 것이 다르면 적용을 보류한다.
       계획은 그대로 둔다 — 대체 계획은 기본 예상으로 돌아가고,
       추가 계획은 추가 차감을 멈춘다. 대표님이 확인하신 뒤에 다시 반영한다 */
    /* ★ 118차 ③. 모델 번호가 다른(예전에 저장한) 계획도 같은 적용보류로 둔다 */
    if ((pl.모델 || 1) !== DUE_MODEL || pl.자료 !== 지문) {
      out.적용보류++; out.적용보류목록.push(pl); return;
    }
    out.적용목록.push(pl);
    if (pl.유형 === '대체') {
      var lo = dayNum(pl.시작), hi = dayNum(pl.종료);
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
function dueDailyUse(t, i) {
  var sig = planAt() + '|' + duePlanSig(planBox());
  var m = t.__use || (t.__use = {});
  if (m[i] && m[i].sig === sig) return m[i].val;
  var val = dueDailyUseCalc(t, i);
  m[i] = { sig: sig, val: val };
  return val;
}
/* ★ 116차 통합. 예측 표에 들어가는 입력의 지문.
   거래 줄 · 그 줄의 분류 · 이체로 빼는지 · 계산 밖 항목인지 · 계좌별 조회 기간 · 매장.
   ★ 거래 이름과 금액을 남기지 않는다. 섞어 만든 수 하나만 이 화면 안에 둔다 */
function dueInputSig() {
  if (!UP) return '';
  var h = 5381, n = 0;
  function 섞기(s) {
    s = String(s);
    for (var k = 0; k < s.length; k++) h = ((h * 33) ^ s.charCodeAt(k)) >>> 0;
    n += s.length;
  }
  섞기(planAt() + '#' + accCount() + '#' + baseName('매출') + '#');
  (UP.banks || []).forEach(function (b) {
    var r = b && b.range;
    섞기((r && r.ok && r.asked) ? (r.asked.from + '~' + r.asked.to + ';') : '-;');
  });
  (UP.rows || []).forEach(function (r) {
    var c = catOf(r);
    섞기(rowId(r) + '|' + keyOf(r) + '|' + c + '|' + (xferOn(r) ? 1 : 0) +
         (c !== UNSET && isKeep(c) ? 1 : 0) + '\n');
  });
  return h.toString(36) + '-' + n.toString(36);
}
/* 결과를 그리기 전에 한 번 본다. 입력이 달라졌으면 표와 그 위의 캐시를 비운다 —
   예상 지출·미정 출금 보류·예정 지출 연결이 같이 새로 계산된다 */
function dueFresh() {
  if (!UP) return;
  var s = dueInputSig();
  if (UP.__dueIn !== s) { UP.__due = null; UP.__dueIn = s; }
}
/* ── 116차 ⑤⑥ · 편집 화면이 보는 「기존 예상 지출」 ────────────────────
   계산 가능한 미래 범위 전체에서 거래처마다 얼마가 잡혀 있는지 모은다.
   ★ 과거 거래 줄은 여기 안 담는다 — [반영된 내역 보기]에서만 보여드린다 */
function duePlanBase(t, i) {
  var dd = dueDaily(t, i, true), t0 = t.num[i];
  var 합 = {}, 첫 = {}, 끝 = {}, 날별 = {}, x, p;
  for (x = 0; x < dd.한계; x++) {
    var m = duePayeeDaily(dd, x), 날 = t0 + 1 + x;
    for (p in m) if (m.hasOwnProperty(p)) {
      합[p] = (합[p] || 0) + m[p];
      if (첫[p] == null) 첫[p] = 날;
      끝[p] = 날;
      (날별[p] || (날별[p] = {}))[날] = m[p];
    }
  }
  var list = Object.keys(합).map(function (k) {
    return { 거래처: k, 총액: 합[k], 첫: 첫[k], 끝: 끝[k], 날별: 날별[k] };
  });
  list.sort(function (a, b) { return b.총액 - a.총액; });
  return { dd: dd, list: list, t0: t0, 시작: t0 + 1, 끝: t0 + dd.한계,
           지문: dueSig(t, i, dd) };
}
/* 그 거래처의 적용 기간 안 기존 예상 합계와 날짜별 비중 */
function duePlanSpan(base, p, lo, hi) {
  var 것 = null, d;
  for (d = 0; d < base.list.length; d++) if (base.list[d].거래처 === p) { 것 = base.list[d]; break; }
  var 날별 = (것 && 것.날별) || {}, 날 = [], 값 = [], 합 = 0;
  for (d = lo; d <= hi; d++) {
    if (!날별[d]) continue;
    날.push(d); 값.push(날별[d]); 합 += 날별[d];
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
  (pl.지급 || []).forEach(function (g) { s += g.액; });
  return s;
}

function dueDay() {
  var d = UP && UP.dueDay;
  return (d >= 1 && d <= 31) ? d : DUE_DEFAULT;
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
  return (d.getUTCMonth() + 1) + '월 ' + d.getUTCDate() + '일';
}
function dueDayShort(n) { return n === 31 ? '말일' : String(n); }
function dueDayText(n)  { return n === 31 ? '말일' : n + '일'; }
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
/* 그 날짜에서 「다음 달 며칠」 — 그 달에 없는 날짜면 그 달 마지막 날로 */
function nextDue(at, day) {
  var y = +at.slice(0, 4), m = +at.slice(5, 7);
  m += 1; if (m > 12) { m = 1; y += 1; }
  var last = new Date(y, m, 0).getDate();
  return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + Math.min(day, last)).slice(-2);
}
/* 달을 밀어 옮긴 같은 날짜 (지난 3개월의 「같은 구간」을 잡을 때 쓴다) */
function shiftMonth(at, n) {
  var y = +at.slice(0, 4), m = +at.slice(5, 7) + n, d = +at.slice(8, 10);
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  var last = new Date(y, m, 0).getDate();
  return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + Math.min(d, last)).slice(-2);
}

/* 하루 단위 표를 한 번만 만든다 — 날짜 · 그날까지의 잔액 · 그날의 매출 · 그날의 사업 지출.
   ★ 58차 ⑦-6. 잔액은 통장에 찍힌 그대로다. 아무것도 빼지 않는다 —
     표의 「지금 계좌 잔액」과 카드의 것이 같은 수여야 한다 */
function dueTable() {
  if (UP.__due) return UP.__due;
  var rows = (UP.rows || []).slice().sort(function (a, b) {
    return a.at < b.at ? -1 : (a.at > b.at ? 1 : 0);
  });
  if (!rows.length) return (UP.__due = null);
  var n = accCount(), last = [], i;
  for (i = 0; i < n; i++) last[i] = null;
  var 매출 = baseName('매출');
  var days = [], bal = [], sale = [], cost = [], fcost = [];
  var cur = null, dSale = 0, dCost = 0, dFc = 0;
  /* ★ 116차 ④. 거래처별 기여분의 재료를 같은 고리에서 모은다 —
     아래 걸러내기(이체·미정·매출)를 그대로 지난 줄만 담긴다.
     새 잣대를 만들지 않는다 — 합계는 예측용 출금(dFc)과 같은 줄에서 나온다 (118차) */
  var 지출줄 = [];
  function 닫기() {
    if (cur === null) return;
    var s = 0, any = false;
    for (i = 0; i < n; i++) if (last[i] !== null) { s += last[i]; any = true; }
    days.push(cur); bal.push(any ? s : null);
    sale.push(dSale); cost.push(dCost); fcost.push(dFc);
  }
  rows.forEach(function (r) {
    var day = r.at.slice(0, 10);
    if (cur !== day) { 닫기(); cur = day; dSale = 0; dCost = 0; dFc = 0; }
    last[accOf(r)] = r.balance;
    var c = catOf(r);
    if (xferOn(r) || c === UNSET) return;
    if (c === 매출) { dSale += r.amount; return; }
    /* ★ 118차 ①. 잔액 예측용 출금 — 계좌 밖으로 실제 나간, 분류된 출금 전부.
       사업 지출만이 아니라 사업 외 용도·대표 인출·계산 밖(KEEP) 항목으로 정한 출금,
       자동으로 넘긴 작은 출금도 넣는다. 잔액은 그 돈이 나가도 줄기 때문이다.
       ★ 빼는 것은 그대로다 — 계좌 간 이체(xferOn)와 아직 안 정한 거래(UNSET).
         미정 출금은 평균에 몰래 넣지 않고 보류 규칙(dueHold)이 맡는다.
       ★ 방향은 실제 금액 부호로만 가른다. 항목 이름(「대출」 등)으로 입금이라 여기지 않는다.
       ★ 매출로 정한 출금(취소·환불)은 예전처럼 매출 쪽에서 빠진다. 여기서 두 번 세지 않는다.
       ★ 월별 사업 수입·지출·계좌 순이익의 정의는 안 바뀐다 — 그쪽은 cost(cc)다.
       ★ 갈래·항목을 줄마다 적어 두어 분류별 기여분을 가를 수 있게 한다 (dueCostSplit) */
    if (r.amount < 0) {
      dFc += -r.amount;
      지출줄.push({ 날: dayNum(day), p: keyOf(r), rid: rowId(r), v: -r.amount,
                    갈래: isKeep(c) ? '사업 외' : '사업', 항목: c });
    }
    if (isKeep(c)) return;
    if (r.amount < 0) dCost += -r.amount;      /* 사업 지출만 (월별·하루치 잣대) */
  });
  닫기();
  var num = days.map(dayNum);
  var cs = [0], cc = [0], fc = [0];
  for (i = 0; i < days.length; i++) {
    cs.push(cs[i] + sale[i]); cc.push(cc[i] + cost[i]); fc.push(fc[i] + fcost[i]);
  }
  /* 하루치 지출 — 그날 직전 60일 사업 지출 ÷ 60. 「바닥났다」의 잣대다 (⑦-1) */
  var daily = [], a = 0;
  for (i = 0; i < days.length; i++) {
    while (a < i && num[a] <= num[i] - DUE_DAILY) a++;
    daily.push((cc[i + 1] - cc[a]) / DUE_DAILY);
  }
  var t = { days: days, num: num, bal: bal, cs: cs, cc: cc, fc: fc, daily: daily,
            지출줄: 지출줄, n: days.length };
  UP.__due = t;
  return t;
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
function dueInflow(t, i, 남은날수) {
  var t0 = t.num[i], 매출30 = 0, j, x;
  for (j = 0; j < t.n; j++) {
    if (t.num[j] <= t0 - 30) continue;
    if (t.num[j] > t0) break;
    매출30 += (t.cs[j + 1] - t.cs[j]);
  }
  var out = { 방식: DUE_INFLOW === '요일' ? '요일' : '균등', 일별: [], 합: 0, 대체요일: [] };
  if (out.방식 === '균등') {
    var 합 = Math.round(매출30 / 30 * 남은날수), 하루 = 합 / 남은날수;
    for (x = 0; x < 남은날수; x++) out.일별.push(하루);
    out.합 = 합;
    return out;
  }
  var 날매출 = {}, cover = dueCover(t, t0), 요합 = [], 요수 = [], w;
  for (w = 0; w < 7; w++) { 요합.push(0); 요수.push(0); }
  for (j = 0; j < t.n; j++) {
    if (t.num[j] <= t0 - 30 || t.num[j] > t0) continue;
    날매출[t.num[j]] = t.cs[j + 1] - t.cs[j];
  }
  for (var d = t0 - 29; d <= t0; d++) {
    if (!coveredAll(cover, d)) continue;          /* 자료 밖 날은 0원으로 안 센다 */
    w = (d + 4) % 7;                               /* 1970-01-01 은 목요일(4) */
    요합[w] += (날매출[d] || 0);
    요수[w]++;
  }
  for (x = 0; x < 남은날수; x++) {
    w = (t0 + 1 + x + 4) % 7;
    var v;
    if (요수[w]) v = 요합[w] / 요수[w];
    else { v = 매출30 / 30; if (out.대체요일.indexOf(w) < 0) out.대체요일.push(w); }
    v = Math.round(v);
    out.일별.push(v);
    out.합 += v;
  }
  return out;
}
/* 그날에 서서 목표일까지를 내다본 뺄셈 하나 */
function dueProject(t, i, day) {
  var 오늘 = t.days[i], 목표 = nextDue(오늘, day);
  var t0 = t.num[i], t1 = dayNum(목표);
  var 남은날수 = t1 - t0;
  if (남은날수 <= 0) return null;
  /* ★ 104차 정정 ㉰. 비교할 과거 표본이 아예 없는 날부터는 계산하지 않는다.
     그 자리가 곧 분석 종료일이 된다 — 화면의 「분석 종료일」 줄도 이 날짜를 쓴다.
     「그 뒤에는 지출이 없다」는 뜻이 아니라 「여기까지가 말할 수 있는 데까지」다 */
  /* ★ 116차 ②. 예정 지출을 반영한 공통 일별 결과 하나를 받는다.
     계획이 없으면 몫[j]/셈[j] 와 한 원도 다르지 않다 (완료 기준 ①) */
  var use = dueDailyUse(t, i), dd = use.dd;
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
  var 입금 = dueInflow(t, i, 남은날수), j;
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
  var 합 = 0, 셈최소 = dd.셈[0], 줄자리 = -1;
  for (j = 0; j < 남은날수; j++) {
    합 += use.일별[j];
    if (dd.셈[j] < 셈최소) 셈최소 = dd.셈[j];
    /* ★ 105차 ①. 표본이 처음 줄어드는 자리. 여러 번 줄어도 첫 자리 하나만 쓴다 */
    if (줄자리 < 0 && dd.셈[j] < dd.셈[0]) 줄자리 = j;
  }
  var 나갈 = Math.round(합);
  var 셈줄수 = 줄자리 < 0 ? null : (t0 + 1 + 줄자리);
  var 지금 = t.bal[i];
  if (지금 === null) return null;
  var 예상 = 지금 + 들어올 - 나갈;
  /* ★ 58차 ⑦-2. 규모가 달라도 같은 잣대가 되게 나갈 돈으로 나눈다 */
  var 배 = 나갈 > 0 ? 예상 / 나갈 : null;
  return { i: i, 오늘: 오늘, 목표: 목표, 남은날수: 남은날수, 잔액: 지금,
           들어올: 들어올, 나갈: 나갈, 예상: 예상, 배: 배, 셈최소: 셈최소,
           /* ★ 105차 ①③. 표본이 줄어드는 자리(날수)와, 종료일이 당겨졌으면 원래 날짜 */
           셈줄수: 셈줄수, 셈줄값: 줄자리 < 0 ? null : dd.셈[줄자리], 잘림: 잘림,
           /* ★ 113차 ④. 자료가 시작되기 전이라 표본에서 빠진 날이 몇이나 되나.
              이전 내역을 더하면 늘어날 자료인지 아닌지를 여기로 가른다 */
           앞부족: dd.앞부족 || 0,
           /* ★ 116차 ⑫. 적용 보류가 있을 때만 카드가 한 줄로 알린다 */
           계획수: use.계획, 적용보류수: use.적용보류,
           /* ★ 118차 ②. 곡선·그래프가 그대로 받아 쓰는 날짜별 입금 */
           입금: 입금.일별, 입금방식: 입금.방식, 대체요일: 입금.대체요일 };
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
/* 과거의 모든 날에 같은 계산을 해 둔다 — 끝을 본 구간만 (아직 안 끝난 것은 셀 수 없다) */
function duePast(t, day, upto) {
  var out = [], 시작 = t.num[0] + DUE_WARMUP, 끝 = t.num[t.n - 1];
  for (var j = 0; j < t.n && j < upto; j++) {     /* ★ ⑦-3. 과거만 쓴다 */
    if (t.num[j] < 시작) continue;
    var p = dueProject(t, j, day);
    if (!p || p.배 === null) continue;
    var t1 = dayNum(p.목표);
    if (t1 > 끝) continue;
    out.push({ 배: p.배, 바닥: dueHitBottom(t, t.num[j], t1), 날: t.days[j] });
  }
  return out;
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
function commonAsOf(t) {
  var n = accCount();
  if (n <= 1) return t.n - 1;
  var last = [], a;                     /* 계좌마다 마지막 거래일(dayNum) */
  for (a = 0; a < n; a++) last[a] = null;
  UP.rows.forEach(function (r) {
    var d = dayNum(r.at.slice(0, 10)), i = accOf(r);
    if (last[i] === null || d > last[i]) last[i] = d;
  });
  var 공통 = null;
  for (a = 0; a < n; a++) {
    if (last[a] === null) continue;     /* 거래가 한 건도 없는 계좌는 안 센다 */
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
function 달글(at) { return (+at.slice(0, 4)) + '년 ' + (+at.slice(5, 7)) + '월'; }
function dueUnknownAccs() {
  var t = dueTable();
  if (!t || !t.n) return null;
  var i = commonAsOf(t), n = accCount(), D = t.days[i];
  var last = [], 처음 = [], 끝 = [], a;
  for (a = 0; a < n; a++) { last[a] = null; 처음[a] = null; 끝[a] = null; }
  UP.rows.forEach(function (r) {
    var d = r.at.slice(0, 10), x = accOf(r);
    if (처음[x] === null || d < 처음[x]) 처음[x] = d;
    if (끝[x] === null || d > 끝[x]) 끝[x] = d;
    if (d <= D) last[x] = r.balance;
  });
  var 목록 = [];
  for (a = 0; a < n; a++) {
    if (last[a] !== null) continue;
    /* 이름은 있는 그대로 쓴다 — 은행을 고르셨으면 「카카오뱅크」, 안 고르셨으면 「계좌 2」.
       그때는 옆의 자료 기간으로 알아보신다 */
    목록.push({ 이름: (UP.banks && UP.banks[a] && UP.banks[a].bank) || ('계좌 ' + (a + 1)),
                /* ★ 102차 마무리. monthLabel 은 「2026년 07월」처럼 0 이 붙는다.
                   그 함수는 다른 화면이 쓰므로 안 건드리고 여기서만 0 을 뗀다 */
                기간: 처음[a] ? (달글(처음[a]) + ' ~ ' + 달글(끝[a])) : '' });
  }
  return 목록.length ? { 총: n, 빠짐: 목록.length, 날: D, 목록: 목록 } : null;
}
/* 오늘 자리에서 본 한 장 */
function dueCard() {
  var t = dueTable();
  if (!t || !t.n) return null;
  var day = dueDay();
  /* ★ 102차. 오늘 = 모든 계좌가 자료를 가진 마지막 날 (계좌 하나면 예전과 같다) */
  var i = commonAsOf(t);
  /* ★ 102차 추가 ③. 그날 잔액을 복원 못 하는 계좌가 있으면 예측을 안 낸다 (위 설명).
     문지기와 안내가 같은 규칙 하나를 보게 한다 — 둘이 갈리면 카드도 안 뜨고
     까닭도 안 뜨는 빈 자리가 생긴다 */
  if (dueUnknownAccs()) return null;
  var now = dueProject(t, i, day);
  /* ★ 116차 통합. 예정 지출 때문에 나갈 돈이 0원이 되어도 미정 출금 보류는 그대로다.
     그래서 계획이 있을 때는 보류를 먼저 보고, 배수가 없다는 판단은 그 뒤에 한다.
     계획이 없으면 기준판과 같은 자리에서 같은 판단을 한다 */
  if (!now || (now.배 === null && !now.계획수)) return null;
  /* ★ 102차. 기준일이 당겨졌으면 화면에 그 사실을 적는다 */
  now.공통기준 = (i !== t.n - 1);
  /* ★ 116차 앞 ②③. 고르신 종료일까지의 예측에 실제로 쓰인 비교 날짜에
     아직 안 정한 출금이 있으면 예상 잔액 표시를 보류한다.
     ★ 예측 공식·표본 선택·금액 계산은 한 줄도 안 바꾼다. 내놓을지 말지만 정한다.
     ★ 보류면 과거 견주기(duePast)도 하지 않는다 — 안 보여줄 숫자를 만들지 않는다 */
  now.보류 = dueHold(t, i, now.남은날수);
  if (now.보류) return now;
  if (now.배 === null) return null;
  /* ★ 58차 ⑦-3. 구간을 자르지 않는다. 지금 배수와 가장 가까웠던 과거 스무 날을 뽑는다 */
  var past = duePast(t, day, i);
  past.sort(function (a, b) {
    return Math.abs(a.배 - now.배) - Math.abs(b.배 - now.배);
  });
  var near = past.slice(0, DUE_NEAR);
  now.표본 = near.length;
  now.바닥 = 0;
  near.forEach(function (x) { if (x.바닥) now.바닥++; });
  now.비율 = near.length >= DUE_NEAR ? Math.round(now.바닥 / near.length * 100) : null;
  /* ★ 58차 ⑦-4. 날이 갈수록 목표일이 가까워져 저절로 좋아 보이는 착시가 있다.
     8월 1일에는 40일을 버텨야 하고 8월 31일에는 10일만 버티면 된다.
     질문이 쉬워진 것인데 「나아졌네」로 읽으신다. 같은 날짜끼리 견준다 */
  var 지난N = dayNum(shiftMonth(now.오늘, -1)), best = null;
  for (var j = 0; j < i; j++) {
    if (best === null || Math.abs(t.num[j] - 지난N) < Math.abs(t.num[best] - 지난N)) best = j;
  }
  if (best !== null && Math.abs(t.num[best] - 지난N) <= 3) {
    var pm = dueProject(t, best, day);
    if (pm && pm.배 !== null) {
      /* ★ 60차 ④. 배수 대신 % 로 말한다 — 「1.82배」가 무엇의 배수인지 안 읽힌다.
         그날 기준으로 최근접 스무 날을 다시 세야 그날의 % 가 나온다 */
      var pp = duePast(t, day, best);
      pp.sort(function (a, b) {
        return Math.abs(a.배 - pm.배) - Math.abs(b.배 - pm.배);
      });
      var pn = pp.slice(0, DUE_NEAR), pb = 0;
      pn.forEach(function (x) { if (x.바닥) pb++; });
      now.지난달 = { 날: t.days[best], 배: pm.배,
                     비율: pn.length >= DUE_NEAR ? Math.round(pb / pn.length * 100) : null };
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
function dueCurve(months, c) {
  /* ★ 116차 앞 ③. 카드와 같은 보류 상태를 쓴다. 보류면 곡선을 아예 안 만든다 */
  if (!c || c.보류 || c.잔액 === null) return null;
  var t = dueTable();
  if (!t || !t.n) return null;
  var 시작 = dayNum(c.오늘), 끝 = dayNum(c.목표);
  var 남은날수 = 끝 - 시작;
  if (남은날수 <= 1) return null;                  /* 하루짜리는 곡선이 뜻이 없다 */

  /* 하루 출금 — 카드의 나갈과 같은 표를 잘라 쓴다 */
  /* ★ 116차 ②. 카드와 같은 공통 일별 결과를 잘라 쓴다 — 여기서 따로 보정하지 않는다 */
  var use = dueDailyUse(t, c.i), dd = use.dd;
  if (!dd || 남은날수 > dd.한계) return null;
  var 셈 = dd.셈, i;
  /* 3달이 다 차야 그린다 — 101차의 「자료 3달 미만이면 안 나온다」를 그대로 지킨다.
     첫날조차 셋이 안 되면 3달이 안 쌓인 것이다 */
  if (셈[0] < FC_MIN_MONTHS) return null;

  /* 하루치 지출 — 「바닥」의 잣대. 오늘 자리의 것을 그대로 쓴다 (58차 ⑦-1) */
  var 하루치 = t.daily[t.n - 1] || 0;
  /* ★ 118차 ②. 하루 입금은 카드와 같은 날짜별 입금 배열에서 받는다.
     균등 방식이면 예전의 「들어올 ÷ 남은날수」와 같은 값이다 */
  var 입금 = c.입금;
  /* ★ 오늘 잔액도 최저 후보에 넣는다 — 오늘이 이미 제일 낮을 수 있다 */
  var bal = c.잔액, 최저 = c.잔액, 최저날 = 시작, 점 = [], 출합 = 0, 입합 = 0;
  /* ★ 118차 ④. 하루 출금·입금을 「누적값을 원 단위로 반올림한 차이」로 둔다.
     카드는 합을 먼저 반올림하고(나갈·들어올) 곡선은 빼고 나서 반올림해서,
     합이 꼭 ○.5원에 걸리는 날 끝값이 1원 갈렸다 (118차 예시 28일 종료에서 실측).
     이렇게 하면 앞 N일의 합이 언제나 카드의 반올림 합과 같다 — 끝값이 예상과 같고,
     누적이 종료일과 상관없어 종료일을 늘려도 앞날 출금이 안 움직인다.
     ★ 날마다 값은 원래 값과 1원 안쪽으로 다르다. 금액을 새로 만드는 것이 아니다 */
  var 출일 = [], 입일 = [], 누출 = 0, 누입 = 0, 앞출 = 0, 앞입 = 0;
  for (i = 0; i < 남은날수; i++) {
    누출 += use.일별[i]; 누입 += 입금[i];
    출일.push(Math.round(누출) - 앞출); 앞출 = Math.round(누출);
    입일.push(Math.round(누입) - 앞입); 앞입 = Math.round(누입);
  }
  for (i = 0; i < 남은날수; i++) {
    var 출 = 출일[i];                              /* ★ 116차 ②. 카드와 같은 결과 하나다 */
    var 입 = 입일[i];
    출합 += 출; 입합 += 입;
    /* ★ 하루 안에서는 출금 먼저, 입금 나중. 같은 날 아침에 급여가 나가면
       일말 잔고가 플러스여도 장중에 펑크다. 낮은 쪽을 최저 후보로 쓴다.
       ★ 이건 가정이다. 화면에도 가정이라고 적는다 (103차 ②) */
    var 낮은 = bal - 출;
    bal = 낮은 + 입;
    점.push({ 날: 시작 + 1 + i, 잔액: bal });
    if (낮은 < 최저) { 최저 = 낮은; 최저날 = 시작 + 1 + i; }
    if (bal < 최저) { 최저 = bal; 최저날 = 시작 + 1 + i; }
  }
  var at = new Date(최저날 * 86400000);
  var 날글 = (at.getUTCMonth() + 1) + '월 ' + at.getUTCDate() + '일';
  return { 점: 점, 최저: Math.round(최저), 최저날: 날글, 최저날수: 최저날,
           하루치: Math.round(하루치),
           바닥: 최저 < 하루치,
           모자람: 최저 < 0 ? Math.round(-최저) : 0,
           출합: Math.round(출합), 입합: Math.round(입합),
           /* ★ 118차 ④. 그래프가 같은 하루 출금을 쓴다 */
           출일: 출일 };
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
function dueGraphPts(c, cv) {
  /* ★ 116차 앞 ③. 카드·곡선과 같은 보류 상태를 쓴다 */
  if (!c || c.보류 || !cv || !cv.점 || !cv.점.length) return null;
  var t = dueTable();
  if (!t) return null;
  /* ★ 116차 ②. 카드·곡선과 같은 공통 일별 결과다 */
  var use = dueDailyUse(t, c.i);
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
    var 낮은 = bal - 출;                    /* dueCurve 의 「낮은」과 같은 셈 */
    var 끝 = cv.점[i].잔액;                 /* dueCurve 가 낸 일말 잔액 그대로 */
    var 날 = cv.점[i].날;
    var 같음 = (낮은 === 끝);               /* 그날 반영할 입금이 0원이다 */
    /* ★ 둘 다 들고 있는다. 같아도 안 없앤다 — 합치는 것은 그리는 쪽의 일이다 */
    out.push({ 날: 날, 값: 낮은, 갈래: '입금전', 같음: 같음 });
    out.push({ 날: 날, 값: 끝, 갈래: '일말', 같음: 같음 });
    bal = 끝;
  }
  return { 점: out, 시작: 시작, 끝: dayNum(c.목표) };
}
/* ── 116차 앞 · 분석 종료일 고르는 자리 ──────────────────────────────
   보통 카드와 보류 카드가 같은 것을 쓴다. 두 벌로 만들면 한쪽만 고쳐지는 날이 온다 (49차).
   ★ 글자·값·동작은 110차 ④ 그대로다. 자리를 함수로 뺀 것뿐이다 */
function duePickBox(months) {
  var day = dueDay();
  var pick = el('div', 'duepick');
  var prow = el('div', 'duesel');
  prow.appendChild(el('label', 'dueselab', '분석 종료일'));
  var sel = el('select', 'duedrop');
  sel.id = 'duedrop';
  for (var i = 1; i <= 31; i++) {
    var op = el('option', null, dueDayText(i));
    op.value = String(i);
    if (i === day) op.selected = true;
    sel.appendChild(op);
  }
  sel.addEventListener('change', function () {
    setDueDay(+sel.value);
    savePicks();
    drawResult(months);
  });
  prow.appendChild(sel);
  pick.appendChild(prow);
  pick.appendChild(el('div', 'duewhy', '매달 지출이 가장 많은 날을 고르시면 됩니다'));
  var sp0 = null;
  try { sp0 = dueSpread(); } catch (e) { }
  if (sp0) {
    pick.appendChild(el('div', 'duewhy',
      '올려주신 자료에서 사업 지출의 ' + sp0.비율[sp0.제일] + '%가 ' +
      sp0.이름 + '에 나갔습니다'));
  }
  return pick;
}
/* ── 116차 앞 ④ · 보류 카드 ─────────────────────────────────────────
   ★ 예상 잔액 카드 자리에 안내를 한 번만 둔다.
   ★ 종료일 예상 잔액·최저 예상 잔액과 그 날짜·그래프와 진입 단추를 안 낸다.
   ★ 0원으로 적지 않는다. 이전에 계산한 숫자나 열려 있던 그림도 남기지 않는다.
   ★ 분석 종료일 선택은 그대로 둔다 — 종료일을 바꾸면 같은 규칙으로 다시 판단한다.
   ★ 색과 세모 느낌표를 안 쓴다. 보여드릴 결과가 없는데 색이 붙으면 뜻이 생긴다 */
function drawDueHoldCard(host, c, months) {
  if (DUE_GRAPH_CLOSE) { try { DUE_GRAPH_CLOSE(); } catch (e) { } }
  var open = !!UP.open.__dueOpen;
  var box = el('div', 'duecard noicon');
  var top = el('div', 'duetop tapx');
  var res = el('div', 'dueres');
  res.appendChild(el('div', 'dueholdlab',
    '예상 지출에서 빠진 거래가 있어 분류 확인이 필요합니다.'));
  res.appendChild(el('div', 'dueholdn',
    '확인이 필요한 출금 ' + won(c.보류.건수) + '건'));
  top.appendChild(res);
  top.appendChild(foldChip(open));
  box.appendChild(top);
  /* ★ 이 단추는 카드 머리의 접기·펴기를 건드리지 않는다 */
  /* ★ 119차 A. 목록으로 내려가는 대신 기존 거래처 확인 화면에서 원인부터 묻는다.
     물을 거래처가 없으면(출금 쪽이 다 정해졌거나 섞인 카드뿐) 예전처럼 목록을 편다 */
  var go = el('button', 'fcopen', '분류하고 예상 잔액 보기');
  go.type = 'button';
  go.addEventListener('click', function (e) {
    e.stopPropagation();
    useScreen('보류 원인 분류');
    if (holdAskStart(c.보류, months)) return;
    UP.open = UP.open || {};
    UP.open.__unset = true;
    UP.open.__hold = true;
    drawResult(months);
    /* 폈는데 화면 밖이면 안 누른 것과 같다 (49차 ⑤ 와 같은 셈) */
    setTimeout(function () {
      var row = document.querySelector('#up-result .holdrow');
      if (row) row.scrollIntoView({ block: 'center' });
    }, 0);
  });
  box.appendChild(go);
  /* ★ 116차 통합 ④. 보류 중에도 예정 지출은 미리 고치실 수 있게 둔다.
     주 행동은 위의 [안 정한 거래 보기] 그대로고, 이것은 한 단계 낮은 단추다.
     새 펼침을 만들지 않고 보통 카드와 같은 편집 화면을 연다.
     ★ 저장해도 보류는 풀리지 않는다 — 보류 판단은 계획과 상관없는 기본 예측에서 한다 */
  var pgo = el('button', 'b dueholdsub', '예정 지출 확인·수정');
  pgo.type = 'button';
  pgo.addEventListener('click', function (e) {
    e.stopPropagation();
    openDuePlan(c, months);
  });
  box.appendChild(pgo);
  box.appendChild(el('div', 'duewhy dueas',
    '자료 기준일 ' + (+c.오늘.slice(5, 7)) + '월 ' + (+c.오늘.slice(8, 10)) + '일'));
  if (c.공통기준) {
    box.appendChild(el('div', 'duewhy dueas',
      '계좌별 최종 거래일이 달라 ' +
      (+c.오늘.slice(5, 7)) + '월 ' + (+c.오늘.slice(8, 10)) +
      '일 기준으로 합산했습니다. 계좌별 자료 기간을 확인해주세요.'));
  }
  /* ★ 어디까지의 비교 날짜를 보고 판단했는지는 접든 펴든 같은 무게다 (105차 ③) */
  if (c.잘림) {
    box.appendChild(el('div', 'duewhy dueas',
      (+c.목표.slice(5, 7)) + '월 ' + (+c.목표.slice(8, 10)) +
      '일까지 계산했습니다. 이후 예상 지출을 계산할 비교 자료가 부족합니다.'));
  }
  if (!open) box.classList.add('shut');
  top.addEventListener('click', function () {
    UP.open.__dueOpen = !UP.open.__dueOpen;
    drawResult(months);
  });
  if (open) box.appendChild(duePickBox(months));
  host.appendChild(box);
}
/* ── 116차 앞 ⑤ · 보류 원인 거래 목록 ───────────────────────────────
   ★ 전체 미정 목록만 열어 대표님이 원인을 다시 찾게 하지 않는다.
     보류를 만든 거래만 거래처별로 모아 날짜와 출금 금액을 적는다.
   ★ 이 거래는 지금 보고 계신 달 밖에 있을 수 있다 — 「아직 안 정한 돈」 상자는
     그 달만 보여주므로, 원인 목록은 달과 상관없이 따로 낸다.
   ★ 분류는 기존 거래처별 방식 그대로다 (drawChangeMenu).
     적용 범위를 몰래 넓히거나 좁히지 않는다 */
function drawHoldDetail(host, hold, months) {
  var 묶 = {}, list = [];
  hold.목록.forEach(function (r) {
    var g = 묶[r.이름];
    if (!g) { g = 묶[r.이름] = { name: r.이름, sum: 0, 줄: [] }; list.push(g); }
    g.sum += r.액;
    g.줄.push(r);
  });
  list.sort(function (a, b) { return b.sum - a.sum; });
  var box = el('div', 'dtl');
  list.forEach(function (e) {
    var g = UP.byName[e.name];
    var row = el('div', 'drow');
    var nm = el('div', 'dnm');
    nm.appendChild(el('span', 'mark mine', '?'));
    nm.appendChild(document.createTextNode(showName(e.name)));
    var 날적기 = e.줄.slice(0, 6).map(function (r) {
      return 날글(r.at, r.at.slice(0, 4) !== hold.기준해) + ' ' + won(r.액) + '원';
    }).join(' · ');
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
    if (!g) { btn.disabled = true; return; }
    btn.addEventListener('click', function () {
      if (!menu.hidden) { menu.hidden = true; return; }
      /* 앱이 넘긴 것을 손으로 바꾸시면 다시 넘기지 않는다 (43차 4단계와 같다) */
      if (g.askSkip) unskipAsk(g);
      drawChangeMenu(menu, g, function () { drawResult(months); });
      menu.hidden = false;
    });
  });
  host.appendChild(box);
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
  if (!raw) return null;                       /* 빈 입력을 0원으로 치지 않는다 */
  var v = raw.replace(/[^0-9]/g, '');
  if (!v.length) return null;
  return +v;
}
function 돈칸(값) {
  var e = document.createElement('input');
  e.type = 'text'; e.inputMode = 'numeric'; e.className = 'maninput planmoney';
  if (값 != null) e.value = won(값);
  moneyLive(e);
  return e;
}
function 날칸(값, lo, hi) {
  var e = document.createElement('input');
  e.type = 'date'; e.className = 'maninput plandate';
  e.min = 날짜값(lo); e.max = 날짜값(hi);
  if (값 != null) e.value = 날짜값(값);
  return e;
}
/* 이름이 비슷한 기존 예상 거래처를 찾는다 — 자동으로 병합하지 않는다.
   찾았다고 같은 거래처라고 단정하지도 않는다. 고르시게만 한다 (⑨) */
function 닮은거래처(base, 이름) {
  var a = String(이름 || '').replace(/\s+/g, '').toLowerCase();
  if (!a) return [];
  return base.list.filter(function (x) {
    var b = String(x.거래처).replace(/\s+/g, '').toLowerCase();
    return b === a || (a.length >= 2 && b.indexOf(a) >= 0) ||
           (b.length >= 2 && a.indexOf(b) >= 0);
  }).slice(0, 5);
}

function openDuePlan(c, months, 첫) {
  if (document.querySelector('.fcback')) return;
  var t = dueTable();
  if (!t || !t.n) return;
  var base = null;
  try { base = duePlanBase(t, c.i); } catch (e) { base = null; }
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

  var 화면 = { 이름: 첫 || '목록' };
  /* ★ 116차 통합. 미정 출금 보류 카드에서 열었는가. 계획을 고쳐도 이 값은 안 바뀐다 */
  var 보류중 = !!c.보류;
  function 가기(이름, 옵션) {
    화면 = 옵션 || {};
    화면.이름 = 이름;
    그리기();
  }
  function 반영끝(ok) {
    /* 저장 실패 시 기존 저장본은 보존된다 (planSave 가 새로 쓰지 못한 것뿐이다).
       현재 화면에는 적용됐으므로 그 사실을 그대로 말한다 (⑪) */
    drawResult(months);
    가기('목록', { 알림: ok ? null :
      '변경 내용은 현재 화면에 반영됐지만 저장하지 못했습니다.' });
  }

  function 머리줄() {
    body.appendChild(el('div', 'duewhy',
      '자료 기준일 ' + 날글(c.오늘) + ' · 계산 가능한 마지막 날 ' +
      날짜글(base.끝)));
  }
  function 알림줄() {
    if (화면.알림) body.appendChild(el('div', 'planwarn', 화면.알림));
  }

  /* ── 첫 화면 ─────────────────────────────────────────────── */
  function 목록화면() {
    제목.textContent = '예정 지출 확인·수정';
    머리줄();
    알림줄();
    /* ★ 116차 통합 ④. 미정 출금 보류 카드에서 여신 때만 한 번 적는다.
       이 화면은 지출 금액만 다루고 예상 잔액·최저점·그래프는 내지 않는다.
       저장해도 보류가 풀리지 않는다 (보류 판단은 계획을 넣기 전 기본 예측에서 한다) */
    if (보류중) {
      body.appendChild(el('div', 'planwarn',
        '예정 지출은 수정할 수 있습니다. 예상 잔액은 아직 안 정한 거래를 확인한 뒤 표시 여부를 다시 판단합니다.'));
    }
    var box = planBox(), use = dueDailyUse(t, c.i);
    if (use.적용보류) {
      var w = el('div', 'planwarn',
        '예정 지출 ' + won(use.적용보류) + '건의 반영이 보류되어 있습니다.');
      var wb = el('button', 'b', '확인하기');
      wb.type = 'button';
      wb.addEventListener('click', function () { 가기('적용보류'); });
      w.appendChild(wb);
      body.appendChild(w);
    }

    body.appendChild(el('div', 'planhead', '기존 예상 지출'));
    body.appendChild(el('div', 'fcnote',
      날짜글(base.시작) + ' ~ ' + 날짜글(base.끝) +
      ' 에 나갈 것으로 잡혀 있는 금액입니다.'));
    if (!base.list.length) {
      body.appendChild(el('div', 'fcnote', '이 기간에 잡힌 예상 지출이 없습니다.'));
    }
    base.list.forEach(function (it) {
      var r = el('div', 'planrow');
      var L = el('div', 'planlab');
      L.appendChild(el('div', 'planname', it.거래처));
      L.appendChild(el('div', 'plansub',
        날짜글(it.첫) + ' ~ ' + 날짜글(it.끝)));
      r.appendChild(L);
      r.appendChild(el('div', 'planamt', won(Math.round(it.총액)) + '원'));
      var a = el('div', 'planacts');
      var b1 = el('button', 'b', '수정');
      b1.type = 'button';
      b1.addEventListener('click', function () { 가기('수정', { p: it.거래처 }); });
      var b2 = el('button', 'b', '반영된 내역 보기');
      b2.type = 'button';
      b2.addEventListener('click', function () {
        가기('내역', { p: it.거래처, lo: base.시작, hi: base.끝 });
      });
      a.appendChild(b1); a.appendChild(b2);
      r.appendChild(a);
      body.appendChild(r);
    });

    body.appendChild(el('div', 'planhead', '등록한 예정 지출'));
    if (!box.items.length) {
      body.appendChild(el('div', 'fcnote', '아직 등록한 예정 지출이 없습니다.'));
    }
    box.items.forEach(function (pl) {
      var 적용보류 = use.적용보류목록.indexOf(pl) >= 0;
      var r = el('div', 'planrow');
      var L = el('div', 'planlab');
      L.appendChild(el('div', 'planname',
        pl.유형 === '대체' ? pl.거래처 : (pl.이름 || '새 지출')));
      L.appendChild(el('div', 'plansub', pl.유형 === '대체'
        ? ('기존 예상 대체 · ' + 날글(pl.시작) + ' ~ ' + 날글(pl.종료))
        : ('별도 추가 · ' + ((pl.지급 && pl.지급[0]) ? 날글(pl.지급[0].날) : ''))));
      if (적용보류) L.appendChild(el('div', 'plansub warnsub', '반영 보류 중'));
      r.appendChild(L);
      r.appendChild(el('div', 'planamt', won(duePlanTotal(pl)) + '원'));
      var a = el('div', 'planacts');
      var b1 = el('button', 'b', '수정');
      b1.type = 'button';
      b1.addEventListener('click', function () {
        if (pl.유형 === '대체') 가기('수정', { p: pl.거래처, id: pl.id });
        else 가기('추가', { id: pl.id });
      });
      var b2 = el('button', 'b', pl.유형 === '대체' ? '변경 취소' : '삭제');
      b2.type = 'button';
      b2.addEventListener('click', function () {
        /* ★ ⑩ 대체 계획을 취소하면 기본 예상분이 그대로 살아난다 —
           수정 결과에서 또 빼는 것이 아니라 계획 하나를 목록에서 뺄 뿐이다 */
        var nb = { v: 1, items: box.items.filter(function (y) { return y.id !== pl.id; }) };
        반영끝(planSave(nb));
      });
      a.appendChild(b1); a.appendChild(b2);
      r.appendChild(a);
      body.appendChild(r);
    });

    var add = el('button', 'fcopen', '새 지출 추가');
    add.type = 'button';
    add.addEventListener('click', function () { 가기('추가'); });
    body.appendChild(add);
    /* ★ 116차 통합 ④. 보류 중에는 「예상 잔액과 그래프에 반영됩니다」가 사실과 다르다.
       그때는 위의 한 문장으로 대신하고 여기서 되풀이하지 않는다 */
    body.appendChild(el('div', 'fcnote', 보류중
      ? '원본 거래내역과 월별 결과는 바뀌지 않습니다.'
      : '여기서 고치신 내용은 예상 잔액과 그래프에 함께 반영됩니다. ' +
        '원본 거래내역과 월별 결과는 바뀌지 않습니다.'));
  }

  /* ── 반영된 내역 보기 ────────────────────────────────────── */
  function 내역화면() {
    제목.textContent = '반영된 내역';
    var rows = duePlanRows(base.dd, base.t0, 화면.p, 화면.lo, 화면.hi);
    body.appendChild(el('div', 'planhead', 화면.p));
    body.appendChild(el('div', 'fcnote',
      날짜글(화면.lo) + ' ~ ' + 날짜글(화면.hi) +
      ' 의 예상 지출에 쓰인 과거 거래입니다. ' +
      '같은 거래가 여러 날짜에 쓰이면 각각 따로 적습니다.'));
    var 합 = 0;
    rows.forEach(function (x) { 합 += x.액; });
    body.appendChild(el('div', 'planmine', '합계 ' + won(Math.round(합)) + '원'));
    rows.forEach(function (x) {
      var r = el('div', 'planrow small');
      var L = el('div', 'planlab');
      L.appendChild(el('div', 'plansub',
        날글(날짜값(x.과거), true) + ' 거래 → ' + 날짜글(x.미래) + ' 예상'));
      r.appendChild(L);
      r.appendChild(el('div', 'planamt', won(Math.round(x.액)) + '원'));
      body.appendChild(r);
    });
    if (!rows.length) body.appendChild(el('div', 'fcnote', '해당 기간에 반영된 내역이 없습니다.'));
    뒤로단추();
  }

  function 뒤로단추(텍스트) {
    var b = el('button', 'fcopen', 텍스트 || '목록으로');
    b.type = 'button';
    b.addEventListener('click', function () { 가기('목록'); });
    body.appendChild(b);
  }

  /* ── 기존 예상 수정 ──────────────────────────────────────── */
  function 수정화면() {
    제목.textContent = '기존 예상 수정';
    var box = planBox();
    var 기존 = null;
    if (화면.id) box.items.forEach(function (y) { if (y.id === 화면.id) 기존 = y; });
    var lo = 기존 ? dayNum(기존.시작) : base.시작;
    var hi = 기존 ? dayNum(기존.종료) : base.끝;

    body.appendChild(el('div', 'planhead', 화면.p));
    /* ★ ⑥ 한 번만 표시한다. 같은 말을 화면 두 자리에 두지 않는다 */
    body.appendChild(el('div', 'planwarn',
      '선택한 기간의 이 거래처 예상 지출 전체를 바꿉니다.'));

    var g1 = el('div', 'planfield');
    g1.appendChild(el('label', 'planlabel', '적용 시작일'));
    var d1 = 날칸(lo, base.시작, base.끝);
    g1.appendChild(d1);
    body.appendChild(g1);
    var g2 = el('div', 'planfield');
    g2.appendChild(el('label', 'planlabel', '적용 종료일'));
    var d2 = 날칸(hi, base.시작, base.끝);
    g2.appendChild(d2);
    body.appendChild(g2);

    var 현재줄 = el('div', 'planmine', '');
    body.appendChild(현재줄);

    var g3 = el('div', 'planfield');
    g3.appendChild(el('label', 'planlabel', '새 총액'));
    var amt = 돈칸(기존 ? duePlanTotal(기존) : null);
    var 금액칸 = el('div', 'fixgrp');
    금액칸.appendChild(amt);
    금액칸.appendChild(el('span', 'fixlab', '원'));
    g3.appendChild(금액칸);
    body.appendChild(g3);
    body.appendChild(el('div', 'fcnote',
      '0원을 적으시면 이 기간의 해당 예상 지출을 없앱니다. ' +
      '비워두면 반영하지 않습니다.'));

    /* 지급 일정 */
    body.appendChild(el('div', 'planhead2', '지급 일정'));
    var 방식 = (기존 && 기존.일정) || '유지';
    var 줄들 = (기존 && 기존.일정 === '지정' && 기존.지급 && 기존.지급.length)
      ? 기존.지급.map(function (g) { return { 날: dayNum(g.날), 액: g.액 }; })
      : [{ 날: null, 액: null }];
    var 방식칸 = el('div', 'planpick');
    var r1 = el('button', 'planopt', '기존 예상 일정 유지');
    r1.type = 'button';
    var r2 = el('button', 'planopt', '지급일 직접 지정');
    r2.type = 'button';
    방식칸.appendChild(r1); 방식칸.appendChild(r2);
    body.appendChild(방식칸);
    var 방식말 = el('div', 'fcnote', '');
    body.appendChild(방식말);
    var 지정칸 = el('div', 'planrows');
    body.appendChild(지정칸);

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
      return duePlanSpan(base, 화면.p, k.lo, k.hi);
    }
    function 지정그리기() {
      지정칸.innerHTML = '';
      if (방식 !== '지정') return;
      줄들.forEach(function (g, idx) {
        var r = el('div', 'planrow small');
        var dv = 날칸(g.날, base.시작, base.끝);
        dv.addEventListener('change', function () {
          g.날 = dv.value ? dayNum(dv.value) : null; 새로고침();
        });
        var mv = 돈칸(g.액);
        mv.addEventListener('input', function () { g.액 = 돈읽기(mv.value); 새로고침(); });
        var 칸 = el('div', 'fixgrp');
        칸.appendChild(mv);
        칸.appendChild(el('span', 'fixlab', '원'));
        r.appendChild(dv);
        r.appendChild(칸);
        if (줄들.length > 1) {
          var dl = el('button', 'b', '지우기');
          dl.type = 'button';
          dl.addEventListener('click', function () { 줄들.splice(idx, 1); 지정그리기(); 새로고침(); });
          r.appendChild(dl);
        }
        지정칸.appendChild(r);
      });
      var ad = el('button', 'b', '날짜 추가');
      ad.type = 'button';
      ad.addEventListener('click', function () { 줄들.push({ 날: null, 액: null }); 지정그리기(); });
      지정칸.appendChild(ad);
    }
    function 새로고침() {
      var sp = 현재액();
      현재줄.textContent = sp
        ? ('현재 예상에 포함된 금액 ' + won(Math.round(sp.합)) + '원')
        : '적용 기간을 고르시면 현재 예상 금액을 보여드립니다.';
      r1.className = 'planopt' + (방식 === '유지' ? ' on' : '');
      r2.className = 'planopt' + (방식 === '지정' ? ' on' : '');
      방식말.textContent = 방식 === '유지'
        ? '기존 예상 지출 비중에 따라 날짜별로 나눠 반영합니다.'
        : '한 날짜 또는 여러 날짜에 금액을 적으시면 됩니다. 날짜별 금액 합계가 새 총액과 같아야 반영합니다.';
      var v = 돈읽기(amt.value);
      뒤값.textContent = v === null ? '' : ('변경 후 금액 ' + won(v) + '원');
      if (방식 === '유지' && sp && sp.합 <= 0) {
        msg.textContent = '이 기간에는 기존 예상 지출이 없어 기존 일정을 쓸 수 없습니다. 지급일을 직접 지정해주세요.';
        msg.className = 'planwarn';
      } else if (msg.className === 'planwarn' && msg.textContent.indexOf('기존 일정') >= 0) {
        msg.textContent = ''; msg.className = 'planwarn hide';
      }
    }
    d1.addEventListener('change', 새로고침);
    d2.addEventListener('change', 새로고침);
    amt.addEventListener('input', 새로고침);
    r1.addEventListener('click', function () { 방식 = '유지'; 지정그리기(); 새로고침(); });
    r2.addEventListener('click', function () { 방식 = '지정'; 지정그리기(); 새로고침(); });

    body.appendChild(뒤값);
    body.appendChild(msg);

    var ok = el('button', 'fcopen', '변경 반영');
    ok.type = 'button';
    ok.addEventListener('click', function () {
      function 틀림(s) { msg.textContent = s; msg.className = 'planwarn'; }
      var k = 기간읽기();
      if (k.lo === null || k.hi === null) return 틀림('적용 시작일과 종료일을 골라주세요.');
      if (k.hi < k.lo) return 틀림('적용 종료일이 시작일보다 앞섭니다.');
      if (k.lo < base.시작 || k.hi > base.끝) {
        return 틀림('적용 기간은 ' + 날짜글(base.시작) + ' ~ ' + 날짜글(base.끝) +
                    ' 안에서 골라주세요. 그 밖은 아직 계산할 수 없습니다.');
      }
      var v = 돈읽기(amt.value);
      if (v === null) return 틀림('새 총액을 적어주세요. 0원도 적으실 수 있습니다.');
      var 부딪 = duePlanClash(box, 화면.p, k.lo, k.hi, 화면.id);
      if (부딪) {
        return 틀림('이 거래처의 ' + 날글(부딪.시작) + ' ~ ' + 날글(부딪.종료) +
                    ' 계획과 기간이 겹칩니다. 그 계획을 수정해주세요.');
      }
      var sp = duePlanSpan(base, 화면.p, k.lo, k.hi);
      var 지급 = [];
      if (방식 === '유지') {
        if (sp.합 <= 0) return 틀림('이 기간에는 기존 예상 지출이 없어 기존 일정을 쓸 수 없습니다.');
        var 나눔 = 몫나누기(v, sp.값);
        if (!나눔) return 틀림('기존 예상 비중을 구할 수 없습니다. 지급일을 직접 지정해주세요.');
        for (var q = 0; q < 나눔.length; q++) {
          if (나눔[q] > 0) 지급.push({ 날: 날짜값(sp.날[q]), 액: 나눔[q] });
        }
      } else {
        var 합 = 0, 빈 = false;
        줄들.forEach(function (g) {
          if (g.날 === null || g.액 === null) { 빈 = true; return; }
          합 += g.액;
        });
        if (v > 0 && 빈) return 틀림('지급일과 금액을 모두 적어주세요. 빈 칸은 0원으로 치지 않습니다.');
        if (v > 0) {
          for (var w = 0; w < 줄들.length; w++) {
            var 날 = 줄들[w].날;
            if (날 < base.시작 || 날 > base.끝) {
              return 틀림('지급일은 ' + 날짜글(base.시작) + ' ~ ' + 날짜글(base.끝) +
                          ' 안에서 골라주세요. 그 밖은 아직 계산할 수 없습니다.');
            }
          }
          if (합 !== v) {
            return 틀림('날짜별 금액 합계(' + won(합) + '원)가 새 총액(' + won(v) +
                        '원)과 다릅니다.');
          }
          줄들.forEach(function (g) { if (g.액 > 0) 지급.push({ 날: 날짜값(g.날), 액: g.액 }); });
        }
      }
      var pl = { id: 화면.id || planNewId(), 유형: '대체', 거래처: 화면.p,
                 시작: 날짜값(k.lo), 종료: 날짜값(k.hi), 총액: v,
                 일정: 방식, 지급: 지급, 확인: true, 자료: base.지문, 모델: DUE_MODEL };
      /* ★ ⑩ 같은 계획을 다시 수정하면 기존 계획을 교체한다 — 쌓지 않는다 */
      var items = box.items.filter(function (y) { return y.id !== pl.id; });
      items.push(pl);
      반영끝(planSave({ v: 1, items: items }));
    });
    body.appendChild(ok);
    var view = el('button', 'fcopen', '반영된 내역 보기');
    view.type = 'button';
    view.addEventListener('click', function () {
      var k = 기간읽기();
      가기('내역', { p: 화면.p,
                     lo: k.lo === null ? base.시작 : k.lo,
                     hi: k.hi === null ? base.끝 : k.hi });
    });
    body.appendChild(view);
    body.appendChild(el('div', 'fcnote',
      '이 기간 밖의 같은 거래처 예상 지출은 그대로 둡니다. ' +
      '일부 지급만 고르는 상세 수정은 아직 없습니다.'));
    뒤로단추();
    지정그리기();
    새로고침();
  }

  /* ── 새 지출 추가 ────────────────────────────────────────── */
  function 추가화면() {
    제목.textContent = '새 지출 추가';
    var box = planBox();
    var 기존 = null;
    if (화면.id) box.items.forEach(function (y) { if (y.id === 화면.id) 기존 = y; });

    var g1 = el('div', 'planfield');
    g1.appendChild(el('label', 'planlabel', '이름'));
    var nm = document.createElement('input');
    nm.type = 'text'; nm.className = 'maninput planname-in';
    nm.placeholder = '지출 이름';
    if (기존) nm.value = 기존.이름 || '';
    g1.appendChild(nm);
    body.appendChild(g1);

    var g2 = el('div', 'planfield');
    g2.appendChild(el('label', 'planlabel', '지급일'));
    var dv = 날칸((기존 && 기존.지급 && 기존.지급[0]) ? dayNum(기존.지급[0].날) : null,
                  base.시작, base.끝);
    g2.appendChild(dv);
    body.appendChild(g2);

    var g3 = el('div', 'planfield');
    g3.appendChild(el('label', 'planlabel', '금액'));
    var amt = 돈칸(기존 ? duePlanTotal(기존) : null);
    var 금액칸 = el('div', 'fixgrp');
    금액칸.appendChild(amt);
    금액칸.appendChild(el('span', 'fixlab', '원'));
    g3.appendChild(금액칸);
    body.appendChild(g3);

    var 안내 = el('div', 'planfound');
    body.appendChild(안내);
    var msg = el('div', 'planwarn hide', '');
    body.appendChild(msg);

    function 살피기() {
      안내.innerHTML = '';
      var 닮 = 닮은거래처(base, nm.value);
      if (닮.length) {
        안내.appendChild(el('div', 'planwarn2',
          '이 거래처의 지출이 예상에 포함되어 있습니다.'));
        닮.forEach(function (it) {
          var r = el('div', 'planrow small');
          var L = el('div', 'planlab');
          L.appendChild(el('div', 'planname', it.거래처));
          L.appendChild(el('div', 'plansub', 날짜글(it.첫) + ' ~ ' + 날짜글(it.끝)));
          r.appendChild(L);
          r.appendChild(el('div', 'planamt', won(Math.round(it.총액)) + '원'));
          var b = el('button', 'b', '기존 예상 수정');
          b.type = 'button';
          b.addEventListener('click', function () { 가기('수정', { p: it.거래처 }); });
          r.appendChild(b);
          안내.appendChild(r);
        });
        안내.appendChild(el('div', 'fcnote',
          '같은 곳이 아니라면 아래에서 별도 지출로 추가하시면 됩니다.'));
      } else if (String(nm.value).trim()) {
        안내.appendChild(el('div', 'planwarn2',
          '기존 예상에서 연결할 지출을 찾지 못했습니다.'));
        /* ★ ⑨ 「기존 예상에 없는 지출」이라고 단정하지 않는다 */
        안내.appendChild(el('div', 'fcnote',
          '기존 예상에 없는 지출인지는 확인하지 못했습니다. ' +
          '별도 추가가 맞는지 확인해주세요.'));
      }
    }
    nm.addEventListener('input', 살피기);
    살피기();

    var ok = el('button', 'fcopen', 기존 ? '변경 반영' : '별도 지출로 추가');
    ok.type = 'button';
    ok.addEventListener('click', function () {
      function 틀림(s) { msg.textContent = s; msg.className = 'planwarn'; }
      var 이름 = String(nm.value).trim();
      if (!이름) return 틀림('지출 이름을 적어주세요.');
      if (!dv.value) return 틀림('지급일을 골라주세요.');
      var 날 = dayNum(dv.value);
      if (날 < base.시작 || 날 > base.끝) {
        return 틀림('지급일은 ' + 날짜글(base.시작) + ' ~ ' + 날짜글(base.끝) +
                    ' 안에서 골라주세요. 그 밖은 아직 계산할 수 없습니다.');
      }
      var v = 돈읽기(amt.value);
      if (v === null) return 틀림('금액을 적어주세요.');
      var pl = { id: 화면.id || planNewId(), 유형: '추가', 이름: 이름,
                 총액: v, 일정: '지정',
                 지급: v > 0 ? [{ 날: 날짜값(날), 액: v }] : [],
                 확인: true, 자료: base.지문, 모델: DUE_MODEL };
      var items = box.items.filter(function (y) { return y.id !== pl.id; });
      items.push(pl);
      반영끝(planSave({ v: 1, items: items }));
    });
    body.appendChild(ok);
    body.appendChild(el('div', 'fcnote',
      '새 지출은 기존 예상에 연결하지 않고 한 번 더합니다.'));
    뒤로단추();
  }

  /* ── 보류 확인 (⑫) ──────────────────────────────────────── */
  function 적용보류화면() {
    제목.textContent = '예정 지출 확인';
    var use = dueDailyUse(t, c.i), box = planBox();
    /* ★ 118차 ③. 보류 까닭이 둘이다 — 예측 모델이 바뀐 것과 자료가 바뀐 것.
       실제로 해당하는 까닭만 적는다 */
    var 옛모델 = use.적용보류목록.filter(function (pl) { return (pl.모델 || 1) !== DUE_MODEL; });
    var 까닭 = [];
    if (옛모델.length) 까닭.push('예상 지출에 사업 외 출금도 들어가도록 계산 범위가 바뀌었습니다.');
    if (옛모델.length < use.적용보류목록.length) {
      /* ★ 116차 통합 ⑥. 재업로드만이 아니라 분류를 바꿔도 여기로 온다. 까닭을 하나로 단정하지 않는다 */
      까닭.push('거래내역이나 분류가 바뀌어 예측에 쓰는 자료가 달라졌습니다.');
    }
    body.appendChild(el('div', 'fcnote', 까닭.join(' ') + (까닭.length ? ' ' : '') +
      '이전 차감액을 그대로 쓰지 않고 보류했습니다. 확인 후 다시 반영하실 수 있습니다.'));
    if (!use.적용보류목록.length) {
      body.appendChild(el('div', 'fcnote', '보류된 예정 지출이 없습니다.'));
      뒤로단추();
      return;
    }
    use.적용보류목록.forEach(function (pl) {
      var wrap = el('div', 'plancheck');
      wrap.appendChild(el('div', 'planname',
        pl.유형 === '대체' ? pl.거래처 : (pl.이름 || '새 지출')));
      wrap.appendChild(el('div', 'plansub', '저장된 총액 ' + won(duePlanTotal(pl)) + '원'));
      if (pl.유형 === '대체') {
        var sp = duePlanSpan(base, pl.거래처, dayNum(pl.시작), dayNum(pl.종료));
        wrap.appendChild(el('div', 'plansub',
          '새 기본 예상분 ' + won(Math.round(sp.합)) + '원 (' +
          날글(pl.시작) + ' ~ ' + 날글(pl.종료) + ')'));
      }
      /* ★ 118차 ③. 예전 모델에서 「추가」로 넣은 계획은 새 기본 예상과 겹칠 수 있다.
         이름이 비슷한 기존 예상을 보여드리고 고르시게 한다. 같은 지출이라고 단정하지 않는다 */
      if (pl.유형 !== '대체' && (pl.모델 || 1) !== DUE_MODEL) {
        var 닮 = 닮은거래처(base, pl.이름);
        if (닮.length) {
          wrap.appendChild(el('div', 'planwarn2',
            '기본 예상에 이름이 비슷한 지출이 있습니다. 같은 지출이면 다시 반영하지 마시고 계획을 취소하거나 기존 예상을 수정해주세요.'));
          닮.forEach(function (it) {
            var r = el('div', 'planrow small');
            var L = el('div', 'planlab');
            L.appendChild(el('div', 'planname', it.거래처));
            L.appendChild(el('div', 'plansub', 날짜글(it.첫) + ' ~ ' + 날짜글(it.끝)));
            r.appendChild(L);
            r.appendChild(el('div', 'planamt', won(Math.round(it.총액)) + '원'));
            var eb = el('button', 'b', '기존 예상 수정');
            eb.type = 'button';
            eb.addEventListener('click', function () { 가기('수정', { p: it.거래처 }); });
            r.appendChild(eb);
            wrap.appendChild(r);
          });
        } else {
          wrap.appendChild(el('div', 'plansub',
            '기본 예상에서 이름이 비슷한 지출을 찾지 못했습니다. 같은 지출이 없는지는 확인하지 못했습니다.'));
        }
      }
      /* 지난 지급분과 남은 지급분을 가른다. 지난 것을 지급 완료로 단정하지 않는다 */
      var 지난 = [], 남은 = [], 새날 = {};
      (pl.지급 || []).forEach(function (g, idx) {
        if (dayNum(g.날) <= base.t0) 지난.push({ i: idx, g: g });
        else 남은.push({ i: idx, g: g });
      });
      if (지난.length) {
        wrap.appendChild(el('div', 'planwarn2',
          '지급일이 새 자료 기준일보다 앞섭니다. 지급 완료 여부는 확인하지 않았습니다.'));
        지난.forEach(function (o) {
          var r = el('div', 'planrow small');
          var L = el('div', 'planlab');
          L.appendChild(el('div', 'plansub', 날글(o.g.날) + ' · ' + won(o.g.액) + '원'));
          r.appendChild(L);
          var nd = 날칸(null, base.시작, base.끝);
          nd.addEventListener('change', function () {
            새날[o.i] = nd.value ? dayNum(nd.value) : null;
          });
          r.appendChild(nd);
          wrap.appendChild(r);
        });
        wrap.appendChild(el('div', 'fcnote',
          '아직 나가지 않았다면 새 지급일을 정해주세요. ' +
          '정하지 않은 지난 지급분은 반영하지 않습니다. 남은 기간에 자동으로 다시 넣지 않습니다.'));
      }
      if (남은.length) {
        wrap.appendChild(el('div', 'plansub', '남은 지급분 ' +
          남은.map(function (o) { return 날글(o.g.날) + ' ' + won(o.g.액) + '원'; }).join(' · ')));
      }
      var 말 = el('div', 'planwarn hide', '');
      wrap.appendChild(말);
      var acts = el('div', 'planacts');
      var a1 = el('button', 'b on', '다시 반영');
      a1.type = 'button';
      a1.addEventListener('click', function () {
        var 지급 = [];
        남은.forEach(function (o) { 지급.push({ 날: o.g.날, 액: o.g.액 }); });
        var 막힘 = null;
        지난.forEach(function (o) {
          var d = 새날[o.i];
          if (d == null) return;                 /* 안 정하신 것은 반영하지 않는다 */
          if (d < base.시작 || d > base.끝) {
            막힘 = '새 지급일은 ' + 날짜글(base.시작) + ' ~ ' + 날짜글(base.끝) + ' 안에서 골라주세요.';
            return;
          }
          지급.push({ 날: 날짜값(d), 액: o.g.액 });
        });
        if (막힘) { 말.textContent = 막힘; 말.className = 'planwarn'; return; }
        지급.sort(function (a, b) { return a.날 < b.날 ? -1 : (a.날 > b.날 ? 1 : 0); });
        var neo = { id: pl.id, 유형: pl.유형, 거래처: pl.거래처, 이름: pl.이름,
                    시작: pl.시작, 종료: pl.종료,
                    총액: 지급.reduce(function (s, g) { return s + g.액; }, 0),
                    일정: pl.일정, 지급: 지급, 확인: true, 자료: base.지문, 모델: DUE_MODEL };
        var items = box.items.map(function (y) { return y.id === pl.id ? neo : y; });
        반영끝(planSave({ v: 1, items: items }));
      });
      var a2 = el('button', 'b', '계획 취소');
      a2.type = 'button';
      a2.addEventListener('click', function () {
        var items = box.items.filter(function (y) { return y.id !== pl.id; });
        반영끝(planSave({ v: 1, items: items }));
      });
      acts.appendChild(a1); acts.appendChild(a2);
      wrap.appendChild(acts);
      body.appendChild(wrap);
    });
    뒤로단추();
  }

  function 그리기() {
    body.innerHTML = '';
    body.scrollTop = 0;
    if (화면.이름 === '내역') 내역화면();
    else if (화면.이름 === '수정') 수정화면();
    else if (화면.이름 === '추가') 추가화면();
    else if (화면.이름 === '적용보류') 적용보류화면();
    else 목록화면();
  }
  그리기();

  var 닫힘 = false;
  function 닫기() {
    if (닫힘) return;
    닫힘 = true;
    if (back.parentNode) back.parentNode.removeChild(back);
    document.body.style.overflow = 뒤스크롤;
    document.removeEventListener('keydown', 키);
  }
  function 키(e) { if (e.key === 'Escape') 닫기(); }
  document.addEventListener('keydown', 키);
  x.addEventListener('click', 닫기);
  x2.addEventListener('click', 닫기);
  back.addEventListener('click', function (e) { if (e.target === back) 닫기(); });
}
/* ── 114차 · 그래프 화면 ──────────────────────────────────────────
   ★ 카드 안에 펼침을 또 만들지 않는다. 이건 새 화면이지 카드 속 펼침이 아니다.
     그래서 카드를 다시 그리지 않고, 닫아도 카드의 날짜와 펼침 상태가 그대로다.
   ★ 78차 전체보기(.imgprev*)의 머리·바닥을 그대로 쓴다 (49차) */
function openDueGraph(c, cv) {
  if (document.querySelector('.fcback')) return;
  var pts = dueGraphPts(c, cv);
  if (!pts) return;
  useScreen('예상 잔액 그래프');
  var 뒤스크롤 = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  var back = el('div', 'fcback');
  var pane = el('div', 'fcpane');
  pane.setAttribute('role', 'dialog');
  pane.setAttribute('aria-modal', 'true');
  pane.setAttribute('aria-label', '예상 잔액 흐름');

  var head = el('div', 'imgprevhead');
  head.appendChild(el('div', 'imgprevtitle', '예상 잔액 흐름'));
  var acts = el('div', 'imgprevheadacts');
  var x = el('button', 'b', '닫기');
  x.type = 'button';
  acts.appendChild(x);
  head.appendChild(acts);
  pane.appendChild(head);

  var body = el('div', 'fcbody');
  /* 머리줄 — 카드와 같은 두 날짜다. 새 날짜를 만들지 않는다 */
  body.appendChild(el('div', 'duewhy',
    '자료 기준일 ' + 날글(c.오늘) + ' · 분석 종료일 ' + 날글(c.목표)));
  var wrap = el('div', 'fcwrap');
  body.appendChild(wrap);
  drawDueGraph(wrap, c, cv, pts);
  /* ── 114차 보정 둘 ② · 계산이 중단됐을 때 그래프 안에도 알린다 ──────
     고른 종료일이 9월 10일인데 머리에 「분석 종료일 9월 3일」만 있으면,
     사장님은 자기가 고른 날짜가 바뀐 것으로 읽는다.
     폰에서는 이 그림이 전체 화면이라 카드의 잘림 줄이 안 보인다.
     ★ 날짜 둘 다 계산값으로 만든다. 글에 박지 않는다 —
       c.잘림 이 고르신 종료일, c.목표 가 실제로 계산된 마지막 날이다.
     ★ 전체 기간을 계산했으면 c.잘림 이 null 이라 이 줄이 아예 안 나온다 */
  if (c.잘림) {
    body.appendChild(el('div', 'fccut',
      '선택한 종료일 ' + 날글(c.잘림) + ' · 계산된 마지막 날 ' + 날글(c.목표)));
    body.appendChild(el('div', 'fcnote',
      '이후 예상 지출을 계산할 비교 자료가 부족해 ' + 날글(c.목표) + '까지 표시했습니다.'));
  }
  /* ★ 가정을 그림 아래에 적는다 (요청서 ④) */
  body.appendChild(el('div', 'fcnote',
    '같은 날에는 출금이 입금보다 먼저 이뤄지는 것으로 가정했습니다.'));
  body.appendChild(el('div', 'fcnote',
    '과거 입출금을 바탕으로 한 예상이며 실제 잔액은 달라질 수 있습니다.'));
  pane.appendChild(body);

  var foot = el('div', 'imgprevfoot');
  var x2 = el('button', 'b on', '닫기');
  x2.type = 'button';
  foot.appendChild(x2);
  pane.appendChild(foot);

  back.appendChild(pane);
  document.body.appendChild(back);
  /* ★ 116차 앞 ④. 보류로 바뀌면 이 그림이 남아 있으면 안 된다.
     닫는 길을 하나 들고 있는다 (닫기 는 함수 선언이라 여기서 이미 잡힌다) */
  DUE_GRAPH_CLOSE = 닫기;

  var 닫힘 = false;
  function 닫기() {
    if (닫힘) return;
    닫힘 = true;
    if (back.parentNode) back.parentNode.removeChild(back);
    document.body.style.overflow = 뒤스크롤;
    document.removeEventListener('keydown', 키);
    DUE_GRAPH_CLOSE = null;
  }
  function 키(e) { if (e.key === 'Escape') { e.preventDefault(); 닫기(); } }
  x.addEventListener('click', 닫기);
  x2.addEventListener('click', 닫기);
  /* 바깥을 눌러도 닫힌다 — PC 대화상자에서 기대되는 동작이다.
     상자 안을 누른 것은 안 닫는다 */
  back.addEventListener('click', function (e) { if (e.target === back) 닫기(); });
  document.addEventListener('keydown', 키);
  try { x.focus({ preventScroll: true }); } catch (e) { try { x.focus(); } catch (e2) { } }
}
var FC_GH = 250;           /* 그래프 높이 (날짜 줄 포함) */
/* 점과 점을 곧은 선으로 잇는다. 부드러운 곡선 보간을 안 쓴다 —
   계산에 없는 고점·저점이 생긴다 (요청서 ④) */
function drawDueGraph(host, c, cv, pts) {
  /* 날을 고르면 이 함수가 제 자리를 다시 그린다. 고른 날은 host 에 붙어 있어
     innerHTML 을 비워도 살아남는다 */
  function 그리기다시() { drawDueGraph(host, c, cv, pts); }
  host.innerHTML = '';
  /* ★ 지나온 쪽을 앞날과 비슷한 길이로 자른다. 30일로 고정했더니
     19일짜리 앞날이 오른쪽 3분의 1에 눌려 톱니가 뭉개졌다 (실측).
     지나온 쪽은 「어디서 오던 길인가」를 보이는 것이 일이라 길 필요가 없다 */
  var 지난 = dueGraphPast(c, Math.max(10, Math.min(21, pts.끝 - pts.시작)));
  var 앞 = pts.점;
  /* 세로 범위 — 지난 것과 앞날을 다 담는다. 0원은 늘 넣는다 (마이너스가 보이게) */
  var lo = 0, hi = 0, i, v;
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
  host.appendChild(chHead('예상 잔액 (' + U.name + ')',
    [['know', '— 지나온 잔액'], ['kprof', '— 예상 · 0원 미만은 빨강']], null));

  var 첫날 = 지난.length ? Math.min(지난[0].날, pts.시작) : pts.시작;
  var 끝날 = pts.끝;
  var box = el('div', 'dchart');
  host.appendChild(box);
  fitChart(box, FC_GH, function (svg, W) {
    var LEFT = axisLeft(ticks), RIGHT = 12, PAD = 16, BOT = 18;
    var PH = FC_GH - BOT;
    var 폭 = Math.max(1, 끝날 - 첫날);
    function X(d) { return LEFT + (d - 첫날) / 폭 * (W - LEFT - RIGHT); }
    function Y(v) {
      if (rg.hi === rg.lo) return PAD;
      return PAD + (rg.hi - v) / (rg.hi - rg.lo) * (PH - PAD * 2);
    }
    /* 눈금 */
    ticks.forEach(function (tv) {
      svg.appendChild(svgEl('line', { x1: LEFT - 4, y1: Y(tv), x2: W - RIGHT, y2: Y(tv),
        stroke: 'var(--line)', 'stroke-width': tv === 0 ? 1.2 : 0.6,
        opacity: tv === 0 ? '0.95' : '0.55' }));
      var tx = svgEl('text', { x: LEFT - 8, y: Y(tv) + 3.5, 'text-anchor': 'end',
        'font-size': '11', fill: 'var(--gray)' });
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
      svg.appendChild(svgEl('rect', { x: X(pts.시작),
        y: 0, width: Math.max(0, X(계산끝) - X(pts.시작)),
        height: 회색밑, fill: '#000000', opacity: '0.04' }));
    }
    /* ★ 요청서 ③-3. 0원 밑을 빨강으로 가른다. 「예상이라서」 빨강을 쓰지 않는다.
       0원 위로는 빨간 선이 한 줄도 안 나온다.
       ★ 회색보다 뒤에 그린다 — 0원 밑에서는 이쪽이 이겨야 한다 */
    if (rg.lo < 0) {
      svg.appendChild(svgEl('rect', { x: LEFT, y: Y(0), width: Math.max(0, W - LEFT - RIGHT),
        height: Math.max(0, Y(rg.lo) - Y(0)), fill: 'var(--warn)', opacity: '0.07' }));
    }
    /* 지나온 잔액 — 자료에 적힌 값. 없는 날에서 선을 끊는다 (완료 기준 11) */
    var seg = [];
    function 잇기(list, 색, 점선) {
      if (list.length < 2) return;
      var a = { d: 'M ' + list.map(function (p) { return X(p.날) + ' ' + Y(p.값); }).join(' L '),
                fill: 'none', stroke: 색, 'stroke-width': 2,
                'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
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
      var 조각 = [], 지금 = null, 길이 = 0;
      function 색(v) { return v < 0 ? 'var(--warn)' : 'var(--brand)'; }
      function 끊기() {
        if (지금 && 지금.xy.length >= 2) 조각.push(지금);
      }
      var x0 = X(list[0].날), y0 = Y(list[0].값);
      지금 = { 색: 색(list[0].값), xy: [[x0, y0]], 시작: 0 };
      for (var k = 1; k < list.length; k++) {
        var a = list[k - 1], b = list[k];
        var ax = X(a.날), ay = Y(a.값), bx = X(b.날), by = Y(b.값);
        if (색(a.값) !== 색(b.값)) {
          /* 두 점 사이에서 0원이 되는 자리 */
          var t = (0 - a.값) / (b.값 - a.값);
          var cx = ax + (bx - ax) * t, cy = Y(0);
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
        svg.appendChild(svgEl('path', {
          d: 'M ' + g.xy.map(function (q) { return q[0] + ' ' + q[1]; }).join(' L '),
          fill: 'none', stroke: g.색, 'stroke-width': 2,
          'stroke-linejoin': 'round', 'stroke-linecap': 'round',
          'stroke-dasharray': '5 4', 'stroke-dashoffset': String(-g.시작) }));
      });
    }
    지난.forEach(function (p) {
      if (p.값 === null) { 잇기(seg, 'var(--now)'); seg = []; return; }
      seg.push(p);
    });
    잇기(seg, 'var(--now)');
    /* 앞날 — 예상. 점과 점을 곧은 선으로 잇는다.
       ★ 114차 보정 둘 ①. 선 자체를 점선으로 둔다. 색만 다르면 「예상」이 안 읽힌다 —
         세로 경계선만 점선으로 두는 것으로는 모자란다 */
    잇기0(앞);
    /* ★ 요청서 ③-2. 예상이 시작되는 자리를 점선으로 가르고 이름을 적는다 */
    svg.appendChild(svgEl('line', { x1: X(pts.시작), y1: PAD - 8, x2: X(pts.시작), y2: PH,
      stroke: 'var(--gray)', 'stroke-width': 1.2, 'stroke-dasharray': '4 4', opacity: '0.85' }));
    var lab = svgEl('text', { x: X(pts.시작) + 5, y: PAD - 1, 'text-anchor': 'start',
      'font-size': '11', 'font-weight': '700', fill: 'var(--gray)' });
    lab.textContent = '예상';
    svg.appendChild(lab);
    /* ★ 요청서 ③-4. 종료일 예상 잔액과 기간 중 최저 예상 잔액을 표시한다.
       ★ 값은 카드가 말하는 그 값이다 — 다시 계산하지 않는다 */
    /* ★ 알약이 서로 겹치지 않게 놓는다. 최저와 끝값이 같은 날에 서면
       둘이 포개져 아무것도 안 읽힌다 (실측 — 9월 10일에 둘 다 섰다).
       놓은 자리를 기억해 두고, 겹치면 아래로 밀어 내린다 */
    var 놓은 = [];
    function 알약(dx, vy, 글, 색, 아래로) {
      var pw = Math.ceil(textW(글, 11)) + 16, ph = 20;
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
          py = (o.y + o.h + 5 + ph <= PH) ? o.y + o.h + 5 : Math.max(1, o.y - ph - 5);
          g = -1;                      /* 자리를 옮겼으니 처음부터 다시 견준다 */
        }
      }
      놓은.push({ x: px, y: py, w: pw, h: ph });
      /* 점과 알약을 가는 선으로 잇는다 — 알약을 선에서 떼어 놓았으니
         어느 점의 값인지 보여야 한다 */
      if (py > vy + 2) {
        svg.appendChild(svgEl('line', { x1: dx, y1: vy + 4, x2: dx, y2: py,
          stroke: 색, 'stroke-width': 1, opacity: '0.55' }));
      }
      svg.appendChild(svgEl('rect', { x: px, y: py, width: pw, height: ph, rx: 10, fill: 색 }));
      var tt = svgEl('text', { x: px + pw / 2, y: py + 14, 'text-anchor': 'middle',
        'font-size': '11', 'font-weight': '700', fill: 'var(--paper)' });
      tt.textContent = 글;
      svg.appendChild(tt);
    }
    var 끝점 = 앞[앞.length - 1];
    var 최저날 = cv.최저날수, 최저값 = cv.최저;
    /* 최저 자리의 점을 찾는다 — 「입금 전」이면 그렇게 적는다 (요청서 ④) */
    var 최저점 = null;
    for (i = 앞.length - 1; i >= 0; i--) {
      if (앞[i].날 === 최저날 && Math.round(앞[i].값) === 최저값) { 최저점 = 앞[i]; break; }
    }
    if (!최저점) {
      for (i = 0; i < 앞.length; i++) {
        if (앞[i].날 === 최저날) { 최저점 = 앞[i]; break; }
      }
    }
    if (최저점) {
      svg.appendChild(svgEl('circle', { cx: X(최저점.날), cy: Y(최저점.값), r: 3.6,
        fill: 'var(--paper)', stroke: 최저값 < 0 ? 'var(--warn)' : 'var(--brand)',
        'stroke-width': 2 }));
      /* ★ 114차 보정 ①. 기준일 잔액이 최저일 때는 「최저 예상 잔액」이라 안 부른다.
         그건 예상이 아니라 자료에 적힌 실제 잔액이다 —
         카드도 같은 자리에서 「자료 기준일 잔액」이라 부른다 (111차 ①).
       ★ 알약을 선 아래 빈 자리에 놓는다. 선 위에 얹으면 그림을 가린다 (실측) */
      알약(X(최저점.날), Y(최저점.값),
           최저점.갈래 === '기준'
             ? '자료 기준일 잔액 ' + won(최저값) + '원'
             : '최저 ' + won(최저값) + '원' +
               (최저점.갈래 === '입금전' ? ' · 입금 전' : ''),
           최저값 < 0 ? 'var(--warn)' : 'var(--brand)', true);
    }
    /* 끝값 — 최저와 같은 자리면 알약을 겹쳐 놓지 않는다 */
    var 같자리 = 최저점 && 최저점.날 === 끝점.날 && 최저점.값 === 끝점.값;
    /* ★ 119차. 끝점과 끝값 금액표도 예상 선과 같은 기준이다 (0원 미만만 빨강) */
    var 끝색 = 끝점.값 < 0 ? 'var(--warn)' : 'var(--brand)';
    svg.appendChild(svgEl('circle', { cx: X(끝점.날), cy: Y(끝점.값), r: 3.2,
      fill: 'var(--paper)', stroke: 끝색, 'stroke-width': 2 }));
    if (!같자리) {
      알약(X(끝점.날), Y(끝점.값), 날글(c.목표) + ' ' + won(c.예상) + '원',
           끝색, true);
    }
    /* 날짜 줄 — 양 끝과 기준일 */
    [[첫날, 'start'], [pts.시작, 'middle'], [끝날, 'end']].forEach(function (p) {
      var tx = svgEl('text', { x: X(p[0]), y: PH + 13, 'text-anchor': p[1],
        'font-size': '10', fill: 'var(--gray)' });
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
      svg.appendChild(svgEl('rect', { x: X(고른) - bw / 2, y: PAD - 10,
        width: bw, height: PH - PAD + 10, fill: 'var(--now)', opacity: '0.10' }));
    }
    var hits = svgEl('g', {});
    for (var hd = 첫날; hd <= 끝날; hd++) {
      (function (day) {
        var hw = Math.max(8, (W - LEFT - RIGHT) / Math.max(1, 끝날 - 첫날));
        var r = svgEl('rect', { x: X(day) - hw / 2, y: 0, width: hw, height: PH,
          fill: 'transparent', style: 'cursor:pointer' });
        r.addEventListener('click', function () {
          host.__고른날 = (host.__고른날 === day) ? null : day;
          그리기다시();
        });
        hits.appendChild(r);
      })(hd);
    }
    svg.appendChild(hits);
  });
  /* 그림 아래 값 — 상세 금액은 원 단위다 (요청서 ③-5) */
  var key = el('div', 'fckey');
  var k1 = el('div');
  k1.appendChild(document.createTextNode(날글(c.목표) + ' 예상 잔액 '));
  k1.appendChild(el('b', null, won(c.예상) + '원'));
  key.appendChild(k1);
  var k2 = el('div');
  /* ★ 114차 보정 ①. 기준일 잔액이 최저면 그 이름으로 부른다 */
  var 기준최저 = cv.최저날수 === pts.시작;
  k2.appendChild(document.createTextNode(
    기준최저 ? '자료 기준일 잔액 ' : ('기간 중 최저 ' + cv.최저날 + ' ')));
  k2.appendChild(el('b', null, won(cv.최저) + '원'));
  key.appendChild(k2);
  host.appendChild(key);

  /* ── 114차 보정 ④ · 고른 날의 상세 ────────────────────────────────
     같은 날의 두 시점을 각각 적는다. 잔액이 같아 마커가 하나로 보여도
     여기서는 둘이 따로 선다 — 겹쳐 보이는 것과 자료가 하나인 것은 다르다 */
  var 고른날 = host.__고른날;
  var det = el('div', 'fcdet');
  if (고른날 == null) {
    det.appendChild(el('div', 'fcdethint', '그래프에서 날짜를 누르면 그날 잔액을 봅니다.'));
  } else {
    var 날문 = 날글(new Date(고른날 * 86400000).toISOString().slice(0, 10));
    var 앞것 = pts.점.filter(function (p) { return p.날 === 고른날; });
    det.appendChild(el('div', 'fcdetday', 날문));
    if (!앞것.length) {
      /* 기준일 앞 — 자료에 적힌 실제 잔액이다. 예상이 아니다 */
      var 지난것 = null;
      지난.forEach(function (p) { if (p.날 === 고른날) 지난것 = p; });
      det.appendChild(el('div', 'fcdetrow',
        지난것 && 지난것.값 !== null
          ? '계좌 잔액 ' + won(Math.round(지난것.값)) + '원 (자료에 적힌 값)'
          : '이 날은 잔액을 복원할 수 없어 계산에 안 넣었습니다.'));
    } else if (앞것.length === 1 && 앞것[0].갈래 === '기준') {
      det.appendChild(el('div', 'fcdetrow',
        '자료 기준일 잔액 ' + won(Math.round(앞것[0].값)) + '원 (자료에 적힌 값)'));
    } else {
      var 전 = null, 후 = null;
      앞것.forEach(function (p) {
        if (p.갈래 === '입금전') 전 = p;
        if (p.갈래 === '일말') 후 = p;
        if (p.갈래 === '기준') { 전 = 전 || p; 후 = 후 || p; }
      });
      if (전) det.appendChild(el('div', 'fcdetrow',
        '입금 전 ' + won(Math.round(전.값)) + '원'));
      if (후) det.appendChild(el('div', 'fcdetrow',
        '당일 반영 후 ' + won(Math.round(후.값)) + '원'));
      /* ★ 계산값으로 견준다. 반올림한 표시값이 아니다 */
      if (전 && 후 && 전.값 === 후.값) {
        det.appendChild(el('div', 'fcdetsame', '입금 전·당일 반영 후 잔액 동일'));
      }
    }
    var 끄기 = el('button', 'oslink', '선택 해제');
    끄기.type = 'button';
    끄기.addEventListener('click', function () { host.__고른날 = null; 그리기다시(); });
    det.appendChild(끄기);
  }
  host.appendChild(det);
}
/* 자료에 적힌 실제 잔액 — 지나온 쪽이다. 예측이 아니다.
   ★ 새로 계산하지 않는다. dueTable 이 이미 날마다 들고 있는 값을 잘라 쓴다.
   ★ bal 이 null 인 날은 「그날 잔액을 복원할 수 없다」는 뜻이라 점을 안 만든다.
     선도 거기서 끊는다 — 없는 것을 이어 그리지 않는다 (완료 기준 11) */
function dueGraphPast(c, 며칠) {
  var t = dueTable();
  if (!t || !t.n) return [];
  var 끝 = dayNum(c.오늘), 첫 = 끝 - (며칠 || 30);
  var out = [];
  for (var i = 0; i < t.n; i++) {
    if (t.num[i] < 첫) continue;
    if (t.num[i] > 끝) break;
    out.push({ 날: t.num[i], 값: t.bal[i] });   /* 값이 null 이면 끊는 자리다 */
  }
  return out;
}
/* 이 매장은 달의 어느 구간에 돈이 제일 많이 나갔나 — 목표일을 고르는 자리에 같이 놓는다 */
function dueSpread() {
  var t = dueTable();
  if (!t || !t.n) return null;
  var a = [0, 0, 0];
  for (var i = 0; i < t.n; i++) {
    var dd = +t.days[i].slice(8, 10);
    var v = t.cc[i + 1] - t.cc[i];
    a[dd <= 10 ? 0 : (dd <= 20 ? 1 : 2)] += v;
  }
  var s = a[0] + a[1] + a[2];
  if (!(s > 0)) return null;
  var p = a.map(function (v) { return Math.round(v / s * 100); });
  var best = p[0] >= p[1] && p[0] >= p[2] ? 0 : (p[1] >= p[2] ? 1 : 2);
  return { 비율: p, 제일: best,
           이름: ['1일 ~ 10일', '11일 ~ 20일', '21일 ~ 말일'][best] };
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
  try { c = dueCard(); } catch (e) { c = null; }
  if (!c) {
    /* ★ 102차 추가 ③. 카드가 안 나오는 까닭이 「그날 잔액을 복원 못 하는 계좌가 있음」
       이면 빈 자리로 두지 않고 그 사실을 적는다.
       ★ 확인이 필요한 계좌는 이름과 자료 기간을 있는 그대로 적는다 —
         은행을 고르셨으면 「카카오뱅크」로, 안 고르셨으면 「계좌 2」로 뜬다.
         그때는 옆의 자료 기간으로 알아보신다 */
    var 못 = null;
    try { 못 = dueUnknownAccs(); } catch (e) { }
    if (못) {
      var 안 = el('div', 'duenone');
      안.appendChild(el('div', null,
        '계좌 ' + won(못.총) + '개 중 ' + won(못.빠짐) + '개는 ' +
        (+못.날.slice(5, 7)) + '월 ' + (+못.날.slice(8, 10)) +
        '일 기준 잔액을 확인할 수 없어 예상 잔액을 표시하지 않았습니다.'));
      안.appendChild(el('div', null, '계좌별 자료 기간과 잔액 정보를 확인해주세요.'));
      /* ★ 「자료 기간을 맞춰 올려주시면 계산해드리겠습니다」라고 하지 않는다 —
         나중에 연 계좌라면 앞 자료를 넣을 수가 없다. 보장할 수 없는 말이다.
         「최신 내역을 올리면 맞춰집니다」도 쓰지 않는다 */
      안.appendChild(el('div', 'duenonelist', '확인이 필요한 계좌: ' +
        못.목록.map(function (x) {
          return x.이름 + (x.기간 ? ' (' + x.기간 + ')' : '');
        }).join(' · ')));
      host.appendChild(안);
    }
    return;
  }
  /* ★ 116차 앞 ④. 보류면 예상 숫자 대신 안내를 낸다.
     곡선도 그림도 여기서부터 아예 안 만든다 */
  if (c.보류) {
    DUE_HOLD_NOW = c.보류;
    drawDueHoldCard(host, c, months);
    return;
  }
  /* ★ 101차. 곡선을 여기서 한 번만 구한다 — 제목과 펼친 자리가 같이 쓴다 */
  var cv = null;
  try { cv = dueCurve(months, c); } catch (e) { cv = null; }
  var day = dueDay();
  var mm = +c.목표.slice(5, 7), dd = +c.목표.slice(8, 10);
  var 까지 = mm + '월 ' + dd + '일';
  /* ★ 105차 ①. 「지난 2개월」이 아니라 「비교 가능한 과거 구간 2개」다 —
     경과일 대응 구간은 달력 한 달과 일치하지 않는다.
     그리고 어느 날부터인지 적는다. 「뒷부분」만으로는 어디부터인지 모르신다 */
  var 표본줄 = null;
  if (c.셈줄수 && c.셈줄값) {
    var 줄날 = 날짜글(c.셈줄수);
    표본줄 = c.셈줄값 >= 2
      ? (줄날 + ' 이후 예상 지출은 비교 가능한 과거 구간 ' + c.셈줄값 + '개를 기준으로 계산했습니다.')
      : (줄날 + ' 이후 예상 지출은 과거 한 구간의 내역을 기준으로 계산했습니다.');
  }
  /* ★ 105차 ③. 표본이 아예 없어 종료일이 당겨졌을 때 */
  var 잘림줄 = c.잘림
    ? (까지 + '까지 계산했습니다. 이후 예상 지출을 계산할 비교 자료가 부족합니다.')
    : null;
  /* ★ 59차 ③. 상자 전체가 그 색이다. 표본이 모자랄 때는 색을 안 입힌다 */
  var 색 = c.비율 === null ? '' :
           (c.비율 >= 60 ? ' warn' : (c.비율 >= 20 ? ' est' : ' good'));
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
  아이콘.appendChild(svgEl('path', {
    d: 'M20 5.4 L37.2 33.2 A3.4 3.4 0 0 1 34.3 38.4 L5.7 38.4 ' +
       'A3.4 3.4 0 0 1 2.8 33.2 Z',
    fill: 'currentColor', opacity: '0.16' }));
  아이콘.appendChild(svgEl('path', {
    d: 'M20 5.4 L37.2 33.2 A3.4 3.4 0 0 1 34.3 38.4 L5.7 38.4 ' +
       'A3.4 3.4 0 0 1 2.8 33.2 Z',
    fill: 'none', stroke: 'currentColor', 'stroke-width': 3,
    'stroke-linejoin': 'round' }));
  아이콘.appendChild(svgEl('rect', { x: 17.9, y: 16, width: 4.2, height: 11, rx: 2.1,
    fill: 'currentColor' }));
  아이콘.appendChild(svgEl('circle', { cx: 20, cy: 32, r: 2.4, fill: 'currentColor' }));
  /* ★ 111차 ⑤. 구체적인 주의 사유가 있을 때만 붙인다.
     예전에는 조건 없이 늘 붙어서, 여유가 넉넉한 매장에도 경고 표시가 섰다 —
     늘 켜져 있는 경고는 아무 말도 안 하는 것과 같다.
     ★ 「그냥 예상값이라서」는 사유가 아니다.
     ★ 카드 테두리 색 규칙(c.비율)은 그대로다. 아이콘의 유무만 바꾼다.
     ★ 아이콘을 뺀 자리는 왼쪽 여백도 같이 줄인다 (.duecard.noicon) */
  var 주의 = !!(cv && (cv.모자람 > 0 || cv.바닥)) ||
             !!c.공통기준 || !!잘림줄 ||
             !!(표본줄 && cv && cv.최저날수 >= c.셈줄수);
  if (주의) box.appendChild(아이콘);
  else box.classList.add('noicon');

  /* ★ 100차 ③. 86차 ①의 「늘 펼친 채로」를 뒤집는다 (2026-09-19 요한).
     자리는 맨 위 그대로다 — 무슨 카드인지는 접혀도 아이콘과 색과 % 로 보인다.
     ★ 열쇠를 __dueShut(접힘) 에서 __dueOpen(열림) 으로 도로 뒤집는다.
       UP.open 은 달을 옮길 때 비워지는 통이라, 비워졌을 때 어느 쪽이 되는지가
       곧 기본값이다. 86차가 「늘 펼침」을 지키려고 접힘으로 뒀던 것과 같은 이치를
       반대로 쓴다 — 열림으로 둬야 비워질 때마다 접힌 채로 돌아온다 */
  var open = !!UP.open.__dueOpen;
  /* ★ 109차 ⑥㉮. 결과를 접힌 카드로 올린다.
     예전에는 「○월 ○일 예상 잔액」이 들어올 돈·나갈 돈과 똑같은 .orow 모양으로
     펼친 표 안에 서 있어서, 932px 짜리 카드를 펴야 찾을 수 있었다.
     기본 화면에 결과와 할 일을 먼저 두고, 「자세히」는 계산 근거 전용으로 만든다.
     ★ 펼침은 지금처럼 하나뿐이다. 새 펼침도 새 열쇠도 안 만든다.
     ★ 이 상자에는 색을 안 입힌다 — 양수라고 초록으로 두면 「안전하다」는 뜻이 된다.
       카드 바깥 테두리와 아이콘 색은 c.비율 을 따르는 지금 규칙 그대로다.
     ★ 이름은 「○월 ○일 예상 잔액」 그대로다. 「선택한 날짜의…」로 바꾸면
       앱 다른 자리의 「분석 종료일」과 이름이 갈린다 (47차 ①) */
  /* ★ 110차 ③. 카드 하나만 여닫는다. 109차가 「계산 근거 자세히」를 따로 둔 것을
     되돌려, 결과 상자와 여닫는 단추를 한 줄에 둔다 — 펼침이 한 단계다.
     열쇠는 지금 것(UP.open.__dueOpen)을 그대로 쓴다 */
  var top = el('div', 'duetop tapx');
  var res = el('div', 'dueres');
  res.appendChild(el('div', 'duereslab', 까지 + ' 예상 잔액'));
  res.appendChild(el('div', 'duresnum', won(c.예상) + '원'));
  top.appendChild(res);
  top.appendChild(foldChip(open));
  box.appendChild(top);
  /* ★ 110차 ②. 「예비비는 아직 반영하지 않았습니다」를 뺀다 —
     예비비를 정하는 자리가 아직 앱에 없다. 못 만지는 기능을 되풀이해 설명하지 않는다.
     대신 계산 근거 안에 한 문장만 둔다 (아래) */

  /* ★ 109차 ⑥㉮㉯. 최저 줄. 결과 상자와 뜻이 다른 값이라 합치지 않는다.
     ★ ㉯ 최저날이 자료 기준일이면 그 값은 예상이 아니라 자료에 적힌 실제 잔액이다.
       「8월 21일 잔액이 가장 적습니다」는 이미 지난 날을 앞날처럼 말하는 것이고,
       「예상」이라 부르면 아예 틀린 말이 된다. 그 경우만 갈라 적고 「입금 전」도 안 붙인다 */
  var 기준날인가 = !!(cv && cv.최저날수 === dayNum(c.오늘));
  /* ★ 110차 ③㉮. 최저점이 선택한 날짜의 예상 잔액과 날짜·시점·금액까지 모두 같을 때만
     이 줄을 뺀다 — 그날 입금이 0이라 「입금 전」과 끝 잔액이 같아진 경우다.
     ★ 날짜가 같아도 금액이 다르면 반드시 갈라 적는다.
       하나는 「입금 전」 최저이고 하나는 그날 끝 잔액이다. 뜻이 다르다 */
  var 겹침 = !!(cv && cv.최저날수 === dayNum(c.목표) && cv.최저 === c.예상);
  /* ★ 111차 ①. 자료 기준일 잔액은 예상이 아니라 자료에 적힌 실제 값이다.
     「최저 예상 잔액」이라고 부르지 않는다. 이름과 금액을 윗줄에, 뜻을 아랫줄에 둔다.
     ★ 111차 ④㉮. 금액을 원 단위로 적는다. 폰에서 두 줄이 되는 것을 허용한다 —
       한 줄에 맞추려고 글씨를 줄이거나 뜻을 생략하지 않는다.
     ★ 같은 잔액이 이미 결과 상자에 보이면 금액을 두 번 세우지 않고 뜻만 적는다 */
  if (cv && !겹침) {
    var 같은값 = 기준날인가 && cv.최저 === c.예상;
    var low = el('div', 'duelow');
    var lowlab = el('div', 'duelab');
    lowlab.appendChild(document.createTextNode(
      cv.모자람 > 0 ? cv.최저날 + '에 모자랄 수 있습니다'
      : 기준날인가 ? '자료 기준일 잔액'
                   : cv.최저날 + ' 최저 예상 잔액 · 입금 전'));
    low.appendChild(lowlab);
    if (!같은값) {
      low.appendChild(el('div', 'duepct money' + 색,
        won(cv.모자람 > 0 ? cv.모자람 : cv.최저) + '원'));
    }
    box.appendChild(low);
    if (기준날인가) {
      box.appendChild(el('div', 'duewhy dueas',
        '분석 기간에는 이보다 낮아지지 않을 것으로 예상됩니다'));
    }
  }
  /* ★ 114차 ①. 그래프를 여는 단추. 카드에 그림을 상시로 두지 않는다.
     ★ 자리는 예상 잔액 요약과 최저 줄이 있는 이 영역이고,
       if (open) 밖이라 카드가 접혀 있어도 바로 닿는다 (완료 기준 1).
     ★ 경고색을 안 쓴다 — 테두리와 차분한 배경으로 단추임을 보인다.
     ★ 이건 새 화면을 여는 단추다. 카드 안에 펼침을 또 만드는 것이 아니다 (완료 기준 4).
     ★ 곡선이 안 나오는 자료(표본 부족·하루짜리)에서는 단추도 안 나온다 —
       눌러도 보여줄 것이 없는 단추를 두지 않는다 */
  if (cv && cv.점 && cv.점.length) {
    var gbtn = el('button', 'fcopen', '예상 잔액 그래프 보기');
    gbtn.type = 'button';
    gbtn.addEventListener('click', function (e) {
      e.stopPropagation();            /* 카드 머리의 접기·펴기를 건드리지 않는다 */
      openDueGraph(c, cv);
    });
    box.appendChild(gbtn);
  }
  /* ★ 116차 ⑫. 적용 보류가 있을 때만 한 줄 표시한다. 없으면 아무 말도 안 한다 */
  if (c.적용보류수) {
    var pw = el('div', 'duewhy dueas duehold',
      '예정 지출 ' + won(c.적용보류수) + '건의 반영이 보류되어 있습니다.');
    var pb = el('button', 'b', '확인하기');
    pb.type = 'button';
    pb.addEventListener('click', function (e) {
      e.stopPropagation();            /* 카드 머리의 접기·펴기를 건드리지 않는다 */
      openDuePlan(c, months, '적용보류');
    });
    pw.appendChild(pb);
    box.appendChild(pw);
  }
  /* ★ 101차. 자료 기준일과 분석 종료일을 늘 보이게 둔다. 접혀 있을 때도 안 감춘다.
     ★ 「오늘」이라고 쓰지 않는다 — 자료의 기준일이지 오늘이 아니다.
     ★ 최저일과 종료일은 다를 수 있어 한 낱말로 섞지 않는다 */
  /* ★ 102차 마무리. 카드의 「자료 기준일」은 카드가 실제로 선 날이어야 한다.
     asOfText() 는 표의 마지막 날이라, 계좌마다 끝나는 날이 다르면
     「자료 기준일 8월 21일 · 분석 종료일 8월 10일」처럼 종료일이 기준일보다 앞선다.
     ★ asOfText() 자체는 안 건드린다 — 머리 배지와 105차 「마지막 분석」 줄이 쓴다.
       카드 안에서만 c.오늘 을 쓴다.
     ★ 계좌가 하나면 c.오늘 이 표의 마지막 날이라 예전과 똑같다 */
  /* ★ 110차 ③㉮. 「분석 종료일」을 이 줄에서 뺀다 —
     결과 상자가 이미 그 날짜를 말하고 있다. 같은 날을 두 줄에 적지 않는다.
     종료일은 펼친 자리의 드롭다운이 보인다 */
  box.appendChild(el('div', 'duewhy dueas',
    '자료 기준일 ' + (+c.오늘.slice(5, 7)) + '월 ' + (+c.오늘.slice(8, 10)) + '일'));
  /* ★ 102차. 계좌마다 마지막 거래일이 다르면 그 사실을 말한다. 같으면 안 나온다.
     ★ 계좌를 지목하지 않는다 — 이름이 「계좌 2」인 경우가 있어 지목해도 뜻이 없다.
     ★ 102차 추가 ②. 「모든 계좌에 자료가 있는 날」이라고 말할 수 없다 —
       조회 기간을 파싱하지 않으므로 그 날의 완전함은 확인된 것이 아니다.
       확인된 것은 「계좌별 최종 거래일 중 가장 이른 날」 하나뿐이다.
     ★ 「최신 내역을 올리면 맞춰집니다」라고 하지 않는다. 다시 올려도 최종 거래일이
       같을 수 있다 */
  if (c.공통기준) {
    box.appendChild(el('div', 'duewhy dueas',
      '계좌별 최종 거래일이 달라 ' +
      (+c.오늘.slice(5, 7)) + '월 ' + (+c.오늘.slice(8, 10)) +
      '일 기준으로 합산했습니다. 계좌별 자료 기간을 확인해주세요.'));
  }
  /* ★ 60차 ④. 접힌 자리에는 바로 알아듣는 문장 하나만 둔다.
     「지금과 가장 비슷했던 20일 중…」과 「1.82배」는 안 읽힌다는 지적을 받았다 —
     못 알아들으면 빼는 게 낫다. 펼친 자리로 내렸다.
     이 줄은 바로 읽히고, 왜 목표일이 그날인지도 같이 설명한다 */
  /* ★ 87차 ①. 접으면 첫 줄 하나만 남는다. 근거 줄도 같이 접는다 —
     접었는데 95px 이면 접은 뜻이 없다. 펼친 모습은 하나도 안 바뀐다.
     ★ ⚠ 아이콘과 색은 접혀도 그대로 둔다. 무슨 카드인지는 알아야 한다 */
  if (!open) box.classList.add('shut');
  /* ★ 105차 ①. 최저 예상 잔액이 표본이 줄어든 구간에서 나오면 접힌 카드에도 보인다.
     접힌 채로 「최저 11,595만원」만 보고 나가시면 그 수가 무엇으로 계산된 것인지 모르신다.
     ★ 잘림 줄은 늘 보인다 — 어디까지 계산했는지는 접든 펴든 같은 무게다 */
  if (!open && 잘림줄) box.appendChild(el('div', 'duewhy dueas', 잘림줄));
  if (!open && 표본줄 && cv && cv.최저날수 >= c.셈줄수) {
    box.appendChild(el('div', 'duewhy dueas', 표본줄));
  }

  top.addEventListener('click', function () {
    UP.open.__dueOpen = !UP.open.__dueOpen;
    drawResult(months);
  });
  if (open) {
    /* ★ 110차 ④. 31칸 격자를 드롭다운으로 바꾼다. 격자가 234px 로 카드에서 제일 큰
       덩어리였다. 달을 고르는 자리에 이미 쓰는 방식이라 새 장치가 아니다.
       ★ 값은 지금 화면에 있는 그대로 31개다 — 1~30 과 「말일」.
         31일 칸은 없었다. 「말일」을 「31일」로 바꾸거나 둘을 합치지 않는다.
         짧은 달 처리(nextDue·shiftMonth)도 한 줄도 안 건드린다.
       ★ 이름은 「분석 종료일」이다. 결과 화면에서 실제로 바꾸는 값이 그것이다.
       ★ 「왜 그 날을 고르는가」를 알려주는 줄은 없애지 않는다. 드롭다운 아래로 내린다 */
    /* ★ 116차 앞. 종료일 고르는 자리를 duePickBox 로 뺐다 —
       보류 카드와 같은 것을 쓰게 하려는 것이다. 글자와 동작은 110차 ④ 그대로다 */
    box.appendChild(duePickBox(months));
    var t = el('div', 'duepick');
    function 줄(name, v, sub, sign) {
      var r = el('div', 'orow');
      var l = el('div', 'lab', '　' + name);
      if (sub) l.appendChild(el('span', 'gcount', sub));
      r.appendChild(l);
      r.appendChild(el('div', 'v num', (sign || '') + won(Math.abs(v))));
      t.appendChild(r);
    }
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
    줄(까지 + '까지 들어올 돈', c.들어올, '직전 30일 매출 기준', '+ ');
    /* ★ 105차 ②. 창 안에서 표본이 줄면 「지난 3달」이 사실이 아니다 */
    줄(까지 + '까지 나갈 돈', c.나갈,
       (c.셈최소 < 3 ? '지난 3달 · 뒷부분은 과거 구간 ' + c.셈최소 + '개 기준'
                     : '지난 3달 같은 구간 기준'), '− ');
    /* ★ 109차 ⑥㉰. 「○월 ○일 예상 잔액」과 「잔액이 가장 적을 날」 두 줄을 뺀다 —
       접힌 카드의 결과 상자와 최저 줄이 그 자리를 대신한다.
       같은 값을 화면에 두 번 세우지 않는다 */
    box.appendChild(t);
    /* ★ 단정하지 않는다 — 「모자랍니다」가 아니라 「모자랄 수 있습니다」 (마스터 ■2) */
    if (cv && cv.모자람 > 0) {
      box.appendChild(el('div', 'duewhy',
        cv.최저날 + '에 ' + won(cv.모자람) + '원이 모자랄 수 있습니다'));
    } else if (cv && cv.바닥) {
      box.appendChild(el('div', 'duewhy',
        cv.최저날 + '에 하루치 나가는 돈(' + won(cv.하루치) + '원)보다 적어질 수 있습니다'));
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
      box.appendChild(el('div', 'duewhy', 기준날인가
        ? '예상한 입출금이 그대로 이뤄질 경우, 분석 종료일까지 잔액이 자료 기준일보다 낮아지지 않을 것으로 예상됩니다.'
        : '예상한 입출금이 그대로 이뤄질 경우, ' + cv.최저날 +
          '에는 당일 출금 후 입금 전 잔액이 ' + won(cv.최저) + '원으로 예상됩니다.'));
      /* ★ 110차 ②. 「예비비」를 안 부른다 — 정하는 자리가 아직 앱에 없다.
         대신 이 숫자가 무엇이 아닌지를 한 문장으로 적는다 */
      box.appendChild(el('div', 'duewhy',
        '예상 잔액은 앞으로의 입출금을 반영한 추정치이며, 지금 사용할 수 있는 금액을 뜻하지 않습니다.'));
      /* ★ 103차 추가 ①. 입금은 균등, 지출만 날짜별이다.
         한 문장으로 뭉치면 거짓말이 된다 — 103차 ①에서 입금을 균등으로 바꿔 놓고
         문구만 옛 것이 남아 있었다 */
      /* ★ 118차 ①②. 출금 설명을 실제 계산 범위에 맞춘다 — 이제 사업 지출만이 아니다.
         한 문장에 입금·출금을 같이 두고 따로 줄을 늘리지 않는다 */
      box.appendChild(el('div', 'duewhy',
        (c.입금방식 === '요일'
          ? '입금은 직전 30일 같은 요일의 매출 평균을 날짜마다 놓고, '
          : '입금은 직전 30일 매출 평균을 매일 같은 금액으로 놓고, ') +
        '출금은 과거 계좌 출금을 기준으로 지난 3개월 같은 구간의 날짜별 평균을 반영했습니다. ' +
        '사업 외 출금도 포함합니다.' +
        (c.대체요일 && c.대체요일.length ? ' 매출 자료가 없는 요일은 30일 평균으로 채웠습니다.' : '')));
      /* ★ 104차 정정 ㉲ · 105차 ①. 날짜마다 비교한 과거 구간 수가 다를 수 있다.
         그때 「모든 날짜가 지난 3개월 평균」은 더는 사실이 아니라 한 줄 더 적는다 */
      if (표본줄) box.appendChild(el('div', 'duewhy', 표본줄));
      if (잘림줄) box.appendChild(el('div', 'duewhy', 잘림줄));
      /* ★ 103차 ②. 최저점은 「출금 뒤, 입금 전」 값이지 일말 잔액이 아니다.
         이건 가정이지 실제 거래 순서가 아니다. 가정이면 가정이라고 적는다 —
         「실제로 아침에 급여가 나갑니다」처럼 사실인 양 쓰지 않는다 */
      box.appendChild(el('div', 'duewhy',
        '같은 날에는 출금이 입금보다 먼저 이뤄지는 것으로 가정했습니다.'));
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
  host.appendChild(box);
}

