# VDI 오프라인 준비

Windows x64 용이다. 인터넷이 끊겨도 앱 · 소개 사이트 · 코드 검사 · 자동 테스트 · 분석도구를 현재 폴더에서 실행한다. 실제 VDI 에서 보안 프로그램이 실행을 허용하는지는 별도 확인해야 한다.

## 가장 쉬운 방법: 준비된 묶음

1. 인터넷이 되는 동안 [GitHub Actions](https://github.com/melobron/namneundon-app/actions/workflows/vdi-offline.yml) 에서 성공한 실행을 연다. 비공개 저장소이므로 GitHub 로그인이 필요하다.
2. 아래 Artifacts 의 `namneundon-vdi-windows-x64` 를 내려받는다. 일반 Code → Download ZIP 에는 설치 의존성이 없다.
3. 다운로드 압축을 풀고, 안의 `namneundon-vdi-windows-x64.zip` 도 짧은 경로(예: `C:\vdi`)에 푼다. 다운로드 화면에 표시된 소스 커밋을 확인한다. 체크섬은 동봉한 `SHA256.txt` 와 `Get-FileHash` 로 대조할 수 있다.
4. 해당 폴더에서 PowerShell 을 열어 순서대로 실행한다.

```powershell
.\vdi.cmd verify
.\vdi.cmd analysis
.\vdi.cmd start
```

첫 명령은 외부 요청을 차단한 새 테스트 브라우저로 앱 예시 계산과 소개 페이지를 검사한다. 둘째는 분석도구 자체 검사다. 셋째는 서버를 계속 켜 둔다.

- 앱: <http://localhost:4173>
- 소개 사이트: <http://localhost:4174>
- 종료: 서버가 켜진 창에서 `Ctrl+C`

브라우저 주소에 직접 입력한다. HTML 을 더블 클릭하지 않는다. 서버는 이 컴퓨터의 `127.0.0.1` 에만 열린다. 운영 페이지의 앱·소개 링크는 응답할 때 로컬 주소로 바뀐다. 원본 파일과 사용자 저장 자료 형식은 바꾸지 않는다.

묶음에는 Node 24, npm 의존성·캐시, Chromium, Python 3.12.10, 분석도구 v3, 주요 분석 라이브러리와 JupyterLab 이 있다. 전체 폴더를 유지해야 한다. `.offline/` 에 실행 환경과 분석 작업이 있다. 다운로드와 압축 해제를 위해 수 GB 여유 공간을 확보한다.

## 다른 명령

| 명령                      | 용도                                                               |
| ------------------------- | ------------------------------------------------------------------ |
| `.\vdi.cmd test`          | 앱 자동 테스트 (메모리 부담을 줄여 작업자 2개)                     |
| `.\vdi.cmd lint`          | 코드 · 형식 · 타입 검사                                            |
| `.\vdi.cmd restore`       | 확보한 npm 캐시로 오프라인 재설치. 기존 node_modules 를 재생성한다 |
| `.\vdi.cmd analysis demo` | 가짜 데이터로 분석 흐름 연습                                       |
| `.\vdi.cmd notebook`      | 로컬 JupyterLab 실행                                               |
| `.\vdi.cmd python`        | 포함한 Python 실행                                                 |
| `.\vdi.cmd shell`         | Node · Python 경로가 설정된 명령 창                                |

노트북은 새 PowerShell 창에서 아래 명령으로 연다. 출력된 로컬 접속 주소를 같은 VDI 의 브라우저에 입력한다. 인증 토큰은 외부에 공유하지 않는다.

```powershell
.\vdi.cmd notebook
```

분석도구는 `.offline\analysis\dtestbed_v3\README.md` 를 먼저 읽는다. 실제 자료에 대한 `init`, 분할, 동결은 준비 스크립트에서 자동 실행하지 않는다. `analysis` 명령은 자체 검사만 한다. 패키지 버전 기록은 `.offline\python-requirements.txt`, 소스 커밋은 `.offline\SOURCE_COMMIT.txt` 에 있다.

## 준비된 묶음을 못 받는 경우

같은 브랜치의 코드 ZIP 을 받은 뒤 **인터넷이 되는 동안** 실행한다.

```powershell
.\vdi.cmd prepare
```

Node · npm 패키지 · Chromium · 표준 라이브러리용 Python · 분석도구를 받는다. 관리자 설치나 시스템 PATH 변경은 하지 않는다. Node 는 공식 체크섬, Python 실행 파일은 서명을 확인한다. 오프라인 검증, 분석 자체 검사, 린트, 앱 테스트, 캐시만으로 재설치가 모두 성공해야 `.offline\READY.txt` 를 만든다.

이 대체 방법에는 pandas 등 추가 Python 패키지와 JupyterLab 이 포함되지 않는다. 추가 라이브러리까지 필요하면 위의 준비된 묶음을 받는다. PowerShell 정책 또는 VDI 보안 프로그램이 차단하면 관리자에게 허용된 설치·반입 방법을 문의한다.

## 확인 범위와 한계

- GitHub 의 Windows 에서 설치·테스트 후 폴더를 옮겨 다시 검증한다. VDI 자체 검증을 대신하지 않는다. 준비 완료 표시는 마지막 준비 시점의 결과이며 이후 코드 변경의 통과를 보장하지 않는다.
- 앱의 예시 계산·소개 화면은 외부 요청을 차단한 상태에서 검사한다. 전체 자동 테스트는 별도로 실행한다. 확인하지 않은 모든 은행 파일 조합까지 보장하는 것은 아니다.
- GitHub · Cloudflare 배포 · ChatGPT/Codex 같은 온라인 AI · 카카오 상담 · 외부 사이트 링크는 인터넷이 필요하다. 링크 대상 서비스 자체를 복제하지 않는다.
- Git, VSCode 와 확장 프로그램은 묶음에 없다. VDI 에 설치된 편집기를 사용한다. 추가 프로그램은 인터넷 개방 기간에 준비한다.
- macOS 의 node_modules 를 Windows 로 옮기지 않는다. Windows 묶음은 Windows x64 환경에서 만든다.
- 실제 데이터 · 접속 비밀번호 · 개인 브라우저 프로필은 묶음에 넣지 않는다. 공유 폴더에 전체 결과물을 재업로드하지 않는다. VDI 의 반입·반출 절차는 그대로 적용된다.
- localhost 의 브라우저 저장 공간은 운영 사이트와 별개다. 매번 같은 주소·포트·브라우저 프로필을 사용한다.
- 압축의 분석도구는 기존 2026-09-21 v3 원본이다. 보관용 사업 문서와 실제 데이터는 포함하지 않았다.

공식 참고: [Playwright 브라우저 보관 경로](https://playwright.dev/docs/browsers), [Python Windows 내장 배포판](https://docs.python.org/3/using/windows.html).
