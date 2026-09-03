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

  const cell = Number(body.cell);
  const name = String(body.name ?? '').trim();
  const msg = String(body.msg ?? '').trim();
  const color = String(body.color ?? '');

  if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS) return json({ error: 'bad cell' }, 400);
  if (name.length < 1 || name.length > 40) return json({ error: 'name must be 1-40 chars' }, 400);
  if (msg.length < 1 || msg.length > 120) return json({ error: 'one line, 120 chars max' }, 400);
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
