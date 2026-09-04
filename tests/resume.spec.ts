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

test('the pdf is served at its high-entropy path', async ({ request }) => {
  const res = await request.get('/r-9f4c2ae81b7d63.pdf');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('pdf');
});

test('the old guessable /resume.pdf path is gone, with no redirect', async ({ request }) => {
  const res = await request.get('/resume.pdf', { maxRedirects: 0 });
  expect(res.status()).toBe(404);
});

test('nothing on the site links to the resume', async ({ page }) => {
  for (const route of ['/', '/writing', '/learnings', '/plot']) {
    await page.goto(route);
    await expect(page.locator(`a[href*="resume"], a[href="${SECRET}"]`)).toHaveCount(0);
  }
});
