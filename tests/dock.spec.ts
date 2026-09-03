import { test, expect } from '@playwright/test';

test('every dock control has an accessible name', async ({ page }) => {
  await page.goto('/');
  for (const name of ['home', 'writing', 'learnings', 'the plot', 'github', 'linkedin', 'copy email', 'toggle theme']) {
    // Dock controls are a mix of <a> (role "link") and <button> (role "button");
    // getByRole only accepts a single literal role, so check both via .or().
    const control = page.getByRole('link', { name }).or(page.getByRole('button', { name }));
    await expect(control.first()).toBeVisible();
  }
});

test('email button copies the address', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'copy email' }).click();
  await expect(page.getByText('copied')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText()))
    .toBe('shifan.hirani@gmail.com');
});
