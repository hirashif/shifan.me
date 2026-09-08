# AGENTS.md — shifan.me

**Read `CLAUDE.md` in this directory first. It is the full and authoritative brief**
— routes, hard rules, design tokens, the stack as actually built, and the decisions
behind it. This file exists only so agents that look for `AGENTS.md` (Codex, Cursor,
OpenCode, Grok) find their way there. Keep the two in sync by editing `CLAUDE.md`;
do not duplicate its content here.

The few rules most often broken by someone who hasn't read it:

1. **Only "shifan".** The surname never appears in visible copy, metadata, or alt
   text. Hrefs (`github.com/hirashif`, the linkedin URL) and the email address are
   explicitly fine.
2. **lowercase everywhere** in user-facing copy, brand names included (`paycom`,
   `postgres`, `texas a&m`). The only capitals are code/badge tokens and the
   approved `software developer II`.
3. **Boring is the point.** No gradients, no emoji, no marketing copy. If it starts
   feeling like a landing page, undo it.
4. **Learnings are capped at exactly 15** and a build-time `throw` enforces it. The
   count is encoded in several places; move them together.
5. **The plot's invariants live in the database**, not in application code
   (`cell` primary key, `user_id` unique). Never rewrite them as read-then-write
   checks — that races.
6. **The resume page must stay out of search.** `/hereismyresume` is linked from the
   dock but carries `noindex` plus an `X-Robots-Tag` header, and is excluded from the
   sitemap. `/resume` must not exist or redirect. Never add the path to `robots.txt`
   — that publishes it.
7. **Don't fabricate numbers.** The token footer, the contributions chart, and post
   dates all show real data or nothing. The footer dashes out rather than presenting
   a stale figure as "today". This has been a repeated failure mode.
8. **Build before deploying.** `pnpm build && pnpm exec wrangler deploy` — the
   Cloudflare adapter regenerates config at build time and deploying stale silently
   drops it.

Run `pnpm typecheck` and `pnpm test` (132 tests) before committing. Never weaken a
test to make the suite green.
