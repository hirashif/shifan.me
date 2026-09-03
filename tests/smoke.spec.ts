import { test, expect } from '@playwright/test';

test('home renders and defaults to dark theme', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/th-dark/);
  expect(errors).toEqual([]);
});
