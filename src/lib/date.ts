// Shared date formatters. `timeZone: 'UTC'` is load-bearing on both: content
// dates (writing frontmatter) and plot claim timestamps must render on the
// same basis regardless of the viewer's or the server's local timezone, or
// the same underlying day could print differently depending on where/when
// it's rendered.

// "sep 3" style — used by the plot's recent-claims list, where a claim
// timestamp needs day-level precision.
const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function fmtDate(d: Date): string {
  return fmt.format(d).toLowerCase();
}

// "sep" style — month only, no day, no year. Used everywhere a writing post's
// date is displayed (home's writing preview, /writing's list, a post's own
// header): posts are author-assigned to a month, not a specific day, so the
// day component of the date is sort-order-only and never shown.
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

export function fmtMonth(d: Date): string {
  return monthFmt.format(d).toLowerCase();
}
