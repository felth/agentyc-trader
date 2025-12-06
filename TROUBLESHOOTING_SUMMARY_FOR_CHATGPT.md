# IBKR Gateway Troubleshooting - Summary for ChatGPT

## Problem

**Background:** The IBKR Gateway reconnect feature was working this morning. Users could click "Reconnect IBKR" in the Agentyc Trader app, and Safari would successfully open `https://gateway.agentyctrader.com` to show the IBKR Client Portal Gateway login page.

**Current Issue:** Safari now shows "Safari can't open the page because it can't find the server" when clicking "Reconnect IBKR". The URL `https://gateway.agentyctrader.com` is no longer accessible.

**Since it was working this morning, this is likely a service crash, configuration change, or infrastructure issue on the droplet.**

## Architecture

The system has these components:

1. **Droplet** (Ubuntu 24.04) at `104.248.42.213`
   - **Nginx** reverse proxy: Exposes `https://gateway.agentyctrader.com` publicly
   - **IBKR Client Portal Gateway**: Runs on `https://127.0.0.1:5000` (self-signed cert)
   - **IBKR Bridge** (FastAPI): Runs on `http://127.0.0.1:8000`

2. **DNS**: `gateway.agentyctrader.com` → `104.248.42.213`

3. **Flow**: 
   - Browser → `https://gateway.agentyctrader.com` (nginx) → `https://127.0.0.1:5000` (IBKR Gateway)

## What to Check (Priority Order)

### 1. DNS Resolution (Check from Mac first)
```bash
dig gateway.agentyctrader.com +short
nslookup gateway.agentyctrader.com
```
**Should return:** `104.248.42.213`
**If not:** DNS record may have been deleted/changed - check DNS provider

### 2. Nginx Service Status (SSH to droplet)
```bash
sudo systemctl status nginx
sudo nginx -t
sudo tail -20 /var/log/nginx/error.log
```
**If nginx is down:** `sudo systemctl restart nginx`

### 3. IBKR Gateway Service (SSH to droplet)
```bash
sudo systemctl status ibkr-gateway.service
curl -k https://127.0.0.1:5000 | head -20
```
**If gateway is down:** `sudo systemctl restart ibkr-gateway.service`

### 4. SSL Certificate (SSH to droplet)
```bash
sudo certbot certificates
ls -la /etc/letsencrypt/live/gateway.agentyctrader.com/
```
**If expired:** `sudo certbot renew`

### 5. Nginx Configuration (SSH to droplet)
```bash
ls -la /etc/nginx/sites-available/gateway.conf
ls -la /etc/nginx/sites-enabled/gateway.conf
cat /etc/nginx/sites-available/gateway.conf
```
**If missing:** Copy from repo: `sudo cp /opt/agentyc-trader/scripts/infra/nginx/gateway.conf /etc/nginx/sites-available/gateway.conf`

### 6. Firewall (SSH to droplet)
```bash
sudo ufw status
```
**If ports blocked:** `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`

### 7. Test from Droplet
```bash
curl -k https://127.0.0.1:5000 | head -20  # Direct gateway test
curl -I https://gateway.agentyctrader.com          # Through nginx
```

## Most Likely Causes (Since It Was Working)

1. **Service crashed/stopped** - Most common
   - Nginx stopped: `sudo systemctl restart nginx`
   - IBKR Gateway stopped: `sudo systemctl restart ibkr-gateway.service`

2. **Droplet rebooted and services didn't auto-start**
   - Check: `sudo systemctl is-enabled ibkr-gateway.service nginx`
   - Enable: `sudo systemctl enable ibkr-gateway.service nginx`

3. **SSL certificate expired**
   - Check: `sudo certbot certificates`
   - Renew: `sudo certbot renew`

4. **DNS record changed/deleted**
   - Verify in DNS provider dashboard

5. **Nginx config file deleted**
   - Restore from repo if needed

## Quick Diagnostic Script

On the droplet, run:
```bash
bash /opt/agentyc-trader/scripts/infra/GATEWAY_QUICK_CHECK.sh
```
This checks all components and reports what's broken.

## Quick Recovery Commands

If you need it working ASAP, SSH to droplet and run:
```bash
# Restart services
sudo systemctl restart nginx
sudo systemctl restart ibkr-gateway.service

# Check if they're enabled to auto-start on reboot
sudo systemctl enable nginx ibkr-gateway.service

# Verify they're running
sudo systemctl status nginx
sudo systemctl status ibkr-gateway.service

# Test
curl -I https://gateway.agentyctrader.com
```

## Key Files on Droplet

- Nginx config: `/etc/nginx/sites-available/gateway.conf`
- Gateway service: `/etc/systemd/system/ibkr-gateway.service`
- Gateway logs: `sudo journalctl -u ibkr-gateway.service -n 100`
- Nginx logs: `/var/log/nginx/error.log`
- SSL certs: `/etc/letsencrypt/live/gateway.agentyctrader.com/`

## Expected Behavior When Working

1. User clicks "Reconnect IBKR" button
2. Safari opens `https://gateway.agentyctrader.com`
3. IBKR login page loads successfully
4. User can login and complete 2FA

## Current Symptom

When clicking "Reconnect IBKR":
- Safari shows: "Safari can't open the page because it can't find the server"
- This means `https://gateway.agentyctrader.com` is not resolving or not responding

## Next Steps

1. SSH into droplet: `ssh root@104.248.42.213`
2. Run diagnostic: `bash /opt/agentyc-trader/scripts/infra/GATEWAY_QUICK_CHECK.sh`
3. Check service statuses
4. Restart services if needed
5. Verify from Mac: `dig gateway.agentyctrader.com +short` and `curl -I https://gateway.agentyctrader.com`

