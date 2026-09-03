// Pure session crypto — signing, verification, and cookie helpers.
//
// This module intentionally has no dependency on the Cloudflare Workers
// runtime (no `cloudflare:workers` import), so it can be imported directly
// in Node (e.g. by Playwright tests) as well as in the Worker. The
// runtime-bound `getSession` — which needs `env.SESSION_SECRET` — lives in
// `./session.ts` instead.

export interface SessionUser {
  id: string;
  login: string;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function unb64url(s: string): Uint8Array<ArrayBuffer> {
  const p = s
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(s.length / 4) * 4, '=');
  // Uint8Array.from always backs itself with a fresh, non-shared ArrayBuffer,
  // but TS's DOM lib types the return as Uint8Array<ArrayBufferLike> (which
  // admits SharedArrayBuffer); narrow it back so callers can pass this
  // straight to crypto.subtle.verify as a BufferSource.
  return Uint8Array.from(atob(p), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
}

async function key(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function sign(user: SessionUser, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(user)));
  const sig = await crypto.subtle.sign('HMAC', await key(secret), enc.encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

export async function verify(token: string, secret: string): Promise<SessionUser | null> {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  // crypto.subtle.verify is constant-time; never compare signatures with ===.
  const ok = await crypto.subtle.verify('HMAC', await key(secret), unb64url(sig), enc.encode(body));
  if (!ok) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(unb64url(body)));
    if (typeof parsed?.id !== 'string' || typeof parsed?.login !== 'string') return null;
    return parsed as SessionUser;
  } catch {
    return null;
  }
}

export const COOKIE = 'shifan_session';

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function cookieHeader(value: string, maxAge: number): string {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
