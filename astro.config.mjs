import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://shifan.me',
  adapter: cloudflare(),
  integrations: [mdx()],
  vite: { plugins: [tailwindcss()] },
  // The dev toolbar injects an audit overlay into every page (including an
  // extra <h1>) which is harmless by hand but flakes Playwright's strict
  // element matching under parallel workers. Disable it only for the test
  // run (playwright.config.ts sets ASTRO_DEV_TOOLBAR=0); `pnpm dev` keeps it.
  devToolbar: { enabled: process.env.ASTRO_DEV_TOOLBAR !== '0' },
});
