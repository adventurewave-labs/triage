#!/usr/bin/env bash
# Web UI smoke test: boots the server on a scratch port and exercises every
# route the demo touches — briefing, dossier, the override loop (§9.3), and
# the calibration run — verifying content, not just status codes.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=8123
PORT=$PORT pnpm web >/tmp/web.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1 && break
  sleep 1
done

curl -sf "http://127.0.0.1:$PORT/" | grep -q "Corvia Care"
curl -sf "http://127.0.0.1:$PORT/company/sim%3Acorvia" | grep -qi "warm path"

SID=$(curl -sf "http://127.0.0.1:$PORT/company/sim%3Acorvia" \
  | grep -o 'name="score_id" value="[0-9]*"' | head -1 | grep -o '[0-9]*')
test -n "$SID"

curl -sf -X POST "http://127.0.0.1:$PORT/override" \
  --data-urlencode "score_id=$SID" \
  --data-urlencode "verdict=disagree" \
  --data-urlencode "reason_code=wrong_weight" \
  --data-urlencode "note=validation-run" \
  --data-urlencode "back=/" -o /dev/null

curl -sf "http://127.0.0.1:$PORT/company/sim%3Acorvia" | grep -q "disagree/wrong_weight"

curl -sf -X POST "http://127.0.0.1:$PORT/run/calibration" -o /dev/null --max-time 240
curl -sf "http://127.0.0.1:$PORT/calibration" | grep -q "Spearman"

echo "web-smoke: ok (briefing · dossier · override · calibration)"
