# IBKR Working Configuration Checkpoint

**Date:** 2025-01-15  
**Git Commit:** `5ae4962` - "Defensive fix: ensure gateway field always present + use Promise.allSettled"  
**Status:** ✅ WORKING - IBKR connection and status reporting is functional

---

## Summary

This checkpoint documents the working state of the IBKR integration where:
- ✅ `/api/ibkr/status` endpoint correctly reports Gateway authentication status
- ✅ Frontend (`src/app/page.tsx`) correctly displays connection status
- ✅ Nginx proxy correctly routes `ibkr.agentyctrader.com` to Gateway
- ✅ IBKR Bridge service is running and accessible
- ✅ Gateway authentication status is accurately reflected in UI

---

## Key Files & Their State

### 1. `/api/ibkr/status` Endpoint
**File:** `src/app/api/ibkr/status/route.ts`  
**Commit:** `5ae4962`

**Key Features:**
- Uses `Promise.allSettled()` to prevent one check from blocking the other
- Always includes `gateway` field in response (even on error)
- Directly calls Gateway's `/v1/api/iserver/auth/status` endpoint
- Falls back to `https://ibkr.agentyctrader.com` if env vars not set
- Returns structured response with `bridge`, `gateway`, and `authenticated` fields

**Critical Code:**
```typescript
const results = await Promise.allSettled([
  getIbkrHealth().catch((err) => ({ ok: false, error: err?.message ?? 'Health check failed' })),
  getGatewayAuthStatus(),
]);

// ALWAYS include gateway field
const response = {
  ok: true,
  bridge: bridgeHealth,
  gateway: gatewayAuth,  // Always present
  authenticated: authenticated || false,
  _debug: { gatewayBase: ... },
};
```

---

### 2. Frontend Status Check
**File:** `src/app/page.tsx`  
**Commit:** `ad8b042` (restored to match working commit `216e999`)

**Key Features:**
- Initial status check on page load via `fetchIbkrStatus()`
- State structure: `{ bridgeOk: boolean; gatewayAuthenticated: boolean; } | null`
- Banner shows when `ibkrStatus` is `null` OR when not authenticated
- Status card shows "LIVE" only when both `bridgeOk` and `gatewayAuthenticated` are true

**Critical Code:**
```typescript
if (ibkrRes.ok) {
  setIbkrStatus({
    bridgeOk: ibkrRes.bridge?.ok === true,
    gatewayAuthenticated:
      ibkrRes.gateway?.ok === true &&
      ibkrRes.gateway?.status?.authenticated === true,
  });
}
```

---

### 3. Nginx Configuration
**File:** `scripts/infra/nginx/ibkr.conf`  
**Status:** ✅ Critical fix applied

**Key Configuration:**
- **Critical:** `proxy_set_header Host localhost;` (not `$host`)
  - IBKR Gateway requires `Host: localhost` header
  - Without this, Gateway returns `404 Access Denied`
- Proxy passes to `https://127.0.0.1:5000` (Gateway)
- SSL verification disabled (`proxy_ssl_verify off`)
- WebSocket support configured
- Timeouts set appropriately

**Critical Line:**
```nginx
location / {
    proxy_pass https://127.0.0.1:5000;
    proxy_set_header Host localhost;  # ← CRITICAL: Must be localhost, not $host
    proxy_ssl_verify off;
    # ... rest of config
}
```

---

### 4. IBKR Bridge Service
**File:** `scripts/ibkr-bridge/app.py`  
**Status:** ✅ Running as systemd service

**Key Features:**
- FastAPI service on port 8000
- Security key: `agentyc-bridge-9u1Px`
- Gateway URL: `https://localhost:5000/v1/api`
- Provides `/health` and `/gateway/auth-status` endpoints

**Service Status:**
```bash
sudo systemctl status ibkr-bridge
# Should show: active (running)
```

---

## Git History (Recent Working Commits)

```
5ae4962 (HEAD -> main, origin/main) Defensive fix: ensure gateway field always present + use Promise.allSettled
4cb2703 Add error logging to debug missing gateway field
305d4cd Fix /api/ibkr/status to check Gateway auth directly
b8ae357 Restore status endpoint to exact working commit 216e999: use getIbkrHealth/getIbkrGatewayAuthStatus
ad8b042 Fix banner condition: Show when ibkrStatus is null OR not authenticated (exact match to working commit)
```

---

## How to Verify It's Working

### 1. Check API Endpoint
```bash
curl -sS https://agentyctrader.com/api/ibkr/status | python3 -m json.tool
```

**Expected Response (when authenticated):**
```json
{
  "ok": true,
  "bridge": {
    "ok": true,
    "service": "ibkr-bridge",
    "status": "running"
  },
  "gateway": {
    "ok": true,
    "status": 200,
    "data": {
      "authenticated": true,
      "connected": true,
      "competing": false,
      "message": "",
      "MAC": "...",
      "serverInfo": {
        "serverName": "...",
        "serverVersion": "..."
      }
    }
  },
  "authenticated": true,
  "_debug": {
    "gatewayBase": "https://ibkr.agentyctrader.com"
  }
}
```

### 2. Check Frontend
- Visit `https://agentyctrader.com`
- IBKR status banner should NOT show if authenticated
- Account card should show "IBKR: LIVE" if both bridge and gateway are OK

### 3. Check Services
```bash
# IBKR Bridge
sudo systemctl status ibkr-bridge
curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health

# Nginx
sudo systemctl status nginx
sudo nginx -t

# Gateway (via Nginx proxy)
curl -I https://ibkr.agentyctrader.com/v1/api/iserver/auth/status
```

---

## How to Restore This State

If things break, restore to this checkpoint:

### 1. Restore Code
```bash
cd /opt/agentyc-trader
git checkout 5ae4962
# Or if commit is on main:
git pull origin main
```

### 2. Verify Nginx Config
```bash
# Ensure Host header is set to localhost (not $host)
grep -A 5 "location /" /etc/nginx/sites-available/ibkr.conf | grep "proxy_set_header Host"
# Should show: proxy_set_header Host localhost;

# If not, fix it:
sudo nano /etc/nginx/sites-available/ibkr.conf
# Change: proxy_set_header Host $host;
# To:     proxy_set_header Host localhost;
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Rebuild & Restart Next.js
```bash
cd /opt/agentyc-trader

# Stop existing server
sudo systemctl stop agentyc-nextjs 2>/dev/null || pkill -f "next start"

# Rebuild
rm -rf .next
npm run build

# Restart
sudo systemctl start agentyc-nextjs 2>/dev/null || \
  (export $(cat .env.production | grep -v '^#' | xargs) && \
   nohup npm run start > /var/log/agentyc-next.log 2>&1 &)
```

### 4. Verify
```bash
sleep 5
curl -sS https://agentyctrader.com/api/ibkr/status | python3 -m json.tool
```

---

## Known Issues & Solutions

### Issue: Gateway returns `404 Access Denied`
**Solution:** Ensure Nginx sets `proxy_set_header Host localhost;` (not `$host`)

### Issue: `/api/ibkr/status` missing `gateway` field
**Solution:** Ensure code is at commit `5ae4962` or later. The defensive code always includes `gateway` field.

### Issue: UI shows "Connected" when Gateway is not authenticated
**Solution:** Ensure frontend code checks both `bridgeOk` and `gatewayAuthenticated` (commit `ad8b042` or later).

### Issue: Vercel vs Self-Hosted Confusion
**Note:** The live app at `agentyctrader.com` is **self-hosted** on the droplet, NOT Vercel. Changes to code require:
1. `git push origin main`
2. `git pull` on droplet
3. Rebuild Next.js (`npm run build`)
4. Restart Next.js server

---

## Architecture Overview

```
User Browser
    ↓
https://agentyctrader.com (Nginx)
    ↓
Next.js App (:3000) → /api/ibkr/status
    ├→ IBKR Bridge (http://127.0.0.1:8000) → Gateway health
    └→ Gateway (https://ibkr.agentyctrader.com)
            ↓
        Nginx (ibkr.agentyctrader.com)
            ↓
        Gateway (https://127.0.0.1:5000)
```

**Critical Path:**
1. Next.js `/api/ibkr/status` calls Gateway's `/v1/api/iserver/auth/status`
2. Nginx proxies request to `https://127.0.0.1:5000`
3. Nginx MUST set `Host: localhost` header (Gateway requirement)
4. Gateway returns authentication status
5. Frontend displays status based on both bridge and gateway health

---

## Environment Variables

### On Droplet (.env.production)
```bash
IBKR_BRIDGE_URL=http://127.0.0.1:8000
IBKR_BRIDGE_KEY=agentyc-bridge-9u1Px
IBKR_GATEWAY_URL=https://ibkr.agentyctrader.com
# Or use NEXT_PUBLIC_IBKR_GATEWAY_URL for client-side access
```

### IBKR Bridge (.env or systemd EnvironmentFile)
```bash
IB_GATEWAY_URL=https://localhost:5000/v1/api
BRIDGE_KEY=agentyc-bridge-9u1Px
```

---

## Testing Checklist

- [ ] `/api/ibkr/status` returns `ok: true` with `gateway` field
- [ ] `gateway.authenticated` accurately reflects Gateway auth state
- [ ] Frontend banner shows/hides correctly based on auth status
- [ ] Account card shows "LIVE" when authenticated
- [ ] Nginx proxy works: `curl https://ibkr.agentyctrader.com/v1/api/iserver/auth/status`
- [ ] IBKR Bridge health check works: `curl -H "X-Bridge-Key: ..." http://127.0.0.1:8000/health`

---

## Notes

- **Manual Login Flow:** User clicks "Connect IBKR" → Opens Gateway URL in new tab → User logs in manually with 2FA → App polls `/api/ibkr/status` → UI updates when authenticated
- **No IBeam Automation:** Current approach uses manual login, not IBeam automation
- **Session Management:** Gateway session persists until timeout or logout
- **Connection State:** "Connected" = Gateway reachable, "Authenticated" = User logged in

---

**Last Verified:** 2025-01-15  
**Verified By:** Checkpoint created after confirming IBKR is working again

