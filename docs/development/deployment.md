# 배포

> 기준: 2026-09-25 main (`8f62002`, PR #14 반영) 의 `.github/workflows/deploy.yml`.

서버 코드는 없고 정적 파일만 올린다. 모두 운영자의 Cloudflare 계정 하나에 있다 (계정 ID 는 `wrangler.jsonc` · `deploy.yml` 에 있다 — 비밀 값이 아니다).

## 무엇이 어디로

| 무엇    | 저장소     | Cloudflare                                       | 주소                                    | 손으로 올리기                                            |
| ------- | ---------- | ------------------------------------------------ | --------------------------------------- | -------------------------------------------------------- |
| **앱**  | `app/`     | Worker `namneundon-app` (설정: `wrangler.jsonc`) | **`app.namneundon.com`**                | `npm run deploy:app`                                     |
| 랜딩    | `landing/` | Pages `namneundon` (Git 연결 없음)               | `namneundon.com`, `www.namneundon.com`  | `npm run deploy:landing`                                 |
| 앱 (옛) | —          | Worker `aged-rain-dbc4`                          | 옛 `*.workers.dev` 주소 → 새 주소로 301 | 저장소에서는 지웠다 (2026-09-25). Worker 는 계속 돈다    |
| ?       | —          | Pages `namneundon-cards2`                        | `namneundon-cards2.pages.dev`           | 확인 · 정리하지 않기로 함 ([backlog](../backlog.md) A-9) |

## 자동 배포 (main 에 합치면)

`.github/workflows/deploy.yml` 이 한다. 사람은 PR 을 합치기만 한다. Actions 화면에서 손으로 다시 돌릴 수도 있다(`workflow_dispatch`).

**무엇이 바뀌었든 매번 최신 main 을 통째로 올린다** (문서만 바뀐 PR 도).

| 순서 | 작업             | 하는 일                                                                                                                       |
| ---- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1    | `test`           | `npm test` (불러오는 순서 + 안전망 테스트). 실패하면 여기서 멈춘다                                                            |
| 2    | `deploy-app`     | `wrangler deploy` → `node tools/verify-deploy.mjs` (운영 파일이 저장소 `app/` 과 한 바이트도 안 다른지) → `npm run test:prod` |
| 2    | `deploy-landing` | `deploy:landing` → 운영 랜딩의 `APP_URL` 이 앱 주소인지 `curl` 로 확인                                                        |

- 결과는 GitHub → Actions → 「자동 배포」. 손으로 운영 파일만 대조하려면 `npm run verify:prod`.
- 배포는 한 번에 하나씩 돈다(`concurrency: deploy`). 기다리던 배포는 GitHub 가 새 것으로 바꿀 수 있다.
- ★ 예전에는 「직전 커밋 대비 바뀐 곳만」 올렸다. PR 을 연달아 합치자 기다리던 배포가 취소되고 마지막(문서만 바뀐) 배포만 남아, 가운데 PR 의 계산 수정이 운영에 빠진 일이 있었다 (2026-09-25). 그래서 PR #14 에서 통째로 올리게 바꿨다.
- 필요한 비밀 값: `CLOUDFLARE_API_TOKEN` (GitHub Secrets, 2026-09-25 등록되어 있음 — `gh secret list` 로 이름만 확인). 배포 작업은 `production` Environment 로 돈다.

### 알려진 한계 (코드로 확인)

- **배포 workflow 는 `npm run lint` 를 돌리지 않는다.** `deploy.yml` 의 `test` 작업은 `npm test`(불러오는 순서 + Playwright)만 돈다. 린트 · 타입 검사는 `test.yml` 에서 **따로 · 동시에** 돌고, 배포는 그 결과를 기다리지 않는다. PR 단계에서 CI 가 통과한 뒤 합친다는 약속([결정 0005](../decisions/0005-main-protection-by-rule.md))이 지금의 안전장치다. PR #14 뒤에도 이 점은 그대로다. 개선 항목: [backlog](../backlog.md) Q-2.
- 랜딩 배포는 안전망 테스트(`test`)를 기다리지만, 랜딩 자체를 검사하는 테스트는 없다. 운영 랜딩의 `APP_URL` 확인만 배포 뒤에 한다.

## 처음 한 번 — Cloudflare 토큰 (이미 되어 있음)

새로 만들어야 할 때만.

1. Cloudflare 대시보드 → 프로필 → **My Profile → API Tokens → Create Token**
2. **Edit Cloudflare Workers** 템플릿 → Permissions 에 **Account · Cloudflare Pages · Edit** 한 줄 더
3. Account Resources: 운영 계정 / Zone Resources: **namneundon.com**
4. 나온 토큰을 **복사만** 하고 터미널에서 `gh secret set CLOUDFLARE_API_TOKEN` (붙여넣기 칸이 나온다)

토큰은 파일에 적거나 채팅에 붙이지 않는다.

## 손으로 배포

```bash
npx wrangler login                                        # 브라우저에서 운영 계정 멤버로 로그인
npm test                                                  # 로컬 검사
npm run deploy:app                                        # 또는 deploy:landing
npm run test:prod                                         # 운영 주소 검사
```

자동 배포가 있으니 손으로 올리는 것은 예외다. 올렸으면 무엇을 왜 올렸는지 남긴다.

## 되돌리기

| 무엇    | 방법                                                                                                                                                                                                                              |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 앱      | 가장 확실한 길: 문제 커밋을 `git revert` 하는 PR 을 합친다 → 자동 배포. 급하면 Cloudflare 대시보드 → Workers → `namneundon-app` → Deployments 에서 이전 판으로 (또는 `npx wrangler rollback` — 이 저장소에서 아직 써 보지 않았다) |
| 랜딩    | Cloudflare 대시보드 → Pages `namneundon` → Deployments → 이전 배포 Rollback                                                                                                                                                       |
| 옛 주소 | `npx wrangler rollback --name aged-rain-dbc4` (직전 판 = 119차 앱 `775ff2a7`)                                                                                                                                                     |

되돌린 뒤 `npm run test:prod` 로 운영 주소를 확인한다.

## 저장소 밖에서 확인해야 하는 것

코드로는 알 수 없고 Cloudflare · GitHub 화면에서 봐야 한다.

- `production` Environment 의 「배포 전 승인」 설정 여부 (비공개 저장소 무료 요금제에서는 안 될 수 있다)
- Cloudflare 계정 멤버 · 역할 · 2단계 인증 ([backlog](../backlog.md) D-3 · D-4)
- 옛 Worker `aged-rain-dbc4` 의 301 이동이 계속 도는지

## 랜딩(`landing/`)

- 원래 손으로 올리던 것을 운영 사이트에서 받아 복원했다 (2026-09-23). Google Drive 원본과 대조해 `APP_URL` 말고는 같다 (2026-09-25).
- Cloudflare 는 이메일 주소를 스팸 방지용으로 바꿔 내보낸다. 받은 HTML 에서 원래 글자로 되돌려 두었고, 올리면 Cloudflare 가 다시 바꾼다.
- `APP_URL` 은 `https://app.namneundon.com`.

## 주소를 바꿀 때 — 사용자 자료

앱은 사용자 자료를 브라우저 저장소(`localStorage`)에 둔다. 브라우저 저장소는 **주소마다 따로**다.
옛 주소에서 저장한 매장 · 분류는 새 주소에서 보이지 않는다. 옛 주소 사용자를 새 주소로 보내기 전에, 자료를 옮기는 장치가 먼저 있어야 한다.
2026-09-25 주소 전환 때는 실사용자가 없어 옮기기 없이 바로 보냈다. **실사용자가 생긴 뒤 주소를 또 바꾼다면 옮기기가 필요하다.**

### 2026-09-25 주소 전환 기록 (완료)

1. `npm run deploy:app` — `app.namneundon.com` 연결 → 운영 주소 테스트
2. `npm run deploy:landing` — 랜딩 「시작하기」를 새 주소로
3. 옛 주소 → 새 주소 301 이동 (Worker `aged-rain-dbc4`, 코드는 PR #4 의 `legacy/redirect.js` — 지금은 git 기록에만 있다)
