/* ══ 금액 데이터 끝 ══ */

/* 마이너스는 하이픈이 아니라 빼기 기호로 — 화면 어디서나 같게 보이게 */
function won(n) {
  return n.toLocaleString('ko-KR').replace('-', '−');
}

/* 조사: 받침 없거나 'ㄹ'이면 "로", 아니면 "으로" (공과금으로 / 인건비로) */
function ro(word) {
  var c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return '로';
  var jong = (c - 0xac00) % 28;
  return jong === 0 || jong === 8 ? '로' : '으로';
}
/* 받침이 있으면 '이', 없으면 '가' */
function ga(word) {
  var c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return '가';
  return (c - 0xac00) % 28 === 0 ? '가' : '이';
}
/* 받침이 있으면 '은', 없으면 '는' */
function neun(word) {
  var c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return '는';
  return (c - 0xac00) % 28 === 0 ? '는' : '은';
}
/* 받침이 있으면 '을', 없으면 '를' */
function eul(word) {
  var c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return '를';
  return (c - 0xac00) % 28 === 0 ? '를' : '을';
}

/* ═══════════ 엑셀 업로드 ═══════════
   변호사 자문에 따른 A안: 파일은 이 브라우저 안에서만 처리한다.
   FileReader 로 읽고 메모리에서만 계산하며 서버로는 아무것도 보내지 않는다.
   거래내역·금액·잔액은 저장하지 않는다.
   사장님이 손으로 정한 거래처 분류만 localStorage 에 남는다 (savePicks). */

/* 엑셀 읽는 라이브러리는 같은 폴더에 둔다 (SheetJS 0.20.3).
   밖에서 받아오면 사장님 IP가 남고, 매장 와이파이가 끊기면 파일을 못 읽는다 */
var SHEETJS_SRC = 'xlsx.full.min.js';
var sheetjsLoading = null;

/* 라이브러리는 업로드 화면을 열 때만 가져온다 (시안 화면은 외부 요청 0건 유지) */
function loadSheetJS() {
  if (window.XLSX) return Promise.resolve();
  if (sheetjsLoading) return sheetjsLoading;
  sheetjsLoading = new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = SHEETJS_SRC;
    s.onload = res;
    s.onerror = function () {
      rej(new Error('엑셀 읽기 라이브러리를 불러오지 못했습니다'));
    };
    document.head.appendChild(s);
  });
  return sheetjsLoading;
}

/* ── 92차 ① · PDF 읽기 도구 ────────────────────────────────────────
   ★ 바깥에서 받아오지 않는다. xlsx.full.min.js 와 똑같이 이 폴더에 두고,
     거래내역 파일을 실제로 받았을 때만 가져온다 —
     첫 화면에서 바깥으로 나가는 요청은 지금까지처럼 한 건도 없다.
   ★ 워커 파일도 이 폴더에 둔다. 워커를 못 만드는 환경(file:// 로 열었을 때 등)에서는
     pdf.js 가 스스로 이 파일을 본문에서 읽어 쓴다 — 그래서 경로만 알려주면 된다. */
var PDFJS_SRC = 'pdf.min.js';
var PDFJS_WORKER = 'pdf.worker.min.js';
var pdfjsLoading = null;
function pdfWorkerPath() {
  try {
    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions)
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  } catch (e) {}
}
function loadPdfJS() {
  if (window.pdfjsLib) {
    pdfWorkerPath();
    return Promise.resolve();
  }
  if (pdfjsLoading) return pdfjsLoading;
  pdfjsLoading = new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = PDFJS_SRC;
    s.onload = function () {
      pdfWorkerPath();
      res();
    };
    s.onerror = function () {
      rej(new Error('PDF 읽기 도구를 불러오지 못했습니다'));
    };
    document.head.appendChild(s);
  });
  return pdfjsLoading;
}
