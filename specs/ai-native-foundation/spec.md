# AI Native 개발 체계 구축 — 명세

| 항목 | 값                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------- |
| 상태 | Approved — 2026-09-25 사용자가 채팅 요청으로 범위를 정하고 구현을 지시했다 (별도 문서 승인 절차 없음) |
| 작성 | Claude Code, 2026-09-25 (사용자 요청을 옮겨 적음)                                                     |
| 관련 | [결정 0006](../../docs/decisions/0006-ai-roles.md)                                                    |

> 이 명세의 요구사항은 **사용자 요청에서 온 것**이다. 구현하며 Claude 가 새로 제안한 것은 [plan.md](plan.md) 의 「구현 중 제안」에 따로 적었다.

## 문제와 목적

지침 · 프로젝트 지식 · 개발 절차가 README · AGENTS.md · `docs/` 몇 파일에 흩어져 있고, 두 AI(Codex · Claude Code)의 역할 · 공유 범위가 정해져 있지 않았다.
새 Codex 대화가 저장소만 읽고 근거 있는 계획을 쓰고, 사용자가 확정한 계획을 Claude Code 가 찾아 구현 · 검증할 수 있게 한다.

## 요구사항

- **R1.** 역할 분담: 사용자(결정 · 확정) · Codex(계획, 요청 시 구현 · 검수) · Claude Code(구현 · 테스트 · 기록). 사용자 요청이 기본 역할보다 앞선다.
- **R2.** 두 AI 는 저장소 문서로만 사실을 나눈다. 대화 전문 · 임시 메모 · 내부 추론 · 상대 답 요약 · 요청 안 한 검수 의견은 자동으로 나누지 않는다.
- **R3.** 목표 구조: `README.md` · `AGENTS.md` · `CLAUDE.md` · `docs/{index, product/, architecture/, decisions/, development/}` · `specs/` · `templates/`. 빈 문서를 대량으로 만들지 않고, 필요 없는 `.codex/` 는 만들지 않는다.
- **R4.** 기존 문서(`deploy` · `roadmap` · `testing` · `structure` · `code-quality`)의 유효한 내용을 누락 없이 옮기고, 중복 원본은 정리한다. roadmap 의 미완료 운영 · 계정 · 테스트베드 항목을 잃지 않는다.
- **R5.** 명세 틀(spec · plan · tasks · decision)을 Spec Kit 을 참고해 이 저장소에 맞게 만들고 출처를 남긴다. 상태 `Draft → Approved → Implementing → Completed`, `Approved` 는 사용자만.
- **R6.** OMC 를 공식 방식으로, 가능하면 프로젝트 범위로 설치 · 설정한다. Codex 자동 호출 · 교차 자동 검수 · 자동 인계 · 자동 수정 루프 없음. 자율 실행 모드를 기본 동작으로 강제하지 않음. 전역 설정을 통째로 덮어쓰지 않음.
- **R7.** 커밋할 설정 · 개인 설정 · 실행 상태 · 플러그인 설치 파일을 구분하고, Git 제외 규칙은 필요한 것만 구체적으로.
- **R8.** 점검 항목 세 가지(타입 검사기의 실행 실패 처리, 배포가 lint 를 기다리지 않음, `monthNumbers` cutDay 와 `monthCloseBalance`)의 실제 상태를 확인해 개선 항목으로 기록한다. 이번에 꼭 필요하지 않으면 고치지 않는다.

## 범위

- 포함: 위 요구사항의 문서 · 틀 · 설정, OMC 설치.
- **제외**: 앱 기능 · 계산 로직 변경, 앱 모듈 구조 개편, 새 프레임워크 · 빌드, 저장 형식 변경, 스냅샷 갱신, 운영 배포, 원격 push · PR 병합, Claude↔Codex 자동화, ECC · OpenSpec · Superpowers · Codex 연동 플러그인 설치, 문서 검증용 새 테스트 프레임워크 · CI.

## 사용 시나리오

1. 사용자가 새 Codex 대화에서 「B-1 계획을 세워 줘」라고 한다 → Codex 가 `AGENTS.md` → `docs/index.md` → 도메인 · 아키텍처 문서 · `backlog.md` 를 읽고 `specs/core-extract/` 에 `Draft` 명세 · 계획을 쓴다.
2. 사용자가 읽고 확정한다 (`Approved`).
3. 사용자가 Claude Code 에 「`specs/core-extract` 구현해」라고 한다 → Claude 가 `CLAUDE.md` 절차대로 대조 · 구현 · 검증하고 `tasks.md` 에 기록한다.
4. 필요하면 사용자가 Codex 에 범위를 적어 검수를 요청한다.

## 경계 조건

- 같은 작업 폴더를 다른 세션이 동시에 쓸 때 (→ worktree).
- OMC 가 없는 사람 · 기기에서 저장소를 열 때 (`.claude/CLAUDE.md` 의 OMC 영역만 의미가 없어지고 공통 규칙은 그대로).
- 진행 중인 다른 PR(#14)이 옮기는 문서(`docs/deploy.md`)를 고칠 때.

## 완료 조건

- [ ] 목표 구조의 문서가 있고, 저장소 안 링크가 모두 살아 있다.
- [ ] 문서의 명령이 `package.json` · 설정과 맞는다.
- [ ] `CLAUDE.md` 가 `@AGENTS.md` 로 공통 규칙을 불러온다 (Claude Code 가 지원하는 가져오기 문법).
- [ ] OMC 가 프로젝트 범위로 설치 · 활성화되고, 키워드 자동 실행이 꺼져 있고, Codex 자동 호출 설정이 없다.
- [ ] 개인 설정 · 인증 · 캐시가 커밋 대상에 없다.
- [ ] 앱 코드 · 테스트 · 스냅샷 · 저장 형식이 바뀌지 않았다.
- [ ] `npm run lint` · `npm test` 통과.
- [ ] 승인되지 않은 계획이 `Approved` 로 표시되지 않았다.

## 미해결 질문

- `.claude/CLAUDE.md`(OMC 관리 영역)를 커밋해 팀과 나눌지, 개인 설정으로 둘지 — 지금은 커밋한다 (plan.md P-3).
- CSV 지원 여부 ([product/overview](../../docs/product/overview.md#미확정)).
