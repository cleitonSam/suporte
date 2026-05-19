import { test, expect } from '@playwright/test';

test.describe('Chamados /admin/chamados', () => {
  test('lista renderiza com segmented control de status', async ({ page }) => {
    await page.goto('/admin/chamados');

    await expect(page.getByRole('heading', { level: 1, name: 'Chamados' })).toBeVisible();

    // Segmented control com chips
    await expect(page.getByRole('link', { name: /^Todos\s/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Novos\s/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Andamento\s/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Resolvidos\s/ })).toBeVisible();

    // Quick filters
    await expect(page.getByRole('link', { name: /Atribuídos a mim/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sem atendente/ })).toBeVisible();
  });

  test('filtro por status atualiza URL e contagem', async ({ page }) => {
    await page.goto('/admin/chamados');
    await page.getByRole('link', { name: /^Novos\s/ }).click();
    await page.waitForURL(/status=NEW/);

    // Active state
    const active = page.locator('a.bg-fluxo-500', { hasText: 'Novos' });
    await expect(active).toBeVisible();
  });
});
