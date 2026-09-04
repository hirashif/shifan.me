import { test, expect } from '@playwright/test';

test('name settles to shifan after the scramble', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /shifan/ })).toHaveText('shifan', { timeout: 3000 });
});

test('uptime counter is live and has nine decimals', async ({ page }) => {
  await page.goto('/');
  const el = page.locator('[data-uptime]');
  const first = await el.textContent();
  expect(first).toMatch(/^\d{2}\.\d{9}$/);
  await page.waitForTimeout(400);
  expect(await el.textContent()).not.toBe(first);
});

test('timeline shows every work row', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-work-row]')).toHaveCount(5);
});

test('education section lists both entries', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-education-row]')).toHaveCount(2);
});

test('name popover opens on click', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /shifan/ }).click();
  await expect(page.getByText('healing')).toBeVisible();
});
