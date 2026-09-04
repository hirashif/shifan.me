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
  // Stub so cell 0 is guaranteed empty and unclaimed, regardless of
  // whatever the dev database currently holds — the claim bar (and its
  // "name" input) only exists once an empty cell is clicked.
  await page.route('**/api/plot', (r) =>
    r.fulfill({ json: { cells: [], mine: null } }));
  await page.goto('/plot');
  await page.locator('[data-cell="0"]').click();
  await page.getByPlaceholder('name').click();
  await page.keyboard.press('t');
  await expect(page.locator('html')).toHaveClass(/th-dark/);
});
