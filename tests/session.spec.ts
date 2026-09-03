import { test, expect } from '@playwright/test';
// Imported from `session-core`, not `session`: `session.ts` re-exports these
// but also defines `getSession`, which dynamically imports `cloudflare:workers`
// — a module that only resolves inside the Worker runtime, not in this Node
// test process. `session-core.ts` has no such dependency and is safe here.
import { sign, verify } from '../src/lib/session-core';

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
