#!/bin/bash

# View payment logs from Docker container

echo "=========================================="
echo "Payment Logs Viewer"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "ERROR: Docker is not running!"
    exit 1
fi

# Get backend container name
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -i backend | head -1)

if [ -z "$CONTAINER_NAME" ]; then
    echo "ERROR: Backend container not found!"
    echo "Please make sure the application is running."
    exit 1
fi

echo "Container: $CONTAINER_NAME"
echo ""
echo "Showing last 200 lines of payment logs..."
echo "=========================================="
echo ""

# Show logs with payment-related keywords
docker logs "$CONTAINER_NAME" --tail 200 2>&1 | grep -i "payment\|pos\|amount\|AM\|message_built\|message_final"

echo ""
echo "=========================================="
echo "End of logs"
echo "=========================================="

