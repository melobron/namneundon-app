/* 예시 거래내역을 실제 파일과 같은 모양으로 만든다.
   잔액은 시작 잔액에서 더해 나가므로 금액을 배수 변환해도 검산이 맞는다 */
function demoRows() {
  var out = [],
    bal = DEMO_OPEN;
  for (var i = 0; i < DEMO_TX.length; i++) {
    var f = DEMO_TX[i].split('|');
    var amt = +f[2];
    bal += amt;
    out.push({
      at: DEMO_YEAR + '-' + f[0],
      payee: f[1],
      amount: amt,
      mag: null,
      kindDir: 0,
      balance: bal,
      excelRow: i + 2,
      memo: ''
    }); /* 81차 ③. 예시도 실제 파일과 같은 모양이어야 한다 */
  }
  return out;
}

/* 예시도 올린 파일과 똑같은 길을 탄다 — orderAndVerify → groupPayees → drawResult */
function startDemo() {
  var res = orderAndVerify(demoRows());
  UP = {
    file: null,
    demo: true,
    sheet: null,
    header: 0,
    rows: res.rows,
    opening: res.opening,
    closing: res.closing,
    breaks: res.breaks,
    patched: 0,
    unsure: 0,
    moved: res.moved,
    store: DEMO_STORE,
    owner: null
  };
  UP.merge = buildMergeMap(UP.rows);
  UP.payees = groupPayees(UP.rows);
  UP.byName = {};
  UP.payees.forEach(function (g) {
    UP.byName[g.name] = g;
  });
  UP.accounts = UP_CATS.slice();
  UP.hidden = [];
  UP.baseCats = UP_CATS.slice();
  UP.keepSet = UP_KEEP.slice();
  /* 예시 매장 사장님이 이미 정해둔 것으로 친다.
     저장분을 되살릴 때와 같은 방식으로 맞춘다 — 원본 표기 먼저, 없으면 다듬은 이름 */
  UP.payees.forEach(function (g) {
    var c = null,
      list = g.rawList || [];
    for (var i = 0; i < list.length && !c; i++) c = DEMO_PICKS[list[i]];
    if (!c) c = DEMO_PICKS[g.name];
    applySaved(g, c);
  });
  /* ★ 43차 5단계. 예시에 안 정한 거래처를 일부러 몇 곳 남긴다.
     예전 예시는 전부 정해져 있어서 「아직 안 정한 돈」 줄도, 오차 줄도,
     호박색도 안 나왔다. 사장님은 예시에서 못 본 것을 자기 파일에서 처음 보시고 놀란다.
     ★ 고르는 규칙 — 나간 쪽 금액 큰 순으로 여섯째부터 셋. 첫째~다섯째를 건드리면
       달마다 흑자·적자가 뒤집혀(blocked) 순이익이 아예 안 나온다.
       너무 작은 곳을 고르면 F 규칙이 「사업 외 용도」로 넘겨버려 안 남는다 */
  /* ★ 117차. 박서연·고은서는 원래 분류가 있어 되돌리지 않는다. 차예준은 용도를 확인하지 못해 미정으로 남긴다.
     금액 순위로 고르지 않고 이름으로 정한다. 되돌리는 방법은 43차 그대로다 */
  var DEMO_UNSET = ['차예준'];
  DEMO_UNSET.forEach(function (name) {
    var g = UP.byName[name];
    if (!g) return;
    gSetCat(g, false, null, false);
    if (g.mixed) gSetCat(g, true, null, false);
    UP.unskip = UP.unskip || [];
    if (UP.unskip.indexOf(g.name) === -1) UP.unskip.push(g.name);
  });
  UP.restored = 0;
  UP.queue = buildQueue();
  UP.pos = 0;
  UP.target = UP_TARGET;
  UP.more = false;
  UP.hist = [];
  showResult();
}

function workbookTries(file, bytes) {
  if (!looksHtml(file, bytes)) {
    return [window.XLSX.read(bytes, { type: 'array', cellDates: true })];
  }
  var declared = htmlEncoding(bytes);
  var encs = declared ? [declared] : ['utf-8', 'euc-kr'];
  var out = [];
  encs.forEach(function (enc) {
    try {
      var text = new TextDecoder(enc).decode(bytes);
      out.push(window.XLSX.read(text, { type: 'string', cellDates: true }));
    } catch (e) {}
  });
  /* 아주 오래된 브라우저에서 TextDecoder가 해당 인코딩을 지원하지 않을 때의 마지막 길 */
  if (!out.length) out.push(window.XLSX.read(bytes, { type: 'array', cellDates: true }));
  return out;
}
function fileBytes(file) {
  return new Promise(function (res, rej) {
    var fr = new FileReader(); /* 브라우저 안에서만 읽는다 */
    fr.onload = function () {
      res(new Uint8Array(fr.result));
    };
    fr.onerror = function () {
      rej(new Error('파일을 읽지 못했습니다'));
    };
    fr.readAsArrayBuffer(file);
  });
}
function readOne(file) {
  return fileBytes(file).then(function (bytes) {
    var tries = workbookTries(file, bytes),
      last = null;
    for (var i = 0; i < tries.length; i++) {
      var got = extractRows(tries[i]);
      if (got.fail) {
        last = got;
        continue;
      }
      var res = orderAndVerify(got.rows);
      /* ★ 113차 ①. 엑셀·HTML 은 쪽이 없고 합계 표기도 없다 —
         다(쪽)·라(합계)는 「모름」으로 둔다. 없는 근거를 지어내지 않는다.
         ★ 우리 이메일 HTML 의 「거래건수가 999건을 초과하는 경우」 안내문을
           건수로 읽지 않으려고, 건수는 아예 안 센다 */
      return {
        name: file.name,
        sheet: got.sheet,
        header: got.header,
        balName: got.balName,
        balTried: got.balTried,
        bankHint: got.bankHint,
        range: makeRange(got.headLines, res.rows, { dropped: got.dropped }),
        rows: res.rows,
        opening: res.opening,
        closing: res.closing,
        breaks: res.breaks,
        moved: res.moved
      };
    }
    return { fail: last ? last.why : 'norows', found: last ? last.found : [], name: file.name };
  });
}

function readAnyOne(file) {
  return isPdfFile(file) ? readOnePdf(file) : readOne(file);
}

/* ★ 92차 ③. 넣으신 여섯 자리는 파일을 여는 데만 쓴다.
   저장통에 안 넣고, 네트워크로 내보내는 코드도 없다.
   올리시는 동안만 들고 있다가(계좌 두 개를 잇달아 올리실 때 또 안 묻으려고)
   다 읽으면 바로 버린다 — handleFiles 가 끝에서 pdfForget() 을 부른다 */
var PDF_PW = null;
function pdfForget() {
  PDF_PW = null;
}
function askPdfPassword(name, 틀렸었나) {
  return new Promise(function (res) {
    upStat('');
    var host = document.getElementById('upbad');
    host.innerHTML = '';
    var box = el('div', 'upbad');
    box.appendChild(el('h4', null, '비밀번호가 걸린 PDF 입니다'));
    box.appendChild(el('div', 'upbadrow', name));
    /* ★ 118-1차. 사업자 계좌 PDF 는 비밀번호가 사업자등록번호일 수 있다 (파일럿 국민은행).
       「생년월일 6자리」라고 미리 정해 말하지 않는다 */
    box.appendChild(
      el(
        'div',
        'errb',
        틀렸었나
          ? '비밀번호가 안 맞습니다'
          : '파일을 발급할 때 안내받은 PDF 비밀번호를 입력해주세요'
      )
    );
    var inp = document.createElement('input');
    inp.type = 'tel';
    inp.className = 'nminput';
    inp.setAttribute('inputmode', 'numeric');
    inp.autocomplete = 'off';
    /* ★ 118-1차. 6자리 제한을 없앤다 — 사업자등록번호(10자리·하이픈 포함)가 안 들어갔다 */
    inp.maxLength = 30;
    inp.placeholder = 'PDF 비밀번호';
    box.appendChild(inp);
    var 끝 = function (v) {
      host.innerHTML = '';
      res(v);
    };
    var acts = el('div', 'upacts');
    var go = el('button', 'b on', '열기');
    go.type = 'button';
    /* ★ 118-1차. 넣으신 그대로 넘긴다. 하이픈·공백을 지운 값은 pdfOpen 이 한 번 더 시도한다 */
    go.addEventListener('click', function () {
      끝(inp.value || null);
    });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        go.click();
      }
    });
    var no = el('button', 'b', '이 파일은 건너뛰기');
    no.type = 'button';
    no.addEventListener('click', function () {
      끝(null);
    });
    acts.appendChild(go);
    acts.appendChild(no);
    box.appendChild(acts);
    box.appendChild(
      el('div', 'errn', '넣으신 번호는 이 파일을 여는 데만 씁니다. 저장하지 않습니다.')
    );
    host.appendChild(box);
    upFocus('upbad'); /* ★ 106차 ③. 물어보는 자리를 못 보시면 멈춘 것으로 보인다 */
    try {
      inp.focus();
    } catch (e) {}
  });
}
/* 잠긴 PDF 면 여쭙고 다시 연다. 세 번까지만 — 그 뒤에는 건너뛴다.
   ★ 바이트는 열 때마다 새로 복사해 넘긴다. pdf.js 가 넘긴 버퍼를 가져가 버려서
     같은 것을 두 번 넘기면 두 번째는 빈 파일이 된다 */
function pdfOpen(bytes, name, 남은, 다듬음) {
  var opt = { data: bytes.slice() };
  if (PDF_PW) opt.password = PDF_PW;
  return window.pdfjsLib.getDocument(opt).promise.catch(function (e) {
    var 잠김 =
      e && (e.name === 'PasswordException' || /password/i.test(String((e && e.message) || '')));
    /* ★ 118-1차. 넣으신 값 그대로 먼저 열고, 안 열리면 하이픈·공백을 지운 값으로
       한 번만 조용히 다시 연다. 다시 묻지 않고 세 번 묻기(남은)도 안 줄인다 */
    if (잠김 && PDF_PW && !다듬음 && /[-\s]/.test(PDF_PW)) {
      var 다듬은 = PDF_PW.replace(/[-\s]/g, '');
      if (다듬은) {
        PDF_PW = 다듬은;
        return pdfOpen(bytes, name, 남은, true);
      }
    }
    if (!잠김 || 남은 <= 0) {
      if (잠김) return null;
      throw e;
    }
    var 틀렸었나 = !!PDF_PW;
    PDF_PW = null;
    return askPdfPassword(name, 틀렸었나).then(function (pw) {
      if (!pw) return null; /* 건너뛰기를 누르셨다 */
      PDF_PW = pw;
      return pdfOpen(bytes, name, 남은 - 1);
    });
  });
}
function readOnePdf(file) {
  var 은행 = null; /* 못 읽었을 때 은행에 맞는 안내를 하려고 먼저 봐둔다 */
  return fileBytes(file)
    .then(function (bytes) {
      return pdfOpen(bytes, file.name, 3);
    })
    .then(function (doc) {
      if (!doc) return { fail: 'pdf_locked', found: [], name: file.name };
      return pdfBankName(doc)
        .then(function (b) {
          은행 = b;
          return pdfGrid(doc);
        })
        .then(function (g) {
          /* 글자가 거의 없으면 표가 아니라 사진이다. 좌표로 할 수 있는 일이 없다 */
          if (g.chars < PDF_MIN_CHARS)
            return { fail: 'pdf_image', found: [], name: file.name, pdfBank: 은행 };
          /* ★ 92-1차 ①. 칸을 가른 방법이 여럿이다. 다 읽어보고 가장 나은 것을 고른다 —
         extractRows 가 잔액 열 후보를 고르는 방법 그대로다.
         차례대로 먼저 되는 것을 쓰면 안 된다: 읽히기는 하는데 금액이 옆 칸으로
         간 표도 「읽힌 것」이라, 잔액 사슬이 끊긴 채로 통과해 버린다.
         ★ 92-2차 ②. 검산만 보고 고르면 안 된다 — 깨진 줄을 버릴수록 점수가
           좋아져서, 스스로 거래를 흘리는 쪽을 고른다 (실측: 905건짜리에서
           740건만 뽑은 후보가 이겼다). 그래서 「덜 뽑은 것」에 벌점을 준다.
         ★ 92-2차 ③. 은행이 적어준 총액과 맞는 후보가 있으면 그것이 곧 답이다 */
          var 후보 = [],
            last = null,
            t;
          for (t = 0; t < g.grids.length; t++) {
            var one = extractRows(pdfWorkbook(g.grids[t]));
            if (one.fail) {
              last = one;
              continue;
            }
            var chk = orderAndVerify(one.rows);
            후보.push({
              got: one,
              res: chk,
              건: one.rows.length,
              맞음: pdfTotalsOk(g.totals, pdfSums(chk.rows))
            });
          }
          if (!후보.length) {
            return {
              fail: last && last.why === 'empty' ? 'empty' : 'pdf_no_header',
              found: (last && last.found) || [],
              name: file.name,
              why: last && last.why,
              pdfBank: 은행
            };
          }
          var 최다 = 0;
          후보.forEach(function (c) {
            if (c.건 > 최다) 최다 = c.건;
          });
          후보.forEach(function (c) {
            var 어긋 = c.건 ? c.res.breaks.length / c.건 : 1;
            var 유실 = 최다 ? (최다 - c.건) / 최다 : 0;
            c.점수 = (c.맞음 === true ? 0 : 10) + 어긋 + 유실;
          });
          후보.sort(function (a, b) {
            return a.점수 - b.점수 || b.건 - a.건;
          });
          var best = 후보[0];
          /* ★ 92-2차 ③. 은행이 적은 총액과 안 맞으면 통과시키지 않는다.
         사장님께 틀린 숫자를 맞다고 보여주느니 「아직 못 읽는다」가 낫다.
         총액이 아예 없는 파일은 여기 안 걸린다 (맞음 === null) */
          if (best.맞음 === false) {
            return { fail: 'pdf_total', found: [], name: file.name, pdfBank: 은행 };
          }
          var got = best.got;
          var res = best.res;
          /* ★ 113차 ①②. PDF 는 쪽 꼬리(다)와 은행이 적은 합계(라)를 근거로 쓸 수 있다.
         ★ 라 는 pdfTotalsOk 가 그대로 돌려준다 — 표기가 없으면 null(모름)이다.
           실물 아홉에는 총입금·총출금 표기가 하나도 없어 대개 null 이 된다.
         ★ 마 는 표를 세울 때 흘린 줄 수다 (extractRows 가 세어 온다) */
          return {
            name: file.name,
            sheet: got.sheet,
            header: got.header,
            balName: got.balName,
            balTried: got.balTried,
            bankHint: got.bankHint,
            range: makeRange(g.headLines, res.rows, {
              lost: 최다 - best.건,
              pages: g.pages,
              pageFoot: g.pageFoot,
              totals: best.맞음
            }),
            rows: res.rows,
            opening: res.opening,
            closing: res.closing,
            breaks: res.breaks,
            moved: res.moved
          };
        });
    })
    .catch(function () {
      /* 여기서 멈추면 사장님 눈에는 아무 일도 안 일어난다. 목록에 한 줄로 남긴다 (⑤) */
      return { fail: 'pdf_open', found: [], name: file.name, pdfBank: 은행 };
    });
}
/* ── 46차 ① · 은행별 「엑셀 어떻게 받나요」 ──────────────────────
   화면이 아무리 좋아도 파일이 없으면 0이다. 지금 제일 큰 벽이 여기다.
   국민은행 앱에는 엑셀 내려받기가 아예 없다 — 폰에서는 PDF만 나오고 암호가 걸린다.
   PC 인터넷뱅킹에서는 1년치 엑셀이 된다. 컴퓨터가 없는 분이 많다.

   ★ 절대 지킬 것 — 직접 눌러 확인한 은행만 단계를 쓴다.
     「KB스타뱅킹 → 우측 상단 내보내기」라고 추측으로 말했다가
     그런 메뉴가 없어서 20분을 헤매게 만든 적이 있다.
     「아직 확인하지 못했습니다」가 틀린 안내보다 낫다 —
     45차 ①의 「그래도 안 되면 열 이름을 알려주세요」와 같은 태도다.
   ★ 92차 ①. PDF 를 읽게 됐다 — 국민·신한 두 양식만 직접 확인했다.
     그 둘만 「읽습니다」라고 적는다. 안 해본 은행을 「됩니다」라고 쓰지 않는다.
     못 읽으면 멈추지 않고 카카오채널로 그 양식을 받는다 (⑤).
   ★ 96차 ①②. 오늘 실사용자가 국민은행 앱에서 파일을 못 찾아 전화를 주셨다.
     파일을 못 꺼내면 앱은 없는 것과 같다 — 여기가 아직도 제일 큰 벽이다.
     2026-09-17~18 고객센터 12곳 통화와 실제 화면으로 경로를 확보해 넣는다.
     추측은 한 줄도 없다. 확인 못 한 은행은 지금까지처럼 비워둔다.
   ★ 폰을 앞에, PC 를 뒤에 둔다. 우리 앱은 폰으로 끝내는 것이 목표다 */
var BANK_HELP = {
  국민: {
    확인함: true,
    폰: [
      '전체 메뉴 → 전체계좌조회',
      '계좌를 고르고, 오른쪽 위 톱니바퀴',
      '「거래내역서 발급」',
      '기간과 순서를 정하고 발급',
      'PDF를 휴대폰에 파일로 저장한 뒤, 남는돈의 「파일 고르기」에서 선택해주세요'
    ],
    /* ★ 118-1차. 92차 ①에서 「생년월일 6자리」를 미리 말해뒀는데, 파일럿의 사업자 계좌 PDF 는
       사업자등록번호가 비밀번호라 그 말대로 넣으면 안 열렸다. 「PDF 비밀번호」로 고치고
       사업자 계좌 한 문장을 국민에만 더한다 (다른 은행은 확인하지 않았다) */
    폰메모:
      '암호가 걸립니다. 그대로 올려주시면 PDF 비밀번호를 여쭙고 읽어드립니다. 사업자 계좌 파일은 사업자등록번호가 비밀번호일 수 있습니다. 한 번에 1000건까지라, 넘으면 기간을 나눠 두 번 올려주세요.',
    pc: ['KB스타뱅킹 홈페이지 → 조회 → 거래내역조회', '기간을 1년으로 하고 엑셀로 내려받기']
  },
  신한: {
    확인함: true,
    폰: [
      '전체계좌조회 → 계좌 고르기',
      '기간을 정하고 「계좌 관리」',
      '「거래내역 이메일/팩스 보내기」',
      '메일로 온 PDF 를 내려받아 올려주세요'
    ],
    /* ★ 113차 수정 둘 ②. 「읽어드립니다」를 뺀다 — 위 안내(upmust)가
       「형식에 따라 읽지 못할 수 있습니다」라고 말하는데 여기서 읽어준다고 하면
       한 화면이 두 말을 한다. 파일 꺼내는 길과 암호를 묻는다는 사실은 확인된 것이라 남긴다 */
    폰메모:
      '신한은 앱에서 바로 저장되지 않고 메일로 옵니다. 암호가 걸리면 PDF 비밀번호를 여쭙습니다.'
  },
  우리: {
    확인함: true,
    폰: [
      '「거래명세서 발급」을 찾으세요',
      '기간을 정하고, 거래구분은 「전체」',
      '조회하기 → 「이대로 발급하기」',
      '「저장하기」로 저장한 PDF 를 올려주세요'
    ],
    폰메모:
      '거래구분을 「입금」이나 「출금」만 고르면 반쪽 파일이 나와 읽을 수 없습니다. 꼭 「전체」로 해주세요. 「거래내역」 쪽으로 들어가면 메일 발송만 됩니다.'
  },
  카카오: {
    확인함: true,
    폰: [
      '아래쪽 「⋯」(더보기)',
      '「증명서 발급」',
      '입출금 계좌 → 「거래내역서」 국문',
      '계좌와 기간을 정하고 발급'
    ],
    폰메모: '한 번에 3년까지 됩니다. 더 오래된 것은 3년씩 나눠서 받아주세요.'
  },
  케이: {
    확인함: true,
    폰: [
      '전체 메뉴 → 「고객센터」',
      '「증명서 발급」 → 「거래내역증명서」',
      '계좌를 고르고 발급방식·기간을 정하기'
    ],
    폰메모: '거래내역인데 「고객센터」 안에 들어 있습니다. 거기부터 찾으세요.'
  },
  새마을: {
    확인함: true,
    폰: [
      'MG더뱅킹 → 전체메뉴 → 전체계좌조회',
      '계좌를 고르고, 오른쪽 위 「관리」',
      '맨 아래 「거래내역 내보내기」'
    ],
    폰메모: '앱에서는 PDF 만 됩니다. 인터넷뱅킹에서는 엑셀도 고를 수 있습니다.',
    pc: [
      '인터넷뱅킹 → 조회 → 전체계좌조회',
      '계좌번호 옆 「거래내역」 → 기간 설정 → 조회하기 → 다운로드'
    ]
  },
  토스: {
    확인함: true,
    폰: ['토스 앱 → 토스뱅크', '오른쪽 위 「설정」', '「은행 증명서 발급하기」'],
    폰메모: '거래내역은 10만 건까지 한 번에 됩니다.'
  },
  /* ★ 2026-09-18 고객센터 통화로 폰 앱에서 파일이 안 나오는 것이 확인됐다.
     개인계좌·법인계좌 둘 다 안 된다. PC 경로는 아직 확인 못 했으므로
     단계를 쓰지 않는다 — 여기서 추측을 적으면 없는 메뉴를 찾아 헤매신다 */
  하나: { 폰없음: true },
  농협: { 폰없음: true },
  기업: { 폰없음: true }
};
/* 화면에 보여줄 은행 차례. BANK_NAMES 와 같은 말을 쓴다 */
/* 파일 양식을 직접 받아 읽어본 은행. 받는 경로와는 다른 이야기다 (50차 ⑤) */
var BANK_READS = { 기업: true, 카카오: true };
/* ★ 96차 ③. 되는 은행을 앞에, 안 되는 은행을 뒤에 둔다 */
var BANK_HELP_LIST = [
  '국민',
  '신한',
  '우리',
  '카카오',
  '케이',
  '토스',
  '새마을',
  '하나',
  '농협',
  '기업',
  '그 밖의 은행'
];
/* ★ 99차. 은행마다 마크를 둔다. [글자, 바탕색, 글자색] 순서다.
   ★ 은행이 쓰는 진짜 로고는 넣지 않는다 — 남의 상표라 그대로 못 쓰고,
     은행이 로고를 바꾸면 앱을 다시 배포해야 하고, 그림 11개면 파일이 무거워진다.
     색은 그 은행을 떠올리게 하는 정도로만 쓰고, 글자는 우리가 붙인다.
     우리가 그린 것이라 탈이 없고, 눈으로 고르는 데는 로고만큼 빠르다 */
var BANK_MARK = {
  국민: ['국', '#FFBC00', '#2B2B2B'],
  신한: ['신', '#0046FF', '#ffffff'],
  우리: ['우', '#0067AC', '#ffffff'],
  카카오: ['카', '#FFE300', '#3C1E1E'],
  케이: ['케', '#2B58F6', '#ffffff'],
  토스: ['토', '#3182F6', '#ffffff'],
  새마을: ['새', '#0B4DA2', '#ffffff'],
  하나: ['하', '#008485', '#ffffff'],
  농협: ['농', '#00A64F', '#ffffff'],
  기업: ['기', '#0072BC', '#ffffff'],
  '그 밖의 은행': ['은', '#9AA0A6', '#ffffff']
};
function drawBankHelp(host) {
  var open = !!UP_HELP.open;
  var box = el('div', 'bhelp');
  var head = el('div', 'bh1 tapx', '거래내역 파일 어떻게 받나요?');
  head.appendChild(foldChip(open));
  head.addEventListener('click', function () {
    UP_HELP.open = !UP_HELP.open;
    if (!UP_HELP.open) UP_HELP.bank = null;
    redrawBankHelp();
  });
  box.appendChild(head);
  if (open) {
    /* ★ 100차 ⑥. 머리말 두 줄을 뺀다 (2026-09-19 요한).
       둘째 줄은 은행 이름을 줄글로 나열한 것인데, 바로 아래 단추가 같은 명단이었다.
       같은 말을 두 번 하면서 폰에서는 두 줄로 접혀 글자만 빽빽해졌다.
       ★ 96차 ④(나)의 뜻(「폰 이야기를 먼저」)은 버리지 않는다 —
         폰 무리를 맨 위에 두는 것으로 그대로 지킨다 */

    /* ★ 한 은행이 어느 무리인지는 BANK_HELP 하나만 보고 정한다.
       명단을 따로 만들면 BANK_HELP 를 고칠 때 반드시 어긋난다 —
       나중에 하나은행 PC 경로를 확인해 넣으면 무리가 저절로 따라 옮겨간다 */
    var bankGroup = function (k) {
      var d = BANK_HELP[k];
      if (d && d.폰없음) return 1; /* 폰에서 안 나온다 (확인함) */
      if (d && d.확인함 && d.폰) return 0; /* 폰으로 끝난다 */
      return 2; /* 아직 확인 못 함 */
    };
    var 무리 = [
      { 제목: '폰에서 바로 받으실 수 있어요', 메모: null },
      { 제목: 'PC 인터넷뱅킹에서 받으셔야 해요', 메모: '2026년 9월 은행 고객센터에 확인했습니다' },
      { 제목: '아직 확인하지 못한 은행', 메모: null }
    ];
    /* 만드는 몸통은 하나로 둔다 — 단추 모양이 무리마다 갈라지면 안 된다 */
    var bankBtn = function (k) {
      var b = el('button', 'b' + (UP_HELP.bank === k ? ' on' : ''));
      b.type = 'button';
      /* ★ 99차. 마크를 앞에, 이름을 뒤에. 어느 쪽을 눌러도 같은 단추다.
         ★ 마크에는 색을 그 자리에 직접 입힌다 — 은행이 열한 곳뿐이라
           규칙을 열한 줄 쓰는 것보다 표 하나가 고치기 쉽다.
         ★ 골랐을 때(.on) 바탕이 초록으로 바뀌어도 마크 색은 그대로 남는다.
           어느 은행을 고르셨는지 색으로도 보인다 */
      var mk = BANK_MARK[k];
      var dot = el('span', 'bkm', mk ? mk[0] : '은');
      if (mk) {
        dot.style.background = mk[1];
        dot.style.color = mk[2];
      }
      dot.setAttribute('aria-hidden', 'true'); /* 읽어주는 기계는 이름만 읽으면 된다 */
      b.appendChild(dot);
      b.appendChild(el('span', 'bkn', bankHelpName(k)));
      b.addEventListener('click', function () {
        UP_HELP.bank = UP_HELP.bank === k ? null : k;
        redrawBankHelp();
      });
      return b;
    };
    /* ★ BANK_HELP_LIST 순서를 그대로 쓴다 — filter 라 차례가 안 바뀐다 */
    var 첫무리 = true;
    무리.forEach(function (g, gi) {
      var ks = BANK_HELP_LIST.filter(function (k) {
        return bankGroup(k) === gi;
      });
      if (!ks.length) return; /* 빈 무리는 머리말도 안 만든다 */
      box.appendChild(el('div', 'bhgrp' + (첫무리 ? '' : ' next'), g.제목));
      if (g.메모) box.appendChild(el('div', 'bh2', g.메모));
      첫무리 = false;
      var row = el('div', 'bhbtns');
      ks.forEach(function (k) {
        row.appendChild(bankBtn(k));
      });
      box.appendChild(row);
    });
    if (UP_HELP.bank) {
      var k2 = UP_HELP.bank;
      var d = BANK_HELP[k2];
      var det = el('div', 'bhdet');
      det.appendChild(el('div', 'bhname', bankHelpName(k2)));
      /* ★ 96차 ④(다). 폰에서 아예 안 나오는 은행께는 폰 단계를 보여드릴 것이 없다.
         할 수 있는 길 하나를 정확히 말하고, 언제 확인한 것인지도 같이 적는다 */
      if (d && d.폰없음) {
        det.appendChild(el('div', 'bhno', '이 은행은 폰 앱에서 거래내역 파일이 나오지 않습니다.'));
        det.appendChild(el('div', 'bhstep', 'PC 인터넷뱅킹에서 엑셀(.xlsx)로 받아주세요.'));
        det.appendChild(el('div', 'bhmemo', '2026년 9월 은행 고객센터에 확인한 내용입니다.'));
        /* ★ 97차 ③. 이 줄이 없으면 「PC 로 가세요」가 막다른 길로 읽힌다 —
           PC 까지 갔는데 읽힐지 모르면 안 가신다. 이 은행 파일은 실제로
           읽어본 적이 있으니 그 말을 해드릴 수 있고, 그게 가볼 이유가 된다.
           ★ 폰 갈래에는 안 붙인다. 거기는 이미 단계가 다 나와 있다 */
        if (BANK_READS[k2]) {
          det.appendChild(
            el(
              'div',
              'bhstep',
              'PC 에서 받으신 ' + bankHelpName(k2) + ' 거래내역은 읽어드릴 수 있습니다.'
            )
          );
        }
      } else if (d && d.확인함) {
        /* 폰이 먼저다. 번호를 붙여 단계라는 것이 눈에 보이게 한다 */
        if (d.폰) {
          det.appendChild(el('div', 'bhsub', '폰으로 받기'));
          d.폰.forEach(function (s, n) {
            det.appendChild(el('div', 'bhstep', n + 1 + '. ' + s));
          });
          if (d.폰메모) det.appendChild(el('div', 'bhmemo', d.폰메모));
        }
        if (d.pc) {
          det.appendChild(el('div', 'bhsub', 'PC 로 받기'));
          d.pc.forEach(function (s, n) {
            det.appendChild(el('div', 'bhstep', n + 1 + '. ' + s));
          });
        }
      } else {
        /* ★ 확인 안 한 은행은 단계를 안 쓴다. 여기에 한 줄이라도 추측을 적으면
           사장님이 없는 메뉴를 찾아 헤매신다 */
        det.appendChild(el('div', 'bhstep', '아직 확인하지 못했습니다.'));
        det.appendChild(el('div', 'bhstep', '받으신 경로를 알려주시면 바로 넣어드리겠습니다.'));
        /* ★ 50차 ⑤. 이 은행의 거래내역 양식은 직접 받아 읽어봤다. 받는 경로는 여전히 모른다 —
           아는 것만 적는다. 경로를 지어내지 않는다 */
        if (BANK_READS[k2]) {
          det.appendChild(el('div', 'bhstep', '여기서 받으신 거래내역은 읽을 수 있습니다.'));
        }
      }
      box.appendChild(det);
    }
    /* ★ 96차 ④(라). 여기까지 읽고도 못 찾으시는 분이 실제로 계셨다.
       그때 갈 곳이 없으면 거기서 끝난다 — 사람에게 닿는 자리를 둔다 */
    var 물음 = el(
      'div',
      'bh3',
      '못 찾으시면 카카오채널로 물어봐주세요. 쓰시는 은행 화면 보고 알려드리겠습니다. '
    );
    물음.appendChild(kakaoAsk('카카오채널로 물어보기'));
    box.appendChild(물음);
    /* ★ 119차 문구 보정. 「카톡으로 받으셔도 됩니다」 줄을 지웠다 —
       앱이 파일을 처리하는 것과 카카오톡으로 파일을 보내는 것이 섞여 읽혔다 */
  }
  host.appendChild(box);
}
/* ★ 96차 ④(가). 처음부터 펴둔다. 오늘 확인된 대로 여기가 제일 큰 벽인데,
   접어두면 있는 줄도 모르신다. 접는 것은 그대로 된다 */
var UP_HELP = { open: true, bank: null };
function redrawBankHelp() {
  var host = document.getElementById('bankhelp');
  if (!host) return;
  host.innerHTML = '';
  drawBankHelp(host);
}

/* ── 37차 1·2번 ────────────────────────────────────────────
   ★ 나중에 올린 파일이 앞의 것을 지우면 안 된다.
     예전에는 handleFiles 가 UP 을 통째로 새로 만들어서,
     한 번에 하나씩 두 번 올리면 나중 것만 남았다 — 경고도 없었다.
     사장님은 두 계좌를 다 올렸다고 믿으신 채로 매출·지출이 절반쯤 빠진 숫자를 보시게 된다.
   ★ 그래서 읽은 것을 PENDING 에 쌓아두고, 파일 목록 화면에서 멈춘다.
     [이 파일들로 시작하기] 를 눌러야 넘어간다.
   ★ 파일 여러 개가 한 번에 안 골라지는 환경이 있다. 그래서 쌓기와 목록이 함께 필요하다 */
var PENDING = []; /* 아직 시작 안 한, 읽어둔 계좌들 */
