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

### 2. Create Initial Nginx Configuration (HTTP only, for Certbot)

Create the initial HTTP configuration that Certbot will enhance:

```bash
sudo tee /etc/nginx/sites-available/ibkr.agentyctrader.com.conf >/dev/null << 'EOF'
server {
    listen 80;
    server_name ibkr.agentyctrader.com;

    # Redirect all HTTP to HTTPS once cert is in place
    location / {
        return 301 https://$host$request_uri;
    }
}
EOF
```

### 3. Enable the Site

```bash
# Create symlink to enable the site
sudo ln -sf /etc/nginx/sites-available/ibkr.agentyctrader.com.conf /etc/nginx/sites-enabled/ibkr.agentyctrader.com.conf

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
sudo certbot --nginx -d ibkr.agentyctrader.com --redirect --non-interactive --agree-tos -m liamfeltham@hotmail.com
```

Certbot will:
- Obtain the certificate from Let's Encrypt
- Automatically add SSL configuration to your nginx config
- Set up automatic renewal
- Configure HTTP→HTTPS redirect

### 5. Update Nginx Configuration for Reverse Proxy

After Certbot adds the SSL configuration, you need to add the reverse proxy settings. Update the HTTPS server block in `/etc/nginx/sites-available/ibkr.agentyctrader.com.conf`:

```bash
sudo nano /etc/nginx/sites-available/ibkr.agentyctrader.com.conf
```

Replace the `location /` block in the HTTPS server section with:

```nginx
# Proxy everything to the local IBKR gateway on 127.0.0.1:5000
location / {
    proxy_pass https://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;

    # WebSocket / SSE support (IBKR UI may use them)
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    # Gateway uses self-signed certificate, so we skip verification
    proxy_ssl_verify off;

    # Avoid buffering issues
    proxy_buffering off;
}

# Map for Upgrade header (add this at the top level, outside server blocks)
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

**Note:** Add the `map` block before the `server` blocks in the file.

Alternatively, you can use the complete configuration from the repo (includes the map directive):

```bash
# Copy the complete config (with map directive)
sudo cp /opt/agentyc-trader/scripts/infra/nginx/IBKR_COMPLETE_CONFIG.conf /etc/nginx/sites-available/ibkr.agentyctrader.com.conf
```

**Important:** After Certbot modifies the config, you'll need to:
1. Add the `map $http_upgrade $connection_upgrade` block at the top of the file (before server blocks)
2. Update the `location /` block with the proxy settings shown above

Then test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

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

