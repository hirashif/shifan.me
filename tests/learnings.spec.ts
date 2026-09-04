import { test, expect } from '@playwright/test';

test('renders exactly 15 learnings, unnumbered', async ({ page }) => {
  await page.goto('/learnings');
  await expect(page.locator('[data-learning]')).toHaveCount(15);
  await expect(page.locator('[data-learning-num]')).toHaveCount(0);
});

test('has no filters, dates, or tags', async ({ page }) => {
  await page.goto('/learnings');
  await expect(page.locator('[data-tag]')).toHaveCount(0);
});
