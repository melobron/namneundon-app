function handleFiles(fileList) {
  var files = [].slice.call(fileList);
  var 보탬 = addFromRead(); /* ★ 119차 업로드 안내. 읽은 계좌 위에 보탠다 */
  document.getElementById('upbad').innerHTML = '';
  /* ★ 45차 ①. 파일을 받는 순간 창부터 연다.
     예전에는 읽기가 끝나야(SheetJS 를 받아오는 데 500ms쯤) 창이 열렸다.
     그 사이에는 「읽는 중…」이 닫힌 창 안에 있어 화면에 아무것도 안 나왔다 —
     끌어다 놓기나 「다시 올리기」로 들어오면 그대로 조용했다.
     읽다가 실패해도 이 창은 열려 있으므로 실패 문구가 반드시 보인다 */
  openUpPanel();
  upStat('<b>' + files.length + '개 파일</b> 읽는 중…');
  loadSheetJS()
    .then(function () {
      /* ★ 92차 ①. PDF 가 섞여 있을 때만 PDF 도구를 가져온다.
       엑셀만 올리신 분은 지금까지와 똑같이 한 파일도 더 안 받는다.
       ★ 표를 엑셀 시트로 바꿔 넣으므로 PDF 길에서도 XLSX 가 먼저 있어야 한다 */
      return files.some(isPdfFile) ? loadPdfJS() : null;
    })
    .then(function () {
      return files.reduce(function (pr, f) {
        return pr.then(function (acc) {
          return readAnyOne(f).then(function (one) {
            acc.push(one);
            return acc;
          });
        });
      }, Promise.resolve([]));
    })
    .then(function (list) {
      list.forEach(function (one) {
        if (one.fail) {
          /* ★ 50차 ②. 열 이름을 목록 화면까지 들고 간다 —
           그게 있어야 「왜 못 읽었나」를 그 자리에서 펼 수 있다 */
          PENDING.push({
            name: one.name,
            bad: failWhy(one.fail, one.pdfBank),
            why: one.fail,
            found: one.found,
            pdfBank: one.pdfBank || null
          });
          /* ★ 92차 ⑤. PDF 는 왜 못 읽었는지를 기록에 남긴다 —
           어느 은행 양식을 먼저 넣어야 하는지 알 길이 이것뿐이다.
           파일 이름은 안 남긴다 (지금까지의 원칙 그대로) */
          if (String(one.fail).indexOf('pdf_') === 0) useFail(one.fail);
          return;
        }
        /* 같은 파일 이름이면 안 받는다 */
        if (
          PENDING.some(function (b) {
            return !b.bad && b.file === one.name;
          })
        ) {
          PENDING.push({ name: one.name, bad: '같은 파일을 두 번 선택하셨습니다' });
          return;
        }
        /* 이름이 달라도 절반 넘게 겹치면 안 받는다. 자동으로 지우지는 않는다 */
        var ov = overlapWith(
          PENDING.filter(function (b) {
            return !b.bad;
          }),
          one
        );
        if (ov > 0.5) {
          PENDING.push({
            name: one.name,
            bad: '이미 불러온 것과 ' + Math.round(ov * 100) + '% 겹칩니다'
          });
          return;
        }
        one.file = one.name;
        one.found = bankOf(
          one.name,
          one.sheet,
          one.bankHint
        ); /* 못 찾으면 null — 목록 화면에서 여쭙는다 */
        /* ★ 45차 ⑥. 못 찾았으면 지난번에 넣어주신 이름이 있는지 본다.
         자동으로 잡은 이름은 절대 안 덮는다 */
        if (!one.found) {
          var 지난이름 = bankNameAnyStore(bankNameKey(one));
          if (지난이름) one.typed = 지난이름;
        }
        one.bank =
          one.typed ||
          one.found ||
          '계좌 ' +
            (PENDING.filter(function (b) {
              return !b.bad;
            }).length +
              1);
        var ms = {};
        one.rows.forEach(function (r) {
          ms[monthOf(r.at)] = 1;
        });
        var mk = Object.keys(ms).sort();
        one.from = mk[0] || null;
        one.to = mk[mk.length - 1] || null;
        PENDING.push(one);
      });
      upStat('');
      pdfForget(); /* 92차 ③. 넣으신 여섯 자리를 여기서 버린다 */
      drawFileList();
    })
    .catch(function (e) {
      pdfForget();
      /* ★ 102차 추가 ②. 「암호 걸린 엑셀」을 「엑셀이 아님」과 갈라놓는다 (2026-09-19 실물 확인).
       케이뱅크 「입출금내역 내보내기」가 이 파일을 준다. 진짜 xlsx 인데 암호가 걸려 있어서,
       notxlsx 로 묶으면 「엑셀로 다시 받으세요」라고 말하게 되고 —
       사장님이 그대로 하면 똑같은 파일이 또 나온다 (50차 ③과 같은 자리다).
       ★ SheetJS 0.20.3 은 암호를 넣어줘도 못 연다(실측). 이번에 푸는 것이 아니라,
         막다른 길에서 갈 길을 알려주는 것이 하는 일의 전부다 */
      var 말 = String((e && e.message) || '');
      var 잠김 = /password|encrypt/i.test(말);
      var 왜 = 잠김
        ? 'xlsx_locked'
        : /XLSX|zip|Unsupported|Corrupt/i.test(말)
          ? 'notxlsx'
          : 'unknown';
      useFail(왜);
      /* 어느 은행인지 — 은행 안내에서 고르신 것이 먼저고, 없으면 파일 이름에서 찾는다.
       둘 다 없으면 은행 이름 없이 일반 안내로 간다. 아는 만큼만 말한다 */
      var 은행 = UP_HELP.bank;
      for (var fi = 0; fi < files.length && !은행; fi++) 은행 = bankOf(files[fi].name, null, null);
      upStat('');
      var box = el('div', 'upbad');
      box.appendChild(el('h4', null, '읽지 못했습니다'));
      /* ★ 102차 추가 ②. 아는 실패는 우리말로 바꿔 말한다.
       ★ 정정. 「모르는 실패」일 때만 원문을 남긴다.
       엑셀이 아닌 파일은 「엑셀 파일이 아닙니다 — 은행 앱에서 엑셀(.xlsx)로
       다시 받아주세요」로 이미 정확히 안내된다. 영어 원문은 대표님이 읽을 것이 아니고,
       마스터 ■2-1 #5(쉬운 말)에도 걸린다.
       단서가 필요하면 화면에 있는 카카오채널로 파일을 받아보면 된다 */
      if (왜 === 'unknown') box.appendChild(el('div', 'upbadrow', e.message));
      /* 'unknown' 은 failWhy 도 '읽지 못했습니다 — …' 라 위 h4 와 같은 말이 두 번 된다.
       그때만 지금까지처럼 FIX_TIP 한 줄로 둔다 */
      box.appendChild(
        el('div', 'upbadrow', (왜 === 'unknown' ? FIX_TIP : failWhy(왜, 은행)) + '.')
      );
      /* ★ 119차 업로드 안내. 추가로 고른 파일만 못 읽었다. 이미 읽은 거래와 확인 카드로
       돌아가고, 못 읽은 까닭은 카드 위에 적는다 */
      if (보탬 && UP && UP.breaks && UP.breaks.length) {
        PENDING = [];
        showBreakCards();
        var 카드 = document.getElementById('upbad');
        카드.insertBefore(box, 카드.firstChild);
        return;
      }
      document.getElementById('upbad').innerHTML = '';
      document.getElementById('upbad').appendChild(box);
      upFocus('upbad'); /* ★ 106차 ③. 오류 문구도 못 보고 지나치면 뜻이 없다 */
    });
}
/* ★ 92차 ⑥. 카카오채널로 가는 한 자리. 말은 늘리지 않고 링크만 둔다 —
   못 읽은 양식은 사장님이 보내주셔야 넣을 수 있다 */
var KAKAO_CHAT = 'https://pf.kakao.com/_bijxaX/chat';
function kakaoAsk(label) {
  var a = document.createElement('a');
  a.className = 'asklink';
  a.href = KAKAO_CHAT;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', '카카오톡 채널');
  /* ★ 98차. 마크와 글자를 한 <a> 안에 넣는다. 어느 쪽을 눌러도 같은 곳으로 간다.
     마크는 applinks 에 이미 있는 것을 그대로 쓴다 — 앱 안에서 두 모양이 돌아다니지 않게.
     ★ 밖으로 새로 부르는 주소를 늘리지 않는다. SVG 를 그 자리에 직접 넣는다 */
  a.innerHTML =
    '<svg class="askico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<rect x="0" y="0" width="24" height="24" rx="6.5" fill="#FEE500"></rect>' +
    '<ellipse cx="12" cy="10.9" rx="7.3" ry="5.7" fill="#3C1E1E"></ellipse>' +
    '<path d="M8.7 15.1 L6.3 19.3 L11.1 16.3 Z" fill="#3C1E1E"></path>' +
    '</svg>';
  var s = document.createElement('span');
  s.textContent = label || '카카오채널로 파일 보내기';
  a.appendChild(s);
  return a;
}

/* ── 파일 목록 화면 ── 확인을 눌러야 넘어간다 */
function drawFileList() {
  /* ★ 106차 ③. 파일을 읽은 뒤에는 은행 안내를 접는다.
     읽기 전에는 길잡이지만, 읽은 뒤에는 결과와 사장님 사이를 막는 벽이다.
     ★ 없애지 않는다 — 두 번째 파일을 다른 은행에서 받으실 수 있다. 접기만 한다.
     ★ 파일을 전부 빼시면 다시 펼친다. 그때는 다시 길잡이가 필요하다 */
  var 펼침 = !PENDING.length;
  if (UP_HELP.open !== 펼침) {
    UP_HELP.open = 펼침;
    if (!펼침) UP_HELP.bank = null;
    try {
      redrawBankHelp();
    } catch (e) {}
  }
  document.getElementById('uptitle').textContent = '불러온 파일';
  upShow('up-files');
  var host = document.getElementById('up-files');
  host.innerHTML = '';
  var ok = PENDING.filter(function (b) {
    return !b.bad;
  });
  host.appendChild(el('div', 'obhead', '불러온 파일'));
  host.appendChild(
    el('div', 'obsub', '건수와 기간을 한 번 봐주세요. 계좌가 더 있으면 이어서 불러오시면 됩니다.')
  );

  var list = el('div', 'flist');
  PENDING.forEach(function (b, i) {
    var row = el('div', 'frow' + (b.bad ? ' bad' : ''));
    var nm = el('div', 'fnm');
    if (b.bad) {
      nm.appendChild(el('div', 'fbank', b.name));
      nm.appendChild(el('div', 'fmeta warnt', b.bad));
      /* ★ 50차 ②·③. 왜 못 읽었는지 그 자리에서 편다. 파일마다 따로 펴진다 —
         둘을 올렸는데 하나만 못 읽을 수 있다 */
      if (b.why === 'empty') {
        nm.appendChild(
          el(
            'div',
            'fmeta',
            '은행에서 조회 기간을 정하고 「조회」를 누른 뒤에 내려받아주세요. 기간은 1년으로 잡으시면 됩니다.'
          )
        );
      } else if (String(b.why).indexOf('pdf_') === 0) {
        /* ★ 92차 ⑤. PDF 는 「왜 못 읽었나」(열 이름)를 펼 것이 없다 —
           대신 우리에게 말을 거실 자리를 둔다.
           ★ 94차 ④. 문구는 은행 무리에 맞춘다 (kakaoLabel).
             비밀번호 문제는 다시 올리시면 되는 일이라 링크를 안 붙인다 */
        if (b.why !== 'pdf_locked') {
          var pk = el('div', 'fmeta');
          pk.appendChild(kakaoAsk(kakaoLabel(b.pdfBank)));
          nm.appendChild(pk);
        }
      } else {
        var wk = '__why' + i;
        var wopen = !!UP_HELP[wk];
        var wb2 = el('button', 'oblink', '왜 못 읽었나 ' + (wopen ? '▴' : '▾'));
        wb2.type = 'button';
        wb2.addEventListener('click', function () {
          UP_HELP[wk] = !UP_HELP[wk];
          drawFileList();
        });
        nm.appendChild(wb2);
        if (wopen) {
          var wbox = el('div', 'whybox');
          unreadableBody(wbox, b.found); /* 45차에 만든 것을 그대로 부른다 */
          nm.appendChild(wbox);
        }
      }
    } else {
      nm.appendChild(el('div', 'fbank', b.bank));
      nm.appendChild(
        el('div', 'fmeta', won(b.rows.length) + '건 · ' + monLabel(b.from) + ' ~ ' + monLabel(b.to))
      );
      /* ★ 40차 1번(나). 모든 계좌의 이름을 고칠 수 있어야 한다.
         예전에는 못 찾은 계좌에만 입력칸이 나왔다 —
         틀리게 잡힌 쪽이 더 위험한데 그쪽은 고칠 길이 없었다.
         ★ 적으신 이름은 이번에만 쓰고 저장하지 않는다.
           계좌를 가리키는 말이 저장통에 들어가는 것은 A안의 뜻과 다르다 */
      /* ★ 46차 ②. 자동으로 잡은 계좌는 칸을 늘 열어두지 않는다.
         「은행 이름을 바꿀 필요는 없는데 무슨 이름을 고치라는 건지 한참 생각했다」 —
         만든 사람이 헷갈리면 처음 보는 분은 못 쓴다.
         이 화면이 사장님이 제일 먼저 보는 화면이라 할 일이 없어 보여야 한다.
         못 찾은 계좌는 지금처럼 칸이 바로 나온다 — 거기는 실제로 할 일이 있다 */
      var ask = el('div', 'fask');
      function 칸열기() {
        ask.innerHTML = '';
        ask.appendChild(el('span', null, b.found ? '이름 고치기' : '어느 은행인가요?'));
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'nminput fbankin';
        inp.maxLength = 12;
        inp.placeholder = b.found || '계좌 ' + (i + 1);
        inp.value = b.typed || '';
        inp.addEventListener('input', function () {
          b.typed = inp.value.trim();
          b.bank = b.typed || b.found || '계좌 ' + (i + 1);
          var lab = row.querySelector('.fbank');
          if (lab) lab.textContent = b.bank;
        });
        ask.appendChild(inp);
        inp.focus();
      }
      if (b.found && !b.typed) {
        var fix = el('button', 'oblink', '고치기');
        fix.type = 'button';
        fix.addEventListener('click', 칸열기);
        ask.appendChild(fix);
      } else {
        칸열기();
      }
      nm.appendChild(ask);
    }
    row.appendChild(nm);
    var rm = el('button', 'chbtn', '빼기');
    rm.type = 'button';
    rm.addEventListener('click', function () {
      PENDING.splice(i, 1);
      drawFileList();
    });
    row.appendChild(rm);
    list.appendChild(row);
  });
  host.appendChild(list);

  var acts = el('div', 'obdoneacts');
  var add = el('button', 'b', '＋ 거래내역 추가하기');
  add.type = 'button';
  add.addEventListener('click', function () {
    var inp = /** @type {HTMLInputElement} */ (document.getElementById('upinput'));
    inp.value = ''; /* 같은 파일을 다시 고를 수 있게 비운다 */
    inp.click();
  });
  var go = el('button', 'b on', '이 파일들로 시작하기');
  go.type = 'button';
  go.disabled = !ok.length;
  go.addEventListener('click', startPending);
  acts.appendChild(go);
  acts.appendChild(add);
  host.appendChild(acts);
  /* ★ 82차 ⑤. 「＋ 파일 더 올리기」 바로 옆에서 뜻을 밝힌다 —
     여기가 나눠 올릴지 말지 정하시는 자리다 */
  host.appendChild(el('div', 'obcov', SPLIT_UPLOAD_TIP));
  if (!ok.length) {
    /* ★ 50차 ③. 전부 「거래 0건」이면 다시 받으라는 말은 거짓말이다.
       제대로 된 .xlsx 이고 시키는 대로 해도 똑같은 파일이 또 나온다 */
    var 전부빔 =
      PENDING.length > 0 &&
      PENDING.every(function (b2) {
        return b2.why === 'empty';
      });
    if (전부빔) {
      host.appendChild(el('div', 'obcov', '불러온 파일에 거래가 한 건도 없습니다.'));
      host.appendChild(
        el(
          'div',
          'obcov',
          '은행에서 조회 기간을 정하고 「조회」를 누른 뒤에 내려받아주세요. 기간은 1년으로 잡으시면 됩니다.'
        )
      );
    } else {
      host.appendChild(el('div', 'obcov', '읽을 수 있는 파일이 없습니다. ' + FIX_TIP + '.'));
      host.appendChild(
        el(
          'div',
          'obcov',
          '은행이 확장자만 .xls 로 붙여 다른 형식을 주는 일이 있습니다. ' +
            '내려받을 때 「엑셀」이나 「xlsx」를 고르시면 됩니다.'
        )
      );
    }
  }
}

/* ── 71차 ② · 「파일 더 올리기」를 진짜 「더 올리기」로 ──────────────
   ★ 예전에는 이 단추가 첫 화면으로 나갔고, 거기서 파일을 올리면
     먼저 읽어둔 파일이 사라지고 새 파일만 남았다.
     이름은 「더 올리기」인데 하는 일은 「새로 시작하기」였다 —
     재작년 치를 붙여 두 해를 보시려는 분께는 길이 아예 없었다.
   ★ 이제는 지금 보고 계신 매장에 파일을 보탠다. 첫 화면으로 안 나간다.
   ★ 매장 이름·성함·업종은 새로 안 묻는다 — 여기에 들고 있다가 도로 얹는다.
     저장 열쇠(fc.picks.<매장>)가 매장 이름으로 만들어지므로,
     이것을 잃으면 정해두신 분류를 못 찾는다. 저장 모양은 안 건드린다 */
var ADD_KEEP = null;
/* ★ 91차 ②. 저장해둔 거래내역으로 되살리는 중인가 (되살리는 중이면 그 저장분).
   보태기(ADD_KEEP)와 같은 길을 타되 끝에서 갈 곳만 다르다 — 묻지 않고 결과로 간다 */
var RESTORING = null;
function openAddFiles() {
  if (!UP || UP.demo || !UP.banks || !UP.banks.length) return false;
  ADD_KEEP = {
    store: UP.store,
    owner: UP.owner,
    trade: UP.trade,
    dueDay: UP.dueDay || null,
    known: UP.known || null
  };
  /* 이미 읽어둔 계좌를 목록에 그대로 올려둔다 — 무엇 위에 보태는지 보여야 한다.
     ★ 이 계좌들은 이름이 이미 정해져 있다. 다시 번호를 붙이지 않는다 */
  PENDING = UP.banks.map(function (b) {
    b.kept = true;
    return b;
  });
  openUpPanel();
  document.getElementById('upbad').innerHTML = '';
  upStat('');
  drawFileList();
  return true;
}
/* ── 91차 ② · 파일을 다시 안 올려도 이어보기 ────────────────────────
   저장해둔 거래내역(fc.data)을 startFromBanks 가 받는 모양으로 되돌려 넘긴다.
   ★ 합치기·겹침 빼기·정렬·검산 문턱은 전부 startFromBanks 가 하던 그대로다.
     여기서 새로 계산하는 것은 한 줄도 없다 — 읽어서 넘기기만 한다.
   ★ 매장 이름·성함·업종은 ADD_KEEP 에 얹어 보낸다. 보태기와 같은 자리라
     startFromBanks 가 도로 붙여 준다 (71차 ②) */
function openSavedData(name) {
  var o = loadData(name);
  if (!o) return false;
  var banks = banksFromData(o);
  if (!banks.length) return false;
  var 예전 = UP;
  leaveStart(); /* 시작 화면을 접고 결과 자리를 되살린다 */
  ADD_KEEP = {
    store: o.store || null,
    owner: o.owner || null,
    trade: o.trade || null,
    dueDay: o.dueDay || null,
    known: null
  };
  RESTORING = o;
  try {
    startFromBanks(banks, [], []);
  } catch (e) {
    /* 되살리다 넘어져도 사장님을 빈 화면에 두지 않는다 — 있던 자리로 돌려놓는다 */
    RESTORING = null;
    ADD_KEEP = null;
    UP = 예전;
    try {
      drawStart();
    } catch (e2) {}
    return false;
  }
  return true;
}
/* 앱을 열 때 — 마지막으로 보시던 매장이 이 기기에 남아 있으면 그 화면부터 연다 */
function openLastData() {
  var name = lsGet(LAST_KEY);
  if (!name) return false;
  return openSavedData(name);
}
function startPending() {
  MY_UP = null; /* ★ 119차. 새 파일로 가면 맡겨 둔 매장은 놓는다 */
  var banks = PENDING.filter(function (b) {
    return !b.bad;
  });
  if (!banks.length) return;
  /* 같은 은행 이름이 둘이면 갈라 부른다.
     ★ 71차 ②. 이미 이름이 붙은 계좌(보태기로 들고 온 것)에는 다시 번호를 안 붙인다 —
       두 번 돌면 「국민 1 1」이 된다. 새로 온 것만 비어 있는 번호를 찾아 붙인다 */
  var 쓴이름 = {};
  banks.forEach(function (b) {
    if (b.kept) 쓴이름[b.bank] = 1;
  });
  var cnt = {};
  banks.forEach(function (b) {
    if (!b.kept) cnt[b.bank] = (cnt[b.bank] || 0) + 1;
  });
  banks.forEach(function (b) {
    if (b.kept) return;
    if (!쓴이름[b.bank] && cnt[b.bank] < 2) {
      쓴이름[b.bank] = 1;
      return;
    }
    var n = 1,
      후보 = b.bank + ' ' + n;
    while (쓴이름[후보]) {
      n++;
      후보 = b.bank + ' ' + n;
    }
    b.bank = 후보;
    쓴이름[후보] = 1;
  });
  var dup = PENDING.filter(function (b) {
    return b.bad;
  }).map(function (b) {
    return b.name + ' (' + b.bad + ')';
  });
  PENDING = [];
  startFromBanks(banks, dup, []);
}

/* 읽은 계좌들을 UP 으로 만든다.
   ★ 검산은 계좌별로 이미 끝났다. 여기서는 합치기만 한다 */
function startFromBanks(banks, dup, overlap) {
  /* ★ 105차 ④. 이 판에서 거래가 실제로 늘었는가 — 아래 겹치기 거르기의 결과로 판단한다.
     예시(demo)는 안 센다. 되살린 판(RESTORING)은 올린 것이 아니다 */
  var 이전줄수 = UP && !UP.demo && UP.rows ? UP.rows.length : 0;
  var rows = [];
  /* ★ 71차 ②-5. 같은 거래는 한 번만 센다.
     파일을 보태다 보면 기간이 겹친다 — 1~8월 파일에 6~12월 파일을 얹으면
     6·7·8월이 두 번 들어와 매출이 부풀어 보인다. 그러면 숫자가 거짓말이 된다.
     ★ 무엇이 「같은 거래」인가 — 날짜·시각 + 금액 + 잔액 + 원문 이름이 같은 것.
       잔액을 열쇠에 넣는 것이 핵심이다. 같은 날 같은 금액이 두 번 나가는 일은
       실제로 흔한데(카드 4,000원 두 번), 그 둘은 잔액이 다르다.
       잔액을 빼면 진짜 거래 하나를 지워 매출을 줄여 버린다 — 부풀리는 것보다 나쁘다.
     ★ 한 파일 안에서 똑같은 줄이 두 번 있으면 그것은 진짜 두 건이다.
       그래서 파일 안에서의 몇 번째인지까지 열쇠에 넣는다 —
       겹치는 것은 파일과 파일 사이에서만 지운다.
     ★ 계산은 안 건드린다. 여기서 하는 일은 「같은 줄을 두 번 넣지 않기」뿐이다 */
  var 본줄 = {},
    겹친건수 = 0;
  banks.forEach(function (b, i) {
    b.idx = i;
    var 안에서 = {};
    b.rows.forEach(function (r) {
      var 속 = sameRowKey(r) + '|' + (r.payee == null ? '' : r.payee);
      안에서[속] = (안에서[속] || 0) + 1;
      var 열쇠 = 속 + '#' + 안에서[속];
      if (본줄[열쇠]) {
        겹친건수++;
        return;
      }
      본줄[열쇠] = 1;
      r.acc = i;
      rows.push(r);
    });
  });
  /* 거래일시로 정렬한다. 같은 시각이면 계좌 순서로 갈라 흔들리지 않게 한다 */
  rows.sort(function (a, b) {
    if (a.at !== b.at) return a.at < b.at ? -1 : 1;
    return a.acc - b.acc;
  });
  var allBreaks = [];
  banks.forEach(function (b) {
    b.breaks.forEach(function (x) {
      x.bank = b.bank;
      allBreaks.push(x);
    });
  });
  var 올림 = !RESTORING;
  UP = {
    file: banks
      .map(function (b) {
        return b.file;
      })
      .join(' · '),
    demo: false,
    __새거래: 올림 && rows.length > 이전줄수,
    banks: banks,
    sheet: banks[0].sheet,
    header: banks[0].header,
    balName: banks[0].balName,
    balTried: banks[0].balTried,
    rows: rows,
    opening: banks.reduce(function (s, b) {
      return s + b.opening;
    }, 0),
    closing: banks.reduce(function (s, b) {
      return s + b.closing;
    }, 0),
    breaks: allBreaks,
    patched: 0,
    unsure: 0,
    moved: banks.reduce(function (s, b) {
      return s + b.moved;
    }, 0),
    store: null,
    dupFiles: dup,
    overlapFiles: overlap
  };
  UP.겹친건수 = 겹친건수;
  /* ★ 71차 ②. 파일을 보태서 온 길이면 매장을 다시 묻지 않는다.
     매장 이름은 저장 열쇠(fc.picks.<매장>)를 만드는 값이라, 여기서 잃으면
     정해두신 분류를 못 찾는다 — 그러면 「보태기」가 「새로 시작」이 되어 버린다.
     ★ 여기서 UP 에 도로 얹기만 한다. 저장통에는 아무것도 새로 안 쓴다 */
  if (ADD_KEEP) {
    UP.store = ADD_KEEP.store;
    UP.owner = ADD_KEEP.owner;
    UP.trade = ADD_KEEP.trade;
    UP.known = ADD_KEEP.known;
    if (ADD_KEEP.dueDay) UP.dueDay = ADD_KEEP.dueDay;
    if (ADD_KEEP.trade) setTrade(ADD_KEEP.trade);
  }

  var bits = [];
  if (banks.length > 1) {
    bits.push(
      banks
        .map(function (b) {
          return '<b>' + escHtml(b.bank) + '</b> ' + won(b.rows.length) + '건';
        })
        .join(' · ')
    );
  } else {
    /* ★ 119차 업로드 안내. 읽은 뒤 맨 위에 서는 요약이라 은행과 건수로 적는다.
       시트 이름·헤더 행은 대표님이 확인할 값이 아니다 (계좌가 둘 이상일 때와 같은 모양) */
    bits.push('<b>' + escHtml(banks[0].bank) + '</b> 거래 <b>' + won(rows.length) + '건</b>');
  }
  if (UP.moved)
    bits.push('순서가 뒤바뀐 <b>' + won(UP.moved) + '건</b>을 잔액에 맞게 다시 놓았습니다');
  dup.forEach(function (t) {
    bits.push('건너뛴 파일 — ' + escHtml(t));
  });
  overlap.forEach(function (o) {
    bits.push(
      '건너뛴 파일 — ' +
        escHtml(o.name) +
        ' (이미 불러온 것과 ' +
        Math.round(o.pct * 100) +
        '% 겹칩니다)'
    );
  });
  upStat(bits.join('<br>'));
  var ms = monthList();
  /* ★ 91차 ②. 되살리는 길에서는 「올렸다」로 세지 않는다 —
     열 때마다 한 건씩 쌓이면 실제로 파일을 몇 번 올리셨는지 셀 수가 없다 */
  if (ms.length && !RESTORING) useUpload(ms[0] + '~' + ms[ms.length - 1]);
  /* 검산 문턱은 계좌별로 잰다. 한 계좌라도 넘으면 숫자를 안 보여준다 (원칙 2).
     39차부터 breaksOver() 한 곳에서만 잰다 — applyBreaks 쪽과 잣대가 달랐다 */
  if (UP.breaks.length) showBreaks();
  else afterFiles();
}

/* ★ 63-1. 파일을 다 읽고 나서 갈 곳은 둘이다.
     저장된 계좌면 → 그 매장으로 되살리고 그렇게 했다고 말한다
     처음 보는 계좌면 → 지금까지처럼 매장 이름을 묻는다 (타일에서 고른 업종으로)
   ★ 답은 여기서 딱 한 번 정하고 UP 에 얹어둔다 (UP.known). 뒤 화면들이 다시 묻지 않는다 —
     같은 물음을 두 번 하면 두 답이 나올 자리가 생긴다.
   ★ 무슨 일이 있어도 화면 하나는 반드시 연다. 여기서 조용히 멈추면
     사장님 눈에는 예시 사업장만 남는다 — 63-1 이 그렇게 보였다 */
function afterFiles() {
  /* ★ 91차 ②. 이 기기에 저장해둔 거래내역으로 되살린 길.
     매장도 계좌도 이미 아는 것이라 아무것도 안 묻고 곧장 결과로 간다.
     거래처 묶기·분류 되살리기는 startOnboard 가 하던 그대로 쓴다 —
     여기서 새로 하는 일은 「물음 화면에서 멈추지 않는 것」 하나뿐이다 */
  if (RESTORING) {
    var 저장분 = RESTORING;
    RESTORING = null;
    ADD_KEEP = null;
    /* 확인 카드를 몇 건 손봤는지도 되살린다 — startFromBanks 가 0 으로 세워 두는 값이다.
       ★ 112차 ②. 줄마다 붙은 residual·patched·unsure·byStated·picked 가 그대로 왔으니
         건수는 그 줄에서 다시 센다. 저장된 건수를 믿고 쓰면 옛 저장본에서 어긋난다.
         ★ zeroed 만은 줄에서 못 세는 옛 저장본이 있어 저장된 값을 먼저 깔고 간다 */
    UP.zeroed = +저장분.zeroed || 0;
    recountBreaks();
    UP.tileTrade = tradeNow();
    startOnboard();
    /* ★ 같은 저장 자료를 그대로 다시 연 길 — 그 자료에 함께 남긴 이체 답만 쌍 ID 로 되살린다 */
    applyXferFromData(저장분.xfer);
    /* startOnboard 가 답을 붙이기 전에 저장 자료를 한 번 새로 썼다 — 되살린 답을 다시 함께 남긴다 */
    try {
      saveData();
    } catch (e) {}
    showResult();
    return;
  }
  /* ★ 71차 ②. 파일을 보태서 온 길이면 매장을 다시 묻지 않는다 —
     보태기는 「이 매장에 파일을 더한다」는 뜻이지 새 매장을 만드는 일이 아니다.
     매장 이름·성함·업종은 startFromBanks 가 이미 도로 얹어 뒀다.
     바로 거래처 확인으로 간다 — startOnboard 가 저장통에서 분류를 되살리므로
     이미 정해두신 곳은 그대로 오고 새로 나온 거래처만 물음 줄에 선다 (②-4) */
  if (ADD_KEEP) {
    ADD_KEEP = null;
    UP.tileTrade = tradeNow();
    try {
      startOnboard();
    } catch (e) {
      UP.known = null;
      askName();
    }
    openUpPanel();
    return;
  }
  /* ★ 119차. 분류 파일을 먼저 불러와 고르신 매장이면 그 매장으로 바로 잇는다.
     「이어서 하기」(askKnownStore)와 같은 길이다 — 매장 이름을 다시 묻지 않고,
     startOnboard 가 저장통의 (불러온) 분류를 되살린다. 성함은 저장된 답이 없으면 묻는다 */
  if (PICKED_STORE && PICKED_STORE.불러옴) {
    var 고른 = PICKED_STORE;
    PICKED_STORE = null;
    var 저장된 = loadPicks(고른.name === '(기본)' ? null : 고른.name) || {};
    UP.known = null;
    UP.tileTrade = tradeNow();
    UP.store = 고른.name === '(기본)' ? null : 고른.name;
    UP.trade = 저장된.업종 && TRADES[저장된.업종] ? 저장된.업종 : tradeNow();
    setTrade(UP.trade);
    try {
      if (Object.prototype.hasOwnProperty.call(저장된, 'owner')) {
        UP.owner = 저장된.owner || null;
        startOnboard();
      } else askOwner();
    } catch (e) {
      askName();
    }
    openUpPanel();
    return;
  }
  var hit;
  try {
    hit = storeForBanks(UP.banks);
  } catch (e) {
    hit = null;
  }
  UP.known = hit;
  /* 타일에서 고르신 업종. 되살릴 때 「다른 병원으로 하기」라고 부르려고 들고 있는다 */
  UP.tileTrade = tradeNow();
  /* ★ 119차 분류 파일 선택 단계. 새로 올린 거래내역이 이 갈래로 온다.
     분류 파일을 먼저 불러온 길(위)·이어서 보기로 고른 매장·보태기·되살리기에는 이 표시가 없다 */
  UP.importAsk = !PICKED_STORE;
  try {
    if (hit) askKnownStore(hit);
    else askName();
  } catch (e) {
    /* 되살림 화면을 못 그렸다고 사장님을 예시 화면에 버려두지 않는다 */
    UP.known = null;
    askName();
  }
  openUpPanel(); /* 어느 갈래로 갔든 창은 열려 있어야 한다 */
}

/* 「이 계좌는 〈시험치과〉로 저장돼 있어 치과 항목으로 엽니다」
   ★ 말없이 이기지 않는다. 저장이 타일을 이기는 것은 62차 규칙 그대로다 */
function askKnownStore(hit) {
  /* 타일에서 고르신 업종은 되돌아갈 길에 쓴다 — 먼저 읽어두고 나서 업종을 바꾼다 */
  var 타일 = TRADES[UP.tileTrade] ? UP.tileTrade : TRADE_DEFAULT;
  var 타일곳 = TRADES[타일].곳;
  setTrade(hit.업종);
  document.getElementById('uptitle').textContent = BIZ.곳 + ' 이름';
  upShow('up-name');
  var host = document.getElementById('up-name');
  host.innerHTML = '';
  host.appendChild(
    el('div', 'obsub', '파일을 읽었습니다. ' + won(UP.rows.length) + '건 · ' + monthSpan())
  );
  var 이름 = hit.name || '내 ' + BIZ.곳;
  host.appendChild(
    el(
      'div',
      'obhead',
      '이 계좌는 〈' + 이름 + '〉' + ro(이름) + ' 저장돼 있어 ' + hit.업종 + ' 항목으로 엽니다.'
    )
  );
  /* 정해둔 곳이 없는 매장도 여기 온다 (이름만 짓고 나가신 경우).
     그때 「0곳을 그대로 씁니다」라고 하면 안 한 일을 했다고 말하는 것이 된다 */
  host.appendChild(
    el(
      'div',
      'obcov',
      hit.n
        ? '지난번에 정하신 거래처 ' + won(hit.n) + '곳을 그대로 씁니다.'
        : '지난번에 정해두신 거래처는 없습니다. 이어서 정하시면 됩니다.'
    )
  );

  var acts = el('div', 'obdoneacts');
  var ok = el('button', 'b on', '이어서 하기');
  ok.type = 'button';
  ok.addEventListener('click', function () {
    UP.store = hit.name;
    UP.trade = hit.업종;
    /* ★ 71차 ④. 이미 답하신 것은 다시 묻지 않는다 — 그것이 「이어서」다.
       성함을 저장통에 답해 두셨으면(건너뛰기로 답하신 것도 답이다)
       그 답을 얹고 바로 거래처 확인으로 간다.
       옛 판이 남긴 것처럼 그 답이 아예 없는 것만 묻는다 */
    if (hit.owner답함) {
      UP.owner = hit.owner;
      startOnboard();
    } else askOwner();
  });
  /* 같은 파일을 다른 매장으로 쓰시는 분이 있을 수 있다. 길을 막지 않는다.
     ★ 여기 이름은 「타일에서 누르신 업종」이다 — 병원 타일을 누르고 오셨으면
       「다른 병원으로 하기」다. 되살린 치과로 부르면 무엇을 새로 만드는지가 안 보인다 */
  var other = el('button', 'oblink', '다른 ' + 타일곳 + ro(타일곳) + ' 하기');
  other.type = 'button';
  other.addEventListener('click', function () {
    UP.known = null;
    setTrade(타일);
    UP.trade = 타일;
    UP.accounts = tradeCats(타일).concat(TRADES[타일].더함);
    UP.baseCats = tradeCats(타일);
    UP.keepSet = tradeKeep(타일);
    UP.hidden = TRADES[타일].감춤.map(function (c) {
      return TRADES[타일].바꿈[c] || c;
    });
    askName();
  });
  acts.appendChild(ok);
  acts.appendChild(other);
  host.appendChild(acts);
}

/* 계산은 core/files.js 의 breaksOverIn — 지금 매장(UP)을 넘긴다 */
function breaksOver() {
  return breaksOverIn(UP);
}
/* ── 39차 2번 ── 잔액이 안 움직인 줄은 아예 묻지 않는다.
   부산 실파일 맨 첫 줄이 그렇다 — 통장을 만든 날(신규일 2026-03-25) 남는 줄이고,
   금액 칸이 비어 있지만 앞 잔액 0원 → 뒤 잔액 0원이다.
   ★ 돈이 1원도 안 움직였으면 금액이 얼마였든 손익이 같다. 물어볼 이유가 없다.
   묻지 않고 0원으로 두고, 확인 카드 개수에서도 뺀다 */
function autoZeroBreaks() {
  if (!UP.breaks || !UP.breaks.length) return 0;
  var keep = [],
    n = 0;
  UP.breaks.forEach(function (b) {
    var r = b.row;
    if (r.amount === null && r.balance - b.prev === 0) {
      r.amount = 0;
      r.residual = 0;
      r.patched = true;
      r.stated = null; /* 파일에 금액이 없던 줄이다 */
      /* ★ 40차 3번. 안 묻는 것과 안 알리는 것은 다르다.
         손댔으면 남긴다. 「잔액으로 채워 넣은 것」과는 뜻이 달라 따로 센다.
         ★ 112차 ②. 줄에도 표시를 남긴다 — recountBreaks 와 되살린 카드가
           이 줄을 「금액 확인이 필요한 거래」로 두 번 세지 않게 한다 */
      r.zeroed = true;
      UP.zeroed = (UP.zeroed || 0) + 1;
      n++;
      return; /* 카드를 안 만든다 */
    }
    keep.push(b);
  });
  if (!n) return 0;
  UP.breaks = keep;
  /* 계좌별 목록에서도 빼둔다 — 문턱을 계좌별로 재기 때문이다 */
  (UP.banks || []).forEach(function (bk) {
    bk.breaks = (bk.breaks || []).filter(function (b) {
      return keep.indexOf(b) !== -1;
    });
  });
  return n;
}
function breakLoad() {
  try {
    return JSON.parse(lsGet(BREAK_KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
}
function breakSave(r, pick) {
  var o = breakLoad();
  o[breakKey(r)] = pick;
  lsSet(BREAK_KEY, JSON.stringify(o));
}
function showBreaks() {
  autoZeroBreaks();
  /* 전에 답하신 것은 그 답을 그대로 채워 둔다.
     목록에서 빼지는 않는다 — applyBreaks 가 이 목록을 돌며 실제로 반영한다 */
  var 답 = breakLoad(),
    되살림 = 0;
  (UP.breaks || []).forEach(function (b) {
    var v = 답[breakKey(b.row)];
    if (v) {
      b.pick = v;
      되살림++;
    }
  });
  UP.breakBack = 되살림;
  /* 다 답해 두셨으면 물을 것이 없다. 카드를 아예 안 띄운다 */
  if (UP.breaks.length && 되살림 === UP.breaks.length) {
    applyBreaks();
    return;
  }
  if (!UP.breaks.length) {
    document.getElementById('upbad').innerHTML = '';
    afterFiles();
    return;
  }
  var over = breaksOver();
  if (over.length) showBreakError(over);
  else showBreakCards();
}

/* 너무 많이 어긋나면 파일 자체를 믿을 수 없다 — 숫자를 내놓지 않는다 */
/* ── 39차 3번 ── 파일이 진짜로 안 맞는 분께 나가는 화면.
   ★ 「보여드릴 수 없습니다」는 앱이 손을 뗐다는 말이고,
     「잔액이 이어지지 않습니다」는 앱 속사정이지 파일을 내려받아 올린 사람의 말이 아니다.
   ★ 엑셀 행번호와 잔액 다섯 줄은 볼 사람이 없다. 접어둔다.
   ★ 「다른 파일 고르기」 하나뿐이면 다른 파일이 없는 분께는 막다른 길이다 —
     무엇을 하면 되는지(기간을 한 번에 잡아 다시 내려받기)를 적는다 */
function showBreakError(over) {
  upShow('up-pick');
  upReadState(false); /* ★ 119차 업로드 안내. 못 쓰는 파일이라 올리기 안내를 그대로 둔다 */
  useFail('balance');
  var host = document.getElementById('upbad');
  host.innerHTML = '';
  var box = el('div', 'upbad');
  box.appendChild(el('h4', null, '이 파일로는 계산이 맞지 않습니다'));

  var list = over && over.length ? over : null;
  if (list) {
    list.forEach(function (b) {
      box.appendChild(
        el(
          'div',
          'errb',
          (b.bank ? b.bank + ' ' : '') +
            '거래 ' +
            won(b.rows.length) +
            '건 가운데 ' +
            won(b.breaks.length) +
            '건에서, 앞 줄 잔액에 이 줄 금액을 더한 값이 ' +
            '다음 줄 잔액과 달랐습니다. 저희가 잘못 읽었을 수도 있습니다.'
        )
      );
    });
  }
  box.appendChild(
    el(
      'div',
      'errb',
      '거래내역을 기간을 나눠 여러 번 내려받으셨다면, 중간이 빠졌을 수 있습니다. ' +
        '은행 앱에서 기간을 한 번에 잡아 다시 내려받아 선택하시면 대개 맞아떨어집니다.'
    )
  );

  var acts = el('div', 'upacts');

  /* ★ 40차 4번. 예전에는 「다시 올리기」가 PENDING 을 통째로 비웠다.
     부산 하나가 깨졌을 뿐인데 멀쩡한 신한 2,048건까지 다시 받아 올려야 했다.
     위 문구가 「○○은행 거래 N건 가운데」로 한 계좌를 지목하고 있으니
     버튼도 그 계좌만 빼는 쪽이 맞다.
     ★ 여기 오기 전에 PENDING 은 이미 비워져 있다 (startFromBanks 앞).
       계좌들은 UP.banks 에 있으므로 거기서 되살린다 */
  var alive = (UP.banks || []).filter(function (bk) {
    return (over || []).indexOf(bk) === -1;
  });

  /* 남은 계좌만 파일 목록으로 되돌린다 */
  function backWith(keep) {
    host.innerHTML = '';
    upStat('');
    PENDING = keep;
    PENDING.forEach(function (b, i) {
      /* startFromBanks 가 같은 이름 갈라 부르며 「신한은행 1」처럼 꼬리를 붙였다.
         목록으로 돌아갈 때는 원래 이름으로 되돌려 놓는다 — 안 그러면 꼬리가 쌓인다 */
      b.bank = b.typed || b.found || '계좌 ' + (i + 1);
      b.idx = i;
    });
    UP = null;
    drawFileList();
  }
  function startOver() {
    host.innerHTML = '';
    upStat('');
    PENDING = [];
    UP = null;
    var inp = /** @type {HTMLInputElement} */ (document.getElementById('upinput'));
    inp.value = '';
    inp.click();
  }

  if (alive.length && over && over.length) {
    /* 멀쩡한 계좌가 남아 있을 때만 갈라 보여준다.
       하나뿐인데 둘로 나누면 같은 일을 하는 버튼이 둘이 된다 */
    over.forEach(function (b) {
      var one = el('button', 'b on', (b.bank || '이 계좌') + '만 다시 선택하기');
      one.type = 'button';
      one.addEventListener('click', function () {
        backWith(alive.slice());
      });
      acts.appendChild(one);
    });
    var all = el('button', 'b', '처음부터 다시');
    all.type = 'button';
    all.addEventListener('click', startOver);
    acts.appendChild(all);
  } else {
    var again = el('button', 'b on', '다시 선택하기');
    again.type = 'button';
    again.addEventListener('click', startOver);
    acts.appendChild(again);
  }
  box.appendChild(acts);

  /* 어긋난 줄은 접어둔다. 기본 화면에는 안 보인다 */
  var more = el('button', 'oblink', '어긋난 줄 보기 ▾');
  more.type = 'button';
  var det = el('div');
  det.hidden = true;
  more.addEventListener('click', function () {
    det.hidden = !det.hidden;
    more.textContent = det.hidden ? '어긋난 줄 보기 ▾' : '접기 ▴';
    if (!det.childNodes.length) {
      UP.breaks.slice(0, 20).forEach(function (b) {
        det.appendChild(breakRow(b));
      });
      if (UP.breaks.length > 20) {
        det.appendChild(el('div', 'errn', '외 ' + won(UP.breaks.length - 20) + '건 더 있습니다.'));
      }
    }
  });
  box.appendChild(more);
  box.appendChild(det);
  host.appendChild(box);
  upFocus('upbad'); /* ★ 106차 ③ */
}

function breakRow(b) {
  var r = b.row;
  var d = el('div', 'upbadrow');
  d.appendChild(el('div', null, r.at + ' · ' + r.payee + ' (엑셀 ' + r.excelRow + '행)'));
  d.appendChild(
    el('div', null, '앞 잔액 ' + won(b.prev) + '원 → 이 거래 후 ' + won(r.balance) + '원')
  );
  d.appendChild(
    el(
      'div',
      null,
      '적힌 금액 ' + (r.amount === null ? '없음' : won(r.amount) + '원') + ' · ' + b.why
    )
  );
  return d;
}

/* ★ 108차 ①③⑤. 금액 칸이 빈 거래를 묻는 카드의 몸통.
   올릴 때(showBreakCards)와 되살릴 때(showPatchedCards)가 같은 말을 해야 한다 —
   한 곳만 고치면 두 화면이 서로 다른 말을 하게 된다. 그래서 몸통을 하나로 둔다.
   ★ 사장님이 답할 질문은 하나뿐이다 — 「이 거래를 이 금액으로 반영해도 되는가」.
     그래서 계산 방법(잔액이 얼마에서 얼마로)은 본문에서 빼고, 판단할 숫자를 따로 세운다.
   ★ 방향(입금·출금)은 실제값으로 쓴다 */
/* ★ 109차 ③. 확인 카드는 갈래마다 모양이 달랐다. 뼈대를 하나로 둔다 —
   머리(날짜 · 거래처) · 본문(무슨 일인가) · 숫자(판단할 값) · 꼬리(작은 글씨).
   ★ 머리는 갈래와 상관없이 같다. 본문과 숫자만 갈래를 탄다.
   ★ 판단할 숫자는 문장에 안 묻는다 — .ckamt 로 따로 세운다 (108차 ③과 같은 자리) */
function ckCardBody(card, r, 본문, 숫자들, 꼬리) {
  card.appendChild(
    el('div', 'ckq', +r.at.slice(5, 7) + '월 ' + +r.at.slice(8, 10) + '일 · ' + showName(r.payee))
  );
  card.appendChild(el('div', 'cka', 본문));
  (숫자들 || []).forEach(function (n) {
    var amt = el('div', 'ckamt');
    amt.appendChild(document.createTextNode(n[0] + ': '));
    amt.appendChild(el('b', null, n[1]));
    card.appendChild(amt);
  });
  if (꼬리) card.appendChild(el('div', 'cknote', 꼬리));
}
var CK_빼는설명 = '확인 필요로 분류하면 이 거래는 매출·지출 계산에서 제외됩니다.';
/* 단추를 한 군데서 만든다. 세 화면(올릴 때·되살릴 때·첫 거래)이 같은 모양을 쓴다 */
function ckBtns(card, picks, cur, onPick) {
  var btns = el('div', 'ckbtns');
  picks.forEach(function (p) {
    var btn = el('button', 'b' + (cur === p[0] ? ' on' : ''), p[1]);
    btn.type = 'button';
    btn.addEventListener('click', function () {
      onPick(p[0]);
    });
    btns.appendChild(btn);
  });
  card.appendChild(btns);
  if (
    picks.some(function (p) {
      return p[0] === 'unknown';
    })
  ) {
    card.appendChild(el('div', 'cknote', CK_빼는설명));
  }
}
function gapCardBody(card, r, delta) {
  ckCardBody(card, r, '파일에 거래 금액이 없습니다.', [['잔액 차이로 추정한 금액', 금액글(delta)]]);
  return delta > 0;
}
/* ★ 112차 ②. 어긋남 카드의 몸통. 올릴 때와 되살릴 때가 같은 말을 해야 한다 */
function diffCardBody(card, r, stated, delta, prev) {
  ckCardBody(
    card,
    r,
    '거래 금액과 잔액 변화가 일치하지 않습니다.',
    [
      ['거래내역에 적힌 금액', 금액글(stated)],
      ['잔액이 움직인 금액', 금액글(delta)]
    ],
    prev === null
      ? null
      : '계좌 잔액은 ' + won(prev) + '원에서 ' + won(r.balance) + '원으로 바뀌었습니다.'
  );
}
/* 건수는 줄에서 다시 센다. 예전처럼 ++ 로 쌓으면 다시 고르실 때 두 번 세어진다 */
function recountBreaks() {
  var p = 0,
    u = 0,
    s = 0,
    a = 0;
  ((UP && UP.rows) || []).forEach(function (r) {
    if (zeroRow(r)) return;
    if (r.unsure) u++;
    else if (r.byStated) s++;
    else if (r.patched) {
      p++;
      if (!r.picked) a++;
    }
  });
  UP.patched = p;
  UP.unsure = u;
  UP.byStated = s;
  UP.autoPatched = a;
}
/* ★ 107차 ②. 확인 카드를 거쳐 온 거래를 다시 열어 본다.
   한 번 넘어가면 「아닙니다」를 고를 길이 아예 없었다 — 결과 화면의 그 줄은 알림뿐이었다.
   ★ applyBreaks 가 끝나면 UP.breaks 는 비어 있다. 정한 금액이 잔액과 맞아
     깨진 거래가 없어지기 때문이다. 그래서 줄에 남은 자국(ckRow)에서 카드를 다시 짓는다.
   ★ 112차 ②. 예전에는 「금액 없음」 카드 한 갈래만 되살아났고 무를 길도 하나뿐이었다.
     이제 어느 상태에서 와도 셋(또는 둘)을 그대로 다시 고르실 수 있다.
   ★ b.prev 를 되살릴 필요가 없다 — 잔액이 움직인 금액은 amtOf(r) 가 그대로 돌려준다 */
function showPatchedCards() {
  if (!UP || !UP.rows) return false;
  var list = UP.rows.filter(ckRow);
  if (!list.length) return false;
  upShow('up-pick');
  upReadState(false); /* ★ 119차 업로드 안내. 이 화면은 이번 수정 밖이라 예전 모양 그대로 */
  var host = document.getElementById('upbad');
  host.innerHTML = '';
  var box = el('div', 'upbad');
  /* ★ 108차 ①. 「채워 넣은」은 앱이 한 일이고 「확인이 필요한」은 사장님이 할 일이다.
     제목은 사장님이 할 일로 적는다 */
  box.appendChild(el('h4', null, '금액 확인이 필요한 거래 ' + won(list.length) + '건'));
  box.appendChild(
    el(
      'div',
      'errb',
      '거래내역에서 금액이 빠졌거나 계좌 잔액과 안 맞는 거래입니다. 다시 고르실 수 있습니다.'
    )
  );
  list.forEach(function (r) {
    var card = el('div', 'ckcard');
    /* ★ amount + residual 은 어느 상태에서도 잔액이 움직인 금액 그대로다 */
    var delta = amtOf(r) || 0;
    var st = r.stated === null || r.stated === undefined ? null : r.stated;
    if (st === null) gapCardBody(card, r, delta);
    else diffCardBody(card, r, st, delta, null);
    var cur = r.unsure ? 'unknown' : r.byStated ? 'stated' : 'gap';
    ckBtns(card, ckPickList(st, delta), cur, function (pick) {
      repickRow(r, pick);
    });
    box.appendChild(card);
  });
  var acts = el('div', 'upacts');
  var back = el('button', 'b on', '결과로 돌아가기');
  back.type = 'button';
  back.addEventListener('click', function () {
    showResult();
  });
  acts.appendChild(back);
  box.appendChild(acts);
  host.appendChild(box);
  upFocus('upbad');
  return true;
}
/* 결과 화면까지 온 뒤에 다시 고르신 것을 반영한다.
   ★ 검산은 다시 안 돌려도 된다. amtOf 가 amount + residual 이라 잔액 사슬은 그대로 선다.
   ★ 답은 저장통에도 남긴다 (64차 ⑨) — 같은 파일을 다시 올려도 이 답이 따라온다 */
function repickRow(r, pick) {
  applyPick(r, pick, amtOf(r) || 0, true);
  try {
    breakSave(r, pick);
  } catch (e) {}
  recountBreaks();
  UP.__due = null;
  try {
    savePicks();
  } catch (e) {}
  if (!showPatchedCards()) showResult();
}
/* 몇 건 안 되면 사장님께 물어본다 — 자동으로 고치지 않는다 */
function showBreakCards() {
  /* ★ 38차 8번. upbad 는 up-pick 안에 있다. 화면을 안 바꾸면
     파일 목록(up-files)이 그대로 남고 이 카드는 숨은 자리에 그려진다 —
     사장님 눈에는 「시작하기를 눌러도 아무 일도 안 일어난다」로 보인다.
     ★ 파일 개수 문제가 아니라 「검산 깨진 거래가 있을 때」다.
       부산 파일 하나만 올려도(검산 1건) 똑같이 막혔다 */
  upShow('up-pick');
  upReadState(true); /* ★ 119차 업로드 안내. 읽었으니 처음 올리기 안내를 접는다 */
  /* ★ 64-9. 답도 정하신 내용이다 — 저장통에 남긴다 */
  function 답하기(b, pick) {
    b.pick = pick;
    breakSave(b.row, pick);
    showBreakCards();
  }
  var host = document.getElementById('upbad');
  host.innerHTML = '';
  var box = el('div', 'upbad');
  var 남은 = UP.breaks.filter(function (b) {
    return !b.pick;
  }).length;
  box.appendChild(el('h4', null, '확인이 필요한 거래가 ' + won(남은) + '건 있습니다'));
  box.appendChild(
    el('div', 'errb', '거래내역에서 금액이 빠졌거나 계좌 잔액과 안 맞는 거래입니다. 확인해주세요.')
  );
  /* ★ 107차 ③. 눌러봐야 아는 것을 미리 적는다. 늘 보인다 —
     예전에는 다 고르신 뒤(left === 0)에만 나와서, 고르는 동안에는 볼 수가 없었다.
     ★ 113차 ⓪. 여기서 「그 화면에 있는 빼는 단추 이름」을 모으던 일곱 줄은 지웠다.
       109차 ②가 만든 규칙(화면에 없는 단추 이름을 부르지 않는다)은 그 이름을
       하단 안내에 끼워 넣으려고 있던 것인데, 그 하단 안내가 없어졌다.
       이제 그 말은 카드 안에서 제 단추 바로 옆에 서므로 이름을 고를 일이 없다 —
       규칙이 필요 없어진 것이지 깨진 것이 아니다 */

  if (UP.breakBack) {
    box.appendChild(
      el('div', 'errn', '전에 확인해두신 ' + won(UP.breakBack) + '건은 다시 묻지 않습니다.')
    );
  }
  UP.breaks.forEach(function (b) {
    if (b.pick) return; /* ★ 64-9. 이미 답하신 건은 안 묻는다 */
    var r = b.row,
      delta = r.balance - b.prev;
    var card = el('div', 'ckcard');
    var picks;

    if (r.amount === null && delta === 0) {
      /* 첫 거래라 앞 잔액이 없다 — 금액도 방향도 알 길이 없다.
         ★ 109차 ③. 머리는 다른 카드와 같다. 판단할 숫자가 없는 갈래라 숫자 줄은 없다 */
      ckCardBody(
        card,
        r,
        '거래 금액이 없고, 앞 잔액도 없어 방향을 정할 수 없습니다.',
        null,
        '이 거래를 0원으로 두면 ' + won(r.balance) + '원부터 계산합니다.'
      );
      /* ★ 112차 ②㉯. 빼는 쪽 이름은 세 갈래가 다 같다 */
      picks = [
        ['gap', '0원으로 두고 계속'],
        ['unknown', CK_빼는이름]
      ];
    } else if (r.amount === null) {
      /* ① 금액 칸이 비어 있다 — 되살린 카드(showPatchedCards)와 같은 몸통을 쓴다 (108차 ⑤) */
      gapCardBody(card, r, delta);
      picks = ckPickList(null, delta);
    } else {
      /* ② 금액은 적혀 있는데 잔액과 다르다 — 금액 없음 카드와 같은 뼈대다 (109차 ③).
         ★ 112차 ②㉮. 단추가 셋이고 셋의 결과가 서로 다르다.
           예전에는 「900,000원이 맞음」과 「나중에 확인」이 한 글자도 다르지 않았다.
           「맞음」이 아니라 「반영」으로 적는다 — 고르는 일이 무엇인지 이름에 있어야 한다.
           세 번째는 금액을 판단할 수 없는 분께 필요하고, 앞의 둘과 동작이 다르다 */
      diffCardBody(card, r, r.amount, delta, b.prev);
      picks = ckPickList(r.amount, delta);
    }

    ckBtns(card, picks, b.pick, function (pick) {
      답하기(b, pick);
    });
    box.appendChild(card);
  });

  var left = UP.breaks.filter(function (b) {
    return !b.pick;
  }).length;
  /* ★ 119차 업로드 안내. 진행 단추 둘과 임시 반영 안내를 한 묶음으로 화면 아래에 붙여 둔다.
     카드가 둘만 돼도 폰(390)에서 단추가 화면 밖으로 내려가 찾기 어려웠다.
     단추·문구·동작은 그대로다. 자리만 따라 내려온다 */
  var 진행 = el('div', 'ckgo');
  var acts = el('div', 'upacts');
  var go = el('button', 'b on', '지금 확인하기');
  go.type = 'button';
  go.disabled = left > 0;
  go.addEventListener('click', applyBreaks);
  acts.appendChild(go);
  var later = el('button', 'b', '나중에 하고 결과 보기');
  later.type = 'button';
  later.addEventListener('click', function () {
    /* 안 고른 것은 추정 금액으로 임시 반영한다. 결과 화면에 몇 건인지 남는다.
       ★ 112차 ②㉲. 이것은 「사용자 확인 완료」가 아니다 — b.auto 로 표시해 둔다.
         applyPick 이 picked=false 로 적고, 저장통(breakSave)에도 안 남긴다.
         한 번 답한 것으로 남으면 다음에 올릴 때 여쭙지도 않게 된다 */
    UP.breaks.forEach(function (b) {
      if (!b.pick) {
        b.pick = 'gap';
        b.auto = true;
      }
    });
    applyBreaks();
  });
  acts.appendChild(later);
  진행.appendChild(acts);
  box.appendChild(진행);
  /* ★ 107차 ①. 「나중에」가 무엇을 하는지 적는다.
     「계좌 잔액이 움직인 대로 넣어둡니다」만으로는 넣었다는 건지 아닌지가 남는다.
     ★ 「다르면 나중에 고치실 수 있습니다」는 107차 ②가 그 길을 만들어서 하는 말이다.
       ②가 없으면 못 지킬 약속이라 같이 넣었다 */
  /* ★ 112차 ②㉳. 두 줄로 나눈다. 한 줄에 다 붙이면 무엇이 무엇에 대한 말인지 안 읽힌다.
     ★ 109차의 「지금 그 금액을 고르신 것과 결과가 같습니다」는 뺀다 —
       금액은 같아도 확인 여부가 다르다. 같다고 적으면 그 차이를 지운다 (㉲).
     ★ 추정 금액은 카드 안에 이미 굵게 서 있다. 여기서 되풀이하지 않는다.
     ★ 113차 ⓪. 여기 있던 셋째 줄(「확인 필요로 분류한 거래는 … 제외됩니다」)은 지웠다.
       같은 말이 카드 안(CK_빼는설명)에 이미 카드마다 한 번씩 서 있어서,
       카드가 둘이면 한 화면에 세 번 나왔다.
       ★ 남기는 쪽은 카드 안이다 — 단추의 계산 영향을 「고르기 전에」 알 수 있어야 한다.
         하단으로 모으면 단추에서 눈을 떼고 내려가야 그 말을 만난다.
       ★ 카드 수에 따라 설명 자리를 바꾸지 않는다. 하나든 열이든 카드 안이다.
       ★ 위의 두 줄은 뜻이 다른 말이라 그대로 둔다 —
         하나는 「몇 건 남았나」, 하나는 「안 고르면 어떻게 되나」다 */
  if (left > 0) {
    진행.appendChild(
      el(
        'div',
        'errn',
        '확인할 거래가 ' + won(left) + '건 남았습니다. 나중에 다시 확인할 수 있습니다.'
      )
    );
    진행.appendChild(el('div', 'errn', '선택하지 않은 거래는 추정 금액으로 임시 반영됩니다.'));
  }
  host.appendChild(box);
  /* ★ 106차 ③. 38차 ⑧이 화면은 바꿔놨지만, 카드는 은행 안내 아래에 그려졌다.
     차례를 바꾼 데다(㉮) 그 자리로 옮기기까지 해야 「안 눌린다」가 안 남는다 */
  /* ★ 119차 업로드 안내. 카드 바로 위의 요약(은행·건수)부터 보이게 한다 */
  upFocus('upstat');
}

function applyBreaks() {
  ADD_FROM_READ = false; /* ★ 119차 업로드 안내. 카드 단계를 떠난다 */
  /* ★ 112차 ②. 고른 것마다 상태가 다르다. 셈은 applyPick 한 군데에 있다 —
     예전에는 여기서 'stated' 와 'unknown' 이 같은 가지로 떨어져 결과가 똑같았다.
     ★ 건수는 ++ 로 쌓지 않고 나중에 recountBreaks 가 줄에서 다시 센다 (완료 기준 10) */
  UP.breaks.forEach(function (b) {
    var r = b.row,
      delta = r.balance - b.prev;
    applyPick(r, b.pick, delta, !b.auto);
  });
  /* ★ 39차 1번. 계좌별로 따로 검산하고 다시 합친다.
     예전에는 두 계좌가 섞인 UP.rows 를 통째로 다시 검산했다.
     계좌가 다르면 잔액 사슬은 절대 안 이어지므로 1건이 375건(11.9%)으로 튀고,
     문턱 1%를 넘겨 「숫자를 보여드릴 수 없습니다」로 갔다 —
     계좌를 둘 올리고 확인 카드가 한 건이라도 뜨면 무슨 버튼을 눌러도 막혔다.
     startFromBanks 에 이미 적혀 있던 규칙을 여기만 안 지키고 있었다 */
  if (UP.banks && UP.banks.length) {
    var rows2 = [],
      allB = [],
      op = 0,
      cl = 0;
    UP.banks.forEach(function (bk) {
      var r2 = orderAndVerify(bk.rows);
      bk.rows = r2.rows;
      bk.opening = r2.opening;
      bk.closing = r2.closing;
      bk.breaks = r2.breaks;
      op += r2.opening;
      cl += r2.closing;
      r2.breaks.forEach(function (x) {
        x.bank = bk.bank;
        allB.push(x);
      });
      r2.rows.forEach(function (r) {
        r.acc = bk.idx;
        rows2.push(r);
      });
    });
    rows2.sort(function (a, b) {
      if (a.at !== b.at) return a.at < b.at ? -1 : 1;
      return a.acc - b.acc;
    });
    UP.rows = rows2;
    UP.opening = op;
    UP.closing = cl;
    UP.breaks = allB;
  } else {
    var res = orderAndVerify(UP.rows);
    UP.rows = res.rows;
    UP.opening = res.opening;
    UP.closing = res.closing;
    UP.breaks = res.breaks;
  }
  /* ★ 112차 ②. 건수는 다시 세운 줄에서 다시 센다 — 몇 번을 고쳐 고르셔도 겹쳐 쌓이지 않는다 */
  recountBreaks();
  if (UP.breaks.length) {
    showBreaks();
    return;
  } /* 그래도 안 맞으면 다시 멈춘다 */
  document.getElementById('upbad').innerHTML = '';
  afterFiles();
}
