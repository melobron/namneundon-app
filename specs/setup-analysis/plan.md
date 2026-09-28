# 구현 계획

기준: main `31ff911` (2단계 #49 머지).

기존 setup 에 Python 준비 모듈을 연결한다. 프로젝트 `.venv` 에 해시를 고정한 의존성을 설치하고,
기존 분석 코드의 자체 점검을 실행한다. 설치하지 않는 doctor 와 웹 전용 옵션도 유지한다.
Python 3.12·3.13 을 지원하며 Windows 에 없으면 공식 설치 프로그램의 SHA-256 을 검증한 뒤 실행한다.

Google Drive 의 기존 v3 분석 코드·기본 설정만 가져온다. 설치는 init·freeze·demo 를 실행하지 않는다.
분석 CLI 와 Jupyter 는 가상 환경 활성화 없이 npm 명령으로 실행한다.
실제 자료 없이 Excel·Parquet 왕복, 통계·그래프, 전용 커널·Jupyter 응답을 검사한다.
Windows CI 는 공식 Python 설치 경로, setup, doctor, 분석 점검, 웹 전체 테스트를 실행한다.
