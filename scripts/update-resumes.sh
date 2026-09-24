#!/bin/bash
# pnpm resumes — push the current resume PDFs everywhere they're served.
#
#   main resume  -> shifan.me/hereismyresume.pdf  and  hirashif.github.io/resume.pdf
#   ai/gtm       -> shifan.me/hereismyresume-ai.pdf
#
# Copies both PDFs in, commits and deploys shifan.me if either changed, updates
# the old github.io site if the main one changed, then fetches all three live
# URLs and checks their md5 against the source files. Steps with nothing to do
# are skipped, so it's safe to run any time.
#
# Source paths can be overridden:
#   RESUME_MAIN=/path/a.pdf RESUME_AI=/path/b.pdf pnpm resumes

set -euo pipefail

RESUMES_DIR="/Users/shifanhirani/Documents/job apps/resumes"
MAIN_SRC="${RESUME_MAIN:-$RESUMES_DIR/Shifan_Hirani_Resume_web.pdf}"
AI_SRC="${RESUME_AI:-$RESUMES_DIR/Shifan_Hirani_Resume_GTM_web.pdf}"
MAIN_DST="public/hereismyresume.pdf"
AI_DST="public/hereismyresume-ai.pdf"
GHIO_REPO="https://github.com/hirashif/hirashif.github.io"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
die()  { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }
md5of() { md5 -q "$1" 2>/dev/null || md5sum "$1" | cut -d' ' -f1; }
url_hash() { curl -sf --max-time 30 "$1?cb=$RANDOM$RANDOM" | { md5 -q 2>/dev/null || md5sum | cut -d' ' -f1; }; }

# --- preflight -------------------------------------------------------------
for f in "$MAIN_SRC" "$AI_SRC"; do
  [ -f "$f" ] || die "missing source file: $f"
  [ "$(head -c4 "$f")" = "%PDF" ] || die "not a pdf: $f"
done

[ "$(git branch --show-current)" = "main" ] || die "not on main — deploying from another branch would ship unmerged work"

# `pnpm build` deploys the working tree as-is, so any other uncommitted change
# would go live without being committed. Refuse rather than ship it silently.
other=$(git status --porcelain -- . ":(exclude)$MAIN_DST" ":(exclude)$AI_DST")
[ -z "$other" ] || die "uncommitted changes besides the resume pdfs would be deployed too:
$other"

MAIN_HASH=$(md5of "$MAIN_SRC")
AI_HASH=$(md5of "$AI_SRC")

# --- shifan.me -------------------------------------------------------------
say "shifan.me"
cp "$MAIN_SRC" "$MAIN_DST"
cp "$AI_SRC" "$AI_DST"

if git diff --quiet -- "$MAIN_DST" "$AI_DST"; then
  echo "  both pdfs already current, skipping deploy"
else
  git diff --quiet -- "$MAIN_DST" || echo "  main resume changed"
  git diff --quiet -- "$AI_DST"   || echo "  ai resume changed"
  echo "  running resume tests"
  pnpm exec playwright test tests/resume.spec.ts --reporter=line >/dev/null \
    || die "resume tests failed — nothing committed or deployed (pdfs left copied in public/)"
  git add -- "$MAIN_DST" "$AI_DST"
  git commit -q -m "resume: refresh pdfs" -- "$MAIN_DST" "$AI_DST"
  git push -q origin main
  echo "  committed and pushed $(git rev-parse --short HEAD)"
  echo "  building and deploying"
  pnpm build >/dev/null 2>&1 || die "build failed"
  pnpm exec wrangler deploy >/dev/null 2>&1 || die "wrangler deploy failed"
  echo "  deployed"
fi

# --- hirashif.github.io ----------------------------------------------------
say "hirashif.github.io"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git clone -q --depth 1 "$GHIO_REPO" "$tmp/ghio"
if [ "$(md5of "$tmp/ghio/resume.pdf")" = "$MAIN_HASH" ]; then
  echo "  resume.pdf already current, skipping"
else
  cp "$MAIN_SRC" "$tmp/ghio/resume.pdf"
  git -C "$tmp/ghio" add resume.pdf
  git -C "$tmp/ghio" commit -q -m "chore: update resume.pdf to the current version"
  git -C "$tmp/ghio" push -q origin HEAD
  echo "  pushed (github pages takes ~1 min to rebuild)"
fi

# --- verify live -----------------------------------------------------------
say "verifying live urls"
check() { # url expected label
  local got=""
  for _ in $(seq 1 18); do          # up to ~3 minutes for caches and pages
    got=$(url_hash "$1" || true)
    [ "$got" = "$2" ] && { printf '  \033[32mok\033[0m    %s\n' "$3"; return 0; }
    sleep 10
  done
  printf '  \033[31mSTALE\033[0m %s  (live %s, want %s)\n' "$3" "${got:-unreachable}" "$2"
  return 1
}

fail=0
check "https://shifan.me/hereismyresume.pdf"    "$MAIN_HASH" "shifan.me/hereismyresume.pdf"    || fail=1
check "https://shifan.me/hereismyresume-ai.pdf" "$AI_HASH"   "shifan.me/hereismyresume-ai.pdf" || fail=1
check "https://hirashif.github.io/resume.pdf"   "$MAIN_HASH" "hirashif.github.io/resume.pdf"   || fail=1

[ $fail -eq 0 ] && say "all three resume urls serve the current pdfs" || die "one or more urls are still serving an old pdf"
