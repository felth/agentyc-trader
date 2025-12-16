# IBeam Manual Connect/Disconnect Architecture - Definitive Guide

## Executive Summary

**IBeam is NOT designed for on-demand authentication.** It's designed for always-on operation with automatic maintenance loops. However, we can achieve manual control through configuration + one minimal code change.

**Correct Architecture:**
- IBeam container runs continuously (Gateway process stays alive)
- Authentication is triggered on-demand via HTTP endpoint (requires code change)
- 2FA handled via existing Selenium flow (no changes needed)
- Disconnect via Gateway logout API (no code change needed)

---

## 1. Architecture Decision

### Option: Start IBeam Idle + Trigger Login On-Demand ✅ RECOMMENDED

**Rationale:**
- IBeam Gateway process must run continuously (can't start/stop Gateway per request)
- Authentication can be triggered on-demand via internal API
- Maintains Gateway session until explicit logout
- Minimal code change required (add HTTP endpoint to trigger login)

**Alternative (Not Recommended):**
- Start/stop container per session: Too slow, Gateway startup overhead, state loss

---

## 2. Required Environment Variables

### Authoritative List (.env file)

```bash
# ===== IBeam Credentials (REQUIRED) =====
IBEAM_USER=your_username
IBEAM_PASSWORD=your_password
IBEAM_ACCOUNT=your_account
IBEAM_REGION=us  # or eu, asia, etc.

# ===== Gateway Configuration (REQUIRED) =====
IBEAM_GATEWAY_DIR=/srv/clientportal.gw  # Standard IBeam path

# ===== Authentication Control (CRITICAL) =====
START_ACTIVE=false              # Don't auto-authenticate on startup
RESTART_FAILED_SESSIONS=false   # Don't auto-retry failed logins
MAINTENANCE_INTERVAL=86400      # Check once per day (effectively disabled)
IBEAM_MAINTENANCE_INTERVAL=86400  # Alias (use both for compatibility)

# ===== 2FA Configuration (REQUIRED) =====
IBEAM_QUICK_LOGIN=false         # Must be false for 2FA to work properly
IBEAM_2FA_METHOD=notification   # or "key" for IB Key app

# ===== Timeouts (TUNING) =====
IBEAM_PAGE_LOAD_TIMEOUT=60      # Timeout for page loads (increase if slow)
IBEAM_OAUTH_TIMEOUT=300         # Timeout for 2FA approval (5 minutes)

# ===== Logging (OPTIONAL) =====
IBEAM_LOG_LEVEL=INFO            # or DEBUG for troubleshooting
IBEAM_OUTPUTS_DIR=/srv/outputs  # Where screenshots/logs are saved

# ===== Gateway Port (STANDARD) =====
IBEAM_GATEWAY_PORT=5000         # Standard Gateway port
```

### Critical Variables Explained

- **`START_ACTIVE=false`**: Gateway starts but NO automatic login attempt
- **`RESTART_FAILED_SESSIONS=false`**: Don't retry failed logins automatically
- **`MAINTENANCE_INTERVAL=86400`**: Maintenance job runs once per day (effectively disabled for auto-auth)
- **`IBEAM_QUICK_LOGIN=false`**: Required for 2FA to work (don't skip 2FA step)

---

## 3. Code Change Required (Unavoidable)

### Why Code Change is Necessary

IBeam does NOT expose an HTTP endpoint to trigger authentication. The maintenance scheduler is the only entry point, and it's tied to intervals, not HTTP requests.

### Minimal Change: Add HTTP Endpoint for Manual Login Trigger

**File to modify:** `/srv/ibeam/src/gateway_client.py` or `/srv/ibeam/src/main.py`

**What to add:** HTTP server (Flask/FastAPI) that exposes `/api/authenticate` endpoint

**Exact implementation:**

#### Option A: Add Flask Endpoint (Simplest)

```python
# In gateway_client.py or new file: src/api_server.py

from flask import Flask, jsonify
from threading import Thread
import time

app = Flask(__name__)
_auth_trigger_requested = False
_auth_in_progress = False

@app.route('/api/authenticate', methods=['POST'])
def trigger_authentication():
    """
    Trigger manual authentication.
    Returns immediately, authentication happens in background.
    """
    global _auth_trigger_requested, _auth_in_progress
    
    if _auth_in_progress:
        return jsonify({
            'ok': False,
            'error': 'Authentication already in progress'
        }), 409
    
    _auth_trigger_requested = True
    _auth_in_progress = True
    
    return jsonify({
        'ok': True,
        'message': 'Authentication triggered. Monitor logs for 2FA prompt.'
    }), 202

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get authentication status"""
    # Check Gateway auth status via http_handler.get_status()
    # Return JSON with authenticated/connected status
    pass

def run_api_server(port=5001):
    """Run API server in background thread"""
    Thread(target=lambda: app.run(host='0.0.0.0', port=port, debug=False), daemon=True).start()

# In gateway_client.py _maintenance() method:
# Check _auth_trigger_requested flag, if True, call start_and_authenticate()
```

#### Option B: Modify Existing Maintenance to Check HTTP Flag

**File:** `/srv/ibeam/src/gateway_client.py`

**Change:** Modify `_maintenance()` to check external flag file or HTTP endpoint

```python
# In _maintenance() method, before checking interval:
def _maintenance(self):
    # Check if manual trigger requested (via file flag or HTTP)
    trigger_file = Path('/srv/outputs/trigger_auth.flag')
    if trigger_file.exists():
        trigger_file.unlink()  # Remove flag
        # Proceed with authentication
        success, shutdown, status = self.start_and_authenticate(...)
        # ... rest of logic
```

**Simpler approach:** Use file-based trigger

1. Create endpoint in separate process that writes flag file
2. Modify `_maintenance()` to check flag file existence
3. If flag exists, trigger auth and remove flag

---

## 4. Correct docker compose Command

### Start IBeam (Idle Mode)

```bash
cd /opt/ibeam
docker compose up -d
```

**Note:** Use `docker compose` (plugin), not `docker-compose` (legacy).

### Verify Container Started

```bash
docker compose ps
docker compose logs -f ibeam
```

**Expected logs:**
- Gateway starts successfully
- NO authentication attempt (START_ACTIVE=false)
- Maintenance scheduler started but won't trigger immediately

---

## 5. Manual Connect Flow

### Step 1: Trigger Authentication

**Method 1: HTTP Endpoint (After code change)**
```bash
curl -X POST http://localhost:5001/api/authenticate
```

**Method 2: File Flag (Simpler, no HTTP server needed)**
```bash
# Create trigger file
docker exec ibeam_ibeam_1 touch /srv/outputs/trigger_auth.flag

# Monitor logs
docker compose logs -f ibeam
```

**Method 3: Temporarily Enable START_ACTIVE (Current workaround)**
```bash
# Update .env: START_ACTIVE=true
# Restart container
docker compose restart ibeam
# After login, change back to false
```

### Step 2: Monitor for 2FA Prompt

```bash
docker compose logs -f ibeam | grep -E "2FA|notification|approve|waiting"
```

**Expected log:**
```
[LOGIN] Waiting for 2FA approval...
```

### Step 3: Approve 2FA on Phone

- IBKR app notification appears
- Approve the login request
- IBeam detects approval and completes authentication

### Step 4: Verify Authentication

```bash
docker exec ibeam_ibeam_1 curl -sk https://localhost:5000/v1/api/iserver/auth/status | jq
```

**Expected:**
```json
{
  "authenticated": true,
  "connected": true,
  ...
}
```

---

## 6. Manual Disconnect Flow

### Option A: Gateway Logout API (Recommended)

```bash
# Logout via Gateway API
curl -k -X POST https://127.0.0.1:5000/v1/api/iserver/reauthenticate

# Or logout endpoint (if available)
curl -k -X POST https://127.0.0.1:5000/v1/api/logout
```

### Option B: Stop Container (Clean Shutdown)

```bash
docker compose stop ibeam
# Gateway stops, session ends
```

### Option C: Restart Container (Forces Re-auth)

```bash
docker compose restart ibeam
# Gateway restarts, requires new authentication
```

---

## 7. Is login_handler.py Patch Necessary?

**Answer: YES, but for different reason than manual control.**

**Why:**
- The SUCCESS selector bug (`TAG_NAME@@Client login succeeds`) will cause login to fail
- Even with manual trigger, login will timeout waiting for invalid SUCCESS element
- The patch (remove SUCCESS wait, use http_handler.get_status() for verification) is still required

**When to apply:**
- Apply login_handler.py fix FIRST (fixes login stability)
- Then add manual trigger mechanism (adds on-demand control)

---

## 8. Complete Implementation Plan

### Phase 1: Fix Login Stability (Required)
1. Apply `login_handler.py` patch (from IBEAM_LOGIN_FIX_PATCH.md)
   - Remove brittle SUCCESS selector wait
   - Use http_handler.get_status() for auth verification
   - Add diagnostic capture

### Phase 2: Add Manual Trigger (Required for on-demand)
2. Implement file-based trigger mechanism:
   - Create `/srv/ibeam/src/trigger_auth.py` (writes flag file)
   - Modify `gateway_client._maintenance()` to check flag file
   - Add HTTP endpoint wrapper (optional, for cleaner API)

### Phase 3: Configure Environment
3. Set .env variables:
   ```bash
   START_ACTIVE=false
   RESTART_FAILED_SESSIONS=false
   MAINTENANCE_INTERVAL=86400
   IBEAM_QUICK_LOGIN=false
   ```

### Phase 4: Test Flow
4. Start container: `docker compose up -d`
5. Trigger auth: Create flag file or call endpoint
6. Approve 2FA on phone
7. Verify: `curl -sk https://localhost:5000/v1/api/iserver/auth/status`
8. Disconnect: Call Gateway logout API or stop container

---

## 9. Minimal File-Based Trigger Implementation

### File 1: Create trigger script

**File:** `/srv/ibeam/src/trigger_authentication.py`

```python
#!/usr/bin/env python3
"""Trigger IBeam authentication manually"""
from pathlib import Path
import sys

TRIGGER_FILE = Path('/srv/outputs/trigger_auth.flag')

if __name__ == '__main__':
    TRIGGER_FILE.parent.mkdir(parents=True, exist_ok=True)
    TRIGGER_FILE.touch()
    print(f"Authentication trigger created: {TRIGGER_FILE}")
    sys.exit(0)
```

### File 2: Modify gateway_client.py

**Location:** In `_maintenance()` method, at the beginning:

```python
def _maintenance(self, ...):
    # Check for manual trigger
    trigger_file = Path('/srv/outputs/trigger_auth.flag')
    if trigger_file.exists():
        print("[MAINTENANCE] Manual authentication trigger detected")
        trigger_file.unlink()  # Remove flag to prevent re-trigger
        # Proceed with authentication
        success, shutdown, status = self.start_and_authenticate(
            request_retries=self.request_retries
        )
        # Update status, handle shutdown, etc.
        # ... existing logic ...
        return
    
    # Normal maintenance interval check (only if no trigger)
    # ... existing interval logic ...
```

### Usage:

```bash
# Trigger authentication
docker exec ibeam_ibeam_1 python3 /srv/ibeam/src/trigger_authentication.py

# Monitor logs
docker compose logs -f ibeam
```

---

## 10. Final Answer Summary

**Q: Correct architecture?**
A: IBeam runs continuously (Gateway process), authentication triggered on-demand via flag file or HTTP endpoint.

**Q: Required env vars?**
A: `START_ACTIVE=false`, `RESTART_FAILED_SESSIONS=false`, `MAINTENANCE_INTERVAL=86400`, `IBEAM_QUICK_LOGIN=false`

**Q: Code changes required?**
A: YES - Two changes:
1. Fix login_handler.py (remove SUCCESS selector bug) - REQUIRED for login to work
2. Add file-based trigger + modify gateway_client._maintenance() - REQUIRED for manual control

**Q: How to trigger login?**
A: Create flag file: `docker exec ibeam_ibeam_1 touch /srv/outputs/trigger_auth.flag`

**Q: How to disconnect?**
A: Call Gateway logout API: `curl -k -X POST https://127.0.0.1:5000/v1/api/iserver/reauthenticate`

**Q: Is login_handler.py patch necessary?**
A: YES - Login will fail without it due to invalid SUCCESS selector.

---

**Status:** Definitive architecture solution  
**Implementation:** Requires 2 code changes (login fix + manual trigger)  
**Configuration:** START_ACTIVE=false + related env vars



