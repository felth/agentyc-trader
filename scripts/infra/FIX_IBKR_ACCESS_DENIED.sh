#!/bin/bash
# Fix IBKR Gateway "Access Denied" Issue
# Run this script on the droplet as root

set -e

echo "========================================="
echo "IBKR Gateway Access Denied - Diagnostic & Fix"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check IBeam container
echo -e "${YELLOW}Step 1: Checking IBeam container status...${NC}"
cd /opt/ibeam
if docker-compose ps | grep -q "ibeam.*Up"; then
    echo -e "${GREEN}✓ IBeam container is running${NC}"
    docker-compose ps
else
    echo -e "${RED}✗ IBeam container is NOT running${NC}"
    echo "Starting IBeam container..."
    docker-compose up -d
    sleep 5
    docker-compose ps
fi
echo ""

# Step 2: Check Gateway accessibility locally
echo -e "${YELLOW}Step 2: Testing Gateway locally (127.0.0.1:5000)...${NC}"
GATEWAY_TEST=$(curl -sk https://127.0.0.1:5000/ 2>&1 | head -5 | grep -i "html\|html\|IBKR" || echo "FAILED")
if [[ "$GATEWAY_TEST" != "FAILED" ]]; then
    echo -e "${GREEN}✓ Gateway is accessible locally${NC}"
    echo "Response preview: $GATEWAY_TEST"
else
    echo -e "${RED}✗ Gateway is NOT accessible locally${NC}"
    echo "This indicates the Gateway inside IBeam is not running properly."
    echo "Check IBeam logs: docker logs ibeam_ibeam_1 --tail=50"
fi
echo ""

# Step 3: Check nginx configuration
echo -e "${YELLOW}Step 3: Checking nginx configuration...${NC}"
if [ -f "/etc/nginx/sites-available/ibkr.conf" ]; then
    echo -e "${GREEN}✓ ibkr.conf exists${NC}"
else
    echo -e "${RED}✗ ibkr.conf NOT found${NC}"
    echo "Creating from repo template..."
    # This assumes the file exists in the repo
    exit 1
fi

# Check if symlinked
if [ -L "/etc/nginx/sites-enabled/ibkr.conf" ]; then
    echo -e "${GREEN}✓ ibkr.conf is enabled (symlinked)${NC}"
else
    echo -e "${YELLOW}⚠ ibkr.conf is NOT enabled${NC}"
    echo "Enabling ibkr.conf..."
    sudo ln -sf /etc/nginx/sites-available/ibkr.conf /etc/nginx/sites-enabled/ibkr.conf
    echo -e "${GREEN}✓ Enabled${NC}"
fi

# Test nginx config
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration has errors${NC}"
    sudo nginx -t
    exit 1
fi
echo ""

# Step 4: Fix nginx Host header issue
echo -e "${YELLOW}Step 4: Checking nginx proxy Host header...${NC}"
if grep -q "proxy_set_header Host localhost" /etc/nginx/sites-available/ibkr.conf; then
    echo -e "${YELLOW}⚠ Using 'localhost' as Host header - this might cause issues${NC}"
    echo "Updating to use original Host header..."
    
    # Backup original
    sudo cp /etc/nginx/sites-available/ibkr.conf /etc/nginx/sites-available/ibkr.conf.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update Host header to use $host instead of localhost
    sudo sed -i 's/proxy_set_header Host localhost;/proxy_set_header Host $host;/' /etc/nginx/sites-available/ibkr.conf
    
    # Test again
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo -e "${GREEN}✓ Updated Host header to \$host${NC}"
        echo "Reloading nginx..."
        sudo systemctl reload nginx
    else
        echo -e "${RED}✗ Config update failed, restoring backup${NC}"
        sudo cp /etc/nginx/sites-available/ibkr.conf.backup.* /etc/nginx/sites-available/ibkr.conf
        sudo nginx -t
        exit 1
    fi
else
    echo -e "${GREEN}✓ Host header configuration looks correct${NC}"
fi
echo ""

# Step 5: Test public access
echo -e "${YELLOW}Step 5: Testing public access (ibkr.agentyctrader.com)...${NC}"
PUBLIC_TEST=$(curl -sk https://ibkr.agentyctrader.com/ 2>&1 | head -5 | grep -i "html\|IBKR\|access denied" || echo "FAILED")
if echo "$PUBLIC_TEST" | grep -qi "access denied\|403\|404"; then
    echo -e "${RED}✗ Still getting Access Denied or error${NC}"
    echo "Response: $PUBLIC_TEST"
    echo ""
    echo "Checking nginx error logs..."
    sudo tail -n 20 /var/log/nginx/error.log
elif [[ "$PUBLIC_TEST" != "FAILED" ]]; then
    echo -e "${GREEN}✓ Public access working - Gateway login page should load${NC}"
    echo "Response preview: $PUBLIC_TEST"
else
    echo -e "${YELLOW}⚠ Could not test public access (might be DNS/network issue)${NC}"
fi
echo ""

# Step 6: Check for port conflicts
echo -e "${YELLOW}Step 6: Checking for port conflicts...${NC}"
if sudo netstat -tlnp | grep -q ":443.*nginx"; then
    echo -e "${GREEN}✓ Nginx is listening on port 443${NC}"
else
    echo -e "${RED}✗ Nginx is NOT listening on port 443${NC}"
    echo "Check nginx status: sudo systemctl status nginx"
fi

if sudo netstat -tlnp | grep -q ":5000"; then
    echo -e "${GREEN}✓ Something is listening on port 5000 (likely Gateway)${NC}"
else
    echo -e "${RED}✗ Nothing listening on port 5000 - Gateway not accessible${NC}"
fi
echo ""

# Summary
echo "========================================="
echo "Diagnostic Summary"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. If Gateway is not accessible locally, check IBeam logs:"
echo "   docker logs ibeam_ibeam_1 --tail=50"
echo ""
echo "2. If nginx config was updated, test the public URL:"
echo "   curl -k https://ibkr.agentyctrader.com/ | head -20"
echo ""
echo "3. Open in browser:"
echo "   https://ibkr.agentyctrader.com"
echo "   You should see the IBKR Gateway login page"
echo ""
echo "4. If still having issues, check nginx access/error logs:"
echo "   sudo tail -f /var/log/nginx/error.log"
echo "   sudo tail -f /var/log/nginx/access.log"
echo ""

