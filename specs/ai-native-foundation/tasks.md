# AI Native 개발 체계 구축 — 할 일

- 명세: [spec.md](spec.md) · 계획: [plan.md](plan.md)
- 상태 표시: `대기` · `진행` · `완료` · `막힘(이유)` · `취소(이유)`

## 할 일

| #   | 할 일                                                                        | 먼저 끝나야 할 것 | 결과물                                                                    | 확인 방법                                                       | 상태 |
| --- | ---------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- | ---- |
| T1  | 경로 · 브랜치 · 원격 상태 확인, 브랜치 만들기                                | —                 | `chore/ai-native-foundation` (처음 main `eb18cb1`, T11 에서 `8f62002` 로) | `git fetch`, `git merge-base --is-ancestor e98032e origin/main` | 완료 |
| T2  | OMC 설치 상태 확인 → 프로젝트 범위 설치 · 설정                               | T1                | `.claude/settings.json`, `.claude/CLAUDE.md`, `.gitignore`                | `claude plugin list`                                            | 완료 |
| T3  | 다른 세션과 폴더가 겹쳐 worktree 로 옮기기                                   | T2                | `../테스트배드-ai-native`                                                 | `git worktree list`, 원본 폴더 `git status` 깨끗                | 완료 |
| T4  | 입구 문서: README · AGENTS · CLAUDE                                          | T1                | 세 파일                                                                   | 링크 검사                                                       | 완료 |
| T5  | 지식 문서: index · product · architecture · decisions · backlog              | T1                | `docs/…`                                                                  | 코드와 대조, 링크 검사                                          | 완료 |
| T6  | 절차 문서: development/*                                                     | T5                | 6 파일                                                                    | 명령이 `package.json` 에 있는지                                 | 완료 |
| T7  | 옛 문서 정리                                                                 | T5 · T6           | 4 파일 삭제, `docs/deploy.md` 는 안내                                     | 옛 경로 참조 검색 (`git grep`)                                  | 완료 |
| T8  | 명세 체계: templates · specs/README · 이 명세                                | T4                | `templates/` 4 · `specs/`                                                 | 링크 검사                                                       | 완료 |
| T9  | 점검 항목 3개 확인 · 기록                                                    | T1                | backlog Q-1 ~ Q-3                                                         | 재현 · 코드 확인                                                | 완료 |
| T11 | 작업 중 main 에 합쳐진 PR #14 · #15 위로 기준 옮기기 · 충돌 풀기 · 내용 반영 | T8                | 기준 `8f62002`                                                            | `git log origin/main`, 충돌 0                                   | 완료 |
| T10 | 검증: 포맷 · 린트 · 테스트 · diff · 비밀 값                                  | 전부              | 아래 기록                                                                 | 아래 기록                                                       | 완료 |

## 검증 기록

| 날짜       | 누가   | 무엇을                                                                                                                | 결과                                                                                                                            |
| ---------- | ------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-25 | Claude | `claude plugin list`                                                                                                  | `oh-my-claudecode@omc` 5.5.0 · Scope: project · enabled                                                                         |
| 2026-09-25 | Claude | OMC 훅 스크립트 읽기 (`hooks/hooks.json` 과 각 스크립트)                                                              | Codex 를 부르는 훅 없음. 키워드 훅은 `OMC_SKIP_HOOKS` 로 끔. `code-simplifier` 는 기본 꺼짐                                     |
| 2026-09-25 | Claude | `env PATH=/usr/bin:/bin node tools/typecheck-app.mjs`                                                                 | 「앱 타입 오류 0개」 · exit 0 — Q-1 재현. 정상 실행은 51개 (기준선 51)                                                          |
| 2026-09-25 | Claude | 저장소 안 마크다운 링크 · 앵커 검사 (임시 스크립트, 커밋 안 함. 깨진 링크를 일부러 넣어 검사기가 잡는 것도 확인)      | 30 파일 모두 정상                                                                                                               |
| 2026-09-25 | Claude | 문서 속 `npm run …` 15종이 `package.json` 에 있는지                                                                   | 모두 있음                                                                                                                       |
| 2026-09-25 | Claude | `npm run lint`                                                                                                        | 통과. Prettier 정상 · ESLint 0 · Stylelint 110(기준선 110) · HTML 0 · cspell 0 (사전에 3 단어 추가) · 앱 타입 51                |
| 2026-09-25 | Claude | `npm test`                                                                                                            | 불러오는 순서 문제 없음 · Playwright 6 passed. 스냅샷 변경 없음                                                                 |
| 2026-09-25 | Claude | `git diff --cached --name-only main -- app tests landing tools .github package.json package-lock.json wrangler.jsonc` | 없음                                                                                                                            |
| 2026-09-25 | Claude | `gitleaks git --staged`                                                                                               | no leaks found                                                                                                                  |
| 2026-09-25 | Claude | (기준 `8f62002` 로 옮긴 뒤) 링크 검사 · `npm run lint`                                                                | 31 파일 링크 정상. lint 통과 (Stylelint 110 · 앱 타입 51 · cspell 0)                                                            |
| 2026-09-25 | Claude | (기준 `8f62002`) `npm test` 첫 실행                                                                                   | 4개가 각 8.9분 멈춘 뒤 실패, 2개 통과 — 실행 중 기기가 멈춰 있던 것으로 보인다 (시각이 약 3시간 건너뜀). 코드 원인은 확인 못 함 |
| 2026-09-25 | Claude | (기준 `8f62002`) `npm test` 다시 실행                                                                                 | 6 passed (11.1s). 스냅샷 변경 없음                                                                                              |
| 2026-09-25 | Claude | (기준 `8f62002`) 범위 밖 변경 확인 · `gitleaks git --staged`                                                          | `app` · `tests` · `landing` · `tools` · `.github` · 패키지 파일 변경 없음. no leaks found                                       |

## 구현 중 정한 작은 것

- 할 일 목록 파일 이름을 `docs/backlog.md` 로 했다 (plan P-1).
- `docs/deploy.md` 는 지우지 않고 3줄 안내로 남겼다 — `deploy.yml` 주석이 가리키고, workflow 는 이번 범위 밖이다.
- `tests/ledger.spec.mjs` 주석의 「roadmap B-7」 은 고치지 않았다 (테스트 파일은 건드리지 않는다. B-7 번호는 backlog 에 그대로 있다).
- 옛 `structure.md` 의 파일별 줄 수는 옮기지 않았다 — 포매터 적용 뒤 이미 달라져 있었고 금방 낡는다.
- `.claude/CLAUDE.md` 를 Prettier 에서 뺐다 (OMC 가 통째로 다시 쓰는 파일).

## 남은 문제

- 커밋 · push · PR 은 하지 않았다 (이번 요청 범위 밖). 변경은 worktree 에 스테이징만 되어 있다.
- plan 의 「구현 중 제안」 P-1 ~ P-5 사용자 검토.
- 이 명세의 상태는 PR 이 합쳐지면 `Completed` 로 바꾼다.
