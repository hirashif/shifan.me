import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { CELLS, PALETTE } from '../../lib/coords';
import { getSession } from '../../lib/session';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

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
  const session = await getSession(request);
  const { results } = await env.DB
    .prepare('SELECT cell, name, msg, color, created_at FROM plot ORDER BY created_at DESC')
    .all();
  const mine = session ? await myCell(session.id) : null;
  return json({ cells: results, mine }, 200);
};

async function myCell(userId: string): Promise<number | null> {
  const row = await env.DB
    .prepare('SELECT cell FROM plot WHERE user_id = ?').bind(userId).first<{ cell: number }>();
  return row?.cell ?? null;
}

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return json({ error: 'sign in with github to claim a pixel' }, 401);

  let body: { cell?: unknown; name?: unknown; msg?: unknown; color?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const name = String(body.name ?? '').trim();
  const msg = String(body.msg ?? '').trim();
  const color = String(body.color ?? '');

  // `Number(body.cell)` would also accept `true` (1), `[]` (0), `"0x10"`
  // (16), and `"1e2"` (100) — none of those are what a client is supposed
  // to send. Requiring the JSON value to already be a number rejects those
  // before the integer/range check even runs.
  if (typeof body.cell !== 'number' || !Number.isInteger(body.cell) || body.cell < 0 || body.cell >= CELLS)
    return json({ error: 'bad cell' }, 400);
  const cell = body.cell;

  if (name.length < 1 || name.length > 40) return json({ error: 'name must be 1-40 chars' }, 400);
  if (CONTROL_CHARS.test(name)) return json({ error: 'no control characters' }, 400);
  if (isBlank(name)) return json({ error: 'name must be 1-40 chars' }, 400);

  if (msg.length < 1 || msg.length > 120) return json({ error: 'one line, 120 chars max' }, 400);
  if (CONTROL_CHARS.test(msg)) return json({ error: 'one line only' }, 400);
  if (isBlank(msg)) return json({ error: 'one line, 120 chars max' }, 400);

  if (!(PALETTE as readonly string[]).includes(color)) return json({ error: 'bad color' }, 400);

  try {
    await env.DB.prepare(
      'INSERT INTO plot (cell, user_id, name, msg, color, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(cell, session.id, name, msg, color, Date.now()).run();
  } catch {
    // UNIQUE(user_id) or PRIMARY KEY(cell) — whoever lost the race gets 409.
    const taken = await env.DB.prepare('SELECT 1 FROM plot WHERE cell = ?').bind(cell).first();
    return json({ error: taken ? 'that pixel is taken' : 'you already have a pixel' }, 409);
  }

  return json({ ok: true, cell }, 201);
};
