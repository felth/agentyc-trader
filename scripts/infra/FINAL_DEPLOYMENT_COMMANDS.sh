#!/bin/bash
# FINAL DEPLOYMENT COMMANDS - Copy and paste this entire block into droplet
# Replace YOUR_OPENAI_KEY and YOUR_PINECONE_KEY with actual values

set -e

echo "=== Agentyc Trader Final Deployment ==="
echo ""

# 1. Navigate to app directory
cd /opt/agentyc-trader

# 2. Pull latest code
echo "1. Pulling latest code..."
git pull origin main

# 3. Create/update .env.production with your actual keys
echo ""
echo "2. Creating .env.production..."
cat > .env.production << 'ENVEOF'
IBKR_BRIDGE_URL=http://127.0.0.1:8000
IBKR_BRIDGE_KEY=agentyc-bridge-9u1Px
OPENAI_API_KEY=YOUR_OPENAI_KEY_HERE
PINECONE_API_KEY=YOUR_PINECONE_KEY_HERE
ENVEOF

echo "⚠️  IMPORTANT: Edit .env.production and replace YOUR_OPENAI_KEY_HERE and YOUR_PINECONE_KEY_HERE"
echo "   Run: nano .env.production"
read -p "Press Enter after you've edited .env.production with your real keys..."

# 4. Verify services are running
echo ""
echo "3. Verifying services..."
echo "   Checking IBKR Bridge..."
if curl -s -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health > /dev/null; then
    echo "   ✓ IBKR Bridge is running"
else
    echo "   ✗ IBKR Bridge is NOT running. Start it: sudo systemctl start ibkr-bridge"
    exit 1
fi

echo "   Checking IBeam health server..."
if curl -s http://127.0.0.1:5001/ > /dev/null 2>&1; then
    echo "   ✓ IBeam health server is responding (404 is OK)"
else
    echo "   ✗ IBeam health server is NOT responding"
    exit 1
fi

# 5. Stop existing Next.js process
echo ""
echo "4. Stopping existing Next.js process..."
pkill -f "next start" || echo "   (No existing process)"

# 6. Clean and rebuild
echo ""
echo "5. Cleaning and rebuilding..."
rm -rf .next
npm install
npm run build

# 7. Start Next.js using the startup script
echo ""
echo "6. Starting Next.js with environment variables..."
# Copy startup script if not exists
if [ ! -f start-nextjs.sh ]; then
    cp scripts/infra/start-nextjs.sh start-nextjs.sh
    chmod +x start-nextjs.sh
fi

# Start in background with env vars loaded
nohup bash -c 'cd /opt/agentyc-trader && export $(cat .env.production | grep -v "^#" | grep -v "^$" | xargs) && npm run start' > /var/log/agentyc-next.log 2>&1 &
NEXTJS_PID=$!
echo "   ✓ Next.js started (PID: $NEXTJS_PID)"
echo "   Logs: tail -f /var/log/agentyc-next.log"

# 8. Wait for server to start
echo ""
echo "7. Waiting for server to start..."
sleep 5

# 9. Test status endpoint locally
echo ""
echo "8. Testing /api/ibkr/status locally..."
LOCAL_RESPONSE=$(curl -s http://127.0.0.1:3000/api/ibkr/status || echo "FAILED")
if echo "$LOCAL_RESPONSE" | grep -q '"ok":true'; then
    echo "   ✓ Local endpoint working"
    echo "$LOCAL_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOCAL_RESPONSE"
else
    echo "   ✗ Local endpoint failed"
    echo "   Response: $LOCAL_RESPONSE"
    echo "   Check logs: tail -20 /var/log/agentyc-next.log"
fi

# 10. Test via public URL
echo ""
echo "9. Testing via public URL..."
PUBLIC_RESPONSE=$(curl -s https://ibkr.agentyctrader.com/api/ibkr/status || echo "FAILED")
if echo "$PUBLIC_RESPONSE" | grep -q '"ok":true'; then
    echo "   ✓ Public URL working"
    echo "$PUBLIC_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PUBLIC_RESPONSE"
else
    echo "   ✗ Public URL failed"
    echo "   Response: $PUBLIC_RESPONSE"
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "If status shows errors, check:"
echo "  - Logs: tail -f /var/log/agentyc-next.log"
echo "  - IBeam: docker logs ibeam_ibeam_1 --tail=20"
echo "  - Bridge: sudo systemctl status ibkr-bridge"

