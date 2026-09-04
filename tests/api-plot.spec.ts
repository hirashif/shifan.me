import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { sign, COOKIE } from '../src/lib/session-core';

test('GET returns a cells array', async ({ request }) => {
  const res = await request.get('/api/plot');
  expect(res.status()).toBe(200);
  expect(Array.isArray((await res.json()).cells)).toBe(true);
});

test('POST without a session is rejected', async ({ request }) => {
  const res = await request.post('/api/plot', {
    data: { cell: 5, name: 'a', msg: 'hi', color: '#e8b04b' },
  });
  expect(res.status()).toBe(401);
});

test('POST with a bad color is rejected before auth passes', async ({ request }) => {
  const res = await request.post('/api/plot', {
    data: { cell: 5, name: 'a', msg: 'hi', color: '#ff0000' },
  });
  expect([400, 401]).toContain(res.status());
});

test('GET with a malformed cookie resolves to no session instead of 500ing', async ({ request }) => {
  // Regression test for the readCookie() fix: decodeURIComponent('%zz')
  // throws URIError, and that used to escape unhandled all the way out of
  // getSession(), 500ing every route that reads the session cookie —
  // including this one, for a visitor with a corrupted (not even
  // malicious) cookie.
  const res = await request.get('/api/plot', { headers: { cookie: `${COOKIE}=%zz` } });
  expect(res.status()).toBe(200);
  expect(Array.isArray((await res.json()).cells)).toBe(true);
});

// The authenticated path (below) forges a session cookie with `sign()` from
// `session-core` — the same pure function `/api/auth/callback` uses to mint
// real ones — rather than driving a real GitHub OAuth round trip. The token
// is signed with the SESSION_SECRET read live from `.dev.vars`, the same
// file `astro dev` (and its D1/Miniflare binding that these tests hit)
// loads its runtime env from, so the forged cookie verifies exactly like a
// real one would without hardcoding a secret value that could drift out of
// sync with `.dev.vars`.
function devSessionSecret(): string {
  const vars = readFileSync(`${process.cwd()}/.dev.vars`, 'utf8');
  const match = vars.match(/^SESSION_SECRET=(.*)$/m);
  if (!match) throw new Error('SESSION_SECRET not found in .dev.vars — cannot forge a session cookie for tests');
  return match[1].trim();
}

async function sessionCookie(userId: string, login: string): Promise<string> {
  const token = await sign({ id: userId, login }, devSessionSecret());
  return `${COOKIE}=${token}`;
}

// astro dev's D1 binding is a real (Miniflare-backed) local SQLite database
// that persists across test runs, not an in-memory fixture reset per run.
// Fixed test user ids let each run clear its own prior rows up front so the
// suite is idempotent, rather than depending on random ids to dodge
// collisions with leftover data.
function clearPlotRows(userIds: string[]) {
  const list = userIds.map((id) => `'${id}'`).join(',');
  execFileSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'execute', 'shifan-plot', '--local', '--command', `DELETE FROM plot WHERE user_id IN (${list})`],
    { cwd: process.cwd(), stdio: 'ignore' }
  );
}

test.describe('authenticated claims — database-enforced invariants', () => {
  const USER_A = 'test-user-plot-a';
  const USER_B = 'test-user-plot-b';
  const CELL = 321;

  test.beforeAll(() => clearPlotRows([USER_A, USER_B]));
  test.afterAll(() => clearPlotRows([USER_A, USER_B]));

  test('a signed-in visitor can claim an open cell', async ({ request }) => {
    const cookie = await sessionCookie(USER_A, 'tester-a');
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: CELL, name: 'tester a', msg: 'hello plot', color: '#e8b04b' },
    });
    expect(res.status()).toBe(201);
    expect(await res.json()).toEqual({ ok: true, cell: CELL });
  });

  test('the same user cannot claim a second cell — UNIQUE(user_id) rejects the insert', async ({ request }) => {
    const cookie = await sessionCookie(USER_A, 'tester-a');
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: CELL + 1, name: 'tester a', msg: 'again', color: '#53d08a' },
    });
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: 'you already have a pixel' });
  });

  test('a second user cannot claim an already-claimed cell — PRIMARY KEY(cell) rejects the insert', async ({
    request,
  }) => {
    const cookie = await sessionCookie(USER_B, 'tester-b');
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: CELL, name: 'tester b', msg: 'mine now', color: '#7dd3fc' },
    });
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: 'that pixel is taken' });
  });

  test('GET reports mine for the authenticated claimant', async ({ request }) => {
    const cookie = await sessionCookie(USER_A, 'tester-a');
    const res = await request.get('/api/plot', { headers: { cookie } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.mine).toBe(CELL);
    expect(body.cells.some((c: { cell: number }) => c.cell === CELL)).toBe(true);
  });
});

// These four all fail validation before the INSERT ever runs, so no row is
// written and no cleanup is needed — a fresh, otherwise-unused test user is
// enough to isolate them from the claim-flow tests above.
test.describe('field validation rejects malformed input', () => {
  const USER = 'test-user-plot-validation';

  test('a msg containing a newline is rejected — not one line', async ({ request }) => {
    const cookie = await sessionCookie(USER, 'tester-validation');
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: 330, name: 'validator', msg: 'line one\nline two', color: '#e8b04b' },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'one line only' });
  });

  test('a name containing a control character is rejected', async ({ request }) => {
    const cookie = await sessionCookie(USER, 'tester-validation');
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: 331, name: 'bad\tname', msg: 'hello', color: '#53d08a' },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'no control characters' });
  });

  test('an all-zero-width msg is rejected as blank', async ({ request }) => {
    const cookie = await sessionCookie(USER, 'tester-validation');
    // Built from numeric code points (not a `\u`-escaped or literal
    // character in this file) for the same reason src/pages/api/plot.ts
    // builds ZERO_WIDTH that way: it keeps an actual zero-width character
    // from having to appear, visibly or invisibly, in source.
    const invisibleMsg = String.fromCharCode(0x200b, 0x200c, 0x200d, 0xfeff);
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: 332, name: 'validator', msg: invisibleMsg, color: '#7dd3fc' },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'one line, 120 chars max' });
  });

  test('a boolean cell is rejected instead of coerced to a number', async ({ request }) => {
    const cookie = await sessionCookie(USER, 'tester-validation');
    const res = await request.post('/api/plot', {
      headers: { cookie },
      // Number(true) === 1, which is a valid cell — this proves the
      // handler requires an actual JSON number, not anything coercible.
      data: { cell: true, name: 'validator', msg: 'hello', color: '#f472b6' },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'bad cell' });
  });
});
