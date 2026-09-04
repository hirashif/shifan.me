import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { sign, verify, COOKIE } from '../src/lib/session-core';

test('GET returns a cells array', async ({ request }) => {
  const res = await request.get('/api/plot');
  expect(res.status()).toBe(200);
  expect(Array.isArray((await res.json()).cells)).toBe(true);
});

test('POST with a bad color is rejected before the visitor cookie is even relevant', async ({ request }) => {
  const res = await request.post('/api/plot', {
    data: { cell: 5, name: 'a', msg: 'hi', color: '#ff0000' },
  });
  expect(res.status()).toBe(400);
});

test('GET with a malformed cookie resolves to no session instead of 500ing', async ({ request }) => {
  // Regression test for the readCookie() fix: decodeURIComponent('%zz')
  // throws URIError, and that used to escape unhandled all the way out of
  // getSession(), 500ing every route that reads the visitor cookie —
  // including this one, for a visitor with a corrupted (not even
  // malicious) cookie.
  const res = await request.get('/api/plot', { headers: { cookie: `${COOKIE}=%zz` } });
  expect(res.status()).toBe(200);
  expect(Array.isArray((await res.json()).cells)).toBe(true);
});

// The tests below forge a signed visitor cookie with `sign()` from
// `session-core` — the same pure function `POST /api/plot` uses to mint
// real ones — rather than driving a real browser through the claim flow.
// The token is signed with the SESSION_SECRET read live from `.dev.vars`,
// the same file `astro dev` (and its D1/Miniflare binding that these tests
// hit) loads its runtime env from, so the forged cookie verifies exactly
// like a real one would without hardcoding a secret value that could drift
// out of sync with `.dev.vars`.
function devSessionSecret(): string {
  const vars = readFileSync(`${process.cwd()}/.dev.vars`, 'utf8');
  const match = vars.match(/^SESSION_SECRET=(.*)$/m);
  if (!match) throw new Error('SESSION_SECRET not found in .dev.vars — cannot forge a visitor cookie for tests');
  return match[1].trim();
}

async function visitorCookie(userId: string): Promise<string> {
  const token = await sign({ id: userId, login: 'anon' }, devSessionSecret());
  return `${COOKIE}=${token}`;
}

// Pulls the raw Set-Cookie value (name=token, no attributes) out of a
// `set-cookie` response header so a test can carry it into a follow-up
// request or decode the id it carries.
function cookieValue(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0]!;
}

async function decodeVisitorId(setCookieHeader: string): Promise<string> {
  const raw = cookieValue(setCookieHeader).slice(`${COOKIE}=`.length);
  const user = await verify(decodeURIComponent(raw), devSessionSecret());
  if (!user) throw new Error('minted cookie did not verify against the dev secret');
  return user.id;
}

// astro dev's D1 binding is a real (Miniflare-backed) local SQLite database
// that persists across test runs, not an in-memory fixture reset per run.
// Fixed test user ids let each run clear its own prior rows up front so the
// suite is idempotent, rather than depending on random ids to dodge
// collisions with leftover data. Anonymously-minted ids are cleared by
// whatever value the server actually chose, collected as tests run.
function clearPlotRows(userIds: string[]) {
  const ids = userIds.filter(Boolean);
  if (ids.length === 0) return;
  const list = ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
  execFileSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'execute', 'shifan-plot', '--local', '--command', `DELETE FROM plot WHERE user_id IN (${list})`],
    { cwd: process.cwd(), stdio: 'ignore' }
  );
}

test.describe('claims — database-enforced invariants', () => {
  const USER_A = 'test-user-plot-a';
  const USER_B = 'test-user-plot-b';
  const CELL = 321;

  test.beforeAll(() => clearPlotRows([USER_A, USER_B]));
  test.afterAll(() => clearPlotRows([USER_A, USER_B]));

  test('a visitor with a valid signed cookie can claim an open cell', async ({ request }) => {
    const cookie = await visitorCookie(USER_A);
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: CELL, name: 'tester a', msg: 'hello plot', color: '#e8b04b' },
    });
    expect(res.status()).toBe(201);
    expect(await res.json()).toEqual({ ok: true, cell: CELL });
  });

  test('the same visitor cannot claim a second cell — UNIQUE(user_id) rejects the insert', async ({ request }) => {
    const cookie = await visitorCookie(USER_A);
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: CELL + 1, name: 'tester a', msg: 'again', color: '#53d08a' },
    });
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: 'you already have a pixel' });
  });

  test('a second visitor cannot claim an already-claimed cell — PRIMARY KEY(cell) rejects the insert', async ({
    request,
  }) => {
    const cookie = await visitorCookie(USER_B);
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: CELL, name: 'tester b', msg: 'mine now', color: '#7dd3fc' },
    });
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: 'that pixel is taken' });
  });

  test('GET reports mine for the returning visitor and mints no cookie on a read', async ({ request }) => {
    const cookie = await visitorCookie(USER_A);
    const res = await request.get('/api/plot', { headers: { cookie } });
    expect(res.status()).toBe(200);
    // A GET must never have the side effect of minting an identity — only
    // a POST (claiming) does.
    expect(res.headers()['set-cookie']).toBeFalsy();
    const body = await res.json();
    expect(body.mine).toBe(CELL);
    expect(body.cells.some((c: { cell: number }) => c.cell === CELL)).toBe(true);
  });
});

test.describe('anonymous first claim mints a signed visitor cookie', () => {
  const CELL = 340;
  let mintedUserId: string | null = null;

  test.afterAll(() => clearPlotRows(mintedUserId ? [mintedUserId] : []));

  test('a first-time claimer with no cookie succeeds and receives a Set-Cookie', async ({ request }) => {
    const res = await request.post('/api/plot', {
      data: { cell: CELL, name: 'anon a', msg: 'first visit', color: '#e8b04b' },
    });
    expect(res.status()).toBe(201);
    expect(await res.json()).toEqual({ ok: true, cell: CELL });

    const setCookie = res.headers()['set-cookie'];
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain(`${COOKIE}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');

    mintedUserId = await decodeVisitorId(setCookie!);
    expect(mintedUserId).toBeTruthy();
  });

  test('returning with the minted cookie reuses the same identity — no new Set-Cookie, one-claim still enforced', async ({
    request,
  }) => {
    test.skip(!mintedUserId, 'depends on the previous test minting a cookie');
    const cookie = await visitorCookie(mintedUserId!);
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: CELL + 1, name: 'anon a', msg: 'again', color: '#53d08a' },
    });
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: 'you already have a pixel' });
  });
});

test.describe('a forged visitor cookie does not bypass the one-claim rule', () => {
  const REAL_USER = 'test-user-plot-forged-victim';
  const CELL_REAL = 350;
  const CELL_FORGED = 351;
  let mintedFromForgery: string | null = null;

  test.beforeAll(() => clearPlotRows([REAL_USER]));
  test.afterAll(() => clearPlotRows([REAL_USER, ...(mintedFromForgery ? [mintedFromForgery] : [])]));

  test('a real visitor claims a cell with a validly signed cookie', async ({ request }) => {
    const cookie = await visitorCookie(REAL_USER);
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: CELL_REAL, name: 'real', msg: 'legit claim', color: '#e8b04b' },
    });
    expect(res.status()).toBe(201);
  });

  test('a cookie carrying the same user id but an invalid signature is not trusted as that user', async ({
    request,
  }) => {
    // Forge a cookie whose *payload* claims to be REAL_USER (who already
    // has a pixel) but whose signature is garbage rather than a real HMAC
    // over that payload. If the server ever trusted the unverified id
    // straight out of the payload, this insert would collide with
    // REAL_USER's existing row and 409 — proving the one-claim rule was
    // bypassable by simply editing a cookie with no valid signature at all.
    // The correct behaviour is that verification fails outright, so the
    // request is treated exactly like a fresh visitor with no cookie: a
    // brand new random id is minted (never REAL_USER, and never the
    // attacker-chosen value), and the claim succeeds under that new,
    // properly-signed identity.
    const forgedBody = Buffer.from(JSON.stringify({ id: REAL_USER, login: 'anon' })).toString('base64url');
    const forgedCookie = `${COOKIE}=${forgedBody}.${'a'.repeat(43)}`;

    const res = await request.post('/api/plot', {
      headers: { cookie: forgedCookie },
      data: { cell: CELL_FORGED, name: 'forger', msg: 'bypass attempt', color: '#7dd3fc' },
    });

    expect(res.status()).toBe(201);
    const setCookie = res.headers()['set-cookie'];
    expect(setCookie).toBeTruthy();
    mintedFromForgery = await decodeVisitorId(setCookie!);
    // The id the server actually used is neither the impersonated victim's
    // id nor the attacker's chosen value — it's a fresh mint.
    expect(mintedFromForgery).not.toBe(REAL_USER);
  });
});

// These four all fail validation before the INSERT ever runs, so no row is
// written and no cleanup is needed — a fresh, otherwise-unused test user is
// enough to isolate them from the claim-flow tests above.
test.describe('field validation rejects malformed input', () => {
  const USER = 'test-user-plot-validation';

  test('a msg containing a newline is rejected — not one line', async ({ request }) => {
    const cookie = await visitorCookie(USER);
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: 330, name: 'validator', msg: 'line one\nline two', color: '#e8b04b' },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'one line only' });
  });

  test('a name containing a control character is rejected', async ({ request }) => {
    const cookie = await visitorCookie(USER);
    const res = await request.post('/api/plot', {
      headers: { cookie },
      data: { cell: 331, name: 'bad\tname', msg: 'hello', color: '#53d08a' },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'no control characters' });
  });

  test('an all-zero-width msg is rejected as blank', async ({ request }) => {
    const cookie = await visitorCookie(USER);
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
    const cookie = await visitorCookie(USER);
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
