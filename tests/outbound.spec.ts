import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE = '/outbound/';
const SOURCE = join(__dirname, '..', 'src', 'content', 'outbound.md');

// /outbound/ is a case study shifan links in emails: noindex, not in the dock,
// not in the sitemap, text rendered verbatim from src/content/outbound.md.

test('renders the case study title and date', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator('h1')).toHaveText('How I ran outbound for my own job search');
  await expect(page.getByText('September 2026')).toBeVisible();
  await expect(page).toHaveTitle('How I ran outbound for my own job search');
});

test('is noindex via meta tag', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('the funnel renders as a real table with every row', async ({ page }) => {
  await page.goto(PAGE);
  const rows = page.locator('article table tbody tr');
  await expect(rows).toHaveCount(6);
  await expect(page.locator('article table thead th')).toHaveText(['Stage', 'Result']);
  await expect(rows.nth(4).locator('td').nth(1)).toContainText('66 minutes');
});

test('the funnel table stacks on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PAGE);
  const cell = page.locator('article table tbody tr').first().locator('td').first();
  await expect(cell).toHaveCSS('display', 'block');
  await expect(page.locator('article table thead')).toBeHidden();
});

test('footer links point at the ai resume and github', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator('article a[href="https://shifan.me/hereismyresume/ai/"]')).toHaveCount(1);
  await expect(page.locator('article a[href="https://github.com/hirashif"]')).toHaveCount(1);
});

test('every paragraph of the source renders word for word', async ({ page }) => {
  await page.goto(PAGE);
  const rendered = (await page.locator('article').innerText()).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
  // Plain prose lines from the source (skip headings, table rows, list markers, rules).
  const lines = readFileSync(SOURCE, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^(#|\||---|\*|\d+\.|-\s)/.test(l));
  expect(lines.length).toBeGreaterThan(8);
  for (const line of lines) {
    const plain = line.replace(/\*\*?/g, '').replace(/\s+/g, ' ');
    expect(rendered, `missing: ${plain.slice(0, 60)}`).toContain(plain);
  }
});

test('no em dashes and no surname in the page text', async ({ page }) => {
  await page.goto(PAGE);
  const text = await page.locator('main').innerText();
  expect(text).not.toContain('—');
  expect(text.toLowerCase()).not.toContain('hirani');
});

test('not linked from the dock or the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href*="/outbound"]')).toHaveCount(0);
});

test('public/_headers noindexes the page as served', () => {
  const headers = readFileSync(join(__dirname, '..', 'public', '_headers'), 'utf-8');
  for (const path of ['/outbound', '/outbound/*']) {
    const lines = headers.split('\n');
    const start = lines.findIndex((l) => l.trim() === path);
    expect(start, `no section for ${path}`).toBeGreaterThanOrEqual(0);
    expect(lines[start + 1]).toMatch(/X-Robots-Tag:.*noindex/i);
  }
});

test('not in the sitemap', () => {
  const candidates = [join(__dirname, '..', 'dist', 'client', 'sitemap-0.xml'), join(__dirname, '..', 'dist', 'sitemap-0.xml')];
  const path = candidates.find((p) => existsSync(p));
  test.skip(!path, 'sitemap only exists after pnpm build');
  expect(readFileSync(path!, 'utf-8')).not.toContain('/outbound');
});

// Regression guard: Tailwind's preflight strips list-style, which silently
// dropped the bullets and the 1-2-3 numbering from this page's lists.
test('lists keep their bullets and numbers', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator('article ol')).toHaveCSS('list-style-type', 'decimal');
  await expect(page.locator('article ul')).toHaveCSS('list-style-type', 'disc');
});
