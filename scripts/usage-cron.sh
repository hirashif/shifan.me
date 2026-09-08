#!/bin/bash
# Pushes a Claude Code usage snapshot to shifan.me's footer.
#
# Deliberately self-contained and living OUTSIDE ~/Documents.
# A macOS LaunchAgent cannot read ~/Documents without Full Disk Access
# (TCC), which is why the previous version of this job — which lived in
# the repo — failed every run with "Operation not permitted". Granting
# /bin/bash Full Disk Access would have been a far broader permission
# than this job needs, so nothing here touches a protected directory:
#   - reads ~/.claude/projects  (not TCC-protected)
#   - reads ~/.config/shifan/usage-token
#   - writes ~/.config/shifan/litellm-rates.json (rate-table cache)
#   - writes /tmp
#
# The aggregation itself is usage-snapshot.py, which must sit next to this
# file. In the repo that's scripts/; installed it's ~/.local/bin/. Install
# or update both with:
#   cp scripts/usage-cron.sh ~/.local/bin/shifan-usage-push.sh
#   cp scripts/usage-snapshot.py ~/.local/bin/usage-snapshot.py
#
# Run by hand:   ~/.local/bin/shifan-usage-push.sh   (or `pnpm usage:push`)
# Watch the log: tail -f /tmp/shifan-usage-push.log

set -uo pipefail

LOG="/tmp/shifan-usage-push.log"
TOKEN_FILE="$HOME/.config/shifan/usage-token"
ENDPOINT="${USAGE_ENDPOINT:-https://shifan.me/api/usage}"
SNAPSHOT="$(cd "$(dirname "$0")" && pwd)/usage-snapshot.py"
export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
cd /tmp || exit 1

log() { echo "$(date '+%F %T') $*" >>"$LOG"; }

[ -r "$TOKEN_FILE" ] || { log "FAILED: token file unreadable at $TOKEN_FILE"; exit 1; }
TOKEN=$(tr -d '\n' < "$TOKEN_FILE")
[ -n "$TOKEN" ] || { log "FAILED: token file is empty"; exit 1; }
[ -r "$SNAPSHOT" ] || { log "FAILED: aggregator missing at $SNAPSHOT"; exit 1; }

# stderr (rate-fetch fallback notices, unpriced-model warnings) goes to the
# log so a silent $0 for a new model is visible, not swallowed.
payload=$(python3 "$SNAPSHOT" 2>>"$LOG") || { log "FAILED: usage-snapshot.py exited non-zero"; exit 1; }
[ -n "$payload" ] || { log "FAILED: usage-snapshot.py returned nothing"; exit 1; }

resp=$(curl -sS --max-time 60 -w '\n%{http_code}' -X POST "$ENDPOINT" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d "$payload" 2>&1)
code=$(printf '%s' "$resp" | tail -1)
body=$(printf '%s' "$resp" | sed '$d')

if [ "$code" = "200" ]; then
  log "ok  $body"
else
  # Never log the token; the body carries figures only.
  log "FAILED: http $code  $body"
  exit 1
fi

# Keep the log bounded.
if [ "$(wc -l <"$LOG" 2>/dev/null || echo 0)" -gt 400 ]; then
  tail -150 "$LOG" >"$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
