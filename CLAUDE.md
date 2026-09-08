# CLAUDE.md — shifan.me

This is shifan's personal website. Domain: **shifan.me** (replaces hirashif.github.io). It is a living document, not a portfolio that ships once — copy, learnings, projects, and the plot change often. Optimize for "shifan can change one line and deploy in a minute."

## What this repo is

A small, fast, mostly-static personal site with a few live bits:

- **/** — home, in this section order: header (name scramble-in, tagline, live uptime counter — years since 2002-11-26, 9 decimals) · work · learned (3-line teaser linking to /learnings) · writing (7 latest) · projects · **the plot** (pixel guestbook, 40×10) · stack · education · contributions · footer (live token spend).
  Stack chips are **display-only** — shifan explicitly asked that clicking do nothing. Do not re-add the click-to-reveal note card.
- **/writing** — long-form posts. tag filter. markdown/MDX source.
- **/learnings** — exactly 15 one-liners. no dates, no tags, no filters. when a new one is added, an old one is removed. mix of life and work.
- **/plot** — the full pixel guestbook + recent claims list.

Floating dock at the bottom on every page: home · writing · learnings · plot · resume · | · github · linkedin · email (copies to clipboard, "copied" bubble) · book a call (`https://cal.com/shifan/15min`, new tab) · theme (sun/moon). Eleven items; at 375px they shrink to 32px each and fit with zero spare, so anything else added to the dock has to displace something.

## Hard rules (do not break these)

- **Only "shifan".** The last name never appears anywhere on the site, in metadata, or in alt text. Email is fine.
- **The resume is linked from the dock, not from page content.** Work history lives
  in the timeline on home. The dock (every page) has a `resume` item, in the first
  group after `the plot` and before the `|` divider, pointing at `/hereismyresume`
  (PDF at `/hereismyresume.pdf`). This is the final arrangement — it went through two
  rejected attempts (a guessable bare `/resume`, then a random-suffixed
  `/resume-cifz9eqb` that "reads like malware in an email") before landing here, so
  do not change the path or its shape again without shifan asking.

  The path is fully readable, with no random-looking characters — it reads naturally
  pasted into an email ("here's my resume: shifan.me/hereismyresume") — and it is not
  a path any scanner enumerates: vulnerability scanners and crawlers try `/resume`,
  `/cv`, `/resume.pdf`, `/about`, not full phrases. **Be clear-eyed about what this
  is: obscurity, not access control.** Anyone with the link can open it, and a
  sufficiently determined person could guess the phrase. That is an accepted
  tradeoff, correct for a resume shifan intends to hand out directly — it is not a
  security boundary and must never be treated as one (no auth, no rate limiting, no
  "make it more secure" beyond what's described here).

  **`/resume` and `/resume.pdf` must not exist and must not redirect anywhere** — not
  even to the real path — because a redirect from the guessable path hands anyone
  enumerating it the real url and defeats the entire point. Do not "tidy" this back
  to `/resume`; a plain, guessable path is the one shape this has to never take
  again. The old high-entropy path `/2v16erb7nu5o5c` still 301-redirects to the
  current resume path (old links are out in the wild, keep that redirect working) —
  if the resume path ever changes again, update that redirect's target, don't remove
  it. The since-abandoned `/resume-cifz9eqb` path has no redirect (it was never
  shared, so there is nothing to preserve) and must not be reintroduced.

  What keeps this out of search and AI indexes is **not** being unlinked — it's being
  linked from the dock while carrying two explicit signals, and both must stay:
  `<meta name="robots" content="noindex, nofollow">` on the page, and an
  `X-Robots-Tag: noindex, nofollow, noarchive, noai, noimageai` response header on
  both `/hereismyresume` and `/hereismyresume.pdf` via `public/_headers` (the header
  is the only way to noindex the PDF itself — it can't carry a meta tag). It is still
  excluded from any sitemap. Do not delete the dock link, and do not remove the
  noindex meta or header thinking the dock link alone is enough.
- **lowercase everywhere.** copy, headings, nav, tooltips. brand names too (paycom, postgres). the only capitals are in code/badges like `LIVE`. Approved exception: roman
  numerals in job titles, e.g. `software developer II` (see `src/content/work.ts`) — same
  spirit as the `LIVE`/`OSS` badge exception, not a loophole to generalize from.
- **One accent: yellow `#e8b04b`.** No other accent colors except the plot palette. Light-mode text-on-light uses `#8a6100` for contrast.
- **Dark and light are equal citizens.** Every new element must use the CSS variables below, never hardcoded fg/bg.
- **Boring is the point.** No gradients, no cards-with-left-borders, no emoji, no marketing copy. If it feels like a landing page, undo it.
- **Learnings is capped at 15.** Enforce in code (build fails or test fails if length ≠ 15).
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

## Stack (as built — this is what exists, not a recommendation)

- **Astro 7** (7.3.1), TypeScript, deployed as a **Cloudflare Worker** via `@astrojs/cloudflare` (pinned 14.3.0). Static-first: every page is prerendered, only `/api/*` sets `prerender = false`.
- **Tailwind v4 is installed but effectively unused** — 3 utility classes site-wide, no `@theme`. Design tokens are plain CSS custom properties on `.th-dark`/`.th-light` in `src/styles/global.css`. Before removing Tailwind, note that `global.css` now defines its own explicit `[hidden] { display:none !important }` rule; that used to be inherited from Tailwind preflight and 7 elements depend on it.
- **Fonts:** `@fontsource-variable/geist` + `geist-mono`, self-hosted. No Google Fonts at runtime.
- **Icons:** dock icons are hand-drawn inline SVGs. Stack chips use `simple-icons` inlined at build via Vite `?raw`. Company logos in the work timeline are self-hosted PNGs in `public/logos/` (fetched from each org's own site — never hotlink).
- **Content:** `src/content/learnings.ts` (exactly 15, build-time `throw` enforces it), `writing/*.mdx`, `projects.ts`, `work.ts`, `stack.ts`, `education.ts`.
- **Theme:** class on `<html>` (`th-dark`/`th-light`), `localStorage['shifan-theme']`, applied pre-paint by an inline script. Default dark.
- **The plot:** Cloudflare **D1** (`shifan-plot`). Table `plot(cell INTEGER PRIMARY KEY 0-399, user_id TEXT UNIQUE, name, msg ≤120, color, created_at)`. Both invariants — one claim per cell, one per person — are enforced by **database constraints**, not app logic, so concurrent claims resolve as a constraint violation mapped to 409. Never rewrite these as read-then-write checks.
  **There is no GitHub OAuth.** It was built, then removed at shifan's request because the sign-in redirect lost form state and was friction. Identity is now an anonymous HMAC-signed `shifan_visitor` cookie minted on first claim. Clearing cookies gets you another pixel; that is the accepted tradeoff. `src/lib/session-core.ts` still holds the signing crypto.
- **Token spend:** `GET /api/tokens` reads a snapshot from Cloudflare **KV**. It is NOT the Anthropic cost API — shifan is on a Claude Code subscription, which that API cannot see. An hourly launchd job at `~/.local/bin/shifan-usage-push.sh` runs `ccusage` over `~/.claude/projects` and POSTs to `/api/usage`. The script deliberately lives outside `~/Documents`: a LaunchAgent cannot read it there without Full Disk Access (macOS TCC), which broke the first version.
  **The footer copy must stay honest.** It reads "counted from my claude code logs, priced at api rates." The original design said "straight from the api bill" — that is false and must not come back. There is no fake ticker; the number changes only when a snapshot is pushed, and it dashes out rather than showing a stale figure as "today".
- **Contributions chart:** `GET /api/contributions` scrapes GitHub's public contributions HTML for `hirashif`, caches in KV for 6h, renders ~26 weeks as our own grid so it themes correctly. Never fabricate contribution counts.
- **Deploy:** `pnpm build && pnpm exec wrangler deploy`. **Build before deploying** — the adapter regenerates `dist/server/wrangler.json` at build time, and deploying stale silently drops config. `shifan.me` is bound as a custom domain; `www` → apex is a Cloudflare Redirect Rule (dashboard, not in this repo).
- **SEO:** OG + Twitter meta per page in `Base.astro`, `public/og.png` (1200×630, regenerate with `node scripts/gen-og.mjs` after changing the tagline — the copy is baked into the image). Sitemap via `@astrojs/sitemap`, which **must keep excluding the resume**. `public/robots.txt` allows everything including AI crawlers; Cloudflare's "Managed robots.txt" is deliberately OFF.
- **Analytics:** none. Cloudflare Web Analytics is the intended option if wanted — free and cookieless, so no consent banner.

## Frontend tooling Claude Code should use

- `pnpm`. Scripts: `dev`, `build`, `preview`, `lint` (eslint + prettier), `typecheck`, `test`.
- **Playwright**, 132 tests. Load-bearing ones: surname absent from rendered *visible text* (hrefs and the email are allowed), learnings count = 15, theme persists, plot claim flow, `t`/`g` shortcuts, no console errors per route, no horizontal overflow at 375px, resume not indexed, sitemap excludes the resume, redirect stubs intact.
- **Lighthouse CI is NOT wired up.** perf ≥ 95 / a11y ≥ 95 remains the intent, but nothing enforces it — it was left out as too flaky on shared CI runners. Do not describe it as a gate. Dock buttons still need real `aria-label`s; the visual tooltip is not an accessible name.
- CI runs on push/PR via `.github/workflows/ci.yml`: typecheck, build, Playwright. It must keep working on a clean clone with no `.dev.vars` and no Cloudflare credentials.
- Astro's dev toolbar is disabled under test (`ASTRO_DEV_TOOLBAR=0`); it injected extra `<h1>`s and made the suite flaky.
- Use `astro check` / `tsc --noEmit` before every commit.
- For visual diffs against the prototypes, screenshot the `.dc.html` files in `design_handoff/` at 940px wide and compare side by side.

## Content sources (done — kept for provenance)

Work history matches his LinkedIn: paycom (sep 2024 – may 2026), alpha kappa psi, resi media ×2, aga khan foundation. Education is texas a&m only; the high school was removed at his request. `software developer II` is an approved uppercase exception.

Writing posts were migrated from hirashif.github.io/writeups with slugs preserved one-to-one, because the old site redirects onto them. **Post dates are author-assigned, not derived from git** — the real history shows all seven landing in one commit.

The 15 learnings are shifan's own, apart from the last five which he asked to be written to a brief ("general but applicable in science and tech"). He may rewrite them; confirm which one drops before adding a new one.

The name popover is settled: `shifan, from the arabic shifā (شفاء), "healing."` and nothing more. He rejected a "god's gift" variant (unsupported by the etymology), a reference to his mom, and a birthday fact.

## Working with shifan

- Terse, lowercase, direct. Propose, then do. Don't add sections or pages speculatively — ask.
- When changing copy, keep sentences short and declarative. His voice: "i like boring designs. double-entry, idempotency keys, locks in a fixed order."
- Before each change to learnings, confirm which one gets removed.
- Keep this file current. When the stack, routes, or rules change, update CLAUDE.md in the same PR.
