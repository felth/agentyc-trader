# IBKR Integration Stabilization - Complete Diagnostic & Fix Guide

## Current State Summary

✅ **Working:**
- Bridge health endpoint (`/health`) - responds correctly
- Next.js → Bridge connectivity (`/api/ibkr/status` returns `ok: true`)
- Bridge key: `agentyc-bridge-9u1Px` (consistent across system)

❌ **Not Working:**
- Account data is empty (no positions, no account info)
- Unknown if IBeam → Gateway is authenticated
- No visibility into Gateway authentication status

---

## Part A: Confirm IBeam Gateway Authentication

### Diagnostic Commands

```bash
# 1. Check IBeam logs for authentication status
cd /opt/ibeam
docker logs ibeam_ibeam_1 | tail -50 | grep -i "authenticated\|connected\|session\|login"

# Expected output should show:
# - "AUTHENTICATED Status(running=True, session=True, connected=True, authenticated=True..."
# - "Gateway running and authenticated, session id: ..."

# 2. Test Gateway directly (requires self-signed cert bypass)
curl -k https://127.0.0.1:5000/v1/api/iserver/auth/status 2>&1 | jq

# If authenticated, should return:
# {
#   "authenticated": true,
#   "competing": false,
#   "connected": true,
#   ...
# }

# 3. Test Gateway account endpoint directly
curl -k https://127.0.0.1:5000/v1/api/portfolio/accounts 2>&1 | jq

# If authenticated and working, should return account list
# If not authenticated, will return 401/403 or empty array
```

### IBeam Authentication Indicators

**✅ AUTHENTICATED (Good):**
- IBeam logs show: `authenticated=True, session=True, connected=True`
- Gateway `/auth/status` returns `"authenticated": true`
- Gateway `/portfolio/accounts` returns account data

**❌ NOT AUTHENTICATED (Bad):**
- IBeam logs show: `authenticated=False` or `NO SESSION`
- Gateway `/auth/status` returns `"authenticated": false` or 401
- Gateway `/portfolio/accounts` returns empty array or 401/403

---

## Part B: IBKR Gateway API Endpoints (Correct Mapping)

### Standard IBKR Client Portal Gateway Endpoints

The Bridge should map to these **exact** IBKR endpoints:

```
Bridge Route                    →  IBKR Gateway Endpoint                    Method
─────────────────────────────────────────────────────────────────────────────
/portfolio/accounts             →  /v1/api/portfolio/accounts              GET
/portfolio/{accountId}/summary  →  /v1/api/portfolio/{accountId}/summary   GET
/portfolio/{accountId}/positions → /v1/api/portfolio/{accountId}/positions GET
/iserver/account/orders         →  /v1/api/iserver/account/orders          GET
/iserver/account/orders         →  /v1/api/iserver/account/orders          POST (place order)
/marketdata/snapshot            →  /v1/api/marketdata/snapshot             GET
```

### Bridge Account Endpoint Should Do This:

```python
# Bridge /account endpoint (current implementation check)
@app.get("/account")
async def account(x_bridge_key: str = Header(None)):
    verify_key(x_bridge_key)
    
    # Step 1: Get account list
    accounts_data = await ib_get("portfolio/accounts")
    # Returns: [{"accountId": "DU123456", ...}, ...]
    
    # Step 2: Get summary for first account
    account_id = accounts_data[0]["accountId"]
    summary = await ib_get(f"portfolio/{account_id}/summary")
    
    # Step 3: Get positions for that account
    positions = await ib_get(f"portfolio/{account_id}/positions")
    
    # Step 4: Return normalized response
    return {...}
```

### Current Bridge Implementation Check

```bash
# Review what the Bridge /account endpoint actually does
cd /opt/ibkr-bridge
grep -A 30 "def account" app.py
```

**Questions to verify:**
1. Does it call `portfolio/accounts` first?
2. Does it extract the account ID correctly?
3. Does it call `portfolio/{accountId}/summary`?
4. Does it handle empty responses gracefully?

---

## Part C: HTTP Methods for IBKR Endpoints

### Standard IBKR Endpoint Methods

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/portfolio/accounts` | **GET** | List accounts |
| `/portfolio/{id}/summary` | **GET** | Account summary |
| `/portfolio/{id}/positions` | **GET** | Current positions |
| `/iserver/account/orders` | **GET** | List open orders |
| `/iserver/account/orders` | **POST** | Place new order |
| `/marketdata/snapshot` | **GET** | Market data |

**All read operations (account, positions, summary) are GET requests.**

---

## Part D: Bridge Key - Final Decision

### Recommendation: **KEEP `agentyc-bridge-9u1Px`**

**Rationale:**
1. ✅ Currently working (`/health` responds)
2. ✅ Consistent across all components
3. ✅ No need to change working configuration
4. ✅ Simpler/shorter key is easier to manage

**Action:**
- **DO NOT** change to the long key (`a0be23...d09cef`)
- **KEEP** `agentyc-bridge-9u1Px` everywhere:
  - Bridge `app.py`: `BRIDGE_KEY = "agentyc-bridge-9u1Px"`
  - Next.js `.env.production`: `IBKR_BRIDGE_KEY=agentyc-bridge-9u1Px`
  - All documentation and curl tests

**Single Source of Truth:**
```python
# Bridge app.py
BRIDGE_KEY = "agentyc-bridge-9u1Px"  # STABLE - DO NOT CHANGE
```

---

## Part E: Why Account Data Might Be Empty

### Possible Causes (In Order of Likelihood)

#### 1. **Gateway Not Authenticated** (Most Likely)
**Symptom:** Bridge is online, but Gateway returns empty/401
**Diagnostic:**
```bash
# Test Gateway directly
curl -k https://127.0.0.1:5000/v1/api/portfolio/accounts
```
**Fix:** Restart IBeam, check credentials, verify IBeam logs

#### 2. **Bridge Not Using Session Cookies**
**Symptom:** Gateway authenticated, but Bridge requests fail
**Diagnostic:** Check if Bridge `ib_get()` function maintains cookies
**Fix:** Ensure Bridge uses `httpx.AsyncClient` with cookie persistence

#### 3. **Wrong Account ID Extraction**
**Symptom:** Bridge calls fail at account-specific endpoints
**Diagnostic:** Check Bridge logs for errors when calling `portfolio/{id}/summary`
**Fix:** Verify account ID extraction logic in Bridge

#### 4. **Empty Account (No Positions)**
**Symptom:** Everything works, but account genuinely has no positions
**Diagnostic:** Gateway `/portfolio/{id}/positions` returns empty array `[]`
**Fix:** Not a bug - account is actually empty

#### 5. **Response Format Mismatch**
**Symptom:** Data exists but Bridge can't parse it
**Diagnostic:** Check Bridge logs for JSON parse errors
**Fix:** Update Bridge parsing logic for IBKR response format

---

## Part F: Clean Architecture (Stable)

### Current Architecture (Good)

```
┌─────────────┐
│   Next.js   │
│   Port 3001 │
└──────┬──────┘
       │ HTTP + X-Bridge-Key header
       │
┌──────▼─────────────────┐
│   IBKR Bridge          │
│   FastAPI              │
│   Port 8000            │
│   Key: agentyc-...     │
└──────┬─────────────────┘
       │ HTTPS (self-signed)
       │ With session cookies
       │
┌──────▼─────────────────┐
│   IBKR Gateway         │
│   Client Portal        │
│   Port 5000            │
│   (managed by IBeam)   │
└────────────────────────┘
       ▲
       │
┌──────┴─────────────────┐
│   IBeam                │
│   Docker Container     │
│   Port 5001 (health)   │
│   Manages auth         │
└────────────────────────┘
```

### Data Flow (Stable Pattern)

1. **IBeam** → Authenticates with IBKR, maintains Gateway session
2. **Gateway** → Exposes IBKR API at `https://127.0.0.1:5000/v1/api/*`
3. **Bridge** → Proxies requests to Gateway, adds session cookies
4. **Next.js** → Calls Bridge endpoints with `X-Bridge-Key` header

### Key Principles (Non-Negotiable)

1. **Next.js NEVER calls Gateway directly** - Always goes through Bridge
2. **Bridge maintains Gateway session** - Uses cookies from IBeam
3. **IBeam manages authentication** - Single source of auth truth
4. **Bridge key is stable** - `agentyc-bridge-9u1Px` (no more changes)

---

## Complete Diagnostic Script

Save this as `/opt/ibkr-diagnostic.sh`:

```bash
#!/bin/bash

echo "========================================="
echo "IBKR Integration Diagnostic"
echo "========================================="

BRIDGE_KEY="agentyc-bridge-9u1Px"

# 1. IBeam Authentication Status
echo ""
echo "1. IBeam Authentication Status"
echo "--------------------------------"
cd /opt/ibeam
docker logs ibeam_ibeam_1 2>&1 | tail -30 | grep -i "authenticated\|connected\|session" || echo "No IBeam logs found"

# 2. Gateway Direct Check
echo ""
echo "2. Gateway Authentication (Direct)"
echo "--------------------------------"
GATEWAY_AUTH=$(curl -k -s https://127.0.0.1:5000/v1/api/iserver/auth/status 2>&1)
echo "$GATEWAY_AUTH" | jq '.' 2>/dev/null || echo "Gateway not responding or not JSON"

# 3. Gateway Accounts (Direct)
echo ""
echo "3. Gateway Accounts (Direct)"
echo "--------------------------------"
GATEWAY_ACCOUNTS=$(curl -k -s https://127.0.0.1:5000/v1/api/portfolio/accounts 2>&1)
echo "$GATEWAY_ACCOUNTS" | jq '.' 2>/dev/null || echo "Gateway accounts endpoint failed"

# 4. Bridge Health
echo ""
echo "4. Bridge Health"
echo "--------------------------------"
curl -s -H "X-Bridge-Key: $BRIDGE_KEY" http://127.0.0.1:8000/health | jq '.'

# 5. Bridge Account Endpoint
echo ""
echo "5. Bridge Account Endpoint"
echo "--------------------------------"
curl -s -H "X-Bridge-Key: $BRIDGE_KEY" http://127.0.0.1:8000/account | jq '.'

# 6. Bridge Positions Endpoint
echo ""
echo "6. Bridge Positions Endpoint"
echo "--------------------------------"
curl -s -H "X-Bridge-Key: $BRIDGE_KEY" http://127.0.0.1:8000/positions | jq '.'

# 7. Next.js Status API
echo ""
echo "7. Next.js Status API"
echo "--------------------------------"
curl -s https://agentyctrader.com/api/ibkr/status | jq '.'

# 8. Next.js Account API
echo ""
echo "8. Next.js Account API"
echo "--------------------------------"
curl -s https://agentyctrader.com/api/ibkr/account | jq '.'

# 9. Bridge Service Status
echo ""
echo "9. Bridge Service Status"
echo "--------------------------------"
sudo systemctl status ibkr-bridge --no-pager | tail -5

# 10. Bridge Logs (Recent)
echo ""
echo "10. Bridge Logs (Last 10 lines)"
echo "--------------------------------"
sudo journalctl -u ibkr-bridge -n 10 --no-pager
```

**Run it:**
```bash
chmod +x /opt/ibkr-diagnostic.sh
sudo /opt/ibkr-diagnostic.sh
```

---

## Fix Checklist (Based on Diagnostic Results)

### If IBeam Not Authenticated:
- [ ] Check IBeam configuration
- [ ] Restart IBeam: `cd /opt/ibeam && docker-compose restart`
- [ ] Check IBeam logs: `docker logs -f ibeam_ibeam_1`
- [ ] Verify credentials are correct

### If Gateway Authenticated but Bridge Can't Get Data:
- [ ] Verify Bridge `ib_get()` function maintains cookies
- [ ] Check Bridge logs for specific error messages
- [ ] Test Bridge account endpoint directly with curl
- [ ] Verify Bridge is calling correct IBKR endpoints

### If Bridge Works but Next.js Gets Empty Data:
- [ ] Check Next.js logs for API errors
- [ ] Verify `IBKR_BRIDGE_KEY` in `.env.production`
- [ ] Test Next.js `/api/ibkr/account` endpoint directly
- [ ] Check if Next.js is parsing Bridge response correctly

### If Everything Works but No Positions:
- [ ] Account genuinely has no positions (not a bug)
- [ ] Verify with IBKR web portal directly

---

## Stable Configuration (Final)

### Bridge `app.py`
```python
BRIDGE_KEY = "agentyc-bridge-9u1Px"  # STABLE - DO NOT CHANGE
IB_GATEWAY_URL = "https://localhost:5000/v1/api"
```

### Next.js `.env.production`
```bash
IBKR_BRIDGE_URL=http://127.0.0.1:8000
IBKR_BRIDGE_KEY=agentyc-bridge-9u1Px  # STABLE - DO NOT CHANGE
```

### Verification Commands (Quick Check)
```bash
# Should all work:
curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health
curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/account
curl https://agentyctrader.com/api/ibkr/status
```

---

**Status:** Ready for diagnostic execution  
**Next Step:** Run diagnostic script and share results for targeted fix

