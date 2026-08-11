#!/usr/bin/env bash
# Collect POS-related logs from the running backend container.
# Usage: ./scripts/pos-collect-logs.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CONTAINER="${KIOSK_BACKEND_CONTAINER:-kiosk_backend}"
OUT="${1:-./pos-logs-$(date +%Y%m%d-%H%M%S).txt}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "❌ Container '$CONTAINER' is not running."
  exit 1
fi

{
  echo "=== show_pos_config ==="
  docker exec "$CONTAINER" python manage.py show_pos_config || true
  echo ""
  echo "=== last 150 payment/pos log lines ==="
  docker exec "$CONTAINER" sh -c 'grep -E "pos_|gateway_response|payment_|MockPayment|POSPayment" /app/logs/kiosk.log | tail -150' || true
} > "$OUT"

echo "Saved: $OUT"
