import { test, expect } from '@playwright/test';

const SFX_FILES = ['success.mp3', 'blocked.mp3', 'copy.mp3', 'toggle-on.mp3', 'open.mp3', 'select.mp3'];

// Playwright can't hear audio, so every test here asserts on the one thing
// that is observable: whether `Audio.prototype.play` was invoked. This spy
// is installed with addInitScript so it's in place before any of the site's
// own scripts run.
async function spyOnAudioPlay(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    (window as unknown as { __playCalls: string[] }).__playCalls = [];
    const proto = window.HTMLAudioElement.prototype;
    const orig = proto.play;
    proto.play = function (this: HTMLAudioElement, ...args: unknown[]) {
      (window as unknown as { __playCalls: string[] }).__playCalls.push(this.src);
      return orig.apply(this, args as []).catch(() => undefined);
    };
  });
}

function playCalls(page: import('@playwright/test').Page) {
  return page.evaluate(() => (window as unknown as { __playCalls: string[] }).__playCalls);
}

for (const file of SFX_FILES) {
  test(`public/sfx/${file} is served`, async ({ request }) => {
    const res = await request.get(`/sfx/${file}`);
    expect(res.status()).toBe(200);
  });
}

test('the dock sound toggle flips localStorage and persists across reload', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'mute sounds' });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();
  expect(await page.evaluate(() => localStorage.getItem('shifan-sound'))).toBe('off');
  await expect(page.getByRole('button', { name: 'unmute sounds' })).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('shifan-sound'))).toBe('off');
  await expect(page.getByRole('button', { name: 'unmute sounds' })).toHaveAttribute('aria-pressed', 'true');
});

test('muted: no audio playback is attempted for copy, theme toggle, or tag filter', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await spyOnAudioPlay(page);
  await page.addInitScript(() => localStorage.setItem('shifan-sound', 'off'));

  await page.goto('/');
  await page.getByRole('button', { name: 'copy email' }).click();
  await expect(page.getByText('copied')).toBeVisible();
  await page.getByRole('button', { name: 'toggle theme' }).click();
  await page.getByRole('button', { name: 'shifan' }).click();

  await page.goto('/writing');
  await page.locator('[data-tag]').nth(1).click();

  expect(await playCalls(page)).toEqual([]);
});

test('muted: a plot claim success attempts no playback', async ({ page }) => {
  await spyOnAudioPlay(page);
  await page.addInitScript(() => localStorage.setItem('shifan-sound', 'off'));
  await page.route('**/api/plot', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 201, json: { ok: true, cell: 10 } });
    }
    return route.fulfill({ json: { cells: [], mine: null } });
  });
  await page.goto('/plot');
  await page.locator('[data-cell="10"]').click();
  await page.getByRole('button', { name: /claim/ }).click();
  await expect(page.locator('[data-plot-claimed]')).toBeVisible();
  expect(await playCalls(page)).toEqual([]);
});

test('unmuted: copying the email attempts playback of copy.mp3', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await spyOnAudioPlay(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'copy email' }).click();
  await expect(page.getByText('copied')).toBeVisible();
  const calls = await playCalls(page);
  expect(calls.some((src) => src.includes('/sfx/copy.mp3'))).toBe(true);
});

test('unmuted: toggling the theme attempts playback of toggle-on.mp3', async ({ page }) => {
  await spyOnAudioPlay(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'toggle theme' }).click();
  const calls = await playCalls(page);
  expect(calls.some((src) => src.includes('/sfx/toggle-on.mp3'))).toBe(true);
});

test('unmuted: opening the name popover attempts playback of open.mp3, closing it attempts none more', async ({ page }) => {
  await spyOnAudioPlay(page);
  await page.goto('/');
  const nameBtn = page.getByRole('button', { name: 'shifan' });
  await nameBtn.click();
  await expect(page.locator('[data-name-tip]')).toBeVisible();
  const afterOpen = await playCalls(page);
  expect(afterOpen.some((src) => src.includes('/sfx/open.mp3'))).toBe(true);
  const countAfterOpen = afterOpen.length;

  await page.keyboard.press('Escape');
  await expect(page.locator('[data-name-tip]')).toBeHidden();
  const afterClose = await playCalls(page);
  expect(afterClose.length).toBe(countAfterOpen);
});

test('unmuted: clicking a writing tag filter attempts playback of select.mp3', async ({ page }) => {
  await spyOnAudioPlay(page);
  await page.goto('/writing');
  await page.locator('[data-tag]').nth(1).click();
  const calls = await playCalls(page);
  expect(calls.some((src) => src.includes('/sfx/select.mp3'))).toBe(true);
});

test('unmuted: a plot claim success attempts playback of success.mp3', async ({ page }) => {
  await spyOnAudioPlay(page);
  await page.route('**/api/plot', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 201, json: { ok: true, cell: 11 } });
    }
    return route.fulfill({ json: { cells: [], mine: null } });
  });
  await page.goto('/plot');
  await page.locator('[data-cell="11"]').click();
  await page.getByRole('button', { name: /claim/ }).click();
  await expect(page.locator('[data-plot-claimed]')).toBeVisible();
  const calls = await playCalls(page);
  expect(calls.some((src) => src.includes('/sfx/success.mp3'))).toBe(true);
});

test('unmuted: a rejected plot claim attempts playback of blocked.mp3', async ({ page }) => {
  await spyOnAudioPlay(page);
  await page.route('**/api/plot', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 409, json: { error: 'that pixel is taken' } });
    }
    return route.fulfill({ json: { cells: [], mine: null } });
  });
  await page.goto('/plot');
  await page.locator('[data-cell="12"]').click();
  await page.getByRole('button', { name: /claim/ }).click();
  await expect(page.locator('[data-plot-error]')).toBeVisible();
  const calls = await playCalls(page);
  expect(calls.some((src) => src.includes('/sfx/blocked.mp3'))).toBe(true);
});

test('prefers-reduced-motion with no stored preference starts muted', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'unmute sounds' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('shifan-sound'))).toBeNull();
});

test('an explicit stored preference beats prefers-reduced-motion', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('shifan-sound', 'on'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'mute sounds' })).toHaveAttribute('aria-pressed', 'false');
});

test('no console errors triggering every sound event on / and /writing and /plot', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.route('**/api/plot', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 201, json: { ok: true, cell: 20 } });
    }
    return route.fulfill({ json: { cells: [], mine: null } });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'copy email' }).click();
  await page.getByRole('button', { name: 'toggle theme' }).click();
  await page.getByRole('button', { name: 'shifan' }).click();
  await page.locator('[data-cell="20"]').click();
  await page.getByRole('button', { name: /claim/ }).click();

  await page.goto('/writing');
  await page.locator('[data-tag]').nth(1).click();

  await page.waitForTimeout(200);
  expect(errors).toEqual([]);
});
