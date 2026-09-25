# 배포

모두 Cloudflare 한 계정(`Ykang2356@gmail.com's Account`)에 있다. 서버 코드는 없고 정적 파일만 올린다.

| 무엇 | 저장소 폴더 | Cloudflare | 주소 | 올리는 명령 |
|---|---|---|---|---|
| **앱** | `app/` | Worker `namneundon-app` (설정: `wrangler.jsonc`) | **`app.namneundon.com`** | `npm run deploy:app` |
| 앱 (옛) | — | Worker `aged-rain-dbc4` | `aged-rain-dbc4.ykang2356.workers.dev` → 새 주소로 301 이동 | 저장소에서는 지웠다 (2026-09-25). Cloudflare 의 Worker 는 계속 돈다 |
| 랜딩 | `landing/` | Pages `namneundon` (Git 연결 없음) | `namneundon.com`, `www.namneundon.com` | `npm run deploy:landing` |
| ? | — | Pages `namneundon-cards2` | `namneundon-cards2.pages.dev` | 용도 확인 필요 |

## 자동 배포 (main 에 합치면)

`.github/workflows/deploy.yml` 이 한다. 사람은 PR 을 합치기만 한다.

| 바뀐 곳 | 하는 일 |
|---|---|
| `app/`, `wrangler.jsonc` | 안전망 테스트 → 앱 배포 → `app.namneundon.com` 에서 다시 테스트 |
| `landing/` | 랜딩 배포 → 「시작하기」가 앱 주소인지 확인 |
| 그 밖 (문서 등) | 아무것도 안 한다 |

테스트가 실패하면 배포하지 않는다. GitHub → Actions → 「자동 배포」에서 결과를 본다.

### 처음 한 번: Cloudflare 토큰 넣기

1. Cloudflare 대시보드 → 오른쪽 위 프로필 → **My Profile → API Tokens → Create Token**
2. **Edit Cloudflare Workers** 템플릿 → Use template
3. Permissions 에 한 줄 더: **Account · Cloudflare Pages · Edit**
4. Account Resources: **Ykang2356@gmail.com's Account** / Zone Resources: **namneundon.com**
5. Continue → Create Token → 나온 토큰을 **복사만** 한다 (다시 볼 수 없다)
6. 터미널에서 (붙여넣기 칸이 나온다):

```bash
gh secret set CLOUDFLARE_API_TOKEN
```

7. GitHub → Settings → Environments 에 `production` 이 생긴다. 여기서 「배포 전 승인」을 켤 수도 있다 (비공개 저장소 무료 요금제에서는 안 될 수 있다).

토큰은 절대 파일에 적거나 채팅에 붙이지 않는다.

## 손으로 배포 (처음 한 번 설정)

```bash
npm install
npx wrangler login     # 브라우저에서 2007jiwon@gmail.com 으로 로그인 → Allow
```

## 배포 전에

```bash
npm test                                                   # 로컬 검사
BASE_URL=https://app.namneundon.com npx playwright test   # 배포된 곳 검사
```

## 랜딩(`landing/`)에 대해

- 요한이 손으로 올리던 것을 운영 사이트에서 받아 복원했다 (2026-09-23).
- Cloudflare 는 이메일 주소를 스팸 방지용으로 바꿔서 내보낸다. 받은 HTML 에서 이것을 원래 글자로 되돌렸다.
  올리면 Cloudflare 가 다시 바꿔 준다.
- 미리보기(`preview-repo.namneundon-ahv.pages.dev`)에 올려 운영과 비교했다 —
  `APP_URL` 한 줄 말고는 본문·404·이미지·robots·sitemap 모두 같다.
- `APP_URL` 은 `https://app.namneundon.com` 으로 바꿔 두었다.

## ★ 주소를 바꿀 때 조심할 것 — 사용자 자료

앱은 사용자 자료를 브라우저 저장소(localStorage)에 둔다. 브라우저 저장소는 **주소마다 따로**다.
옛 주소에서 저장한 매장·분류는 새 주소에서 보이지 않는다.
옛 주소 사용자를 새 주소로 보내기 전에, 옛 주소의 자료를 새 주소로 옮기는 장치가 먼저 있어야 한다.
2026-09-25 주소 전환 때는 실사용자가 없어 옮기기 없이 바로 보냈다. 실사용자가 생긴 뒤 주소를 또 바꾼다면 옮기기가 필요하다.

## 주소 전환 (2026-09-25 완료)

순서가 중요하다. 앞 단계가 살아 있는 것을 확인하고 다음으로 간다.

1. `npm run deploy:app` — `app.namneundon.com` 연결 → `BASE_URL=https://app.namneundon.com npx playwright test`
2. `npm run deploy:landing` — 랜딩 「시작하기」가 새 주소로
3. 옛 주소 → 새 주소 301 이동 (Worker `aged-rain-dbc4`, 코드는 PR #4 의 `legacy/redirect.js`)

되돌리기: 옛 주소 `npx wrangler rollback --name aged-rain-dbc4` (직전 판 = 요한이 올린 119차 앱 `775ff2a7`),
랜딩은 Cloudflare 대시보드 → Pages `namneundon` → Deployments 에서 이전 배포를 Rollback.
