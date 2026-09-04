import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/writing', '/learnings', '/plot', '/writing/cross-desk'];

for (const route of ROUTES) {
  test(`${route}: surname never appears in visible text`, async ({ page }) => {
    await page.goto(route);
    const text = await page.locator('body').innerText();
    expect(text.toLowerCase()).not.toContain('hirani');
  });

  test(`${route}: no console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test(`${route}: renders in light theme too`, async ({ page }) => {
    // global.css transitions body background/color over .35s, except under
    // prefers-reduced-motion where it collapses to ~0. Emulate that so the
    // computed style read below reflects the settled light-theme color
    // instead of racing an in-flight CSS transition.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);
    await page.keyboard.press('t');
    await expect(page.locator('html')).toHaveClass(/th-light/);
    const bg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(250, 249, 246)');
  });
}

// The dock deliberately links to /hereismyresume on every page (see
// CLAUDE.md's resume rule) — being linked is fine. What still must hold is
// that the resume is not indexed, which tests/resume.spec.ts asserts via
// the noindex meta tag and X-Robots-Tag header. This just confirms the dock
// link is present and points at the real resume path, not a stray one.
test('the dock resume link points at the real resume path', async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    const links = page.locator('a[href*="resume" i]');
    await expect(links).toHaveCount(1);
    await expect(links.first()).toHaveAttribute('href', '/hereismyresume');
  }
});
