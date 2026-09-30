// 테스트 대상 확인 — 4173 에 떠 있는 서버가 이 작업본의 app/ 을 서빙하는가.
// ★ playwright 는 떠 있는 서버를 재사용한다(reuseExistingServer). 다른 worktree 의 미리보기 서버가 그 포트에 있으면
//   조용히 다른 판을 검사하게 된다 — 실제로 있었다. 그래서 서버가 알려주는 폴더(X-Serve-Root)와 이 작업본의
//   app/ 폴더를 견주고, 다르거나 알 수 없으면 실패한다.
// ★ BASE_URL(배포 사이트 검사)을 줬으면 확인하지 않는다.
import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export default async function globalSetup(config) {
  if (process.env.BASE_URL) return;
  const base = config.projects[0].use.baseURL || 'http://localhost:4173';
  const want = await realpath(fileURLToPath(new URL('../app/', import.meta.url)));
  let got;
  try {
    const res = await fetch(base + '/index.html', { method: 'HEAD' });
    const h = res.headers.get('x-serve-root');
    got = h ? await realpath(decodeURIComponent(h)) : null;
  } catch {
    got = null;
  }
  const norm = (p) => (p || '').replace(/[\\/]+$/, '').toLowerCase();
  if (norm(got) !== norm(want)) {
    throw new Error(
      `테스트 대상 서버가 이 작업본이 아닙니다.\n  서버: ${base} → ${got || '(알 수 없음 — 옛 serve.mjs 이거나 다른 서버)'}\n  작업본: ${want}\n` +
        '  그 포트의 다른 서버를 끄고 다시 실행하세요.'
    );
  }
  console.log(`테스트 대상: ${base} → ${want}`);
}
