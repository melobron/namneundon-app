// @ts-nocheck — 구문 분석 도구다. acorn 이 주는 코드 조각의 타입이 좁아 node.name 같은 흔한 접근마다 걸린다.
// 앱 함수 분류 — 「순수한 계산」인가.
//
// 순수한 계산 = 화면(DOM)·브라우저 기능·저장소·바뀌는 전역 상태(UP 등)에 닿지 않는 함수.
// 이런 함수는 화면 없이 Node 에서 돌릴 수 있고, 같은 입력이면 늘 같은 답이 나와 단위 테스트가 쉽다.
// 부르는 함수를 따라 들어가며 판정한다 (A 가 B 를 부르고 B 가 document 를 쓰면 A 도 순수하지 않다).
//
// 사용: node tools/analyze-purity.mjs            파일별 요약
//       node tools/analyze-purity.mjs --list     순수한 함수 목록까지
//       node tools/analyze-purity.mjs --why 이름  그 함수가 왜 순수하지 않은지
//       … --up   UP 를 읽기만 하는 것은 순수로 친다 (UP 를 매개변수로 넘기면 core 로 갈 수 있는 것)
import { readFileSync } from 'node:fs';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const APP = new URL('../app/', import.meta.url);
const html = readFileSync(new URL('index.html', APP), 'utf8');
const files = [...html.matchAll(/<script src="(src\/[^"]+)"><\/script>/g)].map((m) => m[1]);

// 매개변수로 받은 화면 요소를 다루는 것 — 전역 이름(document 등)을 안 써도 화면에 닿는다
// (예: moneyLive(inp) 의 inp.addEventListener, drawDueAsk2(days) 의 days.querySelectorAll)
const DOM_METHODS = new Set([
  'addEventListener',
  'removeEventListener',
  'querySelector',
  'querySelectorAll',
  'getElementsByTagName',
  'getElementsByClassName',
  'appendChild',
  'removeChild',
  'insertBefore',
  'replaceChild',
  'setAttribute',
  'removeAttribute',
  'setSelectionRange',
  'scrollIntoView',
  'getBoundingClientRect',
  'focus',
  'blur',
  'click'
]);
// 쓰면 화면이 바뀌는 속성 (hidden · checked 같은 이름은 자료에도 흔해서 뺐다)
const DOM_PROPS = new Set(['innerHTML', 'textContent', 'className', 'classList', 'style']);

// 브라우저에서만 있는 것
const BROWSER = new Set([
  'document',
  'window',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'requestAnimationFrame',
  'alert',
  'confirm',
  'prompt',
  'FileReader',
  'Blob',
  'URL',
  'fetch',
  'Image',
  'getComputedStyle',
  'HTMLElement',
  'Event',
  'CustomEvent',
  'MutationObserver',
  'ResizeObserver',
  'IntersectionObserver',
  'screen',
  'devicePixelRatio',
  'innerWidth',
  'innerHeight',
  'matchMedia',
  'NodeFilter',
  'performance',
  'XMLSerializer',
  'DOMParser',
  'TextDecoder',
  'crypto',
  'atob',
  'btoa',
  'caches',
  'Notification'
]);
// 밖에서 들여오는 도구 — Node 에도 같은 것을 줄 수 있어 순수하지 않은 것으로 치지 않는다
const LIBS = new Set(['XLSX', 'pdfjsLib']);

const fns = new Map(); // 이름 → { file, refs:Set }
const vars = new Map(); // 최상위 var 이름 → { file, init }
const assigned = new Set(); // 함수 안에서 값이 바뀌는 최상위 var (= 상태)

for (const f of files) {
  const ast = acorn.parse(readFileSync(new URL(f, APP), 'utf8'), { ecmaVersion: 'latest' });
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration') fns.set(st.id.name, { file: f, node: st });
    if (st.type === 'VariableDeclaration')
      st.declarations.forEach(
        (d) => d.id.type === 'Identifier' && vars.set(d.id.name, { file: f, init: d.init })
      );
  }
}
const top = new Set([...fns.keys(), ...vars.keys()]);

const MUTATE = new Set([
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'set',
  'delete',
  'clear',
  'add'
]);
// a.b.c → a
function rootName(n) {
  while (n && n.type === 'MemberExpression') n = n.object;
  return n && n.type === 'Identifier' ? n.name : null;
}
// 함수 안에서 쓰는 이름(지역 이름 빼고)과, 값을 바꾸는 최상위 var
function scan(fnNode) {
  const locals = new Set();
  fnNode.params.forEach((p) => walk.full(p, (n) => n.type === 'Identifier' && locals.add(n.name)));
  walk.full(fnNode.body, (n) => {
    if (n.type === 'VariableDeclarator')
      walk.full(n.id, (m) => m.type === 'Identifier' && locals.add(m.name));
    if (
      n.type === 'FunctionExpression' ||
      n.type === 'ArrowFunctionExpression' ||
      n.type === 'FunctionDeclaration'
    ) {
      n.params.forEach((p) => walk.full(p, (m) => m.type === 'Identifier' && locals.add(m.name)));
      if (n.id) locals.add(n.id.name);
    }
    if (n.type === 'CatchClause' && n.param)
      walk.full(n.param, (m) => m.type === 'Identifier' && locals.add(m.name));
  });
  const refs = new Set();
  walk.ancestor(fnNode.body, {
    Identifier(n, _s, anc) {
      const p = anc[anc.length - 2];
      if (p && p.type === 'MemberExpression' && p.property === n && !p.computed) return;
      if (p && p.type === 'Property' && p.key === n && !p.computed) return;
      if (locals.has(n.name)) return;
      refs.add(n.name);
      // 최상위 var 에 값을 넣거나 바꾸면 그 var 는 상태다
      if (
        p &&
        ((p.type === 'AssignmentExpression' && p.left === n) || p.type === 'UpdateExpression') &&
        vars.has(n.name)
      )
        assigned.add(n.name);
    },
    // 대입의 왼쪽(X = …)은 Identifier 로 방문되지 않아 따로 본다.
    // X.a = … · X[k] = … 처럼 전역 객체의 속을 바꾸는 것도 그 전역을 상태로 만든다
    AssignmentExpression(n) {
      for (let m = n.left; m && m.type === 'MemberExpression'; m = m.object)
        if (!m.computed && DOM_PROPS.has(m.property.name)) refs.add('＄화면:' + m.property.name);
      if (rootName(n.left) === 'UP' && n.left.type === 'MemberExpression') refs.add('＄UP쓰기');
      const root = rootName(n.left);
      if (root && !locals.has(root)) {
        refs.add(root);
        if (vars.has(root)) assigned.add(root);
      }
    },
    UnaryExpression(n) {
      if (n.operator === 'delete' && rootName(n.argument) === 'UP') refs.add('＄UP쓰기');
    },
    UpdateExpression(n) {
      if (rootName(n.argument) === 'UP' && n.argument.type === 'MemberExpression')
        refs.add('＄UP쓰기');
      const root = rootName(n.argument);
      if (root && !locals.has(root) && vars.has(root)) assigned.add(root);
    },
    CallExpression(n) {
      const c = n.callee;
      if (c.type === 'MemberExpression' && !c.computed && DOM_METHODS.has(c.property.name))
        refs.add('＄화면:' + c.property.name);
      // X.push(…) 처럼 전역 배열·객체를 고치는 메서드
      if (c.type === 'MemberExpression' && !c.computed && MUTATE.has(c.property.name)) {
        if (rootName(c.object) === 'UP') refs.add('＄UP쓰기');
        const root = rootName(c.object);
        if (root && !locals.has(root) && vars.has(root)) assigned.add(root);
      }
      // 부를 때마다 달라지는 것: 지금 시각, 난수
      if (c.type === 'MemberExpression' && c.object.name === 'Date' && c.property.name === 'now')
        refs.add('＄시각');
      if (c.type === 'MemberExpression' && c.object.name === 'Math' && c.property.name === 'random')
        refs.add('＄난수');
    },
    NewExpression(n) {
      if (n.callee.name === 'Date' && n.arguments.length === 0) refs.add('＄시각');
    }
  });
  return refs;
}
for (const [, v] of fns) v.refs = scan(v.node);
// 최상위 var 의 초기값이 쓰는 이름
for (const [, v] of vars) {
  v.refs = new Set();
  if (v.init) walk.full(v.init, (n) => n.type === 'Identifier' && v.refs.add(n.name));
}

// 순수하지 않은 뿌리: 브라우저 기능, 상태 var
// --up: UP 를 「매개변수로 받을 수 있는 입력」으로 본다 — 읽기만 하면 순수, 고치면 순수하지 않다
const upReadOnly = process.argv.includes('--up');
// 이름이 _MEMO 로 끝나는 것은 계산 결과를 기억만 하는 곳이라 상태로 치지 않는다
const STATE = new Set(
  [...assigned, ...(upReadOnly ? [] : ['UP'])].filter((n) => !/_MEMO$/.test(n))
);
STATE.delete(upReadOnly ? 'UP' : '');
const why = new Map(); // 이름 → 순수하지 않은 이유 (한 줄)
function impure(name, seen = new Set()) {
  if (why.has(name)) return why.get(name);
  if (seen.has(name)) return null;
  seen.add(name);
  const it = fns.get(name) || vars.get(name);
  if (!it) return null;
  let reason = null;
  for (const r of it.refs) {
    if (r === '＄시각') {
      reason = '지금 시각 (new Date · Date.now)';
      break;
    }
    if (r === '＄UP쓰기') {
      reason = 'UP 를 고친다';
      break;
    }
    if (r.startsWith('＄화면:')) {
      reason = `화면 요소를 다룬다 (.${r.slice(4)})`;
      break;
    }
    if (r === '＄난수') {
      reason = '난수 (Math.random)';
      break;
    }
    if (BROWSER.has(r)) {
      reason = `브라우저 기능 ${r}`;
      break;
    }
    if (STATE.has(r) && !fns.has(r)) {
      reason = `바뀌는 전역 ${r}`;
      break;
    }
  }
  if (!reason)
    for (const r of it.refs) {
      if (!top.has(r) || LIBS.has(r) || r === name) continue;
      const sub = impure(r, seen);
      if (sub) {
        reason = `${r}() 를 부름 ← ${sub}`;
        break;
      }
    }
  why.set(name, reason);
  return reason;
}
for (const n of fns.keys()) impure(n);

const arg = process.argv.filter((a) => a !== '--up')[2];
if (arg === '--why') {
  const n = process.argv.filter((a) => a !== '--up')[3];
  console.log(n, '→', why.get(n) || '순수 ✓');
  process.exit(0);
}
const byFile = new Map();
for (const [n, v] of fns) {
  const e = byFile.get(v.file) || { pure: [], impure: 0 };
  if (why.get(n)) e.impure++;
  else e.pure.push(n);
  byFile.set(v.file, e);
}
let tp = 0,
  ti = 0;
for (const f of files) {
  const e = byFile.get(f) || { pure: [], impure: 0 };
  tp += e.pure.length;
  ti += e.impure;
  console.log(
    `${f.padEnd(30)} 순수 ${String(e.pure.length).padStart(3)} / 전체 ${String(e.pure.length + e.impure).padStart(3)}`
  );
  if (arg === '--list' && e.pure.length) console.log('   ' + e.pure.join(' '));
}
console.log(
  `\n합계: 순수 ${tp} / 전체 ${tp + ti}  (바뀌는 전역 ${STATE.size}개: ${[...STATE].slice(0, 15).join(' ')}${STATE.size > 15 ? ' …' : ''})`
);
