# 코드 검사

`npm run lint` 하나로 아래가 차례로 돈다 (`package.json` 의 `lint`). PR 마다 CI(`.github/workflows/test.yml`)에서도 돈다.
커밋할 때는 바뀐 파일만 자동으로 검사한다 (husky + lint-staged, `.husky/pre-commit`).

| 무엇             | 도구               | 설정 파일                                            | 따로 돌리기                                 |
| ---------------- | ------------------ | ---------------------------------------------------- | ------------------------------------------- |
| 편집기 공통 설정 | EditorConfig       | `.editorconfig`                                      | (편집기가 저장할 때 적용)                   |
| 모양 (포매터)    | Prettier           | `.prettierrc.json`, `.prettierignore`                | `npm run format:check` / `npm run format`   |
| 실수 찾기 (린터) | ESLint             | `eslint.config.mjs`                                  | `npm run lint:js`                           |
| CSS              | Stylelint          | `.stylelintrc.json`                                  | `npm run lint:css`                          |
| HTML             | html-validate      | `.htmlvalidate.json`                                 | `npm run lint:html`                         |
| 영어 철자        | cspell             | `cspell.json`, `cspell-words.txt`                    | `npm run lint:spell`                        |
| 타입             | TypeScript (JSDoc) | `tsconfig.json`(개발 도구), `tsconfig.app.json`(앱)  | `npm run typecheck`                         |
| 비밀 값 유출     | gitleaks           | `.github/workflows/secrets.yml`, `.husky/pre-commit` | `gitleaks git .`                            |
| 불러오는 순서    | 자체 도구          | `tools/check-load-order.mjs`                         | `npm run check` (`npm test` 가 먼저 돌린다) |

## 기준선

오래된 코드의 문제는 도입 때 개수로 묶고, **늘면 실패, 줄면 낮춘다** ([결정 0004](../decisions/0004-lint-baselines.md)).
숫자의 원본은 아래 「어디서」 칸의 설정이다. 이 표와 다르면 설정이 맞다.

| 검사                | 기준선 | 2026-09-25 실제 | 어디서                                             |
| ------------------- | -----: | --------------: | -------------------------------------------------- |
| ESLint 경고         |      0 |               0 | `package.json` → `lint:js` 의 `--max-warnings 0`   |
| html-validate 경고  |      0 |               0 | `package.json` → `lint:html` 의 `--max-warnings 0` |
| Stylelint 경고      |     59 |      59 (09-27) | `package.json` → `lint:css` 의 `--max-warnings 59` |
| 앱 타입 오류        |      4 |       4 (09-26) | `tools/typecheck-app.mjs` 의 `BASELINE`            |
| 개발 도구 타입 오류 |      0 |               0 | `tsconfig.json` (`tsc` 가 실패하면 바로 실패)      |

- Stylelint 는 110 → 59 (2026-09-27, B-6). 「결과가 안 바뀌는 이동」만 했다 — 규칙을 옮길 때 건너뛰는 규칙들 중 **구체성이 같고 겹치는 속성을 쓰는 것이 하나도 없을 때만** 옮겼다 (구체성이 다르면 순서와 상관없이 구체성이 이긴다). 넓은 화면 비교(4개 너비 · 다크 · 12달 × 펼침 · 올리기 흐름, 106장)로 확인했다.
- 남은 59 개는 옮기면 사이의 같은 구체성 규칙과 겹치는 속성이 있어 결과가 바뀔 수 있는 것, 또는 옮기면 다른 경고가 생기는 것이다. 두 선택자가 실제로 한 요소에 같이 걸리는지 하나씩 확인해야 풀린다.
- 앱 타입 오류는 2026-09-26(B-6) 51 → 4. 바깥 라이브러리(SheetJS · PDF.js) 타입은 `types/app-libs.d.ts`(배포되지 않는다)에, 화면 요소 종류는 선언 자리에 JSDoc(`/** @type {HTMLInputElement} */ (…)`)으로 적었다. 남은 4개는 코드를 고쳐야 없어진다 — `createTreeWalker` 의 옛 넷째 인자 2 · `input.min` 에 숫자 1 · PDF 읽기 약속 모양 1.
- 일부러 꺼 둔 옛 기능(`18-charts-year.js` 의 `return;` 뒤 각주 등)은 경고 정리 때(2026-09-25) 지웠다 — git 기록에 남아 있다.

## 정한 것과 이유

- **HTML 은 포매터에서 뺐다.** HTML 은 공백이 화면에 영향을 준다. 검사(html-validate)만 한다.
- **CSS 의 최신 표기 규칙은 껐다.** `rgb(0 0 0 / 40%)`, `@media (width <= 520px)` 같은 표기로 바꾸면 오래된 아이폰 사파리에서 깨질 수 있다. `-webkit-` 접두어 제거 규칙도 껐다 (사파리에 필요). 빈 줄 규칙도 껐다 — 모양은 Prettier 가 맡는다.
- **맞춤법은 영어만.** 한글은 건너뛴다. 한국어 맞춤법 검사기는 대부분 외부 서버로 글을 보내는 방식이라 쓰지 않는다 ([결정 0001](../decisions/0001-no-server.md) 과 같은 뜻). `cspell-words.txt` 는 앱의 줄임말 이름(`adjbox`, `ckcard` …)으로 시작한 프로젝트 사전이다.
- **앱의 전역 이름.** `eslint.config.mjs` 가 `app/src` 모든 파일의 최상위 이름을 읽어 「공용 전역」으로 알려준다. 다른 파일의 함수는 정상, 어디에도 없는 이름(오타)만 잡힌다.
- **포매터 적용 커밋은 blame 에서 건너뛴다** (`.git-blame-ignore-revs`). 로컬에서도: `git config blame.ignoreRevsFile .git-blame-ignore-revs`
- **OMC 가 관리하는 `.claude/CLAUDE.md` 는 Prettier · cspell 에서 뺐다** (`.prettierignore`, `cspell.json` 의 `ignorePaths`). OMC 설정 도구가 통째로 다시 쓰는 파일이다. `.omc/` 실행 상태는 `.gitignore` 라서 Prettier 가 보지 않는다.

## 검사에 걸리면

| 상황                             | 할 일                                               |
| -------------------------------- | --------------------------------------------------- |
| 모양                             | `npm run format`                                    |
| 철자 — 진짜 오타                 | 고친다                                              |
| 철자 — 일부러 만든 이름          | `cspell-words.txt` 에 한 줄 추가                    |
| 기준선 초과                      | 새로 만든 문제를 고친다. **기준선을 올리지 않는다** |
| 기준선보다 줄었다                | 설정의 숫자를 줄어든 수로 낮추고 위 표도 고친다     |
| 급해서 커밋 전 검사를 건너뛰어야 | `git commit --no-verify` (CI 에서 다시 검사한다)    |

## 코드와 함께 고칠 것

- `package.json` 의 `lint:*` 명령이나 도구를 바꾸면 → 이 문서의 두 표, [README](../../README.md#주요-명령).
- 기준선이 바뀌면 → 위 「기준선」 표.
- 새 전역 이름을 만들면 ESLint 는 알아서 알지만, 새 파일을 만들면 `index.html` 순서 · [architecture](../architecture/overview.md) 표도 고친다.

## 알려진 한계

- ~~앱 타입 검사가 `tsc` 를 실행하지 못해도 통과한다~~ — 고침 (2026-09-27, [backlog](../backlog.md) Q-1). 이제 tsc 가 실패했는데 타입 오류 줄이 없으면 검사 실패다.
- 커밋 전 검사의 gitleaks 는 설치된 기기에서만 돈다.
