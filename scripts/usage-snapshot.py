#!/usr/bin/env python3
"""Aggregate Claude Code usage from local logs into the footer snapshot.

Prints one JSON object: {today, week, quarter, tokensToday, date}.
`quarter` is a rolling 90 days, the window T3 Code's panel defaults to.

Mirrors T3 Code's usage panel so the two agree to the cent:
  - reads every ~/.claude/projects/**/*.jsonl
  - dedupes on message.id (falls back to the line's uuid) — Claude Code
    writes the same assistant message more than once, one line per content
    block, all carrying identical usage
  - prices with LiteLLM's public rate table (input, cache read, cache
    write, output; the 1h cache-write tier is ignored, as T3 does)
  - buckets by the local calendar day

This replaced ccusage. ccusage's bundled offline rate table had no entry
for claude-fable-5-1, so every session on that model was priced at $0 and
the footer drifted well under what T3 showed for the same logs.

Deliberately dependency-free (stdlib only) so the copy in ~/.local/bin can
run under launchd without node, pnpm, or the repo on its path.
"""
import datetime
import glob
import json
import os
import sys
import urllib.request

RATES_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'
RATES_CACHE = os.path.expanduser('~/.config/shifan/litellm-rates.json')
# Recursive: subagent transcripts sit one level deeper, under
# <project>/<session>/subagents/*.jsonl, and are ~40% of all files.
LOG_GLOB = os.path.expanduser('~/.claude/projects/**/*.jsonl')


def load_rates():
    """Fetch LiteLLM's rate table, caching a copy for offline runs."""
    try:
        with urllib.request.urlopen(RATES_URL, timeout=30) as r:
            raw = r.read()
        doc = json.loads(raw)
        os.makedirs(os.path.dirname(RATES_CACHE), exist_ok=True)
        with open(RATES_CACHE, 'wb') as f:
            f.write(raw)
        return doc
    except Exception as e:  # noqa: BLE001 — any fetch failure falls back
        print(f'rates fetch failed ({e}); using cached copy', file=sys.stderr)
        with open(RATES_CACHE) as f:
            return json.load(f)


def price(rates, model, inp, cache_read, cache_write, out):
    r = rates.get(model)
    if not r:
        return None
    return (
        inp * r.get('input_cost_per_token', 0)
        + cache_read * r.get('cache_read_input_token_cost', 0)
        + cache_write * r.get('cache_creation_input_token_cost', 0)
        + out * r.get('output_cost_per_token', 0)
    )


def main():
    rates = load_rates()
    seen = set()
    unpriced = {}
    cost_by_day = {}
    tokens_by_day = {}

    for path in glob.glob(LOG_GLOB, recursive=True):
        with open(path, errors='ignore') as f:
            for line in f:
                if '"usage"' not in line:
                    continue
                try:
                    o = json.loads(line)
                except ValueError:
                    continue
                m = o.get('message') or {}
                u = m.get('usage')
                ts = o.get('timestamp')
                if not u or not ts:
                    continue
                key = m.get('id') or o.get('uuid')
                if not key or key in seen:
                    continue
                seen.add(key)

                model = m.get('model') or '<unknown>'
                inp = u.get('input_tokens', 0) or 0
                cr = u.get('cache_read_input_tokens', 0) or 0
                cw = u.get('cache_creation_input_tokens', 0) or 0
                out = u.get('output_tokens', 0) or 0
                c = price(rates, model, inp, cr, cw, out)
                if c is None:
                    unpriced[model] = unpriced.get(model, 0) + inp + cr + cw + out
                    c = 0.0

                # Local calendar day. `timestamp` is ISO-8601 UTC ("...Z").
                day = (
                    datetime.datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    .astimezone()
                    .date()
                    .isoformat()
                )
                cost_by_day[day] = cost_by_day.get(day, 0.0) + c
                tokens_by_day[day] = tokens_by_day.get(day, 0) + inp + cr + cw + out

    # Anything unpriced is a rate-table gap, exactly the failure this script
    # exists to avoid. Loud on stderr, but still emit the snapshot: a number
    # that's low for one model beats no number at all.
    for model, toks in unpriced.items():
        if model != '<synthetic>' and toks:
            print(f'warning: no rate for {model} ({toks} tokens priced at $0)', file=sys.stderr)

    today = datetime.date.today()
    week_ago = (today - datetime.timedelta(days=6)).isoformat()
    quarter_ago = (today - datetime.timedelta(days=89)).isoformat()
    t = today.isoformat()

    snapshot = {
        'today': round(cost_by_day.get(t, 0.0), 2),
        'week': round(sum(v for d, v in cost_by_day.items() if d >= week_ago), 2),
        'quarter': round(sum(v for d, v in cost_by_day.items() if d >= quarter_ago), 2),
        'tokensToday': tokens_by_day.get(t, 0),
        'date': t,
    }
    print(json.dumps(snapshot))


if __name__ == '__main__':
    main()
