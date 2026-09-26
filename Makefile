# 자주 쓰는 명령 모음 — `make` 만 치면 목록이 나온다.
# 실제 일은 npm 스크립트(package.json)가 한다. 여기는 짧은 이름만 붙인다.
# Windows 처럼 make 가 없으면 오른쪽 npm 명령을 그대로 쓴다.

.DEFAULT_GOAL := help
.PHONY: help setup doctor serve test lint format test-update clean

help: ## 명령 목록
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-12s %s\n", $$1, $$2}'

setup: ## 처음 한 번 — 의존성 · 테스트용 크롬 · 커밋 전 검사 (npm run setup)
	npm run setup

doctor: ## 설치 없이 개발 환경 점검만 (npm run doctor)
	npm run doctor

serve: ## 앱 띄우기 → http://localhost:4173 (npm run serve)
	npm run serve

test: ## 불러오는 순서 + 안전망 테스트 (npm test)
	npm test

lint: ## 모양 · 린트 · CSS · HTML · 철자 · 타입 검사 (npm run lint)
	npm run lint

format: ## 코드 모양 자동 정리 (npm run format)
	npm run format

test-update: ## 일부러 화면 · 계산을 바꿨을 때만 — 스냅샷 새로 찍기
	npm run test:update

clean: ## 설치물 · 테스트 기록 지우기 (다시 make setup)
	rm -rf node_modules test-results playwright-report blob-report .wrangler
