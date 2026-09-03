import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const state = crypto.randomUUID();
  const back = url.searchParams.get('back') ?? '/plot';
  const redirect = new URL('https://github.com/login/oauth/authorize');
  redirect.searchParams.set('client_id', env.GITHUB_CLIENT_ID as string);
  redirect.searchParams.set('redirect_uri', `${url.origin}/api/auth/callback`);
  redirect.searchParams.set('state', state);
  redirect.searchParams.set('scope', ''); // public identity only

  return new Response(null, {
    status: 302,
    headers: [
      ['location', redirect.toString()],
      ['set-cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`],
      ['set-cookie', `oauth_back=${encodeURIComponent(back)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`],
    ],
  });
};
