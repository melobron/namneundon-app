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
// core/ 같은 하위 폴더까지 읽는다
for (const f of readdirSync(SRC, { recursive: true }).filter((f) => String(f).endsWith('.js'))) {
  const ast = acorn.parse(readFileSync(new URL(String(f), SRC), 'utf8'), { ecmaVersion: 'latest' });
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration') appGlobals[st.id.name] = 'writable';
    if (st.type === 'VariableDeclaration')
      st.declarations.forEach(
        (d) => d.id.type === 'Identifier' && (appGlobals[d.id.name] = 'writable')
      );
  }
}

export default [
  {
    ignores: [
      '**/*.min.js',
      'node_modules/',
      '.venv/',
      'test-results/',
      'google-drive/',
      'landing/'
    ]
  },
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
    // 저장소(localStorage)는 00-storage.js 에서만 만진다 — 나중에 서버 동기화로 바꿀 자리가 한 곳이어야 한다
    files: ['app/src/**/*.js'],
    ignores: ['app/src/00-storage.js'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            '저장소는 00-storage.js 의 함수(lsGet·lsSet·lsDel·lsKeys·lsReadJSON·lsRemove)로만 쓴다'
        },
        {
          name: 'sessionStorage',
          message: '이 앱은 sessionStorage 를 쓰지 않는다. 저장은 00-storage.js 로'
        }
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'localStorage',
          message: '저장소는 00-storage.js 의 함수로만 쓴다'
        }
      ]
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
    // 브라우저 안에서 도는 코드(page.evaluate)가 앱 전역을 쓴다 — 화면 비교 도구도 같다
    files: ['tests/**/*.mjs', 'tools/compare-screens.mjs'],
    languageOptions: {
      globals: { ...globals.browser, ...appGlobals, XLSX: 'readonly' }
    }
  }
];
