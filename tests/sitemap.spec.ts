import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// @astrojs/sitemap only writes its output during `astro build` (it hooks
// into `astro:build:done`), not `astro dev` — so, same reason
// tests/resume.spec.ts reads public/_headers straight off disk instead of
// requesting it from this suite's dev-server webServer, there is no live
// route to hit here either. CI runs `pnpm build` before `pnpm test` (see
// .github/workflows/ci.yml), so by the time this runs the built files
// exist; read them directly. The cloudflare adapter currently nests static
// output under dist/client (confirmed by an actual `pnpm build`), but fall
// back to dist/ directly in case that ever changes.
function readBuiltFile(name: string): string {
  const candidates = [join(__dirname, '..', 'dist', 'client', name), join(__dirname, '..', 'dist', name)];
  const path = candidates.find((p) => existsSync(p));
  if (!path) {
    throw new Error(
      `${name} not found in dist/client or dist/ — run \`pnpm build\` before \`pnpm test\` (see .github/workflows/ci.yml)`,
    );
  }
  return readFileSync(path, 'utf-8');
}

test.describe('sitemap', () => {
  test('sitemap-index.xml exists, is valid xml, and points at sitemap-0.xml', () => {
    const body = readBuiltFile('sitemap-index.xml');
    expect(body.startsWith('<?xml')).toBe(true);
    expect(body).toContain('<sitemapindex');
    expect(body).toContain('https://shifan.me/sitemap-0.xml');
  });

  test('sitemap-0.xml is valid xml and lists the home and writing pages', () => {
    const body = readBuiltFile('sitemap-0.xml');
    expect(body.startsWith('<?xml')).toBe(true);
    expect(body).toContain('<urlset');
    expect(body).toContain('<loc>https://shifan.me/</loc>');
    expect(body).toContain('<loc>https://shifan.me/writing/</loc>');
    expect(body).toContain('<loc>https://shifan.me/learnings/</loc>');
    expect(body).toContain('<loc>https://shifan.me/plot/</loc>');
    // The seven writing posts, individually — not just the /writing index.
    const slugs = [
      'agentic-payments',
      'ap2-x402',
      'concurrency',
      'cross-desk',
      'inference',
      'ledger-bug',
      'ordering',
    ];
    for (const slug of slugs) {
      expect(body).toContain(`<loc>https://shifan.me/writing/${slug}/</loc>`);
    }
  });

  // The regression this whole feature exists to guard against: the resume
  // lives at an unlisted, noindex path specifically so it stays out of
  // search (see CLAUDE.md and tests/resume.spec.ts). A sitemap entry would
  // publish the exact path that noindex and X-Robots-Tag are trying to
  // keep hidden, defeating that work entirely.
  test('never contains the resume path, in either sitemap file', () => {
    for (const name of ['sitemap-index.xml', 'sitemap-0.xml']) {
      const body = readBuiltFile(name);
      expect(body).not.toContain('hereismyresume');
      // The old high-entropy redirect-only path must also be absent — it's
      // not a real page, and it too points at the resume.
      expect(body).not.toContain('2v16erb7nu5o5c');
    }
  });
});
