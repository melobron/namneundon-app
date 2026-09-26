/* ── core · 올린 파일 판별 — PDF · HTML 알아보기 · 은행 이름 찾기 · 겹치는 거래 · 못 읽은 까닭 글 · 검산이 깨진 줄 고르기.
   옛 10-demo-read-files · 11-upload-flow 의 일부.
   단위 테스트: tests/core/files.spec.mjs
   리팩토링 B-1i (2026-09-26). */
/* ── (원래 10-demo-read-files.js) ── */
/* ── 36차 4단계 I · 계좌 합치기 ────────────────────────────
   ★ 「갈아탄 것」이 아니다. 신한이 0이 된 달이 없다.
     이어붙이기(뒤 파일이 앞 파일을 대체)로 만들면 2026-04 이후 신한 쪽이 통째로 빠진다.
   ★ 계좌가 다르면 잔액 사슬은 절대 안 이어진다.
     파일마다 따로 읽고 따로 검산한 뒤에 합친다.
   ★ UP.banks 다. UP.accounts 가 아니다 —
     UP.accounts 는 이미 「항목 목록」이라 거기에 계좌를 담으면 항목 관리가 통째로 깨진다 */
/* ★ 79차 · 경남은행 HTML.
   은행 HTML은 UTF-8 또는 한글 구형 인코딩으로 저장될 수 있다.
   파일 앞부분의 영문 meta charset만 보고 맞는 방식으로 풀고, 선언이 없으면 둘 다 시도한다.
   엑셀은 기존 ArrayBuffer 경로를 그대로 사용한다. */
function asciiHead(bytes) {
  var s = '',
    n = Math.min(bytes.length, 8192);
  for (var i = 0; i < n; i++) s += bytes[i] < 128 ? String.fromCharCode(bytes[i]) : ' ';
  return s;
}
function htmlEncoding(bytes) {
  var h = asciiHead(bytes);
  var m = h.match(/charset\s*=\s*["']?\s*([a-z0-9._-]+)/i);
  if (!m) return null;
  var e = m[1].toLowerCase();
  if (/euc-kr|ks_c_5601|cp949|windows-949|x-windows-949/.test(e)) return 'euc-kr';
  return 'utf-8';
}
function looksHtml(file, bytes) {
  if (/\.html?$/i.test(String((file && file.name) || ''))) return true;
  return /<(?:!doctype\s+html|html|table)\b/i.test(asciiHead(bytes));
}
/* ── 92차 ②③ · PDF 한 장 읽기 ─────────────────────────────────────
   길은 엑셀과 같다. 다른 것은 「무엇으로 표를 만드느냐」뿐이다 —
   엑셀은 시트에서, PDF 는 글자 좌표에서 표를 만든다 (pdfGrid).
   그 뒤 extractRows·orderAndVerify 는 엑셀이 지나온 그 함수 그대로다 */
function isPdfFile(f) {
  return (
    /\.pdf$/i.test(String((f && f.name) || '')) || String((f && f.type) || '') === 'application/pdf'
  );
}
/* ── 94차 ① · PDF 에서 은행 이름을 찾는다 ──────────────────────────────
   첫 쪽 위 25% 안에서만 본다. 은행 이름은 명세서 머리글에 찍히기 때문이다.
   아래까지 뒤지면 거래처명의 「국민은행 이체」 같은 글자가 잡혀
   엉뚱한 은행 이름을 화면에 쓰게 된다 — 그건 아무 말도 안 하느니만 못하다.
   ★ 확실하지 않으면 null 이다. 못 알아본 것은 못 알아봤다고 둔다 */
var BANK_MARKS = [
  ['국민', ['KB국민은행', 'KB국민', '국민은행']],
  ['신한', ['신한은행', 'Shinhan']],
  ['우리', ['우리은행']],
  ['새마을금고', ['MG새마을금고', '새마을금고', 'MG더뱅킹']],
  ['하나', ['하나은행', 'KEB하나']],
  ['농협', ['NH농협', '농협은행', '농협중앙회']],
  ['기업', ['IBK기업', '기업은행', 'IBK']],
  ['JT친애', ['JT친애', '제이티친애']],
  ['예가람', ['예가람']]
];
/* 사전 차례대로 본다 — 앞에 있는 것이 먼저 잡히면 그걸로 끝낸다.
   ★ 띄어쓰기는 지우고 본다. PDF 는 「KB」 「국민은행」 처럼 한 낱말을
     조각으로 흘려주는 일이 잦아서, 그대로 두면 아무것도 안 잡힌다 */
function bankMarkOf(글) {
  var t = String(글 || '').replace(/\s+/g, '');
  for (var i = 0; i < BANK_MARKS.length; i++) {
    for (var k = 0; k < BANK_MARKS[i][1].length; k++) {
      if (t.indexOf(BANK_MARKS[i][1][k]) !== -1) return BANK_MARKS[i][0];
    }
  }
  return null;
}
function pdfBankName(doc) {
  /* ★ 여기서 무슨 일이 나도 파일 읽기를 막으면 안 된다. 은행 이름은 안내를
     거들 뿐이고, 못 찾으면 null 로 두면 그만이다 — 그래서 통째로 감싼다 */
  return Promise.resolve()
    .then(function () {
      return doc.getPage(1);
    })
    .then(function (page) {
      var 쪽높이 = 0;
      try {
        쪽높이 = page.getViewport({ scale: 1 }).height || 0;
      } catch (e) {
        쪽높이 = 0;
      }
      return page.getTextContent().then(function (tc) {
        var 조각 = [];
        (tc.items || []).forEach(function (it) {
          var s = String(it.str == null ? '' : it.str).trim();
          if (!s) return;
          조각.push({ s: s, y: +(it.transform || [])[5] || 0 });
        });
        if (!조각.length) return null;
        /* 좌표는 쪽 아래가 0 이다. 위 25% 란 높이의 75% 보다 위쪽이다.
         쪽 크기를 못 읽으면 글자가 놓인 범위로 대신 잰다 */
        var 한계;
        if (쪽높이) {
          한계 = 쪽높이 * 0.75;
        } else {
          var 위 = 조각[0].y,
            아래 = 조각[0].y;
          조각.forEach(function (c) {
            if (c.y > 위) 위 = c.y;
            if (c.y < 아래) 아래 = c.y;
          });
          한계 = 위 - (위 - 아래) * 0.25;
        }
        var 윗글 = [];
        조각.forEach(function (c) {
          if (c.y >= 한계) 윗글.push(c.s);
        });
        return bankMarkOf(윗글.join(' '));
      });
    })
    .catch(function () {
      return null;
    });
}
/* ── 47차 ① · 은행 이름을 만드는 곳을 하나로 ────────────────────
   안내 화면은 「케이뱅크」라고 부르는데 파일 목록은 「케이은행」이라고 불렀다.
   같은 앱이 같은 은행을 두 이름으로 부르고 있었다. 이름은 bankHelpName 하나가 만든다.
   ★ 그리고 짧은 이름은 그것만으로 못 믿는다 —
     「케이터링업체정산.xls」가 「케이」에 걸려 「케이은행」이 됐다.
     40차에 고친 「틀린 이름을 확신 있게 붙이는」 문제와 같은 자리다.
   ★ 인터넷은행 셋은 「뱅크」가 붙어 있을 때만 인정한다 —
     「카카오페이정산」은 카카오뱅크가 아니다.
   ★ 두 글자 약자도 「은행」·「뱅크」가 붙어 있을 때만 인정한다 —
     「○○산업」·「제주도○○」가 다 걸린다.
   ★ 모르는 것은 모른다고 둔다. 「계좌 N」이 틀린 이름보다 낫다 */
var BANK_NET = ['카카오', '토스', '케이']; /* 「○○뱅크」로 부르는 곳 */
/* ★ 실파일 거래처 1,071개를 훑어 실제로 걸리는 것을 찾았다 —
   KB 7곳 · 케이 8곳 · NH 5곳 · 산업 1곳 · 제주 1곳 (전부 은행이 아니다).
   거기에 더해 낱말로도 흔한 것들을 같이 좁힌다 —
   「국민연금」·「하나로마트」·「우리가게」·「기업자유예금」이 다 파일 이름에 나올 수 있다.
   ★ 좁히면 진짜 은행 파일이 「계좌 N」으로 나올 수는 있다. 그건 고칠 칸이 나오므로 괜찮다.
     틀린 이름은 고칠 칸조차 안 나온다 — 40차에 그것 때문에 고쳤다 */
var BANK_STRICT = [
  'KB',
  'NH',
  'SC',
  '산업',
  '제주',
  '수협',
  '신협',
  '국민',
  '하나',
  '우리',
  '기업'
];
function bankHit(t, key) {
  if (t.indexOf(key + '은행') !== -1) return true;
  if (t.indexOf(key + '뱅크') !== -1) return true;
  if (BANK_NET.indexOf(key) !== -1) return false; /* 뱅크가 붙어야만 */
  if (BANK_STRICT.indexOf(key) !== -1) return false; /* 은행·뱅크가 붙어야만 */
  return t.indexOf(key) !== -1;
}
function bankOf(fileName, sheet, hint) {
  /* 파일 이름·시트 이름에 없으면 파일 위쪽에서 찾은 것을 쓴다.
     부산 파일은 시트 이름이 sheet1 이라 「계좌 2」로 나왔다 */
  var t = String(fileName || '') + ' ' + String(sheet || '');
  for (var i = 0; i < BANK_NAMES.length; i++) {
    if (bankHit(t, BANK_NAMES[i])) return bankHelpName(BANK_NAMES[i]);
  }
  return hint || null;
}
/* 같은 파일을 두 번 올렸나 — 이름이 같으면 안 받는다.
   이름이 달라도 (날짜+금액+잔액)이 같은 거래가 절반을 넘으면 여쭙는다.
   ★ 자동으로 지우지 않는다 */
function sameRowKey(r) {
  return r.at + '|' + r.amount + '|' + r.balance;
}
function overlapWith(banks, one) {
  var seen = {};
  banks.forEach(function (b) {
    b.rows.forEach(function (r) {
      seen[sameRowKey(r)] = 1;
    });
  });
  var hit = 0;
  one.rows.forEach(function (r) {
    if (seen[sameRowKey(r)]) hit++;
  });
  return one.rows.length ? hit / one.rows.length : 0;
}
/* ── (원래 11-upload-flow.js) ── */
/* ★ 45차 ①. 「읽지 못했습니다」로 끝내지 않는다. 무엇을 하면 되는지까지 적는다.
   은행이 확장자만 .xls 로 붙여 CSV·HTML 을 주는 일이 흔하다 —
   파일 고르기의 accept 는 확장자만 보므로 그대로 통과한다 */
var FIX_TIP = '은행 앱에서 엑셀(.xlsx)로 다시 받아주세요';
function failWhy(w, bank) {
  /* ★ 102차 추가 ②. 암호 걸린 엑셀.
     「엑셀로 다시 받으세요」는 이 파일에 대해 거짓말이다 — 이미 엑셀이다.
     실제로 읽히는 길(증명서 발급 PDF)로 보내드린다.
     ★ 은행 이름은 짧은 열쇠('케이')로 올 때도, 보이는 이름('케이뱅크')으로 올 때도 있다.
       bankOf 는 보이는 이름을 주고 UP_HELP.bank 는 짧은 열쇠를 준다. 둘 다 받는다 */
  if (w === 'xlsx_locked') {
    return (
      '암호가 걸린 엑셀이라 아직 못 읽습니다 — ' +
      (bank === '케이' || bank === '케이뱅크'
        ? '케이뱅크 앱에서 전체 메뉴 → 「고객센터」 → 「증명서 발급」 → 「거래내역증명서」로 받아주세요'
        : '같은 은행 앱에서 거래내역증명서(PDF)로 받아주시면 읽어드리겠습니다')
    );
  }
  if (w === 'notxlsx') return '엑셀 파일이 아닙니다 — ' + FIX_TIP;
  /* ★ 50차 ③. 머리글은 다 맞는데 줄이 0건인 파일이 있다.
     조회를 안 하고 「내려받기」만 누르면 그렇게 나온다.
     이건 제대로 된 .xlsx 다 — 「엑셀로 다시 받으세요」는 거짓말이고,
     시키는 대로 해도 똑같은 파일이 또 나온다 */
  if (w === 'empty') return '이 파일에는 거래가 한 건도 없습니다';
  if (w === 'norows') return '읽을 수 있는 표를 못 찾았습니다 — ' + FIX_TIP;
  if (w === 'nohead')
    return '거래내역 표를 못 찾았습니다 — 기간을 정해 「거래내역 조회」에서 받아주세요';
  /* ★ 92차 ⑤. PDF 는 못 읽어도 여기서 끝내지 않는다.
     할 수 있는 것(엑셀)과, 우리가 이 양식을 받을 길(카카오채널)을 같이 말한다 */
  if (w === 'pdf_locked')
    return '비밀번호를 안 넣으셔서 못 열었습니다 — 다시 올려주시면 한 번 더 여쭙겠습니다';
  if (w === 'pdf_image')
    return '이 PDF 는 글자가 없는 사진이라 읽을 수 없어요 — 엑셀(.xlsx)로 올려주시거나, 카카오채널로 문의해주시면 도와드리겠습니다';
  /* ★ 94차 ③. 나머지 셋은 은행을 알아봤는지, 그 은행이 폰에서 되는지에 따라
     해야 할 말이 다르다. 한 문장으로 뭉뚱그리면 절반은 틀린 말이 된다 */
  if (w === 'pdf_no_header' || w === 'pdf_open' || w === 'pdf_total') return pdfAskWhy(w, bank);
  return '읽지 못했습니다 — ' + FIX_TIP;
}
/* ── 94차 ② · 폰 앱에서 거래내역 파일이 나오는 은행과 안 나오는 은행 ──────
   2026-09-18 은행 고객센터에 직접 전화해서 확인한 것이다. 추측으로 늘리지 않는다.
   나중에 통화로 바뀌면 이 두 줄만 고치면 안내가 전부 따라 바뀐다.
   ★ 개인사업자 통장도 개인계좌와 같은 앱을 쓴다 — 따로 가르지 않는다 */
var PHONE_OK = ['국민', '신한', '우리', '새마을금고']; /* 폰 앱에서 파일이 나온다 */
var PHONE_NONE = ['하나', '농협', '기업', 'JT친애', '예가람']; /* PC 인터넷뱅킹에서만 나온다 */
/* 화면에는 사람이 부르는 이름을 쓴다. 'JT친애' 라고 적으면 무슨 말인지 모르신다 */
var BANK_FULL = {
  국민: '국민은행',
  신한: '신한은행',
  우리: '우리은행',
  새마을금고: '새마을금고',
  하나: '하나은행',
  농협: '농협은행',
  기업: '기업은행',
  JT친애: 'JT친애저축은행',
  예가람: '예가람저축은행'
};
/* ★ 94차 ③. 사장님은 자기 은행이 폰에서 되는지 모르신다.
   그걸 알려드리는 것 자체가 값이다 — 되는 은행께는 「알려주시면 맞춰드린다」,
   안 되는 은행께는 「PC 에서 엑셀로 받으시라」가 맞는 말이다.
   은행을 못 알아봤으면 둘 다 말하지 않는다 */
function pdfAskWhy(w, bank) {
  var 이름 = bank ? BANK_FULL[bank] || bank : null;
  if (이름 && PHONE_NONE.indexOf(bank) !== -1) {
    /* 우리가 이 양식을 넣어드려도 이분들껜 소용이 없다 — 폰에서 파일 자체가 안 나온다.
       그래서 세 경우 모두 할 수 있는 길 하나만 정확히 알려드린다 */
    return (
      이름 +
      은는(이름) +
      ' 폰 앱에서 거래내역 파일이 안 나옵니다 — PC 인터넷뱅킹에서 엑셀(.xlsx)로 받으시면 바로 읽어드립니다'
    );
  }
  if (이름 && PHONE_OK.indexOf(bank) !== -1) {
    /* 폰으로 받으실 수 있는데 우리가 못 읽는 것뿐이다. 엑셀로 가시라고 하면 안 된다 */
    if (w === 'pdf_no_header')
      return 이름 + ' PDF 는 아직 안 읽혀요 — 카카오채널로 알려주시면 바로 맞춰서 읽어드리겠습니다';
    if (w === 'pdf_open')
      return (
        '이 ' +
        이름 +
        ' PDF 를 여는 데 실패했습니다 — 카카오채널로 알려주시면 바로 확인해서 읽어드리겠습니다'
      );
    return (
      '이 ' +
      이름 +
      ' PDF 를 끝까지 못 읽었습니다 (은행이 적은 합계와 안 맞습니다) — 카카오채널로 알려주시면 바로 맞춰드리겠습니다'
    );
  }
  /* 은행을 못 알아봤다. 어느 쪽인지 모르니 둘 다 열어두고 은행 이름을 여쭌다 */
  if (w === 'pdf_no_header')
    return '이 은행 PDF 는 아직 안 읽혀요 — 엑셀(.xlsx)로 올리시면 바로 되고, 카카오채널로 은행 이름만 알려주시면 이 은행도 준비하겠습니다';
  if (w === 'pdf_open')
    return '이 PDF 를 여는 데 실패했습니다 — 엑셀(.xlsx)로 올리시면 바로 되고, 카카오채널로 은행 이름만 알려주시면 확인하겠습니다';
  /* ★ 92-2차 ③. 못 읽은 것이 아니라 「읽었는데 은행이 적은 합계와 안 맞는다」는 뜻이다.
     그대로 보여드리면 틀린 숫자가 되므로 여기서 멈춘다 */
  return '이 PDF 를 끝까지 못 읽었습니다 (은행이 적은 합계와 안 맞습니다) — 엑셀(.xlsx)로 올리시면 바로 되고, 카카오채널로 은행 이름만 알려주시면 맞춰두겠습니다';
}
/* ★ 94차 ④. 카카오 링크 문구도 무리에 맞춘다.
   「이 파일 보내기」는 뺀다 — 사장님 거래내역을 우리가 받을 이유가 없다 */
function kakaoLabel(bank) {
  if (bank && PHONE_OK.indexOf(bank) !== -1) return '카카오채널로 알려주기';
  if (bank && PHONE_NONE.indexOf(bank) !== -1) return '카카오채널로 문의하기';
  return '카카오채널로 은행 이름 알려주기';
}
/* 검산이 깨지면 숫자를 보여주지 않는다. 어디가 깨졌는지 보여주고 사장님이 정한다. */
var BREAK_MAX = 0.01; /* 검산 실패가 이 비율을 넘으면 숫자를 아예 안 보여준다 */
/* ★ 39차 1번. 문턱은 계좌별로 잰다 — startFromBanks 와 잣대를 맞춘다.
   합계로 재면 계좌 하나가 통째로 망가져도 다른 계좌가 크면 비율에 묻힌다 */
function breaksOverIn(U) {
  if (U.banks && U.banks.length) {
    return U.banks.filter(function (b) {
      return b.rows.length && b.breaks.length / b.rows.length >= BREAK_MAX;
    });
  }
  return U.rows.length && U.breaks.length / U.rows.length >= BREAK_MAX
    ? [{ bank: null, rows: U.rows, breaks: U.breaks }]
    : [];
}
/* ── 64-9 · 확인 카드 응답 저장 ─────────────────────────────────
   같은 파일을 다시 올리면 전에 「확인」하신 거래를 또 물었다.
   확인 답도 정하신 내용이다 — 한 번 답하시면 다시 안 묻는다.
 ★ 열쇠는 날짜 + 원문 이름 + 엑셀 행번호다. xferKey 와 같은 방식이고
   금액을 안 넣는다 — 넣으면 hasNumber 검사에 걸린다.
 ★ 통을 따로 둔다 (fc.picks 가 아니다). 확인 카드는 매장 이름을 묻기 전에 뜨므로
   그 시점에는 어느 매장 통에 넣어야 할지 알 수가 없다.
   담기는 것은 글자 하나(gap·stated·unknown)뿐이고 금액도 이름도 안 들어간다 */
/* 저장 이름 BREAK_KEY 은 00-storage.js 에 모았다 */
function breakKey(r) {
  return r.at.slice(0, 10) + '|' + String(r.payee || '') + '|' + (r.excelRow || 0);
}
/* 방향과 금액을 한 덩이로 — 두 카드가 같은 말로 쓴다 */
/* ★ 112차 ②. 0원에는 방향이 없다. 「출금 0원」은 없는 말이다 */
function 금액글(v) {
  return (v === 0 ? '' : v > 0 ? '입금 ' : '출금 ') + won(Math.abs(v)) + '원';
}
/* ★ 112차 ②㉮. 단추 이름은 「맞음」이 아니라 「반영」이다 —
   고르는 일이 무엇인지 이름에 적는다. 입금·출금 방향도 실제값으로 함께 적는다 */
function 반영글(앞, v) {
  var a = Math.abs(v);
  return 앞 + ' ' + won(a) + '원' + (a ? (v > 0 ? ' 입금' : ' 출금') : '') + ' 반영';
}
/* ★ 112차 ②㉯. 「확인 필요로 분류」는 두 카드에서 같은 이름·같은 뜻·같은 동작이다.
   이름과 설명을 한 군데 둔다 — 한 곳만 고치면 또 서로 다른 말을 하게 된다 (108차 ⑤) */
var CK_빼는이름 = '확인 필요로 분류';
/* 갈래마다 고를 수 있는 것. stated 가 null 이면 파일에 적힌 금액이 아예 없다.
   ★ 셋(또는 둘)의 결과가 서로 달라야 한다 — applyPick 이 그것을 지킨다 */
function ckPickList(stated, delta) {
  var out = [];
  if (stated !== null && stated !== undefined) {
    out.push(['stated', 반영글('파일 금액', stated)]);
    out.push(['gap', 반영글('잔액 차이', delta)]);
  } else {
    /* 금액 없음 카드 — 고를 금액이 하나뿐이다. 바로 위에 굵게 선 금액을
       단추에 되풀이하지 않는다 (390px 에서 두 줄이 된다) */
    out.push(['gap', '이 금액으로 반영']);
  }
  out.push(['unknown', CK_빼는이름]);
  return out;
}
/* ── 112차 ② · 확인 카드가 만드는 네 상태 ──────────────────────────
   예전에는 「900,000원이 맞음」과 「나중에 확인」이 applyBreaks 의 같은 가지로 떨어져
   결과가 한 글자도 다르지 않았고, 「나중에 확인」이 화면 설명과 달리
   그 금액을 매출·지출에 그대로 넣고 있었다.
   이제 고른 것마다 상태가 다르다. 잔액 사슬(amtOf = amount + residual)은 넷 다 선다.

     고른 것            amount   residual      딱지        계산에
     잔액 차이 반영     delta    0             추정        들어감
     (미응답)           delta    0             추정        들어감 · picked=false
     파일 금액 반영     stated   delta−stated  없음        들어감 (차액만 뺀다)
     확인 필요로 분류   0        delta         없음        안 들어감 (거래 전체)

   ★ 원본을 잃지 않는다 — 파일에 적혀 있던 금액은 r.stated 에 그대로 둔다.
     계산에서 뺐다는 이유로 r.balance 를 건드리지 않는다.
   ★ 「고르셨는가(picked)」와 「금액의 출처(patched)」는 다른 것이다 (㉱).
     고르셨다고 해서 「추정」 딱지가 「원본」으로 바뀌지 않는다.
   ★ delta 는 언제나 amtOf(r) 로 되찾을 수 있다 — 네 상태 모두 amount+residual = delta 다.
     그래서 몇 번을 바꿔 눌러도 값이 겹쳐 쌓이지 않는다 (완료 기준 10). */
function applyPick(r, pick, delta, picked) {
  /* 파일에 적혀 있던 금액을 한 번만 잡아 둔다. 그 뒤로는 절대 안 덮는다.
     ★ 옛 저장본에는 이 칸이 없다. 그때는 residual 이 남아 있던 줄만
       amount 가 곧 파일 금액이었다 — patched 였던 줄은 알 길이 없으니 없는 것으로 둔다 */
  if (r.stated === undefined) r.stated = r.patched ? null : r.amount;
  var st = r.stated === null || r.stated === undefined ? null : r.stated;
  if (pick === 'stated' && st !== null) {
    r.amount = st;
    r.residual = delta - st; /* 설명 안 되는 차액만 따로 뺀다 */
    r.patched = false;
    r.byStated = true;
    r.unsure = false;
  } else if (pick === 'unknown') {
    /* ★ ㉯. 거래 전체를 계산에서 뺀다. 잔액이 움직인 만큼이 통째로 차액이 된다 */
    r.amount = 0;
    r.residual = delta;
    r.patched = false;
    r.byStated = false;
    r.unsure = true;
  } else {
    r.amount = delta; /* 잔액이 움직인 금액을 반영한다 */
    r.residual = 0;
    r.patched = true;
    r.byStated = false;
    r.unsure = false;
  }
  r.picked = !!picked;
}
/* 잔액이 1원도 안 움직여 아예 안 물은 줄 (autoZeroBreaks). UP.zeroed 로 따로 센다.
   ★ 112차 ② 이전 저장본에는 r.zeroed 가 없다 — 그 줄은 모양으로 가른다.
     patched 이면서 금액도 차액도 0인 줄은 이 갈래뿐이다 */
function zeroRow(r) {
  return !!r.zeroed || (!!r.patched && !r.amount && !r.residual);
}
/* 확인 카드를 거쳐 온 줄인가 — 되살린 카드에 세울 목록이다 */
function ckRow(r) {
  return !zeroRow(r) && (r.patched || r.unsure || r.byStated);
}
/* ★ 109차 ②. 확인 카드가 어느 갈래인지. 카드를 그릴 때 쓰는 잣대다 */
function breakKind(b) {
  var r = b.row,
    delta = r.balance - b.prev;
  if (r.amount === null && delta === 0) return 'first'; /* 앞 잔액이 없다 */
  if (r.amount === null) return 'gap'; /* 금액 칸이 비었다 */
  return 'diff'; /* 금액과 잔액이 어긋난다 */
}
