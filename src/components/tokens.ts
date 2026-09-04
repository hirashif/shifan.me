export interface UsageSnapshot {
  today: number;
  week: number;
  year: number;
  tokensToday: number;
  updatedAt: number;
  // The local YYYY-MM-DD day `today`/`tokensToday` cover, per
  // scripts/push-usage.ts. Optional: a snapshot written before this field
  // existed (the one already in production KV, for instance) simply
  // doesn't have one.
  date?: string;
}

// A snapshot is only ever pushed once a day by scripts/push-usage.ts run by
// hand. If that stops happening — the machine is off, the script breaks —
// the number in KV goes stale. Presenting a week-old dollar figure as
// "today" would be a quiet lie, so anything older than this is treated as
// having no figure to show at all.
const STALE_MS = 48 * 60 * 60 * 1000;

const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const tokenFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export function isStale(updatedAt: number, now: number = Date.now()): boolean {
  return updatedAt <= 0 || now - updatedAt > STALE_MS;
}

// Mirrors the local-date logic in scripts/push-usage.ts (a different
// runtime — Node vs. this browser bundle — so it isn't shared code, just
// the same approach): local getters, not `toISOString` (always UTC), so a
// viewer whose local day has already rolled over past UTC midnight (or not
// yet reached it) is compared against their own calendar day, not UTC's.
function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// True when a snapshot's `today`/`tokensToday` no longer describe the
// viewer's current local day. Snapshots are pushed by hand roughly once a
// day, so the 48h staleness guard alone can't catch this: a snapshot
// pushed at 11pm is still "fresh" at 9am the next day even though its
// `today` figure now describes yesterday. A snapshot with no `date` at all
// (any pushed before this field existed) is treated as unknown — better to
// dash out a real number than risk presenting a stale one as current.
export function isRollover(date: string | undefined, now: Date = new Date()): boolean {
  return date === undefined || date !== localDateStr(now);
}

export function fmtUsd(n: number): string {
  return usdFmt.format(n);
}

// Intl's compact notation renders "51.3M" — capitalized, which the site's
// lowercase-everywhere copy rule doesn't allow for a unit suffix any more
// than it would for a word.
export function fmtTokenCount(n: number): string {
  return tokenFmt.format(n).toLowerCase();
}

const DASH = '—';

export async function initTokenFooter(): Promise<void> {
  const root = document.querySelector<HTMLElement>('[data-token-readout]');
  if (!root) return;

  const amountEl = root.querySelector<HTMLElement>('[data-tok-amount]');
  const cardToday = root.querySelector<HTMLElement>('[data-tok-card-today]');
  const cardWeek = root.querySelector<HTMLElement>('[data-tok-card-week]');
  const cardYear = root.querySelector<HTMLElement>('[data-tok-card-year]');
  const cardTokens = root.querySelector<HTMLElement>('[data-tok-card-tokens]');
  const card = root.querySelector<HTMLElement>('[data-tok-card]');
  const wrap = root.querySelector<HTMLElement>('[data-tok-wrap]');
  if (!amountEl || !cardToday || !cardWeek || !cardYear || !cardTokens || !card || !wrap) return;

  const render = (snap: UsageSnapshot) => {
    if (isStale(snap.updatedAt)) {
      amountEl.textContent = DASH;
      cardToday.textContent = DASH;
      cardWeek.textContent = DASH;
      cardYear.textContent = DASH;
      cardTokens.textContent = DASH;
      return;
    }
    // `week` and `year` don't describe a single calendar day, so a day
    // rollover doesn't make them wrong — only `today`/`tokensToday` get
    // dashed when the snapshot's date no longer matches the viewer's.
    const rollover = isRollover(snap.date);
    amountEl.textContent = rollover ? DASH : fmtUsd(snap.today);
    cardToday.textContent = rollover ? DASH : fmtUsd(snap.today);
    cardWeek.textContent = fmtUsd(snap.week);
    cardYear.textContent = fmtUsd(snap.year);
    cardTokens.textContent = rollover ? DASH : fmtTokenCount(snap.tokensToday);
  };

  try {
    const res = await fetch('/api/tokens');
    if (res.ok) render((await res.json()) as UsageSnapshot);
  } catch {
    // Network hiccup — the placeholder dash stays put rather than throwing.
  }

  // Card visibility is driven from JS (not pure `:hover` CSS) so it goes
  // through the `hidden` attribute the same way Plot.astro's tooltip does:
  // toggling `hidden` flips `display:none` on and off, which restarts the
  // `pop` animation on every open instead of only playing once. Focus/blur
  // is wired alongside mouseenter/mouseleave so the card is reachable by
  // keyboard, not just a mouse hover.
  const open = () => {
    card.hidden = false;
  };
  const close = () => {
    card.hidden = true;
  };
  wrap.addEventListener('mouseenter', open);
  wrap.addEventListener('mouseleave', close);
  wrap.addEventListener('focus', open);
  wrap.addEventListener('blur', close);
}
