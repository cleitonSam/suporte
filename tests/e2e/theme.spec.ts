import { test, expect } from '@playwright/test';

test.describe('Tema dark/light', () => {
  test('toggle alterna a classe dark no html', async ({ page }) => {
    await page.goto('/admin');

    // Inicial: dark (default do projeto)
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Click no toggle
    await page.getByRole('button', { name: /Alternar para modo claro/ }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Volta pro dark
    await page.getByRole('button', { name: /Alternar para modo escuro/ }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
