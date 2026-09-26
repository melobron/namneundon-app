# AI Native 개발 체계 구축 — 계획

| 항목      | 값                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| 상태      | Implementing — 사용자 요청(2026-09-25)이 구현 지시다. 아래 「구현 중 제안」은 사용자 검토 전이다           |
| 명세      | [spec.md](spec.md)                                                                                         |
| 조사 기준 | `main` · `eb18cb1` 에서 시작, 작업 중 `origin/main` `8f62002` (PR #14 · #15 합쳐짐) 위로 옮김 · 2026-09-25 |
| 작성      | Claude Code                                                                                                |

## 현재 구조와 제약

- 기존 문서: `README.md` · `AGENTS.md` · `CLAUDE.md`(`@AGENTS.md` 한 줄) · `docs/{deploy, roadmap, testing, structure, code-quality}.md`.
- `chore/lint-cleanup`(`e98032e`)은 PR #10 으로 main 에 합쳐졌다 → 최신 main 에서 브랜치를 만들었다.
- 작업 중 다른 세션이 같은 폴더에서 `fix/deploy-always`(PR #14)로 브랜치를 바꿔 커밋했다 → 사용자 확인 뒤 작업을 worktree(`../테스트배드-ai-native`)로 옮겼다. PR #14 는 `deploy.yml` · `docs/deploy.md` · `package.json` 을 고친다.
- 문서 참고: OpenAI 「Harness engineering」(짧은 입구 지침 + 저장소 문서를 원본으로), GitHub Spec Kit 템플릿(MIT), Claude Code 공식 모범 사례(`CLAUDE.md` 는 짧게, `@경로` 로 가져오기), OMC 저장소 README · REFERENCE.

## 설계

| 영역 | 무엇                                                                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 입구 | `AGENTS.md` 는 우선순위 · 사실 · 금지 · 읽을 곳 · 검증 명령만 두고 나머지는 링크. `CLAUDE.md` 는 `@AGENTS.md` + Claude 전용 절차만                               |
| 지식 | `docs/product/`(제품 · 도메인 규칙, 확정/관찰 구분) · `docs/architecture/`(지금 모습만) · `docs/decisions/`(근거 있는 확정 결정만) · `docs/development/`(절차)   |
| 명세 | `specs/README.md` + `specs/<작업>/` , 틀은 `templates/`                                                                                                          |
| 이전 | structure → architecture, testing → development/testing, code-quality → development/quality, deploy → development/deployment, roadmap → docs/backlog + decisions |
| OMC  | 프로젝트 범위 설치, `OMC_SKIP_HOOKS=keyword-detector`, `.claude/CLAUDE.md` 는 OMC 영역, `.omc/*` 무시                                                            |

## 호환성과 데이터 영향

- 앱 · 테스트 · 스냅샷 · 저장 형식: 바꾸지 않는다.
- 설정: `.gitignore`(OMC 실행 상태 · 사본 스킬), `.prettierignore`(OMC 관리 파일), `.claude/settings.json`(새 파일).
- **PR #14 · #15 반영**: 작업 중 두 PR 이 main 에 합쳐져, 브랜치 기준을 `8f62002` 로 옮기고 충돌(`AGENTS.md` · `cspell-words.txt` · `docs/deploy.md` · `docs/roadmap.md`)을 풀었다. PR #14 의 배포 방식은 `deployment.md` 에, PR #15 의 할 일 갱신은 `backlog.md` 에, worktree 규칙은 `AGENTS.md` · `setup.md` 에 옮겼다. `docs/deploy.md` 는 옛 경로 안내 3줄만 남긴다 (`deploy.yml` 주석이 가리키므로 workflow 는 건드리지 않는다).

## 구현 순서

tasks.md 참고.

## 검증 전략

- 저장소 안 마크다운 링크 · 앵커를 스크립트로 전부 확인 (임시 스크립트, 커밋 안 함).
- 문서의 `npm run …` 명령이 `package.json` 에 있는지 확인.
- `git diff --stat main` 으로 `app/` · `tests/` · `landing/` 변경이 없는지.
- `npm run lint` · `npm test`.

## 구현 중 제안 (사용자 요청에 없던 것 — 검토 필요)

| #   | 제안                                                           | 이유                                                                                                         |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| P-1 | 할 일 목록을 `docs/backlog.md` 에 둔다 (목표 구조에 없던 파일) | 운영 · 계정 · 테스트베드 할 일을 잃지 않으려면 한 곳이 필요했다. 개발 후보도 명세 전까지 여기 둔다           |
| P-2 | `OMC_SKIP_HOOKS=keyword-detector` 로 키워드 자동 실행을 끈다   | 「자율 실행 모드를 기본 동작으로 강제하지 않음」을 지키려고. 슬래시 명령으로는 여전히 쓸 수 있다             |
| P-3 | OMC 가 만든 `.claude/CLAUDE.md` 를 커밋한다                    | 플러그인을 프로젝트 범위로 켜므로 같은 지침을 나누는 편이 일관된다. 원치 않으면 `.gitignore` 로 돌릴 수 있다 |
| P-4 | 결정 기록 6편 (0001~0006)                                      | 기존 문서 · 코드 주석에 근거가 있는 것만 골랐다. 0006 은 이번 요청 자체                                      |
| P-5 | 점검 항목 번호를 `Q-1~3` 으로 backlog 에 둔다                  | 명세를 만들 만큼 크지 않고, 고치는 일은 이번 범위 밖                                                         |
| P-6 | ~~worktree 규칙~~ → 제안 아님                                  | PR #15 에서 이미 main 규칙이 됐다. 이 브랜치는 그 문장을 새 AGENTS.md · setup.md 에 옮겼을 뿐이다            |

## 위험과 미해결 결정

- (해결됨) PR #14 · #15 와의 문서 충돌 — 위 「호환성과 데이터 영향」.
- OMC 버전이 오르면 `.claude/CLAUDE.md` 내용 · 훅 이름이 바뀔 수 있다 — 올릴 때 setup.md 의 확인을 다시 한다.
