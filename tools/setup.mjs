// 처음 한 번 준비 — 저장소를 처음 받은 사람이 명령 하나로 개발 환경을 갖춘다.
// 사용: npm run setup (또는 make setup)   · 점검만: npm run doctor (또는 make doctor)
//   --check         설치하지 않고 무엇이 빠졌는지만 본다
//   --skip-browser  브라우저 다운로드만 건너뛴다. npm ci 는 그대로 실행한다
//
// Windows 에는 make 가 없어서 절차를 Makefile 이 아니라 여기(node)에 둔다.
// Makefile · npm 스크립트는 이 파일을 부르기만 한다.
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CHECK_ONLY = process.argv.includes('--check');
const SKIP_BROWSER = process.argv.includes('--skip-browser');
// Windows 에서 npm · npx 는 .cmd 라 셸을 거쳐야 실행된다
const SHELL = process.platform === 'win32';

const ok = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => console.log(`  ! ${msg}`);
let failed = 0;
const fail = (msg, fix) => {
  failed++;
  console.log(`  ✗ ${msg}${fix ? `\n      → ${fix}` : ''}`);
};

/** 명령을 화면에 보이며 돌린다. 실패하면 false */
function run(cmd, args) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    // Node 실행 경로에 공백이 있어도 인수가 셸에서 다시 해석되지 않게 한다.
    shell: SHELL && cmd === 'npm'
  });
  return r.status === 0;
}

/** 명령이 있는지 (버전 출력이 되는지) */
function has(cmd) {
  const r = spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: SHELL });
  return r.status === 0;
}

// ── 점검 ─────────────────────────────────────────
console.log(CHECK_ONLY ? '개발 환경 점검' : '개발 환경 준비');
console.log('\n도구');

// Node — CI 는 .nvmrc 판을 쓴다. engines(>=22) 보다 낮으면 npm ci 가 알아보기 힘든 오류를 낸다
const want = Number(readFileSync(new URL('../.nvmrc', import.meta.url), 'utf8').trim());
const min = Number(
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).engines.node.match(
    /\d+/
  )[0]
);
const have = Number(process.versions.node.split('.')[0]);
if (have < min)
  fail(`Node ${process.versions.node} — ${min} 이상이 필요하다`, `nvm install ${want} && nvm use`);
else if (have !== want)
  warn(
    `Node ${process.versions.node} — CI 는 Node ${want} 판을 쓴다. 되지만 맞추길 권한다 (nvm use)`
  );
else ok(`Node ${process.versions.node}`);

if (has('git')) ok('git');
else fail('git 이 없다', 'https://git-scm.com 에서 설치');

// gitleaks 는 선택 — 없으면 커밋 전 비밀 값 검사만 건너뛴다 (CI 에서는 검사한다)
if (has('gitleaks')) ok('gitleaks');
else warn('gitleaks 없음 (선택) — brew install gitleaks · winget install gitleaks');

console.log('\n저장소');
const installed = existsSync(new URL('../node_modules/.package-lock.json', import.meta.url));
if (installed) ok('node_modules 있음');
else if (CHECK_ONLY) fail('node_modules 없음', 'npm run setup');

// worktree 에서는 .git 이 파일이다. 설정(core.hooksPath)은 원래 폴더와 같이 쓴다
if (existsSync(new URL('../.git', import.meta.url))) {
  const hooks = spawnSync('git', ['config', 'core.hooksPath'], { cwd: ROOT, encoding: 'utf8' });
  if (hooks.status === 0 && hooks.stdout?.trim().startsWith('.husky'))
    ok('커밋 전 검사(husky) 켜짐');
  else if (CHECK_ONLY) fail('커밋 전 검사(husky) 꺼짐', 'npm run setup');
}

if (failed && !CHECK_ONLY) {
  console.log('\n위 문제를 먼저 풀고 다시 돌린다.');
  process.exit(1);
}

// ── 설치 ─────────────────────────────────────────
if (!CHECK_ONLY) {
  console.log('\n설치');
  // npm ci — package-lock.json 그대로 받는다. prepare 스크립트가 husky 를 켠다
  if (!run('npm', ['ci'])) {
    console.log('\nnpm ci 실패 — 위 오류를 본다. 네트워크 · Node 판을 먼저 의심한다.');
    process.exit(1);
  }
}

console.log('\n테스트용 크롬');
if (SKIP_BROWSER) {
  warn('건너뜀 (--skip-browser)');
} else if (!existsSync(new URL('../node_modules/@playwright/test/', import.meta.url))) {
  fail('Playwright 가 없다', 'npm run setup 으로 개발 의존성 설치');
} else {
  // Playwright 판마다 크롬 판이 정해져 있다. 이미 받았으면 다시 받지 않는다
  const { chromium } = await import('@playwright/test');
  if (existsSync(chromium.executablePath())) ok('Chromium 있음');
  else if (CHECK_ONLY) fail('Chromium 없음', 'npx playwright install chromium');
  else if (
    !run(process.execPath, [
      fileURLToPath(new URL('../node_modules/playwright/cli.js', import.meta.url)),
      'install',
      'chromium'
    ])
  ) {
    fail(
      'Chromium 받기 실패',
      'Linux 라면 npx playwright install --with-deps chromium (시스템 라이브러리까지)'
    );
  }
}

if (!CHECK_ONLY) {
  console.log('\n빠른 검사');
  if (!run('npm', ['run', 'check'])) fail('불러오는 순서 · core 규칙 검사 실패');
}

console.log('\nPython 분석 환경');
if (process.argv.includes('--skip-python')) {
  warn('건너뜀 (--skip-python, 웹 개발만 준비)');
} else {
  try {
    const { setupPython } = await import('./setup-python.mjs');
    await setupPython({ checkOnly: CHECK_ONLY });
  } catch (error) {
    fail(error.message, 'docs/development/setup.md 의 분석 환경 안내 확인');
  }
}

// ── 결과 ─────────────────────────────────────────
if (failed) {
  console.log(`\n✗ ${failed}개 문제가 있다. 위의 → 를 따라 고친다.`);
  process.exit(1);
}
console.log(`
✓ ${CHECK_ONLY ? '점검 끝 — 모두 갖춰졌다' : '준비 끝'}

  npm run serve   앱 :4173 · 소개 사이트 :4174
  npm run notebook  분석 노트북
  npm run analysis -- selftest  분석 도구 점검
  npm test        안전망 테스트
  npm run lint    코드 검사
  (make 가 있으면 make help 로 전체 명령을 본다)
`);
