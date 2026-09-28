// 설치 전 점검과 불완전한 환경 처리에서 사용자의 폴더를 건드리지 않아야 한다.
import { test, expect } from '@playwright/test';
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('Python 점검은 설치하지 않고 누락을 알린다', () => {
  const root = mkdtempSync(join(tmpdir(), '분석 점검 '));
  try {
    mkdirSync(join(root, 'tools'));
    mkdirSync(join(root, 'analysis'));
    copyFileSync(
      new URL('../tools/setup-python.mjs', import.meta.url),
      join(root, 'tools/setup-python.mjs')
    );
    writeFileSync(join(root, 'analysis/requirements.txt'), '');
    const runner = join(root, 'check.mjs');
    writeFileSync(
      runner,
      `import { setupPython } from './tools/setup-python.mjs';
      globalThis.fetch = () => { throw new Error('network called'); };
      try { await setupPython({checkOnly: true}); } catch(e) { console.log(e.message); process.exitCode=1; }`
    );
    const result = spawnSync(process.execPath, [runner], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('분석 환경 .venv 가 없다');
    expect(result.stdout).not.toContain('network called');
    expect(existsSync(join(root, '.venv'))).toBe(false);

    mkdirSync(join(root, '.venv'));
    writeFileSync(join(root, '.venv/keep.txt'), 'keep');
    writeFileSync(
      runner,
      `import { setupPython } from './tools/setup-python.mjs';
      try { await setupPython(); } catch(e) { console.log(e.message); process.exitCode=1; }`
    );
    const broken = spawnSync(process.execPath, [runner], { encoding: 'utf8' });
    expect(broken.status).toBe(1);
    expect(broken.stdout).toContain('.venv 가 불완전하다');
    expect(readFileSync(join(root, '.venv/keep.txt'), 'utf8')).toBe('keep');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
