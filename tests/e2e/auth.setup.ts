/**
 * Setup de autenticação: faz login uma vez como admin e salva o
 * storageState em tests/.auth/admin.json. Todos os outros tests
 * reusam o cookie via project.use.storageState.
 *
 * Requer .env com:
 *   INITIAL_ADMIN_EMAIL
 *   INITIAL_ADMIN_PASSWORD
 */

import { test as setup, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const AUTH_FILE = 'tests/.auth/admin.json';

setup('autenticar como admin', async ({ page }) => {
  const email = process.env.INITIAL_ADMIN_EMAIL ?? process.env.E2E_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E auth: defina INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD no .env (ou E2E_ADMIN_*)',
    );
  }

  await page.goto('/login');

  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');

  // Aguarda redirect pro admin
  await page.waitForURL(/\/admin/, { timeout: 10000 });
  await expect(page.locator('h1')).toContainText('Dashboard', { timeout: 5000 });

  // Garante que o diretório existe
  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
