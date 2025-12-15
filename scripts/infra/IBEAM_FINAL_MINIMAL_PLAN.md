# IBeam Minimal On-Demand Plan - Final

## Architecture: Container Start/Stop = Connect/Disconnect

**Default:** Container stopped (no background activity)  
**Connect:** `docker compose up -d` → triggers one login → 2FA → session active  
**Disconnect:** `docker compose stop ibeam` → session ends, container stops  

**Session expiry:** Each container start = new session = 2FA required (acceptable)

---

## PART A: Recover from KeyError: ContainerConfig

**Cause:** Stale docker compose state or version mismatch

**Fix:**

```bash
cd /opt/ibeam

# 1. Check docker compose version
docker compose version
# Expected: v2.x.x (not v1.x.x)

# 2. Remove stale containers/state
docker compose down --remove-orphans 2>/dev/null || true
docker ps -a | grep ibeam | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

# 3. Verify clean state
docker ps -a | grep ibeam
# Should show: nothing (or empty)

# 4. Verify docker-compose.yml exists
cat docker-compose.yml | head -5
# Should show: version and services section
```

---

## PART B: Apply login_handler.py Fix

**File:** `/srv/ibeam/src/handlers/login_handler.py`

**Method:** Copy edited file into container (no patch utility needed)

### Step B1: Extract current file

```bash
cd /opt/ibeam
docker run --rm -v /opt/ibkr-gateway/clientportal:/srv/clientportal.gw voyz/ibeam:latest cat /srv/ibeam/src/handlers/login_handler.py > login_handler_original.py

# OR if container exists but not running:
# docker cp ibeam_ibeam_1:/srv/ibeam/src/handlers/login_handler.py ./login_handler_original.py
```

### Step B2: Create fixed version

**Find this block in step_login() (around line 192-203):**

```python
submit_form_el.click()
trigger, target = wait_and_identify_trigger(
    has_text(targets['SUCCESS']),
    is_visible(targets['TWO_FA']),
    is_visible(targets['TWO_FA_SELECT']),
    is_visible(targets['TWO_FA_NOTIFICATION']),
    is_visible(targets['ERROR']),
    is_clickable(targets['IBKEY_PROMO']),
)
```

**Replace with:**

```python
submit_form_el.click()
print("[LOGIN] Form submitted, waiting for immediate feedback (ERROR/2FA)...")

# Wait only for ERROR/2FA indicators (short timeout)
# Do NOT wait for SUCCESS - it will timeout with invalid selector
# Auth will be verified via http_handler.get_status() in post-authentication
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

short_timeout = 20  # seconds - enough for ERROR/2FA to appear
wait = WebDriverWait(driver, short_timeout)

trigger = None
target = None

# Check for ERROR first (fails fast if login failed)
try:
    error_locator = targets.get('ERROR')
    if error_locator:
        error_el = wait.until(EC.visibility_of_element_located(error_locator))
        print("[LOGIN] ERROR detected after submit")
        trigger = None
        target = 'ERROR'
except TimeoutException:
    pass

# Check for 2FA prompts (if no ERROR)
if target != 'ERROR':
    two_fa_locators = [
        targets.get('TWO_FA'),
        targets.get('TWO_FA_SELECT'),
        targets.get('TWO_FA_NOTIFICATION'),
        targets.get('IBKEY_PROMO'),
    ]
    for locator in two_fa_locators:
        if locator:
            try:
                el = WebDriverWait(driver, 3).until(EC.visibility_of_element_located(locator))
                print(f"[LOGIN] 2FA/notification prompt detected")
                trigger = None
                target = 'TWO_FA' if 'TWO_FA' in str(locator) else 'IBKEY_PROMO'
                break
            except TimeoutException:
                continue

# If no ERROR/2FA detected quickly, treat as "submitted"
# Auth verification happens via http_handler.get_status() in post-authentication
if target is None:
    print("[LOGIN] No ERROR/2FA detected quickly - treating as submitted")
    print("[LOGIN] Auth status will be verified by http_handler.get_status()")
    trigger = None
    target = 'SUBMITTED_UNKNOWN'
```

**Edit the file:**

```bash
# Create fixed file
cp login_handler_original.py login_handler_fixed.py

# Edit login_handler_fixed.py
# Find the submit_form_el.click() block (grep for it)
# Replace the wait_and_identify_trigger block with the code above
# Save the file

# Verify change
grep -A 5 "Form submitted, waiting for immediate feedback" login_handler_fixed.py
# Should show the new code
```

### Step B3: Copy fixed file into container (after container starts)

```bash
cd /opt/ibeam

# Start container first (even if it will fail login, we need it running to copy file)
docker compose up -d

# Wait for container to be running
sleep 5
docker ps | grep ibeam
# Should show container running

# Copy fixed file
docker cp login_handler_fixed.py ibeam_ibeam_1:/srv/ibeam/src/handlers/login_handler.py

# Verify file was copied
docker exec ibeam_ibeam_1 grep -A 2 "Form submitted, waiting for immediate feedback" /srv/ibeam/src/handlers/login_handler.py
# Should show the new code

# Restart container to use fixed code
docker compose restart ibeam
```

---

## PART C: Configure Environment

**File:** `/opt/ibeam/.env`

**Create/update:**

```bash
cd /opt/ibeam

cat > .env << 'EOF'
# ===== Authentication Control =====
START_ACTIVE=true
RESTART_FAILED_SESSIONS=false
MAINTENANCE_INTERVAL=86400

# ===== Credentials (UPDATE WITH YOUR VALUES) =====
IBEAM_USER=your_username
IBEAM_PASSWORD=your_password
IBEAM_ACCOUNT=your_account
IBEAM_REGION=us

# ===== Gateway Configuration =====
IBEAM_GATEWAY_DIR=/srv/clientportal.gw

# ===== Timeouts =====
IBEAM_PAGE_LOAD_TIMEOUT=60
IBEAM_OAUTH_TIMEOUT=300

# ===== Outputs =====
IBEAM_OUTPUTS_DIR=/srv/outputs
EOF

# Verify file
cat .env | grep -E "START_ACTIVE|RESTART_FAILED|MAINTENANCE"
# Should show:
# START_ACTIVE=true
# RESTART_FAILED_SESSIONS=false
# MAINTENANCE_INTERVAL=86400
```

**Note:** START_ACTIVE=true means "login once when container starts" (one attempt), NOT "keep retrying". Combined with RESTART_FAILED_SESSIONS=false, it's a single login attempt.

---

## PART D: Complete Connect/Disconnect Flow

### Connect Flow

```bash
cd /opt/ibeam

# 1. Verify container is stopped
docker compose ps
# Should show: nothing or "exited"

# 2. Start container (triggers one login attempt)
docker compose up -d

# 3. Wait for container to start
sleep 5

# 4. Check container status
docker ps | grep ibeam
# Should show: container running

# 5. Monitor logs for 2FA prompt
docker compose logs -f ibeam | grep -E "2FA|notification|waiting|approve"
# Wait for: "Waiting for 2FA approval" or similar

# 6. Approve 2FA on phone when prompted

# 7. Wait for authentication to complete (watch logs)
# Look for: "authenticated=True" or "Gateway running and authenticated"

# 8. Verify authentication status
docker exec ibeam_ibeam_1 curl -sk https://localhost:5000/v1/api/iserver/auth/status 2>&1 | jq '.' || docker exec ibeam_ibeam_1 curl -sk https://localhost:5000/v1/api/iserver/auth/status 2>&1

# Expected JSON (NOT 401):
# {
#   "authenticated": true,
#   "connected": true,
#   ...
# }

# 9. Verify tickle endpoint
docker exec ibeam_ibeam_1 curl -sk https://localhost:5000/v1/api/tickle 2>&1 | jq '.' || docker exec ibeam_ibeam_1 curl -sk https://localhost:5000/v1/api/tickle 2>&1

# Should return JSON (NOT 401)
```

### Disconnect Flow

```bash
cd /opt/ibeam

# 1. Stop container (ends session)
docker compose stop ibeam

# 2. Verify container stopped
docker compose ps
# Should show: ibeam (exited)

# 3. Verify no background processes
docker ps | grep ibeam
# Should show: nothing

# 4. (Optional) Verify Gateway is not accessible
curl -sk https://127.0.0.1:5000/v1/api/iserver/auth/status 2>&1 | head -1
# Should show: connection refused or timeout
```

---

## Verification Checklist

### After applying fix:

```bash
# 1. Check docker compose version
docker compose version
# Expected: v2.x.x

# 2. Check container state
docker compose ps
docker ps -a | grep ibeam

# 3. Check .env configuration
cd /opt/ibeam
grep -E "START_ACTIVE|RESTART_FAILED|MAINTENANCE" .env

# 4. Check fixed code is in container
docker exec ibeam_ibeam_1 grep -A 2 "Form submitted, waiting for immediate feedback" /srv/ibeam/src/handlers/login_handler.py 2>/dev/null && echo "Fix applied" || echo "Fix NOT applied"
```

### After connect:

```bash
# 1. Container running
docker ps | grep ibeam
# Expected: container running

# 2. Authentication successful
docker exec ibeam_ibeam_1 curl -sk https://localhost:5000/v1/api/iserver/auth/status 2>&1 | grep -q '"authenticated":true' && echo "Authenticated" || echo "NOT authenticated"

# 3. No 401 errors
docker exec ibeam_ibeam_1 curl -sk https://localhost:5000/v1/api/tickle 2>&1 | grep -q "401" && echo "ERROR: 401" || echo "OK: No 401"
```

### After disconnect:

```bash
# 1. Container stopped
docker compose ps | grep ibeam | grep -q "exited" && echo "Stopped" || echo "Still running"

# 2. No background retries
docker compose logs --since 1m ibeam 2>&1 | grep -i "authentication\|login\|retry" | wc -l
# Expected: 0 (no auth attempts)
```

---

## Addressing Your Questions

### A) Architecture Confirmed

✅ **Container Start/Stop = Connect/Disconnect**
- Default: Container stopped (no activity)
- Connect: `docker compose up -d` (one login attempt)
- Disconnect: `docker compose stop ibeam` (clean shutdown)
- No flag file mechanism needed

### B) Code Fix Provided

✅ **Exact replacement block provided above**
- Removes SUCCESS selector wait
- Waits only for ERROR/2FA (20s timeout)
- Returns SUBMITTED_UNKNOWN if no feedback
- http_handler.get_status() verifies auth in post-authentication

### C) Exact Commands Provided

✅ **All commands copy-paste safe:**
1. Recovery from KeyError (docker compose down, remove orphans)
2. File edit method (extract, edit locally, docker cp back)
3. Env config (START_ACTIVE=true, RESTART_FAILED_SESSIONS=false, MAINTENANCE_INTERVAL=86400)
4. Start/Stop flow with verification steps

### D) 2FA Reality

✅ **2FA required once per container start**
- Each `docker compose up -d` = new session = 2FA required
- This is acceptable for on-demand usage
- No random 2FA prompts (only on explicit connect)
- Session ends when container stops

---

## Complete Execution Sequence

```bash
# ===== SETUP (One-time) =====

cd /opt/ibeam

# 1. Recover from any docker compose issues
docker compose down --remove-orphans 2>/dev/null || true

# 2. Extract login_handler.py for editing
docker run --rm -v /opt/ibkr-gateway/clientportal:/srv/clientportal.gw voyz/ibeam:latest cat /srv/ibeam/src/handlers/login_handler.py > login_handler_original.py

# 3. Edit login_handler_original.py
#    - Find submit_form_el.click() block
#    - Replace wait_and_identify_trigger block with code from PART B2
#    - Save as login_handler_fixed.py

# 4. Configure .env (see PART C)

# ===== CONNECT =====

# 5. Start container
docker compose up -d

# 6. Copy fixed file into container
sleep 5
docker cp login_handler_fixed.py ibeam_ibeam_1:/srv/ibeam/src/handlers/login_handler.py

# 7. Restart to use fixed code
docker compose restart ibeam

# 8. Monitor logs, approve 2FA
docker compose logs -f ibeam

# 9. Verify authenticated
docker exec ibeam_ibeam_1 curl -sk https://localhost:5000/v1/api/iserver/auth/status | jq

# ===== DISCONNECT =====

# 10. Stop container
docker compose stop ibeam

# 11. Verify stopped
docker compose ps
```

---

**Status:** Complete minimal plan with exact commands  
**Complexity:** Low (one file edit, standard docker compose)  
**Reliability:** High (container lifecycle = session lifecycle)

