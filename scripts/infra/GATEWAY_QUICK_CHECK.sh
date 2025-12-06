#!/bin/bash
# Quick diagnostic script for IBKR Gateway access issues
# Run this on the droplet: bash /opt/agentyc-trader/scripts/infra/GATEWAY_QUICK_CHECK.sh

echo "=== IBKR Gateway Quick Diagnostic ==="
echo ""

echo "1. Checking DNS resolution..."
dig gateway.agentyc.app +short
echo ""

echo "2. Checking if nginx is installed..."
if command -v nginx &> /dev/null; then
    echo "✅ Nginx is installed: $(nginx -v 2>&1)"
else
    echo "❌ Nginx is NOT installed"
    echo "   Fix: sudo apt install -y nginx certbot python3-certbot-nginx"
fi
echo ""

echo "3. Checking nginx configuration..."
if [ -f /etc/nginx/sites-available/gateway.conf ]; then
    echo "✅ Gateway config exists"
else
    echo "❌ Gateway config missing"
    echo "   Fix: sudo cp /opt/agentyc-trader/scripts/infra/nginx/gateway.conf /etc/nginx/sites-available/gateway.conf"
fi

if [ -L /etc/nginx/sites-enabled/gateway.conf ]; then
    echo "✅ Gateway config is enabled"
else
    echo "❌ Gateway config is NOT enabled"
    echo "   Fix: sudo ln -s /etc/nginx/sites-available/gateway.conf /etc/nginx/sites-enabled/gateway.conf"
fi
echo ""

echo "4. Checking nginx status..."
systemctl is-active --quiet nginx && echo "✅ Nginx is running" || echo "❌ Nginx is NOT running (sudo systemctl start nginx)"
echo ""

echo "5. Checking SSL certificate..."
if [ -d /etc/letsencrypt/live/gateway.agentyc.app ]; then
    echo "✅ SSL certificate exists"
    ls -la /etc/letsencrypt/live/gateway.agentyc.app/
else
    echo "❌ SSL certificate missing"
    echo "   Fix: sudo certbot --nginx -d gateway.agentyc.app"
fi
echo ""

echo "6. Checking IBKR Gateway service..."
systemctl is-active --quiet ibkr-gateway.service && echo "✅ IBKR Gateway is running" || echo "❌ IBKR Gateway is NOT running (sudo systemctl start ibkr-gateway.service)"
echo ""

echo "7. Testing gateway locally..."
if curl -k -s https://127.0.0.1:5000 | head -1 | grep -q "html\|HTML"; then
    echo "✅ IBKR Gateway is responding on port 5000"
else
    echo "❌ IBKR Gateway is NOT responding on port 5000"
fi
echo ""

echo "8. Checking firewall..."
if command -v ufw &> /dev/null; then
    echo "UFW status:"
    sudo ufw status | grep -E "80|443" || echo "⚠️  Ports 80/443 may not be open"
else
    echo "⚠️  UFW not found (firewall may be managed differently)"
fi
echo ""

echo "=== Next Steps ==="
echo "If any checks failed, see: scripts/infra/TROUBLESHOOTING_GATEWAY.md"
echo ""
echo "Quick setup commands:"
echo "  sudo apt install -y nginx certbot python3-certbot-nginx"
echo "  sudo cp /opt/agentyc-trader/scripts/infra/nginx/gateway.conf /etc/nginx/sites-available/gateway.conf"
echo "  sudo ln -s /etc/nginx/sites-available/gateway.conf /etc/nginx/sites-enabled/gateway.conf"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
echo "  sudo certbot --nginx -d gateway.agentyc.app"

