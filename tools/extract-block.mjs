// @ts-nocheck — 구문 트리 · 변수 범위 노드를 다룬다
// 사용: node tools/extract-block.mjs <파일> <바깥 함수> --list [최소줄]
//       node extract-block.mjs <파일> <바깥 함수> --plan '<시작줄>:<새이름>,…' [--apply]
// 큰 함수의 바로 아래 문장 하나를 새 최상위 함수로 뺀다. 읽는 바깥 변수는 매개변수로 넘긴다 (그 자리에서 부르므로 같은 값).
// 못 빼는 것: 바깥 변수에 대입 · 블록 안 var 를 블록 밖에서 씀 · 바깥으로 나가는 return/break/continue · 바깥 함수의 this/arguments · 블록 안 함수 선언
// 구문 분석 · 변수 범위 분석은 eslint 가 쓰는 것을 그대로 빌린다 (package.json 에 새 의존성을 더하지 않는다)
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const fromEslint = createRequire(createRequire(import.meta.url).resolve('eslint/package.json'));
const espree = fromEslint('espree');
const eslintScope = fromEslint('eslint-scope');
const estraverse = fromEslint('estraverse');
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const args = process.argv.slice(2);
const [file, outerName] = args;
const apply = args.includes('--apply');
const APP = fileURLToPath(new URL('../app/src/', import.meta.url));
const parse = (src) =>
  espree.parse(src, { ecmaVersion: 2022, sourceType: 'script', range: true, loc: true });
const inRange = (n, s) => n.range[0] >= s.range[0] && n.range[1] <= s.range[1];
function declaredNames() {
  const names = new Set();
  const files = [
    ...readdirSync(APP)
      .filter((f) => f.endsWith('.js'))
      .map((f) => APP + f),
    ...readdirSync(APP + 'core').map((f) => APP + 'core/' + f)
  ];
  for (const f of files) {
    const sm = eslintScope.analyze(parse(readFileSync(f, 'utf8')), {
      ecmaVersion: 2022,
      sourceType: 'script'
    });
    for (const sc of sm.scopes) for (const v of sc.variables) names.add(v.name);
  }
  return names;
}
function check(src, ast, sm, outer, stmt) {
  const outerScope = sm.acquire(outer);
  // 바깥으로 나가는 제어
  let bad = null;
  const stack = [];
  estraverse.traverse(stmt, {
    enter(n) {
      if (/Function/.test(n.type)) {
        stack.push('fn');
        if (n.type === 'FunctionDeclaration' && stack.length === 1)
          bad = bad || '블록 안 함수 선언 ' + n.id.name;
        return;
      }
      if (/^(For|ForIn|ForOf|While|DoWhile)Statement$/.test(n.type)) stack.push('loop');
      if (n.type === 'SwitchStatement') stack.push('switch');
      const inFn = stack.includes('fn');
      if (!inFn && n.type === 'ReturnStatement') bad = bad || 'return';
      if (!inFn && (n.type === 'BreakStatement' || n.type === 'ContinueStatement')) {
        if (
          n.label ||
          !stack.some((x) => x === 'loop' || (x === 'switch' && n.type === 'BreakStatement'))
        )
          bad = bad || n.type;
      }
      if (
        !inFn &&
        (n.type === 'ThisExpression' || (n.type === 'Identifier' && n.name === 'arguments'))
      )
        bad = bad || 'this/arguments';
    },
    leave(n) {
      if (
        /Function/.test(n.type) ||
        /^(For|ForIn|ForOf|While|DoWhile)Statement$/.test(n.type) ||
        n.type === 'SwitchStatement'
      )
        stack.pop();
    },
    fallback: 'iteration'
  });
  if (bad) return { bad };
  const caps = new Map();
  for (const v of outerScope.variables) {
    const defsIn = v.defs.filter((d) => inRange(d.name, stmt)).length;
    const refsIn = v.references.filter((r) => inRange(r.identifier, stmt));
    const refsOut = v.references.filter((r) => !inRange(r.identifier, stmt));
    if (defsIn && defsIn === v.defs.length) {
      if (refsOut.length)
        return {
          bad: '블록 안 var ' + v.name + ' 를 밖에서 씀 @' + refsOut[0].identifier.loc.start.line
        };
      continue;
    }
    if (defsIn) return { bad: 'var ' + v.name + ' 가 안팎에 선언' };
    if (!refsIn.length) continue;
    if (v.name === 'arguments') return { bad: 'arguments' };
    if (refsIn.some((r) => r.isWrite())) return { bad: '바깥 변수 ' + v.name + ' 에 대입' };
    caps.set(v.name, v);
  }
  // 안쪽 범위(블록 안 함수 등)에서 바깥 변수 이름을 가리는지 — 새 함수에서도 같은 이름이라 문제 없다 (매개변수 이름 = 원래 이름)
  return { caps: [...caps.keys()] };
}
let src = readFileSync(file, 'utf8');
if (args.includes('--list')) {
  const min = +(args[args.indexOf('--list') + 1] || 20) || 20;
  const ast = parse(src);
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' });
  const outer = ast.body.find((n) => n.type === 'FunctionDeclaration' && n.id.name === outerName);
  for (const s of outer.body.body) {
    const len = s.loc.end.line - s.loc.start.line + 1;
    if (len < min || s.type === 'FunctionDeclaration') continue;
    const r = check(src, ast, sm, outer, s);
    const head = src.slice(s.range[0], s.range[0] + 70).replace(/\s+/g, ' ');
    console.log(
      String(s.loc.start.line).padStart(5),
      String(len).padStart(4),
      r.bad ? '✗ ' + r.bad : '✓ (' + r.caps.join(', ') + ')',
      '|',
      head
    );
  }
  process.exit(0);
}
const planArg = args[args.indexOf('--plan') + 1];
const plan = planArg.split(',').map((x) => {
  const [l, n] = x.split(':');
  return [+l, n];
});
const names = declaredNames();
// 뒤에서부터 (줄 번호가 안 흔들리게) — 하나씩 파싱 다시
plan.sort((a, b) => b[0] - a[0]);
const added = [];
for (const [line, nm] of plan) {
  if (names.has(nm)) {
    console.log('✗ 이름 충돌', nm);
    process.exit(1);
  }
  const ast = parse(src);
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' });
  const outer = ast.body.find((n) => n.type === 'FunctionDeclaration' && n.id.name === outerName);
  const s = outer.body.body.find((x) => x.loc.start.line === line);
  if (!s) {
    console.log('✗ 그 줄에 문장이 없음', line);
    process.exit(1);
  }
  const r = check(src, ast, sm, outer, s);
  if (r.bad) {
    console.log('✗', line, r.bad);
    process.exit(1);
  }
  // 문장 앞 설명 주석도 함께
  let from = s.range[0];
  for (;;) {
    let j = from;
    while (j > 0 && /[ \t\n]/.test(src[j - 1])) j--;
    if (src.slice(j - 2, j) === '*/') {
      from = src.lastIndexOf('/*', j - 2);
      continue;
    }
    break;
  }
  const lineStart = src.lastIndexOf('\n', from - 1) + 1;
  const indent = src.slice(lineStart, from);
  const body = src.slice(from, s.range[1]);
  const call = indent + nm + '(' + r.caps.join(', ') + ');';
  const fnText =
    '\n/* ' +
    outerName +
    ' 에서 뺀 부분 (B-4) */\nfunction ' +
    nm +
    '(' +
    r.caps.join(', ') +
    ') {\n' +
    indent +
    body +
    '\n}\n';
  added.push(fnText);
  src = src.slice(0, lineStart) + call + src.slice(s.range[1]);
  names.add(nm);
  console.log('✓', line, nm, '(' + r.caps.join(', ') + ')');
}
// 새 함수들은 바깥 함수 바로 뒤에, 원래 순서대로
const ast = parse(src);
const outer = ast.body.find((n) => n.type === 'FunctionDeclaration' && n.id.name === outerName);
src = src.slice(0, outer.range[1]) + added.reverse().join('') + src.slice(outer.range[1]);
if (apply) writeFileSync(file, src);
