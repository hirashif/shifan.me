// GitHub's public, unauthenticated contributions fragment
// (https://github.com/users/<user>/contributions) is server-rendered HTML,
// not a documented API — there's no stable JSON endpoint for this data. We
// fetch that fragment and parse the calendar table out of it rather than
// embed a third-party image (ghchart, github-readme-stats, ...), which
// would hotlink someone else's server and can't follow the site's theme.
//
// Markup shape confirmed by curling the endpoint directly (2026-09-04):
// each day is a
//   <td class="ContributionCalendar-day" data-date="2026-03-08" data-level="4" id="contribution-day-component-0-27" ...></td>
// immediately followed by its tooltip, matched by `for` -> `id`:
//   <tool-tip for="contribution-day-component-0-27" ...>17 contributions on March 8th.</tool-tip>
// (a zero-contribution day reads "No contributions on <date>."). `data-date`
// gives the exact ISO date; `data-level` is GitHub's own 0-4 bucket; the
// leading integer in the tooltip text (absent on "No contributions...") is
// the real count. Attribute order in the wild doesn't match the order
// listed above for every tag (id appears before data-level on the <td>, for
// instance), so each attribute is pulled out independently rather than
// matched as one fixed sequence.
export interface ContributionDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: number; // 0-4, GitHub's own bucketing
}

const DEFAULT_USER = 'hirashif';

export function parseContributionsHtml(html: string): ContributionDay[] {
  const days: { date: string; level: number; id: string }[] = [];
  const tdRe = /<td\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = tdRe.exec(html))) {
    const tag = m[0];
    if (!/class="ContributionCalendar-day"/.test(tag)) continue;
    const date = /data-date="([^"]+)"/.exec(tag)?.[1];
    const levelStr = /data-level="(\d)"/.exec(tag)?.[1];
    const id = /\sid="([^"]+)"/.exec(tag)?.[1];
    if (date && levelStr !== undefined && id) {
      days.push({ date, level: Number(levelStr), id });
    }
  }

  const countById = new Map<string, number>();
  const ttRe = /<tool-tip\b[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g;
  while ((m = ttRe.exec(html))) {
    const id = m[1];
    const text = m[2].trim();
    const countMatch = /^(\d+)/.exec(text);
    countById.set(id, countMatch ? Number(countMatch[1]) : 0);
  }

  return days
    .map((d) => ({ date: d.date, level: d.level, count: countById.get(d.id) ?? 0 }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// The home page only wants "the last 3 months", not the full year GitHub's
// fragment returns. 13 weeks (~91 days) is the closest whole-week
// approximation of 3 months. We keep caching the full year (see
// api/contributions.ts) and slice down to this window on every read instead
// of trimming what's fetched or stored, so the cached payload stays valid
// as today rolls from one day into the next — no need to re-fetch just
// because the window's start date moved.
export const WINDOW_WEEKS = 13;

// Slices to the last `weeks` calendar weeks (Sunday-Saturday), ending with
// the week containing the most recent day in `days`. Cutting on a week
// boundary (rather than a flat "last 91 days") keeps the grid's
// week-per-column structure intact — the caller pads the result out to a
// full Sunday-Saturday rectangle, so slicing on a week start means that pad
// step doesn't need to invent extra days before the window.
export function lastNWeeks(days: ContributionDay[], weeks: number = WINDOW_WEEKS): ContributionDay[] {
  if (days.length === 0) return days;
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const last = new Date(`${sorted[sorted.length - 1].date}T00:00:00Z`);
  const lastWeekStart = new Date(last);
  lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - lastWeekStart.getUTCDay());
  const windowStart = new Date(lastWeekStart);
  windowStart.setUTCDate(windowStart.getUTCDate() - (weeks - 1) * 7);
  const startIso = windowStart.toISOString().slice(0, 10);
  return sorted.filter((d) => d.date >= startIso);
}

export async function fetchContributions(username: string = DEFAULT_USER): Promise<ContributionDay[]> {
  const res = await fetch(`https://github.com/users/${username}/contributions`, {
    headers: {
      // GitHub serves a different (JS-shell) response to some non-browser
      // user agents on this fragment endpoint; a normal browser UA keeps us
      // on the plain server-rendered table this parser expects.
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      accept: 'text/html',
    },
  });
  if (!res.ok) {
    throw new Error(`github contributions fetch failed: ${res.status}`);
  }
  const html = await res.text();
  const days = parseContributionsHtml(html);
  if (days.length === 0) {
    // GitHub's markup changed under us, or the response wasn't what we
    // expected — better to throw (and let the caller fall back to whatever
    // is cached) than to cache/serve an empty calendar as if it were real.
    throw new Error('github contributions: parsed zero days from response');
  }
  return days;
}
