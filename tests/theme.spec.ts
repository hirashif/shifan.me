import { test, expect } from '@playwright/test';

test('t key toggles theme and persists across reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/th-dark/);
  await page.keyboard.press('t');
  await expect(page.locator('html')).toHaveClass(/th-light/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/th-light/);
});

test('dock button toggles theme', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'toggle theme' }).click();
  await expect(page.locator('html')).toHaveClass(/th-light/);
});

test('t is ignored while an input is focused', async ({ page }) => {
  await page.goto('/plot');
  await page.getByPlaceholder('name').click();
  await page.keyboard.press('t');
  await expect(page.locator('html')).toHaveClass(/th-dark/);
});
