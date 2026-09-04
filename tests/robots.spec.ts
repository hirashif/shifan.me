import { test, expect } from '@playwright/test';

// Cloudflare's "Managed robots.txt" used to auto-generate one that blocked
// AI crawlers; the owner turned that off and wants an explicit robots.txt
// instead, served as text (not Astro's 404 HTML page, which is what a
// missing robots.txt rendered as before this file existed) and permissive.
test.describe('GET /robots.txt', () => {
  test('returns 200 as text/plain', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');
  });

  test('allows crawling everything, including ai crawlers', async ({ request }) => {
    const res = await request.get('/robots.txt');
    const body = await res.text();
    expect(body).toMatch(/User-agent:\s*\*/i);
    expect(body).toMatch(/Allow:\s*\//);
    expect(body).not.toMatch(/Disallow/i);
    // The whole point of turning off the managed default was to let AI
    // crawlers back in; assert at least one of them is named explicitly
    // rather than just relying on the wildcard block.
    expect(body).toMatch(/GPTBot|ClaudeBot|Google-Extended|PerplexityBot|CCBot/);
  });

  // Regression guard: a future "helpful" edit disallowing the unlisted
  // resume path would publish the very path CLAUDE.md says must stay out
  // of robots.txt in any form (Allow, Disallow, or comment) — the resume
  // stays unindexed via its noindex meta tag and X-Robots-Tag header
  // instead (see tests/resume.spec.ts), which doesn't require naming it
  // here at all.
  test('never mentions the resume path', async ({ request }) => {
    const res = await request.get('/robots.txt');
    const body = await res.text();
    expect(body).not.toContain('hereismyresume');
  });

  test('does not point at a sitemap', async ({ request }) => {
    // There is no sitemap.xml; a Sitemap: line pointing at a 404 would be
    // worse than omitting it entirely.
    const res = await request.get('/robots.txt');
    const body = await res.text();
    expect(body).not.toMatch(/Sitemap:/i);
  });
});
