// 웹 초기 설정에서 부르는 분석 환경 준비. 전역 패키지 대신 프로젝트 .venv 를 쓴다.
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const VENV_PYTHON = join(
  ROOT,
  '.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'
);
const REQUIREMENTS = join(ROOT, 'analysis/requirements.txt');
const STAMP = join(ROOT, '.venv/requirements.sha256');
// 공식 배포 페이지의 SHA-256 으로 실행 전에 파일을 확인한다.
// https://www.python.org/downloads/release/python-31315/
const PYTHON_VERSION = '3.13.15';
const INSTALLER_SHA256 = 'edec09c4853aeae9ac36efb8c9f95b6b8e2fee65eee56d9767a8b7c69c574403';

function pythonInfo(command, args = []) {
  const result = spawnSync(
    command,
    [
      ...args,
      '-X',
      'utf8',
      '-c',
      'import sys, struct, venv; print(sys.executable) if (3, 12) <= sys.version_info[:2] < (3, 14) and struct.calcsize("P") == 8 else sys.exit(1)'
    ],
    { encoding: 'utf8', timeout: 10000 }
  );
  return result.status === 0 ? result.stdout.trim() : null;
}

function windowsTarget() {
  if (!process.env.LOCALAPPDATA) throw new Error('LOCALAPPDATA 경로가 없다.');
  return join(process.env.LOCALAPPDATA, 'Programs', 'Python', 'Python313');
}

/** Python 이 없는 Windows 에서 관리자 권한 없이 공식 설치 파일을 실행한다. */
export async function installWindowsPython() {
  if (process.platform !== 'win32' || process.arch !== 'x64')
    throw new Error(
      '자동 Python 설치는 Windows x64 에서 지원한다. Python 3.12 또는 3.13 을 설치해 주세요.'
    );
  const target = windowsTarget();
  const python = join(target, 'python.exe');
  if (pythonInfo(python)) return python;
  const temp = mkdtempSync(join(tmpdir(), 'namneundon-python-'));
  try {
    console.log(`Python ${PYTHON_VERSION} 공식 설치 파일을 받습니다 (약 28 MB).`);
    const response = await fetch(
      `https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-amd64.exe`,
      { signal: AbortSignal.timeout(180000) }
    );
    if (!response.ok) throw new Error(`Python 다운로드 실패: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (createHash('sha256').update(bytes).digest('hex') !== INSTALLER_SHA256)
      throw new Error('Python 설치 파일의 SHA-256 이 다르다. 실행하지 않았다.');
    const installer = join(temp, 'python-installer.exe');
    writeFileSync(installer, bytes);
    const result = spawnSync(
      installer,
      [
        '/quiet',
        'InstallAllUsers=0',
        `TargetDir=${target}`,
        'PrependPath=0',
        'Include_launcher=0',
        'Include_test=0',
        'Include_doc=0',
        'Shortcuts=0'
      ],
      { stdio: 'inherit', timeout: 300000 }
    );
    if (![0, 3010].includes(result.status) || !pythonInfo(python))
      throw new Error(
        `Python 설치 실패 (${result.status}). VDI 설치 정책 또는 재시작 필요 여부를 확인해 주세요.`
      );
    return python;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

function findPython() {
  if (process.env.PYTHON) {
    const found = pythonInfo(process.env.PYTHON);
    if (!found)
      throw new Error('PYTHON 에 지정한 실행 파일은 64비트 Python 3.12 또는 3.13 이어야 한다.');
    return found;
  }
  const candidates =
    process.platform === 'win32'
      ? [
          [join(windowsTarget(), 'python.exe')],
          ['py', '-3.13'],
          ['py', '-3.12'],
          ['python'],
          ['python3']
        ]
      : [['python3.13'], ['python3.12'], ['python3']];
  for (const [command, ...args] of candidates) {
    const found = pythonInfo(command, args);
    if (found) return found;
  }
  return null;
}

export function runPython(args, options = {}) {
  const result = spawnSync(VENV_PYTHON, ['-X', 'utf8', ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    ...options
  });
  if (result.status !== 0)
    throw new Error(
      `Python 실행 실패: ${args.join(' ')} (${result.error?.message || result.status})`
    );
}

export async function setupPython({ checkOnly = false } = {}) {
  const hash = createHash('sha256').update(readFileSync(REQUIREMENTS)).digest('hex');
  if (!existsSync(VENV_PYTHON)) {
    if (checkOnly)
      throw new Error('분석 환경 .venv 가 없다. 인터넷 연결 중 npm run setup 을 실행해 주세요.');
    // 깨진 기존 환경을 임의로 삭제하거나 덮어쓰지 않는다.
    if (existsSync(join(ROOT, '.venv')))
      throw new Error(
        '.venv 가 불완전하다. 백업 후 폴더 이름을 바꾸고 setup 을 다시 실행해 주세요.'
      );
    const python =
      findPython() || (process.platform === 'win32' ? await installWindowsPython() : null);
    if (!python)
      throw new Error(
        '64비트 Python 3.12 또는 3.13 이 필요하다. 설치 후 setup 을 다시 실행해 주세요.'
      );
    const result = spawnSync(python, ['-X', 'utf8', '-m', 'venv', join(ROOT, '.venv')], {
      stdio: 'inherit'
    });
    if (result.status !== 0) throw new Error('분석용 가상 환경 생성 실패');
  }
  if (!pythonInfo(VENV_PYTHON))
    throw new Error('.venv 의 Python 이 실행되지 않거나 지원 버전이 아니다.');
  const same = existsSync(STAMP) && readFileSync(STAMP, 'utf8') === hash;
  if (!same && checkOnly)
    throw new Error(
      '분석 패키지 설치 기록이 현재 코드와 다르다. 인터넷 연결 중 npm run setup 을 실행해 주세요.'
    );
  if (!checkOnly) {
    // 설치 실패 후 다시 실행하면 빠진 패키지를 복구한다. pip 는 설치된 버전을 재사용한다.
    runPython([
      '-m',
      'pip',
      'install',
      '--disable-pip-version-check',
      '--require-hashes',
      '--only-binary=:all:',
      '-r',
      REQUIREMENTS
    ]);
    runPython(['-m', 'pip', 'check']);
  }
  runPython([
    '-c',
    'import numpy, pandas, pyarrow, openpyxl, matplotlib, scipy, statsmodels, jupyterlab, ipykernel; print("분석 패키지 준비 완료")'
  ]);
  if (!checkOnly) {
    runPython([join(ROOT, 'analysis/run.py'), 'selftest']);
    mkdirSync(join(ROOT, 'data/notebooks'), { recursive: true });
    writeFileSync(STAMP, hash);
  }
  console.log('  ✓ Python 분석 환경');
}
