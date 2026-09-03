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
  try {
    // unb64url(sig) and unb64url(body) both call atob(), which throws on
    // input that isn't valid base64 (e.g. a hand-crafted cookie like
    // "abc.!!!"). Everything from here down — including the signature
    // decode — is inside this try/catch so any such input resolves to
    // null instead of throwing out of verify()/getSession() and 500ing.
    //
    // crypto.subtle.verify is constant-time; never compare signatures with ===.
    const ok = await crypto.subtle.verify('HMAC', await key(secret), unb64url(sig), enc.encode(body));
    if (!ok) return null;
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

// ASCII control characters (0x00-0x1f) and DEL (0x7f). The WHATWG URL parser
// strips bare tab/CR/LF from a URL before resolving it, so a value like
// "/\t/evil.com" (a literal tab byte, delivered as %09 in a query string or
// cookie and decoded back to the raw byte by URLSearchParams/decodeURIComponent)
// parses as "//evil.com" — a scheme-relative redirect to an attacker's host.
// Rejecting any control character outright closes that class of bypass
// without needing to enumerate every character the parser might strip.
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

/**
 * True only if `back`, resolved against `origin`, stays on `origin` — i.e. a
 * same-site, root-relative path. A prefix check like `startsWith('/')` is not
 * enough on its own: `//evil.com` and `/\evil.com` both start with `/` but
 * browsers resolve them as scheme-relative (off-site) URLs, and any raw
 * control character (e.g. a literal tab) can make an otherwise-blocked
 * prefix look safe to a naive check while still being stripped by the URL
 * parser into one of those forms. Resolving via `new URL` and comparing
 * `.origin` is correct by construction instead of chasing bypasses one at a
 * time.
 */
export function isSafeRedirect(back: string, origin: string): boolean {
  if (CONTROL_CHARS.test(back)) return false;
  if (!back.startsWith('/')) return false;
  try {
    return new URL(back, origin).origin === origin;
  } catch {
    return false;
  }
}
