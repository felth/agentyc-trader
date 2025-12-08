# Nginx Configuration for IBKR Gateway

This directory contains nginx configuration files for reverse proxying the IBKR Client Portal Gateway.

## Configuration Files

- `gateway.conf` - Legacy configuration for `gateway.agentyctrader.com` (deprecated)
- `ibkr.conf` - **Active** configuration for `ibkr.agentyctrader.com`

## Active Setup: ibkr.agentyctrader.com

See [IBKR_SETUP.md](./IBKR_SETUP.md) for detailed setup instructions.

Quick setup:

```bash
# Install nginx and certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Copy the nginx configuration
sudo cp /opt/agentyc-trader/scripts/infra/nginx/ibkr.conf /etc/nginx/sites-available/ibkr.conf
sudo ln -s /etc/nginx/sites-available/ibkr.conf /etc/nginx/sites-enabled/ibkr.conf

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx

# Obtain TLS certificate (certbot will automatically configure nginx)
sudo certbot --nginx -d ibkr.agentyctrader.com
```

## Verification

After setup, `https://ibkr.agentyctrader.com` should show the IBKR Client Portal Gateway login page (proxied through to the droplet's gateway on port 5000).

## Notes

- The gateway uses a self-signed certificate, so `proxy_ssl_verify off` is set
- All HTTP traffic is automatically redirected to HTTPS
- Basic security headers are included
- WebSocket support is included for Gateway features

