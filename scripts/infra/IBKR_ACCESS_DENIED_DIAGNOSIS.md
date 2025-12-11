# IBKR Gateway "Access Denied" Diagnosis & Fix

## Issue
Clicking "Reconnect IBKR" button on homepage opens `https://ibkr.agentyctrader.com` but shows "Access Denied" error.

## Root Cause Analysis

### Current Setup
1. **Homepage button** opens: `https://ibkr.agentyctrader.com`
2. **Nginx config** (`/etc/nginx/sites-available/ibkr.conf`) proxies:
   - `/ibeam/` → `http://127.0.0.1:5001/` (IBeam health server)
   - `/` → `https://127.0.0.1:5000` (IBKR Gateway)
3. **IBKR Gateway** runs inside IBeam Docker container on port 5000

### Possible Causes
1. **IBKR Gateway not running** - IBeam container might be down
2. **Nginx not routing correctly** - `/api/` might conflict if Next.js nginx config also handles `ibkr.agentyctrader.com`
3. **Gateway rejecting connections** - Self-signed cert issues or Gateway not accessible
4. **Nginx config not active** - Config file exists but not symlinked or nginx not reloaded

## Diagnostic Steps (Run on Droplet)

```bash
# 1. Check IBeam container status
cd /opt/ibeam
docker-compose ps
docker logs ibeam_ibeam_1 --tail=50

# 2. Test Gateway locally
curl -vk https://127.0.0.1:5000/ 2>&1 | head -30

# 3. Check nginx config
sudo nginx -t
sudo cat /etc/nginx/sites-available/ibkr.conf
sudo ls -la /etc/nginx/sites-enabled/ | grep ibkr

# 4. Test nginx proxy from droplet
curl -vk https://ibkr.agentyctrader.com/ 2>&1 | head -30

# 5. Check if nginx is listening on 443
sudo netstat -tlnp | grep :443

# 6. Check nginx error logs
sudo tail -n 50 /var/log/nginx/error.log

# 7. Check Gateway logs in IBeam
docker logs ibeam_ibeam_1 2>&1 | grep -i "error\|denied\|access" | tail -20
```

## Expected Behavior
- `https://ibkr.agentyctrader.com/` should show the IBKR Client Portal Gateway login page
- Should NOT show "Access Denied" or 404 errors

## Fixes

### Fix 1: Ensure IBeam Container is Running
```bash
cd /opt/ibeam
docker-compose up -d
docker-compose ps
```

### Fix 2: Verify Nginx Configuration
```bash
# Check if ibkr.conf is enabled
sudo ls -la /etc/nginx/sites-enabled/ | grep ibkr

# If not symlinked, enable it
sudo ln -sf /etc/nginx/sites-available/ibkr.conf /etc/nginx/sites-enabled/ibkr.conf

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Fix 3: Check for Nginx Config Conflicts
If you have another nginx config that handles `ibkr.agentyctrader.com` or conflicts with `/api/`, you may need to ensure the order is correct. The `/api/` location should be in a DIFFERENT server block (for the main app), not in the ibkr.conf.

### Fix 4: Update Gateway URL if Needed
If the Gateway serves content at a specific path (like `/demo` or `/sso/`), we might need to update the homepage button to open that specific path instead of root.

Check what paths the Gateway serves:
```bash
curl -k https://127.0.0.1:5000/ 2>&1 | grep -i "href\|location"
```

## Verification

After applying fixes, verify:
```bash
# 1. Local Gateway access
curl -k https://127.0.0.1:5000/ | head -20

# 2. Public proxy access  
curl -k https://ibkr.agentyctrader.com/ | head -20

# 3. Check in browser
# Open: https://ibkr.agentyctrader.com
# Should see IBKR Gateway login page, NOT "Access Denied"
```

## Additional Notes
- IBKR Gateway uses self-signed certificates - browsers will show security warnings but should allow access
- The Gateway login page is separate from API endpoints (`/v1/api/*`)
- IBeam automatically maintains Gateway authentication, but users can manually login via browser

