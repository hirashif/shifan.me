import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://shifan.me',
  adapter: cloudflare(),
  integrations: [mdx()],
  vite: { plugins: [tailwindcss()] },
  // The resume lives at /hereismyresume: a fully readable path with no
  // random characters, chosen so it reads naturally when pasted into an
  // email. Keep this older high-entropy link working for anyone who already
  // has it — it must point at the current path, not a bare /resume (see
  // CLAUDE.md).
  redirects: {
    '/2v16erb7nu5o5c': '/hereismyresume',
  },
  // The dev toolbar injects an audit overlay into every page (including an
  // extra <h1>) which is harmless by hand but flakes Playwright's strict
  // element matching under parallel workers. Disable it only for the test
  // run (playwright.config.ts sets ASTRO_DEV_TOOLBAR=0); `pnpm dev` keeps it.
  devToolbar: { enabled: process.env.ASTRO_DEV_TOOLBAR !== '0' },
});
