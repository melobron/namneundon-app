# 작업 명세

큰 작업을 **명세(spec) → 계획(plan) → 할 일(tasks)** 로 나눠 적는 곳이다. 틀은 [templates/](../templates/), 절차는 [workflow](../docs/development/workflow.md).

## 언제 명세를 쓰나

새 기능 · 화면 흐름 변경, 계산 · 분류 규칙 변경, 여러 파일에 걸친 리팩토링, 저장 자료 · 내보내기 형식 등 호환성 변경, 새 도구 · 빌드 · 외부 서비스 도입.
오타 · 한두 줄 수정 · 문서 보강 같은 작은 일에는 쓰지 않는다 ([기준](../docs/development/workflow.md#명세를-쓸까-말까)).

## 파일과 순서

```
specs/<작업명>/        작업명은 영어 소문자-줄표 (브랜치 이름과 맞추면 좋다)
├─ spec.md    1. 무엇을 · 왜 · 완료 조건        (templates/spec.md)
├─ plan.md    2. 어떻게 · 조사한 기준 커밋        (templates/plan.md)
└─ tasks.md   3. 실행 차례 · 진행 상태 · 검증 기록 (templates/tasks.md)
```

spec 이 확정되기 전에 plan 을, plan 이 확정되기 전에 tasks 를 확정하지 않는다. 초안은 함께 써도 된다.

## 상태

| 상태           | 뜻                                          | 누가 바꾸나                                |
| -------------- | ------------------------------------------- | ------------------------------------------ |
| `Draft`        | 초안. 제안일 뿐 하기로 정한 것이 아니다     | 작성자 (Codex · Claude · 사람)             |
| `Approved`     | 사용자가 내용을 확정했다. 구현해도 된다     | **사용자만**                               |
| `Implementing` | 구현 중                                     | 구현자 (보통 Claude Code)                  |
| `Completed`    | 완료 조건을 확인했고 PR 이 main 에 합쳐졌다 | 구현자 — 확인 기록이 tasks.md 에 있을 때만 |
| `Superseded`   | 다른 명세로 대체됐다 (링크를 단다)          | 사용자                                     |
| `Dropped`      | 하지 않기로 했다 (이유를 단다)              | 사용자                                     |

- **AI 는 사용자 승인 없이 `Draft` 를 `Approved` 로 바꾸지 않는다.** 승인 날짜 · 승인자를 지어내지 않는다.
- 사용자가 채팅에서 「이 계획대로 구현해」라고 지시했으면 그것이 승인이다. AI 가 상태를 바꿀 때는 **그 지시가 있었던 날짜와 내용을 함께** 적는다.
- 검증하지 않은 일을 `완료`로, 돌리지 않은 테스트를 「통과」로 적지 않는다.

## 목록

| 작업                                                 | 상태           | 브랜치 · PR                       | 요약                                                                |
| ---------------------------------------------------- | -------------- | --------------------------------- | ------------------------------------------------------------------- |
| [ai-native-foundation](ai-native-foundation/spec.md) | `Implementing` | `chore/ai-native-foundation`      | 지침 · 문서 · 명세 체계 · OMC 설정 (이 폴더를 만든 작업)            |
| [refactor-b1g-onboard](refactor-b1g-onboard/spec.md) | `Completed`    | `refactor/b1g-onboard` · #27      | 온보딩 계산을 `core/onboard.js` 로 (리팩토링 B-1g)                  |
| [refactor-b1h-result](refactor-b1h-result/spec.md)   | `Completed`    | `refactor/b1h-result` · #28       | 결과 화면 · 그래프 계산을 `core/result.js` 로 (리팩토링 B-1h)       |
| [refactor-b1i-rest](refactor-b1i-rest/spec.md)       | `Completed`    | `refactor/b1i-rest` · #29         | 남은 순수 계산을 `core/` 주제별 넷으로 (리팩토링 B-1i — B-1 마무리) |
| [refactor-b4-split](refactor-b4-split/spec.md)       | `Completed`    | #34 · #35 · #36 · #37 · #43 · #45 | 큰 화면 함수 쪼개기 (리팩토링 B-4)                                  |

아직 명세가 없는 개발 후보는 [docs/backlog.md](../docs/backlog.md) 에 있다.

## 끝난 명세도 남긴다

`Completed` · `Superseded` · `Dropped` 명세도 지우지 않는다. 코드가 왜 지금 모양인지의 배경이다.
끝난 뒤 사실이 바뀌면 명세를 고치지 말고, 새 명세나 [결정 기록](../docs/index.md#결정-기록)에서 이 명세를 링크한다.
