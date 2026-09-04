#!/bin/bash
# Pushes a Claude Code usage snapshot to shifan.me's footer.
#
# Run by the launchd agent me.shifan.usage-push (see scripts/me.shifan.usage-push.plist).
# ccusage reads ~/.claude/projects/**/*.jsonl, so this can only ever run on shifan's
# own machine — a cloud cron has no access to those files.
#
# To run by hand:      ./scripts/usage-cron.sh
# To watch the log:    tail -f /tmp/shifan-usage-push.log

set -uo pipefail

REPO="/Users/shifanhirani/Documents/GitHub/shifan.me"
LOG="/tmp/shifan-usage-push.log"
export PATH="/Users/shifanhirani/.local/bin:/usr/local/bin:/usr/bin:/bin"

cd "$REPO" || { echo "$(date '+%F %T') repo not found at $REPO" >>"$LOG"; exit 1; }

# The token lives only in .dev.vars, which is gitignored. Never echo it.
if [ ! -f .dev.vars ]; then
  echo "$(date '+%F %T') .dev.vars missing, cannot authenticate" >>"$LOG"
  exit 1
fi
USAGE_TOKEN=$(grep '^USAGE_TOKEN=' .dev.vars | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ -z "$USAGE_TOKEN" ]; then
  echo "$(date '+%F %T') USAGE_TOKEN not set in .dev.vars" >>"$LOG"
  exit 1
fi
export USAGE_TOKEN
export USAGE_ENDPOINT="https://shifan.me/api/usage"

out=$(pnpm usage:push 2>&1)
status=$?

# Log the endpoint's reply, which contains the figures but no secret.
if [ $status -eq 0 ]; then
  echo "$(date '+%F %T') ok  $(echo "$out" | tail -1)" >>"$LOG"
else
  echo "$(date '+%F %T') FAILED (exit $status)" >>"$LOG"
  echo "$out" | tail -5 | sed 's/^/    /' >>"$LOG"
fi

# Keep the log from growing without bound.
if [ -f "$LOG" ] && [ "$(wc -l <"$LOG")" -gt 500 ]; then
  tail -200 "$LOG" >"$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

exit $status
