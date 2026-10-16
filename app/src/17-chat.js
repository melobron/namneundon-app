/* 124차 시험 기능. 화면 열기·달 바꾸기는 통신하지 않는다. 질문 전송은 동의 단추 한 곳뿐이다. */
var CHAT_URL = 'https://chat.namneundon.com';
var CHAT_BROWSER_LIMIT = 10;
var CHAT_KEYS = {
  enabled: 'fc.ai.enabled',
  usage: 'fc.ai.usage',
  receipt: 'fc.ai.receipt',
  tester: 'fc.ai.tester'
};
var CHAT_KEY_FORM = /^[\x21-\x7e]{1,256}$/;
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
   ?ai=1 만으로는 켜지지 않는다 — 키가 있어야 띠가 보인다. */
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
/* 띠가 보이는 동안은 결과가 띠 위의 스크롤 칸(body) 안에서만 움직인다 (app.css 124차).
   결과 화면의 「맨 위로」·「자리 지키기」가 그 칸을 움직이게 한 곳으로 모은다. */
function pageScroller() {
  return document.querySelector('#up-result:not([hidden]) .ai-band')
    ? document.body
    : document.scrollingElement || document.documentElement;
}
function pageScrollTop() {
  return pageScroller().scrollTop;
}
function pageScrollTo(y) {
  pageScroller().scrollTop = y;
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
    ' (한국시간)입니다. 기존 분석 화면은 계속 사용할 수 있습니다.'
  );
}
/* 예시 질문은 질문 칸을 채우기만 한다. 전송은 늘 동의 단추 한 곳이다. */
var CHAT_CHIPS = [
  '이번 달 결과를 설명해 줘',
  '차액과 통장 잔액은 왜 달라?',
  '아직 안 정한 돈은 뭐야?'
];
/* 진입점은 결과 화면 맨 아래 전체 폭 띠 하나다. 결과 화면(up-result) 안에 두어
   다른 화면으로 갈 때 결과와 함께 감춰지게 한다 — 따로 여닫는 곳을 늘리지 않는다.
   띠가 있으면 결과가 보이는 칸이 띠 위에서 끝난다 (app.css 124차) — 띠가 결과를 덮지 않는다. */
function drawChatButton(host) {
  if (!chatEnabled()) return;
  var band = el('div', 'ai-band');
  var button = el('button', 'b on ai-band-go', 'AI에게 결과 묻기');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.onclick = openChat;
  band.appendChild(button);
  host.appendChild(band);
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
function openChat() {
  if (document.getElementById('ai-chat')) return;
  var summary = chatSummary(); // 미리 본 요약과 실제 전송값을 같은 객체로 고정한다.
  var store = UP;
  var dialog = document.createElement('dialog');
  dialog.id = 'ai-chat';
  dialog.className = 'ai-chat';
  dialog.setAttribute('aria-labelledby', 'ai-chat-title');
  /* 머리 · 본문 · 질문 칸 세 칸으로 나눈다. 키보드가 올라와 높이가 줄어도
     돌아가기와 질문 칸 · 전송은 화면 안에 남고 본문만 줄어든다. */
  var head = el('div', 'ai-head');
  var back = el('button', 'b ai-back', '결과로 돌아가기');
  back.type = 'button';
  back.onclick = function () {
    dialog.close();
  };
  head.appendChild(back);
  var title = el('h2', null, 'AI에게 결과 묻기');
  title.id = 'ai-chat-title';
  head.appendChild(title);
  dialog.appendChild(head);
  var body = el('div', 'ai-body');
  var foot = el('div', 'ai-foot');
  body.appendChild(
    el(
      'p',
      null,
      '질문과 선택한 기간의 업종·금액 요약을 남는돈 서버(Cloudflare)와 Cloudflare Workers AI로 보내 답변을 만듭니다. 원본 파일·개별 거래내역·거래처 이름은 자동으로 보내지 않습니다.'
    )
  );
  body.appendChild(
    el(
      'p',
      null,
      '질문에는 계좌번호, 연락처, 직원·고객·환자의 개인정보를 적지 마세요. 이용하지 않아도 기존 분석 화면은 그대로 사용할 수 있습니다.'
    )
  );
  body.appendChild(
    el(
      'p',
      null,
      '선택한 달: ' +
        chatMonthName(summary.current.month) +
        '. AI 답변은 틀릴 수 있습니다. 한 번의 질문에는 현재 요약만 보내며 이전 대화는 보내지 않습니다.'
    )
  );
  var preview = chatPreview(summary);
  preview.hidden = true;
  var see = el('button', 'b', '전송할 내용 보기');
  see.type = 'button';
  see.onclick = function () {
    preview.hidden = !preview.hidden;
  };
  body.appendChild(see);
  body.appendChild(preview);
  var question = document.createElement('textarea');
  question.maxLength = 300;
  question.rows = 3;
  question.setAttribute('aria-label', '질문');
  question.placeholder = '예: 지난달과 비교해 달라진 항목은 무엇인가요?';
  var chips = el('div', 'ai-chips');
  CHAT_CHIPS.forEach(function (text) {
    var chip = el('button', 'ai-chip', text);
    chip.type = 'button';
    chip.onclick = function () {
      question.value = text;
      question.focus();
    };
    chips.appendChild(chip);
  });
  foot.appendChild(chips);
  foot.appendChild(question);
  var label = el('label', 'ai-share');
  var share = document.createElement('input');
  share.type = 'checkbox';
  label.appendChild(share);
  label.appendChild(
    document.createTextNode(
      '서비스 개선을 위해 남는돈 운영자 강요한이 질문과 답변을 확인하는 데 동의합니다. 동의한 대화와 업종·작성일은 30일간 보관 후 삭제합니다. 대화에 포함된 금액과 이름도 함께 저장될 수 있습니다.'
    )
  );
  body.appendChild(label);
  body.appendChild(el('p', 'ai-note', '동의하지 않아도 내용 없이 날짜별 사용 횟수만 집계됩니다.'));
  var answer = el('div', 'ai-answer');
  answer.setAttribute('aria-live', 'polite');
  body.appendChild(answer);
  var remove = el('button', 'b', '대화 삭제');
  remove.type = 'button';
  body.appendChild(remove);
  var status = el('p', 'ai-status');
  status.setAttribute('role', 'status');
  foot.appendChild(status);
  var actions = el('div', 'ai-actions');
  var send = el('button', 'b on', '동의하고 질문 보내기');
  send.type = 'button';
  actions.appendChild(send);
  foot.appendChild(actions);
  body.appendChild(
    el(
      'p',
      null,
      '매장 「지우기」는 서버 대화를 지우지 않습니다. 「대화 삭제」는 이 브라우저의 삭제용 정보에 연결된 공유 대화를 지웁니다. 브라우저 저장소를 지우면 삭제용 정보도 사라집니다.'
    )
  );
  var contact = el('a', null, '문의 안내');
  contact.href = KAKAO_CHAT;
  contact.target = '_blank';
  contact.rel = 'noopener noreferrer';
  body.appendChild(contact);
  dialog.appendChild(body);
  dialog.appendChild(foot);
  send.onclick = async function () {
    if (store !== UP || summary.current.month !== UP.month) {
      status.textContent = '보고 있는 자료가 바뀌었습니다. 창을 닫고 다시 열어주세요.';
      return;
    }
    var text = question.value.trim();
    if (!text || Array.from(text).length > 300) {
      status.textContent = '질문을 300자 이내로 적어주세요.';
      return;
    }
    var day = new Date().toISOString().slice(0, 10);
    var use = chatRead(CHAT_KEYS.usage, { day: day, count: 0 });
    if (use.day !== day) use = { day: day, count: 0 };
    if (use.count >= CHAT_BROWSER_LIMIT) {
      status.textContent = chatLimitText(
        new Date(Math.floor(Date.now() / 86400000) * 86400000 + 86400000)
      );
      return;
    }
    send.disabled = true;
    remove.disabled = true;
    question.disabled = true;
    share.disabled = true;
    status.textContent = '답변을 만들고 있습니다.';
    try {
      var receipt = chatReceipt();
      lsSet(CHAT_KEYS.usage, JSON.stringify({ day: day, count: use.count + 1 }));
      var res = await fetch(CHAT_URL + '/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + receipt.token,
          'X-Namneundon-Tester': chatTesterKey()
        },
        body: JSON.stringify({
          question: text,
          summary: summary,
          share: share.checked,
          convId: receipt.convId
        }),
        signal: AbortSignal.timeout(45000)
      });
      var data = await res.json();
      if (res.status === 429) status.textContent = chatLimitText(data.nextAvailable);
      else if (res.status === 403)
        status.textContent =
          '이 브라우저의 시험 키로는 질문할 수 없습니다. 기존 분석 화면은 계속 사용할 수 있습니다.';
      else if (!res.ok || typeof data.answer !== 'string')
        status.textContent =
          '지금은 답변을 받지 못했습니다. 기존 분석 화면은 계속 사용할 수 있습니다.';
      else {
        answer.textContent = data.answer;
        answer.scrollIntoView({ block: 'nearest' });
        status.textContent = data.saved
          ? '질문과 답변이 공유 기록으로 저장되었습니다.'
          : '운영자 열람용 대화 기록을 저장하지 않았습니다.';
      }
    } catch (e) {
      status.textContent =
        '질문을 보내거나 답변을 받지 못했습니다. 기존 분석 화면은 계속 사용할 수 있습니다.';
    } finally {
      send.disabled = false;
      remove.disabled = false;
      question.disabled = false;
      share.disabled = false;
    }
  };
  remove.onclick = async function () {
    var receipt = chatRead(CHAT_KEYS.receipt, null);
    if (!receipt) {
      answer.textContent = '';
      status.textContent = '이 브라우저에 삭제용 대화 정보가 없습니다.';
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
      answer.textContent = '';
      question.value = '';
      status.textContent = '연결된 서버 대화를 삭제했습니다.';
    } catch (e) {
      status.textContent = '서버 대화를 삭제하지 못했습니다. 다시 시도해주세요.';
    } finally {
      remove.disabled = false;
      send.disabled = false;
    }
  };
  /* 휴대폰 뒤로 가기는 질문 창만 닫는다. 창을 열 때 이력 한 칸을 쌓고,
     단추·Esc 로 닫았으면 그 칸을 되돌려 이력에 빈칸이 남지 않게 한다.
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
