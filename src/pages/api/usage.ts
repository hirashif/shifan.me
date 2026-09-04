import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// This is a public write endpoint guarded only by a shared bearer token, so
// the comparison has to be constant-time — a naive `===` leaks how many
// leading bytes matched through response timing, letting an attacker
// recover USAGE_TOKEN one byte at a time. Workers' `crypto.subtle` exposes
// a non-standard `timingSafeEqual(a, b)` (confirmed present in workerd,
// the runtime this Worker actually runs on, not just in its type
// definitions) for exactly this. It throws on a byte-length mismatch
// instead of returning false, so the length check must run first and
// short-circuit before it's ever called.
function timingSafeEqualStrings(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.byteLength !== bBytes.byteLength) return false;
  return crypto.subtle.timingSafeEqual(aBytes, bBytes);
}

// Every incoming field is coerced to a number and clamped to a sane,
// non-negative, finite value rather than trusted as-is — an attacker who
// has (or guesses at) the token shouldn't be able to write `NaN`,
// `Infinity`, a negative cost, or an arbitrary string into KV.
function coerceNonNegative(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// The local YYYY-MM-DD day `today`/`tokensToday` describe, per
// scripts/push-usage.ts. Anything that isn't exactly that shape (missing,
// wrong type, malformed) is dropped rather than stored — an unparseable
// date is worse than no date, since tokens.ts treats a missing date as
// "unknown, dash it out" but would mis-render a garbage string as-is.
function coerceDate(v: unknown): string | undefined {
  return typeof v === 'string' && DATE_RE.test(v) ? v : undefined;
}

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${env.USAGE_TOKEN}`;
  if (!timingSafeEqualStrings(auth, expected)) {
    return new Response('unauthorized', { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const snapshot = {
    today: coerceNonNegative(body.today),
    week: coerceNonNegative(body.week),
    year: coerceNonNegative(body.year),
    tokensToday: coerceNonNegative(body.tokensToday),
    updatedAt: Date.now(),
    date: coerceDate(body.date),
  };

  await env.USAGE.put('usage:latest', JSON.stringify(snapshot));

  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
