# AI 작업 규칙 — 남는돈

AI(Claude Code · Codex · Cursor 등)가 이 저장소에서 일할 때 따르는 규칙이다.
사람을 위한 소개는 [README.md](README.md).

## 이 저장소

- **남는돈** — 은행 거래내역 파일로 사업 자금 흐름(번 돈·쓴 돈·순이익·예상 잔액)을 보여주는 웹앱.
- **서버가 없다.** `app/` 의 정적 파일을 Cloudflare 가 나눠 주고, 계산은 사용자 브라우저 안에서 한다.
  거래내역을 밖으로 보내는 코드를 만들지 않는다 — 「파일은 서버로 가지 않는다」가 제품의 약속이다.
- `app/` 앱 (→ app.namneundon.com) · `landing/` 소개 페이지 (→ namneundon.com) · `tests/` · `tools/` · `docs/`
- **빌드 단계가 없다.** `app/` 을 그대로 올린다. 번들러·프레임워크를 들이지 않는다 (사람과 먼저 정한다).
- main 에 합치면 자동 배포된다 (`.github/workflows/deploy.yml`). **main 에 직접 push 하지 않는다.**

## 앱 코드(`app/src`)의 구조 — 꼭 알 것

- 원래 한 `<script>` 였던 것을 19개 파일로 나눴다. **모든 함수·변수가 전역**이고 파일끼리 나눠 쓴다.
- **`index.html` 의 `<script>` 순서가 곧 실행 순서다.** 순서를 바꾸지 않는다.
- 앞 파일이 불러오는 순간 뒤 파일의 이름을 쓰면 깨진다 → `npm run check` 가 잡는다.
- 전역 상태는 `UP` 객체 하나에 모여 있다.
- 파일별 역할: [docs/structure.md](docs/structure.md)

## 절대 하지 않는 것

1. **`localStorage` 의 저장 이름(key)·형식을 바꾸지 않는다** (`fc.picks.*`, `fc.data.*`, `fc.banks.*` 등).
   바꾸면 사용자가 정해 둔 분류가 사라진다. 꼭 바꿔야 하면 옛 자료를 옮기는 코드를 함께 쓴다.
2. **실제 은행 거래내역·개인정보를 저장소에 넣지 않는다.** 테스트는 예시 거래(`DEMO_TX`)로 만든 파일을 쓴다.
3. 토큰·키·비밀번호를 파일에 적지 않는다.
4. 스냅샷(`tests/snapshots/`)을 이유 없이 새로 찍지 않는다. 테스트가 실패하면 먼저 코드를 의심한다.
5. 검사 기준선(`--max-warnings`, `tools/typecheck-app.mjs` 의 `BASELINE`)을 올리지 않는다. 줄었으면 낮춘다.

## 바꾼 뒤 반드시

```bash
npm run lint   # 코드 규칙 7종
npm test       # 불러오는 순서 + 안전망 테스트
```

- **리팩토링(동작을 안 바꾸는 변경)이면** 스냅샷이 그대로여야 한다. 화면 모양까지 바뀔 수 있는 변경(CSS 등)은
  바꾸기 전·후 화면을 픽셀로 비교한다 (휴대폰 390px · 노트북 1280px).
- **일부러 화면·계산을 바꿨으면** `npm run test:update` 로 스냅샷을 새로 찍고, PR 에 무엇이 왜 바뀌었는지 적는다.

## 작업 방식

- 가지 이름: `fix/…` `feat/…` `refactor/…` `chore/…` `docs/…`
- 커밋·PR 설명은 한국어로. 무엇을 왜 바꿨고 어떻게 확인했는지 적는다. PR 템플릿을 채운다.
- PR 하나에 한 가지 일. 리팩토링과 기능 변경을 섞지 않는다.
- 코드 주석은 기존 방식대로 **한국어로 「왜」를 적는다.** 옛 주석의 `★ N차` 는 회차별 변경 이유 기록이다.

## 참고할 곳

- 할 일: [docs/roadmap.md](docs/roadmap.md) · 배포: [docs/deploy.md](docs/deploy.md) ·
  테스트: [docs/testing.md](docs/testing.md) · 검사: [docs/code-quality.md](docs/code-quality.md)
- 사업 자료(계획서·데이터 명세서·교육 자료)는 저장소 밖 Google Drive 에 있다.
  로컬 사본이 있으면 `~/Desktop/google-drive` 다. 개발에 필요한 내용만 요약해 `docs/` 에 옮긴다.
