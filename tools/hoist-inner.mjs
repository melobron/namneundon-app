// @ts-nocheck — 구문 트리 · 변수 범위 노드를 다룬다
// 사용: node tools/hoist-inner.mjs <파일> <바깥 함수> [--apply] [--only 이름,이름]
// 큰 함수 안의 함수 선언(바로 아래 것)을 파일 최상위로 꺼낸다. 바깥 지역 변수는 매개변수로 넘긴다 (부를 때 읽으므로 같은 값).
// 건너뛰는 것: 바깥 변수에 대입 · 자기 this/arguments · 아직 안쪽에 있는 다른 함수를 부름 · 이름 충돌 · 부르는 자리에서 이름이 가려짐
// 구문 분석 · 변수 범위 분석은 eslint 가 쓰는 것을 그대로 빌린다 (package.json 에 새 의존성을 더하지 않는다)
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const fromEslint = createRequire(createRequire(import.meta.url).resolve('eslint/package.json'));
const espree = fromEslint('espree');
const eslintScope = fromEslint('eslint-scope');
const estraverse = fromEslint('estraverse');
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const args = process.argv.slice(2);
const [file, outerName] = args.filter((a) => !a.startsWith('--') && !a.includes(','));
const apply = args.includes('--apply');
const oi = args.indexOf('--only');
const only = oi >= 0 ? new Set(args[oi + 1].split(',')) : null;
const APP = fileURLToPath(new URL('../app/src/', import.meta.url));
const WIN = new Set([
  'open',
  'close',
  'name',
  'status',
  'print',
  'find',
  'stop',
  'focus',
  'blur',
  'scroll',
  'top',
  'parent',
  'self',
  'length',
  'event',
  'origin',
  'history',
  'location',
  'screen',
  'alert',
  'confirm',
  'prompt',
  'fetch',
  'frames',
  'opener',
  'closed'
]);
const parse = (src) =>
  espree.parse(src, {
    ecmaVersion: 2022,
    sourceType: 'script',
    range: true,
    loc: true,
    comment: true
  });
// 앱 전체에서 선언된 이름 (어느 범위든) — 새 전역 이름이 겹치면 안 된다
function allDeclared() {
  const names = new Map();
  const files = [
    ...readdirSync(APP)
      .filter((f) => f.endsWith('.js'))
      .map((f) => APP + f),
    ...readdirSync(APP + 'core').map((f) => APP + 'core/' + f)
  ];
  for (const f of files) {
    const ast = parse(readFileSync(f, 'utf8'));
    const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' });
    for (const sc of sm.scopes)
      for (const v of sc.variables) names.set(v.name, (names.get(v.name) || 0) + v.defs.length);
  }
  return names;
}
function setParents(ast) {
  estraverse.traverse(ast, {
    enter(n, p) {
      n.__parent = p;
    },
    fallback: 'iteration'
  });
}
function resolveFrom(scope, name) {
  for (let s = scope; s; s = s.upper) {
    const v = s.set.get(name);
    if (v) return v;
  }
  return null;
}
function leadingComments(src, start) {
  let i = start;
  for (;;) {
    let j = i;
    while (j > 0 && /[ \t\n]/.test(src[j - 1])) j--;
    if (src.slice(j - 2, j) === '*/') {
      const k = src.lastIndexOf('/*', j - 2);
      i = k;
      continue;
    }
    return {
      from: i === start ? start : i,
      lineStart: src.lastIndexOf('\n', (i === start ? start : i) - 1) + 1
    };
  }
}

let src = readFileSync(file, 'utf8');
const declared = allDeclared();
const report = [];
let moved = 0;
for (let pass = 0; pass < 40; pass++) {
  const ast = parse(src);
  setParents(ast);
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' });
  const outer = ast.body.find((n) => n.type === 'FunctionDeclaration' && n.id.name === outerName);
  const outerScope = sm.acquire(outer);
  let did = false;
  for (const f of outer.body.body.filter((n) => n.type === 'FunctionDeclaration')) {
    const nm = f.id.name;
    if (only && !only.has(nm)) continue;
    const innerScope = sm.acquire(f);
    const why = (w) => {
      if (pass === 0 || !report.some((r) => r[0] === nm)) report.push([nm, w]);
    };
    // 자기 this · arguments
    let selfThis = false;
    estraverse.traverse(f.body, {
      enter(n) {
        if (n.type === 'FunctionExpression' || n.type === 'FunctionDeclaration')
          return estraverse.VisitorOption.Skip;
        if (n.type === 'ThisExpression' || (n.type === 'Identifier' && n.name === 'arguments'))
          selfThis = true;
      },
      fallback: 'iteration'
    });
    if (selfThis) {
      why('this/arguments 사용');
      continue;
    }
    // 잡은 바깥 변수
    const caps = new Map();
    let bad = null;
    for (const ref of innerScope.through) {
      const v = ref.resolved;
      if (!v) continue;
      if (v.scope !== outerScope) {
        if (v.scope.type !== 'global') bad = '바깥 블록 변수 ' + v.name;
        continue;
      }
      if (v.name === nm) continue;
      if (v.defs.some((d) => d.type === 'FunctionName')) {
        bad = '안쪽 함수 ' + v.name + ' 를 부름 (먼저 꺼내야)';
        break;
      }
      if (v.name === 'arguments') {
        bad = '바깥 arguments';
        break;
      }
      if (ref.isWrite()) {
        bad = '바깥 변수 ' + v.name + ' 에 대입';
        break;
      }
      caps.set(v.name, v);
    }
    if (bad) {
      why(bad);
      continue;
    }
    if ((declared.get(nm) || 0) > 1 || WIN.has(nm)) {
      why('이름 충돌 (' + nm + ')');
      continue;
    }
    const capNames = [...caps.keys()];
    // 부르는 자리 — 거기서 잡은 이름들이 바깥 변수를 그대로 가리켜야 한다
    const fv = outerScope.set.get(nm);
    let shadow = null;
    for (const r of fv.references) {
      const sc = r.from;
      for (const c of capNames) {
        const v = resolveFrom(sc, c);
        if (
          v !== caps.get(c) &&
          !(r.identifier.range[0] >= f.range[0] && r.identifier.range[1] <= f.range[1])
        )
          shadow = c + ' @' + r.identifier.loc.start.line;
      }
    }
    if (shadow) {
      why('부르는 자리에서 이름이 가려짐 ' + shadow);
      continue;
    }
    // 적용: 편집 목록
    const edits = [];
    const lc = leadingComments(src, f.range[0]);
    const cutFrom = lc.lineStart,
      cutTo = src.indexOf('\n', f.range[1]) + 1;
    let text = src.slice(lc.from, f.range[1]);
    // 매개변수 앞에 잡은 이름들
    if (capNames.length) {
      const rel = f.range[0] - lc.from;
      const lp = text.indexOf('(', rel + ('function ' + nm).length);
      const hasParams = f.params.length > 0;
      text =
        text.slice(0, lp + 1) + capNames.join(', ') + (hasParams ? ', ' : '') + text.slice(lp + 1);
    }
    // 들여쓰기 한 단계 빼기 (Prettier 가 다시 맞춘다)
    const moved_ = '\n' + text + '\n';
    for (const r of fv.references) {
      const id = r.identifier;
      const p = id.__parent;
      if (p && p.type === 'CallExpression' && p.callee === id) {
        if (!capNames.length) continue;
        const lp = src.indexOf('(', id.range[1]);
        edits.push([lp + 1, lp + 1, capNames.join(', ') + (p.arguments.length ? ', ' : '')]);
      } else {
        if (!capNames.length) continue;
        edits.push([
          id.range[0],
          id.range[1],
          'function () { return ' +
            nm +
            '.apply(null, [' +
            capNames.join(', ') +
            '].concat([].slice.call(arguments))); }'
        ]);
      }
    }
    // 안쪽 함수 안의 자기 호출도 위 edits 에 들어간다 — 잘라낼 범위 안이면 text 쪽에 반영해야 한다
    const inside = edits.filter((e) => e[0] >= f.range[0] && e[1] <= f.range[1]);
    if (inside.length) {
      why('자기 자신을 부름 (손으로)');
      continue;
    }
    edits.push([cutFrom, cutTo, '']);
    edits.push([outer.range[1], outer.range[1], moved_]);
    edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    for (const [a, b, t] of edits) src = src.slice(0, a) + t + src.slice(b);
    declared.set(nm, 1);
    report.push([nm, '꺼냄 (잡은 변수: ' + (capNames.join(', ') || '없음') + ')']);
    moved++;
    did = true;
    break;
  }
  if (!did) break;
}
const done = new Set(report.filter((r) => r[1].startsWith('꺼냄')).map((r) => r[0]));
for (const [n, w] of report)
  if (w.startsWith('꺼냄') || !done.has(n))
    console.log((w.startsWith('꺼냄') ? '✓ ' : '· ') + n + ' — ' + w);
console.log('꺼낸 함수 ' + moved);
if (apply) writeFileSync(file, src);
