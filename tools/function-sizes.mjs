// @ts-nocheck — 구문 트리 노드를 다룬다
// 앱 파일의 최상위 함수를 길이순으로 — 화면 코드 정리(B-4)에서 무엇이 큰지 본다.
// 사용: node tools/function-sizes.mjs [개수=20]
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import { readFileSync, readdirSync } from 'node:fs';
const dir = fileURLToPath(new URL('../app/src/', import.meta.url));
const out = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
  const src = readFileSync(dir + f, 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 2022, locations: true });
  for (const n of ast.body)
    if (n.type === 'FunctionDeclaration')
      out.push([n.loc.end.line - n.loc.start.line + 1, f, n.id.name, n.loc.start.line]);
}
out.sort((a, b) => b[0] - a[0]);
out.slice(0, +(process.argv[2] || 20)).forEach((x) => console.log(x.join('\t')));
