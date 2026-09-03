import { test, expect } from '@playwright/test';

const SLUGS = ['cross-desk','agentic-payments','ap2-x402','concurrency','inference','ledger-bug','ordering'];

test('index lists all seven posts', async ({ page }) => {
  await page.goto('/writing');
  await expect(page.locator('[data-post]')).toHaveCount(7);
});

test('tag filter narrows the list', async ({ page }) => {
  await page.goto('/writing');
  const before = await page.locator('[data-post]:visible').count();
  await page.locator('[data-tag]').nth(1).click();
  expect(await page.locator('[data-post]:visible').count()).toBeLessThan(before);
});

for (const slug of SLUGS) {
  test(`post ${slug} renders`, async ({ page }) => {
    const res = await page.goto(`/writing/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  });
}
