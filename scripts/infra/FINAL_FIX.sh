#!/bin/bash
# FINAL FIX - Run this on your droplet
# This script will:
# 1. Check .env.production
# 2. Stop existing Next.js
# 3. Start Next.js with proper env var injection
# 4. Test and show status

set -e

cd /opt/agentyc-trader

echo "=== Step 1: Checking .env.production ==="
if [ ! -f .env.production ]; then
    echo "✗ .env.production not found!"
    exit 1
fi

echo "✓ .env.production exists"
echo "First few lines:"
head -3 .env.production

echo ""
echo "=== Step 2: Stopping existing Next.js ==="
pkill -f "next start" || echo "  (no process to kill)"
sleep 2

echo ""
echo "=== Step 3: Pulling latest code ==="
git pull origin main

echo ""
echo "=== Step 4: Checking recent logs for errors ==="
if [ -f /var/log/agentyc-next.log ]; then
    echo "Last 10 lines of previous run:"
    tail -10 /var/log/agentyc-next.log
    echo ""
fi

echo "=== Step 5: Starting Next.js ==="
# Method: Use bash -c with explicit env var export
# Read .env.production, filter comments/empty lines, export each, then start
nohup bash -c '
    cd /opt/agentyc-trader
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        # Export the variable
        export "$line"
    done < .env.production
    # Verify critical vars are set
    if [ -z "$IBKR_BRIDGE_URL" ]; then
        echo "ERROR: IBKR_BRIDGE_URL not set" >&2
        exit 1
    fi
    echo "Starting Next.js with IBKR_BRIDGE_URL=$IBKR_BRIDGE_URL"
    npm run start
' > /var/log/agentyc-next.log 2>&1 &

NEXTJS_PID=$!
echo "  Started (PID: $NEXTJS_PID)"

echo ""
echo "=== Step 6: Waiting for server (10 seconds) ==="
sleep 10

echo ""
echo "=== Step 7: Checking if process is still running ==="
if ps -p $NEXTJS_PID > /dev/null; then
    echo "✓ Process is running"
else
    echo "✗ Process died! Check logs:"
    tail -30 /var/log/agentyc-next.log
    exit 1
fi

echo ""
echo "=== Step 8: Testing status endpoint ==="
STATUS=$(curl -s http://127.0.0.1:3000/api/ibkr/status 2>/dev/null || echo '{"error":"connection_failed"}')

if echo "$STATUS" | grep -q '"ok":true'; then
    echo "✓ Status endpoint working!"
    echo "$STATUS" | python3 -m json.tool 2>/dev/null || echo "$STATUS"
else
    echo "✗ Status endpoint returned error:"
    echo "$STATUS" | python3 -m json.tool 2>/dev/null || echo "$STATUS"
    echo ""
    echo "Recent logs:"
    tail -20 /var/log/agentyc-next.log
fi

echo ""
echo "=== Done ==="
echo "To check logs: tail -f /var/log/agentyc-next.log"

