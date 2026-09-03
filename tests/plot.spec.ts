import { test, expect } from '@playwright/test';

test('renders 400 cells', async ({ page }) => {
  await page.goto('/plot');
  await expect(page.locator('[data-cell]')).toHaveCount(400);
});

test('clicking an empty cell opens the claim bar with its coord', async ({ page }) => {
  await page.route('**/api/plot', (r) =>
    r.fulfill({ json: { cells: [], mine: null } }));
  await page.goto('/plot');
  await page.locator('[data-cell="0"]').click();
  await expect(page.getByRole('button', { name: /claim a1/ })).toBeVisible();
});

test('a filled cell shows its message on hover', async ({ page }) => {
  await page.route('**/api/plot', (r) => r.fulfill({ json: {
    cells: [{ cell: 3, name: 'octocat', msg: 'hello', color: '#53d08a', created_at: Date.now() }],
    mine: null,
  }}));
  await page.goto('/plot');
  await page.locator('[data-cell="3"]').hover();
  await expect(page.getByText('hello')).toBeVisible();
});

test('a user who already claimed cannot open the claim bar', async ({ page }) => {
  await page.route('**/api/plot', (r) => r.fulfill({ json: {
    cells: [{ cell: 7, name: 'me', msg: 'mine', color: '#e8b04b', created_at: Date.now() }],
    mine: 7,
  }}));
  await page.goto('/plot');
  await page.locator('[data-cell="0"]').click();
  await expect(page.getByRole('button', { name: /claim/ })).toHaveCount(0);
});
