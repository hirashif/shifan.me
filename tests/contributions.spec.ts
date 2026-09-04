import { test, expect } from '@playwright/test';
import { parseContributionsHtml } from '../src/lib/contributions';

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

test.describe('GET /api/contributions', () => {
  test('returns an array of {date, count, level} entries', async ({ request }) => {
    const res = await request.get('/api/contributions');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    // A live fetch to GitHub can fail in a sandboxed/offline test
    // environment; the route's documented degrade path for that is an
    // empty array (never fabricated data), so only assert per-entry shape
    // when there's something to check.
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
