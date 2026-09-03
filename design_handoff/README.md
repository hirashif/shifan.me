# Handoff: shifan.me

## Overview
Personal site for shifan, replacing hirashif.github.io. Four routes (home, writing, learnings, plot), a floating dock, dark/light theme, and three live features: an uptime counter, a pixel guestbook ("the plot"), and a Claude token-spend readout. Voice is lowercase and terse. One accent color (yellow). See `CLAUDE.md` in this folder for repo rules, stack recommendations, and content sources — copy it to the new repo root.

## About the design files
The `.dc.html` files here are **design references built in HTML**. They open directly in a browser and show the intended look, motion, and interaction. They are not production code — recreate them in the target stack (Astro or Next + Tailwind, see CLAUDE.md), using the exact values below. `support.js` and `image-slot.js` are runtime helpers for the prototypes only; ignore them.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, motion, and copy are final unless marked placeholder. Recreate pixel-close at 940px viewport.

## Screens

### 1. Home (`Home.dc.html`)
Column: `max-width 680px`, padding `104px 40px 40px`, `flex-direction: column; gap: 64px`. Sections fade up staggered (`fadeUp .6s cubic-bezier(.2,.7,.2,1)`, delays 0/.08/.14/.2/.26/.32/.38/.44s).

**Header** — grid `1fr auto`, align end.
- Name button: text `shifan`, 44px/600, letter-spacing -0.035em, line-height 1, `text-decoration: underline dotted var(--fg3)`, underline-offset 8px, `cursor: help`. On load, glyphs scramble from `abcdefghijklmnopqrstuvwxyz$#%&*` and settle left-to-right over ~800ms (45ms tick, one char every 3 ticks). Click toggles a popover (300px, `var(--card)` bg, 1px `var(--dockLine)`, radius 10, shadow, `pop .18s`): **shifan** — from the arabic **shifā** (شفاء), "healing". *my mom picked it. still trying to live up to it.* (last sentence `var(--fg3)`; shifā in `var(--accText)`).
- Tagline: `backend. money and market data.` 19px `var(--fg2)`.
- Right: mono 12px `var(--fg3)`: `uptime` / `{age}` (15px `var(--fg)`) ` yrs`. age = (now − 2002-11-26 UTC) / 365.2425 days, `toFixed(9)`, updates every 100ms, tabular-nums.

**work** — label 13px/500 `var(--fg3)`. Timeline: `padding-left 22px; border-left 1px var(--line); gap 22px`. Each row grid `1fr auto`; dot 9px at `left:-27px; top:6px`. Current row: dot `var(--acc)` with `pulse 1.8s` (box-shadow 0→9px yellow fading), date text `now` in `var(--accText)`. Past rows: hollow dot (`var(--bg)` fill, 1.5px `var(--fg3)` border), date mono 12px `var(--fg3)`. Title 16px/500 with ` — role` in `var(--fg2)` 400; description 14px `var(--fg2)`.
Rows: the cross desk — founder / paycom — software engineer (2022 – 24) / your university — b.s. computer science (20xx – xx, PLACEHOLDER).

**learned** — paragraph 16px `var(--fg2)`: `a few [things i've learned] so far, mostly the hard way.` link in `var(--accText)`, underline offset 4px, underline color `rgba(232,176,75,.4)` → `var(--acc)` on hover, href `/learnings`. Below, 3 items: grid `18px 1fr`, `→` in mono 13px `var(--acc)`, text 15.5px.

**writing** — header row: label + `all →` (12.5px `var(--fg3)`). 7 rows: grid `1fr auto`, padding `12px 10px`, margin `0 -10px`, radius 8, hover bg `var(--hov)`. Title 16px/500 letter-spacing -0.01em; date mono 11.5px `var(--fg3)` (e.g. `aug 25`).

**projects** — 2-col grid, gap 8. Card: padding `14px 16px`, 1px `var(--line)`, radius 10; hover `border-color var(--acc); translateY(-2px)`. Name 15px/500 + badge mono 10px letter-spacing .08em `var(--fg3)` (`LIVE`, `PUBLIC`, `SOON`, `OSS`, `REPO`); desc 13.5px `var(--fg2)`.

**the plot** — header: label `the plot` + mono `{n} / 400 pixels claimed`. Sub 14px `var(--fg2)`: `everyone who visits gets one pixel. pick a color, leave a line, hover to read the others.` Grid: 40 cols × 10 rows, gap 2px, padding 10px, 1px `var(--line)`, radius 10, bg `var(--card)`. Cell: square, radius 2, empty = `#17171b` dark / `#ecebe6` light, filled = its color; hover/pending `scale(1.35)` `.12s`; filled cursor `help`, empty `pointer`. Tooltip (absolute, `translate(-50%,-100%)`, x clamped to [130, width−130]): bg `var(--fg)`, text `var(--bg)`, radius 8, padding `9px 12px`, max-width 260; row 1: 9px color square + msg 13px; row 2: mono 10.5px 60% opacity `name · date`. Click empty cell (if user hasn't claimed) → pending outline `2px solid var(--fg)` + claim bar: dashed 1px `var(--dockLine)`, radius 10, grid `auto 1fr 1fr auto`: 6 swatches 18px radius 4 (selected gets `outline 2px var(--fg)` offset 2), inputs `name` / `one line` (bg `var(--hov)`, radius 8, padding `7px 10px`), buttons `claim {coord}` (bg `var(--acc)`, text `#1a1a1a`, 600) and `×`. After claim: mono `yours is at {coord}. it stays.` Coord = row letter a–j + col 1–40. Footer line 12px + `the whole plot →` → `/plot`.

**stack** — header: label + mono 11px `click one`. Chips: mono 12.5px, `padding 4px 9px`, 1px `var(--line)`, radius 6, 12px icon; hover/selected border `var(--acc)`, text `var(--fg)`. Click toggles a note card below (grid `auto 1fr`, `var(--card)`, 1px `var(--dockLine)`, radius 10, `pop .18s`): skill name mono `var(--accText)` + one sentence 14px `var(--fg2)`. 12 skills with notes are in the logic class.

**footer** — border-top 1px, padding-top 24, mono 12px `var(--fg3)`, space-between. Left: `tokens burned today {$}` (amount `var(--accText)` 13px, ticks up ~$0.01 every 2.2s), hover → card (240px, above, `pop`) rows today / this week / this year / tokens today + note `mostly claude code. straight from the api bill on the live site.` Right: `press [t] to flip the lights` (key in 1px `var(--dockLine)` box radius 4).

### 2. Writing (`Writing.dc.html`)
Padding `72px 40px 40px`, gap 40. Back link mono 12.5px `← shifan`. H1 36px/600 -0.03em `writing`. Sub 16px `var(--fg2)` with link to learnings. Tag filter chips (mono 12px, radius 6, selected border `var(--acc)`). Post rows: padding `18px 12px`, margin `0 -12px`, radius 10, hover `var(--hov)`; title 18px/500, date mono 11.5px, excerpt 14.5px `var(--fg2)`, meta mono 11px: tag in `var(--accText)` + `{n} min`.

### 3. Learnings (`Learnings.dc.html`)
Same shell. H1 `things i've learned`. Sub: `twenty-five. one line each. when i learn a new one, an old one has to go.` List: 25 rows, grid `36px 1fr`, padding 13px 0, border-top 1px; number mono 12px `var(--accText)` (`01`…`25`), text 16px. No filters, no dates, no tags.

### 4. Plot (`Plot.dc.html`)
Same shell, gap 32. H1 `the plot` + mono `{n} / 400`. Grid identical to home but padding 12 / radius 12. Tooltip adds `· {coord}`. Claim bar identical. Below: `recent` list, 8 rows grid `14px 44px 1fr auto`: color square, coord mono `var(--accText)`, msg 14.5px, `name · date` mono 11px.

### Dock (all pages)
`position: sticky; bottom: 20px`, centered, margin `24px 0 20px`, padding 6, gap 2, radius 12, bg `var(--dock)`, 1px `var(--dockLine)`, shadow `var(--shadow)`, `backdrop-filter: blur(12px)`, entrance `dockIn .7s .4s` (from `translateY(24px)` opacity 0). Items 38×38, radius 8, icon 16px stroke 1.8, color `var(--fg2)` (active page `var(--fg)` + 4px yellow dot at bottom:3px). Hover: bg `var(--hov)`, `translateY(-7px) scale(1.18)` with `.4s cubic-bezier(.34,1.56,.64,1)`; tooltip `::after` with label: bg `var(--fg)`, text `var(--bg)`, 11px/500, padding `5px 9px`, radius 6, 12px above, fades/slides in `.15s/.25s`. Order: `/` (home, 13px 600 text) · writing (pencil) · learnings (bulb) · the plot (2×2 squares) · divider 1px · github · linkedin · email (button: copies `shifan.hirani@gmail.com`, shows `copied` bubble 1.4s) · theme (sun in dark / moon in light, color `var(--accText)`).

## Interactions & behavior
- Theme: `t` key or dock button; class `th-dark`/`th-light` on root; persist `localStorage['shifan-theme']`; body bg transitions `.35s`. Default dark.
- `g` key scrolls to the plot (home) — offset 80px. Both keys ignored when an input is focused.
- Name scramble runs once per page load.
- Plot: one claim per user (currently `localStorage['shifan-guestbook']` in the prototype; production = GitHub auth + DB). Cell hover tooltip, clamped. Empty-cell click ignored if user already claimed.
- Stack chip click toggles note; clicking the same chip closes it.
- Token amount ticks; hover card. Production: real numbers from API, no ticking needed (or tick at real rate).
- All external links open in same tab except mailto/GitHub/LinkedIn (developer's call).

## State
home: `theme, age, name (scramble), nameTip, skill (index|-1), copied, tokOpen, tokens, plot {cell→entry}, hover, tipX, tipY, pending, color, formName, formMsg`. learnings/writing: `theme` (+ `tag` filter on writing). plot: as home minus skills/tokens.

## Design tokens
See CLAUDE.md § Tokens (identical values). Fonts: Geist, Geist Mono. Radii 2/4/6/8/10/12. Hairline `1px var(--line)`. Shadow `var(--shadow)`.

## Assets
- Dock and UI icons: inline SVG in the prototypes (copy paths verbatim).
- Stack icons: simple-icons slugs `go, openjdk, python, typescript, postgresql, apachekafka, redis, springboot, kubernetes, docker, terraform, claude` — bundle via the `simple-icons` package, don't hotlink.
- No images. No avatar.

## Placeholders to replace with real content
university name/degree/years; paycom dates; project descriptions; the 25 learnings (drafts); writing excerpts/read times; name-tooltip wording; plot seed entries (delete — production starts empty); token figures.

## Files
- `Home.dc.html`, `Writing.dc.html`, `Learnings.dc.html`, `Plot.dc.html` — the designs (open in a browser).
- `CLAUDE.md` — repo instructions for Claude Code. Copy to repo root.
- `support.js`, `image-slot.js` — prototype runtime only.
