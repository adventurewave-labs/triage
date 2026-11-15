#!/usr/bin/env bash
# Web UI smoke test: boots the server on a scratch port and exercises every
# route the demo touches — briefing, dossier, the override loop (§9.3), and
# the calibration run — verifying content, not just status codes.
#
# Pattern rule: NEVER `curl ... | grep` under pipefail. Large pages + `grep -q`
# exiting early ⇒ curl takes SIGPIPE (exit 23) ⇒ pipeline fails even though the
# check matched — a silent, timing-dependent false negative. Buffer to a file,
# then grep the file.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=8123
BASE="http://127.0.0.1:$PORT"

PORT=$PORT pnpm web >/tmp/web.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT

# Cold-boot on a 2-core box: tsx transpile + PGlite WASM first-load can
# exceed 30s, so wait up to 120s for CONTENT (not just a socket), and fail
# loudly with the server log if the window is exceeded.
ready=0
for _ in $(seq 1 120); do
  if curl -sf "$BASE/" -o /tmp/smoke-ready.html 2>/dev/null && grep -q "TRIAGE" /tmp/smoke-ready.html; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" != 1 ]; then
  echo "web-smoke: server did not serve content within 120s — server log:"
  tail -n 20 /tmp/web.log
  exit 1
fi

curl -sf "$BASE/" -o /tmp/smoke-briefing.html
grep -q "Corvia Care" /tmp/smoke-briefing.html

curl -sf "$BASE/company/sim%3Acorvia" -o /tmp/smoke-dossier.html
grep -qi "warm path" /tmp/smoke-dossier.html

SID=$(grep -o 'name="score_id" value="[0-9]*"' /tmp/smoke-dossier.html | head -1 | grep -o '[0-9]*')
test -n "$SID"

curl -sf -X POST "$BASE/override" \
  --data-urlencode "score_id=$SID" \
  --data-urlencode "verdict=disagree" \
  --data-urlencode "reason_code=wrong_weight" \
  --data-urlencode "note=validation-run" \
  --data-urlencode "back=/" -o /dev/null

curl -sf "$BASE/company/sim%3Acorvia" -o /tmp/smoke-dossier2.html
grep -q "disagree/wrong_weight" /tmp/smoke-dossier2.html

curl -sf -X POST "$BASE/run/calibration" -o /dev/null --max-time 240
curl -sf "$BASE/calibration" -o /tmp/smoke-calib.html
grep -q "Spearman" /tmp/smoke-calib.html

echo "web-smoke: ok (briefing · dossier · override · calibration)"
