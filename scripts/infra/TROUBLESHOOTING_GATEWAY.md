# IBKR Gateway Access Troubleshooting

## Problem: "Gateway can't be found on Safari"

When clicking "Reconnect IBKR", Safari cannot load `https://gateway.agentyctrader.com`.

## Quick Diagnostic Checklist

### 1. Check DNS Resolution

On your Mac, run:
```bash
dig gateway.agentyctrader.com +short
# or
nslookup gateway.agentyctrader.com
```

**Expected:** Should return `104.248.42.213`

**If not:**
- Go to your DNS provider (where `agentyc.app` is managed)
- Add an A record: `gateway.agentyctrader.com` → `104.248.42.213`
- Wait 5-10 minutes for DNS propagation

### 2. Check if Nginx is Installed on Droplet

SSH into the droplet and run:
```bash
which nginx
nginx -v
```

**If nginx is not installed:**
- Follow steps in `scripts/infra/nginx/README.md`
- Install nginx and certbot first

### 3. Check if Nginx Configuration Exists

On the droplet:
```bash
ls -la /etc/nginx/sites-available/gateway.conf
ls -la /etc/nginx/sites-enabled/gateway.conf
```

**If files don't exist:**
- Copy config from repo: `sudo cp /opt/agentyc-trader/scripts/infra/nginx/gateway.conf /etc/nginx/sites-available/gateway.conf`
- Enable it: `sudo ln -s /etc/nginx/sites-available/gateway.conf /etc/nginx/sites-enabled/gateway.conf`
- Test: `sudo nginx -t`
- Reload: `sudo systemctl reload nginx`

### 4. Check SSL Certificate

On the droplet:
```bash
sudo certbot certificates
ls -la /etc/letsencrypt/live/gateway.agentyctrader.com/
```

**If certificate doesn't exist:**
- Run: `sudo certbot --nginx -d gateway.agentyctrader.com`
- Follow the prompts to obtain the certificate

### 5. Check if IBKR Gateway is Running

On the droplet:
```bash
curl -k https://127.0.0.1:5000
# or
sudo systemctl status ibkr-gateway.service
```

**Expected:** Should see HTML response or service status "active"

**If not running:**
- Start gateway: `sudo systemctl start ibkr-gateway.service`
- Check logs: `sudo journalctl -u ibkr-gateway.service -n 50`

### 6. Check Nginx Status

On the droplet:
```bash
sudo systemctl status nginx
sudo nginx -t
```

**If nginx is not running:**
- Start: `sudo systemctl start nginx`
- Check logs: `sudo tail -f /var/log/nginx/error.log`

### 7. Check Firewall

On the droplet:
```bash
sudo ufw status
```

**Expected:** Ports 80 and 443 should be open

**If not:**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### 8. Test from Droplet Directly

On the droplet:
```bash
# Test gateway directly
curl -k https://127.0.0.1:5000 | head -20

# Test nginx proxy
curl -H "Host: gateway.agentyctrader.com" http://127.0.0.1 | head -20
```

## Common Issues and Fixes

### Issue: DNS not resolving
**Fix:** Add DNS A record in your DNS provider's dashboard

### Issue: Nginx not installed
**Fix:** Run the installation steps from `scripts/infra/nginx/README.md`

### Issue: SSL certificate error
**Fix:** 
1. Ensure DNS is pointing correctly
2. Run: `sudo certbot --nginx -d gateway.agentyctrader.com`
3. Follow prompts to verify domain ownership

### Issue: "Connection refused" in Safari
**Fix:** 
- Check if nginx is running: `sudo systemctl status nginx`
- Check if ports are open: `sudo ufw status`
- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

### Issue: "Site can't be reached"
**Fix:**
- Verify DNS: `dig gateway.agentyctrader.com`
- Verify nginx is listening: `sudo netstat -tlnp | grep :443`
- Verify firewall allows traffic

## Quick Setup Script

If you need to set everything up from scratch on the droplet:

```bash
# 1. Install nginx and certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Copy nginx config (assumes repo is at /opt/agentyc-trader)
sudo cp /opt/agentyc-trader/scripts/infra/nginx/gateway.conf /etc/nginx/sites-available/gateway.conf
sudo ln -s /etc/nginx/sites-available/gateway.conf /etc/nginx/sites-enabled/gateway.conf

# 3. Test nginx config
sudo nginx -t

# 4. Start/reload nginx
sudo systemctl reload nginx

# 5. Get SSL certificate (requires DNS to be set up first)
sudo certbot --nginx -d gateway.agentyctrader.com

# 6. Verify gateway is accessible
curl -k https://127.0.0.1:5000
```

## Testing from Your Mac

After setup, test from your Mac:

```bash
# Test HTTP redirect
curl -I http://gateway.agentyctrader.com

# Test HTTPS
curl -I https://gateway.agentyctrader.com

# Should see HTTP 200 or 302 redirect
```

## Next Steps

Once `https://gateway.agentyctrader.com` is accessible:
1. Verify it shows the IBKR Client Portal Gateway login page
2. Test login from Safari
3. Verify the "Reconnect IBKR" button in the app works

