# 개발 환경

## 필요한 것

| 무엇     | 버전 · 근거                                                                                   |
| -------- | --------------------------------------------------------------------------------------------- |
| Node.js  | **24** (`.nvmrc`, CI 도 이것을 쓴다). `package.json` 의 `engines` 는 `>=22`                   |
| npm      | Node 에 딸린 것. 의존성은 `package-lock.json` 으로 고정 (`npm ci`)                            |
| 크롬     | 테스트용 Chromium — `npm run setup` 이 받는다 (이미 있으면 건너뜀)                            |
| gitleaks | 선택. 있으면 커밋 전 비밀 값 검사를 한다 (`brew install gitleaks`). 없으면 CI 에서만 검사한다 |

의존성은 모두 **개발 도구**(테스트 · 검사 · 배포)다. 앱 자체는 npm 패키지를 쓰지 않는다 — `app/` 안의 파일이 전부다.

## 처음 한 번

```bash
nvm use            # .nvmrc 의 24
make setup         # 또는 npm run setup
```

`make` 만 치면 명령 목록이 나온다. `Makefile` 은 npm 스크립트에 짧은 이름을 붙인 것뿐이라, `make` 가 없는 Windows 에서는 `npm run …` 을 쓰면 된다.

`npm run setup`(`tools/setup.mjs`)이 하는 일 — 몇 번을 다시 돌려도 된다:

1. **도구 점검** — Node 판(`engines` 보다 낮으면 멈추고 `nvm` 명령을 알려 준다, `.nvmrc` 와 다르면 경고) · git · gitleaks(선택)
2. **`npm ci`** — `package-lock.json` 그대로 설치. `prepare` 스크립트가 husky 를 켜 커밋 전 검사(`.husky/pre-commit`)가 돈다
3. **테스트용 Chromium** — Playwright 판에 맞는 것이 없을 때만 받는다. 받지 않으려면 `node tools/setup.mjs --skip-browser`
4. **`npm run check`** — 불러오는 순서 · core 규칙 검사

무엇이 빠졌는지만 보려면 `make doctor`(= `npm run doctor`). 아무것도 설치하지 않는다.

## 실행

```bash
npm run serve      # app/ 을 그대로 내준다 → http://localhost:4173
```

빌드가 없으니 파일을 고치고 새로고침하면 된다. 예시 자료는 「예시 먼저 보기」로 볼 수 있다.
실제 은행 파일로 확인할 때는 파일을 **저장소 밖**(또는 `.gitignore` 된 `/data/`)에 둔다.

자주 쓰는 명령은 [README](../../README.md#주요-명령), 검사는 [quality](quality.md), 테스트는 [testing](testing.md), 배포는 [deployment](deployment.md).

## 인터넷이 없는 Windows VDI

[VDI 오프라인 준비](vdi-offline.md)에서 실행 환경이 포함된 다운로드 묶음과 명령을 확인한다.

## worktree

**코드를 고치는 작업은 자기 전용 worktree 에서 하고, 원래 폴더에서 가지를 바꾸지 않는다** ([AGENTS.md](../../AGENTS.md#작업-전에-확인)).
두 세션(사람 · AI)이 같은 폴더에서 브랜치를 바꾸면 미커밋 변경이 서로의 브랜치에 섞인다 — 2026-09-25 에 실제로 겪었다.

```bash
# 원래 폴더에서 (가지는 바꾸지 않는다)
git fetch origin
git worktree add ../테스트배드-<주제> -b <가지> origin/main   # 새 폴더에 새 가지
cd ../테스트배드-<주제>
npm ci                                                        # node_modules 는 worktree 마다 따로다
```

| 원본 폴더와 다른 것                         | 할 일                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `node_modules/` 가 없다                     | `npm ci` (Playwright 크롬은 사용자 캐시에 있어 다시 받지 않아도 된다) |
| 한 브랜치는 한 worktree 에서만 꺼낼 수 있다 | 다른 폴더에서 쓰고 있으면 그쪽에서 먼저 다른 브랜치로 옮긴다          |
| `.omc/` (OMC 실행 상태)가 따로 생긴다       | worktree 를 지우면 같이 지워진다. 남길 것은 `docs/` · `specs/` 에     |
| `.claude/settings.local.json` 이 없다       | 개인 권한 설정이라 필요하면 따로 만든다                               |

끝나면 `git worktree remove ../테스트배드-<주제>`. Codex 가 만드는 worktree(`~/.codex/worktrees/…`)도 같은 저장소의 다른 폴더다 — 작업 경로를 먼저 확인한다.

## OMC

Claude Code 용 [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)(에이전트 · 스킬 · 훅 모음)를 **이 프로젝트 범위로만** 켜 둔다. 역할과 경계는 [CLAUDE.md](../../CLAUDE.md#omcoh-my-claudecode-와의-경계).

### 설치한 것 (2026-09-25, OMC 5.5.0)

```bash
claude plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode --scope project
claude plugin install oh-my-claudecode@omc --scope project
# omc-setup 의 --local 과 같은 일 (공식 설정 스크립트)
CLAUDE_PLUGIN_ROOT=~/.claude/plugins/cache/omc/oh-my-claudecode/5.5.0 \
  bash ~/.claude/plugins/cache/omc/oh-my-claudecode/5.5.0/scripts/setup-claude-md.sh local
```

- 설정 스크립트는 끝에 「Plugin NOT found」를 찍는다. 사용자 범위 설정(`~/.claude/settings.json`)만 살피는 검사라서, 프로젝트 범위 설치를 못 알아본 것이다. `claude plugin list` 에서 `Scope: project` · `enabled` 로 확인된다.
- 사용자 전역 설정(`~/.claude/settings.json`, `~/.claude/CLAUDE.md`)은 바꾸지 않았다. 전역 `omc-setup --global`, HUD 상태줄, 팀 모드용 전역 환경 변수도 설정하지 않았다.

### 파일의 성격

| 파일                            | 성격                      | 커밋  | 비고                                                                         |
| ------------------------------- | ------------------------- | ----- | ---------------------------------------------------------------------------- |
| `.claude/settings.json`         | 프로젝트 설정             | 한다  | 마켓플레이스 · 플러그인 켜기, `OMC_SKIP_HOOKS`                               |
| `.claude/CLAUDE.md`             | OMC 가 관리하는 지침      | 한다  | `OMC:START` ~ `OMC:END`. 손으로 고치지 않는다 (Prettier 에서도 뺐다)         |
| `.claude/settings.local.json`   | 개인 설정 (권한 등)       | 안 함 | `.gitignore`                                                                 |
| `.claude/skills/wiki/`          | 설정 스크립트가 둔 사본   | 안 함 | 플러그인이 같은 스킬을 준다. `.gitignore`                                    |
| `.omc/*`                        | 실행 상태 · 메모 · 로그   | 안 함 | 세션 기록 · 프롬프트가 들어갈 수 있다. `.gitignore` (`.omc/skills/` 만 예외) |
| `.git/info/exclude` 의 OMC 블록 | 개인 제외 규칙            | —     | 설정 스크립트가 넣었다. 이 폴더에서만 적용                                   |
| `~/.claude/plugins/…`           | 플러그인 설치 파일 · 캐시 | —     | 저장소 밖                                                                    |

### 켜 둔 것 · 꺼 둔 것

- **꺼 둠: `keyword-detector` 훅** (`.claude/settings.json` 의 `env.OMC_SKIP_HOOKS`). 이 훅은 프롬프트에 `autopilot` · `ralph` · `tdd` 같은 낱말이 있으면 해당 모드를 자동으로 켠다. 자율 실행이 기본 동작처럼 켜지지 않도록 껐다. 모드는 `/oh-my-claudecode:autopilot` 처럼 **직접 불러야** 켜진다.
- **기본값 그대로 꺼짐: 코드 자동 정리 훅**(`code-simplifier`) — `~/.omc/config.json` 에서 켜야만 돈다. 켜지 않는다.
- 나머지 훅(세션 시작 · 도구 사용 전후 · 정지 · 압축 전)은 켜져 있다. 훅 스크립트를 읽어 본 결과 Codex 를 부르는 훅은 없다 — Codex 는 `/ask codex`, `omc team N:codex` 처럼 **사람이 명령할 때만** 쓰인다. 이 프로젝트에서는 그 명령을 쓰지 않는다 ([CLAUDE.md](../../CLAUDE.md)).
- OMC 를 통째로 끄려면 셸에서 `DISABLE_OMC=1 claude`, 또는 `claude plugin disable oh-my-claudecode@omc --scope project`.

### 다른 사람 · 다른 기기에서

- 이 저장소를 Claude Code 로 열고 폴더를 신뢰하면 `.claude/settings.json` 의 마켓플레이스 · 플러그인 설정 때문에 OMC 설치를 권한다. 설치하면 위와 같은 설정으로 돈다.
- `.claude/CLAUDE.md` 를 새 버전으로 바꾸려면: `/plugin marketplace update omc` → 위 설정 스크립트를 다시 돌린다 → 바뀐 내용을 검토하고 커밋한다.
