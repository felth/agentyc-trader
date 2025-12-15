# IBKR Cookie Extraction Plan - Step-by-Step

## Current Problem

- Session API v2 returns only `JSESSIONID` (synthetic, from logs)
- Direct cookie test fails: `curl -sk -H "Cookie: JSESSIONID=..."` → "Access Denied"
- IBeam cookie DB not found (no Chrome profile directories)
- Need REAL cookies from Selenium WebDriver

---

## Step 1: Verify Gateway Authentication Status (Inside Container)

**Purpose:** Confirm Gateway is actually authenticated before chasing cookies.

### Diagnostic Commands

```bash
# Test 1: Auth status from inside container (most reliable)
docker exec -it ibeam_ibeam_1 sh -lc 'curl -sk https://localhost:5000/v1/api/iserver/auth/status'

# Expected if authenticated:
# {
#   "authenticated": true,
#   "connected": true,
#   "competing": false,
#   ...
# }

# Test 2: Tickle endpoint (simple auth check)
docker exec -it ibeam_ibeam_1 sh -lc 'curl -sk https://localhost:5000/v1/api/tickle'

# Expected if authenticated: JSON response with session info
# Expected if NOT authenticated: 401/403 or "Access Denied"

# Test 3: Portfolio accounts from inside container
docker exec -it ibeam_ibeam_1 sh -lc 'curl -sk https://localhost:5000/v1/api/portfolio/accounts'

# Expected if authenticated: Array of account objects
# Expected if NOT authenticated: Empty array [] or "Access Denied"
```

### Interpretation

- **If authenticated=true from inside container:**
  - Gateway session exists, but cookies aren't accessible from host
  - Proceed to Step 2 (extract cookies from Selenium)

- **If authenticated=false from inside container:**
  - Gateway is NOT authenticated (fix login stability FIRST)
  - Stop here, fix IBeam login/timeout issues before cookie extraction

---

## Step 2: Reduce IBeam Retries (Stop Auth Prompt Spam)

**Purpose:** Prevent IBKR from seeing repeated login attempts while troubleshooting.

### Option A: Pause IBeam Maintenance Loop (Recommended for Testing)

```bash
# Stop IBeam container entirely
cd /opt/ibeam
docker-compose stop ibeam

# Or if you want to keep Gateway running but stop maintenance:
# Comment out the maintenance scheduler in IBeam code temporarily
# Or set IBEAM_MAINTENANCE_INTERVAL to a very large number
```

### Option B: Increase Timeout (Reduce Failed Attempts)

```bash
# In IBeam .env or docker-compose.yml, add:
IBEAM_PAGE_LOAD_TIMEOUT=120  # Increase from default (likely 60)
IBEAM_MAINTENANCE_INTERVAL=3600  # Check once per hour instead of every minute
```

### Option C: Disable Auto-Restart on Failure

If IBeam keeps retrying immediately, add to docker-compose.yml:
```yaml
services:
  ibeam:
    restart: "no"  # Or "unless-stopped" instead of "always"
```

**Recommendation:** Stop IBeam container during cookie extraction testing, restart manually when needed.

---

## Step 3: Extract Real Cookies from Selenium WebDriver

**Purpose:** Get the actual cookie set that Gateway expects (not just JSESSIONID from logs).

### Approach: Modify IBeam to Dump Cookies After Successful Auth

**Where IBeam stores its code:**
- Inside container: `/srv/ibeam/src/`
- Likely mounted from host or built into image
- Check: `docker exec ibeam_ibeam_1 find /srv -name "*.py" | head -10`

### Hook Point: After Successful Authentication

IBeam likely has a flow like:
1. `gateway_client.py` → `start_and_authenticate()`
2. `handlers/strategy_handler.py` → `try_authenticating()`
3. `handlers/login_handler.py` → `login()` → success

**Proposed modification:** Add cookie dump right after auth success.

### Code Addition (to be placed in IBeam source)

```python
# In handlers/login_handler.py or gateway_client.py, after successful auth:

import json
from pathlib import Path

def dump_authenticated_cookies(driver, output_dir="/srv/outputs"):
    """
    Dump all cookies from Selenium WebDriver after successful authentication.
    This helps identify which cookies Gateway actually requires.
    """
    try:
        cookies = driver.get_cookies()
        
        # Also try to get cookies for Gateway domain specifically
        gateway_cookies = driver.get_cookies()  # Already includes all cookies
        
        # Save to JSON file
        output_path = Path(output_dir) / "authenticated_cookies.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        cookie_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "all_cookies": cookies,
            "cookie_count": len(cookies),
            "cookie_names": [c.get("name") for c in cookies],
            "gateway_domain_cookies": [
                c for c in cookies 
                if "127.0.0.1" in str(c.get("domain", "")) 
                or "localhost" in str(c.get("domain", ""))
                or "interactivebrokers" in str(c.get("domain", ""))
            ]
        }
        
        with open(output_path, 'w') as f:
            json.dump(cookie_data, f, indent=2)
        
        print(f"[COOKIE_DUMP] Saved {len(cookies)} cookies to {output_path}")
        print(f"[COOKIE_DUMP] Cookie names: {', '.join(cookie_data['cookie_names'])}")
        
        return cookie_data
    except Exception as e:
        print(f"[COOKIE_DUMP] Failed to dump cookies: {e}")
        return None
```

**Placement:** Call `dump_authenticated_cookies(driver)` right after:
- `status.authenticated = True` is set
- OR after successful login in `login_handler.py`
- OR when `GatewayClient` confirms authentication

### Alternative: Quick Test Script (No IBeam Modification)

If modifying IBeam is complex, create a standalone script that connects to the Selenium WebDriver:

```python
# scripts/ibeam/dump_cookies.py
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import json
import sys

# IBeam likely runs Selenium with remote WebDriver or local
# Check IBeam logs for WebDriver connection string

try:
    # Option 1: Connect to existing WebDriver session (if IBeam exposes it)
    # This requires IBeam to run WebDriver in "remote" mode
    driver = webdriver.Remote(
        command_executor='http://127.0.0.1:4444/wd/hub',  # Check IBeam config
        options=Options()
    )
    
    # Option 2: If IBeam uses local WebDriver, we might need to access same session
    # This is trickier - might need to share session ID
    
    cookies = driver.get_cookies()
    print(json.dumps(cookies, indent=2))
    
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
```

**Note:** This alternative is harder because Selenium sessions are usually isolated.

### Best Approach: Modify IBeam Source

1. **Locate IBeam source:**
   ```bash
   docker exec ibeam_ibeam_1 find /srv -name "login_handler.py" -o -name "gateway_client.py"
   ```

2. **Add cookie dump function** (code above)

3. **Call it after auth success:**
   ```python
   # After successful authentication
   if status.authenticated:
       dump_authenticated_cookies(driver)
   ```

4. **Rebuild/restart IBeam** and trigger login

5. **Retrieve dump:**
   ```bash
   docker exec ibeam_ibeam_1 cat /srv/outputs/authenticated_cookies.json
   # Or copy out:
   docker cp ibeam_ibeam_1:/srv/outputs/authenticated_cookies.json ./authenticated_cookies.json
   ```

---

## Step 4: Update Session API v2 with Real Cookies

**After Step 3 yields real cookie names/values:**

1. **Parse `authenticated_cookies.json`** to identify all required cookies
2. **Update Session API v2** to return ALL cookies (not just JSESSIONID):

```python
# In session-api-v2.py

def get_all_gateway_cookies() -> Dict[str, str]:
    """
    Get all cookies required for Gateway authentication.
    This should return the cookie dict from IBeam's authenticated session.
    """
    # Option A: Read from IBeam's cookie dump file
    cookie_dump_path = Path("/srv/outputs/authenticated_cookies.json")
    if cookie_dump_path.exists():
        with open(cookie_dump_path) as f:
            data = json.load(f)
            # Convert Selenium cookie format to dict
            cookies = {}
            for cookie in data.get("all_cookies", []):
                cookies[cookie["name"]] = cookie["value"]
            return cookies
    
    # Option B: Connect to Selenium directly (if possible)
    # ... 
    
    # Fallback: empty (should not happen if Step 3 worked)
    return {}
```

3. **Test Session API:**
   ```bash
   curl -s http://127.0.0.1:5002/session-cookies | jq
   # Should show ALL cookies, not just JSESSIONID
   ```

4. **Test Gateway with real cookies:**
   ```bash
   curl -s http://127.0.0.1:5002/test-gateway | jq
   # Goal: gateway_status: 200, not 404/Access Denied
   ```

---

## Step 5: Integrate Bridge (ONLY AFTER Step 4 Works)

**Only proceed once `/test-gateway` returns 200 OK.**

Then update Bridge `ib_get()` to:
1. Fetch cookies from Session API v2
2. Use persistent httpx client with cookies
3. Make Gateway requests

---

## Execution Order

1. ✅ **Step 1:** Test Gateway auth from inside container (`docker exec ... curl`)
2. ✅ **Step 2:** Pause IBeam retries (stop container or increase intervals)
3. ✅ **Step 3:** Modify IBeam to dump cookies after auth success
4. ✅ **Step 4:** Update Session API v2 to return all cookies
5. ✅ **Step 5:** Test `/test-gateway` returns 200
6. ⏸️ **Step 6:** Only then integrate Bridge (persistent client + cookie fetching)

---

## Files to Create/Modify

- [ ] `scripts/infra/IBKR_COOKIE_EXTRACTION_PLAN.md` (this file)
- [ ] IBeam modification: Add `dump_authenticated_cookies()` function
- [ ] Session API v2: Update to read from cookie dump file
- [ ] Test scripts: Commands to verify each step

---

**Status:** Ready for Step 1 execution  
**Blockers:** None - proceed with diagnostic commands

