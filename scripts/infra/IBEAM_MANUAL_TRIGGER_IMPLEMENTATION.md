# IBeam Manual Trigger Implementation - Exact Code Changes

## Overview

This document provides **exact code changes** to enable manual authentication triggering in IBeam, without auto-login loops.

---

## Change 1: Fix login_handler.py (REQUIRED for login to work)

**File:** `/srv/ibeam/src/handlers/login_handler.py`

**Purpose:** Remove brittle SUCCESS selector that causes timeout

**See:** `IBEAM_LOGIN_FIX_PATCH.md` for exact patch

**Status:** Already documented in previous commit

---

## Change 2: Add Manual Trigger Mechanism (REQUIRED for on-demand auth)

### Step 2a: Create Trigger Script

**File:** `/srv/ibeam/src/trigger_authentication.py`

**Content:**

```python
#!/usr/bin/env python3
"""
Manual authentication trigger for IBeam.
Creates a flag file that _maintenance() checks for.
"""
from pathlib import Path
import sys
import os

TRIGGER_FILE = Path('/srv/outputs/trigger_auth.flag')
OUTPUTS_DIR = Path('/srv/outputs')

def create_trigger():
    """Create authentication trigger flag file"""
    try:
        OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
        TRIGGER_FILE.touch()
        print(f"[TRIGGER] Authentication trigger created: {TRIGGER_FILE}")
        return True
    except Exception as e:
        print(f"[TRIGGER] Failed to create trigger: {e}", file=sys.stderr)
        return False

if __name__ == '__main__':
    success = create_trigger()
    sys.exit(0 if success else 1)
```

**Make executable:**
```bash
docker exec ibeam_ibeam_1 chmod +x /srv/ibeam/src/trigger_authentication.py
```

---

### Step 2b: Modify gateway_client.py

**File:** `/srv/ibeam/src/gateway_client.py`

**Location:** Inside `_maintenance()` method, at the very beginning (before interval check)

**Find this code:**
```python
def _maintenance(self):
    # ... existing code that checks interval ...
```

**Add BEFORE interval check:**

```python
def _maintenance(self):
    # ===== MANUAL TRIGGER CHECK (ADD THIS) =====
    from pathlib import Path
    trigger_file = Path('/srv/outputs/trigger_auth.flag')
    if trigger_file.exists():
        print("[MAINTENANCE] Manual authentication trigger detected - starting authentication")
        trigger_file.unlink()  # Remove flag immediately to prevent duplicate triggers
        
        # Trigger authentication
        try:
            success, shutdown, status = self.start_and_authenticate(
                request_retries=self.request_retries
            )
            
            if success and status.authenticated:
                print("[MAINTENANCE] Manual authentication successful")
            else:
                print(f"[MAINTENANCE] Manual authentication failed: success={success}, authenticated={status.authenticated if hasattr(status, 'authenticated') else 'unknown'}")
            
            # Handle shutdown if requested
            if shutdown:
                print("[MAINTENANCE] Shutdown requested after manual auth")
                # ... existing shutdown logic ...
            
            # Return early - don't run normal maintenance interval logic
            return
        
        except Exception as e:
            print(f"[MAINTENANCE] Error during manual authentication: {e}", file=sys.stderr)
            return
    # ===== END MANUAL TRIGGER CHECK =====
    
    # ... existing interval check and normal maintenance logic continues ...
```

**Full context - find _maintenance method signature:**

```python
def _maintenance(self):
    """
    Maintenance job that runs on interval.
    Now also checks for manual trigger flag.
    """
    # ADD THE TRIGGER CHECK CODE HERE (see above)
    
    # Existing interval logic (keep as-is)
    # ... rest of method ...
```

---

## Change 3: Environment Configuration

**File:** `/opt/ibeam/.env`

**Required variables:**

```bash
# Authentication Control
START_ACTIVE=false
RESTART_FAILED_SESSIONS=false
MAINTENANCE_INTERVAL=86400
IBEAM_MAINTENANCE_INTERVAL=86400

# 2FA Configuration
IBEAM_QUICK_LOGIN=false
IBEAM_2FA_METHOD=notification

# Credentials (existing)
IBEAM_USER=your_username
IBEAM_PASSWORD=your_password
IBEAM_ACCOUNT=your_account
IBEAM_REGION=us

# Timeouts
IBEAM_PAGE_LOAD_TIMEOUT=60
IBEAM_OAUTH_TIMEOUT=300

# Outputs
IBEAM_OUTPUTS_DIR=/srv/outputs
```

---

## Implementation Steps (On Droplet)

### Step 1: Backup Original Files

```bash
cd /opt/ibeam

# Backup gateway_client.py
docker exec ibeam_ibeam_1 cp /srv/ibeam/src/gateway_client.py /srv/ibeam/src/gateway_client.py.backup

# Backup login_handler.py (if not already done)
docker exec ibeam_ibeam_1 cp /srv/ibeam/src/handlers/login_handler.py /srv/ibeam/src/handlers/login_handler.py.backup
```

### Step 2: Apply login_handler.py Fix

**See:** `IBEAM_LOGIN_FIX_PATCH.md` for exact patch

**Quick reference:**
- Remove SUCCESS selector wait
- Wait only 20s for ERROR/2FA
- Return `SUBMITTED_UNKNOWN` if no feedback
- Let http_handler.get_status() verify auth

### Step 3: Add Trigger Script

```bash
# Copy trigger script into container
docker cp scripts/infra/ibeam_trigger_authentication.py ibeam_ibeam_1:/srv/ibeam/src/trigger_authentication.py

# Make executable
docker exec ibeam_ibeam_1 chmod +x /srv/ibeam/src/trigger_authentication.py
```

### Step 4: Modify gateway_client.py

```bash
# Copy file out for editing
docker cp ibeam_ibeam_1:/srv/ibeam/src/gateway_client.py ./gateway_client.py

# Edit locally (add trigger check at start of _maintenance method)
# ... make changes ...

# Copy back
docker cp ./gateway_client.py ibeam_ibeam_1:/srv/ibeam/src/gateway_client.py
```

### Step 5: Update .env

```bash
cd /opt/ibeam
# Edit .env file
nano .env

# Add/update:
START_ACTIVE=false
RESTART_FAILED_SESSIONS=false
MAINTENANCE_INTERVAL=86400
IBEAM_QUICK_LOGIN=false
```

### Step 6: Restart Container

```bash
cd /opt/ibeam
docker compose restart ibeam
```

---

## Testing Manual Trigger

### Test 1: Container Starts Idle

```bash
docker compose logs -f ibeam | head -50
```

**Expected:**
- Gateway starts
- NO authentication attempt
- Maintenance scheduler started

**NOT expected:**
- "Starting authentication"
- Selenium browser opening
- Login attempts

### Test 2: Trigger Authentication

```bash
# Create trigger
docker exec ibeam_ibeam_1 python3 /srv/ibeam/src/trigger_authentication.py

# Monitor logs
docker compose logs -f ibeam
```

**Expected:**
- "[MAINTENANCE] Manual authentication trigger detected"
- Selenium opens
- Login form filled
- "Waiting for 2FA approval"

### Test 3: Complete 2FA

1. Approve 2FA on phone
2. Monitor logs for success
3. Verify auth status:

```bash
docker exec ibeam_ibeam_1 curl -sk https://localhost:5000/v1/api/iserver/auth/status | jq
```

**Expected:**
```json
{
  "authenticated": true,
  "connected": true
}
```

### Test 4: Verify No Auto-Loop

```bash
# Wait 5 minutes
# Check logs - should see NO new authentication attempts
docker compose logs --since 5m ibeam | grep -i "authentication\|login"
```

**Expected:** Only the manual trigger attempt, no auto-retries

---

## Disconnect (Logout)

### Option 1: Gateway Logout API

```bash
# Re-authenticate (forces logout)
curl -k -X POST https://127.0.0.1:5000/v1/api/iserver/reauthenticate

# Or logout endpoint (verify this exists)
curl -k -X POST https://127.0.0.1:5000/v1/api/logout
```

### Option 2: Stop Container

```bash
docker compose stop ibeam
```

### Option 3: Restart Container (forces new session)

```bash
docker compose restart ibeam
```

---

## Troubleshooting

### Trigger Not Working

**Check:**
```bash
# Verify trigger file created
docker exec ibeam_ibeam_1 ls -la /srv/outputs/trigger_auth.flag

# Check logs for trigger detection
docker compose logs ibeam | grep -i "trigger\|manual"
```

**Fix:** Ensure gateway_client.py modification is correct

### Still Auto-Authenticating

**Check:**
```bash
# Verify .env values
docker exec ibeam_ibeam_1 env | grep -E "START_ACTIVE|MAINTENANCE"
```

**Fix:** Ensure `START_ACTIVE=false` and `MAINTENANCE_INTERVAL=86400`

### Login Still Times Out

**Check:** Did you apply login_handler.py fix?

**Fix:** Apply patch from `IBEAM_LOGIN_FIX_PATCH.md`

---

## Summary

**Required Changes:**
1. ✅ Fix `login_handler.py` (remove SUCCESS selector bug)
2. ✅ Create `trigger_authentication.py` script
3. ✅ Modify `gateway_client._maintenance()` to check trigger file
4. ✅ Configure `.env` with `START_ACTIVE=false`, etc.

**Usage:**
- Start: `docker compose up -d`
- Connect: `docker exec ibeam_ibeam_1 python3 /srv/ibeam/src/trigger_authentication.py`
- Disconnect: `curl -k -X POST https://127.0.0.1:5000/v1/api/iserver/reauthenticate`

**Status:** Complete implementation guide  
**Complexity:** Medium (2 code files to modify, 1 script to add)



