# IBKR Gateway Troubleshooting Summary

## Problem Statement

**What was working:** This morning, the IBKR Gateway reconnect feature was working. Users could click "Reconnect IBKR" in the Agentyc Trader app, and Safari would successfully open `https://gateway.agentyctrader.com` to show the IBKR Client Portal Gateway login page.

**Current issue:** Safari now shows "Safari can't open the page because it can't find the server" when clicking "Reconnect IBKR". The URL `https://gateway.agentyctrader.com` is no longer accessible.

## Architecture Overview

```
Phone Browser (Safari)
    ↓ HTTPS
gateway.agentyctrader.com (Nginx reverse proxy on droplet)
    ↓ Proxy HTTPS (with self-signed cert)
localhost:5000 (IBKR Client Portal Gateway)
    ↓ API calls
localhost:8000 (IBKR Bridge - FastAPI)
    ↓ HTTP
Vercel (Agentyc Trader Next.js app)
```

## Infrastructure Components

### Droplet Details
- **IP Address:** 104.248.42.213
- **OS:** Ubuntu 24.04
- **Domain:** gateway.agentyctrader.com (subdomain of agentyc.app)

### Services Running on Droplet

1. **IBKR Client Portal Gateway**
   - Location: `/opt/ibkr-gateway/clientportal`
   - Port: 5000 (HTTPS with self-signed certificate)
   - Service: `ibkr-gateway.service` (systemd)
   - Status: Should be running and accessible at `https://127.0.0.1:5000`

2. **IBKR Bridge (FastAPI)**
   - Location: `/opt/ibkr-bridge`
   - Port: 8000 (HTTP)
   - Service: `ibkr-bridge.service` (systemd)
   - API Key: `agentyc-bridge-9u1Px`
   - Endpoints: `/health`, `/account`, `/positions`, `/orders`, `/gateway/auth-status`

3. **Nginx Reverse Proxy**
   - Purpose: Expose IBKR Gateway via public HTTPS URL
   - Config: `/etc/nginx/sites-available/gateway.conf`
   - SSL: Let's Encrypt certificate via certbot
   - Proxies: `https://gateway.agentyctrader.com` → `https://127.0.0.1:5000`

### Configuration Files

- Nginx config: `scripts/infra/nginx/gateway.conf`
- Systemd service files: `scripts/infra/systemd/ibkr-gateway.service`, `scripts/infra/systemd/ibkr-bridge.service`
- Full setup docs: `scripts/infra/PHONE_IBKR_LOGIN.md`

## Current Problem: Gateway URL Not Accessible

The symptom is that `https://gateway.agentyctrader.com` cannot be reached from Safari.

## Diagnostic Checklist

### 1. DNS Resolution
**Command on Mac:**
```bash
dig gateway.agentyctrader.com +short
nslookup gateway.agentyctrader.com
```

**Expected:** Should return `104.248.42.213`

**If not:** DNS record may have been deleted or changed. Need to verify DNS provider settings.

### 2. Nginx Status (on droplet)
**Commands:**
```bash
sudo systemctl status nginx
sudo nginx -t
sudo netstat -tlnp | grep :443
```

**Expected:**
- Nginx service: `active (running)`
- Config test: `syntax is ok`
- Port 443: nginx should be listening

**If issues:**
- Check logs: `sudo tail -f /var/log/nginx/error.log`
- Restart: `sudo systemctl restart nginx`

### 3. SSL Certificate (on droplet)
**Commands:**
```bash
sudo certbot certificates
ls -la /etc/letsencrypt/live/gateway.agentyctrader.com/
```

**Expected:** Certificate should exist and be valid (not expired)

**If expired or missing:**
- Renew: `sudo certbot renew`
- Or re-issue: `sudo certbot --nginx -d gateway.agentyctrader.com`

### 4. IBKR Gateway Service (on droplet)
**Commands:**
```bash
sudo systemctl status ibkr-gateway.service
curl -k https://127.0.0.1:5000 | head -20
```

**Expected:**
- Service: `active (running)`
- curl: Should return HTML (IBKR Gateway login page)

**If not running:**
- Start: `sudo systemctl start ibkr-gateway.service`
- Check logs: `sudo journalctl -u ibkr-gateway.service -n 50`

### 5. Nginx Configuration (on droplet)
**Commands:**
```bash
ls -la /etc/nginx/sites-available/gateway.conf
ls -la /etc/nginx/sites-enabled/gateway.conf
cat /etc/nginx/sites-available/gateway.conf
```

**Expected:**
- Config file should exist
- Symlink should exist in sites-enabled
- Config should proxy to `https://127.0.0.1:5000`

### 6. Firewall (on droplet)
**Commands:**
```bash
sudo ufw status
sudo iptables -L -n | grep -E "80|443"
```

**Expected:** Ports 80 and 443 should be open

**If blocked:**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### 7. Test from Droplet
**Commands:**
```bash
# Test gateway directly (bypassing nginx)
curl -k https://127.0.0.1:5000 | head -20

# Test nginx proxy locally
curl -H "Host: gateway.agentyctrader.com" http://127.0.0.1 | head -20

# Test HTTPS from droplet
curl -I https://gateway.agentyctrader.com
```

**Expected:** All should return valid responses

## Most Likely Causes

Based on "was working this morning, now it's not":

1. **Service crashed/stopped**
   - Nginx stopped: `sudo systemctl restart nginx`
   - IBKR Gateway stopped: `sudo systemctl restart ibkr-gateway.service`

2. **SSL certificate expired**
   - Check: `sudo certbot certificates`
   - Renew: `sudo certbot renew`

3. **Droplet rebooted and services didn't start**
   - Check: `sudo systemctl is-enabled ibkr-gateway.service`
   - Enable: `sudo systemctl enable ibkr-gateway.service ibkr-bridge.service nginx`

4. **DNS record changed/deleted**
   - Verify DNS provider settings
   - Re-add A record if needed: `gateway.agentyctrader.com` → `104.248.42.213`

5. **Nginx config file deleted/corrupted**
   - Check: `ls -la /etc/nginx/sites-available/gateway.conf`
   - Restore from repo if needed

6. **Firewall rules changed**
   - Check: `sudo ufw status`
   - Re-open ports if needed

## Quick Recovery Steps

If you need to quickly get it working again:

```bash
# On droplet, run these commands:

# 1. Check what's broken
sudo systemctl status nginx
sudo systemctl status ibkr-gateway.service
sudo nginx -t

# 2. Restart services
sudo systemctl restart nginx
sudo systemctl restart ibkr-gateway.service

# 3. Check SSL certificate
sudo certbot certificates

# 4. Test locally
curl -k https://127.0.0.1:5000 | head -20

# 5. Test nginx proxy
curl -I https://gateway.agentyctrader.com
```

## Diagnostic Script

A quick diagnostic script exists at:
```
/opt/agentyc-trader/scripts/infra/GATEWAY_QUICK_CHECK.sh
```

Run on droplet:
```bash
bash /opt/agentyc-trader/scripts/infra/GATEWAY_QUICK_CHECK.sh
```

## Files to Check on Droplet

- Nginx config: `/etc/nginx/sites-available/gateway.conf`
- Nginx enabled: `/etc/nginx/sites-enabled/gateway.conf`
- Nginx logs: `/var/log/nginx/error.log`
- SSL certs: `/etc/letsencrypt/live/gateway.agentyctrader.com/`
- Gateway service logs: `sudo journalctl -u ibkr-gateway.service -n 100`
- Bridge service logs: `sudo journalctl -u ibkr-bridge.service -n 100`

## Expected Behavior When Working

1. User clicks "Reconnect IBKR" in Agentyc Trader app
2. Safari opens `https://gateway.agentyctrader.com`
3. IBKR Client Portal Gateway login page loads
4. User enters credentials
5. User completes 2FA via IBKR mobile app
6. User returns to Agentyc Trader app
7. "IBKR not connected" banner disappears
8. Live data starts flowing from IBKR Bridge

## Next Steps for Diagnosis

1. SSH into droplet: `ssh root@104.248.42.213`
2. Run diagnostic script: `bash /opt/agentyc-trader/scripts/infra/GATEWAY_QUICK_CHECK.sh`
3. Check service statuses
4. Check logs for errors
5. Verify DNS from Mac: `dig gateway.agentyctrader.com +short`
6. Test HTTPS from Mac: `curl -I https://gateway.agentyctrader.com`

## Additional Context

- The IBKR Gateway requires periodic re-authentication (every 24-48 hours)
- The gateway login session is independent of the service status
- If the gateway service is running but not authenticated, the login page should still load
- The nginx proxy handles the self-signed certificate from IBKR Gateway
- All external access is encrypted via Let's Encrypt SSL certificates

