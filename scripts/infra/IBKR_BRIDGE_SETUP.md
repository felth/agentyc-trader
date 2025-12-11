# IBKR Bridge Setup — Production Deployment

This document outlines the complete setup process for the IBKR Bridge service, which is required for authentication and trading functionality.

---

## Prerequisites

- Ubuntu/Debian server with systemd
- IBKR Gateway running via IBeam (port 5000)
- Python 3 installed
- IBKR Bridge service code in `/opt/ibkr-bridge`

---

## Setup Steps

### 1. Create Bridge Environment File

```bash
sudo mkdir -p /opt/ibkr-bridge
sudo nano /opt/ibkr-bridge/.env
```

Add these variables (replace `REPLACE_WITH_REAL_KEY` with your actual bridge key):

```bash
IBKR_BRIDGE_URL=http://127.0.0.1:8000
IBKR_BRIDGE_KEY=REPLACE_WITH_REAL_KEY
```

Save and exit (Ctrl+O, Enter, Ctrl+X).

---

### 2. Configure systemd Service

```bash
sudo nano /etc/systemd/system/ibkr-bridge.service
```

Ensure the service file contains:

```ini
[Unit]
Description=IBKR Bridge Service
After=network.target

[Service]
EnvironmentFile=/opt/ibkr-bridge/.env
WorkingDirectory=/opt/ibkr-bridge
ExecStart=/usr/bin/python3 bridge.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Save and exit.

---

### 3. Enable and Start Bridge Service

```bash
# Reload systemd to pick up service file changes
sudo systemctl daemon-reload

# Start and enable the service
sudo systemctl restart ibkr-bridge
sudo systemctl enable ibkr-bridge
```

---

### 4. Verify Bridge Status

```bash
# Check service status
sudo systemctl status ibkr-bridge --no-pager

# Expected output: "Active: active (running)"
```

---

### 5. Test Bridge Health Endpoint

```bash
curl -s http://127.0.0.1:8000/health | jq
```

**Expected response:**
```json
{
  "status": "ok",
  "bridge": "running"
}
```

---

### 6. Test Authentication Status

```bash
curl -s http://127.0.0.1:8000/gateway/auth-status | jq
```

**Expected response (after IBeam authenticates):**
```json
{
  "authenticated": true
}
```

---

### 7. Configure Next.js App Environment

The Next.js app must have access to the Bridge credentials. Add to `/opt/agentyc-trader/.env.production`:

```bash
IBKR_BRIDGE_URL=http://127.0.0.1:8000
IBKR_BRIDGE_KEY=REPLACE_WITH_REAL_KEY
```

---

### 8. Restart Next.js Service

```bash
cd /opt/agentyc-trader
sudo systemctl restart agentyc-trader
```

Or if running via PM2/nohup:

```bash
# Kill existing process
pkill -f "next start" || pkill -f "node.*next"

# Restart with env vars loaded
cd /opt/agentyc-trader
export $(cat .env.production | grep -v "^#" | grep -v "^$" | xargs)
npm run start > /var/log/agentyc-next.log 2>&1 &
```

---

## Verification Checklist

- [ ] Bridge service is running (`systemctl status ibkr-bridge`)
- [ ] Bridge health endpoint responds (`curl http://127.0.0.1:8000/health`)
- [ ] Authentication status endpoint works (`curl http://127.0.0.1:8000/gateway/auth-status`)
- [ ] IBeam is running and authenticated
- [ ] Next.js app has `IBKR_BRIDGE_URL` and `IBKR_BRIDGE_KEY` in environment
- [ ] Next.js `/api/ibkr/status` returns `{ "ok": true, "gateway": { "authenticated": true } }`

---

## Troubleshooting

### Bridge not starting

```bash
# Check logs
sudo journalctl -u ibkr-bridge -n 50 --no-pager

# Check if port 8000 is in use
sudo lsof -i :8000
```

### Next.js can't reach Bridge

1. Verify Bridge is running: `curl http://127.0.0.1:8000/health`
2. Verify Next.js env vars: Check `.env.production` has `IBKR_BRIDGE_URL` and `IBKR_BRIDGE_KEY`
3. Check Next.js logs: `tail -f /var/log/agentyc-next.log`

### Authentication always returns false

1. Verify IBeam is running: `docker ps | grep ibeam`
2. Check IBeam logs: `docker logs ibeam_ibeam_1 --tail 50`
3. Verify Gateway is accessible: `curl -k https://127.0.0.1:5000/v1/api/iserver/auth/status`

---

## Architecture

```
Next.js App (port 3001)
    ↓ (HTTP + X-Bridge-Key header)
IBKR Bridge (port 8000)
    ↓ (maintains Gateway session cookies)
IBKR Gateway (port 5000, HTTPS)
    ↓ (authenticated via IBeam)
IBKR Client Portal
```

**Key Points:**
- Bridge is the **single source of truth** for authentication status
- Bridge maintains session cookies with Gateway
- Next.js app **only** talks to Bridge, never Gateway directly
- All IBKR API calls go through Bridge: `/iserver/*`, `/portfolio/*`, `/marketdata/*`

---

## Security Notes

- `IBKR_BRIDGE_KEY` must be kept secret
- Bridge should only listen on `127.0.0.1:8000` (localhost only)
- Never expose Bridge to public internet
- Use nginx reverse proxy for public-facing Next.js app only

---

## Related Files

- `src/lib/ibkr.ts` - Bridge client implementation
- `src/app/api/ibkr/status/route.ts` - Status check endpoint
- `src/app/api/ibkr/trade/route.ts` - Trade execution endpoint
- `src/app/api/ibkr/marketdata/route.ts` - Market data endpoint
- `src/app/api/ibkr/positions/route.ts` - Positions endpoint
- `src/app/api/ibkr/account/route.ts` - Account endpoint

---

**Last Updated:** 2025-12-11  
**Status:** Production Ready

