import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// Zero snapshot: the honest default when nothing has been pushed to KV yet.
// The client (src/components/tokens.ts) treats `updatedAt: 0` as maximally
// stale and renders `—` rather than presenting these zeros as a real figure.
const EMPTY = { today: 0, week: 0, year: 0, tokensToday: 0, updatedAt: 0 };

export const GET: APIRoute = async () => {
  const raw = await env.USAGE.get('usage:latest');
  return new Response(raw ?? JSON.stringify(EMPTY), {
    headers: {
      'content-type': 'application/json',
      // The footer only needs to update once a day (the push script runs
      // once per day); a short public cache keeps repeat visits within a
      // session from re-hitting KV on every page load.
      'cache-control': 'public, max-age=300',
    },
  });
};
