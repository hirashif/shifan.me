import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { sign, cookieHeader, readCookie, isSafeRedirect } from '../../../lib/session-core';

export const prerender = false;

// Clears the two short-lived oauth_* cookies. Used on every exit path from
// this handler — including rejection — so a failed attempt doesn't leave
// them lingering until their natural 10-minute expiry.
const CLEAR_OAUTH_COOKIES: [string, string][] = [
  ['set-cookie', 'oauth_state=; Path=/; Max-Age=0'],
  ['set-cookie', 'oauth_back=; Path=/; Max-Age=0'],
];

export const GET: APIRoute = async ({ request, url }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = readCookie(request, 'oauth_state');
  if (!code || !state || !expected || state !== expected) {
    return new Response('bad oauth state', { status: 400, headers: CLEAR_OAUTH_COOKIES });
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
  if (!access_token) return new Response('oauth exchange failed', { status: 400, headers: CLEAR_OAUTH_COOKIES });

  const userRes = await fetch('https://api.github.com/user', {
    headers: { authorization: `Bearer ${access_token}`, 'user-agent': 'shifan.me', accept: 'application/vnd.github+json' },
  });
  // The GitHub token is used once, right above, to fetch the user's id and
  // login, then deliberately discarded — never stored, logged, or reused.
  // The site never acts on the user's behalf.
  if (!userRes.ok) return new Response('oauth exchange failed', { status: 400, headers: CLEAR_OAUTH_COOKIES });
  const user = await userRes.json<{ id?: unknown; login?: unknown }>();
  if (typeof user.id !== 'number' || typeof user.login !== 'string' || !user.login) {
    return new Response('oauth exchange failed', { status: 400, headers: CLEAR_OAUTH_COOKIES });
  }

  const token = await sign({ id: String(user.id), login: user.login }, env.SESSION_SECRET as string);
  const back = readCookie(request, 'oauth_back') ?? '/plot';

  return new Response(null, {
    status: 302,
    headers: [
      // `back` came from a cookie we set, but it's still attacker-influenced
      // (it started life as a query param on /api/auth/github, validated —
      // and, since query-string percent-decoding happens there, sanitized —
      // before being written to the cookie). It's validated again here,
      // right before use: defence in depth, not a substitute for the check
      // at write time.
      ['location', isSafeRedirect(back, url.origin) ? back : '/plot'],
      ['set-cookie', cookieHeader(token, 60 * 60 * 24 * 30)],
      ...CLEAR_OAUTH_COOKIES,
    ],
  });
};
