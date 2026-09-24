import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://shifan.me',
  adapter: cloudflare(),
  integrations: [
    mdx(),
    sitemap({
      // /hereismyresume is deliberately unlisted (noindex, linked from
      // nowhere on the site) so it stays out of search — see CLAUDE.md.
      // Listing it here would publish the exact path that noindex and
      // X-Robots-Tag are trying to keep out, so it's excluded by page path
      // rather than relying on those alone. /2v16erb7nu5o5c is the old
      // high-entropy link, kept alive only as a redirect to the resume (see
      // the `redirects` block below) — it's not a real page and must be
      // excluded too, both because it's redirect-only and because it also
      // points at the resume.
      filter: (page) => !page.includes('/hereismyresume') && !page.includes('/2v16erb7nu5o5c'),
    }),
  ],
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