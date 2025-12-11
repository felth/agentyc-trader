# IBKR Stabilization - Recommended Fixes

## Summary of Issues & Solutions

Based on the diagnostic, here are the most likely problems and fixes:

---

## Issue 1: Bridge May Not Be Maintaining Session Cookies

### Problem
The Bridge's `ib_get()` function creates a new `httpx.AsyncClient` for each request. This means **cookies are not persisted** between requests, so the Gateway session might not be maintained.

### Current Code (Problematic)
```python
async def ib_get(path: str) -> dict:
    url = f"{IB_GATEWAY_URL.rstrip('/')}/{path.lstrip('/')}"
    try:
        async with httpx.AsyncClient(verify=False, timeout=10) as client:
            resp = await client.get(url)
    # ... rest of code
```

### Solution: Use Persistent Client with Cookies

**Option A: Module-level client (Recommended)**
```python
# At module level, create a persistent client
import httpx

_gateway_client: httpx.AsyncClient | None = None

def get_gateway_client() -> httpx.AsyncClient:
    """Get or create persistent Gateway client with cookie support"""
    global _gateway_client
    if _gateway_client is None:
        _gateway_client = httpx.AsyncClient(
            verify=False,  # Accept self-signed cert
            timeout=30.0,
            follow_redirects=True,
            cookies={},  # Will maintain cookies automatically
        )
    return _gateway_client

async def ib_get(path: str) -> dict:
    """Call IBKR Gateway endpoint using persistent client with cookies"""
    url = f"{IB_GATEWAY_URL.rstrip('/')}/{path.lstrip('/')}"
    client = get_gateway_client()
    
    try:
        resp = await client.get(url)
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"IBKR gateway connection error: {str(e)}"
        )
    
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"IBKR gateway error {resp.status_code}: {resp.text}"
        )
    
    return resp.json()
```

**Option B: Pass IBeam session cookies explicitly**
```python
# If IBeam stores cookies somewhere, read them and pass to Bridge
# This is more complex but ensures cookie sync
```

### Test After Fix
```bash
# Should return account data (not empty)
curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/account
```

---

## Issue 2: Gateway URL May Be Wrong

### Current Code
```python
IB_GATEWAY_URL = "https://localhost:5000/v1/api"
```

### Problem
`localhost` might not resolve correctly in some environments. Use `127.0.0.1` instead.

### Fix
```python
IB_GATEWAY_URL = "https://127.0.0.1:5000/v1/api"
```

---

## Issue 3: Account Endpoint May Need Error Handling

### Current Behavior
If `portfolio/accounts` returns an empty array `[]`, the Bridge raises an error. But this might be legitimate (no accounts), or might indicate auth failure.

### Better Error Handling
```python
@app.get("/account")
async def account(x_bridge_key: str = Header(None)):
    verify_key(x_bridge_key)
    
    try:
        # Get account list
        accounts_data = await ib_get("portfolio/accounts")
        
        # Check if we got a valid response (even if empty)
        if not isinstance(accounts_data, list):
            raise HTTPException(
                status_code=502,
                detail=f"IBKR returned unexpected account format: {type(accounts_data)}"
            )
        
        if not accounts_data:
            # Empty list - could mean no accounts or not authenticated
            return {
                "ok": False,
                "error": "No IBKR accounts found. Check authentication.",
                "accountId": None,
                "balance": 0.0,
                "equity": 0.0,
                "unrealizedPnl": 0.0,
                "buyingPower": 0.0,
            }
        
        # Continue with existing logic...
        acct = accounts_data[0]
        account_id = acct.get("accountId") or acct.get("id") or acct.get("account")
        
        if not account_id:
            raise HTTPException(
                status_code=500,
                detail="Unable to determine IBKR account id"
            )
        
        # Get summary and positions
        summary = await ib_get(f"portfolio/{account_id}/summary")
        positions_data = await ib_get(f"portfolio/{account_id}/positions")
        
        # ... rest of existing code ...
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Bridge account fetch failed: {str(e)}"
        )
```

---

## Issue 4: Add Diagnostic Endpoint to Bridge

### Add to Bridge `app.py`
```python
@app.get("/diagnostic")
async def diagnostic(x_bridge_key: str = Header(None)):
    """Diagnostic endpoint to check Gateway connectivity"""
    verify_key(x_bridge_key)
    
    results = {
        "bridge": {"ok": True, "service": "ibkr-bridge"},
        "gateway": {},
        "accounts": {},
    }
    
    # Test Gateway auth status
    try:
        auth_status = await ib_get("iserver/auth/status")
        results["gateway"] = {
            "ok": True,
            "authenticated": auth_status.get("authenticated", False),
            "connected": auth_status.get("connected", False),
            "status": auth_status,
        }
    except Exception as e:
        results["gateway"] = {
            "ok": False,
            "error": str(e),
        }
        return results
    
    # Test accounts endpoint
    try:
        accounts = await ib_get("portfolio/accounts")
        results["accounts"] = {
            "ok": True,
            "count": len(accounts) if isinstance(accounts, list) else 0,
            "data": accounts,
        }
    except Exception as e:
        results["accounts"] = {
            "ok": False,
            "error": str(e),
        }
    
    return results
```

### Test Diagnostic Endpoint
```bash
curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/diagnostic | jq
```

This will show:
- Is Gateway authenticated?
- Can we fetch accounts?
- What's the actual error?

---

## Recommended Implementation Order

1. **Fix cookie persistence** (Issue 1) - Most likely cause
2. **Add diagnostic endpoint** (Issue 4) - To verify fix
3. **Improve error handling** (Issue 3) - Better UX
4. **Fix Gateway URL** (Issue 2) - Minor improvement

---

## Verification After Fixes

```bash
# 1. Test diagnostic endpoint
curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" \
  http://127.0.0.1:8000/diagnostic | jq

# 2. Test account endpoint
curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" \
  http://127.0.0.1:8000/account | jq

# 3. Test Next.js endpoint
curl https://agentyctrader.com/api/ibkr/account | jq
```

**Expected Results:**
- Diagnostic shows `gateway.authenticated: true`
- Diagnostic shows `accounts.count > 0`
- Account endpoint returns actual balance/equity data
- Next.js endpoint returns same data

---

## If Still Not Working

If cookie persistence doesn't fix it, check:

1. **IBeam session cookies location**
   - Where does IBeam store cookies?
   - Can Bridge read them?
   - Are they being passed correctly?

2. **Gateway authentication requirements**
   - Does Gateway need specific headers?
   - Are there additional auth tokens?

3. **Account permissions**
   - Does the logged-in user have access to portfolio data?
   - Is it a paper account vs live account issue?

---

**Status:** Ready for implementation  
**Priority:** Fix cookie persistence first (Issue 1)

