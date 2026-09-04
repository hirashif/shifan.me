import { test, expect } from '@playwright/test';
import { parseContributionsHtml, lastNWeeks, type ContributionDay } from '../src/lib/contributions';

// A full year of days (like GitHub's fragment actually returns), one entry
// per date, all level 0 — only the dates matter for these slicing tests.
function fullYear(endingOn: string): ContributionDay[] {
  const end = new Date(`${endingOn}T00:00:00Z`);
  const days: ContributionDay[] = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0, level: 0 });
  }
  return days.reverse();
}

// A trimmed stand-in for the real markup at
// https://github.com/users/hirashif/contributions (confirmed by curling it
// directly on 2026-09-04): a <td class="ContributionCalendar-day"> per day
// carrying data-date/data-level, immediately followed by a <tool-tip
// for="..."> whose text leads with the real count ("No contributions..."
// for a zero day). Attribute order is deliberately scrambled here (id
// before data-level, like the real response) to guard against a parser
// that assumes one fixed attribute order.
const FIXTURE_HTML = `
<table>
  <tbody>
    <tr>
      <td tabindex="0" data-ix="0" aria-describedby="contribution-graph-legend-level-0" data-date="2026-03-01" id="contribution-day-component-0-0" data-level="0" class="ContributionCalendar-day"></td>
      <td tabindex="0" data-ix="1" aria-describedby="contribution-graph-legend-level-4" data-date="2026-03-02" id="contribution-day-component-0-1" data-level="4" class="ContributionCalendar-day"></td>
      <td tabindex="0" data-ix="2" aria-describedby="contribution-graph-legend-level-1" data-date="2026-03-03" id="contribution-day-component-0-2" data-level="1" class="ContributionCalendar-day"></td>
    </tr>
  </tbody>
  <tool-tip id="tooltip-a" for="contribution-day-component-0-0" popover="manual">No contributions on March 1st.</tool-tip>
  <tool-tip id="tooltip-b" for="contribution-day-component-0-1" popover="manual">17 contributions on March 2nd.</tool-tip>
  <tool-tip id="tooltip-c" for="contribution-day-component-0-2" popover="manual">1 contribution on March 3rd.</tool-tip>
</table>
`;

test.describe('parseContributionsHtml', () => {
  test('pairs each day cell with its tooltip count by id, independent of attribute order', () => {
    const days = parseContributionsHtml(FIXTURE_HTML);
    expect(days).toEqual([
      { date: '2026-03-01', count: 0, level: 0 },
      { date: '2026-03-02', count: 17, level: 4 },
      { date: '2026-03-03', count: 1, level: 1 },
    ]);
  });

  test('returns an empty array rather than throwing on markup it does not recognize', () => {
    expect(parseContributionsHtml('<html><body>not a calendar</body></html>')).toEqual([]);
  });
});

test.describe('lastNWeeks', () => {
  // 26 weeks = the last full Sunday-Saturday week containing the most
  // recent day, plus the 25 before it. The final week is only ever partial
  // (through "today"), so the exact count varies with the weekday of the
  // most recent day (176-182 days), but it's always a whole number of weeks
  // back from a Sunday boundary — asserted below directly.
  const days = fullYear('2026-09-04'); // a Friday

  test('trims a full year down to a ~26-week window ending on the last day', () => {
    const trimmed = lastNWeeks(days);
    expect(trimmed[trimmed.length - 1].date).toBe('2026-09-04');
    expect(trimmed.length).toBeGreaterThanOrEqual(176);
    expect(trimmed.length).toBeLessThanOrEqual(182);
  });

  test('keeps whole weeks: the window starts on a Sunday', () => {
    const trimmed = lastNWeeks(days);
    const start = new Date(`${trimmed[0].date}T00:00:00Z`);
    expect(start.getUTCDay()).toBe(0);
  });

  test('is a no-op on an already-empty list', () => {
    expect(lastNWeeks([])).toEqual([]);
  });

  test('does not mutate its input or depend on input order', () => {
    const shuffled = [...days].reverse();
    const trimmed = lastNWeeks(shuffled);
    expect(shuffled[0].date).toBe(days[days.length - 1].date); // untouched
    expect(trimmed[trimmed.length - 1].date).toBe('2026-09-04');
  });
});

test.describe('GET /api/contributions', () => {
  test('returns an array of {date, count, level} entries trimmed to roughly the last 6 months', async ({
    request,
  }) => {
    const res = await request.get('/api/contributions');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    // A live fetch to GitHub can fail in a sandboxed/offline test
    // environment; the route's documented degrade path for that is an
    // empty array (never fabricated data), so only assert shape when
    // there's something to check.
    if (body.length > 0) {
      // 26 weeks, last one partial — a sensible range rather than an exact
      // count, since the exact number drifts with today's weekday. Never
      // the ~365 days the old full-year view rendered.
      expect(body.length).toBeGreaterThanOrEqual(170);
      expect(body.length).toBeLessThanOrEqual(190);
    }
    for (const day of body.slice(0, 10)) {
      expect(typeof day.date).toBe('string');
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof day.count).toBe('number');
      expect(day.count).toBeGreaterThanOrEqual(0);
      expect(typeof day.level).toBe('number');
      expect(day.level).toBeGreaterThanOrEqual(0);
      expect(day.level).toBeLessThanOrEqual(4);
    }
  });

  test('sets a public cache-control header', async ({ request }) => {
    const res = await request.get('/api/contributions');
    expect(res.headers()['cache-control']).toContain('public');
  });
});
