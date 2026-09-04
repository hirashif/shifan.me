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

test('g key scrolls to the plot section', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#plot')).not.toBeInViewport();
  await page.keyboard.press('g');
  await expect(page.locator('#plot')).toBeInViewport();
});

test('g key is ignored while an input is focused', async ({ page }) => {
  // Stub so cell 0 is guaranteed empty and unclaimed — the claim bar (and
  // its "name" input) only exists once an empty cell is clicked.
  await page.route('**/api/plot', (r) =>
    r.fulfill({ json: { cells: [], mine: null } }));
  await page.goto('/');
  await page.locator('[data-cell="0"]').click();
  // The plot's own "name" field lives inside #plot, so clicking into it
  // already scrolls the section into view — that's an artifact of the
  // click, not the shortcut. Isolate the shortcut's effect by comparing
  // scroll position immediately before and after pressing "g" once focus
  // has settled.
  await page.getByPlaceholder('name').click();
  const before = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('g');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.scrollY);
  expect(after).toBe(before);
});
