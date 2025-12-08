#!/bin/bash
# ============================================================================
# COPY-PASTE THIS ENTIRE SCRIPT INTO YOUR DROPLET
# Replace YOUR_OPENAI_KEY and YOUR_PINECONE_KEY with your actual keys
# ============================================================================

set -e

echo "=== Agentyc Trader Deployment ==="
echo ""

# 1. Navigate to app
cd /opt/agentyc-trader

# 2. Pull latest code
echo "1. Pulling latest code..."
git pull origin main

# 3. Create .env.production with your actual keys
echo ""
echo "2. Creating .env.production..."
cat > .env.production << 'ENVEOF'
IBKR_BRIDGE_URL=http://127.0.0.1:8000
IBKR_BRIDGE_KEY=agentyc-bridge-9u1Px
OPENAI_API_KEY=YOUR_OPENAI_KEY_HERE
PINECONE_API_KEY=YOUR_PINECONE_KEY_HERE
ENVEOF

echo "⚠️  Edit .env.production and replace YOUR_OPENAI_KEY_HERE and YOUR_PINECONE_KEY_HERE"
echo "   Command: nano .env.production"
read -p "Press Enter after editing .env.production..."

# 4. Verify services
echo ""
echo "3. Verifying services..."
if ! curl -s -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health > /dev/null; then
    echo "✗ IBKR Bridge not running. Start: sudo systemctl start ibkr-bridge"
    exit 1
fi
echo "   ✓ IBKR Bridge OK"

if ! curl -s http://127.0.0.1:5001/ > /dev/null 2>&1; then
    echo "✗ IBeam health server not responding"
    exit 1
fi
echo "   ✓ IBeam health server OK"

# 5. Stop existing process
echo ""
echo "4. Stopping existing Next.js..."
pkill -f "next start" || true
sleep 2

# 6. Rebuild
echo ""
echo "5. Rebuilding..."
rm -rf .next
npm install
npm run build

# 7. Start with env vars loaded
echo ""
echo "6. Starting Next.js with environment variables..."
# Load .env.production and start in background
nohup bash -c 'cd /opt/agentyc-trader && export $(cat .env.production | grep -v "^#" | grep -v "^$" | xargs) && npm run start' > /var/log/agentyc-next.log 2>&1 &
NEXTJS_PID=$!
echo "   ✓ Started (PID: $NEXTJS_PID)"

# 8. Wait and test
echo ""
echo "7. Waiting for server..."
sleep 5

echo ""
echo "8. Testing status endpoint..."
STATUS=$(curl -s http://127.0.0.1:3000/api/ibkr/status)
echo "$STATUS" | python3 -m json.tool 2>/dev/null || echo "$STATUS"

if echo "$STATUS" | grep -q '"ok":true' && echo "$STATUS" | grep -q '"authenticated":true'; then
    echo ""
    echo "✅ SUCCESS! IBKR status is LIVE"
else
    echo ""
    echo "⚠️  Status check incomplete. Check logs: tail -f /var/log/agentyc-next.log"
fi

echo ""
echo "=== Done ==="

