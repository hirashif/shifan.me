// Runtime session access — depends on the Cloudflare Workers env binding,
// so this module is not safe to import from Node (e.g. tests). Pure crypto
// and cookie helpers live in `./session-core` and are re-exported below for
// convenience; import from `./session-core` directly if you need them
// outside the Worker runtime.

import type { SessionUser } from './session-core';
import { verify, readCookie, COOKIE, cookieHeader, sign } from './session-core';

export type { SessionUser };
export { sign, verify, readCookie, COOKIE, cookieHeader };

export async function getSession(request: Request): Promise<SessionUser | null> {
  const { env } = await import('cloudflare:workers');
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  return verify(token, env.SESSION_SECRET as string);
}
