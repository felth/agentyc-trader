# IBKR Gateway Setup Required

## Problem

When clicking "Reconnect IBKR" in Safari, you see: **"Safari can't open the page because it can't find the server"**

This means `https://gateway.agentyctrader.com` is not accessible yet because nginx and SSL haven't been configured on the droplet.

## Solution: One-Time Setup on Droplet

You need to SSH into your droplet (`104.248.42.213`) and run these setup steps **once**:

### Step 1: Verify DNS is Configured

On your **Mac**, check if DNS is pointing correctly:

```bash
dig gateway.agentyctrader.com +short
```

**Expected:** Should return `104.248.42.213`

**If not:**
- Go to your DNS provider (where `agentyc.app` domain is managed)
- Add an A record: `gateway.agentyctrader.com` → `104.248.42.213`
- Wait 5-10 minutes for DNS to propagate

### Step 2: SSH into Droplet and Run Setup

SSH into your droplet:

```bash
ssh root@104.248.42.213
```

Then run the quick diagnostic script (if the repo is already on the droplet):

```bash
bash /opt/agentyc-trader/scripts/infra/GATEWAY_QUICK_CHECK.sh
```

Or manually run these commands:

```bash
# 1. Install nginx and certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Copy nginx configuration
# (If repo is at /opt/agentyc-trader)
sudo cp /opt/agentyc-trader/scripts/infra/nginx/gateway.conf /etc/nginx/sites-available/gateway.conf
sudo ln -s /etc/nginx/sites-available/gateway.conf /etc/nginx/sites-enabled/gateway.conf

# 3. Test nginx configuration
sudo nginx -t

# 4. If test passes, reload nginx
sudo systemctl reload nginx

# 5. Get SSL certificate (this will ask for your email and verify domain)
sudo certbot --nginx -d gateway.agentyctrader.com
# Follow the prompts - certbot will automatically configure nginx

# 6. Verify gateway is running locally
curl -k https://127.0.0.1:5000 | head -20
```

### Step 3: Test from Your Mac

After setup, test from your Mac:

```bash
# Test DNS
dig gateway.agentyctrader.com +short

# Test HTTPS
curl -I https://gateway.agentyctrader.com
```

Then open in Safari: `https://gateway.agentyctrader.com` - you should see the IBKR Client Portal Gateway login page.

## If You Don't Have Repo on Droplet Yet

If the repo files aren't on the droplet yet, you can manually create the nginx config:

```bash
# Create nginx config file
sudo nano /etc/nginx/sites-available/gateway.conf
```

Paste this content:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name gateway.agentyctrader.com;

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gateway.agentyctrader.com;

    # SSL certs will be added by certbot
    # For now, use self-signed or certbot will add these

    location / {
        proxy_pass https://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }
}
```

Then continue with steps 3-5 above. Certbot will automatically add the SSL certificate paths when you run it.

## After Setup

Once `https://gateway.agentyctrader.com` is accessible:

1. ✅ Test in Safari - should show IBKR login page
2. ✅ Click "Reconnect IBKR" in the app - should work now
3. ✅ Login with IBKR credentials
4. ✅ Complete 2FA in IBKR mobile app
5. ✅ Return to Agentyc Trader - banner should disappear

## Still Having Issues?

See full troubleshooting guide: `scripts/infra/TROUBLESHOOTING_GATEWAY.md`

Or check:
- DNS: `dig gateway.agentyctrader.com +short`
- Nginx: `sudo systemctl status nginx`
- Gateway: `sudo systemctl status ibkr-gateway.service`
- SSL: `sudo certbot certificates`

