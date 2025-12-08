# IBKR Gateway Reverse Proxy Setup

This guide sets up a secure reverse proxy for the IBKR Client Portal Gateway, exposing it at `https://ibkr.agentyctrader.com`.

## Prerequisites

- DigitalOcean droplet with IP: `104.248.42.213`
- DNS A record for `ibkr.agentyctrader.com` pointing to `104.248.42.213`
- IBKR Gateway running on `127.0.0.1:5000` via systemd service `ibkr-gateway.service`
- SSH access to the droplet

## Installation Steps

### 1. Install Nginx and Certbot

Run these commands on the droplet:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Copy Nginx Configuration

Copy the nginx configuration file to the droplet:

```bash
# From your local machine (if you have the repo cloned on droplet):
sudo cp /opt/agentyc-trader/scripts/infra/nginx/ibkr.conf /etc/nginx/sites-available/ibkr.conf

# Or create it manually on the droplet:
sudo nano /etc/nginx/sites-available/ibkr.conf
# Paste the contents of scripts/infra/nginx/ibkr.conf
```

### 3. Enable the Site

```bash
# Create symlink to enable the site
sudo ln -s /etc/nginx/sites-available/ibkr.conf /etc/nginx/sites-enabled/ibkr.conf

# Remove default site if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t
```

If the test passes, reload nginx:

```bash
sudo systemctl reload nginx
```

### 4. Obtain TLS Certificate

Use certbot to automatically obtain and configure the SSL certificate:

```bash
sudo certbot --nginx -d ibkr.agentyctrader.com
```

Certbot will:
- Prompt for email (optional, for renewal notices)
- Ask to agree to terms of service
- Obtain the certificate from Let's Encrypt
- Automatically update the nginx config with certificate paths
- Set up automatic renewal

### 5. Verify Setup

1. **Check nginx is running:**
   ```bash
   sudo systemctl status nginx
   ```

2. **Check IBKR Gateway is running:**
   ```bash
   sudo systemctl status ibkr-gateway.service
   ```

3. **Test the reverse proxy:**
   - Open `https://ibkr.agentyctrader.com` in a browser
   - You should see the IBKR Client Portal Gateway login page
   - The URL should show a valid SSL certificate

## Verification Checklist

- [ ] DNS A record for `ibkr.agentyctrader.com` points to `104.248.42.213`
- [ ] Nginx is installed and running
- [ ] `ibkr.conf` is in `/etc/nginx/sites-available/` and symlinked in `sites-enabled/`
- [ ] SSL certificate obtained via certbot
- [ ] `https://ibkr.agentyctrader.com` loads the IBKR Gateway login page
- [ ] IBKR Gateway service is running on `127.0.0.1:5000`

## Automatic Certificate Renewal

Certbot sets up automatic renewal via a systemd timer. Verify it's active:

```bash
sudo systemctl status certbot.timer
```

Certificates will auto-renew 30 days before expiration.

## Troubleshooting

### Nginx won't start

```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t
```

### Gateway not accessible

1. Verify Gateway is running:
   ```bash
   sudo systemctl status ibkr-gateway.service
   curl -k https://127.0.0.1:5000
   ```

2. Check nginx proxy logs:
   ```bash
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Manually renew if needed
sudo certbot renew --dry-run
```

## Security Notes

- The Gateway uses a self-signed certificate, so `proxy_ssl_verify off` is set
- All HTTP traffic is automatically redirected to HTTPS
- Basic security headers are included (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- The Gateway is only accessible from `127.0.0.1` (localhost), not exposed directly

## Next Steps

After setup, update the Agentyc Trader app to use `https://ibkr.agentyctrader.com` as the gateway URL (or set `NEXT_PUBLIC_IBKR_GATEWAY_URL` environment variable).

