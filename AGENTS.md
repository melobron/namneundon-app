# AI 작업 규칙 — 남는돈

Claude Code · Codex 등 AI 가 이 저장소에서 일할 때 공통으로 따르는 규칙이다. **짧은 입구**이고, 자세한 내용은 링크한 문서가 원본이다.
사람을 위한 소개는 [README.md](README.md), 문서 지도는 [docs/index.md](docs/index.md).

## 우선순위

1. **사용자의 이번 요청**이 이 파일과 도구별 기본 역할보다 앞선다.
2. 이 파일과 링크한 문서 (`docs/`, 확정된 `specs/`).
3. 도구별 파일 (`CLAUDE.md`, `.claude/CLAUDE.md` 의 OMC 영역 등) — 여기와 부딪치면 여기를 따른다.

## 이 저장소의 사실

- **남는돈** — 은행 거래내역 파일로 사업 자금 흐름(번 돈 · 쓴 돈 · 순이익 · 예상 잔액)을 보여주는 웹앱.
- **서버가 없다.** 계산은 사용자 브라우저 안에서 한다. **거래내역을 밖으로 보내는 코드를 만들지 않는다** — 「파일은 서버로 가지 않는다」가 제품의 약속이다.
- **빌드 단계가 없다.** `app/` 을 그대로 올린다. 번들러 · 프레임워크를 들이지 않는다 (사용자와 먼저 정한다).
- `app/` 앱 · `landing/` 소개 페이지 · `tests/` · `tools/` · `docs/` 문서 · `specs/` 작업 명세 · `templates/` 명세 틀
- main 에 합치면 자동 배포된다. **main 에 직접 push 하지 않는다.**

## 절대 하지 않는 것

1. **`localStorage` 저장 이름(key) · 형식을 바꾸지 않는다** (`fc.picks.*` `fc.data.*` 등, 목록은 [domain-rules](docs/product/domain-rules.md#저장-자료)). 꼭 바꿔야 하면 사용자와 먼저 정하고, 옛 자료를 옮기는 코드를 함께 쓴다.
2. **실제 은행 거래내역 · 개인정보를 저장소에 넣지 않는다.** 테스트는 예시 거래(`DEMO_TX`)로 만든 파일을 쓴다.
3. 토큰 · 키 · 비밀번호를 파일에 적지 않는다.
4. 스냅샷(`tests/snapshots/`)을 이유 없이 새로 찍지 않는다. 테스트가 실패하면 먼저 코드를 의심한다.
5. 검사 기준선(`--max-warnings`, `tools/typecheck-app.mjs` 의 `BASELINE`)을 올리거나 검사를 끄지 않는다. 줄었으면 낮춘다.

## 앱 코드(`app/src`)에서 꼭 알 것

- 한 `<script>` 였던 것을 19개 파일로 나눴다. **모든 함수 · 변수가 전역**이고, 지금 올린 파일의 상태는 `UP` 객체에 모여 있다.
- **`index.html` 의 `<script>` 순서가 곧 실행 순서다.** 순서를 바꾸지 않는다. 앞 파일이 불러오는 순간 뒤 파일 이름을 쓰면 깨진다 → `npm run check` 가 잡는다.
- 구조와 흐름: [docs/architecture/overview.md](docs/architecture/overview.md)

## 작업 전에 확인

- 작업 경로(`pwd`, `git rev-parse --show-toplevel`) · 브랜치 · `git status` 를 확인한다.
- **코드를 고치는 작업은 자기 전용 작업 폴더(git worktree)에서 한다.** 원래 폴더에서 가지를 바꾸지 않는다 — 여러 세션(사람 · AI)이 한 폴더를 같이 쓰면 한쪽의 `git switch` 가 다른 쪽의 미커밋 변경과 가지를 바꿔 버린다 (2026-09-25 실제로 일어났다).
  `git worktree add ../테스트배드-<주제> -b <가지> origin/main` ([setup](docs/development/setup.md#worktree)).
- 남의 미커밋 변경을 지우거나 덮어쓰지 않는다.
- 브랜치 이름: `fix/…` `feat/…` `refactor/…` `chore/…` `docs/…`

## 무엇을 읽나

| 작업                             | 먼저 읽을 것                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 계산 · 분류 · 저장에 닿는 변경   | [domain-rules](docs/product/domain-rules.md) · [architecture](docs/architecture/overview.md)                                   |
| 큰 기능 · 리팩토링 · 호환성 변경 | [specs/README.md](specs/README.md) → 해당 `specs/<작업>/`                                                                      |
| 계획 · 구현 · 검수 절차          | [workflow](docs/development/workflow.md) · [codex-review](docs/development/codex-review.md)                                    |
| 테스트 · 검사 · 배포             | [testing](docs/development/testing.md) · [quality](docs/development/quality.md) · [deployment](docs/development/deployment.md) |
| 왜 이렇게 되어 있나              | [docs/decisions/](docs/index.md#결정-기록)                                                                                     |
| 남은 할 일                       | [docs/backlog.md](docs/backlog.md)                                                                                             |

## 바꾼 뒤 반드시

```bash
npm run lint   # 모양 · 린트 · CSS · HTML · 철자 · 타입
npm test       # 불러오는 순서 + 안전망 테스트
```

- 동작을 안 바꾸는 변경이면 스냅샷이 그대로여야 한다. 일부러 화면 · 계산을 바꿨을 때만 `npm run test:update` 하고 PR 에 무엇이 왜 바뀌었는지 적는다 ([testing](docs/development/testing.md)).
- 실패하면 이번 변경 때문인지, 원래 있던 문제인지 구분해서 보고한다.

## 기록은 사실대로

- 요구사항 · 계획 · 검증 결과 · 완료 여부는 **실제로 확인한 것만** 적는다. 돌리지 못한 검사는 「못 돌렸다」와 이유를 적는다.
- 명세 상태 `Draft → Approved` 는 **사용자만** 바꾼다. AI 는 승인 일자 · 승인자를 지어내지 않는다 ([specs/README.md](specs/README.md)).
- 코드에서 본 동작과 사용자가 정한 제품 규칙을 구분한다. 버그일 수 있는 동작을 규칙으로 적지 않는다.
- 공유 문서에는 근거와 결론만 남긴다. AI 끼리의 대화 전문 · 임시 메모 · 내부 추론은 옮기지 않는다.

## 커밋 · PR

- 커밋 · PR 설명은 한국어로. 무엇을 왜 바꿨고 어떻게 확인했는지 적는다. PR 템플릿을 채운다.
- PR 하나에 한 가지 일. 리팩토링과 기능 변경을 섞지 않는다.
- 코드 주석은 기존 방식대로 **한국어로 「왜」를 적는다.** 옛 주석의 `★ N차` 는 회차별 변경 이유 기록이다.
- 사업 자료는 저장소 밖 Google Drive 에 있다 (로컬 사본 `~/Desktop/google-drive`). 개발에 필요한 내용만 요약해 `docs/` 에 옮긴다.
