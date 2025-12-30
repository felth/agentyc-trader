#!/bin/bash
# Deploy Next.js systemd service with proper environment variable loading
# Run this on the droplet after copying the service file

set -e

SERVICE_NAME="agentyc-trader"
SERVICE_FILE="/opt/agentyc-trader/scripts/infra/systemd/${SERVICE_NAME}.service"
SYSTEMD_PATH="/etc/systemd/system/${SERVICE_NAME}.service"

echo "=== Deploying Next.js systemd service ==="
echo ""

# Check service file exists
if [ ! -f "$SERVICE_FILE" ]; then
    echo "✗ Error: Service file not found: $SERVICE_FILE"
    exit 1
fi

# Check .env.production exists
if [ ! -f "/opt/agentyc-trader/.env.production" ]; then
    echo "✗ Error: .env.production not found at /opt/agentyc-trader/.env.production"
    exit 1
fi

# Stop existing service if running
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "Stopping existing service..."
    sudo systemctl stop "$SERVICE_NAME"
fi

# Copy service file
echo "Copying service file..."
sudo cp "$SERVICE_FILE" "$SYSTEMD_PATH"

# Reload systemd
echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

# Enable service on boot
echo "Enabling service..."
sudo systemctl enable "$SERVICE_NAME"

# Start service
echo "Starting service..."
sudo systemctl start "$SERVICE_NAME"

# Wait a moment for startup
sleep 2

# Check status
echo ""
echo "=== Service Status ==="
sudo systemctl status "$SERVICE_NAME" --no-pager -l

echo ""
echo "=== Next Steps ==="
echo "1. Verify env vars are loaded:"
echo "   sudo /opt/agentyc-trader/scripts/infra/systemd/verify-nextjs-env.sh"
echo ""
echo "2. Check logs:"
echo "   sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "3. View service details:"
echo "   sudo systemctl show $SERVICE_NAME --property=Environment"

