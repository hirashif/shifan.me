import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://shifan.me',
  adapter: cloudflare(),
  integrations: [mdx()],
  vite: { plugins: [tailwindcss()] },
});
