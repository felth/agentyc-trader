# Step 3: IBeam Cookie Dump Modification Guide

## Purpose

Modify IBeam to dump all cookies from Selenium WebDriver immediately after successful authentication. This gives us the REAL cookie set that Gateway expects.

---

## Finding IBeam Source Code

### Inside Container

```bash
# Find IBeam Python source files
docker exec ibeam_ibeam_1 find /srv -name "*.py" -type f | grep -E "(login|gateway|auth)" | head -20

# Check structure
docker exec ibeam_ibeam_1 ls -la /srv/ibeam/src/

# View main files
docker exec ibeam_ibeam_1 cat /srv/ibeam/src/gateway_client.py | head -50
docker exec ibeam_ibeam_1 cat /srv/ibeam/src/handlers/login_handler.py | head -50
```

### On Host (if mounted)

```bash
# Check if IBeam source is mounted from host
cd /opt/ibeam
ls -la

# Look for IBeam repo clone
find . -name "*.py" -path "*/ibeam/src/*" | head -20
```

### IBeam Repository (if building from source)

If you're building IBeam from source, the code will be in:
- Clone: `git clone https://github.com/Voyz/ibeam`
- Or check: `/opt/ibeam` or wherever you cloned it

---

## Hook Point: Where Authentication Succeeds

IBeam's authentication flow likely looks like:

```
gateway_client.py
  └─> start_and_authenticate()
       └─> strategy_handler.py
            └─> try_authenticating()
                 └─> login_handler.py
                      └─> login() → SUCCESS
                           └─> status.authenticated = True
```

**We need to hook RIGHT AFTER `status.authenticated = True` is set.**

---

## Code Addition: Cookie Dump Function

Add this function to IBeam's codebase (likely in `handlers/login_handler.py` or `gateway_client.py`):

```python
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict

def dump_authenticated_cookies(driver, output_dir: str = "/srv/outputs") -> Optional[Dict]:
    """
    Dump all cookies from Selenium WebDriver after successful authentication.
    
    Args:
        driver: Selenium WebDriver instance
        output_dir: Directory to save cookie dump JSON
        
    Returns:
        Dictionary with cookie data, or None on error
    """
    try:
        # Get all cookies from WebDriver
        cookies = driver.get_cookies()
        
        # Filter Gateway-specific cookies (domain contains localhost, 127.0.0.1, or ibkr)
        gateway_domain_keywords = ["127.0.0.1", "localhost", "interactivebrokers", "ibkr"]
        gateway_cookies = [
            c for c in cookies 
            if any(keyword in str(c.get("domain", "")).lower() 
                   for keyword in gateway_domain_keywords)
        ]
        
        # Build output data
        cookie_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "all_cookies": cookies,
            "cookie_count": len(cookies),
            "cookie_names": [c.get("name") for c in cookies],
            "cookie_name_value_pairs": {c.get("name"): c.get("value") for c in cookies},
            "gateway_cookies": gateway_cookies,
            "gateway_cookie_count": len(gateway_cookies),
            "gateway_cookie_names": [c.get("name") for c in gateway_cookies],
        }
        
        # Save to JSON file
        output_path = Path(output_dir) / "authenticated_cookies.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(cookie_data, f, indent=2)
        
        # Log to stdout (IBeam will capture in logs)
        print(f"[COOKIE_DUMP] ✓ Dumped {len(cookies)} cookies to {output_path}")
        print(f"[COOKIE_DUMP] Cookie names: {', '.join(cookie_data['cookie_names'])}")
        if gateway_cookies:
            print(f"[COOKIE_DUMP] Gateway cookies: {', '.join(cookie_data['gateway_cookie_names'])}")
        
        return cookie_data
        
    except Exception as e:
        print(f"[COOKIE_DUMP] ✗ Failed to dump cookies: {e}")
        import traceback
        print(f"[COOKIE_DUMP] Traceback: {traceback.format_exc()}")
        return None
```

---

## Integration Points (Choose One)

### Option A: In `login_handler.py` (After Successful Login)

Find where login succeeds and add cookie dump:

```python
# In handlers/login_handler.py

def login(self) -> Tuple[bool, bool]:
    """... existing login code ..."""
    
    # ... existing login logic ...
    
    if login_successful:
        # EXISTING CODE: Set authenticated status
        status.authenticated = True
        
        # NEW CODE: Dump cookies immediately after auth success
        try:
            dump_authenticated_cookies(self.driver)
        except Exception as e:
            # Non-fatal - log but don't fail auth
            print(f"[COOKIE_DUMP] Warning: Could not dump cookies: {e}")
        
        return (True, False)  # success, no shutdown
```

### Option B: In `gateway_client.py` (After Auth Check Passes)

Find where authentication is confirmed:

```python
# In gateway_client.py

async def start_and_authenticate(self):
    """... existing code ..."""
    
    success, shutdown, status = self.strategy_handler.try_authenticating(...)
    
    if success and status.authenticated:
        # NEW CODE: Dump cookies after auth confirmed
        try:
            # Get driver from login handler or strategy handler
            driver = self.strategy_handler.login_handler.driver  # Adjust path as needed
            dump_authenticated_cookies(driver)
        except Exception as e:
            print(f"[COOKIE_DUMP] Warning: Could not dump cookies: {e}")
    
    return success, shutdown, status
```

### Option C: In `strategy_handler.py` (After Strategy B Succeeds)

If Strategy B is the authentication method:

```python
# In handlers/strategy_handler.py

def _authentication_strategy_B(self, status, request_retries):
    """... existing code ..."""
    
    success, shutdown = self.login_handler.login()
    
    if success:
        # EXISTING CODE: Confirm authentication
        status.authenticated = True
        
        # NEW CODE: Dump cookies
        try:
            driver = self.login_handler.driver  # Adjust as needed
            dump_authenticated_cookies(driver)
        except Exception as e:
            print(f"[COOKIE_DUMP] Warning: Could not dump cookies: {e}")
    
    return success, shutdown
```

---

## Testing the Modification

### 1. Make the Change

- Add `dump_authenticated_cookies()` function to appropriate file
- Add call to function after auth success
- If building from source: rebuild IBeam image
- If modifying in container: restart container

### 2. Trigger Authentication

```bash
# Restart IBeam to trigger login
cd /opt/ibeam
docker-compose restart ibeam

# Watch logs for cookie dump
docker logs -f ibeam_ibeam_1 | grep -E "COOKIE_DUMP|authenticated"
```

### 3. Retrieve Cookie Dump

```bash
# Copy cookie dump file from container
docker cp ibeam_ibeam_1:/srv/outputs/authenticated_cookies.json ./authenticated_cookies.json

# Or view directly
docker exec ibeam_ibeam_1 cat /srv/outputs/authenticated_cookies.json | jq '.'
```

### 4. Verify Cookie Data

```bash
# Check what cookies were captured
cat authenticated_cookies.json | jq '.cookie_names'
cat authenticated_cookies.json | jq '.gateway_cookie_names'
cat authenticated_cookies.json | jq '.cookie_name_value_pairs'
```

**Expected output:**
- Multiple cookie names (not just JSESSIONID)
- Values for each cookie
- Gateway-specific cookies identified

---

## Alternative: Quick Test Without Modifying IBeam

If modifying IBeam is too complex, try this approach:

### Use IBeam's Existing Output/Log System

1. **Check if IBeam already logs cookies somewhere:**
   ```bash
   docker logs ibeam_ibeam_1 | grep -i cookie
   ```

2. **Check IBeam outputs directory:**
   ```bash
   docker exec ibeam_ibeam_1 ls -la /srv/outputs/
   ```

3. **Look for any JSON files that might contain session info:**
   ```bash
   docker exec ibeam_ibeam_1 find /srv -name "*.json" -type f
   ```

### Use Browser DevTools (If IBeam Exposes WebDriver Port)

If IBeam runs WebDriver with remote debugging enabled:

```bash
# Check if WebDriver remote port is exposed
docker port ibeam_ibeam_1 | grep -E "4444|9222|9515"

# Connect to WebDriver and extract cookies
# (Requires selenium library installed on host)
```

---

## Next Steps After Cookie Dump

Once you have `authenticated_cookies.json`:

1. **Identify required cookie names** (not just JSESSIONID)
2. **Update Session API v2** to read from this file (Step 4)
3. **Test `/test-gateway`** with all cookies
4. **Verify Gateway accepts the cookie set**

---

## Files to Modify

- [ ] IBeam source: Add `dump_authenticated_cookies()` function
- [ ] IBeam source: Hook function call after auth success
- [ ] Test: Trigger login and retrieve cookie dump
- [ ] Verify: Check cookie names and values

---

**Status:** Ready for implementation  
**Complexity:** Medium (requires IBeam code access)  
**Risk:** Low (dump function is non-fatal if it fails)

