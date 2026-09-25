// 파일을 나눈 뒤의 「불러오는 순서」 검사.
//
// 원래 한 <script> 였을 때는 모든 function 과 var 가 코드가 돌기 전에 이미 있었다 (호이스팅).
// 여러 파일로 나누면, 앞 파일을 불러오는 순간 실행되는 코드가 뒤 파일의 이름을 쓰면 깨진다.
//   - 뒤 파일의 함수를 부르면           → ReferenceError (원래는 잘 불렸다)
//   - 뒤 파일의 함수·변수 이름을 쓰기만 해도 → ReferenceError (원래 var 는 undefined 였다)
//
// 파일마다 「불러오는 순간 실행되는 코드」에서 출발해, 부르는 함수 안으로 따라 들어가며
// 아직 불러오지 않은 파일의 이름을 쓰는지 본다.
//   - 클릭 처리처럼 나중에 실행되는 함수(콜백) 안은 따라가지 않는다 — 그때는 모든 파일이 있다
//   - 즉시 실행 함수 (function(){...})() 와 forEach·map 같은 배열 콜백은 바로 실행되므로 따라간다
//   - setTimeout·requestAnimationFrame 콜백은 파일 사이에 끼어 실행될 수 있어 따로 알린다
//
// 사용: node tools/check-load-order.mjs
import { readFileSync } from 'node:fs';
import * as acorn from 'acorn';

const APP = new URL('../app/', import.meta.url);
const html = readFileSync(new URL('index.html', APP), 'utf8');
const files = [...html.matchAll(/<script src="(src\/[^"]+)"><\/script>/g)].map((m) => m[1]);

const ITER = new Set([
  'forEach',
  'map',
  'filter',
  'some',
  'every',
  'reduce',
  'reduceRight',
  'sort',
  'find',
  'findIndex',
  'flatMap',
  'call',
  'apply'
]);
const TIMER = new Set(['setTimeout', 'setInterval', 'requestAnimationFrame', 'queueMicrotask']);
const isFn = (n) =>
  n && /^(FunctionExpression|ArrowFunctionExpression|FunctionDeclaration)$/.test(n.type);
const isCall = (p) => p && (p.type === 'CallExpression' || p.type === 'NewExpression');
const iterArg = (p, n) =>
  isCall(p) &&
  p.arguments.includes(n) &&
  p.callee.type === 'MemberExpression' &&
  ITER.has(p.callee.property.name);

// node 안에서 지금 실행되며 쓰는 이름(use), 그중 부르는 함수(call), 타이머 콜백 안의 것(timer*)
function scan(node) {
  const r = { use: new Set(), call: new Set(), timerUse: new Set(), timerCall: new Set() };
  (function visit(n, timer, parent) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Identifier') {
      const p = parent;
      if (p && p.type === 'MemberExpression' && p.property === n && !p.computed) return; // a.이름
      if (p && p.type === 'Property' && p.key === n && !p.computed) return; // { 이름: … }
      if (p && p.type === 'UnaryExpression' && p.operator === 'typeof') return; // typeof 이름 — 없어도 안 깨진다
      if (p && p.type === 'AssignmentExpression' && p.left === n && p.operator === '=') return; // 이름 = … — 엄격 모드가 아니라 안 깨진다
      (timer ? r.timerUse : r.use).add(n.name);
      if (isCall(p) && (p.callee === n || iterArg(p, n)))
        (timer ? r.timerCall : r.call).add(n.name);
      return;
    }
    if (isFn(n) && parent) {
      const timerCb =
        isCall(parent) &&
        parent.arguments.includes(n) &&
        parent.callee.type === 'Identifier' &&
        TIMER.has(parent.callee.name);
      if (timerCb) {
        visit(n.body, true, n);
        return;
      }
      if (!(isCall(parent) && parent.callee === n) && !iterArg(parent, n)) return; // 나중에 실행되는 콜백
    }
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => visit(c, timer, n));
      else if (v && typeof v.type === 'string') visit(v, timer, n);
    }
  })(node, false, null);
  return r;
}

const nameFile = new Map(); // 최상위 함수·변수 이름 → 파일 번호
const fnScan = new Map();
const runs = []; // [파일 번호, 노드, 줄]
files.forEach((f, idx) => {
  const ast = acorn.parse(readFileSync(new URL(f, APP), 'utf8'), {
    ecmaVersion: 'latest',
    locations: true
  });
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration') {
      nameFile.set(st.id.name, idx);
      fnScan.set(st.id.name, st.body);
    } else if (st.type === 'VariableDeclaration') {
      st.declarations.forEach((d) => {
        // 앱은 var a = …, b = … 만 쓴다 (var [a, b] = … 같은 풀어 쓰기는 없다)
        if (d.id.type === 'Identifier' && !nameFile.has(d.id.name)) nameFile.set(d.id.name, idx);
        if (d.init) runs.push([idx, d.init, st.loc.start.line]);
      });
    } else runs.push([idx, st, st.loc.start.line]);
  }
});
for (const [k, body] of fnScan) fnScan.set(k, scan(body));

// 출발 코드에서 바로 실행되는 호출을 따라가며 쓰는 이름 전부. 타이머 안에서 닿는 것은 따로
function follow(start) {
  const use = new Set(start.use),
    timerUse = new Set(start.timerUse);
  const seen = new Set(),
    stack = [...start.call].map((n) => [n, false]);
  start.timerCall.forEach((n) => stack.push([n, true]));
  while (stack.length) {
    const [n, t] = stack.pop();
    if (seen.has(n + t) || !fnScan.has(n)) continue;
    seen.add(n + t);
    const s = fnScan.get(n);
    (t ? [...s.use, ...s.timerUse] : s.use).forEach((m) => (t ? timerUse : use).add(m));
    if (!t) s.timerUse.forEach((m) => timerUse.add(m));
    s.call.forEach((m) => stack.push([m, t]));
    s.timerCall.forEach((m) => stack.push([m, true]));
  }
  return { use, timerUse };
}

const bad = [],
  warn = [];
for (const [idx, node, line] of runs) {
  const r = follow(scan(node));
  const later = (n) => nameFile.has(n) && nameFile.get(n) > idx;
  for (const n of r.use)
    if (later(n)) bad.push(`${files[idx]}:${line}  →  ${n}  [${files[nameFile.get(n)]}]`);
  for (const n of r.timerUse)
    if (later(n) && !r.use.has(n))
      warn.push(`${files[idx]}:${line}  →  (타이머) ${n}  [${files[nameFile.get(n)]}]`);
}
if (bad.length) console.log('■ 불러오는 순간 아직 없는 이름을 쓴다\n' + bad.join('\n'));
if (warn.length)
  console.log(
    '\n□ 타이머 콜백이 아직 없을 수 있는 이름을 쓴다 (파일을 느리게 받는 경우)\n' + warn.join('\n')
  );
console.log(bad.length ? `\n${bad.length}건 — 고쳐야 한다` : '\n불러오는 순서 문제 없음 ✓');
process.exit(bad.length ? 1 : 0);
