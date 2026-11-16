#!/usr/bin/env bash
# Live-deployment check — runs against a PUBLIC deployment URL (default:
# $TRIAGE_PUBLIC_URL). Functional proof per tick: all three screens render
# real content, the override loop round-trips, and a full re-scoring brief
# completes. Latencies recorded. Buffer-then-grep throughout (no SIGPIPE).
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="${1:-${TRIAGE_PUBLIC_URL:-}}"
if [ -z "$BASE" ]; then echo "usage: deploy-check.sh <public-url>"; exit 2; fi
BASE="${BASE%/}"
TS() { date -u +%Y-%m-%dT%H:%M:%SZ; }
# portable milliseconds (GNU date %3N is unavailable on macOS/BSD)
MS() { python3 -c 'import time; print(int(time.time()*1000))'; }
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

fail() { echo "DEPLOY:FAIL $1"; exit 1; }

# ── 1. GET / — briefing renders with ranked content ─────────────────────
t0=$(MS); curl -sf --max-time 60 "$BASE/" -o "$TMP/home.html" || fail "GET / (http)"; lat_home=$(( $(MS)-t0 ))
grep -q "TRIAGE" "$TMP/home.html" || fail "GET / content (no TRIAGE)"
grep -q "Corvia Care" "$TMP/home.html" || fail "GET / content (no ranked card)"

# ── 2. GET /company/:id — dossier with warm path ─────────────────────────
t0=$(MS); curl -sf --max-time 60 "$BASE/company/sim%3Acorvia" -o "$TMP/dossier.html" || fail "GET /company (http)"; lat_dossier=$(( $(MS)-t0 ))
grep -qi "warm path" "$TMP/dossier.html" || fail "GET /company content (no warm path)"

# ── 3. Override loop round-trip (§9.3) ───────────────────────────────────
SID=$(grep -o 'name="score_id" value="[0-9]*"' "$TMP/dossier.html" | head -1 | grep -o '[0-9]*')
[ -n "$SID" ] || fail "no score_id on dossier"
curl -sf --max-time 60 -X POST "$BASE/override" \
  --data-urlencode "score_id=$SID" \
  --data-urlencode "verdict=disagree" \
  --data-urlencode "reason_code=wrong_weight" \
  --data-urlencode "note=deploy-check" \
  --data-urlencode "back=/" -o /dev/null || fail "POST /override"
curl -sf --max-time 60 "$BASE/company/sim%3Acorvia" -o "$TMP/dossier2.html" || fail "GET /company post-override"
grep -q "disagree/wrong_weight" "$TMP/dossier2.html" || fail "override not persisted"

# ── 4. Calibration screen ────────────────────────────────────────────────
curl -sf --max-time 120 "$BASE/calibration" -o "$TMP/calib.html" || fail "GET /calibration"
grep -q "Spearman\|No calibration report yet" "$TMP/calib.html" || fail "GET /calibration content"

# ── 5. Re-score brief (the heavy functional check; mock judge on shared CPU)
t0=$(MS)
curl -sf --max-time 420 -X POST "$BASE/run/brief" -o /dev/null || fail "POST /run/brief"
lat_brief=$(( $(MS)-t0 ))
curl -sf --max-time 60 "$BASE/" -o "$TMP/home2.html" || fail "GET / after re-brief"
grep -q "Corvia Care" "$TMP/home2.html" || fail "GET / after re-brief content"

echo "DEPLOY:ok ts=$(TS) lat_home=${lat_home}ms lat_dossier=${lat_dossier}ms lat_brief=${lat_brief}ms"
exit 0
