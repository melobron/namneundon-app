// 앱(app/src) 타입 검사 — 기준선보다 오류가 늘면 실패한다.
//
// 도입(2026-09-25) 때 오류가 52개 있었다. 대부분 「이 객체에 이런 속성이 있는지 모른다」(TS2339)
// 라서 지금 고치지 않고, 새로 늘지만 않게 묶는다. 고쳐서 줄면 BASELINE 을 그 수로 낮춘다.
//
// 사용: node tools/typecheck-app.mjs
import { execFileSync } from 'node:child_process';

const BASELINE = 51;

let out = '';
try {
  execFileSync('npx', ['tsc', '-p', 'tsconfig.app.json'], { encoding: 'utf8', stdio: 'pipe' });
} catch (e) {
  out = (e.stdout || '') + (e.stderr || '');
}
const errors = out.split('\n').filter((l) => l.includes('error TS'));
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
