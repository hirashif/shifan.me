import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// The real secret lives only in `.dev.vars` (gitignored) and in the
// Cloudflare secret store — never in source. Reading it live from
// `.dev.vars` here mirrors how tests/api-plot.spec.ts forges a session
// cookie from the live SESSION_SECRET, so this suite can't drift out of
// sync with whatever value is actually configured for local dev.
function devUsageToken(): string {
  const vars = readFileSync(`${process.cwd()}/.dev.vars`, 'utf8');
  const match = vars.match(/^USAGE_TOKEN=(.*)$/m);
  if (!match) throw new Error('USAGE_TOKEN not found in .dev.vars — cannot authenticate for tests');
  return match[1].trim();
}

// astro dev's KV binding is a real (Miniflare-backed) local store that
// persists across test runs. Writing directly to it (bypassing the POST
// endpoint, which always stamps `updatedAt: Date.now()`) is the only way to
// put an arbitrary — including deliberately stale — timestamp in place.
function putUsageSnapshot(value: Record<string, unknown>) {
  execFileSync(
    'pnpm',
    ['exec', 'wrangler', 'kv', 'key', 'put', '--binding=USAGE', '--local', 'usage:latest', JSON.stringify(value)],
    { cwd: process.cwd(), stdio: 'ignore' }
  );
}

test.describe('GET /api/tokens', () => {
  test('returns a snapshot shape', async ({ request }) => {
    const res = await request.get('/api/tokens');
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const k of ['today', 'week', 'year', 'tokensToday', 'updatedAt']) {
      expect(body).toHaveProperty(k);
    }
  });

  test('falls back to zeros rather than erroring when KV holds nothing', async ({ request }) => {
    execFileSync(
      'pnpm',
      ['exec', 'wrangler', 'kv', 'key', 'delete', '--binding=USAGE', '--local', 'usage:latest'],
      { cwd: process.cwd(), stdio: 'ignore' }
    );
    const res = await request.get('/api/tokens');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ today: 0, week: 0, year: 0, tokensToday: 0, updatedAt: 0 });
  });
});

test.describe('POST /api/usage auth', () => {
  test('without the bearer token is rejected', async ({ request }) => {
    const res = await request.post('/api/usage', { data: { today: 1, week: 1, year: 1, tokensToday: 1 } });
    expect(res.status()).toBe(401);
  });

  test('with the wrong bearer token is rejected', async ({ request }) => {
    const res = await request.post('/api/usage', {
      headers: { authorization: 'Bearer not-the-real-token' },
      data: { today: 1, week: 1, year: 1, tokensToday: 1 },
    });
    expect(res.status()).toBe(401);
  });

  test('with a token of different length than the real one is still rejected cleanly', async ({ request }) => {
    // Exercises the length check that has to short-circuit before
    // crypto.subtle.timingSafeEqual runs (it throws on a length mismatch
    // rather than returning false) — this must come back 401, not 500.
    const res = await request.post('/api/usage', {
      headers: { authorization: 'Bearer short' },
      data: { today: 1, week: 1, year: 1, tokensToday: 1 },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('POST /api/usage with a valid token', () => {
  const TOKEN = devUsageToken();

  test('stores the snapshot and GET reflects it back', async ({ request }) => {
    const res = await request.post('/api/usage', {
      headers: { authorization: `Bearer ${TOKEN}` },
      data: { today: 12.34, week: 56.78, year: 900.01, tokensToday: 123456 },
    });
    expect(res.status()).toBe(200);
    const posted = await res.json();
    expect(posted.today).toBe(12.34);
    expect(posted.week).toBe(56.78);
    expect(posted.year).toBe(900.01);
    expect(posted.tokensToday).toBe(123456);
    expect(typeof posted.updatedAt).toBe('number');

    const got = await request.get('/api/tokens');
    expect(await got.json()).toEqual(posted);
  });

  test('coerces non-finite and negative fields to 0 instead of storing them', async ({ request }) => {
    const res = await request.post('/api/usage', {
      headers: { authorization: `Bearer ${TOKEN}` },
      data: { today: -5, week: 'not-a-number', year: Number.POSITIVE_INFINITY, tokensToday: 42 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.today).toBe(0);
    expect(body.week).toBe(0);
    expect(body.year).toBe(0);
    expect(body.tokensToday).toBe(42);
  });
});

test.describe('footer staleness on the homepage', () => {
  test('a fresh snapshot renders a real figure', async ({ page }) => {
    putUsageSnapshot({ today: 7.5, week: 20, year: 300, tokensToday: 99000, updatedAt: Date.now() });
    await page.goto('/');
    const amount = page.locator('[data-tok-amount]');
    await expect(amount).toHaveText('$7.50');
  });

  test('a snapshot older than 48 hours renders — instead of the stale figure', async ({ page }) => {
    const staleUpdatedAt = Date.now() - 49 * 60 * 60 * 1000;
    putUsageSnapshot({ today: 7.5, week: 20, year: 300, tokensToday: 99000, updatedAt: staleUpdatedAt });
    await page.goto('/');
    const amount = page.locator('[data-tok-amount]');
    await expect(amount).toHaveText('—');
  });
});
