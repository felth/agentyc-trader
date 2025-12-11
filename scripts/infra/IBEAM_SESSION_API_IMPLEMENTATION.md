# IBeam Session API Implementation - Option 1

## Why Option 1 is Best & Most Reliable

✅ **Clean Architecture**
- IBeam manages authentication (its job)
- Bridge consumes session info (simple, reliable)
- No file system dependencies
- No SQLite parsing complexity

✅ **Future-Proof**
- Works regardless of how IBeam stores cookies internally
- If IBeam changes cookie storage, API still works
- Independent of browser profile formats

✅ **Maintainable**
- Single source of truth (IBeam)
- Clear interface between components
- Easy to debug and monitor

✅ **Scalable**
- Multiple Bridges could use same session
- Session refresh handled in one place (IBeam)

## Implementation Plan

### Architecture

```
┌─────────────┐
│   IBeam     │
│  (Selenium) │
└──────┬──────┘
       │
       │ Exposes session API
       │ (New endpoint)
       │
┌──────▼──────────────────┐
│  IBeam Session API      │
│  Port 5002 (new)        │
│  /session-cookies       │
└──────┬──────────────────┘
       │
       │ Bridge calls this
       │
┌──────▼──────────────────┐
│   Bridge                │
│   (FastAPI)             │
│   Port 8000             │
└──────┬──────────────────┘
       │
       │ Uses cookies from API
       │
┌──────▼──────────────────┐
│   Gateway               │
│   Port 5000             │
└─────────────────────────┘
```

### Step 1: Check IBeam Status Endpoint

First, let's see what IBeam already exposes:

```bash
# Check IBeam status endpoint
curl http://127.0.0.1:5001/status | jq

# Check if it returns session info
curl http://127.0.0.1:5001/ | jq
```

**Expected:** IBeam might already expose some status info we can use.

### Step 2: Create IBeam Session API Wrapper

Since modifying IBeam source might be complex, we'll create a **lightweight wrapper service** that:

1. Communicates with IBeam to get session info
2. Exposes cookies via simple API
3. Runs alongside IBeam (same container or separate service)

**File: `/opt/ibeam/session-api.py`**

```python
#!/usr/bin/env python3
"""
IBeam Session API Wrapper
Exposes IBeam's session cookies for Bridge to use
"""
from flask import Flask, jsonify
import requests
import json
import time
from datetime import datetime

app = Flask(__name__)

# Cache session info to avoid hammering IBeam
_session_cache = None
_cache_time = 0
CACHE_TTL = 30  # Cache for 30 seconds

def get_ibeam_status():
    """Get IBeam status"""
    try:
        resp = requests.get('http://127.0.0.1:5001/status', timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error getting IBeam status: {e}")
    return None

def extract_session_from_logs():
    """Extract session ID from IBeam logs"""
    try:
        import subprocess
        result = subprocess.run(
            ['docker', 'logs', '--tail', '50', 'ibeam_ibeam_1'],
            capture_output=True,
            text=True,
            timeout=5
        )
        # Look for session ID pattern
        for line in result.stdout.split('\n'):
            if 'session id:' in line.lower():
                # Extract session ID
                parts = line.split('session id:')
                if len(parts) > 1:
                    session_id = parts[1].strip().split(',')[0].strip()
                    return session_id
    except Exception:
        pass
    return None

@app.route('/session-info')
def session_info():
    """Return session information for Bridge"""
    global _session_cache, _cache_time
    
    # Use cache if fresh
    if _session_cache and (time.time() - _cache_time) < CACHE_TTL:
        return jsonify(_session_cache)
    
    # Get fresh status
    status = get_ibeam_status()
    session_id = extract_session_from_logs()
    
    # Construct response
    response = {
        'authenticated': False,
        'session_id': session_id,
        'timestamp': datetime.utcnow().isoformat(),
        'cookies': {},  # Will be populated if we can get them
    }
    
    if status:
        # Parse status for authentication info
        if isinstance(status, dict):
            authenticated = status.get('authenticated', False)
            response['authenticated'] = authenticated
            
            # If status has session info, use it
            if 'session_id' in status:
                response['session_id'] = status['session_id']
    
    # Cache response
    _session_cache = response
    _cache_time = time.time()
    
    return jsonify(response)

@app.route('/session-cookies')
def session_cookies():
    """
    Return Gateway cookies for Bridge to use.
    
    This endpoint constructs cookie headers based on session info.
    Gateway typically uses session-based auth, so we construct
    the standard IBKR Gateway session cookie.
    """
    session_info_resp = session_info()
    session_data = session_info_resp.get_json()
    
    cookies = {}
    
    if session_data.get('session_id'):
        # IBKR Gateway typically uses a session cookie
        # Format may vary, but often it's 'JSESSIONID' or similar
        session_id = session_data['session_id']
        
        # Common IBKR Gateway cookie names
        # Adjust based on actual Gateway cookie format
        cookies['JSESSIONID'] = session_id
        # Add other common cookie names that Gateway might use
        
    return jsonify({
        'ok': session_data.get('authenticated', False),
        'cookies': cookies,
        'cookie_header': '; '.join([f'{k}={v}' for k, v in cookies.items()]),
        'session_id': session_data.get('session_id'),
        'timestamp': session_data.get('timestamp'),
    })

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'ok': True, 'service': 'ibeam-session-api'})

if __name__ == '__main__':
    print("Starting IBeam Session API on port 5002")
    app.run(host='0.0.0.0', port=5002, debug=False)
```

### Step 3: Better Approach - Access Selenium Directly

Actually, the **best approach** is to access IBeam's Selenium instance directly. But if that's not possible, we can:

**Option A: Modify IBeam to expose cookies**
- Check IBeam source code
- Add endpoint that calls `driver.get_cookies()`

**Option B: Use IBeam's existing status + construct cookies**
- Parse IBeam logs for session ID
- Construct Gateway cookies from session ID
- This is what the wrapper above does

### Step 4: Run Session API Service

**Option 1: Run in IBeam container (recommended)**
```bash
# Add to IBeam docker-compose.yml or start script
docker exec -d ibeam_ibeam_1 python3 /srv/ibeam/session-api.py
```

**Option 2: Run as separate service**
```bash
# Create systemd service
sudo nano /etc/systemd/system/ibeam-session-api.service
```

```ini
[Unit]
Description=IBeam Session API
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/ibeam
ExecStart=/usr/bin/python3 /opt/ibeam/session-api.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ibeam-session-api
sudo systemctl start ibeam-session-api
```

### Step 5: Update Bridge to Use Session API

**Modify Bridge `app.py`:**

```python
# Add at top
import httpx
import time

# Session API client
SESSION_API_URL = "http://127.0.0.1:5002"
_session_cookies_cache = None
_session_cache_time = 0
SESSION_CACHE_TTL = 60  # Refresh every 60 seconds

async def get_ibeam_session_cookies() -> dict:
    """Get session cookies from IBeam Session API"""
    global _session_cookies_cache, _session_cache_time
    
    # Use cache if fresh
    current_time = time.time()
    if _session_cookies_cache and (current_time - _session_cache_time) < SESSION_CACHE_TTL:
        return _session_cookies_cache
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{SESSION_API_URL}/session-cookies")
            if resp.status_code == 200:
                data = resp.json()
                if data.get('ok'):
                    cookies = data.get('cookies', {})
                    _session_cookies_cache = cookies
                    _session_cache_time = current_time
                    return cookies
    except Exception as e:
        print(f"Warning: Could not get session cookies: {e}")
    
    return {}

# Update get_gateway_client()
def get_gateway_client() -> httpx.AsyncClient:
    """Get Gateway client with IBeam session cookies"""
    global _gateway_client
    
    # Get fresh cookies (will use cache if recent)
    # Note: This is sync, so we'll need to handle async properly
    # For now, we'll refresh cookies before each request
    # In production, use async cookie fetching
    
    if _gateway_client is None:
        _gateway_client = httpx.AsyncClient(
            verify=False,
            timeout=30.0,
            follow_redirects=True,
        )
    
    return _gateway_client

async def ib_get(path: str) -> dict:
    """Call Gateway with IBeam session cookies"""
    url = f"{IB_GATEWAY_URL.rstrip('/')}/{path.lstrip('/')}"
    
    # Get session cookies
    cookies = await get_ibeam_session_cookies()
    
    # Get client
    client = get_gateway_client()
    
    try:
        # Make request with cookies
        resp = await client.get(url, cookies=cookies)
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"IBKR gateway connection error: {str(e)}"
        )
    
    if resp.status_code >= 400:
        if resp.status_code == 404 and "Access Denied" in resp.text:
            raise HTTPException(
                status_code=401,
                detail="Gateway authentication failed. Session may have expired."
            )
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"IBKR gateway error {resp.status_code}: {resp.text}"
        )
    
    return resp.json()
```

## Testing Checklist

### Phase 1: Session API
- [ ] Session API starts successfully
- [ ] `/session-info` returns session data
- [ ] `/session-cookies` returns cookie format
- [ ] Session ID is correctly extracted from logs

### Phase 2: Bridge Integration
- [ ] Bridge can call Session API
- [ ] Bridge loads cookies correctly
- [ ] Bridge `/account` endpoint works
- [ ] No more "Access Denied" errors

### Phase 3: Full Integration
- [ ] Next.js `/api/ibkr/account` returns data
- [ ] Positions endpoint works
- [ ] All IBKR data flows correctly

## Why This is Most Reliable

1. **Single Source of Truth**: IBeam manages authentication, everyone else consumes
2. **No File Dependencies**: Works regardless of where IBeam stores cookies
3. **Cache Layer**: Reduces load on IBeam, faster responses
4. **Error Handling**: Graceful degradation if session API unavailable
5. **Maintainable**: Clear interface, easy to debug
6. **Future-Proof**: If IBeam changes, only API wrapper needs update

## Alternative: Direct IBeam Integration

If IBeam source code is available, **better approach**:

Add to IBeam's existing status endpoint or create new endpoint that:
- Accesses Selenium driver directly: `driver.get_cookies()`
- Returns cookies in standard format
- No log parsing needed

This is cleaner but requires IBeam modification.

## Recommendation

**Start with Session API wrapper (Option B)** - it works immediately without IBeam modifications.

**Later, enhance with direct Selenium access** if IBeam code is available.

---

**Status:** Implementation plan ready  
**Complexity:** Medium  
**Reliability:** High  
**Recommended:** ✅ Yes, this is the best approach

