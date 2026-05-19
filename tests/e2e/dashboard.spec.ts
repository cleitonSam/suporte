import { test, expect } from '@playwright/test';

test.describe('Dashboard /admin', () => {
  test('carrega com KPIs e headline contextual', async ({ page }) => {
    await page.goto('/admin');

    // Header
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText(/Operação · \d+ dias/i)).toBeVisible();

    // Pelo menos 1 KPI card (Volume, 1a resposta, etc)
    await expect(page.getByText('Volume (30d)')).toBeVisible();
    await expect(page.getByText('1ª resposta')).toBeVisible();
    await expect(page.getByText('SLA cumprido')).toBeVisible();

    // Status pill "Online" no header
    await expect(page.getByText('Online')).toBeVisible();
  });

  test('navega pra chamados via sidebar', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('link', { name: /^Chamados$/ }).click();
    await page.waitForURL(/\/admin\/chamados$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Chamados' })).toBeVisible();
  });
});
