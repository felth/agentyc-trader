# IBKR Gateway Nginx Setup

## Problem
Getting 404 "Access Denied" when accessing `https://ibkr.agentyctrader.com/v1/api/iserver/auth/status` even though Gateway is running and authenticated on the droplet.

## Solution

### 1. Install/Copy nginx configuration

On the droplet, create or update the nginx server block:

```bash
sudo nano /etc/nginx/sites-available/ibkr.conf
# OR
sudo nano /etc/nginx/conf.d/ibkr.conf
```

Copy the contents from `scripts/infra/nginx/ibkr.conf` in this repo.

### 2. Add map directive to http block (if not already present)

The `map` directive for WebSocket support must be in the `http` block, not the `server` block.

Edit the main nginx config:

```bash
sudo nano /etc/nginx/nginx.conf
```

In the `http {` block, add:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

### 3. Enable the site (if using sites-available)

```bash
sudo ln -s /etc/nginx/sites-available/ibkr.conf /etc/nginx/sites-enabled/ibkr.conf
```

### 4. Test nginx configuration

```bash
sudo nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Reload nginx

```bash
sudo systemctl reload nginx
```

### 6. Verify from droplet

```bash
curl -vk https://ibkr.agentyctrader.com/v1/api/iserver/auth/status
```

Should return:
- HTTP/1.1 200 OK
- JSON: `{"authenticated":true,"connected":true,...}`

### 7. Verify from your Mac

```bash
curl -vk https://ibkr.agentyctrader.com/v1/api/iserver/auth/status
```

Should return the same 200 OK response.

## Troubleshooting

If still getting 404:

1. **Check nginx is using the correct config:**
   ```bash
   sudo nginx -T | grep -A 20 "server_name ibkr.agentyctrader.com"
   ```

2. **Check Gateway is accessible locally:**
   ```bash
   curl -k https://127.0.0.1:5000/v1/api/iserver/auth/status
   ```

3. **Check nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Verify the server block is active:**
   ```bash
   sudo nginx -T | grep "ibkr.agentyctrader.com"
   ```

5. **Check for conflicting server blocks:**
   ```bash
   sudo grep -r "server_name" /etc/nginx/ | grep -v "#"
   ```

## Important Notes

- The `proxy_pass` MUST point to `https://127.0.0.1:5000` (the Gateway)
- The `Host` header MUST be set to `localhost` (not `$host`)
- `proxy_ssl_verify off` is required because Gateway uses a self-signed cert
- The `map $http_upgrade` directive must be in the `http` block, not `server` block

