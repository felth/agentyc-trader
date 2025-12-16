# IBeam Manual Connect/Disconnect - Final Answer

## Question: What is the CORRECT architecture?

**Answer:** IBeam runs continuously (Gateway process stays alive), authentication triggered on-demand via file flag mechanism.

---

## Question: Required Environment Variables?

**Answer - Authoritative List:**

```bash
# CRITICAL - Authentication Control
START_ACTIVE=false              # Gateway starts but NO auto-login
RESTART_FAILED_SESSIONS=false   # Don't auto-retry failed logins
MAINTENANCE_INTERVAL=86400      # Check once per day (effectively disabled)
IBEAM_MAINTENANCE_INTERVAL=86400  # Alias (use both)

# CRITICAL - 2FA Configuration
IBEAM_QUICK_LOGIN=false         # Must be false for 2FA to work
IBEAM_2FA_METHOD=notification   # or "key" for IB Key

# REQUIRED - Credentials
IBEAM_USER=your_username
IBEAM_PASSWORD=your_password
IBEAM_ACCOUNT=your_account
IBEAM_REGION=us

# OPTIONAL - Tuning
IBEAM_PAGE_LOAD_TIMEOUT=60
IBEAM_OAUTH_TIMEOUT=300
IBEAM_OUTPUTS_DIR=/srv/outputs
```

---

## Question: Is Code Change Required?

**Answer: YES - Two changes required:**

1. **Fix `login_handler.py`** - REQUIRED (login will fail without it)
   - File: `/srv/ibeam/src/handlers/login_handler.py`
   - Why: Invalid SUCCESS selector causes timeout
   - Change: Remove SUCCESS wait, use http_handler.get_status() for verification
   - See: `IBEAM_LOGIN_FIX_PATCH.md`

2. **Add manual trigger mechanism** - REQUIRED (for on-demand auth)
   - Files: 
     - Create: `/srv/ibeam/src/trigger_authentication.py`
     - Modify: `/srv/ibeam/src/gateway_client.py` (_maintenance method)
   - Why: IBeam has no built-in HTTP API for manual trigger
   - Change: File-based flag + check in _maintenance()
   - See: `IBEAM_MANUAL_TRIGGER_IMPLEMENTATION.md`

**Why unavoidable:** IBeam is designed for always-on auto-auth, not on-demand. Configuration alone cannot achieve manual control - maintenance scheduler must check for external trigger.

---

## Question: Exact docker compose Command?

**Answer:**

```bash
cd /opt/ibeam
docker compose up -d
```

**Note:** Use `docker compose` (plugin), not `docker-compose` (legacy).

**Expected behavior:**
- Container starts
- Gateway process starts
- NO authentication attempt (START_ACTIVE=false)
- Maintenance scheduler runs but won't trigger immediately (86400s interval)

---

## Question: How to Trigger Login Manually?

**Answer - After implementing code changes:**

```bash
# Method 1: Trigger script (recommended)
docker exec ibeam_ibeam_1 python3 /srv/ibeam/src/trigger_authentication.py

# Method 2: Direct file creation
docker exec ibeam_ibeam_1 touch /srv/outputs/trigger_auth.flag

# Then monitor logs
docker compose logs -f ibeam
```

**Flow:**
1. Trigger creates flag file
2. Next maintenance cycle (runs every minute) detects flag
3. Calls start_and_authenticate()
4. Selenium opens, fills credentials
5. Waits for 2FA approval (logs: "Waiting for 2FA approval")
6. User approves on phone
7. Authentication completes

---

## Question: How to Disconnect/Logout?

**Answer:**

```bash
# Option 1: Gateway logout API (clean)
curl -k -X POST https://127.0.0.1:5000/v1/api/iserver/reauthenticate

# Option 2: Stop container (clean shutdown)
docker compose stop ibeam

# Option 3: Restart container (forces new session)
docker compose restart ibeam
```

**Note:** Gateway logout API is preferred - keeps Gateway process running, just invalidates session.

---

## Question: Is login_handler.py Patch Necessary?

**Answer: YES - Absolutely required.**

**Why:**
- Even with manual trigger, login will timeout waiting for invalid SUCCESS selector
- `TAG_NAME@@Client login succeeds` cannot match any element
- Login will fail every time without this fix

**Apply this fix FIRST** before testing manual trigger mechanism.

---

## Question: Configuration vs Code - Which Approach?

**Answer: BOTH are required.**

**Configuration alone:** Cannot work. START_ACTIVE=false prevents initial auto-login, but provides no way to trigger login later.

**Code changes alone:** Insufficient. Must have correct env vars (START_ACTIVE=false, etc.) or maintenance loop will interfere.

**Correct approach:**
1. Configure: START_ACTIVE=false, MAINTENANCE_INTERVAL=86400
2. Code: Add trigger mechanism to _maintenance()
3. Code: Fix login_handler.py SUCCESS selector bug

---

## Complete Setup Checklist

- [ ] 1. Apply login_handler.py fix (see IBEAM_LOGIN_FIX_PATCH.md)
- [ ] 2. Create trigger_authentication.py script
- [ ] 3. Modify gateway_client._maintenance() to check trigger file
- [ ] 4. Configure .env: START_ACTIVE=false, MAINTENANCE_INTERVAL=86400, IBEAM_QUICK_LOGIN=false
- [ ] 5. Start container: `docker compose up -d`
- [ ] 6. Verify: No auto-authentication (check logs)
- [ ] 7. Test: Trigger manual authentication
- [ ] 8. Test: Complete 2FA flow
- [ ] 9. Verify: `/iserver/auth/status` returns authenticated=true
- [ ] 10. Test: Disconnect via logout API

---

## Final Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│ IBeam Container (Always Running)                            │
│                                                              │
│  ┌──────────────┐        ┌──────────────────┐              │
│  │ Gateway      │        │ Maintenance      │              │
│  │ Process      │◄───────│ Scheduler        │              │
│  │ (Port 5000)  │        │ (Checks flag)    │              │
│  └──────────────┘        └──────────────────┘              │
│         ▲                          ▲                        │
│         │                          │                        │
│         │                          │                        │
│  ┌──────┴──────────┐      ┌───────┴──────────┐            │
│  │ Logout API      │      │ Trigger Flag     │            │
│  │ (Disconnect)    │      │ (Connect)        │            │
│  └─────────────────┘      └──────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
    curl POST                      touch flag
  /reauthenticate              or trigger script
```

**Flow:**
1. Container starts → Gateway runs, no auth
2. User clicks "Connect" → App creates trigger flag
3. Maintenance detects flag → Triggers authentication
4. User approves 2FA → Session active
5. User clicks "Disconnect" → App calls logout API
6. Session ends → Ready for next connect

---

## Files Reference

- **Architecture:** `IBEAM_MANUAL_CONNECT_ARCHITECTURE.md`
- **Implementation:** `IBEAM_MANUAL_TRIGGER_IMPLEMENTATION.md`
- **Login Fix:** `IBEAM_LOGIN_FIX_PATCH.md`
- **Trigger Script:** `ibeam_trigger_authentication.py`

---

**Status:** Definitive answer provided  
**Implementation:** 2 code changes required + configuration  
**Complexity:** Medium (well-documented, minimal changes)



