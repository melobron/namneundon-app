// 앱(app/src) 타입 검사 — 기준선보다 오류가 늘면 실패한다.
//
// 도입(2026-09-25) 때 오류가 52개 있었다. 대부분 「이 객체에 이런 속성이 있는지 모른다」(TS2339)
// 라서 지금 고치지 않고, 새로 늘지만 않게 묶는다. 고쳐서 줄면 BASELINE 을 그 수로 낮춘다.
// 2026-09-26 (B-6): 51 → 4. 바깥 라이브러리 타입(types/app-libs.d.ts)과 화면 요소 JSDoc 표시로 줄였다.
//   남은 4개는 코드를 고쳐야 없어진다 — createTreeWalker 의 옛 넷째 인자 2 · input.min 에 숫자 1 · PDF 읽기 약속 모양 1.
// 2026-09-27 (B-6): 4 → 0. 위 넷을 고쳤다 (옛 인자는 브라우저가 무시하고, min 은 글자로 저장되므로 동작은 같다).
//
// 사용: node tools/typecheck-app.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BASELINE = 0;

let out = '';
let failed = null; // tsc 가 0 이 아닌 값으로 끝났나 (오류가 있을 때도 그렇다)
try {
  // Windows 의 npx.cmd 실행 차이와 오프라인 다운로드 시도를 피한다.
  const compiler = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));
  execFileSync(process.execPath, [compiler, '-p', 'tsconfig.app.json'], {
    encoding: 'utf8',
    stdio: 'pipe'
  });
} catch (e) {
  out = (e.stdout || '') + (e.stderr || '');
  failed = e;
}
const errors = out.split('\n').filter((l) => l.includes('error TS'));
// ★ Q-1 (2026-09-27). tsc 를 아예 못 돌렸으면(npx · node 를 못 찾음, 설정 오류 등) 「error TS」 줄이 없어
//   0 개로 세고 「기준선보다 줄었다」로 통과했다. 실패했는데 타입 오류 줄이 하나도 없으면 검사 실패로 본다
if (failed && errors.length === 0) {
  console.log(out || String(failed.message || failed));
  console.log('\n✗ 타입 검사(tsc)를 실행하지 못했다 — 위 출력을 본다. 오류 0 개로 치지 않는다');
  process.exit(1);
}
console.log(`앱 타입 오류 ${errors.length}개 (기준선 ${BASELINE})`);
if (errors.length > BASELINE) {
  console.log(out);
  console.log(`\n✗ 기준선보다 ${errors.length - BASELINE}개 늘었다 — 새로 생긴 오류를 고친다`);
  process.exit(1);
}
if (errors.length < BASELINE) {
  console.log(
    `✓ 기준선보다 줄었다 — tools/typecheck-app.mjs 의 BASELINE 을 ${errors.length} 로 낮춘다`
  );
}
