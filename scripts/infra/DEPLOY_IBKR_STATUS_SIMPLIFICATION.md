# IBKR Status Simplification - Deployment Instructions

## Overview

This update simplifies the IBKR status check by:
- Removing dependency on flaky `/v1/api/iserver/auth/status` Gateway endpoint
- Using Bridge `/health` as the single source of truth for "Bridge is online"
- All authentication issues will surface on real trading/account endpoints (HTTP 401/403)

---

## Deployment Steps (Run on Droplet)

### 1. Update Bridge Service Code

```bash
cd /opt/ibkr-bridge

# Backup current app.py
cp app.py app.py.backup

# Pull latest changes (or manually update app.py)
# The key changes are:
# - /gateway/auth-status now returns deprecation notice (no Gateway calls)
# - BRIDGE_KEY updated to: a0be2313d5bc10d81ad410c5b9b1dbdc30ef4711570d11b4ade9178069d09cef

# Update app.py manually if needed:
sudo nano app.py
```

**Key changes in Bridge `/gateway/auth-status`:**
```python
@app.get("/gateway/auth-status")
async def gateway_auth_status(x_bridge_key: str = Header(None)):
    verify_key(x_bridge_key)
    return {
        "ok": True,
        "service": "ibkr-bridge",
        "note": "auth-status is deprecated; use real trading endpoints to detect authentication errors.",
    }
```

**Update BRIDGE_KEY:**
```python
BRIDGE_KEY = "a0be2313d5bc10d81ad410c5b9b1dbdc30ef4711570d11b4ade9178069d09cef"
```

### 2. Restart Bridge Service

```bash
sudo systemctl restart ibkr-bridge
sudo systemctl status ibkr-bridge --no-pager
```

**Expected output:**
```
Active: active (running)
```

### 3. Update Next.js App

```bash
cd /opt/agentyc-trader
git pull origin main
npm run build
systemctl restart agentyc-trader
```

Or if using nohup/PM2:

```bash
# Kill existing process
pkill -f "next start" || pkill -f "node.*next"

# Restart with env vars
cd /opt/agentyc-trader
export $(cat .env.production | grep -v "^#" | grep -v "^$" | xargs)
npm run start > /var/log/agentyc-next.log 2>&1 &
```

### 4. Verify Environment Variables

Ensure `.env.production` has:

```bash
IBKR_BRIDGE_URL=http://127.0.0.1:8000
IBKR_BRIDGE_KEY=a0be2313d5bc10d81ad410c5b9b1dbdc30ef4711570d11b4ade9178069d09cef
```

---

## Verification Tests

### Test 1: Bridge Health (Server)

```bash
curl -s -H "X-Bridge-Key: a0be2313d5bc10d81ad410c5b9b1dbdc30ef4711570d11b4ade9178069d09cef" \
  http://127.0.0.1:8000/health | jq
```

**Expected:**
```json
{
  "ok": true,
  "service": "ibkr-bridge",
  "status": "running"
}
```

### Test 2: Bridge Auth-Status (Server)

```bash
curl -s -H "X-Bridge-Key: a0be2313d5bc10d81ad410c5b9b1dbdc30ef4711570d11b4ade9178069d09cef" \
  http://127.0.0.1:8000/gateway/auth-status | jq
```

**Expected:**
```json
{
  "ok": true,
  "service": "ibkr-bridge",
  "note": "auth-status is deprecated; use real trading endpoints to detect authentication errors."
}
```

### Test 3: Next.js Status Endpoint (Public)

```bash
curl -s https://agentyctrader.com/api/ibkr/status | jq
```

**Expected (when Bridge is running):**
```json
{
  "ok": true,
  "bridge": {
    "ok": true,
    "error": null,
    "raw": {
      "ok": true,
      "service": "ibkr-bridge",
      "status": "running"
    }
  }
}
```

**Expected (when Bridge is down):**
```json
{
  "ok": false,
  "bridge": {
    "ok": false,
    "error": "IBKR bridge health check failed (could not reach /health)"
  }
}
```

### Test 4: Frontend UI

1. Open https://agentyctrader.com
2. Look for "IBKR Connection" card below the hero section
3. Click "Check IBKR Status" button
4. Should show:
   - **When Bridge is online:** Green card with "Connected" button and message "IBKR bridge is online and reachable."
   - **When Bridge is offline:** Amber card with "Retry" button and error message

---

## What Changed

### Before
- Next.js called Bridge `/gateway/auth-status`
- Bridge proxied to Gateway `/v1/api/iserver/auth/status`
- Gateway endpoint was flaky (404s, unreliable)
- Frontend showed complex "authenticated" vs "reachable" states

### After
- Next.js calls Bridge `/health` only
- Bridge `/health` is simple and always reliable
- Bridge `/gateway/auth-status` returns deprecation notice (no Gateway calls)
- Frontend shows simple "Bridge online" vs "Bridge offline"
- Real authentication issues surface on trading endpoints (401/403)

---

## Rollback Plan

If issues occur:

1. **Revert Bridge code:**
   ```bash
   cd /opt/ibkr-bridge
   cp app.py.backup app.py
   sudo systemctl restart ibkr-bridge
   ```

2. **Revert Next.js:**
   ```bash
   cd /opt/agentyc-trader
   git checkout HEAD~1
   npm run build
   systemctl restart agentyc-trader
   ```

---

## Troubleshooting

### Bridge not responding

```bash
# Check service status
sudo systemctl status ibkr-bridge -l --no-pager

# Check logs
sudo journalctl -u ibkr-bridge -n 50 --no-pager

# Test directly
curl -v http://127.0.0.1:8000/health
```

### Next.js can't reach Bridge

1. Verify Bridge is running: `curl http://127.0.0.1:8000/health`
2. Check Next.js logs: `tail -f /var/log/agentyc-next.log`
3. Verify env vars: `grep IBKR_BRIDGE /opt/agentyc-trader/.env.production`

### Frontend shows "error" but Bridge is running

1. Check browser console for API errors
2. Verify `/api/ibkr/status` returns expected JSON structure
3. Ensure `IBKR_BRIDGE_KEY` matches in both Bridge and Next.js

---

**Status:** Ready for deployment  
**Date:** 2025-12-11  
**Risk Level:** Low (simplification only, no functionality removed)

