# Nginx Configuration for IBKR Gateway

## Prerequisites

- nginx installed on the droplet
- certbot installed for SSL certificate provisioning
- DNS A record for `gateway.agentyc.app` pointing to `104.248.42.213`

## Installation Steps

Run these commands on the droplet:

```bash
# Install nginx and certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Copy the nginx configuration
sudo cp /opt/agentyc-trader/scripts/infra/nginx/gateway.conf /etc/nginx/sites-available/gateway.conf
sudo ln -s /etc/nginx/sites-available/gateway.conf /etc/nginx/sites-enabled/gateway.conf

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx

# Obtain TLS certificate (certbot will automatically configure nginx)
sudo certbot --nginx -d gateway.agentyc.app
```

## Verification

After setup, `https://gateway.agentyc.app` should show the IBKR Client Portal Gateway login page (proxied through to the droplet's gateway on port 5000).

## Notes

- The gateway uses a self-signed certificate, so `proxy_ssl_verify off` is set
- All HTTP traffic is automatically redirected to HTTPS
- Basic security headers are included

