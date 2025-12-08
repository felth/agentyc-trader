#!/bin/bash
# NGINX Configuration Fix - Run on droplet
# This updates nginx to route all traffic to Next.js on port 3001

set -e

echo "=== NGINX Configuration Fix ==="
echo ""

# Backup existing config
echo "1. Backing up existing nginx config..."
sudo cp /etc/nginx/sites-available/ibkr.conf /etc/nginx/sites-available/ibkr.conf.backup.$(date +%Y%m%d_%H%M%S)
echo "   ✓ Backup created"

# Write new config
echo ""
echo "2. Writing new nginx configuration..."
sudo tee /etc/nginx/sites-available/ibkr.conf > /dev/null << 'NGINXEOF'
server {
    listen 443 ssl http2;
    server_name ibkr.agentyctrader.com;

    ssl_certificate     /etc/letsencrypt/live/gateway.agentyctrader.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gateway.agentyctrader.com/privkey.pem;

    # All requests go to Next.js on port 3001
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # WebSocket support (if needed)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name ibkr.agentyctrader.com;
    return 301 https://$server_name$request_uri;
}
NGINXEOF

echo "   ✓ Configuration written"

# Check if http-upgrade-map is needed (for WebSocket support)
echo ""
echo "3. Checking for http-upgrade-map.conf..."
if [ ! -f /etc/nginx/conf.d/http-upgrade-map.conf ]; then
    echo "   Creating http-upgrade-map.conf for WebSocket support..."
    sudo tee /etc/nginx/conf.d/http-upgrade-map.conf > /dev/null << 'UPGRADEEOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
UPGRADEEOF
    echo "   ✓ Created"
else
    echo "   ✓ Already exists"
fi

# Test nginx configuration
echo ""
echo "4. Testing nginx configuration..."
if sudo nginx -t; then
    echo "   ✓ Configuration is valid"
else
    echo "   ✗ Configuration test failed!"
    echo "   Restoring backup..."
    sudo cp /etc/nginx/sites-available/ibkr.conf.backup.* /etc/nginx/sites-available/ibkr.conf
    exit 1
fi

# Reload nginx
echo ""
echo "5. Reloading nginx..."
if sudo systemctl reload nginx; then
    echo "   ✓ Nginx reloaded successfully"
else
    echo "   ✗ Failed to reload nginx!"
    exit 1
fi

echo ""
echo "=== Testing endpoints ==="
echo ""

# Test local endpoint
echo "6. Testing local endpoint..."
LOCAL_STATUS=$(curl -s http://127.0.0.1:3001/api/ibkr/status)
if echo "$LOCAL_STATUS" | grep -q '"ok":true'; then
    echo "   ✓ Local endpoint working"
else
    echo "   ✗ Local endpoint failed"
    echo "   Response: $LOCAL_STATUS"
fi

# Test public endpoint
echo ""
echo "7. Testing public endpoint..."
sleep 2
PUBLIC_STATUS=$(curl -s https://ibkr.agentyctrader.com/api/ibkr/status)
if echo "$PUBLIC_STATUS" | grep -q '"ok":true'; then
    echo "   ✓ Public endpoint working!"
    echo "$PUBLIC_STATUS" | python3 -m json.tool 2>/dev/null || echo "$PUBLIC_STATUS"
else
    echo "   ✗ Public endpoint failed"
    echo "   Response: $PUBLIC_STATUS"
    echo ""
    echo "   Troubleshooting:"
    echo "   - Check nginx logs: sudo tail -f /var/log/nginx/error.log"
    echo "   - Check Next.js is running: curl http://127.0.0.1:3001/api/ibkr/status"
    echo "   - Verify port: sudo netstat -tlnp | grep 3001"
fi

echo ""
echo "=== Done ==="

