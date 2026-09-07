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
#   - writes /tmp
#
# Run by hand:   ~/.local/bin/shifan-usage-push.sh
# Watch the log: tail -f /tmp/shifan-usage-push.log

set -uo pipefail

LOG="/tmp/shifan-usage-push.log"
TOKEN_FILE="$HOME/.config/shifan/usage-token"
ENDPOINT="https://shifan.me/api/usage"
export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
cd /tmp || exit 1

log() { echo "$(date '+%F %T') $*" >>"$LOG"; }

[ -r "$TOKEN_FILE" ] || { log "FAILED: token file unreadable at $TOKEN_FILE"; exit 1; }
TOKEN=$(tr -d '\n' < "$TOKEN_FILE")
[ -n "$TOKEN" ] || { log "FAILED: token file is empty"; exit 1; }

YEAR_START="$(date '+%Y')0101"
raw=$(npx -y ccusage@latest daily --json --offline --since "$YEAR_START" 2>/dev/null)
if [ -z "$raw" ]; then
  log "FAILED: ccusage returned nothing"
  exit 1
fi

# Aggregate on LOCAL calendar days — ccusage buckets by local day, so using
# UTC here would report $0.00 for several hours after local midnight.
payload=$(printf '%s' "$raw" | python3 -c '
import sys, json, datetime
d = json.load(sys.stdin)
days = d.get("daily", [])
today = datetime.date.today()
week_ago = today - datetime.timedelta(days=6)
def s(rows, k): return sum(r.get(k, 0) or 0 for r in rows)
td = [r for r in days if r.get("period") == today.isoformat()]
wk = [r for r in days if r.get("period", "") >= week_ago.isoformat()]
print(json.dumps({
    "today": round(s(td, "totalCost"), 2),
    "week": round(s(wk, "totalCost"), 2),
    "year": round(s(days, "totalCost"), 2),
    "tokensToday": s(td, "totalTokens"),
    "date": today.isoformat(),
}))
') || { log "FAILED: could not parse ccusage output"; exit 1; }

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
