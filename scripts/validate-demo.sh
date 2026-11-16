#!/usr/bin/env bash
# Demo-readiness validation — designed to run in a CLEAN environment
# (Codespace) off a fresh clone. Proves the whole surface works end to end:
# install → typecheck → tests → calibration eval → seed → briefing →
# dossier → memo → web UI (GET/POST/override/calibration) → MCP handshake.
#
# Exit non-zero on the first failing step; every step prints STEP:<name>:ok
# so the caller can append a per-iteration block to the validation log.
set -uo pipefail
cd "$(dirname "$0")/.."

pass=0
fail=0

step() {
  local name="$1"; shift
  echo "── STEP $name"
  if "$@" >/tmp/vstep.log 2>&1; then
    echo "STEP:$name:ok"
    pass=$((pass+1))
  else
    echo "STEP:$name:FAIL — last output:"
    tail -n 25 /tmp/vstep.log
    fail=$((fail+1))
    echo "RESULT:pass=$pass fail=$fail"
    exit 1
  fi
}

echo "=== Triage demo validation @ $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
node --version || exit 1
command -v pnpm >/dev/null 2>&1 || corepack enable
pnpm --version || exit 1

step install     pnpm install --frozen-lockfile
step typecheck   pnpm typecheck
# One bounded retry for the tests step only: on a cold Codespace boot we've
# observed a transient vitest-config resolve race (.vite-temp written while
# postinstall linking settles). A real failure fails twice.
step tests       bash -c 'pnpm test || { sleep 10; pnpm test; }'
step eval        pnpm eval

rm -rf .triage
step seed        pnpm seed
step brief       bash -c 'pnpm brief | tee /tmp/brief.md | grep -q "Weekly Briefing" && grep -q "^## #1 " /tmp/brief.md'
step dossier     bash -c 'pnpm dossier --name "Corvia Care" | grep -q "warm path"'
step memo        bash -c 'pnpm memo --name "Corvia Care" | grep -q "What would change my mind"'
step web         bash scripts/web-smoke.sh
step mcp         node scripts/mcp-smoke.mjs

echo "RESULT:pass=$pass fail=0"
echo "DEMO_READY"
