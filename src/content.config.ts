import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    // NOTE: `date` is 2026-08-28 for all seven migrated posts — that's the git commit
    // date the old site's writeups were published under (verified against full history,
    // not the --depth 1 clone used during migration). No per-post authoring date exists
    // in the old HTML or in git; this is one shared publication date, not per-post
    // authored dates. See task-4-report.md for detail. Correct individual dates by hand
    // if real ones surface later.
    date: z.coerce.date(),
    tag: z.string(),
    minutes: z.number(),
    excerpt: z.string(),
  }),
});

export const collections = { writing };
