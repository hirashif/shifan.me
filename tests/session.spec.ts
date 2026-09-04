import { test, expect } from '@playwright/test';
// Imported from `session-core`, not `session`: `session.ts` re-exports these
// but also defines `getSession`, which dynamically imports `cloudflare:workers`
// — a module that only resolves inside the Worker runtime, not in this Node
// test process. `session-core.ts` has no such dependency and is safe here.
import { sign, verify, isSafeRedirect, readCookie, COOKIE } from '../src/lib/session-core';

// readCookie() has no dedicated coverage of its own — verify() was tested
// exhaustively but the malformed-percent-encoding throw lived in readCookie,
// upstream of verify()'s try/catch, so it escaped every one of those tests.
function fakeRequest(cookieHeader: string | null): Request {
  const headers = new Headers();
  if (cookieHeader !== null) headers.set('cookie', cookieHeader);
  return new Request('https://shifan.me/', { headers });
}

test('a malformed percent-encoding resolves to null instead of throwing', () => {
  // decodeURIComponent('%zz') throws URIError — this is the exact
  // reproduction from `curl -H 'Cookie: shifan_session=%zz' ...`.
  expect(readCookie(fakeRequest(`${COOKIE}=%zz`), COOKIE)).toBeNull();
});

test('a validly percent-encoded value round-trips', () => {
  expect(readCookie(fakeRequest(`${COOKIE}=abc%2Edef`), COOKIE)).toBe('abc.def');
});

test('a missing cookie header returns null', () => {
  expect(readCookie(fakeRequest(null), COOKIE)).toBeNull();
});

test('a cookie header without the named cookie returns null', () => {
  expect(readCookie(fakeRequest('other=1'), COOKIE)).toBeNull();
});

test('a signed payload verifies', async () => {
  const token = await sign({ id: '1', login: 'octocat' }, 'secret');
  expect(await verify(token, 'secret')).toEqual({ id: '1', login: 'octocat' });
});

test('a tampered payload does not verify', async () => {
  const token = await sign({ id: '1', login: 'octocat' }, 'secret');
  const [, sig] = token.split('.');
  const forged = btoa(JSON.stringify({ id: '2', login: 'evil' })).replace(/=/g, '');
  expect(await verify(`${forged}.${sig}`, 'secret')).toBeNull();
});

test('a wrong secret does not verify', async () => {
  const token = await sign({ id: '1', login: 'octocat' }, 'secret');
  expect(await verify(token, 'other')).toBeNull();
});

test('a malformed token with no separator does not verify', async () => {
  expect(await verify('not-a-valid-token', 'secret')).toBeNull();
});

test('a malformed signature resolves to null instead of throwing', async () => {
  const token = await sign({ id: '1', login: 'octocat' }, 'secret');
  const [body] = token.split('.');
  // "!!!" isn't valid base64url — unb64url(sig) calls atob(), which throws
  // on it. Regression test for a bug where that throw happened outside the
  // try/catch, so verify() (and getSession(), which awaits it) rejected
  // instead of resolving null, 500ing the route on a hand-crafted cookie.
  await expect(verify(`${body}.!!!`, 'secret')).resolves.toBeNull();
});

const ORIGIN = 'https://shifan.me';

test('same-site paths are safe redirects', () => {
  expect(isSafeRedirect('/plot', ORIGIN)).toBe(true);
  expect(isSafeRedirect('/plot/foo?x=1', ORIGIN)).toBe(true);
});

test('a bare double-slash is not a safe redirect', () => {
  // "//evil.com" starts with "/" but browsers resolve it as scheme-relative,
  // i.e. off-site.
  expect(isSafeRedirect('//evil.com', ORIGIN)).toBe(false);
});

test('a literal tab smuggled into the path is not a safe redirect', () => {
  // A request to /api/auth/github?back=%2F%09%2Fevil.com has its query
  // string percent-decoded by URLSearchParams, producing a `back` value
  // containing a literal tab byte — exactly what this simulates. The WHATWG
  // URL parser strips bare tab/CR/LF before resolving a URL, so browsers
  // treat "/\t/evil.com" as "//evil.com": scheme-relative, off-site. A naive
  // `startsWith('/') && !startsWith('//')` prefix check misses this because
  // the second character is a tab, not `/`.
  const back = new URLSearchParams('back=/%09/evil.com').get('back')!;
  expect(back).toBe('/\t/evil.com');
  expect(isSafeRedirect(back, ORIGIN)).toBe(false);
});

test('other control characters are not safe redirects', () => {
  expect(isSafeRedirect('/\r/evil.com', ORIGIN)).toBe(false);
  expect(isSafeRedirect('/\n/evil.com', ORIGIN)).toBe(false);
});

test('a backslash-prefixed path is not a safe redirect', () => {
  expect(isSafeRedirect('/\\evil.com', ORIGIN)).toBe(false);
});

test('an absolute URL to another origin is not a safe redirect', () => {
  expect(isSafeRedirect('https://evil.com', ORIGIN)).toBe(false);
});
