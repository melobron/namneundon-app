// @ts-nocheck — postcss · 선택자 분석 노드를 다룬다
// 사용: node tools/css-safe-reorder.mjs [css 파일=app/css/app.css] [--apply]
// stylelint 경고(no-descending-specificity · no-duplicate-selectors)를 「결과가 안 바뀌는 이동」으로만 푼다.
// 안전 조건: 옮기는 규칙 X 가 건너뛰는 규칙들 중 X 와 구체성이 같고 같은(겹치는) 속성을 쓰는 것이 없어야 한다.
//   구체성이 다르면 순서와 상관없이 구체성이 이긴다. 같으면 순서가 이기므로 건너뛰면 안 된다.
// postcss 등은 stylelint 가 쓰는 것을 그대로 빌린다 (package.json 에 새 의존성을 더하지 않는다)
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import stylelint from 'stylelint';
const fromStylelint = createRequire(
  createRequire(import.meta.url).resolve('stylelint/package.json')
);
const postcss = fromStylelint('postcss');
const parser = fromStylelint('postcss-selector-parser');
const { selectorSpecificity } = await import(
  fromStylelint.resolve('@csstools/selector-specificity')
);
import { readFileSync, writeFileSync } from 'node:fs';
const [file = 'app/css/app.css'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const apply = process.argv.includes('--apply');
const cwd = fileURLToPath(new URL('..', import.meta.url));

const specOf = (sel) => {
  let r = null;
  parser((root) => {
    root.each((s) => {
      const x = selectorSpecificity(s);
      r = [x.a, x.b, x.c];
    });
  }).processSync(sel);
  return r;
};
const sameSpec = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const SPECIAL = {
  font: ['line-height', 'font-'],
  inset: ['top', 'left', 'right', 'bottom'],
  'place-items': ['align-items', 'justify-items'],
  'place-content': ['align-content', 'justify-content'],
  'place-self': ['align-self', 'justify-self'],
  gap: ['row-gap', 'column-gap'],
  all: ['']
};
function overlap(p, q) {
  if (p === q) return true;
  const a = p.split('-')[0],
    b = q.split('-')[0];
  if (a === b && !a.startsWith('--')) return true;
  for (const [sh, ls] of Object.entries(SPECIAL))
    for (const [x, y] of [
      [p, q],
      [q, p]
    ])
      if (x === sh && ls.some((l) => y.startsWith(l))) return true;
  return false;
}
const propsOf = (rule) => {
  const s = [];
  rule.walkDecls((d) => s.push(d.prop.toLowerCase()));
  return s;
};
const selectorSpecsOf = (rule) => rule.selectors.map((s) => specOf(s));
function rulesIn(node) {
  const out = [];
  if (node.type === 'rule') out.push(node);
  else if (node.nodes)
    node.walkRules((r) => {
      out.push(r);
    });
  return out;
}
// X 가 between 노드들을 건너뛰어도 되나
function safeSkip(X, between) {
  const xs = selectorSpecsOf(X),
    xp = propsOf(X);
  for (const n of between)
    for (const S of rulesIn(n)) {
      if (S === X) continue;
      const ss = selectorSpecsOf(S),
        sp = propsOf(S);
      if (!xs.some((a) => ss.some((b) => sameSpec(a, b)))) continue;
      if (xp.some((p) => sp.some((q) => overlap(p, q))))
        return { ok: false, why: S.selector.slice(0, 60) + ' @' + S.source.start.line };
    }
  return { ok: true };
}
// 규칙 앞에 붙은 주석(설명)은 함께 옮긴다
function withComments(node) {
  const out = [node];
  let p = node.prev();
  while (p && p.type === 'comment') {
    out.unshift(p);
    p = p.prev();
  }
  return out;
}
// 선택자 목록이 여러 줄이면 경고는 둘째 줄 이후를 가리킬 수 있다
function ruleAt(root, line) {
  let hit = null;
  root.walkRules((r) => {
    const s0 = r.source.start.line,
      n = (r.raws.selector ? r.raws.selector.raw : r.selector).split('\n').length;
    if (!hit && s0 <= line && line < s0 + n) hit = r;
  });
  return hit;
}
async function lint(code) {
  const r = await stylelint.lint({ code, codeFilename: cwd + '/app/css/app.css', cwd });
  return r.results[0].warnings.filter(
    (w) => w.rule === 'no-descending-specificity' || w.rule === 'no-duplicate-selectors'
  );
}

let code = readFileSync(file, 'utf8');
let warns = await lint(code);
const start = warns.length;
const tried = new Set();
let moved = 0,
  skipped = [];
for (let iter = 0; iter < 400; iter++) {
  const w = warns.find((x) => !tried.has(x.text + '@' + x.line));
  if (!w) break;
  tried.add(w.text + '@' + w.line);
  const root = postcss.parse(code);
  const A = ruleAt(root, w.line);
  const m = w.text.match(/at line (\d+)/) || w.text.match(/first used at line (\d+)/);
  const B = m && ruleAt(root, +m[1]);
  if (!A || !B) {
    skipped.push(['못 찾음', w.line, w.text.slice(0, 90)]);
    continue;
  }
  if (A.parent !== B.parent) {
    skipped.push(['부모 다름', w.line, w.text.slice(0, 90)]);
    continue;
  }
  const sib = A.parent.nodes,
    ia = sib.indexOf(A),
    ib = sib.indexOf(B);
  if (ib >= ia) {
    skipped.push(['순서 이상', w.line, w.text.slice(0, 90)]);
    continue;
  }
  const dup = w.rule === 'no-duplicate-selectors';
  let plan;
  // 1) A 를 위로 (desc: B 바로 앞 / dup: B 바로 뒤에 합침)
  const upBetween = sib.slice(dup ? ib + 1 : ib, ia).filter((n) => !withComments(A).includes(n));
  const up = safeSkip(A, upBetween);
  if (up.ok) plan = 'up';
  else {
    // 2) B 를 아래로 (desc: A 바로 뒤 / dup: A 바로 앞에 합침)
    const downBetween = sib.slice(ib + 1, dup ? ia : ia + 1).filter((n) => n !== B);
    const down = safeSkip(B, downBetween);
    if (down.ok) plan = 'down';
    else {
      skipped.push([
        '위험',
        w.line,
        w.text.slice(0, 80) + ' | 위로: ' + up.why + ' | 아래로: ' + down.why
      ]);
      continue;
    }
  }
  const pack = (n) => withComments(n);
  if (plan === 'up') {
    const g = pack(A);
    g.forEach((n) => n.remove());
    if (dup) {
      A.each((d) => {
        B.append(d.clone());
      });
      g.filter((n) => n !== A).forEach((c) => B.before(c));
    } else g.forEach((n) => B.before(n));
  } else {
    const g = pack(B);
    g.forEach((n) => n.remove());
    if (dup) {
      const decls = [];
      B.each((d) => decls.push(d.clone()));
      A.prepend(...decls);
      g.filter((n) => n !== B).forEach((c) => A.before(c));
    } else {
      let at = A;
      g.forEach((n) => {
        at.after(n);
        at = n;
      });
    }
  }
  // 합친 블록에 같은 속성이 두 번이면: 값도 같으면 앞의 것을 지운다(뒤의 것이 어차피 이긴다).
  // 값이 다르면 합치지 않는다 — 옛 브라우저용 대체 값(display: -webkit-box; display: flex)일 수 있다
  if (dup) {
    const merged = plan === 'up' ? B : A;
    const seen = new Map();
    let clash = null;
    merged.each((d) => {
      if (d.type !== 'decl') return;
      const k = d.prop.toLowerCase();
      if (seen.has(k)) {
        const prev = seen.get(k);
        if (prev.value === d.value && prev.important === d.important) prev.remove();
        else clash = k;
      }
      seen.set(k, d);
    });
    if (clash) {
      skipped.push(['값이 다른 같은 속성', w.line, clash]);
      continue;
    }
  }
  const next = root.toString();
  const nw = await lint(next);
  if (nw.length >= warns.length) {
    skipped.push(['늘어남', w.line, w.text.slice(0, 90)]);
    continue;
  }
  code = next;
  warns = nw;
  moved++;
}
console.log(`경고 ${start} → ${warns.length} (옮김 ${moved})`);
skipped.forEach((s) => console.log('  건너뜀', s.join(' · ')));
if (apply) writeFileSync(file, code);
