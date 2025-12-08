# Verify IBKR Gateway Nginx Proxy

## 1. Confirm nginx configuration

On the droplet, verify the server block exists:

```bash
sudo cat /etc/nginx/sites-available/ibkr.conf
# OR
sudo cat /etc/nginx/conf.d/ibkr.conf
```

It should have:
- `server_name ibkr.agentyctrader.com;`
- `location /` proxying to `https://127.0.0.1:5000`
- `proxy_set_header Host localhost;`

## 2. Test nginx configuration

```bash
sudo nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## 3. Reload nginx

```bash
sudo systemctl reload nginx
```

## 4. Test from your Mac

```bash
curl -vk https://ibkr.agentyctrader.com/v1/api/iserver/auth/status
```

Expected response:
- HTTP/1.1 200 OK
- JSON body: `{"authenticated":true,"connected":true,...}`

## Troubleshooting

If you get connection errors:
1. Check nginx is running: `sudo systemctl status nginx`
2. Check Gateway is running: `curl -k https://127.0.0.1:5000/v1/api/iserver/auth/status` (on droplet)
3. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
4. Verify DNS: `dig ibkr.agentyctrader.com` should resolve to droplet IP

