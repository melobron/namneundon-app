// @ts-nocheck — 구문 분석 도구다. acorn 이 주는 코드 조각의 타입이 좁아 node.name 같은 흔한 접근마다 걸린다.
// core 검사 — app/src/core/ 는 「순수한 계산」만 둔다.
//
// core 파일은 화면 없이 Node 에서도 돌아야 한다 (테스트·테스트베드 VDI).
// 그래서 core 안의 코드는
//   - core 안에 있는 이름만 부른다 (화면 파일의 함수를 부르면 Node 에서 깨진다)
//   - 브라우저 기능(document·window·저장소 …)을 쓰지 않는다
//   - 지금 시각·난수를 쓰지 않는다 (같은 입력이면 늘 같은 답)
//   - 최상위 var 는 상수다 — 함수 안에서 바꾸지 않는다 (이름이 _MEMO 로 끝나는 계산 기억장만 예외)
// 사용: node tools/check-core.mjs
import { readFileSync } from 'node:fs';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const APP = new URL('../app/', import.meta.url);
const html = readFileSync(new URL('index.html', APP), 'utf8');
const all = [...html.matchAll(/<script src="(src\/[^"]+)"><\/script>/g)].map((m) => m[1]);
const core = all.filter((f) => f.startsWith('src/core/'));

// JavaScript 기본 제공 — 어디서나 있다
const BUILTIN = new Set([
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Math',
  'Date',
  'JSON',
  'RegExp',
  'Error',
  'TypeError',
  'RangeError',
  'Map',
  'Set',
  'WeakMap',
  'Symbol',
  'Promise',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'Infinity',
  'NaN',
  'undefined',
  'encodeURIComponent',
  'decodeURIComponent',
  'Intl',
  'arguments',
  'Uint8Array',
  'Int32Array',
  'Float64Array',
  'ArrayBuffer',
  'DataView',
  'BigInt',
  'console' // 개발용 기록 — 브라우저·Node 모두 있다
]);
const LIBS = new Set(['XLSX', 'pdfjsLib']); // Node 에도 같은 것을 넣어 줄 수 있다

const defs = new Set();
const parsed = core.map((f) => {
  const ast = acorn.parse(readFileSync(new URL(f, APP), 'utf8'), {
    ecmaVersion: 'latest',
    locations: true
  });
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration') defs.add(st.id.name);
    if (st.type === 'VariableDeclaration') st.declarations.forEach((d) => defs.add(d.id.name));
  }
  return [f, ast];
});

const bad = [];
for (const [f, ast] of parsed) {
  for (const st of ast.body) {
    if (!['FunctionDeclaration', 'VariableDeclaration', 'EmptyStatement'].includes(st.type))
      bad.push(
        `${f}:${st.loc.start.line} 최상위에서 실행되는 코드 (${st.type}) — core 는 선언만 둔다`
      );
  }
  walk.fullAncestor(ast, (n, _s, anc) => {
    const p = anc[anc.length - 2];
    const where = `${f}:${n.loc.start.line}`;
    if (n.type === 'Identifier') {
      if (p && p.type === 'MemberExpression' && p.property === n && !p.computed) return;
      if (p && p.type === 'Property' && p.key === n && !p.computed) return;
      if (declaredLocally(n, anc)) return;
      if (defs.has(n.name) || BUILTIN.has(n.name) || LIBS.has(n.name)) return;
      bad.push(`${where} ${n.name} — core 밖의 이름`);
    }
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression') {
      const o = n.callee.object.name,
        m = n.callee.property.name;
      if ((o === 'Date' && m === 'now') || (o === 'Math' && m === 'random'))
        bad.push(`${where} ${o}.${m}() — 부를 때마다 답이 다르다`);
    }
    if (n.type === 'NewExpression' && n.callee.name === 'Date' && n.arguments.length === 0)
      bad.push(`${where} new Date() — 지금 시각`);
    if (n.type === 'AssignmentExpression' || n.type === 'UpdateExpression') {
      let t = n.type === 'AssignmentExpression' ? n.left : n.argument;
      while (t.type === 'MemberExpression') t = t.object;
      // 이름이 _MEMO 로 끝나는 것은 계산 결과를 기억만 하는 곳 — 같은 입력이면 같은 답이라 허용
      if (
        t.type === 'Identifier' &&
        defs.has(t.name) &&
        !/_MEMO$/.test(t.name) &&
        !declaredLocally(t, anc)
      )
        bad.push(`${where} ${t.name} 를 바꾼다 — core 의 최상위 값은 상수다`);
    }
  });
}

// 이 이름이 둘러싼 함수의 매개변수·지역 변수인가
function declaredLocally(id, anc) {
  for (let i = anc.length - 2; i >= 0; i--) {
    const a = anc[i];
    if (/Function/.test(a.type)) {
      let hit = false;
      a.params.forEach((pp) =>
        walk.full(pp, (m) => m.type === 'Identifier' && m.name === id.name && (hit = true))
      );
      if (a.id && a.id.name === id.name && a.type !== 'FunctionDeclaration') hit = true;
      walk.simple(a.body, {
        VariableDeclarator(d) {
          walk.full(d.id, (m) => m.type === 'Identifier' && m.name === id.name && (hit = true));
        },
        FunctionDeclaration(d) {
          if (d.id.name === id.name) hit = true;
        },
        CatchClause(c) {
          if (c.param)
            walk.full(
              c.param,
              (m) => m.type === 'Identifier' && m.name === id.name && (hit = true)
            );
        }
      });
      if (hit) return true;
    }
  }
  return false;
}

if (bad.length) {
  console.log('■ core 규칙 위반\n' + [...new Set(bad)].join('\n'));
  process.exit(1);
}
console.log(`core 규칙 지킴 ✓ (${core.length}개 파일, 이름 ${defs.size}개)`);
