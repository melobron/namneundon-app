# 리팩토링 B-1h — 결과 화면 · 그래프 계산을 core 로 — 할 일

- 명세: [spec.md](spec.md) · 계획: [plan.md](plan.md)
- 상태 표시: `대기` · `진행` · `완료` · `막힘(이유)` · `취소(이유)`

## 할 일

| #   | 할 일                                 | 먼저 끝나야 할 것 | 결과물                       | 확인 방법                         | 상태 |
| --- | ------------------------------------- | ----------------- | ---------------------------- | --------------------------------- | ---- |
| T1  | 분석 도구가 화면 요소 매개변수를 잡게 | —                 | `tools/analyze-purity.mjs`   | `--why moneyLive` · `drawDueAsk2` | 완료 |
| T2  | 순수 계산을 core 로 옮기기            | T1                | `app/src/core/result.js`     | `npm run check` · `npm run lint`  | 완료 |
| T3  | Node = 브라우저 교차 시험 · 단위 시험 | T2                | `tests/core/result.spec.mjs` | `npx playwright test tests/core`  | 완료 |
| T4  | 문서 맞추기                           | T2                | architecture · backlog       | 읽어 보기                         | 완료 |
| T5  | 전체 검사 · 화면 픽셀 비교            | T1–T4             | 아래 기록                    | `npm test` · 픽셀 비교            | 완료 |

## 검증 기록

| 날짜       | 누가        | 무엇을 (명령 · 화면)                                                 | 결과                                                                                                     |
| ---------- | ----------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 2026-09-26 | Claude Code | `node tools/analyze-purity.mjs --up --why moneyLive` · `drawDueAsk2` | 「화면 요소를 다룬다 (.setSelectionRange)」 · 「(.querySelectorAll)」 — core 9개 파일은 여전히 전부 순수 |
| 2026-09-26 | Claude Code | `npm run check`                                                      | 불러오는 순서 문제 없음 · core 규칙 지킴 (9개 파일, 이름 358개)                                          |
| 2026-09-26 | Claude Code | `npm run lint`                                                       | 통과 (기준선 그대로)                                                                                     |
| 2026-09-26 | Claude Code | `npm test`                                                           | 62 통과 (스냅샷 그대로, 새 `tests/core/result.spec.mjs` 6개 포함)                                        |
| 2026-09-26 | Claude Code | 화면 픽셀 비교 (origin/main `bbf117f` 대 이 가지, 12개 화면)         | 12/12 동일                                                                                               |

## 구현 중 정한 작은 것

- `whyOpen` · `whyKey` 는 계산이 아니라 펼침 상태라 앱에 남겼다.
- `checksLeft` 는 앱에서 부르는 곳이 없다 (옮기기 전에도 그랬다). 연결 함수를 그대로 두고, 지우는 것은 이번 범위 밖으로 남긴다.

## 남은 문제

- `checksLeft` 는 쓰이지 않는 함수다 — 지울지는 따로 정한다.
