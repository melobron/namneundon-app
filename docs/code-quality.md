# 코드 규칙 검사

`npm run lint` 하나로 전부 돈다. PR 마다 CI 에서도 돈다.
커밋할 때는 바뀐 파일만 자동으로 검사한다 (husky + lint-staged).

| 무엇               | 도구                | 설정 파일                                            | 따로 돌리기               |
| ------------------ | ------------------- | ---------------------------------------------------- | ------------------------- |
| 편집기 공통 설정   | EditorConfig        | `.editorconfig`                                      | (편집기가 저장할 때 적용) |
| 모양 정리 (포매터) | Prettier            | `.prettierrc.json`, `.prettierignore`                | `npm run format`          |
| 실수 찾기 (린터)   | ESLint              | `eslint.config.mjs`                                  | `npm run lint:js`         |
| CSS                | Stylelint           | `.stylelintrc.json`                                  | `npm run lint:css`        |
| HTML               | html-validate       | `.htmlvalidate.json`                                 | `npm run lint:html`       |
| 영어 철자          | cspell              | `cspell.json`, `cspell-words.txt`                    | `npm run lint:spell`      |
| 타입               | TypeScript (JSDoc)  | `tsconfig.json`, `tsconfig.app.json`                 | `npm run typecheck`       |
| 비밀 값 유출       | gitleaks            | `.github/workflows/secrets.yml`                      | `gitleaks git .`          |
| 커밋 전 검사       | husky + lint-staged | `.husky/pre-commit`, `package.json` 의 `lint-staged` | (커밋할 때)               |

## 「기준선」 — 늘지만 않게

오래된 코드에 검사기를 들이면 이미 있는 문제가 많다. 한꺼번에 고치면 동작이 바뀔 수 있어서,
**도입 때의 개수를 기준선으로 묶고, 새로 늘면 실패**하게 했다. 고쳐서 줄면 기준선도 낮춘다.

| 검사                | 기준선 (2026-09-25) | 어디서 바꾸나                                |
| ------------------- | ------------------: | -------------------------------------------- |
| ESLint 경고         |      ~~51~~ → **0** | 2026-09-25 모두 정리. 규칙도 오류로 되돌렸다 |
| Stylelint 경고      |                 110 | `package.json` → `lint:css`                  |
| html-validate 경고  |      ~~12~~ → **0** | 2026-09-25 모두 정리                         |
| 앱 타입 오류        |     ~~52~~ → **51** | `tools/typecheck-app.mjs` 의 `BASELINE`      |
| 개발 도구 타입 오류 |                   0 | —                                            |

남은 기준선은 **CSS 선택자 순서**(Stylelint)와 **앱 타입**이다. 순서를 바꾸면 화면이 달라질 수 있어 리팩토링 때 정리한다.
일부러 꺼 둔 옛 기능(`18-charts-year.js` 의 `return;` 뒤 각주 등)은 2026-09-25 에 지웠다 — git 기록에 남아 있다.

## 정한 것과 이유

- **HTML 은 포매터에서 뺐다.** HTML 은 공백이 화면에 영향을 준다. 검사(html-validate)만 한다.
- **CSS 의 최신 문법 규칙은 껐다.** `rgb(0 0 0 / 40%)`, `@media (width <= 520px)` 같은 표기로 바꾸면
  오래된 아이폰 사파리에서 깨질 수 있다. `-webkit-` 접두어 제거 규칙도 껐다 (사파리에 필요).
- **CSS 빈 줄 규칙은 껐다.** 모양은 Prettier 가 맡는다.
- **맞춤법은 영어만.** 한글은 건너뛴다. 한국어 맞춤법 검사기는 대부분 외부 서버로 글을 보내는 방식이라
  쓰지 않는다. `cspell-words.txt` 는 앱의 줄임말 이름(`adjbox`, `ckcard` …)으로 시작한 프로젝트 사전이다.
- **앱의 전역 이름.** `app/src` 는 19개 파일이 전역을 나눠 쓴다. `eslint.config.mjs` 가 모든 파일의
  최상위 이름을 읽어 「공용 전역」으로 알려준다 — 다른 파일의 함수는 정상, 어디에도 없는 이름(오타)만 잡힌다.
- **포매터 적용 커밋은 blame 에서 건너뛴다** (`.git-blame-ignore-revs`).
  로컬에서도: `git config blame.ignoreRevsFile .git-blame-ignore-revs`

## 검사에 걸리면

| 상황                             | 할 일                                            |
| -------------------------------- | ------------------------------------------------ |
| 모양                             | `npm run format`                                 |
| 철자 — 진짜 오타                 | 고친다                                           |
| 철자 — 일부러 만든 이름          | `cspell-words.txt` 에 한 줄 추가                 |
| 기준선 초과                      | 새로 만든 문제를 고친다. 기준선을 올리지 않는다  |
| 급해서 커밋 전 검사를 건너뛰어야 | `git commit --no-verify` (CI 에서 다시 검사한다) |

## 도입하며 찾은 것

- `14-compute.js` 의 `monthNumbers(m, cutDay)` 가 날짜를 잘라 계산할 때 월말 잔액만 그 달 전체로 잡았다
  (타입 검사가 「`monthCloseBalance` 에 인자를 하나 더 넘긴다」로 찾았다). 검산식이 수천만 원 어긋났지만,
  잘라 계산하는 자리(「지난달 같은 기간」)가 월말 잔액을 안 써서 화면에는 드러나지 않았다.
  2026-09-25 고쳤고 `tests/ledger.spec.mjs` 가 지킨다.
