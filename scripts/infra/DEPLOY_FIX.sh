#!/bin/bash
# FIXED DEPLOYMENT SCRIPT - Use this to properly start Next.js with env vars
# This script properly loads .env.production and starts Next.js

set -e

cd /opt/agentyc-trader

echo "=== Checking .env.production ==="
if [ ! -f .env.production ]; then
    echo "✗ .env.production not found!"
    echo "Create it with:"
    echo "  cat > .env.production << 'EOF'"
    echo "  IBKR_BRIDGE_URL=http://127.0.0.1:8000"
    echo "  IBKR_BRIDGE_KEY=agentyc-bridge-9u1Px"
    echo "  OPENAI_API_KEY=your_key_here"
    echo "  PINECONE_API_KEY=your_key_here"
    echo "  EOF"
    exit 1
fi

echo "✓ .env.production exists"

echo ""
echo "=== Stopping existing Next.js ==="
pkill -f "next start" || echo "  (no existing process)"

echo ""
echo "=== Starting Next.js with env vars ==="
# Use the startup script which properly loads .env.production
nohup bash scripts/infra/start-nextjs.sh > /var/log/agentyc-next.log 2>&1 &
NEXTJS_PID=$!

echo "  Started (PID: $NEXTJS_PID)"
echo "  Logs: tail -f /var/log/agentyc-next.log"

echo ""
echo "=== Waiting for server to start ==="
sleep 5

echo ""
echo "=== Testing status endpoint ==="
STATUS=$(curl -s http://127.0.0.1:3000/api/ibkr/status 2>/dev/null || echo '{"error":"connection_failed"}')

if echo "$STATUS" | grep -q '"ok":true'; then
    echo "✓ Status endpoint working:"
    echo "$STATUS" | python3 -m json.tool 2>/dev/null || echo "$STATUS"
else
    echo "✗ Status endpoint returned error:"
    echo "$STATUS" | python3 -m json.tool 2>/dev/null || echo "$STATUS"
    echo ""
    echo "Check logs: tail -n 50 /var/log/agentyc-next.log"
fi

