#!/bin/bash
#
# Deployment script for IBKR Bridge on droplet
# Run this script ON THE DROPLET (Ubuntu)
#

set -e

echo "=========================================="
echo "IBKR Bridge Deployment Script"
echo "=========================================="
echo ""

# Configuration
BRIDGE_DIR="/opt/ibkr-bridge"
REPO_URL="https://github.com/felth/agentyc-trader.git"
BRIDGE_PORT=8000

# Step 1: Check if directory exists, create if needed
echo "[1/8] Checking bridge directory..."
if [ ! -d "$BRIDGE_DIR" ]; then
    echo "   Creating $BRIDGE_DIR..."
    sudo mkdir -p "$BRIDGE_DIR"
    sudo chown $USER:$USER "$BRIDGE_DIR" 2>/dev/null || true
fi
echo "   ✓ Directory exists: $BRIDGE_DIR"

# Step 2: Check if Python and dependencies are installed
echo ""
echo "[2/8] Checking Python dependencies..."
if ! command -v python3 &> /dev/null; then
    echo "   ERROR: python3 not found. Install with: sudo apt-get update && sudo apt-get install -y python3 python3-pip"
    exit 1
fi

if ! command -v pip3 &> /dev/null; then
    echo "   ERROR: pip3 not found. Install with: sudo apt-get install -y python3-pip"
    exit 1
fi

# Check for required Python packages
python3 -c "import fastapi, httpx" 2>/dev/null || {
    echo "   Installing required Python packages..."
    pip3 install --user fastapi uvicorn httpx pydantic || {
        echo "   ERROR: Failed to install Python packages"
        exit 1
    }
}
echo "   ✓ Python dependencies OK"

# Step 3: Clone or update the repository
echo ""
echo "[3/8] Fetching latest code from GitHub..."
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
git clone "$REPO_URL" repo 2>/dev/null || {
    echo "   Cloning repository..."
}
cd repo
git pull origin main 2>/dev/null || true
echo "   ✓ Code fetched"

# Step 4: Copy app.py to bridge directory
echo ""
echo "[4/8] Copying app.py to bridge directory..."
if [ -f "scripts/ibkr-bridge/app.py" ]; then
    cp scripts/ibkr-bridge/app.py "$BRIDGE_DIR/app.py"
    echo "   ✓ app.py copied to $BRIDGE_DIR/"
else
    echo "   ERROR: scripts/ibkr-bridge/app.py not found in repository"
    exit 1
fi

# Step 5: Stop existing bridge process
echo ""
echo "[5/8] Stopping existing bridge service..."
pkill -f "uvicorn.*app:app.*port.*$BRIDGE_PORT" || {
    echo "   No existing bridge process found (this is OK)"
}
sleep 2
echo "   ✓ Bridge service stopped"

# Step 6: Start the bridge service
echo ""
echo "[6/8] Starting bridge service..."
cd "$BRIDGE_DIR"
nohup python3 -m uvicorn app:app --host 0.0.0.0 --port $BRIDGE_PORT > bridge.log 2>&1 &
BRIDGE_PID=$!
sleep 3

# Check if process is running
if ps -p $BRIDGE_PID > /dev/null 2>&1; then
    echo "   ✓ Bridge started (PID: $BRIDGE_PID)"
else
    echo "   ERROR: Bridge failed to start. Check $BRIDGE_DIR/bridge.log"
    tail -20 "$BRIDGE_DIR/bridge.log" 2>/dev/null || true
    exit 1
fi

# Step 7: Test bridge health endpoint
echo ""
echo "[7/8] Testing bridge health endpoint..."
sleep 2
HEALTH_RESPONSE=$(curl -s -H "X-Bridge-Key: agentyc-bridge-9u1Px" "http://127.0.0.1:$BRIDGE_PORT/health" || echo "FAILED")
if echo "$HEALTH_RESPONSE" | grep -q "ok.*true"; then
    echo "   ✓ Bridge health check passed"
else
    echo "   ⚠ Bridge health check failed. Response: $HEALTH_RESPONSE"
    echo "   Check logs: tail -f $BRIDGE_DIR/bridge.log"
fi

# Step 8: Test IBKR Gateway connection
echo ""
echo "[8/8] Testing IBKR Gateway connection..."
GATEWAY_STATUS=$(curl -s -k "http://127.0.0.1:5000/v1/api/iserver/auth/status" || echo "FAILED")
if echo "$GATEWAY_STATUS" | grep -q "authenticated\|connected"; then
    echo "   ✓ IBKR Gateway is reachable"
    echo "   Response: $GATEWAY_STATUS"
else
    echo "   ⚠ IBKR Gateway connection test failed"
    echo "   Response: $GATEWAY_STATUS"
    echo "   Make sure IBKR Client Portal Gateway is running on port 5000"
fi

# Cleanup
cd - > /dev/null
rm -rf "$TEMP_DIR"

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Bridge service:"
echo "  - Directory: $BRIDGE_DIR"
echo "  - Port: $BRIDGE_PORT"
echo "  - Logs: $BRIDGE_DIR/bridge.log"
echo "  - PID: $BRIDGE_PID"
echo ""
echo "Test commands:"
echo "  curl -s -H 'X-Bridge-Key: agentyc-bridge-9u1Px' http://127.0.0.1:$BRIDGE_PORT/health"
echo "  curl -s -H 'X-Bridge-Key: agentyc-bridge-9u1Px' http://127.0.0.1:$BRIDGE_PORT/account"
echo "  curl -s http://127.0.0.1:5000/v1/api/iserver/auth/status"
echo ""

