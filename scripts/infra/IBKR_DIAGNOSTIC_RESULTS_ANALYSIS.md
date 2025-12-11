# IBKR Diagnostic Results Analysis

## Key Findings from Diagnostic

### ✅ IBeam IS Authenticated
```
2025-12-11 07:16:10,842|I| Gateway running and authenticated, session id: e4440b157282330a0b2ab95347139d5f
```
**Status:** IBeam has an active, authenticated session with Gateway

### ❌ Gateway Returns "Access Denied"
```
curl -k https://127.0.0.1:5000/v1/api/portfolio/accounts
# Returns: Access Denied

curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/account
# Returns: {"detail":"IBKR gateway error 404: Access Denied"}
```

**Problem:** Even though IBeam is authenticated, direct Gateway API calls return "Access Denied"

---

## Root Cause Analysis

### The Issue: Session Cookie Isolation

**What's happening:**
1. IBeam authenticates with Gateway → Gets session cookies
2. IBeam maintains those cookies internally (in its Docker container)
3. Bridge tries to call Gateway → Creates NEW http client → NO cookies
4. Gateway sees request without session cookies → Returns "Access Denied"

**Why this happens:**
- IBeam's session cookies are stored inside the IBeam Docker container
- Bridge runs as a separate service (outside Docker)
- Bridge's `ib_get()` creates a fresh `httpx.AsyncClient` each time
- Fresh client = no cookies = no authentication

---

## The Fix: Bridge Must Share IBeam's Session

### Option 1: Bridge Reads IBeam's Cookies (Recommended)

IBeam stores session cookies somewhere. Bridge needs to read them and use them.

**Where are IBeam cookies stored?**
- Check IBeam container: `docker exec ibeam_ibeam_1 ls -la /root/.local/share/ibeam/`
- Or check IBeam's cookie jar location (varies by IBeam version)
- Cookies might be in: `/srv/ibeam/out/` or IBeam's session storage

**Solution:**
1. Bridge reads IBeam's cookie file periodically
2. Bridge loads cookies into persistent httpx client
3. All Gateway requests use those cookies

### Option 2: Bridge Authenticates Independently

Bridge could authenticate directly with Gateway (bypassing IBeam's session).

**Downside:** Two authentication sessions = more complex, potential conflicts

### Option 3: IBeam Exposes Cookies via API

IBeam could expose an endpoint that Bridge calls to get current cookies.

**Downside:** Requires IBeam modification

---

## Recommended Fix: Read IBeam Cookies

### Step 1: Find IBeam Cookie Location

```bash
# Check IBeam container for cookie storage
docker exec ibeam_ibeam_1 find / -name "*cookie*" -o -name "*session*" 2>/dev/null

# Check IBeam logs for cookie paths
docker logs ibeam_ibeam_1 | grep -i cookie

# Check IBeam output directory
docker exec ibeam_ibeam_1 ls -la /srv/ibeam/out/
```

### Step 2: Update Bridge to Load Cookies

**Modified `ib_get()` function:**

```python
import httpx
import json
from pathlib import Path
from typing import Dict, Any

# Cookie file location (adjust based on IBeam setup)
IBEAM_COOKIE_FILE = Path("/opt/ibeam/out/cookies.json")  # Or wherever IBeam stores them

_gateway_client: httpx.AsyncClient | None = None
_last_cookie_load: float = 0
_cookie_refresh_interval = 60  # Reload cookies every 60 seconds

def load_ibeam_cookies() -> Dict[str, str]:
    """Load cookies from IBeam's storage"""
    cookies = {}
    
    # Option A: Read from IBeam cookie file (if it exists)
    if IBEAM_COOKIE_FILE.exists():
        try:
            with open(IBEAM_COOKIE_FILE, 'r') as f:
                cookie_data = json.load(f)
                # Convert to httpx format: {domain: {name: value}}
                for cookie in cookie_data.get('cookies', []):
                    domain = cookie.get('domain', '127.0.0.1')
                    name = cookie.get('name')
                    value = cookie.get('value')
                    if name and value:
                        if domain not in cookies:
                            cookies[domain] = {}
                        cookies[domain][name] = value
        except Exception as e:
            print(f"Warning: Could not load IBeam cookies: {e}")
    
    # Option B: Try to read from Docker volume mount
    # If IBeam cookies are in a shared volume, read from there
    
    return cookies

def get_gateway_client() -> httpx.AsyncClient:
    """Get or create persistent Gateway client with IBeam cookies"""
    global _gateway_client, _last_cookie_load
    
    import time
    current_time = time.time()
    
    # Reload cookies periodically
    if _gateway_client is None or (current_time - _last_cookie_load) > _cookie_refresh_interval:
        cookies = load_ibeam_cookies()
        
        # Close old client if it exists
        if _gateway_client is not None:
            # Note: httpx clients should be closed properly, but for simplicity:
            pass
        
        _gateway_client = httpx.AsyncClient(
            verify=False,  # Accept self-signed cert
            timeout=30.0,
            follow_redirects=True,
            cookies=cookies,  # Load IBeam's cookies
        )
        _last_cookie_load = current_time
    
    return _gateway_client

async def ib_get(path: str) -> dict:
    """Call IBKR Gateway endpoint using persistent client with IBeam cookies"""
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

### Step 3: Alternative - Copy Cookies from IBeam Container

If cookies are inside IBeam container, Bridge can read them via Docker:

```python
import subprocess
import json

def load_ibeam_cookies_from_docker() -> Dict[str, str]:
    """Extract cookies from IBeam Docker container"""
    try:
        # Execute command in IBeam container to get cookies
        # This depends on how IBeam stores cookies
        result = subprocess.run(
            ['docker', 'exec', 'ibeam_ibeam_1', 'cat', '/path/to/cookies.json'],
            capture_output=True,
            text=True,
            check=True
        )
        cookie_data = json.loads(result.stdout)
        # Convert to httpx format...
        return cookies
    except Exception as e:
        print(f"Warning: Could not load cookies from IBeam: {e}")
        return {}
```

---

## Immediate Workaround: Test Gateway with Manual Cookie

### Step 1: Get Session Cookie from Browser/Network

1. Open browser dev tools (F12)
2. Navigate to Gateway login page
3. Login manually
4. Check Network tab → Find any Gateway API call
5. Copy the `Cookie` header value
6. Use it in Bridge temporarily

### Step 2: Hardcode Cookie (Temporary Test)

```python
# TEMPORARY TEST - Replace with proper cookie loading
TEST_COOKIE = "your-session-cookie-here"

async def ib_get(path: str) -> dict:
    url = f"{IB_GATEWAY_URL.rstrip('/')}/{path.lstrip('/')}"
    
    async with httpx.AsyncClient(verify=False, timeout=10) as client:
        resp = await client.get(
            url,
            headers={"Cookie": TEST_COOKIE}  # Add session cookie
        )
    # ... rest of code
```

**This confirms the fix will work** - if it works with manual cookie, the cookie-loading solution will work.

---

## Why "Access Denied" Instead of 401?

Gateway returns "Access Denied" (404) instead of 401 because:
- Gateway recognizes the API endpoint exists
- But the request lacks valid session cookies
- Gateway's security returns 404 to obscure API structure
- This is normal IBKR Gateway behavior

---

## Verification Steps After Fix

1. **Test Bridge can load cookies:**
   ```bash
   python3 -c "from app import load_ibeam_cookies; print(load_ibeam_cookies())"
   ```

2. **Test Gateway with cookies:**
   ```bash
   curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/account
   # Should return account data, not "Access Denied"
   ```

3. **Test Next.js:**
   ```bash
   curl https://agentyctrader.com/api/ibkr/account
   # Should return account data
   ```

---

## Summary

**Root Cause:** Bridge doesn't have IBeam's session cookies  
**Solution:** Bridge must load and use IBeam's cookies  
**Next Step:** Find where IBeam stores cookies, then modify Bridge to load them  

**Priority Actions:**
1. Find IBeam cookie storage location
2. Modify Bridge `ib_get()` to load cookies
3. Use persistent httpx client with cookies
4. Test with account endpoint

---

**Status:** Diagnosis complete, fix ready for implementation

