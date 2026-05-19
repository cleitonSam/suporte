import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config — fluxo helpdesk.
 *
 * Comandos:
 *   npx playwright install          (uma vez)
 *   npx playwright test             (todos)
 *   npx playwright test --ui        (modo interativo)
 *   npx playwright test --headed    (mostra browser)
 *   npx playwright test login       (filtra por nome)
 *
 * Tests usam ADMIN_EMAIL + ADMIN_PASSWORD do .env pra autenticar.
 */

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },

  // Falha CI se tiver test.only esquecido
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },

  projects: [
    // Auth setup roda primeiro e salva cookies em storage/admin.json
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Sobe o dev server se nao tiver rodando
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
