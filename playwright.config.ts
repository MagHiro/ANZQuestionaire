import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:3199' },
  webServer: [
    {
      command: 'pnpm exec tsx scripts/test-database.ts',
      port: 55439,
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'pnpm exec next start -p 3199',
      env: {
        DATABASE_URL: 'postgresql://test:test-local-only@127.0.0.1:55439/postgres',
        APP_URL: 'https://questionnaire.example',
        SETTINGS_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
      url: 'http://127.0.0.1:3199/login',
      reuseExistingServer: false,
    },
  ],
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
})
