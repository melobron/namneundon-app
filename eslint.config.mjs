// 린터(ESLint) 설정 — 실수를 찾는다. 모양은 Prettier 가 맡는다.
//
// app/src 는 아직 모듈이 아니다. 19개 파일이 전역 이름을 나눠 쓴다 (한 <script> 였던 것을 나눈 것).
// 그래서 모든 파일의 최상위 function·var 이름을 읽어 「공용 전역」으로 알려준다.
// 이렇게 하면 다른 파일의 함수는 정상으로 보고, 어디에도 없는 이름(오타)만 잡힌다.
import { readFileSync, readdirSync } from 'node:fs';
import js from '@eslint/js';
import globals from 'globals';
import * as acorn from 'acorn';

const SRC = new URL('./app/src/', import.meta.url);
const appGlobals = {};
for (const f of readdirSync(SRC).filter((f) => f.endsWith('.js'))) {
  const ast = acorn.parse(readFileSync(new URL(f, SRC), 'utf8'), { ecmaVersion: 'latest' });
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration') appGlobals[st.id.name] = 'writable';
    if (st.type === 'VariableDeclaration')
      st.declarations.forEach(
        (d) => d.id.type === 'Identifier' && (appGlobals[d.id.name] = 'writable')
      );
  }
}

export default [
  { ignores: ['**/*.min.js', 'node_modules/', 'test-results/', 'google-drive/', 'landing/'] },
  js.configs.recommended,

  // 앱 — 브라우저에서 도는 일반 <script>
  {
    files: ['app/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...appGlobals,
        XLSX: 'readonly', // xlsx.full.min.js 가 만든다
        pdfjsLib: 'readonly' // pdf.min.js 가 만든다
      }
    },
    rules: {
      // 최상위 이름은 다른 파일이 쓴다. 파일 하나만 보고 「안 쓴다」고 하면 오판이다
      'no-unused-vars': ['error', { vars: 'local', args: 'none', caughtErrors: 'none' }],
      // 공용 전역으로 알려준 이름을 그 파일에서 선언하는 것은 정상이다
      'no-redeclare': ['error', { builtinGlobals: false }],
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
  {
    files: ['app/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } }
  },

  // 개발 도구 — Node 에서 도는 모듈
  {
    files: ['tests/**/*.mjs', 'tools/**/*.mjs', '*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node }
    }
  },
  {
    // page.evaluate 안의 코드는 브라우저(앱)에서 돈다
    files: ['tests/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.browser, ...appGlobals, XLSX: 'readonly' }
    }
  }
];
