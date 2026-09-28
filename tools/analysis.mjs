// 가상 환경 활성화 없이 같은 Python 으로 분석 도구와 노트북을 실행한다.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runPython, VENV_PYTHON } from './setup-python.mjs';

try {
  if (!existsSync(VENV_PYTHON))
    throw new Error('먼저 npm run setup 으로 분석 환경을 준비해 주세요.');
  const [mode, ...args] = process.argv.slice(2);
  if (mode === '--check-environment') {
    runPython([fileURLToPath(new URL('./check-analysis.py', import.meta.url))]);
  } else if (mode === 'notebook') {
    // 프로젝트 전용 Python 커널을 쓰고 외부 네트워크에는 서버를 열지 않는다.
    runPython([
      '-m',
      'jupyterlab',
      '--ip=127.0.0.1',
      '--no-browser',
      '--ServerApp.root_dir=' + fileURLToPath(new URL('../data/notebooks', import.meta.url)),
      '--LabApp.check_for_updates_class=jupyterlab.NeverCheckForUpdate',
      '--LabApp.extension_manager=readonly',
      ...args
    ]);
  } else {
    runPython([
      fileURLToPath(new URL('../analysis/run.py', import.meta.url)),
      ...(mode ? [mode, ...args] : ['--help'])
    ]);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
