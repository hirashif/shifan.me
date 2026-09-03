import { test, expect } from '@playwright/test';

test('renders exactly 25 numbered learnings', async ({ page }) => {
  await page.goto('/learnings');
  await expect(page.locator('[data-learning]')).toHaveCount(25);
  await expect(page.locator('[data-learning-num]').first()).toHaveText('01');
  await expect(page.locator('[data-learning-num]').last()).toHaveText('25');
});

test('has no filters, dates, or tags', async ({ page }) => {
  await page.goto('/learnings');
  await expect(page.locator('[data-tag]')).toHaveCount(0);
});
