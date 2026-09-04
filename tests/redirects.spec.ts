import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// These stubs live in redirect-site/ and are deployed to the old
// hirashif.github.io repo, not served by this app's dev server — so this
// suite reads the files directly rather than navigating a live page.
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'redirect-site');

const SLUG_TARGETS: Record<string, string> = {
  'cross-desk.html': 'https://shifan.me/writing/cross-desk/',
  'agentic-payments.html': 'https://shifan.me/writing/agentic-payments/',
  'ap2-x402.html': 'https://shifan.me/writing/ap2-x402/',
  'concurrency.html': 'https://shifan.me/writing/concurrency/',
  'inference.html': 'https://shifan.me/writing/inference/',
  'ledger-bug.html': 'https://shifan.me/writing/ledger-bug/',
  'ordering.html': 'https://shifan.me/writing/ordering/',
};

function assertStub(html: string, target: string) {
  expect(html).toContain(`<link rel="canonical" href="${target}" />`);
  expect(html).toContain(`<meta http-equiv="refresh" content="0; url=${target}" />`);
  // No `noindex`: pairing a canonical (consolidate link equity onto the new
  // url) with noindex (drop this page from the index) sends conflicting
  // signals and undercuts the very link-equity transfer these stubs exist
  // for. `follow` alone (via the absence of `nofollow`, plus the canonical)
  // is the correct signal here.
  expect(html).not.toContain('noindex');
  expect(html).toContain(`location.replace('${target}');`);
  expect(html).toContain(`href="${target}">shifan.me</a>`);
  // every redirect target must carry a trailing slash
  expect(target.endsWith('/')).toBe(true);
}

test('every writeup slug has a stub pointing at the matching /writing/<slug>/ url', () => {
  for (const [file, target] of Object.entries(SLUG_TARGETS)) {
    const html = readFileSync(join(ROOT, 'writeups', file), 'utf-8');
    assertStub(html, target);
  }
});

test('the writeups directory has exactly the seven mapped stubs', () => {
  const files = readdirSync(join(ROOT, 'writeups')).sort();
  expect(files).toEqual(Object.keys(SLUG_TARGETS).sort());
});

test('index.html and 404.html both redirect to the site root', () => {
  for (const file of ['index.html', '404.html']) {
    const html = readFileSync(join(ROOT, file), 'utf-8');
    assertStub(html, 'https://shifan.me/');
  }
});

test('the kill-switch service worker exists and clears/unregisters', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf-8');
  // must exist at this exact path so a stale registration from the old
  // GitProfile-era worker (or the prior kill-switch) fetches it on update
  // rather than getting a 404, which the service worker spec would leave
  // in place, stranding those visitors on cached old content forever.
  expect(sw).toContain('unregister()');
  expect(sw).toContain('caches.delete');
});

test('stub copy is lowercase and carries no emoji', () => {
  const files = [
    'index.html',
    '404.html',
    ...Object.keys(SLUG_TARGETS).map((f) => join('writeups', f)),
  ];
  for (const file of files) {
    const html = readFileSync(join(ROOT, file), 'utf-8');
    const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
    expect(bodyMatch).not.toBeNull();
    const visibleText = bodyMatch![1].replace(/<script>[\s\S]*?<\/script>/, '');
    // no emoji (rough range check covering common emoji blocks)
    expect(visibleText).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  }
});
