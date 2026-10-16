# 아키텍처 — 지금 모습

> 현재 코드의 구조를 설명한다. 변경 계획은 [plans/](../plans/)에 둔다.
> 확인 기준: 2026-09-29, main `50342ba`의 파일과 설정.

## 한눈에

- 고객 앱에는 서버 코드가 없다. `app/` 폴더의 정적 파일(HTML · CSS · JS · 이미지)을 Cloudflare 가 그대로 내준다. 팀 전용 대시보드 · 짧은 링크 Worker(`services/`)는 고객 앱과 따로다 — 아래 「유입·사용 집계 경계」.
- 빌드 · 번들 · 트랜스파일 단계가 없다. 저장소의 파일이 곧 배포되는 파일이다.
- 앱 JS 는 **모듈이 아닌 일반 `<script>` 32개**(`core/` 13 + `src/` 19)다. 한 파일이었던 것을 나눈 것이라 모든 최상위 `function` · `var` 가 전역이다.

## 폴더와 경계

| 폴더 · 파일        | 무엇                                                                                            | 어디로 가나                                  |
| ------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `app/`             | 앱 전부                                                                                         | Worker `namneundon-app` → app.namneundon.com |
| `landing/`         | 소개 페이지 (한 장짜리 HTML · 404 · 이미지 · robots · sitemap)                                  | Pages `namneundon` → namneundon.com          |
| `tests/`           | Playwright 안전망 테스트 · 스냅샷 · 테스트용 정적 서버(`serve.mjs`)                             | 배포 안 됨                                   |
| `tools/`           | 개발 도구 (`check-load-order.mjs`, `check-core.mjs`, `typecheck-app.mjs`, `analyze-purity.mjs`) | 배포 안 됨                                   |
| `.github/`         | CI · 자동 배포 · 비밀 값 검사 · 의존성 업데이트                                                 | —                                            |
| `wrangler.jsonc`   | 앱 Worker 설정 (정적 자산만, 서버 코드 없음)                                                    | —                                            |
| `docs/` · `plans/` | 현재 지식 · 진행 중 작업 계획과 틀                                                              | 배포 안 됨                                   |
| `services/`        | 팀 대시보드 Worker(`usage-dashboard/`) · 짧은 링크 Worker(`short-link/`) · 공통 규칙 · 글 목록  | 아직 배포 안 됨 (각자 `wrangler.jsonc`)      |
| `team-dashboard/`  | 팀 대시보드 화면 (HTML · CSS · ES 모듈). 고객 앱 폴더에 넣지 않는다                             | 아직 배포 안 됨 (`usage-dashboard` 가 낸다)  |

`analysis/`는 테스트베드용 Python 분석 코드·기본 설정·고정 의존성이다. 웹 배포에 포함되지 않고
웹앱의 서버도 아니다. 실행 절차와 평가 규칙은 [analysis/README.md](../analysis/README.md)에 둔다.

랜딩과 앱은 코드를 나눠 쓰지 않는다. 랜딩은 「시작하기」 링크(`APP_URL`)로 앱 주소만 알고, 홍보 글 코드(`?s=`)가 있으면 그 링크에 붙여 넘긴다.

## `app/` 안

```
app/
├─ index.html            뼈대 + CSS · JS 를 차례로 불러온다
├─ css/app.css           화면 모양 전부
├─ src/core/*.js         순수한 계산 (화면 · 저장소에 닿지 않는다). 맨 앞에 불러온다
├─ src/00-…18-*.js       앱 코드. 번호 순서 = 불러오는 순서
├─ xlsx.full.min.js      엑셀 읽기 (SheetJS) — 필요할 때만 불러온다
├─ pdf.min.js · pdf.worker.min.js   PDF 읽기 (PDF.js) — 필요할 때만
├─ sw.js                 아무것도 캐시하지 않는 서비스 워커 (홈 화면 설치 조건용)
├─ manifest.json · icon-*.png       홈 화면 설치(PWA)
├─ _headers              Cloudflare 캐시 규칙 (index.html · src · css 는 no-store)
└─ robots.txt            검색 노출 차단
```

### `src/core/` — 순수한 계산

**화면 · 저장소 · 바뀌는 전역(`UP`)에 닿지 않는 계산**만 둔다. 같은 입력이면 늘 같은 답이 나오고,
화면 없이 **Node 에서도 돈다** — 단위 테스트(`tests/core/`)와 테스트베드 VDI 계산에 쓴다.

| 파일                  | 하는 일                                                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/date.js`        | 날짜 → 날 번호 (`dayNum`, `dayMs`)                                                                                                                                                        |
| `core/verify.js`      | 잔액 검산, 뒤바뀐 순서 바로잡기, 파일에 적힌 조회 기간 (옛 `05-verify.js`)                                                                                                                |
| `core/parse-excel.js` | 은행 엑셀 · HTML 표 → 거래 행 (머리글 · 열 찾기, 숫자 · 날짜 해석, 은행 이름) (옛 `03-parse-excel.js`)                                                                                    |
| `core/parse-pdf.js`   | PDF 글자 조각 → 표 → 거래 행, PDF 합계 확인 (옛 `04-parse-pdf.js`)                                                                                                                        |
| `core/classify.js`    | 거래처 묶기(년월 · (주) 떼기), 이름으로 항목 짐작, 거래처별 항목 다루기 (옛 `06-classify.js`)                                                                                             |
| `core/compute.js`     | 월별 집계(`monthNumbersIn`), 계좌 간 이체, 잔액, 예측 기초, 매출 전망 — 매장 자료를 매개변수 `U` 로 받는다 (옛 `14-compute.js`)                                                           |
| `core/due.js`         | 예상 잔액의 계산 부품 — 일별 예상 지출 · 입금 · 자료 범위 · 미정 출금 · 목표일 · 예정 지출 셈 · 잔액 표 · 예측 카드 · 곡선 · 그래프 점 (옛 `16-due.js`. 캐시·저장소는 창구 `E` 로 받는다) |
| `core/onboard.js`     | 처음 분류(온보딩)의 계산 부품 — 이름 다듬기 · 사람 이름 가리기 · 개인 · 대출 짐작 · 비슷한 이름 · 묶음 · 묻는 차례 · 목표선 (옛 `13-onboard.js` 의 일부)                                  |
| `core/result.js`      | 결과 화면 · 1년치 그래프의 계산 부품 — 볼 달 고르기 · 달 이름 · 사업 외 목록 · 그래프 눈금 · 하루 흐름 · 문 열기 전 달 (옛 `15` · `17` · `18` 의 일부)                                    |
| `core/text.js`        | 조사 · HTML 막기 (옛 `02` · `11` 의 일부)                                                                                                                                                 |
| `core/categories.js`  | 항목 이름 — 업종별 기본 · 잠긴 항목 · 같은 이름 찾기 (옛 `07` 의 일부)                                                                                                                    |
| `core/files.js`       | 올린 파일 판별 — PDF · HTML · 은행 이름 · 겹치는 거래 · 못 읽은 까닭 글 (옛 `10` · `11` 의 일부)                                                                                          |
| `core/saved.js`       | 저장 자료 모양 검사 · 옛 판 항목 옮기기 · 저장 서명 (옛 `07` · `12` 의 일부 — 읽고 쓰기는 그대로 `00` · `12`)                                                                             |

- core 파일은 `index.html` 에서 **맨 앞**에 불러온다.
- `npm run check` 가 core 규칙을 지킨다 (`tools/check-core.mjs`) — core 밖의 이름, 브라우저 기능, 지금 시각 · 난수, 최상위 값 바꾸기를 막는다.
- Node 에서 불러오기: `tests/core/load-core.mjs` 의 `loadCore()`.
- 어떤 함수가 순수한지: `npm run purity` (`tools/analyze-purity.mjs`, `--why 함수이름` 으로 이유).

### `src/` 파일

| 파일                     | 하는 일                                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `00-storage.js`          | **브라우저 저장소의 모든 것** — 저장 이름 표, 매장별 저장 이름, 읽기 · 쓰기 함수(탭 저장 `ssGet` · `ssSet` 포함). 다른 파일은 `localStorage` · `sessionStorage` 를 직접 쓰지 않는다 (ESLint 가 막는다) |
| `00-early.js`            | 첫 화면부터 필요한 함수 (연 날 기록)                                                                                                                                                                   |
| `01-biz-demo.js`         | 업종별 문구(`BIZ`), **예시 거래(`DEMO_TX`)** 와 예시 분류                                                                                                                                              |
| `02-text-loaders.js`     | 금액 · 조사 표기, 엑셀 · PDF 도구를 필요할 때 불러오기                                                                                                                                                 |
| `03-usage-config.js`     | 이용 단계 집계 설정 `USAGE_CONFIG` (수신 주소 · 보관 기간 · 문의처). **비어 있으면 집계 · 집계 안내가 모두 꺼진다** — 지금 비어 있다                                                                   |
| `04-usage-events.js`     | 이용 단계 집계 창구 `USAGE` (단계 이름만 받는다) · 데이터 처리 안내. 탭 저장 `nd.analytics.v1` 만 쓴다                                                                                                 |
| `06-classify.js`         | 연결 함수 `groupPayees` · `keyOf` (계산은 `core/classify.js`)                                                                                                                                          |
| `07-state-categories.js` | 앱 상태 `UP` 선언, 항목 · 업종 정의                                                                                                                                                                    |
| `08-ui-start-upload.js`  | 시작 화면, 업로드 창                                                                                                                                                                                   |
| `09-ui-panel-install.js` | 글씨 크기, 창 열고 닫기, 홈 화면 설치 · 카톡 안내                                                                                                                                                      |
| `10-demo-read-files.js`  | 예시 시작, 파일 읽기, 은행 알아보기                                                                                                                                                                    |
| `11-upload-flow.js`      | 파일 목록, 시작하기(`UP` 만들기), 잔액 끊김 확인 카드                                                                                                                                                  |
| `12-storage.js`          | 저장 · 불러오기, 사용 기록, 직접 넣은 금액                                                                                                                                                             |
| `13-onboard.js`          | 매장 이름 · 대표자, 거래처 확인(차례로 정하기) 화면 · 저장 (계산은 `core/onboard.js`)                                                                                                                  |
| `14-compute.js`          | 연결 함수 (`monthNumbers` 등 → `core/compute.js` 의 `…In(UP, …)`)                                                                                                                                      |
| `15-result-panels.js`    | 결과 보여주기, 항목 관리, 분류 내보내기 · 불러오기, 매장 이름 바꾸기                                                                                                                                   |
| `16-due.js`              | 예상 잔액의 캐시(`dueTable`) · 예정 지출 저장(`planBox`) · 창구 `DUE_ENV` · 카드 · 그래프 그리기                                                                                                       |
| `17-result.js`           | 결과 화면 본문(`drawResultInner`), 확인 카드                                                                                                                                                           |
| `18-charts-year.js`      | 그래프, 1년 보기. **맨 끝에서 앱을 시작한다** (`startDemo()` → `drawStart()`)                                                                                                                          |

## 흐름 — 입력에서 화면까지

```mermaid
flowchart LR
    F["파일<br/>xlsx · xls · html · pdf"] --> R["읽기<br/>10 readAnyOne"]
    R --> P["파싱<br/>core/parse-excel · parse-pdf"]
    P --> V["검산 · 순서<br/>core/verify"]
    V --> UP[("UP<br/>전역 상태")]
    UP --> C["분류<br/>06 · 13"]
    C --> UP
    UP --> K["계산<br/>14 · 16"]
    K --> D["화면<br/>15 · 17 · 18"]
    S[("localStorage")] <-->|12 · 00-storage| UP
```

| 단계 | 코드                                                                                      | 결과                                |
| ---- | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| 입력 | `10-demo-read-files.js` (`readAnyOne` · `readOnePdf`), 라이브러리는 `02` 가 늦게 불러온다 | 파일마다 표                         |
| 파싱 | `core/parse-excel.js` · `core/parse-pdf.js`                                               | 계좌(`banks`)별 거래 행             |
| 검산 | `core/verify.js`                                                                          | 순서 바로잡은 행, 끊긴 곳(`breaks`) |
| 상태 | `11-upload-flow.js` 가 `UP = {…}` 를 새로 만든다. 예시는 `10` 의 `startDemo`              | `UP.rows` · `UP.banks` 등           |
| 분류 | `core/classify.js` (묶기 · 자동 분류) → `13-onboard.js` (사용자에게 묻기) → `12` 저장     | `UP.payees` · `UP.byName`           |
| 계산 | `core/compute.js` `monthNumbersIn(U, m, cutDay)`, `16-due.js` 예상 잔액                   | 달마다 숫자 객체                    |
| 표시 | `15` · `17` (`drawResultInner`) · `18`                                                    | DOM                                 |

계산 규칙 자체는 [제품과 계산 규칙](product.md) 에 있다.

## 의존 관계 — 지금 모습의 특징

- **전역 상태 `UP`.** `07` 에서 `var UP = null` 로 선언하고, 파일을 올리거나 예시를 열 때 통째로 새로 만든다. 계산 함수(`monthNumbers` 등)는 인자가 아니라 `UP.rows` · `UP.byName` 을 직접 읽는다. 리팩토링 B-1e 부터 집계는 **`UP` 를 첫 매개변수 `U` 로 받는 core 함수**(`monthNumbersIn(U, 달)` 등)로 옮겼고, 원래 이름은 `UP` 를 넘기는 연결 함수로 남았다 — 그래서 Node 에서 매장 자료만 넘기면 같은 숫자가 나온다. 파일 해석 · 검산 · 분류 · 집계 · 예측 계산이 `core/`에 있고, 파일 입출력·저장·화면 처리는 앱 계층에 남아 있다. 거래처 묶기는 합치기 규칙표를 `UP.merge` 에서 꺼내던 것을 매개변수로 받게 바꿨다 (`groupPayeesWith(rows, merge)`, 앱의 `groupPayees` 는 연결 함수).
- **DOM 직접 조작.** 화면은 문자열로 HTML 을 만들어 `innerHTML` 에 넣는 방식이 많다. 밖에서 온 글자(파일 이름 등)는 이스케이프해야 한다 — `tests/security.spec.mjs` 가 파일 이름 한 곳을 지킨다.
- **저장소 한 길.** 모든 저장은 `00-storage.js` 의 함수를 거친다 (B-2, PR #17). `localStorage` 를 직접 쓰면 ESLint 가 막는다. 동기 호출이라 화면을 그리기 전에 값이 있다. 저장이 막혀도 앱은 메모리로 돈다. 여러 통을 함께 옮길 때(매장 이름 바꾸기)는 실패를 숨기지 않는 `lsRead` · `lsWriteAll` · `lsDropAll` 을 쓴다 (NAM-14·15).
- **불러오는 순서.** 각 파일은 불러오는 순간 일부 코드를 실행한다. 그때 뒤 파일의 이름을 쓰면 `ReferenceError` 다. `tools/check-load-order.mjs` 가 파일마다 「즉시 실행되는 코드」에서 출발해 부르는 함수 안까지 따라가며 찾는다 (클릭 처리 등 나중에 도는 콜백은 따라가지 않는다).
- **서비스 워커**는 요청을 가로채지 않는다 (`respondWith` 없음). 옛 화면이 남는 문제는 HTTP 캐시 쪽이라 `_headers` 로 다룬다.

```mermaid
flowchart TD
    subgraph 브라우저
      H["index.html"] -->|차례로| JS["src/core · 00 … 18<br/>전역 함수 · 변수"]
      JS --> UP[("UP")]
      JS --> DOM["DOM<br/>innerHTML"]
      JS --> LS[("localStorage<br/>00-storage")]
      JS -.필요할 때.-> LIB["xlsx.full.min.js<br/>pdf.min.js"]
    end
    CF["Cloudflare<br/>정적 파일"] --> H
```

## 유입·사용 집계 경계

NAM-20 · 21 · 22 (2026-09-29). **코드는 있지만 운영에서는 아직 켜지지 않았다** — 앱의 수신 주소가 비어 있고, 두 Worker 는 배포하지 않았으며, 대시보드는 집계 원본에 연결되지 않았다.

```mermaid
flowchart LR
  P[홍보 글] --> S["짧은 링크 /t/D08<br/>services/short-link"]
  S --> L["소개 페이지 ?s=D08"]
  L --> A["고객 앱 ?s=D08<br/>03 · 04"]
  A -->|"{ step, s } 만"| E["수신 /ev<br/>기존 서버 · 미연결"]
  E --> C[날짜 · 글 · 단계별 건수]
  T[팀원] --> X[Cloudflare Access]
  X --> D["services/usage-dashboard<br/>화면 + /api/usage"]
  D -.원본 연결 전 503.-> C
```

- 고객 앱은 단계 이름과 글 코드만 보낸다. `UP` · 파일 · 사용 기록(`fc_use`)은 집계 창구에 들어가지 않는다. 보내기는 기다리지 않고, 실패해도 분석은 계속된다.
- 결과 단계는 새 파일로 만든 `UP` 객체를 `USAGE.markNew` 로 표시해 두고 그 객체의 결과가 처음 그려질 때만 센다 (`startFromBanks` · `drawResult`). 예시 · 저장본 되살리기 · 다시 그리기는 세지 않는다.
- 팀 대시보드 Worker 는 모든 요청(화면 파일 포함)에서 Access 토큰의 서명 · aud · iss · 만료를 확인한다(`services/access-auth.js`). 설정이 비면 모두 막는다. 집계 원본 어댑터가 없으면 조회는 503 이다.
- 짧은 링크 Worker 는 `services/campaigns.js` 에 등록한 코드만 소개 페이지로 302 한다. Pages `_redirects` 는 리디렉트 응답에 `_headers` 를 붙이지 않아 no-store 를 보장하지 못해 쓰지 않았다.
- 규칙(`services/usage-rules.js`)과 표시 규칙(`team-dashboard/view.js`)은 Node 에서 시험한다 (`tests/usage/`).

## 테스트 · 검사 · 배포와의 경계

- 테스트는 `tests/serve.mjs` 가 `app/` 을 그대로 내주고, Playwright 가 실제 크롬으로 연다. 앱 코드는 테스트를 위해 따로 내보내는 것이 없다 — 테스트는 전역 함수(`monthList` · `monthNumbers` 등)를 `page.evaluate` 로 부른다. **그래서 이 전역 이름들은 테스트가 기대는 인터페이스이기도 하다.**
- 타입 검사 · 린트는 `app/src` 를 한 묶음으로 본다 (`tsconfig.app.json`, `eslint.config.mjs` 가 모든 파일의 최상위 이름을 「공용 전역」으로 알려준다).
- 배포는 `app/` 과 `landing/` 을 그대로 올린다 ([배포](development.md#배포)).

## 구조를 이렇게 유지하는 이유

- **빌드 없는 배포**: PR #2에서 한 파일을 나눌 때 배포 파일과 저장소 파일을 같게 유지했다. 2026-09-25 공통 규칙으로 명시했다. 번들러·프레임워크·모듈 체계 변경은 별도 계획과 사용자 결정이 필요하다.
- **계산과 화면 분리**: B-1 리팩토링에서 계산을 Node에서도 실행할 수 있게 옮겼다. 브라우저의 기존 전역 함수는 연결 함수로 유지해 호출과 테스트 호환성을 지킨다. `whyOpen`·`whyKey` 같은 펼침 상태는 화면 계층에 둔다.
- **큰 화면 함수 분리**: B-4는 동작을 유지하면서 함수를 나누는 작업이었다. 전역 상태 전체를 하나로 모으는 일은 사용자 요청으로 제외했다. 예정 지출 창은 창 상태를 매개변수로 전달한다.
- **저장소 접근 통합**: `00-storage.js`가 유일한 읽기·쓰기 경로다. 서버 동기화가 이미 결정됐다는 뜻은 아니다.

기존 명세의 승인·검증 기록은 [이전 명세 이력](https://github.com/melobron/namneundon-app/blob/50342ba88af7eacdbadf03aa553366d13c92d031/specs/README.md)에 남아 있다.
온보딩·결과·나머지 계산 분리는 PR #27·#28·#29, 화면 함수 분리는 PR #34·#35·#36·#37·#43·#45에 기록돼 있다.
이는 과거 기록의 위치이며 이번 문서 정리에서 당시 배포나 화면 비교를 다시 수행한 것은 아니다.
