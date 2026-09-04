export interface UsageSnapshot {
  today: number;
  week: number;
  year: number;
  tokensToday: number;
  updatedAt: number;
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
    amountEl.textContent = fmtUsd(snap.today);
    cardToday.textContent = fmtUsd(snap.today);
    cardWeek.textContent = fmtUsd(snap.week);
    cardYear.textContent = fmtUsd(snap.year);
    cardTokens.textContent = fmtTokenCount(snap.tokensToday);
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
