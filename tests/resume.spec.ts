import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE = '/resume-cifz9eqb';
const PDF = '/resume-cifz9eqb.pdf';
const OLD_SECRET = '/2v16erb7nu5o5c';
const GUESSABLE_PAGE = '/resume';
const GUESSABLE_PDF = '/resume.pdf';

test('the resume page renders and offers a way back', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.getByRole('link', { name: /shifan\.me/ })).toBeVisible();
});

test('the resume page is noindex via meta tag', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator('meta[name="robots"]'))
    .toHaveAttribute('content', /noindex/);
});

test('the pdf is served at the readable-with-entropy path', async ({ request }) => {
  const res = await request.get(PDF);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('pdf');
});

// The X-Robots-Tag header comes from public/_headers, a Cloudflare Pages/
// Workers-assets convention (see the note atop that file). It is honored by
// the deployed worker but not by `astro dev`, which is what this suite's
// webServer runs — same reason tests/redirects.spec.ts reads its stub files
// straight off disk rather than navigating a live page. So this reads the
// header rules directly rather than asserting on a live response.
test('public/_headers sets X-Robots-Tag noindex on both the page and the pdf', () => {
  const headers = readFileSync(join(__dirname, '..', 'public', '_headers'), 'utf-8');
  for (const path of [PAGE, PDF]) {
    const lines = headers.split('\n');
    const start = lines.findIndex((l) => l.trim() === path);
    expect(start, `no section for ${path} in public/_headers`).toBeGreaterThanOrEqual(0);
    const section: string[] = [];
    for (let i = start + 1; i < lines.length && /^\s/.test(lines[i]); i++) {
      section.push(lines[i]);
    }
    const robotsLine = section.find((l) => /x-robots-tag/i.test(l));
    expect(robotsLine, `no X-Robots-Tag rule under ${path}`).toBeDefined();
    expect(robotsLine).toMatch(/noindex/i);
    expect(robotsLine).toMatch(/nofollow/i);
  }
});

test('the old high-entropy path redirects to the current resume path', async ({ page }) => {
  await page.goto(OLD_SECRET);
  await expect(page).toHaveURL(/\/resume-cifz9eqb\/?$/);
});

// Regression guard: an earlier version of this site put the resume at the
// guessable bare /resume path, then "fixed" it with a redirect from
// /resume to the real url — which defeats the whole point, since anyone
// enumerating common paths lands on the real resume via the redirect.
// /resume and /resume.pdf must not exist at all: no 200, and no 3xx
// pointing (directly or indirectly) at the real path.
test('the guessable /resume path does not resolve', async ({ request }) => {
  const res = await request.get(GUESSABLE_PAGE, { maxRedirects: 0 });
  expect(res.status()).not.toBe(200);
  const isRedirect = res.status() >= 300 && res.status() < 400;
  expect(isRedirect, `expected no redirect, got ${res.status()} ${res.headers()['location'] ?? ''}`).toBe(false);
});

test('the guessable /resume.pdf path does not resolve', async ({ request }) => {
  const res = await request.get(GUESSABLE_PDF, { maxRedirects: 0 });
  expect(res.status()).not.toBe(200);
  const isRedirect = res.status() >= 300 && res.status() < 400;
  expect(isRedirect, `expected no redirect, got ${res.status()} ${res.headers()['location'] ?? ''}`).toBe(false);
});

test('resume is not in robots.txt or any sitemap', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  if (robots.ok()) {
    const body = await robots.text();
    expect(body).not.toContain('resume');
  }
  const sitemap = await request.get('/sitemap.xml');
  if (sitemap.ok()) {
    const body = await sitemap.text();
    expect(body).not.toContain('resume');
  }
});

test('nothing on the site links to the resume', async ({ page }) => {
  for (const route of ['/', '/writing', '/learnings', '/plot']) {
    await page.goto(route);
    await expect(page.locator(`a[href*="resume" i]`)).toHaveCount(0);
  }
});
