import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { sign, cookieHeader, readCookie } from '../../../lib/session-core';

export const prerender = false;

// A same-site path: starts with exactly one `/`, never `//` or `/\` (both of
// which browsers resolve as scheme-relative — i.e. off-site — URLs).
function isSafeRedirect(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\');
}

export const GET: APIRoute = async ({ request, url }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = readCookie(request, 'oauth_state');
  if (!code || !state || !expected || state !== expected) {
    return new Response('bad oauth state', { status: 400 });
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/auth/callback`,
    }),
  });
  const { access_token } = await tokenRes.json<{ access_token?: string }>();
  if (!access_token) return new Response('oauth exchange failed', { status: 400 });

  const userRes = await fetch('https://api.github.com/user', {
    headers: { authorization: `Bearer ${access_token}`, 'user-agent': 'shifan.me', accept: 'application/vnd.github+json' },
  });
  const user = await userRes.json<{ id: number; login: string }>();
  // The GitHub token is used once, right above, to fetch the user's id and
  // login, then deliberately discarded — never stored, logged, or reused.
  // The site never acts on the user's behalf.

  const token = await sign({ id: String(user.id), login: user.login }, env.SESSION_SECRET as string);
  const back = readCookie(request, 'oauth_back') ?? '/plot';

  return new Response(null, {
    status: 302,
    headers: [
      // `back` came from a cookie we set, but it's still attacker-influenced
      // (it started life as a query param on /api/auth/github), so it's
      // validated here too, right before use, not just when first stored.
      // A bare `startsWith('/')` check alone would still let `//evil.com` or
      // `/\evil.com` through — browsers treat both as scheme-relative URLs
      // and redirect off-site — so those are rejected too.
      ['location', isSafeRedirect(back) ? back : '/plot'],
      ['set-cookie', cookieHeader(token, 60 * 60 * 24 * 30)],
      ['set-cookie', 'oauth_state=; Path=/; Max-Age=0'],
      ['set-cookie', 'oauth_back=; Path=/; Max-Age=0'],
    ],
  });
};
