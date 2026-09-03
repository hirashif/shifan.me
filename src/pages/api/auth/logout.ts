import type { APIRoute } from 'astro';
import { COOKIE } from '../../../lib/session-core';

export const prerender = false;

export const GET: APIRoute = () => {
  return new Response(null, {
    status: 302,
    headers: [
      ['location', '/plot'],
      ['set-cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`],
    ],
  });
};
