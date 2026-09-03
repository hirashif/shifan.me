# shifan.me — design spec

Date: 2026-09-03
Status: approved (design), pending implementation plan

## Goal

Ship the approved `design_handoff/` prototypes as a real site at `shifan.me`, on
Cloudflare, with the two live features working: the plot (pixel guestbook) and
the token-spend footer. Retire `hirashif.github.io` behind permanent redirects.

Optimize for "shifan can change one line and deploy in a minute." Content changes
often; infrastructure should not.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Astro 6, TypeScript | Static-first with islands. The site is 4 pages and ~12 primitives; a SPA framework would be overhead. |
| Styling | Tailwind v4, tokens as `@theme` CSS vars | CLAUDE.md mandates variables over hardcoded fg/bg so dark and light stay equal citizens. |
| Host | Cloudflare Workers via `@astrojs/cloudflare` | One platform serves static assets, the plot API, and the database. `wrangler deploy`. |
| Database | Cloudflare D1 (SQLite) | The plot is one small table. D1 is co-located with the Worker. |
| Cache/state | Cloudflare KV | Holds the token-usage snapshot. |
| Fonts | `geist` npm package, self-hosted | CLAUDE.md forbids Google Fonts at runtime. The prototypes use it; production must not. |
| Icons | `simple-icons`, inlined at build | No CDN hotlinking. Dock icons are copied verbatim from the prototypes. |
| Package manager | pnpm | Per CLAUDE.md. |
| Tests | Playwright | Behavior over snapshots. |

Only `/api/*` is server-rendered. Every page is prerendered.

## Routes

| Route | Rendering | Notes |
|---|---|---|
| `/` | static | home; plot island hydrates and fetches `/api/plot` |
| `/writing` | static | tag filter is client-side over prerendered rows |
| `/writing/[slug]` | static | from MDX collection |
| `/learnings` | static | exactly 25, numbered 01–25 |
| `/plot` | static | full grid + recent claims |
| `/api/plot` | server | GET all cells, POST claim |
| `/api/auth/github`, `/api/auth/callback` | server | GitHub OAuth |
| `/api/tokens` | server | reads KV |
| `/api/usage` | server | bearer-authed ingest from local script |

## Data model

### D1: `plot`

```sql
CREATE TABLE plot (
  cell       INTEGER PRIMARY KEY CHECK (cell BETWEEN 0 AND 399),
  user_id    TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  msg        TEXT    NOT NULL CHECK (length(msg)  BETWEEN 1 AND 120),
  color      TEXT    NOT NULL CHECK (color IN (
               '#e8b04b','#53d08a','#7dd3fc','#f472b6','#a78bfa','#fb923c')),
  created_at INTEGER NOT NULL
);
```

Both invariants that matter are enforced by the database, not by application
logic: `cell` as primary key means a cell cannot be claimed twice, and
`user_id UNIQUE` means a person cannot claim twice. A race between two
simultaneous claims resolves as a constraint violation, which the API maps to
409. Colour and length limits are `CHECK` constraints so a malformed direct
write fails too.

Coordinates are display-only: `cell` 0–399 renders as row letter `a`–`j` plus
column `1`–`40` (`row = floor(cell / 40)`, `col = cell % 40 + 1`).

### KV: `USAGE`

Single key `usage:latest`:

```json
{ "today": 23.12, "week": 141.87, "year": 2904.55,
  "tokensToday": 51285384, "updatedAt": 1757000000 }
```

## Auth

Hand-rolled GitHub OAuth authorization-code flow. Auth.js is not used — it
carries Node assumptions that fight the Workers runtime, and the requirement here
is one provider and one claim, roughly 80 lines.

1. `GET /api/auth/github` — generate random `state`, set it in a short-lived
   `HttpOnly` `SameSite=Lax` cookie, redirect to GitHub.
2. `GET /api/auth/callback` — reject on `state` mismatch, exchange the code for a
   token, fetch the user, then set a session cookie and discard the GitHub token.
   It is never stored.
3. Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, 30 days, payload
   `{id, login}` signed HMAC-SHA256 with `SESSION_SECRET` via Web Crypto.

The GitHub token is not persisted because the site never acts on the user's
behalf; it only needs a stable identity to enforce one pixel per person.

Secrets (`GITHUB_CLIENT_SECRET`, `SESSION_SECRET`, `USAGE_TOKEN`) live in
Cloudflare secrets, set by shifan with `wrangler secret put`. They never enter
the repo, and no secret value is ever handled by an agent.

## The token footer

**The specced copy cannot ship.** The design's hover note reads "mostly claude
code. straight from the api bill on the live site." There is no API bill:
usage is a Claude Code subscription, so marginal cost per token is zero, and the
Anthropic cost API reports console/API org spend only — it cannot see
subscription usage. Shipping that wording would state something false about
billing.

Instead, real token counts priced at published API rates, labelled as such:

> counted from my claude code logs, priced at api rates.

**Pipeline.** [`ccusage`](https://github.com/ccusage/ccusage) (MIT) reads
`~/.claude/projects/**/*.jsonl` locally and reports token counts and costs per
day. Verified working: 2026-09-03 returned `totalCost 23.12`,
`totalTokens 51285384`.

```
ccusage daily --json --offline  →  scripts/push-usage.ts  →  POST /api/usage  →  KV
                                                                                 ↓
                                        footer  ←  GET /api/tokens (5 min cache)
```

`scripts/push-usage.ts` aggregates today / this week / this year, then POSTs with
`Authorization: Bearer $USAGE_TOKEN`. Run manually via `pnpm usage:push` or from a
launchd timer. `--offline` uses cached pricing so the script makes no network
call other than its own POST.

The site degrades to the last known snapshot if the script stops running;
`updatedAt` lets the UI go quiet rather than show a stale number as current. The
prototype's fake ticking animation is dropped — the number is real and changes
when pushed.

## Content

All content is typed data, not markup, so a copy change is a one-line edit.

- `content/work.ts` — timeline rows
- `content/learnings.ts` — exactly 25 strings; `learnings.length === 25` is
  asserted at build time so the build fails, not just a test
- `content/projects.ts` — project cards
- `content/writing/*.mdx` — frontmatter `title, date, tag, minutes, excerpt`

### Timeline — matches LinkedIn

The handoff's timeline was placeholder and wrong (it listed paycom as 2022–24 and
a `your university` stub). Real history, lowercased per the style rule:

| role | org | dates |
|---|---|---|
| software developer ii | paycom | sep 2024 – jun 2026 |
| co-founder, vp finance | alpha kappa psi – lambda chi | aug 2023 – may 2024 |
| software engineer intern | resi media | may 2023 – aug 2023 |
| software engineer intern | resi media (formerly living as one) | may 2022 – aug 2022 |
| intern | aga khan foundation | jun 2019 – jul 2019 |
| b.s. computer science | texas a&m | 2020 – 2024 |

**Open question:** the design's current row is "the cross desk — founder / now"
with a pulsing yellow dot, but the cross desk is not on LinkedIn, and paycom
ended jun 2026. Matching LinkedIn exactly therefore leaves no current role and no
home for the "now" dot. `work.ts` carries an `isCurrent` flag so adding the cross
desk is a one-line change once shifan decides. Ships without it.

### Projects

From real repos: `ledger`, `crypto-market-pipeline`, `gridloom`, `qs509`, and
`thecrossdesk` (private — badge `SOON`, no link).

### Writing

The seven posts on `hirashif.github.io/writeups/` convert to MDX, keeping slugs
so redirects are one-to-one: `cross-desk`, `agentic-payments`, `ap2-x402`,
`concurrency`, `inference`, `ledger-bug`, `ordering`. Titles lowercase to match
the style rule.

### Learnings

The prototype's 25 drafts carry over verbatim. CLAUDE.md says these are shifan's
to write; they are marked for rewrite and are not invented content.

## Hard rules, enforced

From CLAUDE.md, with the mechanism that enforces each:

| Rule | Enforcement |
|---|---|
| Surname never appears | Playwright asserts "hirani" is absent from rendered text on every route, exempting `mailto:` and the github handle in URLs, both of which CLAUDE.md allows |
| No resume page | No route, no link. Resume informs content only |
| lowercase everywhere | Content authored lowercase; reviewed per PR |
| One accent + plot palette | Colours only via CSS vars; the D1 `CHECK` constraint pins the plot palette |
| Learnings capped at 25 | Build-time assertion in `content/learnings.ts` |
| Dark and light equal | No hardcoded fg/bg; Playwright checks both themes |

## Testing

Playwright, covering behaviour rather than pixels:

- learnings renders exactly 25 rows, numbered 01–25
- theme toggles by button and by `t`, persists across reload, and both keys are
  ignored while an input is focused
- `g` scrolls to the plot on home
- plot claim: unauthenticated click prompts sign-in; a claim with a mocked
  session writes one row; a second claim by the same user is rejected; a claim on
  a taken cell is rejected
- no console errors on any route
- surname absent, per the table above

Accessibility: dock buttons carry `aria-label` — the visual tooltip is not a
name. Lighthouse CI budget: performance ≥ 95, accessibility ≥ 95.

`astro check` and `tsc --noEmit` before every commit.

## Old site retirement

`hirashif.github.io` keeps serving, but only redirects. Its current source is
archived into this repo's git history first, so nothing is lost.

- `/` → `https://shifan.me/`
- `/writeups/<slug>.html` → `https://shifan.me/writing/<slug>` (seven files)
- `404.html` → `https://shifan.me/`

Each stub carries `<link rel="canonical">`, a `<meta http-equiv="refresh">`, and a
JS fallback. GitHub Pages cannot issue a 301, so this is the strongest available
signal for transferring search ranking. `resume.pdf` stays reachable at its
current URL — removing it would break any live job application linking to it —
but nothing on the new site links to it, honouring the no-resume rule.

## Deployment

`wrangler deploy`, with `shifan.me` bound as a custom domain in `wrangler.jsonc`
and `www` redirecting to apex. `<meta name="theme-color">` is `#0a0a0b`.

### Steps only shifan can perform

Account creation, credential entry, and account settings changes are his alone.

1. Add `shifan.me` as a site in Cloudflare; it returns two nameservers.
2. At Namecheap, set Custom DNS to those two nameservers. The domain currently
   uses `dns1/dns2.registrar-servers.com` and serves a parking page; this step is
   what actually moves it.
3. `wrangler login` — browser OAuth. Afterwards D1, KV, and deploys can be driven
   from the CLI without any key being handled.
4. Create a GitHub OAuth App with callback
   `https://shifan.me/api/auth/callback`; add the client secret via
   `wrangler secret put`.

## Risks

| Risk | Mitigation |
|---|---|
| Nameserver propagation delays launch | Start step 1–2 first; build continues in parallel against `workers.dev` |
| Plot gets spammed or abused | One pixel per GitHub account; 120-char cap; palette pinned by constraint. Claims are deletable by hand in D1 |
| Usage script stops running | `updatedAt` drives a quiet state rather than a stale number |
| Prototype and production drift | `design_handoff/` stays in-repo; visual diffs at 940px against the `.dc.html` files |

## Out of scope

Analytics. A resume page. A CMS. Comments on writing. The optional
"last commit" widget CLAUDE.md marks as skip-unless-asked.
