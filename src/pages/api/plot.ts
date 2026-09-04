import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { CELLS, PALETTE } from '../../lib/coords';
import { sign, verify, readCookie, cookieHeader, COOKIE } from '../../lib/session-core';

export const prerender = false;

// One year — this is a long-lived anonymous visitor id, not a short-lived
// auth session, so there's no reason to force a re-mint any sooner.
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const json = (body: unknown, status = 200, extra: Record<string, string> | undefined = undefined) =>
  new Response(JSON.stringify(body), {
    status,
    // GET's response body includes `mine`, which varies per visitor by
    // visitor cookie. Without this, a shared/edge cache would be free to
    // serve one visitor's `mine` value (which cell is theirs) to another.
    // Doubly important now that POST responses may carry a Set-Cookie.
    headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store', ...(extra ?? {}) },
  });

// Read-only: resolves the visitor id from a valid, signed `shifan_visitor`
// cookie, or null if there isn't one. Never mints — a GET must not have the
// side effect of creating an identity, only POST (claiming) does.
async function resolveVisitor(request: Request): Promise<string | null> {
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  const user = await verify(token, env.SESSION_SECRET as string);
  return user?.id ?? null;
}

// POST-only: resolves the visitor id from a valid cookie, or mints a fresh
// signed one if the cookie is absent or fails verification (missing,
// malformed, tampered, or forged). The returned id is never taken from an
// unverified payload — an invalid signature always falls through to a brand
// new `crypto.randomUUID()`, so a forged cookie can never make the server
// trust an attacker-chosen id.
async function resolveOrMintVisitor(request: Request): Promise<{ id: string; setCookie: string | null }> {
  const token = readCookie(request, COOKIE);
  if (token) {
    const user = await verify(token, env.SESSION_SECRET as string);
    if (user) return { id: user.id, setCookie: null };
  }
  const id = crypto.randomUUID();
  const fresh = await sign({ id, login: 'anon' }, env.SESSION_SECRET as string);
  return { id, setCookie: cookieHeader(fresh, VISITOR_COOKIE_MAX_AGE) };
}

// The design calls `name`/`msg` "one line" and the plot UI (Task 10) renders
// them into a tooltip and a recent-claims list — a `\n`/`\r`/`\t` or other
// C0/C1 control character would silently break that layout for everyone,
// not just the claimant who typed it. Rejected outright rather than
// stripped: silently mutating someone's message is worse than telling them
// it isn't allowed.
const CONTROL_CHARS = /[\x00-\x1f\x7f-\x9f]/;

// Zero-width characters survive `.trim()` and a length check unchanged but
// render as nothing, so a message made entirely of them would otherwise
// pass validation and show up blank.
// Built from numeric code points, not a character class literal, so no
// actual zero-width character has to appear (visibly or invisibly) in this
// source file.
const ZERO_WIDTH = new RegExp(`[${String.fromCharCode(0x200b, 0x200c, 0x200d, 0xfeff)}]`, 'g');
const isBlank = (s: string): boolean => s.replace(ZERO_WIDTH, '').length === 0;

export const GET: APIRoute = async ({ request }) => {
  const visitorId = await resolveVisitor(request);
  const { results } = await env.DB
    .prepare('SELECT cell, name, msg, color, created_at FROM plot ORDER BY created_at DESC')
    .all();
  const mine = visitorId ? await myCell(visitorId) : null;
  return json({ cells: results, mine }, 200);
};

async function myCell(userId: string): Promise<number | null> {
  const row = await env.DB
    .prepare('SELECT cell FROM plot WHERE user_id = ?').bind(userId).first<{ cell: number }>();
  return row?.cell ?? null;
}

export const POST: APIRoute = async ({ request }) => {
  // Resolved (and, if needed, minted) up front so every response below —
  // success or error — carries the Set-Cookie for a first-time visitor.
  // Cheap and side-effect-free to compute even on a request that ultimately
  // fails validation: it saves a client that retries after fixing a 400
  // from needing a second round trip just to pick up its identity.
  const { id: visitorId, setCookie } = await resolveOrMintVisitor(request);
  const headers: Record<string, string> = setCookie ? { 'set-cookie': setCookie } : {};

  let body: { cell?: unknown; name?: unknown; msg?: unknown; color?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400, headers);
  }

  const name = String(body.name ?? '').trim();
  const msg = String(body.msg ?? '').trim();
  const color = String(body.color ?? '');

  // `Number(body.cell)` would also accept `true` (1), `[]` (0), `"0x10"`
  // (16), and `"1e2"` (100) — none of those are what a client is supposed
  // to send. Requiring the JSON value to already be a number rejects those
  // before the integer/range check even runs.
  if (typeof body.cell !== 'number' || !Number.isInteger(body.cell) || body.cell < 0 || body.cell >= CELLS)
    return json({ error: 'bad cell' }, 400, headers);
  const cell = body.cell;

  if (name.length < 1 || name.length > 40) return json({ error: 'name must be 1-40 chars' }, 400, headers);
  if (CONTROL_CHARS.test(name)) return json({ error: 'no control characters' }, 400, headers);
  if (isBlank(name)) return json({ error: 'name must be 1-40 chars' }, 400, headers);

  if (msg.length < 1 || msg.length > 120) return json({ error: 'one line, 120 chars max' }, 400, headers);
  if (CONTROL_CHARS.test(msg)) return json({ error: 'one line only' }, 400, headers);
  if (isBlank(msg)) return json({ error: 'one line, 120 chars max' }, 400, headers);

  if (!(PALETTE as readonly string[]).includes(color)) return json({ error: 'bad color' }, 400, headers);

  try {
    await env.DB.prepare(
      'INSERT INTO plot (cell, user_id, name, msg, color, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(cell, visitorId, name, msg, color, Date.now()).run();
  } catch {
    // UNIQUE(user_id) or PRIMARY KEY(cell) — whoever lost the race gets 409.
    const taken = await env.DB.prepare('SELECT 1 FROM plot WHERE cell = ?').bind(cell).first();
    return json({ error: taken ? 'that pixel is taken' : 'you already have a pixel' }, 409, headers);
  }

  return json({ ok: true, cell }, 201, headers);
};
