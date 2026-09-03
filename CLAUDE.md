# CLAUDE.md — shifan.me

This is shifan's personal website. Domain: **shifan.me** (replaces hirashif.github.io). It is a living document, not a portfolio that ships once — copy, learnings, projects, and the plot change often. Optimize for "shifan can change one line and deploy in a minute."

## What this repo is

A small, fast, mostly-static personal site with a few live bits:

- **/** — home. name (scramble-in), one-line tagline, live uptime counter (years since 2002-11-26, 9 decimals), work timeline, "a few things i've learned" teaser (3 lines, links to /learnings), writing list (7 latest), projects grid, **the plot** (pixel guestbook, 40×10), clickable stack chips, footer with live token spend.
- **/writing** — long-form posts. tag filter. markdown/MDX source.
- **/learnings** — exactly 25 one-liners, numbered 01–25. no dates, no tags, no filters. when a new one is added, an old one is removed. mix of life and work.
- **/plot** — the full pixel guestbook + recent claims list.

Floating dock at the bottom on every page: home · writing · learnings · plot · | · github · linkedin · email (copies to clipboard, "copied" bubble) · theme (sun/moon).

## Hard rules (do not break these)

- **Only "shifan".** The last name never appears anywhere on the site, in metadata, or in alt text. Email is fine.
- **No resume link/page.** Work history lives in the timeline on home.
- **lowercase everywhere.** copy, headings, nav, tooltips. brand names too (paycom, postgres). the only capitals are in code/badges like `LIVE`.
- **One accent: yellow `#e8b04b`.** No other accent colors except the plot palette. Light-mode text-on-light uses `#8a6100` for contrast.
- **Dark and light are equal citizens.** Every new element must use the CSS variables below, never hardcoded fg/bg.
- **Boring is the point.** No gradients, no cards-with-left-borders, no emoji, no marketing copy. If it feels like a landing page, undo it.
- **Learnings is capped at 25.** Enforce in code (build fails or test fails if length ≠ 25).
- Keep pages count small. Don't add a page unless shifan asks. Fold new content into home or writing first.

## Design reference

`design_handoff/` contains the approved HTML prototypes (`Home.dc.html`, `Writing.dc.html`, `Learnings.dc.html`, `Plot.dc.html`) and `README.md` with exact specs. Treat these as the source of truth for look and behavior; recreate them in this codebase — don't ship the HTML directly. Open them in a browser to see motion and states.

### Tokens

```
dark:  --bg #0a0a0b  --fg #e7e7ea  --fg2 #a1a1a8  --fg3 #6b6b73  --line #1c1c21
       --card #0f0f11  --hov #1c1c21  --dock rgba(22,22,24,.85)  --dockLine #26262b
       --acc #e8b04b  --accText #e8b04b  --shadow 0 12px 32px rgba(0,0,0,.45)
light: --bg #faf9f6  --fg #1a1a1a  --fg2 #5c5c62  --fg3 #8f8f96  --line #e8e6e0
       --card #ffffff  --hov #f0eee8  --dock rgba(255,255,255,.85)  --dockLine #e8e6e0
       --acc #e8b04b  --accText #8a6100  --shadow 0 12px 32px rgba(0,0,0,.1)
plot palette: #e8b04b #53d08a #7dd3fc #f472b6 #a78bfa #fb923c
live dot green: #53d08a
```

Type: **Geist** (400/500/600) for everything, **Geist Mono** (400/500) for labels, dates, coords, badges. Content column `max-width: 680px`, side padding 40px, top padding 104px on home / 72px on subpages. Section gap 64px on home, 40px on subpages. Hairlines are `1px solid var(--line)`. Radii: 8px rows, 10–12px cards, 12px dock, 999px never (except nothing).

Motion: sections `fadeUp .6s cubic-bezier(.2,.7,.2,1)` staggered by 60–80ms. Dock slides in `.7s` with `.4s` delay. Dock items lift `translateY(-7px) scale(1.18)` with spring `cubic-bezier(.34,1.56,.64,1) .4s`; label tooltip pops above. Popovers use `pop .18s`. "now" dot pulses `1.8s` yellow. Name scrambles from random glyphs to `shifan` over ~800ms on load.

Keyboard: `t` toggles theme, `g` jumps to the plot. Ignore when focus is in an input.

## Stack (recommended — confirm with shifan before deviating)

- **Astro** (static-first, islands for the interactive bits) **or Next.js app router**. Prefer Astro unless the plot's auth pushes toward Next. Either way: TypeScript, Tailwind v4 with the tokens above as CSS variables (`@theme`), no component library — the design is ~12 primitives and a library would fight the look.
- **Fonts:** `geist` npm package (Geist + Geist Mono), self-hosted. No Google Fonts at runtime.
- **Icons:** dock icons are inline SVGs in the design (copy them). Stack chip icons from `simple-icons` package, rendered as inline SVG at build time — not hotlinked from a CDN.
- **Content:** `content/learnings.ts` (array of 25 strings), `content/writing/*.mdx`, `content/projects.ts`, `content/work.ts`. Frontmatter for posts: `title, date, tag, minutes, excerpt`.
- **Theme:** class on `<html>` (`dark`/`light`), persisted in `localStorage['shifan-theme']`, read before first paint via inline script to avoid flash. Default dark.
- **The plot:** needs a backend. `plot` table: `cell int pk (0–399), user_id, name, msg (≤120 chars), color (one of palette), created_at`. One row per github user (unique on user_id). Auth: GitHub OAuth (Auth.js or Clerk). API: `GET /api/plot` (all cells), `POST /api/plot` (claim; rejects if user already has one or cell taken). Hover tooltip shows msg · name · date · coord. Coord = row letter a–j + column 1–40.
- **Token spend:** `GET /api/tokens` returns `{ today, week, year, tokensToday }` in USD from the Anthropic usage/cost API (or a cron that writes to a KV). Cache 5 minutes. Footer shows today; hover card shows all four. Never expose the API key client-side.
- **GitHub "last commit" (optional, not in current design):** skip unless asked.
- **Deploy:** Vercel (or Cloudflare Pages). `shifan.me` apex + `www` redirect. Set `<meta name="theme-color">` to `#0a0a0b`.
- **Analytics:** none, or Plausible if asked. No cookies banner needed then.

## Frontend tooling Claude Code should use

- `pnpm`. Scripts: `dev`, `build`, `preview`, `lint` (eslint + prettier), `typecheck`, `test`.
- **Playwright** for the handful of things that matter: no "hirani" in rendered HTML, learnings count = 25, theme toggle flips class + persists, plot claim flow, `t`/`g` shortcuts, no console errors on each route.
- **Lighthouse CI** budget: perf ≥ 95, a11y ≥ 95. Dock buttons need `aria-label`s (the visual tooltip is not enough).
- Use `astro check` / `tsc --noEmit` before every commit.
- For visual diffs against the prototypes, screenshot the `.dc.html` files in `design_handoff/` at 940px wide and compare side by side.

## Content sources

Shifan will provide his resume and LinkedIn. Use them to replace placeholders:
- work timeline dates + descriptions (paycom dates, university name/degree/years — currently `your university`, `20xx`)
- project descriptions (current ones are inferred from repos — verify)
- learnings (current 25 are drafts in his voice — he will rewrite)
- the name tooltip copy ("from the arabic shifā, 'healing'. my mom picked it…") — confirm wording
- writing posts (titles exist on the old site; bodies need migrating from hirashif.github.io/writeups)

Anything from the resume that would break a hard rule above (last name, "download resume") does not go on the site.

## Working with shifan

- Terse, lowercase, direct. Propose, then do. Don't add sections or pages speculatively — ask.
- When changing copy, keep sentences short and declarative. His voice: "i like boring designs. double-entry, idempotency keys, locks in a fixed order."
- Before each change to learnings, confirm which one gets removed.
- Keep this file current. When the stack, routes, or rules change, update CLAUDE.md in the same PR.
