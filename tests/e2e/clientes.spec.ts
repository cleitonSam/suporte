import { test, expect } from '@playwright/test';

test.describe('Clientes /admin/clientes', () => {
  test('lista renderiza com chips de status', async ({ page }) => {
    await page.goto('/admin/clientes');

    await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();

    // Chips de status
    await expect(page.getByRole('link', { name: /^Todos\s/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Ativos\s/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Suspensos\s/ })).toBeVisible();

    // CTA novo cliente
    await expect(page.getByRole('link', { name: /\+ Novo cliente/ })).toBeVisible();
  });

  test('abre form de novo cliente', async ({ page }) => {
    await page.goto('/admin/clientes');
    await page.getByRole('link', { name: /\+ Novo cliente/ }).click();
    await page.waitForURL(/novo=1/);

    // Form aparece
    await expect(page.getByRole('heading', { name: /Cadastrar novo cliente/ })).toBeVisible();
    await expect(page.locator('#client-name')).toBeVisible();
    await expect(page.locator('#client-cnpj')).toBeVisible();
  });

  test('busca filtra resultados', async ({ page }) => {
    await page.goto('/admin/clientes');

    const search = page.locator('#cli-q');
    await search.fill('teste-zzz-naoexiste');
    await page.getByRole('button', { name: 'Buscar' }).click();

    await page.waitForURL(/q=teste-zzz/);
    // Espera resultado vazio com CTA
    await expect(page.getByText(/Nenhum cliente encontrado/)).toBeVisible();
  });
});
