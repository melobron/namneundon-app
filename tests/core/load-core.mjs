// app/src/core/ 를 화면 없이 Node 에서 불러온다.
//
// 브라우저와 똑같은 파일을, index.html 에 적힌 순서대로, 한 전역 공간(vm)에 차례로 올린다.
// 그래서 core 의 함수는 브라우저에서처럼 서로를 이름으로 부른다. 돌려받은 객체에 함수가 다 있다.
//   const core = loadCore();  core.orderAndVerify(rows)
// 테스트와 테스트베드 VDI(화면 없는 계산)에서 쓴다.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as acorn from 'acorn';

const APP = new URL('../../app/', import.meta.url);

export function coreFiles() {
  const html = readFileSync(new URL('index.html', APP), 'utf8');
  return [...html.matchAll(/<script src="(src\/core\/[^"]+)"><\/script>/g)].map((m) => m[1]);
}

// opts.xlsx: 엑셀 도구(app/xlsx.full.min.js — 브라우저가 쓰는 바로 그 파일)를 함께 올린다
export function loadCore(opts = {}) {
  const ctx = vm.createContext({});
  if (opts.xlsx)
    vm.runInContext(readFileSync(new URL('xlsx.full.min.js', APP), 'utf8'), ctx, {
      filename: 'xlsx.full.min.js'
    });
  for (const f of coreFiles())
    vm.runInContext(readFileSync(new URL(f, APP), 'utf8'), ctx, { filename: f });
  return ctx;
}

// 예시 거래 2,363건을 앱과 같은 모양의 행으로 — 앱의 demoRows() 와 같은 코드를 그대로 가져와 돌린다.
// (예시 자료 파일에는 화면 코드도 섞여 있어, 필요한 선언만 골라 올린다)
export function withDemo(ctx) {
  const pick = (file, names) => {
    const src = readFileSync(new URL(file, APP), 'utf8');
    for (const st of acorn.parse(src, { ecmaVersion: 'latest' }).body) {
      const name =
        st.type === 'FunctionDeclaration'
          ? st.id.name
          : st.type === 'VariableDeclaration' &&
              st.declarations.length === 1 &&
              st.declarations[0].id.type === 'Identifier'
            ? st.declarations[0].id.name
            : null;
      if (names.includes(name)) vm.runInContext(src.slice(st.start, st.end), ctx);
    }
  };
  pick('src/01-biz-demo.js', ['DEMO_YEAR', 'DEMO_OPEN', 'DEMO_TX']);
  pick('src/10-demo-read-files.js', ['demoRows']);
  return ctx;
}
