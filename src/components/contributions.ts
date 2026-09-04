import type { ContributionDay } from '../lib/contributions';

// Levels 1-4 step up toward the accent from --cellEmpty using color-mix, the
// same approach the learnings underline (src/pages/index.astro) uses for
// var(--acc) — one definition that resolves correctly in both themes
// without a separate light/dark palette.
const LEVEL_BG: Record<number, string> = {
  0: 'var(--cellEmpty)',
  1: 'color-mix(in srgb, var(--acc) 32%, var(--cellEmpty))',
  2: 'color-mix(in srgb, var(--acc) 56%, var(--cellEmpty))',
  3: 'color-mix(in srgb, var(--acc) 80%, var(--cellEmpty))',
  4: 'var(--acc)',
};

function levelBg(level: number): string {
  return LEVEL_BG[level] ?? LEVEL_BG[0];
}

// Pads a chronological list of days out to full Sunday-to-Saturday weeks
// (missing days filled at level 0) so the grid renders as a clean
// N-week rectangle — the same shape GitHub's own calendar uses — and can be
// laid out with `grid-auto-flow: column; grid-template-rows: repeat(7, ...)`
// without gaps.
function padToWeeks(days: ContributionDay[]): ContributionDay[] {
  const byDate = new Map(days.map((d) => [d.date, d] as const));
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const first = new Date(`${sorted[0].date}T00:00:00Z`);
  const last = new Date(`${sorted[sorted.length - 1].date}T00:00:00Z`);

  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(last);
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const padded: ContributionDay[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    padded.push(byDate.get(iso) ?? { date: iso, count: 0, level: 0 });
  }
  return padded;
}

function render(grid: HTMLElement, days: ContributionDay[]): void {
  const cells = padToWeeks(days);
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const cell of cells) {
    const el = document.createElement('span');
    el.className = 'contrib-cell';
    el.style.background = levelBg(cell.level);
    frag.appendChild(el);
  }
  grid.appendChild(frag);
}

export async function initContributions(): Promise<void> {
  const section = document.querySelector<HTMLElement>('[data-contrib-section]');
  const grid = section?.querySelector<HTMLElement>('[data-contrib-grid]');
  if (!section || !grid) return;

  // The section ships visible with a blank (level-0) placeholder grid
  // already sized to a full year — see Contributions.astro — so the common
  // "it worked" path below only ever recolors those nodes in place and
  // never shifts layout. `section.hidden` is only ever set true, on the
  // rare failure path, which is the one case a shift is unavoidable: there
  // is nothing real to show, so the section collapses rather than
  // displaying an error or leaving the blank skeleton up forever.
  try {
    const res = await fetch('/api/contributions');
    if (!res.ok) {
      section.hidden = true;
      return;
    }
    const days = (await res.json()) as unknown;
    if (!Array.isArray(days) || days.length === 0) {
      section.hidden = true;
      return;
    }
    render(grid, days as ContributionDay[]);
  } catch {
    section.hidden = true;
  }
}
