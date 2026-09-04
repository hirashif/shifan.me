// Run locally (never in CI/CD — this reads ~/.claude/projects, which only
// exists on a machine that has actually run Claude Code) with:
//
//   USAGE_TOKEN=<the shared secret> pnpm usage:push
//
// It shells out to `ccusage`, which reads Claude Code's local usage logs at
// ~/.claude/projects/**/*.jsonl, sums today / this week / this year, and
// POSTs the result to /api/usage so the footer on shifan.me has something
// real to show. It never touches Anthropic's cost API and never talks to a
// billing endpoint — this is a subscription, not a metered account, so
// there is no bill to read. The numbers are ccusage's own API-rate pricing
// applied to local token counts, nothing more.
import { execFileSync } from 'node:child_process';

const ENDPOINT = process.env.USAGE_ENDPOINT ?? 'https://shifan.me/api/usage';
const TOKEN = process.env.USAGE_TOKEN;
if (!TOKEN) {
  console.error('set USAGE_TOKEN');
  process.exit(1);
}

interface Day {
  period: string;
  totalCost: number;
  totalTokens: number;
}

interface CcusageDaily {
  daily: Day[];
}

// ccusage buckets its `period` field by *local* calendar day (there's no
// timezone flag in play here), not UTC. `Date#toISOString` is always UTC,
// so anywhere from 0 to several hours a day — verified on this machine,
// where UTC has already rolled to the next date while it's still "today"
// in the local zone — that mismatch would silently zero out `today` and
// `tokensToday` even though ccusage has real rows for the local day. Local
// getters (`getFullYear`/`getMonth`/`getDate`) avoid that.
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// One `--since <year start>` call returns every day of the year so today /
// this week / this year can all be sliced from the same response, instead
// of shelling out to ccusage three times.
const yearStart = `${new Date().getFullYear()}0101`;
const raw = execFileSync(
  'pnpm',
  ['exec', 'ccusage', 'daily', '--json', '--offline', '--since', yearStart],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
);
const { daily } = JSON.parse(raw) as CcusageDaily;

const today = localDateStr(new Date());
const weekAgo = localDateStr(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

const sum = (rows: Day[], key: 'totalCost' | 'totalTokens'): number =>
  rows.reduce((total, day) => total + (day[key] ?? 0), 0);

const todayRows = daily.filter((day) => day.period === today);
const weekRows = daily.filter((day) => day.period >= weekAgo);

const snapshot = {
  today: Number(sum(todayRows, 'totalCost').toFixed(2)),
  week: Number(sum(weekRows, 'totalCost').toFixed(2)),
  year: Number(sum(daily, 'totalCost').toFixed(2)),
  tokensToday: sum(todayRows, 'totalTokens'),
  // The local calendar day this snapshot's `today`/`tokensToday` cover.
  // Snapshots are pushed by hand roughly once a day, so the 48h staleness
  // guard in tokens.ts can't by itself detect a day rollover — a snapshot
  // pushed at 11pm is still "fresh" at 9am the next day even though its
  // `today` figure now describes yesterday. Carrying the calendar day lets
  // the footer dash out `today` once the viewer's own local date moves past
  // it, without waiting for the 48h guard to catch up.
  date: today,
};

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  body: JSON.stringify(snapshot),
});
console.log(res.status, await res.text());
if (!res.ok) process.exit(1);
