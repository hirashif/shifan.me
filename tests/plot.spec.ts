import { test, expect } from '@playwright/test';

test('renders 400 cells', async ({ page }) => {
  await page.goto('/plot');
  await expect(page.locator('[data-cell]')).toHaveCount(400);
});

test('clicking an empty cell opens the claim bar with its coord', async ({ page }) => {
  await page.route('**/api/plot', (r) =>
    r.fulfill({ json: { cells: [], mine: null } }));
  await page.goto('/plot');
  await page.locator('[data-cell="0"]').click();
  await expect(page.getByRole('button', { name: /claim a1/ })).toBeVisible();
});

test('a filled cell shows its message on hover', async ({ page }) => {
  await page.route('**/api/plot', (r) => r.fulfill({ json: {
    cells: [{ cell: 3, name: 'octocat', msg: 'hello', color: '#53d08a', created_at: Date.now() }],
    mine: null,
  }}));
  await page.goto('/plot');
  await page.locator('[data-cell="3"]').hover();
  // Scoped to the tooltip container, not a page-wide text search — the same
  // message legitimately also appears in the "recent" list at the same
  // time (design_handoff/Plot.dc.html has no rule against that), so this
  // asserts the tooltip specifically shows it, not that it appears once.
  await expect(page.locator('[data-plot-tooltip]').getByText('hello')).toBeVisible();
});

test('a user who already claimed cannot open the claim bar', async ({ page }) => {
  await page.route('**/api/plot', (r) => r.fulfill({ json: {
    cells: [{ cell: 7, name: 'me', msg: 'mine', color: '#e8b04b', created_at: Date.now() }],
    mine: 7,
  }}));
  await page.goto('/plot');
  await page.locator('[data-cell="0"]').click();
  await expect(page.getByRole('button', { name: /claim/ })).toHaveCount(0);
});

// Regression guard: the claim bar (swatches + both inputs + buttons) must
// not exist on the page — not just be visually hidden — until an empty
// cell is clicked, on both places <Plot /> is mounted.
test('the claim bar is hidden until an empty cell is clicked, on both pages', async ({ page }) => {
  await page.route('**/api/plot', (r) =>
    r.fulfill({ json: { cells: [], mine: null } }));

  await page.goto('/');
  await expect(page.locator('[data-plot-claim-bar]')).toBeHidden();
  await page.locator('[data-cell="0"]').click();
  await expect(page.locator('[data-plot-claim-bar]')).toBeVisible();

  await page.goto('/plot');
  await expect(page.locator('[data-plot-claim-bar]')).toBeHidden();
  await page.locator('[data-cell="0"]').click();
  await expect(page.locator('[data-plot-claim-bar]')).toBeVisible();
});

// Regression guard: hovering a filled cell must not remove its row from
// the recent list — the tooltip and the recent list are allowed to show
// the same entry's text at the same time.
test('the recent list keeps its full row count while a cell is hovered', async ({ page }) => {
  await page.route('**/api/plot', (r) => r.fulfill({ json: {
    cells: [
      { cell: 1, name: 'a', msg: 'one', color: '#e8b04b', created_at: Date.now() },
      { cell: 2, name: 'b', msg: 'two', color: '#53d08a', created_at: Date.now() - 1000 },
      { cell: 3, name: 'c', msg: 'three', color: '#7dd3fc', created_at: Date.now() - 2000 },
    ],
    mine: null,
  }}));
  await page.goto('/plot');
  const rows = page.locator('[data-plot-recent] > div');
  await expect(rows).toHaveCount(3);
  await page.locator('[data-cell="1"]').hover();
  await expect(page.locator('[data-plot-tooltip]').getByText('one')).toBeVisible();
  await expect(rows).toHaveCount(3);
});
