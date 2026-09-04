import { test, expect } from '@playwright/test';

// The design was built and signed off against a 940px viewport only, with no
// mobile breakpoint at all — see .superpowers/mobile-report.md for the pass
// that added one. This is the regression guard: every route must render at
// a real phone width without the page growing wider than the viewport.
// `scrollWidth > clientWidth` is the actual "does this scroll sideways"
// check a user would hit; comparing against `window.innerWidth` alone can
// be thrown off by scrollbar gutters, so both are asserted here directly
// against `document.documentElement`.
const routes = ['/', '/writing', '/writing/ordering', '/learnings', '/plot', '/2v16erb7nu5o5c'];

test.describe('no horizontal overflow at 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const route of routes) {
    test(`${route} does not overflow horizontally`, async ({ page }) => {
      await page.goto(route);
      // Let fonts/images/animations settle before measuring.
      await page.waitForTimeout(300);
      const { scrollWidth, clientWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth, `${route}: scrollWidth (${scrollWidth}) vs clientWidth (${clientWidth})`).toBeLessThanOrEqual(
        clientWidth,
      );
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });
  }
});

test('dock stays reachable and on-screen at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const dock = page.locator('nav[aria-label="site"]');
  await expect(dock).toBeVisible();
  const box = await dock.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  }
});
