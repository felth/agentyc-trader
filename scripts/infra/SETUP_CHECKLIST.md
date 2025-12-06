# IBKR Gateway Setup Checklist

## Current Status: ❌ NOT SET UP

To make `https://gateway.agentyctrader.com` work, you need to complete these steps:

## Step 1: Configure DNS (5 minutes)

**On your Mac:**
- Go to your DNS provider (where `agentyc.app` domain is managed)
- Add an A record:
  - **Name/Host:** `gateway`
  - **Type:** `A`
  - **Value/IP:** `104.248.42.213`
  - **TTL:** `300` (or default)

**Wait 5-10 minutes** for DNS to propagate, then test:
```bash
dig gateway.agentyctrader.com +short
# Should return: 104.248.42.213
```

## Step 2: Set Up Infrastructure on Droplet (10 minutes)

SSH into your droplet:
```bash
ssh root@104.248.42.213
```

Then run these commands:

```bash
# 1. Install nginx and certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Copy nginx configuration
# (If you have the repo on the droplet)
sudo cp /opt/agentyc-trader/scripts/infra/nginx/gateway.conf /etc/nginx/sites-available/gateway.conf
sudo ln -s /etc/nginx/sites-available/gateway.conf /etc/nginx/sites-enabled/gateway.conf

# OR manually create the config file (see nginx/gateway.conf in repo)

# 3. Test nginx configuration
sudo nginx -t

# 4. If test passes, reload nginx
sudo systemctl reload nginx

# 5. Get SSL certificate (will ask for email and verify domain)
sudo certbot --nginx -d gateway.agentyctrader.com

# 6. Verify IBKR Gateway is running
curl -k https://127.0.0.1:5000 | head -20
```

## Step 3: Test from Your Mac

After setup, test:
```bash
# Test DNS
dig gateway.agentyctrader.com +short
# Should return: 104.248.42.213

# Test HTTPS
curl -I https://gateway.agentyctrader.com
# Should return: HTTP/2 200 or 302
```

Then open in Safari: `https://gateway.agentyctrader.com`

You should see the IBKR Client Portal Gateway login page.

## Step 4: Test "Reconnect IBKR" Button

1. Open Agentyc Trader app
2. Click "Reconnect IBKR" button
3. Should open `https://gateway.agentyctrader.com` in Safari
4. Login with IBKR credentials
5. Complete 2FA

## ✅ Done!

Once all steps are complete, the gateway will be accessible and the reconnect button will work.

## Need Help?

- See: `scripts/infra/GATEWAY_SETUP_REQUIRED.md`
- Troubleshooting: `scripts/infra/TROUBLESHOOTING_GATEWAY.md`
- Quick check: Run `bash /opt/agentyc-trader/scripts/infra/GATEWAY_QUICK_CHECK.sh` on droplet

