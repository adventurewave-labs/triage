#!/usr/bin/env bash
# Production soak check — per-tick:
#   1. Ensure the LONG-LIVED soak server is up (isolated store via
#      TRIAGE_DATA_DIR; boots once, stays up for the whole campaign — this is
#      what makes it a soak test rather than repeated cold boots)
#   2. Health-check it: uptime, RSS, latency on / and /company
#   3. Run the full 10-step functional validation against the default store
#   4. Append one metrics row to /tmp/triage-soak-metrics.tsv
#
# Exit code = functional validation result. Soak health failures also exit 1.
set -uo pipefail
cd "$(dirname "$0")/.."

SOAK_DIR="$PWD/.soak-data"
SOAK_PORT=8223
SOAK_PID_FILE=/tmp/triage-soak.pid
SOAK_LOG=/tmp/triage-soak-web.log
# Durable metrics (soak finding #3): /tmp does not survive codespace
# hibernation — the persisted repo volume does.
SOAK_METRICS="$SOAK_DIR/metrics.tsv"
BASE="http://127.0.0.1:$SOAK_PORT"

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }
now_ms() { date +%s%3N; }

# ── 1. Ensure soak server ────────────────────────────────────────────────
server_state="reused"
if [ -f "$SOAK_PID_FILE" ] && kill -0 "$(cat "$SOAK_PID_FILE")" 2>/dev/null; then
  :
else
  if [ ! -d "$SOAK_DIR" ]; then
    TRIAGE_DATA_DIR="$SOAK_DIR" pnpm seed >/dev/null 2>&1
    TRIAGE_DATA_DIR="$SOAK_DIR" pnpm brief >/dev/null 2>&1
  fi
  TRIAGE_DATA_DIR="$SOAK_DIR" PORT=$SOAK_PORT nohup pnpm exec tsx src/web/server.ts >"$SOAK_LOG" 2>&1 &
  echo $! > "$SOAK_PID_FILE"
  server_state="started"
  # wait for content, up to 120s (cold boot on 2 cores)
  ready=0
  for _ in $(seq 1 120); do
    if curl -sf "$BASE/" -o /tmp/soak-boot.html 2>/dev/null && grep -q "TRIAGE" /tmp/soak-boot.html; then
      ready=1; break
    fi
    sleep 1
  done
  if [ "$ready" != 1 ]; then
    echo "SOAK:FAIL server did not boot — log tail:"; tail -n 20 "$SOAK_LOG"
    printf "%s\tfail\t%s\t-\t-\t-\t-\n" "$(ts)" "$server_state" >> "$SOAK_METRICS"
    exit 1
  fi
fi
PID=$(cat "$SOAK_PID_FILE")

# ── 2. Soak health (buffer-then-grep; never curl|grep under pipefail) ───
t0=$(now_ms)
curl -sf "$BASE/" -o /tmp/soak-home.html || { echo "SOAK:FAIL GET /"; exit 1; }
lat_home=$(( $(now_ms) - t0 ))
grep -q "TRIAGE" /tmp/soak-home.html || { echo "SOAK:FAIL / content"; exit 1; }

t0=$(now_ms)
curl -sf "$BASE/company/sim%3Acorvia" -o /tmp/soak-dossier.html || { echo "SOAK:FAIL GET /company"; exit 1; }
lat_dossier=$(( $(now_ms) - t0 ))
grep -qi "warm path" /tmp/soak-dossier.html || { echo "SOAK:FAIL /company content"; exit 1; }

uptime_s=$(ps -o etimes= -p "$PID" 2>/dev/null | tr -d ' ' || echo 0)
rss_kb=$(ps -o rss= -p "$PID" 2>/dev/null | tr -d ' ' || echo 0)

# ── 3. Functional validation (default store; includes its own web+MCP) ──
bash scripts/validate-demo.sh >/tmp/soak-validation.log 2>&1
func=$?

# ── 4. Metrics row ────────────────────────────────────────────────────────
printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
  "$(ts)" "$func" "$server_state" "$uptime_s" "$rss_kb" "$lat_home" "$lat_dossier" \
  >> "$SOAK_METRICS"

echo "SOAK:ok server=$server_state pid=$PID uptime=${uptime_s}s rss=$((rss_kb/1024))MB lat_home=${lat_home}ms lat_dossier=${lat_dossier}ms validation_exit=$func"
tail -n 3 "$SOAK_METRICS"
exit "$func"
