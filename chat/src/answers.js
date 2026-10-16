/* 124-5: 숫자는 코드가 지킨다.
   - 정해진 답: 인건비 비율 · 월세·공과금 · 가장 많이 쓴 항목 · 아직 안 정한 돈은 AI 를 부르지 않고 요약에서 바로 만든다(뉴런 0).
   - 그 밖의 질문은 AI 답을 받은 뒤 숫자를 검사해, 요약에 없는 금액·비율·날짜가 있거나 아직 안 정한 돈을
     「가장 큰 항목」으로 말하면 그 답을 버리고 대체 답(확인된 숫자만)을 보낸다.
   백테스트(2026-10-16, 요한 본인 매장)에서 자릿수 밀림·지어낸 비율·없는 날짜가 지침만으로는 남았기 때문이다.
   설계는 요한 지시로 정했다(GPT 검토 없음). */

/* 앱(app/src/17-chat.js CHAT_TOPIC_WORDS)과 같은 낱말 규칙. 앞의 것부터 맞춰 보고 없으면 기타. 둘이 같은지는 시험이 본다. */
/** @type {[string, string[]][]} */
export const TOPIC_WORDS = [
  ['업종비교', ['업종', '다른 가게', '동종', '평균']],
  ['자료범위', ['한 달 전체', '전체 기간', '자료 범위', '빠진', '누락']],
  [
    '앞으로지출',
    ['해도 될까', '써도 될까', '써도 돼', '사도 될까', '투자', '대출 받', '다음 달', '앞으로']
  ],
  ['잔액차이', ['잔액', '통장']],
  ['미분류', ['안 정한', '미분류', '정하지 않은', '모르는 돈']],
  ['운영판단', ['나아졌', '좋아졌', '나빠졌', '잘하고', '괜찮', '남는 게', '왜 남']],
  ['지출비율', ['비율', '퍼센트', '%']],
  [
    '지출구성',
    ['가장 많이', '많이 썼', '어디에 썼', '어느 항목', '지출 구성', '얼마 나갔', '공과금', '월세']
  ],
  ['기간비교', ['지난달', '전달', '저번 달', '달라졌', '비교']],
  ['용어', ['뜻', '의미', '무슨 말', '뭐야', '뭔가요', '무엇인가요']]
];
export function topicOf(text) {
  for (const [topic, words] of TOPIC_WORDS) if (words.some((w) => text.includes(w))) return topic;
  return '기타';
}

const LABOR = ['인건비', '급여'];
const RENT = ['월세', '임차료'];
const UTIL = ['전기·가스·수도', '수도광열'];
export function won(n) {
  const s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '−' : '') + s + '원';
}
const pct = (r) => (r * 100).toFixed(1) + '%';
const monthNo = (m) => Number(m.slice(5, 7));
const ofSales = (r) => (r === null ? '매출 대비 비율 확인 보류' : '매출의 ' + pct(r));
// 이번 달이 중간 자료면 정해진 답 끝에 기준일을 붙인다
const asOf = (cur) =>
  cur.complete ? '' : ` ${Number(cur.dataEnd.slice(8, 10))}일까지의 자료 기준입니다.`;
const pick = (cur, labels) =>
  cur.categories.filter((c) => labels.includes(c.label) && c.amount > 0);
const sumRatio = (list) =>
  list.some((c) => c.ratio === null) ? null : list.reduce((s, c) => s + c.ratio, 0);
const notDecided = (what, cur) =>
  `이번 요약에는 ${what} 정한 거래가 없습니다. 아직 안 정한 돈 ${won(cur.unknown)} 안에 들어 있을 수 있습니다.`;

/* 정해진 답 — 맞는 질문이면 {kind, answer}, 아니면 null */
export function fixedAnswer(question, summary) {
  const cur = summary.current;
  const m = monthNo(cur.month) + '월';
  const topic = topicOf(question);
  const spend = topic === '지출비율' || topic === '지출구성';
  if (spend && /인건비|급여/.test(question)) {
    const list = pick(cur, LABOR);
    if (!list.length) return { kind: '인건비', answer: notDecided('인건비로', cur) };
    const amount = list.reduce((s, c) => s + c.amount, 0);
    return {
      kind: '인건비',
      answer: `${m} 인건비는 ${won(amount)}, ${ofSales(sumRatio(list))}입니다.${asOf(cur)}`
    };
  }
  if (spend && /월세|임차료|공과금|관리비|전기|가스|수도/.test(question)) {
    const rent = pick(cur, RENT);
    const util = pick(cur, UTIL);
    if (!rent.length && !util.length)
      return { kind: '월세·공과금', answer: notDecided('월세·공과금으로', cur) };
    const lines = [...rent, ...util].map(
      (c) => `- ${c.label} ${won(c.amount)}(${ofSales(c.ratio)})`
    );
    if (!rent.length) lines.push('- 월세로 정한 거래는 없습니다.');
    if (!util.length) lines.push('- 공과금(전기·가스·수도)으로 정한 거래는 없습니다.');
    return {
      kind: '월세·공과금',
      answer: `${m} 월세·공과금으로 정한 금액입니다.${asOf(cur)}\n${lines.join('\n')}${cur.unknown > 0 ? `\n아직 안 정한 돈 ${won(cur.unknown)}은 넣지 않았습니다.` : ''}`
    };
  }
  if (topic === '지출구성' && /가장 많이|많이 썼|어느 항목|어디에 썼/.test(question)) {
    const top = cur.categories
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    if (!top.length)
      return {
        kind: '가장 많이 쓴 항목',
        answer: `이번 요약에는 항목으로 정한 지출이 없습니다. 아직 안 정한 돈은 ${won(cur.unknown)}입니다.`
      };
    const lines = top.map((c, i) => `${i + 1}. ${c.label} ${won(c.amount)}(${ofSales(c.ratio)})`);
    return {
      kind: '가장 많이 쓴 항목',
      answer: `${m} 금액이 큰 항목입니다.${asOf(cur)}\n${lines.join('\n')}${cur.unknown > 0 ? `\n아직 안 정한 돈 ${won(cur.unknown)}은 이 순서에 넣지 않았습니다.` : ''}`
    };
  }
  if (topic === '미분류') {
    if (cur.unknown <= 0)
      return { kind: '아직 안 정한 돈', answer: `${m} 아직 안 정한 돈은 없습니다(0원).` };
    return {
      kind: '아직 안 정한 돈',
      answer: `${m} 아직 안 정한 돈은 ${won(cur.unknown)}입니다. 거래처를 정하시면 항목별 금액과 비율이 더 정확해집니다.${asOf(cur)}`
    };
  }
  return null;
}

/* 대체 답 — 선택한 달과 바로 앞 달의 번 돈·쓴 돈·차액을 요약 그대로 나란히 */
export function fallbackAnswer(summary) {
  const cur = summary.current;
  const prev = summary.previous
    .filter((m) => m.month < cur.month)
    .sort((a, b) => (a.month < b.month ? 1 : -1))[0];
  const line = (x) =>
    `${x.month.slice(0, 4)}년 ${monthNo(x.month)}월: 사업으로 번 돈 ${won(x.earned)}, 사업에 쓴 돈 ${won(x.spent)}, 차액 ${won(x.difference)}`;
  const lines = [line(cur)];
  if (prev) lines.push(line(prev));
  if (!cur.complete)
    lines.push(
      `이번 달은 ${Number(cur.dataEnd.slice(8, 10))}일까지의 자료라 지난달 한 달 전체와 바로 비교하기 어렵습니다.`
    );
  lines.push('자세한 설명을 만들지 못해 확인된 숫자만 보여 드립니다.');
  return lines.join('\n');
}

/* 숫자 검사 — {ok, problems[]} */
const UNIT = { 억: 1e8, 천만: 1e7, 백만: 1e6, 만: 1e4 };
// 단위가 붙은 금액(1억 2,345만 원 · 4,513만 원) · 「원」이 붙은 금액 · 쉼표 묶음 숫자
const MONEY =
  /(?:\d[\d,]*(?:\.\d+)?\s*(?:억|천만|백만|만)\s*)+(?:\d[\d,]*\s*)?원?|\d[\d,]*(?:\.\d+)?\s*원|\d{1,3}(?:,\d{3})+(?:\.\d+)?/g;
const BIGGEST_UNKNOWN =
  /가장\s*(?:큰|많은|많이)[^.\n]{0,25}(?:미분류|아직\s*안\s*정한|정하지\s*않은)|(?:미분류|아직\s*안\s*정한|정하지\s*않은)[^.\n]{0,25}가장\s*(?:큰|많은|많이)/;
function moneyValue(text) {
  let v = 0;
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(억|천만|백만|만)?/g))
    v += Number(m[1].replace(/,/g, '')) * (UNIT[m[2]] || 1);
  return Math.round(v);
}
export function checkAnswer(answer, summary) {
  const months = [summary.current, ...summary.previous];
  const money = new Set([0]);
  const ratios = new Set();
  for (const x of months) {
    for (const k of ['earned', 'spent', 'difference', 'sales', 'otherIncome', 'unknown'])
      money.add(Math.abs(x[k]));
    for (const c of x.categories) {
      money.add(Math.abs(c.amount));
      if (c.ratio !== null) ratios.add(pct(c.ratio));
    }
    if (x.materialRatio !== null) ratios.add(pct(x.materialRatio));
  }
  // 달 이름은 요약에 있는 달만. 마지막 거래일(dataEnd)의 달은 「○월 ○일」 날짜로만 받는다
  // (7월 요약에서 「8월 77,051,343원」처럼 달을 바꿔 적은 것을 잡으려면 dataEnd 의 달을 여기에 넣지 않는다)
  const ends = new Set(months.map((x) => x.dataEnd));
  const monthSet = new Set(months.map((x) => monthNo(x.month)));
  const yearMonth = new Set(months.map((x) => x.month));
  const endDays = new Set(
    [...ends].map((e) => `${Number(e.slice(5, 7))}-${Number(e.slice(8, 10))}`)
  );
  const problems = [];
  for (const m of answer.matchAll(MONEY)) {
    const next = answer.slice(m.index + m[0].length).trimStart()[0];
    if (next && '%월일년'.includes(next)) continue; // 비율·날짜는 아래에서 본다
    const v = moneyValue(m[0]);
    if (!money.has(v)) problems.push('금액 ' + m[0].trim());
  }
  // 비율은 소수 첫째 자리까지만, 요약 비율을 반올림한 값과 같아야 한다(28% 는 28.0% 로 본다)
  for (const m of answer.matchAll(/(\d+(?:\.\d+)?)\s*%/g))
    if (!/^\d+(?:\.\d)?$/.test(m[1]) || !ratios.has(Number(m[1]).toFixed(1) + '%'))
      problems.push('비율 ' + m[0]);
  for (const m of answer.matchAll(/(?<![\d.,])0\.\d{2,}/g)) problems.push('소수 비율 ' + m[0]);
  const DAY_AFTER = /(?!\s*\d{1,2}\s*일)/.source;
  for (const m of answer.matchAll(
    new RegExp('(\\d{4})\\s*년\\s*(\\d{1,2})\\s*월' + DAY_AFTER, 'g')
  ))
    if (!yearMonth.has(`${m[1]}-${String(m[2]).padStart(2, '0')}`)) problems.push('달 ' + m[0]);
  // 날짜가 아닌 「○월」은 모두 본다 — 뒤에 금액이 붙은 「8월 77,051,343원」 처럼 달 이름을 바꿔 적은 것도 잡는다
  for (const m of answer.matchAll(new RegExp('(?<!\\d)(\\d{1,2})\\s*월' + DAY_AFTER, 'g')))
    if (!monthSet.has(Number(m[1]))) problems.push('달 ' + m[0]);
  // 「○월 ○일」은 마지막 거래일과 같아야 한다
  for (const m of answer.matchAll(/(?<!\d)(\d{1,2})\s*월\s*(\d{1,2})\s*일/g))
    if (!endDays.has(`${Number(m[1])}-${Number(m[2])}`)) problems.push('날짜 ' + m[0]);
  for (const m of answer.matchAll(/(?<!월\s*|\d)(\d{1,2})\s*일\s*까지/g))
    if (![...ends].some((e) => Number(e.slice(8, 10)) === Number(m[1])))
      problems.push('날짜 ' + m[0]);
  if (BIGGEST_UNKNOWN.test(answer)) problems.push('아직 안 정한 돈을 가장 큰 항목으로');
  return { ok: problems.length === 0, problems };
}
