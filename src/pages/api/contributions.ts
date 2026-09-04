import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { fetchContributions, type ContributionDay } from '../../lib/contributions';

export const prerender = false;

const KV_KEY = 'contrib:latest';
// GitHub's contributions fragment doesn't change more than once a day (it's
// a calendar of days, not a live counter), so a 6h TTL keeps this well
// within "fresh" for viewers while sparing GitHub a fetch on every page
// load. Distinct KV key from usage.ts's `usage:latest` — same USAGE
// namespace, unrelated data.
const TTL_MS = 6 * 60 * 60 * 1000;

interface CachedPayload {
  days: ContributionDay[];
  updatedAt: number;
}

function isFresh(payload: CachedPayload): boolean {
  return Date.now() - payload.updatedAt < TTL_MS;
}

function jsonResponse(days: ContributionDay[]): Response {
  return new Response(JSON.stringify(days), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      // Public cache slightly under the KV TTL so repeat visits within a
      // session don't re-hit this route (and, transitively, KV) constantly.
      'cache-control': 'public, max-age=1800',
    },
  });
}

export const GET: APIRoute = async () => {
  const raw = await env.USAGE.get(KV_KEY);
  let cached: CachedPayload | null = null;
  if (raw) {
    try {
      cached = JSON.parse(raw) as CachedPayload;
    } catch {
      cached = null;
    }
  }

  if (cached && isFresh(cached)) {
    return jsonResponse(cached.days);
  }

  try {
    const days = await fetchContributions();
    const payload: CachedPayload = { days, updatedAt: Date.now() };
    await env.USAGE.put(KV_KEY, JSON.stringify(payload));
    return jsonResponse(days);
  } catch {
    // GitHub fetch failed (rate limit, outage, markup drift). Serve
    // whatever is cached, however stale, rather than error — the client
    // island degrades further by simply not rendering the section if this
    // comes back empty. Numbers are never fabricated here: this path only
    // ever returns previously-parsed real data or nothing at all.
    if (cached) return jsonResponse(cached.days);
    return jsonResponse([]);
  }
};
