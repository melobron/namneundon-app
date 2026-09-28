# 구현 계획

- 상태: Draft
- 기준: main `302ea60`, 별도 worktree 의 `codex/vdi-offline`

1. 포트 4173 에 앱, 4174 에 소개 사이트를 loopback 으로 제공한다. HTML 응답에서 자사 사이트 주소만 바꾼다.
2. vdi.cmd 로 실행·검증·테스트·분석 명령을 묶는다.
3. Windows 준비 스크립트로 공식 Node·Python 과 잠금 파일의 npm 의존성, Chromium 을 폴더 안에 받는다. 설치 실패를 즉시 전파한다.
4. Windows Actions 에서 추적 파일만 복사한 뒤 준비·검사한다. Python 분석 라이브러리를 포함하고 경로를 옮겨 재검증한다. 배포와 별개인 다운로드 artifact 를 만든다.
5. 분석도구는 코드·설정만 든 기존 v3 압축을 사용한다. 개인정보·사업 원본·계정은 포함하지 않는다.
6. Linux/macOS 검사와 Windows 묶음 검증, 원격 VDI 미확인 사항을 기록한다.
