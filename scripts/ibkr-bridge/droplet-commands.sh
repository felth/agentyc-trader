#!/bin/bash
# 
# Run this ENTIRE script on the droplet via SSH
# Copy and paste the entire contents into your SSH session
#

set -e

echo "=== IBKR Bridge Deployment ==="
echo ""

# Step 1: Find or create bridge directory
echo "[1/8] Locating bridge directory..."
BRIDGE_DIR=""
for dir in /opt/ibkr-bridge /srv/ibkr-bridge /root/ibkr-bridge ~/ibkr-bridge; do
    if [ -d "$dir" ]; then
        BRIDGE_DIR="$dir"
        echo "   Found existing directory: $BRIDGE_DIR"
        break
    fi
done

if [ -z "$BRIDGE_DIR" ]; then
    BRIDGE_DIR="/opt/ibkr-bridge"
    echo "   Creating $BRIDGE_DIR..."
    sudo mkdir -p "$BRIDGE_DIR"
    sudo chown $USER:$USER "$BRIDGE_DIR" 2>/dev/null || true
fi
cd "$BRIDGE_DIR"
echo "   ✓ Using directory: $BRIDGE_DIR"

# Step 2: Install Python dependencies
echo ""
echo "[2/8] Checking Python dependencies..."
if ! python3 -c "import fastapi, httpx" 2>/dev/null; then
    echo "   Installing packages..."
    pip3 install --user fastapi uvicorn httpx pydantic 2>&1 | grep -v "already satisfied" || true
fi
echo "   ✓ Dependencies OK"

# Step 3: Fetch latest code from GitHub
echo ""
echo "[3/8] Fetching latest app.py from GitHub..."
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
git clone --depth 1 https://github.com/felth/agentyc-trader.git repo 2>&1 | grep -v "Cloning\|Receiving\|Resolving" || {
    echo "   ERROR: Git clone failed. Check internet connection."
    exit 1
}
cp repo/scripts/ibkr-bridge/app.py "$BRIDGE_DIR/app.py"
cd "$BRIDGE_DIR"
rm -rf "$TEMP_DIR"
echo "   ✓ Code updated"

# Step 4: Verify app.py has IBKR Gateway integration
echo ""
echo "[4/8] Verifying app.py configuration..."
if grep -q "IB_GATEWAY_URL" app.py && grep -q "ib_get" app.py; then
    echo "   ✓ IBKR Gateway integration found"
else
    echo "   ⚠ WARNING: IBKR Gateway integration may be missing"
fi

# Step 5: Stop existing bridge
echo ""
echo "[5/8] Stopping existing bridge service..."
pkill -f "uvicorn.*app:app" || true
sleep 2
echo "   ✓ Bridge stopped"

# Step 6: Start bridge service
echo ""
echo "[6/8] Starting bridge service..."
nohup python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 > bridge.log 2>&1 &
BRIDGE_PID=$!
sleep 3

if ps -p $BRIDGE_PID > /dev/null 2>&1; then
    echo "   ✓ Bridge started (PID: $BRIDGE_PID)"
else
    echo "   ERROR: Bridge failed to start"
    echo "   Last 20 lines of bridge.log:"
    tail -20 bridge.log
    exit 1
fi

# Step 7: Test bridge health
echo ""
echo "[7/8] Testing bridge health..."
sleep 2
HEALTH=$(curl -s -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health)
if echo "$HEALTH" | grep -q '"ok".*true'; then
    echo "   ✓ Bridge health check passed"
    echo "   Response: $HEALTH"
else
    echo "   ⚠ Health check warning: $HEALTH"
fi

# Step 8: Test IBKR Gateway connection
echo ""
echo "[8/8] Testing IBKR Gateway connection..."
GATEWAY_STATUS=$(curl -s -k https://localhost:5000/v1/api/iserver/auth/status 2>&1 || echo "CONNECTION_FAILED")
if echo "$GATEWAY_STATUS" | grep -q "authenticated\|connected"; then
    echo "   ✓ IBKR Gateway is reachable and authenticated"
    echo "   Status: $(echo $GATEWAY_STATUS | head -c 100)..."
elif echo "$GATEWAY_STATUS" | grep -q "CONNECTION_FAILED\|Connection refused"; then
    echo "   ⚠ WARNING: IBKR Gateway not reachable on port 5000"
    echo "   Make sure IBKR Client Portal Gateway is running"
else
    echo "   ⚠ Gateway response: $(echo $GATEWAY_STATUS | head -c 150)"
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Bridge Details:"
echo "  Directory: $BRIDGE_DIR"
echo "  PID: $BRIDGE_PID"
echo "  Logs: tail -f $BRIDGE_DIR/bridge.log"
echo ""
echo "Test Commands:"
echo "  curl -s -H 'X-Bridge-Key: agentyc-bridge-9u1Px' http://127.0.0.1:8000/health | jq"
echo "  curl -s -H 'X-Bridge-Key: agentyc-bridge-9u1Px' http://127.0.0.1:8000/account | jq"
echo "  curl -s -k https://localhost:5000/v1/api/iserver/auth/status | jq"
echo ""

