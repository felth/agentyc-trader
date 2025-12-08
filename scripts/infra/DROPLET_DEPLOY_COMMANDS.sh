#!/bin/bash
# Exact commands to deploy and configure Agentyc Trader on the droplet
# Run these commands in order from /opt/agentyc-trader

set -e  # Exit on error

echo "=== Agentyc Trader Droplet Deployment ==="
echo ""

# 1. Set environment variables in current shell
echo "1. Setting environment variables..."
export IBKR_BRIDGE_URL="http://127.0.0.1:8000"
export IBKR_BRIDGE_KEY="agentyc-bridge-9u1Px"
# Add your actual API keys here:
# export OPENAI_API_KEY="sk-proj-..."
# export PINECONE_API_KEY="pcsk_..."

# 2. Verify IBKR Bridge is running
echo ""
echo "2. Verifying IBKR Bridge is running..."
if curl -s -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health > /dev/null; then
    echo "   ✓ IBKR Bridge is running on port 8000"
else
    echo "   ✗ IBKR Bridge is NOT running. Start it with:"
    echo "     sudo systemctl start ibkr-bridge"
    exit 1
fi

# 3. Verify IBeam health server is responding
echo ""
echo "3. Verifying IBeam health server..."
if curl -s http://127.0.0.1:5001/ > /dev/null 2>&1; then
    echo "   ✓ IBeam health server is responding (even 404 is OK)"
else
    echo "   ✗ IBeam health server is NOT responding. Check IBeam:"
    echo "     cd /opt/ibeam && docker-compose ps"
    exit 1
fi

# 4. Create .env.production file for persistent env vars
echo ""
echo "4. Creating .env.production file..."
cd /opt/agentyc-trader
cat > .env.production << EOF
IBKR_BRIDGE_URL=http://127.0.0.1:8000
IBKR_BRIDGE_KEY=agentyc-bridge-9u1Px
# Add other env vars here (OPENAI_API_KEY, PINECONE_API_KEY, etc.)
EOF
echo "   ✓ Created .env.production"
echo "   ⚠️  IMPORTANT: Edit .env.production and add your API keys:"
echo "      nano .env.production"

# 5. Stop existing Next.js process
echo ""
echo "5. Stopping existing Next.js process..."
pkill -f "next start" || echo "   (No existing process found)"

# 6. Clean build
echo ""
echo "6. Cleaning previous build..."
rm -rf .next

# 7. Install dependencies (if needed)
echo ""
echo "7. Installing dependencies..."
npm install

# 8. Build Next.js app
echo ""
echo "8. Building Next.js app..."
npm run build

# 9. Start Next.js with environment variables
echo ""
echo "9. Starting Next.js app..."
# Load env vars from .env.production and start
export $(cat .env.production | grep -v '^#' | xargs)
nohup npm run start > /var/log/agentyc-next.log 2>&1 &
echo "   ✓ Next.js started (PID: $!)"
echo "   Logs: tail -f /var/log/agentyc-next.log"

# 10. Wait a moment for server to start
echo ""
echo "10. Waiting for server to start..."
sleep 3

# 11. Test the status endpoint
echo ""
echo "11. Testing /api/ibkr/status endpoint..."
STATUS_RESPONSE=$(curl -s http://127.0.0.1:3000/api/ibkr/status || echo "FAILED")
if echo "$STATUS_RESPONSE" | grep -q '"ok":true'; then
    echo "   ✓ Status endpoint is working"
    echo "   Response:"
    echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
else
    echo "   ✗ Status endpoint failed"
    echo "   Response: $STATUS_RESPONSE"
    echo "   Check logs: tail -f /var/log/agentyc-next.log"
fi

# 12. Test via public URL
echo ""
echo "12. Testing via public URL..."
PUBLIC_RESPONSE=$(curl -s https://ibkr.agentyctrader.com/api/ibkr/status || echo "FAILED")
if echo "$PUBLIC_RESPONSE" | grep -q '"ok":true'; then
    echo "   ✓ Public URL is working"
else
    echo "   ✗ Public URL failed"
    echo "   Response: $PUBLIC_RESPONSE"
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit .env.production and add your API keys"
echo "2. Restart Next.js: pkill -f 'next start' && cd /opt/agentyc-trader && export \$(cat .env.production | grep -v '^#' | xargs) && nohup npm run start > /var/log/agentyc-next.log 2>&1 &"
echo "3. Check logs: tail -f /var/log/agentyc-next.log"
echo "4. Test: curl https://ibkr.agentyctrader.com/api/ibkr/status"

