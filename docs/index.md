# 문서 지도

이 저장소의 문서는 **저장소 안이 원본**이다. 대화 · 메모 · 외부 도구에 있는 내용은 여기에 옮겨야 사실로 친다.
처음이면 위에서부터 차례로, 일이 있으면 그 일의 줄만 읽는다.

## 탐색 순서

| 차례 | 문서                                                       | 무엇                                              |
| ---: | ---------------------------------------------------------- | ------------------------------------------------- |
|    1 | [README.md](../README.md)                                  | 무엇을 하는 앱인지, 시작 명령                     |
|    2 | [AGENTS.md](../AGENTS.md)                                  | 작업 규칙 (사람 · AI 공통)                        |
|    3 | [product/overview.md](product/overview.md)                 | 제품 목적 · 사용자 · 사용 흐름                    |
|    4 | [product/domain-rules.md](product/domain-rules.md)         | 거래 · 분류 · 집계 · 금액 · 날짜 · 저장 자료 규칙 |
|    5 | [architecture/overview.md](architecture/overview.md)       | 지금 코드가 어떻게 짜여 있나                      |
|    6 | [development/workflow.md](development/workflow.md)         | 계획 → 확정 → 구현 → 검증, AI 역할 분담           |
|    — | [development/setup.md](development/setup.md)               | 설치 · 실행 · worktree · OMC                      |
|    — | [development/testing.md](development/testing.md)           | 안전망 테스트 — 무엇을 지키고 무엇을 못 지키나    |
|    — | [development/quality.md](development/quality.md)           | 모양 · 린트 · 타입 · 비밀 값 검사와 기준선        |
|    — | [development/deployment.md](development/deployment.md)     | 배포 경로 · 조건 · 되돌리기                       |
|    — | [development/codex-review.md](development/codex-review.md) | Codex 검수 — 사용자가 요청할 때만                 |
|    — | [backlog.md](backlog.md)                                   | 남은 할 일 (개발 후보 · 운영 · 계정 · 테스트베드) |
|    — | [../specs/README.md](../specs/README.md)                   | 큰 작업의 명세 · 계획 · 할 일과 상태              |
|    — | [../templates/](../templates/)                             | 명세 · 계획 · 할 일 · 결정 기록의 틀              |

## 결정 기록

`decisions/` 에는 **실제로 정해진** 중요한 설계 결정만 둔다. 누가 · 언제 · 어디서 정했는지 근거를 함께 적는다.

| 번호                                              | 결정                                         |
| ------------------------------------------------- | -------------------------------------------- |
| [0001](decisions/0001-no-server.md)               | 서버 없이 브라우저 안에서만 계산 · 저장한다  |
| [0002](decisions/0002-no-build-step.md)           | 빌드 단계 없이 `app/` 을 그대로 올린다       |
| [0003](decisions/0003-storage-compatibility.md)   | 저장 자료의 이름 · 형식을 바꾸지 않는다      |
| [0004](decisions/0004-lint-baselines.md)          | 오래된 코드의 검사는 기준선으로 묶는다       |
| [0005](decisions/0005-main-protection-by-rule.md) | main 보호는 GitHub 설정 대신 약속으로 지킨다 |
| [0006](decisions/0006-ai-roles.md)                | AI 역할 분담 — Codex 계획, Claude 구현       |

새 결정은 [templates/decision.md](../templates/decision.md) 로 쓰고 이 표에 한 줄 더한다.

## 사실 · 제안 · 결정을 구분한다

| 종류                    | 어디에                                    | 표시                                                |
| ----------------------- | ----------------------------------------- | --------------------------------------------------- |
| 지금 코드 · 설정의 사실 | `product/` `architecture/` `development/` | 코드 · 설정 파일 경로를 근거로 단다                 |
| 코드에서 본 동작        | `product/domain-rules.md`                 | 「관찰」로 적는다. 제품 규칙으로 확정된 것과 구분   |
| 제안 · 계획             | `specs/<작업>/` , `backlog.md`            | 상태 `Draft` — 사용자가 확정하기 전까지는 제안일 뿐 |
| 확정된 결정             | `decisions/` , 상태 `Approved` 인 명세    | 누가 언제 정했는지 근거                             |
| 미확정 질문             | 각 문서의 「미확정」 절                   | 답이 나오면 사실 · 결정으로 옮기고 지운다           |

## 언제 문서를 고치나

같은 PR 안에서 문서도 고친다. 다음 중 하나에 해당하면 문서 갱신이 필요하다.

- 계산 · 분류 · 저장 규칙이 바뀐다 → `product/domain-rules.md`
- 파일이 생기거나 없어지거나, 파일의 역할 · 불러오는 순서 · 전역 상태 모양이 바뀐다 → `architecture/overview.md`
- `package.json` 명령, 검사 도구, 기준선 숫자가 바뀐다 → `development/quality.md` · `setup.md` · `README.md`
- 테스트 파일이 생기거나 지키는 범위가 바뀐다 → `development/testing.md`
- 배포 workflow · 주소 · Cloudflare 구성이 바뀐다 → `development/deployment.md`
- 중요한 설계를 새로 정했다 → `decisions/` 에 한 편
- 할 일을 끝냈거나 새로 생겼다 → `backlog.md` 또는 `specs/README.md`

문서끼리 같은 규칙을 복사하지 않는다. 한 곳에 쓰고 나머지는 링크한다.
