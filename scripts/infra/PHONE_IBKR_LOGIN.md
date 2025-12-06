# Phone-based IBKR Login Setup Guide

This guide covers the complete setup for enabling phone-only IBKR login refresh via `https://gateway.agentyctrader.com`.

## Prerequisites

- Domain `agentyc.app` exists and is managed by you
- Subdomain `gateway.agentyctrader.com` DNS A record points to `104.248.42.213`
- Droplet running Ubuntu 24.04
- IBKR Gateway installed at `/opt/ibkr-gateway/clientportal`
- IBKR Bridge code at `/opt/ibkr-bridge`

## Part 1: One-time Setup on Droplet

### 1.1 Install Nginx and Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 1.2 Configure DNS

Ensure `gateway.agentyctrader.com` DNS A record points to `104.248.42.213`. Verify with:

```bash
dig gateway.agentyctrader.com +short
# Should return: 104.248.42.213
```

### 1.3 Configure Nginx

```bash
# Copy nginx configuration
sudo cp /opt/agentyc-trader/scripts/infra/nginx/gateway.conf /etc/nginx/sites-available/gateway.conf
sudo ln -s /etc/nginx/sites-available/gateway.conf /etc/nginx/sites-enabled/gateway.conf

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### 1.4 Obtain SSL Certificate

```bash
sudo certbot --nginx -d gateway.agentyctrader.com
```

Certbot will automatically configure nginx with the SSL certificates.

### 1.5 Install Systemd Services

```bash
# Copy systemd service files
sudo cp /opt/agentyc-trader/scripts/infra/systemd/ibkr-gateway.service /etc/systemd/system/
sudo cp /opt/agentyc-trader/scripts/infra/systemd/ibkr-bridge.service /etc/systemd/system/

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable services to start on boot
sudo systemctl enable ibkr-gateway.service ibkr-bridge.service

# Start services
sudo systemctl start ibkr-gateway.service ibkr-bridge.service
```

### 1.6 Verify Services are Running

```bash
# Check status
sudo systemctl status ibkr-gateway.service
sudo systemctl status ibkr-bridge.service

# View logs if needed
sudo journalctl -u ibkr-gateway.service -f
sudo journalctl -u ibkr-bridge.service -f
```

### 1.7 Verify Gateway is Accessible

Visit `https://gateway.agentyctrader.com` in your browser. You should see the IBKR Client Portal Gateway login page.

## Part 2: Daily Usage (from Phone)

### Step-by-Step Process

1. **Open Agentyc Trader** (web app) on your phone

2. **Check Connection Status**
   - If "IBKR not connected" banner appears at the top, proceed to reconnect
   - If no banner, IBKR is already connected and live data is flowing

3. **Reconnect IBKR** (when banner is visible)
   - Tap the "Reconnect IBKR" button in the banner
   - This opens `https://gateway.agentyctrader.com` in your browser

4. **Login to IBKR**
   - Enter your IBKR credentials on the login page
   - Complete 2FA authentication via the IBKR mobile app

5. **Return to Agentyc Trader**
   - After successful login, return to the Agentyc Trader app
   - The banner will automatically disappear once the gateway is authenticated
   - Live brokerage data will now flow through the system

## Troubleshooting

### Gateway Not Accessible (Safari Can't Find Gateway)

If Safari shows "Safari can't open the page because it can't find the server" when clicking "Reconnect IBKR":

**Quick Diagnostic - Run on Droplet:**
```bash
bash /opt/agentyc-trader/scripts/infra/GATEWAY_QUICK_CHECK.sh
```

**Common Issues:**

1. **DNS Not Configured**
   - Check: `dig gateway.agentyctrader.com +short` (should return `104.248.42.213`)
   - Fix: Add DNS A record in your DNS provider (where `agentyc.app` is managed)
   - Wait 5-10 minutes for DNS propagation

2. **Nginx Not Installed/Configured**
   - Check: `which nginx` and `ls /etc/nginx/sites-enabled/gateway.conf`
   - Fix: Follow steps in `scripts/infra/nginx/README.md`
   - Quick fix:
     ```bash
     sudo apt install -y nginx certbot python3-certbot-nginx
     sudo cp /opt/agentyc-trader/scripts/infra/nginx/gateway.conf /etc/nginx/sites-available/gateway.conf
     sudo ln -s /etc/nginx/sites-available/gateway.conf /etc/nginx/sites-enabled/gateway.conf
     sudo nginx -t
     sudo systemctl reload nginx
     ```

3. **SSL Certificate Missing**
   - Check: `sudo certbot certificates`
   - Fix: `sudo certbot --nginx -d gateway.agentyctrader.com`
   - Note: Requires DNS to be pointing correctly first

4. **Nginx Not Running**
   - Check: `sudo systemctl status nginx`
   - Fix: `sudo systemctl start nginx`

5. **IBKR Gateway Not Running**
   - Check: `sudo systemctl status ibkr-gateway.service`
   - Check: `curl -k https://127.0.0.1:5000` (should return HTML)
   - Fix: `sudo systemctl start ibkr-gateway.service`

6. **Firewall Blocking**
   - Check: `sudo ufw status`
   - Fix: `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`

**See full troubleshooting guide:** `scripts/infra/TROUBLESHOOTING_GATEWAY.md`

### Services Not Running

```bash
# Check service status
sudo systemctl status ibkr-gateway.service
sudo systemctl status ibkr-bridge.service

# Restart services
sudo systemctl restart ibkr-gateway.service
sudo systemctl restart ibkr-bridge.service

# Check logs for errors
sudo journalctl -u ibkr-gateway.service -n 50
sudo journalctl -u ibkr-bridge.service -n 50
```

### IBKR Gateway Not Authenticated

- Gateway requires periodic re-authentication (typically every 24-48 hours)
- If authentication expires, use the "Reconnect IBKR" button in the app
- The gateway login session is independent of the systemd service status

### Bridge Connection Issues

- Verify bridge is running: `curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health`
- Check bridge logs: `tail -f /opt/ibkr-bridge/bridge.log`
- Ensure firewall allows connections from Vercel IPs to port 8000

## Maintenance

### Updating IBKR Bridge

When updating the bridge code:

```bash
cd /opt/ibkr-bridge
# Pull latest code or copy updated app.py
sudo systemctl restart ibkr-bridge.service
```

### Renewing SSL Certificate

Certbot automatically renews certificates, but you can test renewal:

```bash
sudo certbot renew --dry-run
```

### Viewing Service Logs

```bash
# Real-time logs
sudo journalctl -u ibkr-gateway.service -f
sudo journalctl -u ibkr-bridge.service -f

# Last 100 lines
sudo journalctl -u ibkr-gateway.service -n 100
sudo journalctl -u ibkr-bridge.service -n 100
```

## Security Notes

- The gateway uses a self-signed certificate (standard for IBKR Client Portal Gateway)
- Nginx is configured with `proxy_ssl_verify off` to handle the self-signed cert
- All traffic is encrypted via HTTPS through Let's Encrypt certificates
- The bridge uses API key authentication (`X-Bridge-Key` header)

## Architecture Overview

```
Phone Browser
    ↓ HTTPS
gateway.agentyctrader.com (Nginx)
    ↓ Proxy HTTPS
localhost:5000 (IBKR Gateway)
    ↓ API
localhost:8000 (IBKR Bridge)
    ↓ HTTP
Vercel (Agentyc Trader App)
```

The IBKR Gateway maintains the authenticated session with IBKR's servers, while the IBKR Bridge provides a secure API interface for the Agentyc Trader app to access account data, positions, and orders.

