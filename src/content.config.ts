import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    // NOTE: `date` is author-assigned per post, not derived from git history — shifan
    // sets it by hand when a post is written or backdated to when the work happened.
    // Displayed as month-only (see src/lib/date.ts), so day-level precision here mostly
    // just controls sort order among posts published in the same month.
    date: z.coerce.date(),
    tag: z.string(),
    minutes: z.number(),
    excerpt: z.string(),
  }),
});

export const collections = { writing };
