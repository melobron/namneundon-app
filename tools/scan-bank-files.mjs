// @ts-nocheck — 앱 계산 부품(core)을 vm 으로 불러 쓴다
// 사용: node tools/scan-bank-files.mjs <폴더>  — 은행 파일을 앱과 같은 길로 읽어 「읽히는가」만 요약한다.
// 실제 은행 파일(저장소 밖, Google Drive 등)을 저장소에 넣지 않고 「앱이 읽는가」만 확인할 때 쓴다 (backlog C-1 · C-2).
// ★ 개인정보를 출력하지 않는다: 금액 · 거래처 · 계좌번호 · 머리글 위 줄(예금주 등)은 찍지 않는다.
//   찍는 것: 파일 이름, 시트, 열 제목(머리글 한 줄), 은행 짐작, 거래 수, 실패 까닭, 잔액 검산 끊김 수
import { loadCore } from '../tests/core/load-core.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
const core = loadCore({ xlsx: true });
const X = core.XLSX;
const root = process.argv[2];
const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(xlsx?|csv|html?)$/i.test(n)) files.push(p);
  }
})(root);
function tries(name, bytes) {
  const head = Buffer.from(bytes.slice(0, 2048)).toString('latin1');
  const html = /\.html?$/i.test(name) || /<(?:!doctype\s+html|html|table)\b/i.test(head);
  if (!html) return [X.read(bytes, { type: 'array', cellDates: true })];
  const m = head.match(/charset\s*=\s*["']?\s*([a-z0-9._-]+)/i);
  const encs = m
    ? [/euc-kr|ks_c_5601|cp949|949/i.test(m[1]) ? 'euc-kr' : 'utf-8']
    : ['utf-8', 'euc-kr'];
  return encs.map((e) =>
    X.read(new TextDecoder(e).decode(bytes), { type: 'string', cellDates: true })
  );
}
for (const f of files) {
  const rel = relative(root, f);
  let out = { 파일: rel };
  try {
    const bytes = new Uint8Array(readFileSync(f));
    let got = null;
    for (const wb of tries(f, bytes)) {
      got = core.extractRows(wb);
      if (!got.fail) break;
    }
    if (got.fail) {
      out.결과 = '못 읽음 (' + got.why + ')';
    } else {
      const wb = tries(f, bytes)[0];
      const grid = X.utils.sheet_to_json(wb.Sheets[got.sheet], {
        header: 1,
        raw: true,
        defval: ''
      });
      out.은행 = got.bankHint || '-';
      out.열 = (grid[got.header - 1] || [])
        .map((x) => String(x).trim())
        .filter(Boolean)
        .join(' | ');
      out.거래 = got.rows.length;
      const v = core.orderAndVerify(
        got.rows.map((x) => ({
          at: x.at,
          payee: x.payee,
          amount: x.amount,
          balance: x.balance,
          excelRow: x.excelRow
        }))
      );
      out.검산끊김 = v.breaks.length;
      out.기간 = got.rows.length
        ? got.rows
            .map((r) => r.at)
            .sort()[0]
            .slice(0, 7) +
          ' ~ ' +
          got.rows
            .map((r) => r.at)
            .sort()
            .pop()
            .slice(0, 7)
        : '-';
      out.결과 = '읽힘';
    }
  } catch (e) {
    out.결과 = '오류 ' + String(e.message).slice(0, 60);
  }
  console.log(JSON.stringify(out));
}
