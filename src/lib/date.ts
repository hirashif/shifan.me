// Shared short-date formatter — "sep 3" style — used everywhere the site
// shows a date: home's writing preview, /writing's list, a post's own
// header, and the plot's recent-claims list. `timeZone: 'UTC'` is load-
// bearing: content dates (writing frontmatter) and plot claim timestamps
// must render on the same basis regardless of the viewer's or the
// server's local timezone, or the same underlying day could print
// differently depending on where/when it's rendered.
const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function fmtDate(d: Date): string {
  return fmt.format(d).toLowerCase();
}
