import { test, expect } from '@playwright/test';

const SECRET = '/2v16erb7nu5o5c';

test('the resume page renders and offers a way back', async ({ page }) => {
  await page.goto(SECRET);
  await expect(page.getByRole('link', { name: /shifan\.me/ })).toBeVisible();
});

test('the resume page is noindex', async ({ page }) => {
  await page.goto(SECRET);
  await expect(page.locator('meta[name="robots"]'))
    .toHaveAttribute('content', /noindex/);
});

test('the pdf is served', async ({ request }) => {
  const res = await request.get('/resume.pdf');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('pdf');
});

test('nothing on the site links to the resume', async ({ page }) => {
  for (const route of ['/', '/writing', '/learnings', '/plot']) {
    await page.goto(route);
    await expect(page.locator(`a[href*="resume"], a[href="${SECRET}"]`)).toHaveCount(0);
  }
});
