# 리팩토링 B-1h — 결과 화면 · 그래프 계산을 core 로 — 계획

| 항목      | 값                                                 |
| --------- | -------------------------------------------------- |
| 상태      | Completed — PR #28 머지 · 배포 확인 (2026-09-26)   |
| 명세      | [spec.md](spec.md)                                 |
| 조사 기준 | 브랜치 `main` · 커밋 `bbf117f` · 날짜 `2026-09-26` |
| 작성      | Claude Code                                        |

## 현재 구조와 제약

- `npm run purity -- --up --list` 에서 순수로 나온 것: `15` 19 · `17` 5 · `18` 17. 이 가운데 `drawDueAsk2(days)`(`days.querySelectorAll`)와 `moneyLive(inp)`(`inp.addEventListener`)는 매개변수로 받은 화면 요소를 다룬다 — 도구가 전역 이름만 보고 있어서 놓쳤다.
- AGENTS.md 제약: 서버로 보내지 않음(닿지 않음) · 빌드 없음 · 저장 형식(닿지 않음) · 스크립트 순서(`core/result.js` 를 core 끝, 앱 코드 앞에 한 줄) · 기준선(그대로).

## 제안 설계

B-1e~g 와 같다. `UP` 를 읽는 함수 `f` 는 core 에 `fIn(U, …)`, 앱에는 연결 함수. 캐시 · 저장소를 부르는 함수가 없어 창구(E)는 필요 없다.
분석 도구: 화면 요소 메서드 호출(`addEventListener` · `querySelector*` · `appendChild` · `setSelectionRange` 등)과 화면 속성 쓰기(`innerHTML` · `textContent` · `className` · `classList` · `style`)를 「화면」으로 친다. `hidden` · `checked` 같은 이름은 자료에도 흔해서 뺐다.

## 바뀌는 곳

| 영역 · 파일                       | 무엇이 바뀌나                             | 인터페이스                                 |
| --------------------------------- | ----------------------------------------- | ------------------------------------------ |
| `app/src/core/result.js`          | 새 파일 — 옮긴 계산 (함수 36개 · 상수)    | 새 전역 `…In(U, …)` 20개, 옮긴 이름 그대로 |
| `app/src/15` · `17` · `18` · `12` | 계산을 빼고 연결 함수를 남김              | 기존 이름 · 서명 그대로                    |
| `app/index.html`                  | `<script src="src/core/result.js">` 한 줄 | 불러오는 순서: core 끝에 추가              |
| `tools/analyze-purity.mjs`        | 화면 요소 판정 보강                       | 명령 · 출력 형식 그대로                    |

## 호환성과 데이터 영향

- 저장 자료: 바뀌지 않음 · 화면 · 숫자: 그대로 · 배포: 파일 하나 추가

## 구현 순서

1. 분석 도구 보강 → 옮기기 → Prettier
2. Node = 브라우저 교차 시험 + 눈금 · 글자 단위 시험
3. 문서

## 검증 전략

- 자동: `npm run check` · `npm run lint` · `npm test`
- 손으로: main 과 이 가지의 화면 12개 픽셀 비교

## 위험과 미해결 결정

- 없음
