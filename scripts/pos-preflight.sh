#!/usr/bin/env bash
# POS on-site preflight for Linux kiosk (Docker).
# Usage:
#   ./scripts/pos-preflight.sh
#   ./scripts/pos-preflight.sh 192.168.1.50 1362
#   POS_SEND=1 ./scripts/pos-preflight.sh 192.168.1.50 1362

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CONTAINER="${KIOSK_BACKEND_CONTAINER:-kiosk_backend}"
HOST="${1:-}"
PORT="${2:-1362}"
AMOUNT="${POS_TEST_AMOUNT:-10000}"
REPORT="${POS_REPORT:-./pos-preflight-$(date +%Y%m%d-%H%M%S).txt}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "❌ Container '$CONTAINER' is not running."
  echo "   Start stack: docker compose up -d"
  exit 1
fi

echo "=== Kiosk POS Preflight ==="
echo "Container: $CONTAINER"
echo "Report:    $REPORT"
echo ""

ARGS=(manage.py pos_preflight --amount "$AMOUNT" --save "/app/logs/pos-preflight-last.txt")
if [[ -n "$HOST" ]]; then
  ARGS+=(--host "$HOST" --port "$PORT")
fi
if [[ "${POS_SEND:-0}" == "1" ]]; then
  echo "⚠️  POS_SEND=1 — sending real amount to POS. Close vendor PNA software first."
  ARGS+=(--send)
fi

docker exec -it "$CONTAINER" python "${ARGS[@]}"
docker cp "$CONTAINER:/app/logs/pos-preflight-last.txt" "$REPORT" 2>/dev/null || true

echo ""
echo "--- Extra: config snapshot ---"
docker exec "$CONTAINER" python manage.py show_pos_config

echo ""
echo "--- Extra: host ping (from kiosk OS, not container) ---"
if [[ -n "$HOST" ]] && command -v ping >/dev/null; then
  ping -c 2 "$HOST" || echo "(ping failed — TCP test inside container matters more)"
fi

echo ""
echo "Done. Full report copied to: $REPORT"
echo ""
echo "Next steps if TCP OK but amount not on POS:"
echo "  1. Set in .env: PAYMENT_GATEWAY_NAME=pos"
echo "  2. POS_MESSAGE_FORMAT=pardakht_novin_official"
echo "  3. POS_USE_SIMPLE_FORMAT=True"
echo "  4. docker compose up -d --force-recreate backend"
echo "  5. POS_SEND=1 ./scripts/pos-preflight.sh $HOST $PORT"
