#!/bin/bash
# Quick verification script for IBKR Gateway reverse proxy
# Run this on the droplet after nginx setup

set -e

echo "=== Testing Nginx Configuration ==="
sudo nginx -t

echo ""
echo "=== Reloading Nginx ==="
sudo systemctl reload nginx

echo ""
echo "=== Testing Direct Gateway Connection (127.0.0.1:5000) ==="
curl -vk https://127.0.0.1:5000/v1/api/iserver/auth/status 2>&1 | head -20

echo ""
echo "=== Testing Reverse Proxy (ibkr.agentyctrader.com) ==="
curl -vk https://ibkr.agentyctrader.com/v1/api/iserver/auth/status 2>&1 | head -20

echo ""
echo "=== Checking Services Status ==="
echo "Nginx:"
sudo systemctl status nginx --no-pager | head -5
echo ""
echo "IBKR Gateway:"
sudo systemctl status ibkr-gateway.service --no-pager | head -5

echo ""
echo "=== Verification Complete ==="
echo "If both curl commands returned similar responses, the proxy is working correctly!"
echo "You can now test https://ibkr.agentyctrader.com in a browser."

