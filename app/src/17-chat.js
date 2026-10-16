/* 124차 시험 기능. 화면 열기·달 바꾸기는 통신하지 않는다. 질문 전송은 동의 단추 한 곳뿐이다. */
var CHAT_URL = 'https://chat.namneundon.com';
var CHAT_BROWSER_LIMIT = 10;
var CHAT_KEYS = {
  enabled: 'fc.ai.enabled',
  usage: 'fc.ai.usage',
  receipt: 'fc.ai.receipt',
  tester: 'fc.ai.tester'
};
// 시험 키는 영문 소문자·숫자만 (서버 TESTER_FORM 과 같다). 그 밖의 값은 저장·표시하지 않는다.
var CHAT_KEY_FORM = /^[a-z0-9]{1,256}$/;
var CHAT_LABELS = [
  '식자재',
  '주류·음료',
  '월세',
  '급여',
  '보험',
  '세금',
  '기타',
  '소모품',
  '인건비',
  '전기·가스·수도',
  '세무기장료',
  '수도광열',
  '수수료',
  '광고비',
  '원두·재료',
  '베이커리·디저트',
  '재료비',
  '약제·주사제',
  '임차료',
  '기공료',
  '의약품 매입',
  '시술 재료',
  '광고·예약 수수료',
  '장비 리스',
  '사용자 지정 항목'
];
/* 국외 이전 조건을 확인하기 전에는 합성 자료 시험자만 쓴다.
   ?aikey=<키> 로 들어오면 키를 저장하고 표시를 켠 뒤, 주소창에서 키를 바로 지운다
   (방문 기록·화면 공유에 남지 않게). ?ai=0 은 표시와 키를 함께 지운다.
   ?ai=1 만으로는 켜지지 않는다 — 키가 있어야 진입 아이콘이 보인다. */
function chatReadUrl() {
  var params = new URLSearchParams(location.search);
  var key = params.get('aikey');
  if (params.get('ai') === '0') {
    lsDel(CHAT_KEYS.enabled);
    lsDel(CHAT_KEYS.tester);
  } else if (key !== null && CHAT_KEY_FORM.test(key)) {
    lsSet(CHAT_KEYS.tester, key);
    lsSet(CHAT_KEYS.enabled, '1');
  }
  if (key === null) return;
  params.delete('aikey');
  var rest = params.toString();
  history.replaceState(
    history.state,
    '',
    location.pathname + (rest ? '?' + rest : '') + location.hash
  );
}
chatReadUrl();
function chatTesterKey() {
  var key = lsGet(CHAT_KEYS.tester);
  return key && CHAT_KEY_FORM.test(key) ? key : '';
}
function chatEnabled() {
  return lsGet(CHAT_KEYS.enabled) === '1' && !!chatTesterKey();
}
function chatMonthSummary(m) {
  var d = monthNumbers(m);
  var end = m + '-' + String(monthDays(m)).padStart(2, '0');
  var dates = UP.rows
    .map(function (r) {
      return r.at.slice(0, 10);
    })
    .sort();
  // 거래가 없는 날을 자료 누락과 구별할 근거가 없으면 완결로 단정하지 않는다.
  var banks =
    UP.banks && UP.banks.length
      ? UP.banks.map(function (_, i) {
          return i;
        })
      : [0];
  var complete = banks.every(function (i) {
    var rows = UP.rows
      .filter(function (r) {
        return accOf(r) === i;
      })
      .map(function (r) {
        return r.at.slice(0, 10);
      })
      .sort();
    return rows.length && rows[0] <= m + '-01' && rows[rows.length - 1] >= end;
  });
  var cats = {};
  Object.keys(d.cats).forEach(function (k) {
    var label = CHAT_LABELS.indexOf(k) >= 0 ? k : '사용자 지정 항목';
    cats[label] = (cats[label] || 0) + d.cats[k];
  });
  var canRatio = d.sales > 0 && !d.blocked && !ratioMuted(d);
  var material = (d.cats[baseName('식자재')] || 0) + (d.cats[baseName('주류·음료')] || 0);
  return {
    month: m,
    dataEnd: dates[dates.length - 1],
    complete: !!complete,
    earned: d.sales + d.otherIn,
    spent: d.cost,
    difference: d.profit,
    sales: d.sales,
    otherIncome: d.otherIn,
    unknown: d.unknown,
    categories: Object.keys(cats).map(function (label) {
      return { label: label, amount: cats[label], ratio: canRatio ? cats[label] / d.sales : null };
    }),
    materialRatio: canRatio ? material / d.sales : null,
    ratioLabel: tradeInfo().비율이름
  };
}
function chatSummary() {
  return {
    industry: tradeNow(),
    current: chatMonthSummary(UP.month),
    previous: monthList()
      .filter(function (m) {
        return m < UP.month;
      })
      .map(chatMonthSummary)
      .filter(function (m) {
        return m.complete;
      })
      .slice(-3)
  };
}
function chatRead(key, fallback) {
  try {
    return JSON.parse(lsGet(key)) || fallback;
  } catch (e) {
    return fallback;
  }
}
function chatReceipt() {
  var saved = chatRead(CHAT_KEYS.receipt, null);
  if (saved && /^[a-f0-9-]{36}$/.test(saved.convId) && /^[a-f0-9]{64}$/.test(saved.token))
    return saved;
  var bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  var receipt = {
    convId: crypto.randomUUID(),
    token: Array.from(bytes, function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('')
  };
  if (!lsSet(CHAT_KEYS.receipt, JSON.stringify(receipt)))
    throw new Error('삭제용 정보를 이 브라우저에 저장할 수 없어 질문을 보내지 않았습니다.');
  return receipt;
}
function chatLimitText(next) {
  return (
    '현재 무료 질문 한도에 도달했습니다. 다음 이용 가능 시간은 ' +
    new Date(next).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) +
    ' (한국시간)입니다. 결과 화면은 계속 사용할 수 있습니다.'
  );
}
/* 주제 코드(고정, 서버 TOPICS 와 같다)와 예상 질문. 칩은 질문 칸을 채우기만 하고 자동으로 보내지 않는다.
   AI 가 추천 질문을 만들지 않는다 — 브라우저가 자료 상태로 고른다. */
var CHAT_TOPIC_CHIPS = {
  운영판단: '이번 달 결과, 지난달보다 나아졌어?',
  용어: '차액은 무슨 뜻이야?',
  잔액차이: '차액과 통장 잔액은 왜 달라?',
  기간비교: '지난달보다 뭐가 달라졌어?',
  지출구성: '어느 항목에 가장 많이 썼어?',
  지출비율: '재료 비율은 어떻게 계산해?',
  미분류: '아직 안 정한 돈은 뭐야?',
  자료범위: '이 자료로 한 달 전체를 비교해도 돼?',
  업종비교: '같은 업종과 비교하면 어느 수준이야?',
  앞으로지출: '다음 달 큰 지출을 해도 될까?'
};
/* 추천 순서: 아직 안 정한 돈이 있으면 미분류가 먼저, 비교할 이전 달(전체 기간 확보)이 있을 때만 기간비교,
   나머지는 용어 · 지출구성 · 잔액차이. 업종비교·앞으로지출은 추천하지 않는다. skip 은 방금 물은 주제. */
function chatPickChips(summary, skip, max) {
  var order = [];
  if (summary.current.unknown > 0) order.push('미분류');
  if (summary.previous.length) order.push('기간비교');
  order.push('용어', '지출구성', '잔액차이');
  return order
    .filter(function (t) {
      return t !== skip;
    })
    .slice(0, max);
}
/* 직접 쓴(또는 칩을 고친) 질문의 주제. 앞의 것부터 맞춰 보고 맞는 낱말이 없으면 기타.
   질문 글은 이 브라우저 안에서만 보고, 서버에는 주제 코드만 보낸다. */
var CHAT_TOPIC_WORDS = [
  ['업종비교', ['업종', '다른 가게', '동종', '평균']],
  ['자료범위', ['한 달 전체', '전체 기간', '자료 범위', '빠진', '누락']],
  [
    '앞으로지출',
    ['해도 될까', '써도 될까', '써도 돼', '사도 될까', '투자', '대출 받', '다음 달', '앞으로']
  ],
  ['잔액차이', ['잔액', '통장']],
  ['미분류', ['안 정한', '미분류', '정하지 않은', '모르는 돈']],
  ['운영판단', ['나아졌', '좋아졌', '나빠졌', '잘하고', '괜찮']],
  ['지출비율', ['비율', '퍼센트', '%']],
  ['지출구성', ['가장 많이', '많이 썼', '어디에 썼', '어느 항목', '지출 구성']],
  ['기간비교', ['지난달', '전달', '저번 달', '달라졌', '비교']],
  ['용어', ['뜻', '의미', '무슨 말', '뭐야', '뭔가요', '무엇인가요']]
];
function chatTopicOf(text, chip) {
  if (chip && text === chip.text) return { topic: chip.topic, source: 'chip' };
  for (var i = 0; i < CHAT_TOPIC_WORDS.length; i++) {
    var words = CHAT_TOPIC_WORDS[i][1];
    for (var j = 0; j < words.length; j++)
      if (text.indexOf(words[j]) >= 0) return { topic: CHAT_TOPIC_WORDS[i][0], source: 'typed' };
  }
  return { topic: '기타', source: 'typed' };
}
/* 주제 집계 — 질문을 실제로 보내 답을 받은 뒤 {topic, source} 만 따로 보낸다.
   지우기 키·대화 번호·질문 글·요약·브라우저 식별값은 넣지 않는다. 실패해도 대화에는 영향이 없다. */
function chatCountTopic(t) {
  fetch(CHAT_URL + '/api/topic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Namneundon-Tester': chatTesterKey() },
    body: JSON.stringify({ topic: t.topic, source: t.source }),
    signal: AbortSignal.timeout(15000)
  }).catch(function () {});
}
// TODO: 사이트 개인정보 처리방침에 AI 질문 항목과 바로 가는 주소가 생기면 넣는다(지금 사이트 처리방침은 AI 전송을 다루지 않고 주소 앵커도 없다).
var CHAT_PRIVACY_URL = '';
/* 진입점은 결과 화면 오른쪽 아래 동그란 아이콘 하나다 — 남는돈 마크(BRAND_MARK) + 작은 「AI」.
   결과 화면(up-result) 안에 두어 다른 화면으로 갈 때 결과와 함께 감춰지게 한다.
   아이콘이 마지막 줄을 가리지 않게 결과 화면 맨 아래에 아이콘 높이만큼 여백을 둔다 (app.css 124차).
   시험 키가 없으면 아무것도 그리지 않는다 — 일반 화면은 그대로다. */
function drawChatButton(host) {
  if (!chatEnabled()) return;
  var button = el('button', 'ai-fab');
  button.type = 'button';
  button.setAttribute('aria-label', 'AI에게 결과 묻기');
  button.setAttribute('aria-haspopup', 'dialog');
  button.title = 'AI에게 결과 묻기';
  var mark = document.createElement('img');
  mark.className = 'ai-fab-mark';
  mark.src = BRAND_MARK;
  mark.alt = '';
  button.appendChild(mark);
  var tag = el('span', 'ai-fab-tag', 'AI');
  tag.setAttribute('aria-hidden', 'true');
  button.appendChild(tag);
  button.onclick = openChat;
  host.appendChild(button);
}
/* 「전송할 내용 보기」 표. 실제로 보낼 요약 객체의 값을 글자로 바꾸기만 한다 — 다시 계산하지 않는다.
   요약에는 시작일이 없고 dataEnd 는 전체 자료의 마지막 거래일이다. 「8월 1~22일」로 만들지 않는다. */
function chatMonthName(m) {
  return m.slice(0, 4) + '년 ' + Number(m.slice(5, 7)) + '월';
}
function chatDayName(d) {
  return chatMonthName(d) + ' ' + Number(d.slice(8, 10)) + '일';
}
function chatMoney(v) {
  return won(v) + '원';
}
function chatRatio(v) {
  return v === null ? '확인 보류' : (v * 100).toFixed(1) + '%';
}
function chatRows(table, rows) {
  rows.forEach(function (r) {
    var tr = document.createElement('tr');
    tr.appendChild(el('th', null, r[0])).setAttribute('scope', 'row');
    tr.appendChild(el('td', null, r[1]));
    table.appendChild(tr);
  });
  return table;
}
function chatMonthTable(m, monthLabel) {
  var box = el('div', 'ai-month');
  box.appendChild(
    chatRows(el('table', 'ai-sum'), [
      [monthLabel, chatMonthName(m.month)],
      ['전체 자료의 마지막 거래일', chatDayName(m.dataEnd)],
      ['전체 기간 확보 여부', m.complete ? '확인됨' : '전체 기간 확보 미확인'],
      ['사업으로 번 돈', chatMoney(m.earned)],
      ['사업에 쓴 돈', chatMoney(m.spent)],
      ['차액', chatMoney(m.difference)],
      ['매출', chatMoney(m.sales)],
      ['그 밖의 입금', chatMoney(m.otherIncome)],
      ['아직 안 정한 돈', chatMoney(m.unknown)]
    ])
  );
  var cats = el('table', 'ai-cats');
  var head = document.createElement('tr');
  ['항목', '금액', '매출 대비 비율'].forEach(function (t) {
    head.appendChild(el('th', null, t)).setAttribute('scope', 'col');
  });
  cats.appendChild(head);
  m.categories.forEach(function (c) {
    var tr = document.createElement('tr');
    tr.appendChild(el('th', null, c.label)).setAttribute('scope', 'row');
    tr.appendChild(el('td', null, chatMoney(c.amount)));
    tr.appendChild(el('td', null, chatRatio(c.ratio)));
    cats.appendChild(tr);
  });
  if (!m.categories.length) {
    var none = document.createElement('tr');
    none.appendChild(el('td', null, '보내는 항목 없음')).colSpan = 3;
    cats.appendChild(none);
  }
  box.appendChild(cats);
  box.appendChild(chatRows(el('table', 'ai-sum'), [[m.ratioLabel, chatRatio(m.materialRatio)]]));
  return box;
}
function chatPreview(summary) {
  var box = el('div', 'ai-preview');
  box.appendChild(chatRows(el('table', 'ai-sum'), [['업종', summary.industry]]));
  box.appendChild(chatMonthTable(summary.current, '선택한 달'));
  box.appendChild(el('h3', null, '함께 보내는 이전 달 요약'));
  if (!summary.previous.length) box.appendChild(el('p', null, '함께 보내는 이전 달이 없습니다.'));
  summary.previous.forEach(function (m) {
    var fold = document.createElement('details');
    fold.appendChild(el('summary', null, chatMonthName(m.month)));
    fold.appendChild(chatMonthTable(m, '달'));
    box.appendChild(fold);
  });
  box.appendChild(el('p', 'ai-note', '비율은 보기 쉽게 반올림했습니다.'));
  return box;
}
/* 대화창 말풍선. 글자로만 넣는다 — AI 답을 HTML 로 실행하지 않는다. */
function chatBubble(log, who, text) {
  var b = el('div', 'ai-msg ai-' + who, text);
  log.appendChild(b);
  b.scrollIntoView({ block: 'nearest' });
  return b;
}
/* 보내기 단추의 그림. 고정된 글자이고 사용자 입력이 섞이지 않는다. */
var CHAT_SEND_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12l16-8-6 16-2.5-6.5z" fill="currentColor"/></svg>';
/* 질문 창 = 채팅 화면. 머리(제목·시험 중·더보기·닫기) / 말풍선 / 맨 아래 안내 두 줄 + 입력 칸.
   화면 열기·달 바꾸기·닫기는 통신하지 않는다. 보내기를 누르면 바로 보낸다 —
   보내는 내용은 입력 칸 위 안내와 「자세히」에 늘 보인다.
   운영자 확인용 저장은 ⋯ 메뉴에서 켤 때만, 이 창이 열려 있는 동안만 켜진다(저장하지 않음). */
function openChat() {
  if (document.getElementById('ai-chat')) return;
  var summary = chatSummary(); // 표와 실제 전송값을 같은 객체로 고정한다.
  var store = UP;
  var optIn = false;
  var busy = false;
  var chip = null; // 마지막으로 누른 칩 {topic, text}
  var dialog = document.createElement('dialog');
  dialog.id = 'ai-chat';
  dialog.className = 'ai-chat';
  dialog.setAttribute('aria-labelledby', 'ai-chat-title');

  /* 머리 */
  var head = el('div', 'ai-head');
  var titleBox = el('div', 'ai-title');
  var title = el('h2', null, '남는돈 AI');
  title.id = 'ai-chat-title';
  titleBox.appendChild(title);
  titleBox.appendChild(el('span', 'ai-badge', '시험 중'));
  head.appendChild(titleBox);
  var more = el('button', 'ai-icon ai-more', '⋯');
  more.type = 'button';
  more.setAttribute('aria-label', '더보기');
  more.setAttribute('aria-expanded', 'false');
  more.setAttribute('aria-controls', 'ai-menu');
  head.appendChild(more);
  var close = el('button', 'ai-icon ai-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', '닫기');
  close.onclick = function () {
    dialog.close();
  };
  head.appendChild(close);

  /* ⋯ 메뉴: 운영자 확인용 저장(선택, 기본 꺼짐) · 대화 삭제 · 안내 */
  var menu = el('div', 'ai-menu');
  menu.id = 'ai-menu';
  menu.hidden = true;
  var optRow = el('button', 'ai-opt-in', '운영자 확인용 저장: 꺼짐');
  optRow.type = 'button';
  optRow.setAttribute('aria-expanded', 'false');
  menu.appendChild(optRow);
  var optPanel = el('div', 'ai-opt-in-panel');
  optPanel.hidden = true;
  [
    '[선택] 서비스 개선을 위해 앞으로 보내는 질문·답변과 업종을 남는돈 운영자가 확인하도록 저장합니다.',
    '저장 항목: 질문, 답변, 업종, 작성 시각, 대화 번호, 삭제 키 확인값. 질문에 직접 적은 금액·이름도 함께 저장될 수 있습니다.',
    '대표님이 지우시거나 14일이 지나면 지웁니다. 데이터베이스의 되돌리기 기능 때문에 지운 뒤 7일 동안은 되살릴 수 있는 상태로 남고, 그 뒤에 사라집니다.',
    '켜지 않아도 질문 기능은 그대로 쓰실 수 있고, 언제든 끌 수 있습니다. 켜기 전 대화는 저장하지 않습니다.'
  ].forEach(function (t) {
    optPanel.appendChild(el('p', null, t));
  });
  var optActs = el('div', 'ai-opt-in-acts');
  var optOn = el('button', 'b on', '켜기');
  optOn.type = 'button';
  var optCancel = el('button', 'b', '취소');
  optCancel.type = 'button';
  optActs.appendChild(optOn);
  optActs.appendChild(optCancel);
  optPanel.appendChild(optActs);
  menu.appendChild(optPanel);
  var remove = el('button', 'b ai-remove', '대화 삭제');
  remove.type = 'button';
  menu.appendChild(remove);
  menu.appendChild(
    el(
      'p',
      null,
      '「대화 삭제」는 이 브라우저에서 운영자 확인용으로 저장된 대화를 지웁니다. 매장 「지우기」는 서버 대화를 지우지 않습니다. 브라우저 저장소를 지우면 삭제용 정보도 사라집니다.'
    )
  );
  var contact = el('a', null, '문의 안내');
  contact.href = KAKAO_CHAT;
  contact.target = '_blank';
  contact.rel = 'noopener noreferrer';
  menu.appendChild(contact);
  head.appendChild(menu);
  function closeMenu() {
    menu.hidden = true;
    optPanel.hidden = true;
    optRow.setAttribute('aria-expanded', 'false');
    more.setAttribute('aria-expanded', 'false');
  }
  more.onclick = function () {
    if (!menu.hidden) return closeMenu();
    menu.hidden = false;
    more.setAttribute('aria-expanded', 'true');
  };
  function setOptIn(on) {
    optIn = on;
    optRow.textContent = on ? '운영자 확인용 저장: 켜짐 · 끄기' : '운영자 확인용 저장: 꺼짐';
  }
  optRow.onclick = function () {
    if (optIn) {
      // 끄면 바로 다음 질문부터 저장하지 않는다.
      setOptIn(false);
      closeMenu();
      chatBubble(log, 'meta', '운영자 확인용 저장을 껐습니다. 다음 질문부터 저장하지 않습니다.');
      return;
    }
    optPanel.hidden = !optPanel.hidden;
    optRow.setAttribute('aria-expanded', String(!optPanel.hidden));
  };
  optOn.onclick = function () {
    setOptIn(true);
    closeMenu();
    chatBubble(
      log,
      'meta',
      '운영자 확인용 저장을 켰습니다. 지금부터 보내는 질문과 답변을 저장합니다.'
    );
  };
  optCancel.onclick = function () {
    optPanel.hidden = true;
    optRow.setAttribute('aria-expanded', 'false');
  };
  dialog.appendChild(head);

  /* 말풍선 */
  var log = el('div', 'ai-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  dialog.appendChild(log);
  chatBubble(log, 'bot', '보고 계신 결과에서 궁금한 점을 물어보세요.');
  var question = document.createElement('textarea');
  function addChips(topics, cls) {
    if (!topics.length) return;
    var chips = el('div', 'ai-chips' + (cls ? ' ' + cls : ''));
    topics.forEach(function (topic) {
      var text = CHAT_TOPIC_CHIPS[topic];
      var b = el('button', 'ai-chip', text);
      b.type = 'button';
      b.onclick = function () {
        question.value = text;
        chip = { topic: topic, text: text };
        question.focus();
      };
      chips.appendChild(b);
    });
    log.appendChild(chips);
    chips.scrollIntoView({ block: 'nearest' });
  }
  addChips(chatPickChips(summary, null, 3));

  /* 맨 아래: 「자세히」 상자 · 안내 두 줄 · 입력 칸 · 주의 한 줄 */
  var foot = el('div', 'ai-foot');
  var detail = el('div', 'ai-detail');
  detail.id = 'ai-detail';
  detail.hidden = true;
  detail.appendChild(el('h3', null, '남는돈이 자동으로 붙이는 것'));
  detail.appendChild(chatPreview(summary));
  detail.appendChild(el('h3', null, '대표님이 직접 적는 것'));
  detail.appendChild(
    el('p', null, '질문 칸에 적은 글은 그대로 전송됩니다. 계좌번호·이름·연락처는 적지 마세요.')
  );
  detail.appendChild(el('h3', null, '받는 곳과 목적'));
  detail.appendChild(el('p', null, '받는 곳: Cloudflare(서버·Workers AI) · 목적: 답변 생성'));
  if (CHAT_PRIVACY_URL) {
    var privacy = el('a', null, '개인정보 처리방침');
    privacy.href = CHAT_PRIVACY_URL;
    privacy.target = '_blank';
    privacy.rel = 'noopener noreferrer';
    detail.appendChild(privacy);
  } else detail.appendChild(el('p', 'ai-note', '개인정보 처리방침: 준비 중'));
  foot.appendChild(detail);
  var notice = el(
    'p',
    'ai-notice',
    '질문과 선택·비교 기간의 금액 요약(업종, 금액, 비율)이 미국과 영국에 있는 Cloudflare로 전송되어 답변을 만드는 데 쓰입니다. 답변을 만든 뒤에는 남지 않습니다. 운영자 확인을 켜지 않으시면 질문은 남는돈 서버에도 남지 않습니다. · '
  );
  var more2 = el('button', 'ai-link', '자세히');
  more2.type = 'button';
  more2.setAttribute('aria-expanded', 'false');
  more2.setAttribute('aria-controls', 'ai-detail');
  more2.onclick = function () {
    detail.hidden = !detail.hidden;
    more2.setAttribute('aria-expanded', String(!detail.hidden));
  };
  notice.appendChild(more2);
  foot.appendChild(notice);
  foot.appendChild(
    el('p', 'ai-notice ai-small', '질문 칸에 가게 이름이나 성함을 적으시면 그대로 전송됩니다.')
  );
  foot.appendChild(el('p', 'ai-notice', '앞선 대화는 답변에 반영되지 않습니다.'));
  var row = el('div', 'ai-input');
  question.maxLength = 300;
  question.rows = 1;
  question.setAttribute('aria-label', '질문');
  question.placeholder = '궁금한 점을 적어 주세요';
  question.addEventListener('input', function () {
    question.style.height = 'auto';
    question.style.height = Math.min(question.scrollHeight, 120) + 'px';
  });
  row.appendChild(question);
  var send = /** @type {HTMLButtonElement} */ (el('button', 'ai-send'));
  send.type = 'button';
  send.setAttribute('aria-label', '보내기');
  send.innerHTML = CHAT_SEND_ICON;
  row.appendChild(send);
  foot.appendChild(row);
  foot.appendChild(
    el(
      'p',
      'ai-fine',
      'AI 답변은 틀릴 수 있습니다. 질문에 계좌번호·연락처 같은 개인정보는 적지 마세요.'
    )
  );
  dialog.appendChild(foot);

  /* 보내기 — 누르면 바로 보낸다. 확인할 것은 통신 없이 말풍선으로 안내한다. */
  send.onclick = async function () {
    if (busy) return;
    if (store !== UP || summary.current.month !== UP.month) {
      chatBubble(log, 'bot', '보고 있는 자료가 바뀌었습니다. 창을 닫고 다시 열어주세요.');
      return;
    }
    var text = question.value.trim();
    if (!text || Array.from(text).length > 300) {
      chatBubble(log, 'bot', '질문을 300자 이내로 적어주세요.');
      return;
    }
    var day = new Date().toISOString().slice(0, 10);
    var use = chatRead(CHAT_KEYS.usage, { day: day, count: 0 });
    if (use.day !== day) use = { day: day, count: 0 };
    if (use.count >= CHAT_BROWSER_LIMIT) {
      chatBubble(
        log,
        'bot',
        chatLimitText(new Date(Math.floor(Date.now() / 86400000) * 86400000 + 86400000))
      );
      return;
    }
    var topic = chatTopicOf(text, chip);
    chip = null;
    var share = optIn;
    busy = true;
    send.disabled = true;
    remove.disabled = true;
    chatBubble(log, 'me', text);
    question.value = '';
    question.style.height = '';
    var reply = chatBubble(log, 'bot', '답변을 만들고 있습니다.');
    reply.classList.add('ai-pending');
    try {
      /* 지우기 키(Authorization)와 대화 번호(convId)는 운영자 확인용 저장을 켠 질문에만 붙인다. */
      var headers = { 'Content-Type': 'application/json', 'X-Namneundon-Tester': chatTesterKey() };
      var payload = { question: text, summary: summary, share: share };
      if (share) {
        var receipt = chatReceipt();
        headers.Authorization = 'Bearer ' + receipt.token;
        payload.convId = receipt.convId;
      }
      lsSet(CHAT_KEYS.usage, JSON.stringify({ day: day, count: use.count + 1 }));
      var res = await fetch(CHAT_URL + '/api/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000)
      });
      var data = await res.json();
      if (res.status === 429) reply.textContent = chatLimitText(data.nextAvailable);
      else if (res.status === 403)
        reply.textContent =
          '이 브라우저의 시험 키로는 질문할 수 없습니다. 결과 화면은 계속 사용할 수 있습니다.';
      else if (!res.ok || typeof data.answer !== 'string')
        reply.textContent = '지금은 답변을 받지 못했습니다. 결과 화면은 계속 사용할 수 있습니다.';
      else {
        reply.textContent = data.answer;
        reply.classList.add('ai-answer');
        if (data.saved) chatBubble(log, 'meta', '운영자 확인용으로 저장했습니다.');
        chatCountTopic(topic);
        addChips(chatPickChips(summary, topic.topic, 2), 'ai-next');
      }
    } catch (e) {
      reply.textContent =
        '질문을 보내거나 답변을 받지 못했습니다. 결과 화면은 계속 사용할 수 있습니다.';
    } finally {
      reply.classList.remove('ai-pending');
      busy = false;
      send.disabled = false;
      remove.disabled = false;
    }
  };

  remove.onclick = async function () {
    closeMenu();
    var receipt = chatRead(CHAT_KEYS.receipt, null);
    if (!receipt) {
      chatBubble(log, 'bot', '이 브라우저에 삭제용 대화 정보가 없습니다.');
      return;
    }
    remove.disabled = true;
    send.disabled = true;
    try {
      var res = await fetch(CHAT_URL + '/api/chat/' + receipt.convId, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + receipt.token,
          'X-Namneundon-Tester': chatTesterKey()
        },
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) throw new Error('delete_failed');
      lsDel(CHAT_KEYS.receipt);
      chatBubble(log, 'bot', '연결된 서버 대화를 삭제했습니다.');
    } catch (e) {
      chatBubble(log, 'bot', '서버 대화를 삭제하지 못했습니다. 다시 시도해주세요.');
    } finally {
      remove.disabled = false;
      send.disabled = busy;
    }
  };

  /* 휴대폰 뒤로 가기는 질문 창만 닫는다. 창을 열 때 이력 한 칸을 쌓고,
     닫기·Esc 로 닫았으면 그 칸을 되돌려 이력에 빈칸이 남지 않게 한다.
     닫기는 전송도 대화 삭제도 하지 않는다. */
  var viaHistory = false;
  function onPop() {
    viaHistory = true;
    if (dialog.open) dialog.close();
  }
  history.pushState({ aiChat: true }, '');
  window.addEventListener('popstate', onPop);
  dialog.addEventListener('close', function () {
    window.removeEventListener('popstate', onPop);
    if (!viaHistory && history.state && history.state.aiChat) history.back();
    dialog.remove();
    var fab = /** @type {HTMLButtonElement} */ (document.querySelector('.ai-fab'));
    if (fab) fab.focus();
  });
  document.body.appendChild(dialog);
  dialog.showModal();
  question.focus();
}
