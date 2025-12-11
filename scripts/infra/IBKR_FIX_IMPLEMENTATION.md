# IBKR Fix Implementation - Bridge Cookie Loading

## Problem Summary

- ✅ IBeam is authenticated (has active session)
- ❌ Bridge can't access Gateway (gets "Access Denied")
- **Root Cause:** Bridge doesn't have IBeam's session cookies

---

## Implementation Steps

### Step 1: Investigate IBeam Cookie Storage

Run these commands on the server to find where IBeam stores cookies:

```bash
# Check IBeam container filesystem
docker exec ibeam_ibeam_1 find / -name "*cookie*" 2>/dev/null | head -20
docker exec ibeam_ibeam_1 find /srv/ibeam -name "*cookie*" -o -name "*session*" 2>/dev/null

# Check IBeam output directory
docker exec ibeam_ibeam_1 ls -la /srv/ibeam/out/ 2>/dev/null

# Check if cookies are in browser profile
docker exec ibeam_ibeam_1 find /root -name "*cookie*" 2>/dev/null

# Check IBeam logs for cookie paths
docker logs ibeam_ibeam_1 2>&1 | grep -i cookie | head -10
```

**Expected findings:**
- Cookies might be in Selenium profile: `/root/.local/share/ibeam/` or similar
- Or in IBeam's data directory
- Or exposed via IBeam's status endpoint (check IBeam API)

---

### Step 2: Update Bridge app.py

**Replace the `ib_get()` function and add cookie loading:**

```python
# Add at top of file, after imports
import time
from pathlib import Path
from typing import Dict, Any

# Global client and cookie management
_gateway_client: httpx.AsyncClient | None = None
_last_cookie_load: float = 0
_cookie_refresh_interval = 60  # Reload cookies every 60 seconds

# IBeam cookie locations to check (adjust based on Step 1 findings)
IBEAM_COOKIE_PATHS = [
    Path("/opt/ibeam/out/cookies.json"),  # If IBeam writes cookies here
    Path("/var/lib/docker/volumes/ibeam_cookies/_data/cookies.json"),  # Docker volume
    # Add more paths based on Step 1 findings
]

def load_ibeam_cookies() -> Dict[str, Any]:
    """
    Load cookies from IBeam storage.
    Returns cookies in format for httpx.AsyncClient
    """
    cookies = {}
    
    # Try to read from known cookie file locations
    for cookie_path in IBEAM_COOKIE_PATHS:
        if cookie_path.exists():
            try:
                with open(cookie_path, 'r') as f:
                    cookie_data = json.load(f)
                    
                    # Handle different cookie storage formats
                    if isinstance(cookie_data, list):
                        # List of cookie objects
                        for cookie in cookie_data:
                            domain = cookie.get('domain', '127.0.0.1')
                            name = cookie.get('name')
                            value = cookie.get('value')
                            if name and value:
                                cookies[name] = value
                    elif isinstance(cookie_data, dict):
                        # Dictionary format
                        for name, value in cookie_data.items():
                            cookies[name] = value
                
                print(f"Loaded {len(cookies)} cookies from {cookie_path}")
                return cookies
            except Exception as e:
                print(f"Warning: Could not load cookies from {cookie_path}: {e}")
                continue
    
    # Fallback: Try to read from IBeam Docker container
    try:
        import subprocess
        result = subprocess.run(
            ['docker', 'exec', 'ibeam_ibeam_1', 'cat', '/srv/ibeam/out/cookies.json'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            cookie_data = json.loads(result.stdout)
            # Parse and convert cookies...
            print(f"Loaded cookies from IBeam container")
            return cookies
    except Exception as e:
        print(f"Warning: Could not load cookies from IBeam container: {e}")
    
    print("Warning: No IBeam cookies found. Gateway requests may fail.")
    return cookies

def get_gateway_client() -> httpx.AsyncClient:
    """Get or create persistent Gateway client with IBeam cookies"""
    global _gateway_client, _last_cookie_load
    
    current_time = time.time()
    
    # Reload cookies periodically or on first use
    if _gateway_client is None or (current_time - _last_cookie_load) > _cookie_refresh_interval:
        cookies = load_ibeam_cookies()
        
        # Close old client if recreating
        if _gateway_client is not None:
            # Note: In production, properly close old client
            pass
        
        _gateway_client = httpx.AsyncClient(
            verify=False,  # Accept self-signed cert
            timeout=30.0,
            follow_redirects=True,
            cookies=cookies,  # Use IBeam's cookies
        )
        _last_cookie_load = current_time
        print(f"Created Gateway client with {len(cookies)} cookies")
    
    return _gateway_client

async def ib_get(path: str) -> dict:
    """
    Call IBKR Client Portal Gateway GET /v1/api/{path}
    Uses persistent client with IBeam session cookies
    """
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
        # Check if it's an auth issue
        if resp.status_code == 404 and "Access Denied" in resp.text:
            raise HTTPException(
                status_code=401,
                detail=f"IBKR gateway authentication failed. IBeam session may have expired. Status: {resp.status_code}, Response: {resp.text}"
            )
        
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"IBKR gateway error {resp.status_code}: {resp.text}"
        )
    
    return resp.json()
```

---

### Step 3: Alternative - Use IBeam Status API

If IBeam exposes session info via API, Bridge can use that:

```python
async def get_ibeam_session_info() -> Dict[str, Any]:
    """Get session info from IBeam status API"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Check if IBeam has a status endpoint
            resp = await client.get("http://127.0.0.1:5001/status")
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return {}
```

---

### Step 4: Test Implementation

After updating Bridge:

```bash
# Restart Bridge
sudo systemctl restart ibkr-bridge

# Check Bridge logs for cookie loading messages
sudo journalctl -u ibkr-bridge -n 20 --no-pager

# Test Bridge account endpoint
curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/account | jq

# Expected: Should return account data, not "Access Denied"
```

---

## If Cookies Still Not Found

### Option A: Manual Cookie Extraction

1. Use browser to login to Gateway
2. Extract cookie from browser dev tools
3. Store in file: `/opt/ibeam/out/cookies.json`
4. Bridge reads from that file

### Option B: IBeam Cookie Sync Script

Create a script that runs in IBeam container to export cookies:

```python
# /opt/ibeam/export_cookies.py (runs in IBeam)
# This extracts cookies from Selenium and writes to shared volume
```

---

## Testing Checklist

- [ ] IBeam cookie location identified
- [ ] Bridge can read cookie file
- [ ] Bridge loads cookies into httpx client
- [ ] Bridge `/account` endpoint returns data (not "Access Denied")
- [ ] Bridge `/positions` endpoint returns data
- [ ] Next.js `/api/ibkr/account` returns data
- [ ] Cookies refresh periodically (every 60s)

---

## Expected Results After Fix

**Before:**
```json
{"detail": "IBKR gateway error 404: Access Denied"}
```

**After:**
```json
{
  "ok": true,
  "accountId": "DU123456",
  "balance": 50000.0,
  "equity": 51000.0,
  "unrealizedPnl": 1000.0,
  "buyingPower": 100000.0
}
```

---

**Status:** Ready for implementation  
**Priority:** CRITICAL - This is blocking all IBKR data flow

