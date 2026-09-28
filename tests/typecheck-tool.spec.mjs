// PATH 의 npx 에 기대지 않고 로컬 검사기의 실패를 정확히 전달해야 한다.
import { test, expect } from '@playwright/test';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(compiler) {
  const root = mkdtempSync(join(tmpdir(), '검사 도구 '));
  mkdirSync(join(root, 'tools'));
  copyFileSync(
    new URL('../tools/typecheck-app.mjs', import.meta.url),
    join(root, 'tools/typecheck-app.mjs')
  );
  writeFileSync(join(root, 'tsconfig.app.json'), '{}');
  if (compiler !== null) {
    const bin = join(root, 'node_modules/typescript/bin');
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, 'tsc'), compiler);
  }
  try {
    return spawnSync(process.execPath, [join(root, 'tools/typecheck-app.mjs')], {
      cwd: tmpdir(),
      encoding: 'utf8',
      // PATH 에 Node · npm 이 없어도 현재 Node 와 로컬 검사기로 실행된다.
      env: { ...process.env, PATH: '', Path: '' }
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('공백·한글 경로와 다른 작업 폴더에서도 검사기를 실행한다', () => {
  const result = fixture("require('node:fs').accessSync('tsconfig.app.json');");
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('앱 타입 오류 0개');
});

test('타입 오류를 성공으로 처리하지 않는다', () => {
  const result = fixture(
    "console.error('app/src/example.js(1,1): error TS2322: invalid type'); process.exit(1);"
  );
  expect(result.status).toBe(1);
  expect(result.stdout).toContain('앱 타입 오류 1개');
});

test('검사기가 없거나 실행이 깨졌을 때도 실패한다', () => {
  for (const compiler of [null, "throw new Error('compiler failed');"]) {
    const result = fixture(compiler);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('타입 검사(tsc)를 실행하지 못했다');
  }
});

test('개발 환경 점검은 Git·브라우저 도구 누락을 표시하고 정상적으로 실패한다', () => {
  const root = mkdtempSync(join(tmpdir(), '준비 점검 '));
  try {
    mkdirSync(join(root, 'tools'));
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'node_modules'));
    writeFileSync(join(root, 'node_modules/.package-lock.json'), '{}');
    writeFileSync(join(root, '.nvmrc'), '24');
    writeFileSync(join(root, 'package.json'), JSON.stringify({ engines: { node: '>=22' } }));
    copyFileSync(new URL('../tools/setup.mjs', import.meta.url), join(root, 'tools/setup.mjs'));
    const result = spawnSync(process.execPath, [join(root, 'tools/setup.mjs'), '--check'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: '', Path: '' }
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('git 이 없다');
    expect(result.stdout).toContain('Playwright 가 없다');
    expect(result.stdout).not.toContain('모두 갖춰졌다');
    expect(result.stderr).not.toContain('TypeError');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
