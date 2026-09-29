# 개발과 작업 절차

[제품 규칙](product.md) · [코드 구조](architecture.md) · [계획 틀](../plans/TEMPLATE.md)

## 문서를 어디에 쓰나

| 내용                                     | 원본 위치                                    |
| ---------------------------------------- | -------------------------------------------- |
| 고객 요청·버그·운영·우선순위·제품 로드맵 | Linear                                       |
| 현재 제품 동작과 저장·계산 규칙          | `docs/product.md`                            |
| 현재 코드 구조와 그 이유                 | `docs/architecture.md`                       |
| 개발·검사·배포·협업 방법                 | 이 문서                                      |
| 구현할 작업의 요구사항·설계·순서·검증    | `plans/<작업>.md` 한 파일                    |
| 분석 도구의 상세 사용·평가 방법          | `analysis/README.md`                         |
| 사업 계획서·실제 금융 자료               | 저장소 밖 Google Drive 또는 허가된 분석 환경 |

문서가 설명하는 동작·구조·명령을 바꾸면 같은 PR에서 해당 문서를 고친다.
내부 함수의 사소한 변경마다 모든 문서를 수정하지는 않는다. 할 일 상태를 docs에 다시 나열하지 않는다.
옛 목록의 누락을 막기 위한 [Linear 대조 계획](../plans/backlog-reconciliation.md)은 대조가 끝나면 삭제한다.

## 개발 환경

Node.js 24(`.nvmrc`)와 Git을 준비한다. `package.json`은 Node >=22를 요구하지만 CI와 맞추려면 24를 쓴다.

```bash
npm run setup
npm run doctor
npm run serve
```

- setup은 도구 확인 → `npm ci`와 커밋 훅 설치 → Playwright Chromium 준비 → `npm run check` → Python 분석 환경 준비·자체 점검을 한다.
- doctor는 설치 없이 상태만 확인한다. **setup은 실행할 때마다 npm 의존성을 다시 설치하므로 인터넷 차단 후에는 doctor를 쓴다.**
- 웹만 개발하면 `npm run setup -- --skip-python`, 점검도 `npm run doctor -- --skip-python`으로 맞춘다.
- `--skip-browser`는 Chromium 다운로드만 건너뛴다. 오프라인 설치 옵션이 아니다.
- Windows PowerShell에서는 `npm.cmd run setup`처럼 `npm.cmd`를 써서 실행 정책 문제를 피할 수 있다. `make`는 필수가 아니다.
- gitleaks는 선택 설치(`brew install gitleaks`)다. 설치되어 있으면 커밋 전에, 설치 여부와 관계없이 CI에서도 비밀 값을 검사한다.

앱은 <http://localhost:4173>, 소개 사이트는 <http://localhost:4174>에서 함께 열린다.
두 사이트 사이 링크는 응답에서 로컬 주소로 바뀌고 배포 파일은 그대로다.
서버는 이 PC에서만 접속하며 종료는 `Ctrl+C`다. 포트는 `PORT`, `LANDING_PORT`로 바꾼다.
설치 후 로컬 실행은 인터넷 없이 가능하지만 외부 SNS와 배포에는 인터넷이 필요하다.

### 분석 환경

인터넷이 되는 동안 setup → doctor → `npm run analysis:check`까지 성공하는지 확인한다.

- 64비트 Python 3.12·3.13으로 이 PC 전용 `.venv`를 만든다. 기존 전역 패키지는 바꾸지 않는다.
- Windows에 호환 Python이 없으면 공식 3.13.15 설치 파일의 SHA-256을 검사한 뒤 사용자 계정에 설치한다. PATH·파일 연결은 바꾸지 않는다. VDI 정책이 막으면 관리자 허용이 필요하다.
- Mac에서는 `brew install python@3.12` 등으로 준비한다. 다른 위치는 `PYTHON` 환경 변수로 지정한다.
- 분석 패키지는 `analysis/requirements.txt`의 버전·해시로 설치한다. Mac의 `.venv`를 Windows로 복사하지 않는다.
- setup은 실제 자료·분석 설정·결과를 덮어쓰거나 `init`·`freeze`·`demo`를 자동 실행하지 않는다.
- 실제 자료와 결과는 저장소 밖 또는 명시적으로 Git에서 제외된 `data/`, `analysis/data/`, `analysis/work/`, `analysis/work_demo/`에 둔다. 사용자 지정 출력 경로도 따로 확인한다.

```bash
npm run notebook
npm run analysis -- selftest
npm run analysis:check
```

노트북은 `data/notebooks/`에 저장한다. 터미널의 로컬 주소에 붙은 인증 토큰을 유지한다.
Jupyter 업데이트 확인·확장 다운로드는 꺼 두며, 새 패키지를 받으려면 인터넷이 필요하다.
평가 절차·실제 자료 사용법은 [분석 안내](../analysis/README.md)를 따른다.

패키지를 갱신할 때만 `analysis/requirements.in`을 고치고 다음으로 잠금 파일을 만든 뒤 Mac·Windows에서 확인한다.

```bash
uv pip compile analysis/requirements.in --universal --python-version 3.12 --generate-hashes --output-file analysis/requirements.txt
```

`uv`는 잠금 파일을 갱신하는 개발자만 필요하다. 일반 설치는 계속 setup 하나다.

## worktree

여러 세션이 원본 폴더의 브랜치를 바꿔 서로의 변경을 섞는 일이 2026-09-25에 있었다.
수정 작업마다 전용 worktree를 쓰고, 원본 폴더에서 브랜치를 바꾸거나 남의 변경을 덮어쓰지 않는다.

```bash
pwd
git rev-parse --show-toplevel
git status --short --branch
git fetch origin main
# 주제와 브랜치 이름은 이번 작업에 맞춰 정한다.
git worktree add ../namneundon-docs -b docs/example FETCH_HEAD
cd ../namneundon-docs
npm ci
```

이미 자신에게 배정된 작업용 worktree라면 불필요하게 다시 만들지 않는다.
다른 worktree가 사용 중인 브랜치를 억지로 가져오지 않고 새 작업 브랜치를 만든다.
의존성·개인 권한 설정·`.omc/`는 폴더마다 다를 수 있다. 작업이 합쳐지고 미커밋 자료가 없는지 확인한 뒤 worktree를 정리한다.

## 계획과 구현

기본 역할은 **Codex가 계획, Claude Code가 구현, 사용자가 방향과 채택 여부 결정**이다.
사용자가 이번 요청에서 다른 역할을 맡기면 그 요청을 따른다. 자동 인계·자동 교차 검수는 만들지 않는다.

1. 큰 기능·계산 변경·호환성 변경·큰 리팩토링이면 [틀](../plans/TEMPLATE.md)을 복사해 작업 하나당 계획 한 파일을 만든다. 단순 오타 수정에는 계획 파일이 필요 없다.
2. 기준 커밋, 문제와 요구사항, 포함·제외 범위, 설계, 완료 조건, 구현 순서와 검증을 적는다. 관련 Linear 이슈를 연결하고 아직 모르는 것은 질문으로 남긴다.
3. 사용자의 승인이 있으면 구현한다. 채팅에서 해당 계획의 구현을 직접 지시했다면 이미 승인이다. 날짜·지시 내용을 기록하고 같은 승인을 다시 요구하지 않는다.
4. 기준 커밋과 실제 코드를 대조하고, 작은 구현 선택은 스스로 해결해 기록한다. 요구사항·완료 조건·저장 호환성·핵심 계산·주요 구조·새 외부 서비스가 달라져야 하면 근거와 대안을 사용자에게 제시한다.
5. 구현 뒤 관련 현재 문서와 검증 기록을 갱신하고 PR을 준비한다. 코드가 만들어졌다는 사실과 실제 배포·사용자 확인을 구분한다.

| 계획 상태    | 의미                                                             |
| ------------ | ---------------------------------------------------------------- |
| Draft        | 제안 또는 아직 결정되지 않은 일                                  |
| Approved     | 사용자가 이 범위의 구현을 승인함. AI가 승인을 만들어 내지 않는다 |
| Implementing | 승인된 범위를 구현하거나 필요한 검증을 진행 중                   |
| Ready        | 완료 조건을 확인했고 PR·병합을 기다림                            |
| Completed    | 완료 조건과 병합 근거가 있음. 배포 확인 여부는 별도 기록         |

승인된 내용을 구현한 뒤, 중요한 결정·현재 동작은 docs에, 검증 결과·PR·커밋 근거는 PR 또는 Linear에 남긴다.
**그 기록을 찾을 수 있게 한 뒤 완료된 계획은 삭제한다.** 삭제하는 PR 본문에 계획의 마지막 커밋 또는 이전 PR을 연결한다.
미완료 검증이나 후속 일이 있으면 활성 계획으로 남기거나 Linear의 대응 이슈를 확인한 뒤 정리한다.
취소·대체된 계획도 이유와 대체 위치를 기록하고 같은 방식으로 정리한다.
브랜치를 만들었다고 자동으로 계획 파일을 만들지는 않는다. 한 계획이 여러 PR에 걸쳐도 된다.

### 요청받은 검수

Codex 검수는 사용자가 요청할 때만 한다. 요청한 경로·브랜치·커밋 또는 diff와 요구사항·코드·테스트를 근거로 본다.
요청과 현재 작업에서 범위를 알 수 없을 때만 확인한다. 계획 자체도 틀릴 수 있으므로 검토한다.
상대 AI의 대화·`.omc/` 임시 메모를 찾아 읽지 않는다. 확인된 문제·판단·불확실한 가능성을 구분하고,
각 발견에 위치, 발생 조건, 영향, 근거를 붙인다. 검수만 요청받았다면 파일을 고치지 않는다.
같은 문서를 읽으므로 완전한 독립성은 보장되지 않는다. 더 독립적인 판단이 필요하면 새 대화에서 요구사항과 코드 중심으로 요청한다.

## 검사

모든 변경 후 아래 두 명령을 실행하고, 실패하면 이번 변경 때문인지 기존 문제인지 구분한다.

```bash
npm run lint
npm test
```

lint는 Prettier → ESLint → Stylelint → HTML → 영어 철자 → 타입 검사를 한다.
현재 허용치는 ESLint·HTML·앱 타입 오류 0, CSS 경고 48이며 **설정 파일이 원본**이다.
`package.json`의 `--max-warnings`와 `tools/typecheck-app.mjs`의 `BASELINE`을 올리거나 검사를 끄지 않는다.
기존 문제를 고쳐 경고가 줄면 기준선도 낮춘다. 이 원칙은 2026-09-25 PR #8에서 도입됐다.
앱 타입 검사 실행 자체가 실패하면 통과로 취급하지 않는다.

- HTML 공백은 화면에 영향을 주므로 포매터에서 제외하고 HTML 검사만 한다.
- CSS 구문·접두어를 최신 표기로 일괄 변경하지 않는다. 오래된 Safari 호환성을 고려한 설정이다.
- CSS의 같은 구체성 선택자는 순서를 바꾸면 화면이 달라질 수 있다. 남은 경고를 이동만으로 없애지 않는다.
- `.claude/CLAUDE.md`는 OMC 관리 파일이어서 Prettier·cspell에서 제외한다. 프로젝트 코드 검사 예외를 늘리는 근거로 쓰지 않는다.
- 한글은 cspell 검사 대상이 아니다. 사용자 자료를 외부 맞춤법 검사기로 보내지 않는다.
- 포매터 적용 이력은 `.git-blame-ignore-revs`에 있다. 필요하면 `git config blame.ignoreRevsFile .git-blame-ignore-revs`를 설정한다.

## 테스트

`npm test`는 스크립트 순서·core 규칙 검사 뒤 Playwright 테스트를 실행한다.
실제 앱 파일을 로컬 서버(4173)에서 읽으므로 다른 worktree의 서버가 그 포트에 떠 있지 않은지 확인한다.
`tests/core/`는 Node 계산과 브라우저 계산을 대조하며, `tests/ledger.spec.mjs`는 잔액 검산식을 지킨다.
업로드·저장 복원·예정 지출·매장 이름 바꾸기(`tests/store-rename.spec.mjs`, 저장 실패 주입 포함) 등 사용자 흐름과 오프라인 앱·랜딩 연결도 테스트한다.

- 기본 뷰포트는 390×844, 한국어·서울 시간대다. 공통 예시 테스트는 시계를 2026-09-23 10:00으로 고정한다 (`tests/helpers.mjs`).
- 예시 거래와 가짜 은행 파일만 쓴다. 실제 금융 자료는 넣지 않는다.
- **동작을 바꾸지 않는 변경은 스냅샷도 그대로여야 한다.** 의도한 화면·계산 변경만 `npm run test:update`로 갱신하고 PR에 이유를 적는다.
- 저장 스냅샷 변화는 데이터 호환성 변경이다. 사용자 결정과 이전 자료 변환을 함께 확인한다.
- 실패하면 `test-results/`의 실제 결과·trace를 원본과 비교한다. 필요하면 별도 worktree에서 같은 기준 커밋으로 재현한다. 테스트를 건너뛰거나 기대값을 느슨하게 만들지 않는다.
- 계산 규칙 수정에는 수정 전 실패하는 회귀 테스트를 만든다. 단순 문서 편집을 위해 앱 테스트를 새로 만들지는 않는다.

```bash
npx playwright test tests/ledger.spec.mjs
npm run test:core
npm run screens
```

`screens`는 origin/main과 현재 앱을 여러 너비·다크·월별 화면·업로드 흐름에서 비교한다.
비교 전에 기준 SHA를 확인한다. CSS·화면 변경 시 최소 390px·1280px에서 확인하고 필요하면 전체 비교를 쓴다.
가끔 보이는 작은 픽셀 차이도 결과 PNG를 보고 판단한다. 반복 실패를 통과할 때까지 재실행하지 않는다.
큰 함수·CSS 정리를 돕는 도구는 `tools/hoist-inner.mjs`, `extract-block.mjs`, `function-sizes.mjs`, `css-safe-reorder.mjs`에 있다.
코드 도구가 건너뛴 변수 대입·이름 충돌·제어 흐름은 수동 검토가 필요하다.

### 검증 한계

테스트 통과가 모든 브라우저·은행 양식·저장 실패·보안·예측 정확도를 보장하지 않는다.
글자·숫자 스냅샷은 CSS 배치 전체를 검사하지 않고, 전체보기 PNG 검사도 색과 요청 오류 중심이다.
은행 대역은 국민·신한·부산·가게 계좌·이체 내역을 포함하지만 하나·우리·농협·기업·토스·PDF 실물 양식은 추가 확인이 필요하다.
크롬 밖의 Safari·카카오 브라우저, 저장 용량 초과, 모든 HTML 삽입 경로는 별도 확인 대상이다.
예측은 예시·단위 테스트의 범위까지만 검증된다. 분석 도구 성능 목표를 웹앱 예측 정확도로 소개하지 않는다.

## 배포

main에 합치면 **문서만 바뀌어도 앱과 랜딩 전체가 자동 배포된다.** main에 직접 push하지 않는다.
배포 동작의 원본은 [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)이다.

| 대상 | 위치       | 서비스·주소                                                          |
| ---- | ---------- | -------------------------------------------------------------------- |
| 앱   | `app/`     | Cloudflare Worker `namneundon-app`, `app.namneundon.com`             |
| 소개 | `landing/` | Cloudflare Pages `namneundon`, `namneundon.com`·`www.namneundon.com` |

CI가 lint·test를 통과해야 배포된다. 앱은 배포 후 `verify:prod`로 파일을 대조하고 `test:prod`를 실행한다.
랜딩은 로컬 오프라인 테스트와 별개로 배포 뒤 운영 `APP_URL`을 확인한다. 이것만으로 운영 랜딩 전체 동작이 검증되지는 않는다.
배포는 순차 실행하지만 대기 중 실행이 새 실행으로 대체될 수 있어 전체 파일을 올린다 (2026-09-25 PR #14).

토큰은 GitHub의 `CLOUDFLARE_API_TOKEN` Secret에 두고 배포 작업은 `production` Environment를 쓴다.
새 토큰이 필요하면 Cloudflare의 Workers 편집 템플릿에 Pages 편집 권한을 추가하고 대상 계정·도메인을 제한한다.
`gh secret set CLOUDFLARE_API_TOKEN`의 입력 절차를 사용하며 파일·채팅·명령 인자에 토큰을 적지 않는다.
계정 권한·2단계 인증·배포 승인 설정은 코드만으로 확인할 수 없다.

2026-09-25에는 유료 보호 규칙 대신 PR과 CI를 지키는 운영 방식을 선택했다.
이는 당시 결정 기록이며 **현재 GitHub 권한이 기계적으로 보호된다는 보장은 아니다.** 권한을 판단할 때 실제 설정을 다시 확인한다.

수동 배포는 사용자 요청이 있을 때 필요한 범위만 한다. 로컬 lint·test 확인 후 `npx wrangler login`,
`npm run deploy:app` 또는 `npm run deploy:landing`을 쓰고 실제 운영 검증 결과를 남긴다.

### 주소 변경과 복구

브라우저 저장 자료는 origin마다 다르다. 주소를 바꾸기 전에 기존 사용자 자료를 옮기는 방법이 필요하다.
2026-09-25 전환은 실사용자가 없어서 옮기기를 생략했던 사례이며 재사용 가능한 전제가 아니다.
옛 Worker `aged-rain-dbc4`의 301 이동은 당시 기록이고 현재 운영 여부는 별도 확인한다.
`namneundon-cards2`는 당시 정리 대상에서 제외했다. 이름만 보고 삭제하지 않는다.

문제가 생기면 원인 커밋을 되돌리는 PR로 복구하고 운영을 확인한다.
긴급 Cloudflare 이전 배포 복구도 가능하지만 `wrangler rollback`은 기존 문서에서 미검증으로 남아 있다.
`npm run verify:prod`와 `npm run test:prod` 결과를 확인하고 로컬 통과를 배포 완료로 적지 않는다.

## OMC

프로젝트 설정은 [.claude/settings.json](../.claude/settings.json), 관리 지침은 `.claude/CLAUDE.md`다.
2026-09-25 OMC 5.5.0을 프로젝트 범위에 설치한 기록이 있다. 현재 PC 설치 상태는 `claude plugin list`로 확인한다.
관리 파일을 손으로 고치지 않는다. 플러그인 갱신 시 공식 설정 도구로 재생성한 변경을 검토한다.

- `OMC_SKIP_HOOKS=keyword-detector`로 키워드 자동 실행을 꺼 둔다. 사용자가 직접 요청한 모드만 쓴다.
- Codex 호출·자동 교차 검수는 사용자가 이번 요청에서 명시하지 않으면 실행하지 않는다.
- 개인 권한 파일 `.claude/settings.local.json`, 캐시와 `.omc/` 실행 기록은 프로젝트 지식의 원본이 아니다.
- `.omc/`에만 있는 중요한 제품 사실은 실제 근거를 확인해 docs나 계획에 옮긴다. 대화 전문·내부 추론은 옮기지 않는다.
- 플러그인을 끄려면 `DISABLE_OMC=1 claude` 또는 `claude plugin disable oh-my-claudecode@omc --scope project`를 쓴다.

기존 설치 명령과 당시 확인 결과는 [이전 환경 안내](https://github.com/melobron/namneundon-app/blob/50342ba88af7eacdbadf03aa553366d13c92d031/docs/development/setup.md#omc)에 보존돼 있다.
이 문서의 역할 분담은 2026-09-25 사용자 결정에서 이어진다.
