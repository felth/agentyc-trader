# IBKR Cookie Analysis - Key Findings

## Diagnostic Results

### 1. Bridge Health Check Issue
```bash
curl -s -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health
# Returns: NOTHING (no output)
```

**Problem:** Bridge health endpoint returned no output. This suggests:
- Bridge might not be responding
- Or response is empty/invalid
- Or there's a connectivity issue

**Action needed:** Check if Bridge is actually running and responding.

### 2. IBeam Cookie Search Results
```
=== ENV cookie vars ===
no cookie env vars

=== Looking for cookie files ===
no cookie files found anywhere
```

**Key Finding:** IBeam doesn't store cookies as files.

## Why No Cookie Files?

IBeam uses **Selenium WebDriver** (browser automation) to authenticate with IBKR Gateway. Selenium stores cookies in:

1. **Browser Profile Directory** (not as standalone files)
   - Chrome: Usually in `/root/.config/google-chrome/Default/Cookies` (SQLite database)
   - Firefox: Usually in `/root/.mozilla/firefox/.../cookies.sqlite`
   - Selenium profile: In Selenium's managed browser profile

2. **In-Memory** (during browser session)
   - Cookies may only exist while Selenium browser is running
   - Not persisted to filesystem in readable format

3. **Selenium Cookie Storage**
   - Selenium maintains cookies in its own format
   - Accessed via `driver.get_cookies()` method, not files

## The Real Problem

**IBeam's cookies are inside Selenium's browser session, not accessible as files.**

This means:
- Bridge can't just "read a cookie file"
- Cookies are only accessible via Selenium WebDriver API
- Bridge would need to somehow access IBeam's Selenium instance

## Solutions (Ranked by Feasibility)

### Solution 1: IBeam Exposes Session Token via API (RECOMMENDED)

**Modify IBeam** to expose a simple endpoint that returns session cookies/token.

**Implementation:**
- IBeam already has a status endpoint
- Add a new endpoint: `/session-cookies` that calls `driver.get_cookies()`
- Bridge calls this endpoint to get cookies
- Bridge uses cookies for Gateway requests

**Pros:**
- Clean separation of concerns
- IBeam manages authentication
- Bridge just consumes session info

**Cons:**
- Requires IBeam modification (or wrapper script)

### Solution 2: Shared Browser Profile Directory

**Configure IBeam and Bridge** to share the same browser profile.

**Implementation:**
- Mount Selenium profile directory as shared volume
- Bridge reads cookies from browser profile SQLite database
- Parse Chrome's `Cookies` SQLite file

**Pros:**
- No IBeam modification needed
- Direct cookie access

**Cons:**
- Complex (SQLite parsing)
- Browser profile format changes
- File locking issues possible

### Solution 3: Gateway Proxy Through IBeam

**Bridge doesn't call Gateway directly** - it calls IBeam, which proxies to Gateway.

**Implementation:**
- IBeam exposes proxy endpoints: `/proxy/portfolio/accounts`, `/proxy/portfolio/{id}/summary`
- IBeam's Selenium session handles authentication
- Bridge calls IBeam proxy endpoints (not Gateway)

**Pros:**
- IBeam handles all Gateway communication
- Bridge doesn't need cookies
- Simpler architecture

**Cons:**
- Requires IBeam proxy implementation
- More IBeam dependency

### Solution 4: Bridge Uses Selenium Too (NOT RECOMMENDED)

**Bridge also runs Selenium** to authenticate independently.

**Pros:**
- No IBeam dependency

**Cons:**
- Two authentication sessions (complex)
- More resource usage
- Potential conflicts

## Recommended Approach: Solution 1 (IBeam Session API)

### Step 1: Add IBeam Endpoint (Wrapper Script)

Create a simple Python script that runs alongside IBeam:

```python
# /opt/ibeam/session-api.py
from flask import Flask, jsonify
import requests
import os

app = Flask(__name__)

def get_ibeam_status():
    """Get IBeam status and extract session info"""
    try:
        # IBeam status endpoint
        resp = requests.get('http://127.0.0.1:5001/status', timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return None

@app.route('/session-info')
def session_info():
    """Return session cookies/info for Bridge"""
    status = get_ibeam_status()
    
    # If IBeam provides cookies in status, return them
    # Otherwise, return session ID and let Bridge construct cookies
    return jsonify({
        'session_id': status.get('session_id') if status else None,
        'authenticated': status.get('authenticated') if status else False,
        # If we can extract cookies from Selenium, include them here
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
```

### Step 2: Bridge Calls IBeam Session API

```python
# In Bridge app.py
async def get_ibeam_session_info():
    """Get session info from IBeam"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("http://127.0.0.1:5002/session-info")
            if resp.status_code == 200:
                return resp.json()
    except:
        pass
    return None

# Use session info to construct Gateway requests
```

## Alternative: Quick Workaround

Since IBeam logs show session ID: `e4440b157282330a0b2ab95347139d5f`, we could:

1. **Parse IBeam logs** for session ID
2. **Construct Gateway requests** with session ID in headers/cookies
3. **Test if Gateway accepts session ID directly**

But this is fragile - Gateway likely needs full cookie set.

## Immediate Action Items

1. **Verify Bridge is running:**
   ```bash
   sudo systemctl status ibkr-bridge
   curl -v http://127.0.0.1:8000/health
   ```

2. **Check if IBeam has session API:**
   ```bash
   curl http://127.0.0.1:5001/status
   # See what it returns
   ```

3. **Test Gateway with manual session:**
   - Use browser to login
   - Extract full cookie string from browser
   - Test Gateway API with that cookie
   - If it works, we know cookies are the solution

4. **Consider IBeam modification:**
   - Check IBeam source code
   - See if it exposes cookies anywhere
   - Or add endpoint to expose them

## Bottom Line

**Cookies are in Selenium's browser session, not files.** 

Bridge needs to either:
- Get cookies from IBeam via API (recommended)
- Or share IBeam's browser profile directory (complex)
- Or have IBeam proxy Gateway requests (architecture change)

The cleanest solution is having IBeam expose session cookies via a simple API endpoint.

---

**Status:** Analysis complete, solution options identified  
**Next Step:** Decide on approach (I recommend Solution 1: IBeam Session API)

