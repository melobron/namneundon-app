// 안전망 테스트 설정.
// 리팩토링 중에는 「화면과 숫자가 하나도 안 바뀌었다」를 이 테스트로 확인한다.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.mjs/,
  // 스냅샷은 글자(JSON·화면 글)라 운영체제와 관계없이 같다. 파일 이름에 OS를 붙이지 않는다
  snapshotPathTemplate: '{testDir}/snapshots/{testFileName}/{arg}{ext}',
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    // BASE_URL 을 주면 배포된 사이트를 검사한다: BASE_URL=https://app.namneundon.com npx playwright test
    baseURL: process.env.BASE_URL || 'http://localhost:4173',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    viewport: { width: 390, height: 844 }, // 사장님들이 주로 쓰는 휴대폰 너비
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node tests/serve.mjs',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI
  }
});
