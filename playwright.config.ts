import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './test/e2e',
  /* テストファイルパターン */
  testMatch: '**/*.spec.ts',
  
  /* 並行実行設定 */
  fullyParallel: true,
  
  /* CI環境での失敗時のテスト再試行 */
  retries: process.env.CI ? 2 : 0,
  
  /* 並行実行ワーカー数 */
  workers: process.env.CI ? 1 : undefined,
  
  /* レポーター設定 */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  /* 共通テスト設定 */
  use: {
    /* ベースURL */
    baseURL: 'http://localhost:3002',
    
    /* トレース設定（失敗時のデバッグ用） */
    trace: 'on-first-retry',
    
    /* スクリーンショット設定 */
    screenshot: 'only-on-failure',
    
    /* ビデオ録画設定 */
    video: 'retain-on-failure',
  },

  /* プロジェクト設定（複数ブラウザテスト） */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* モバイルテスト */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* 開発サーバー設定 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
