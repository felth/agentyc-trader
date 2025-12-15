# IBeam Login Timeout Diagnostic & Fix Plan

## Problem Statement

- Gateway endpoints return EMPTY (not authenticated)
- Selenium timeouts in `login_handler.py`
- Repeated "Timeout reached when waiting for authentication"
- Need to fix IBeam login flow (Strategy B) to achieve `authenticated=true`

---

## Diagnostic Steps (Run First)

### 1. Inspect IBeam Source Code Location

```bash
# Find IBeam login handler code inside container
docker exec ibeam_ibeam_1 find /srv -name "login_handler.py" -type f

# View login handler code
docker exec ibeam_ibeam_1 cat /srv/ibeam/src/handlers/login_handler.py

# Check strategy handler (Strategy B)
docker exec ibeam_ibeam_1 cat /srv/ibeam/src/handlers/strategy_handler.py
```

### 2. Check Current Selectors & Wait Conditions

```bash
# Search for WebDriverWait and selectors in login handler
docker exec ibeam_ibeam_1 grep -n "WebDriverWait\|until\|presence_of\|visibility_of\|element_to_be_clickable" /srv/ibeam/src/handlers/login_handler.py

# Check for timeout values
docker exec ibeam_ibeam_1 grep -n "timeout\|TIMEOUT" /srv/ibeam/src/handlers/login_handler.py | head -20
```

### 3. Capture Current IBKR Login Page HTML

```bash
# Take screenshot of current login page (if possible)
# Or manually inspect what IBKR login page looks like now
# Common elements to check:
# - Username field (ID, name, class)
# - Password field (ID, name, class)  
# - 2FA/TOTP field (ID, name, class)
# - Submit/Login button (ID, name, class, text)
# - Success indicator after login
```

---

## Expected IBeam Login Flow (Strategy B)

Based on typical IBeam implementation, Strategy B likely:

1. **Loads login page**: `https://localhost:5000/sso/Login?forwardTo=22&RL=1`
2. **Waits for username field** to be visible
3. **Fills username**
4. **Waits for password field** to be visible
5. **Fills password**
6. **Clicks submit/login button**
7. **Waits for 2FA prompt** (if enabled)
8. **Fills 2FA code**
9. **Waits for authentication success indicator** (e.g., redirect to Gateway dashboard or specific element)

**The timeout is likely happening at step 7-9** (waiting for success indicator).

---

## Common IBKR Login Page Selectors (Current vs Old)

### Username Field
- **Old:** `#username` or `input[name="username"]`
- **Current:** May have changed to `#user_name` or different ID

### Password Field  
- **Old:** `#password` or `input[type="password"]`
- **Current:** Usually stable, but wrapper class may have changed

### Login Button
- **Old:** `button[type="submit"]` or `#submit` or button with text "Log In"
- **Current:** May be `#loginbutton` or `button.login-btn` or different

### 2FA Field
- **Old:** `#chlginput` or `input[name="chlginput"]` or `#totp`
- **Current:** May be `#challengeAnswer` or different ID

### Success Indicator (POST-LOGIN)
- **Old:** May wait for redirect to `/v1/api/iserver/auth/status` or presence of specific element
- **Current:** This is likely where timeout occurs - IBKR may have changed the post-login flow

---

## Most Likely Failure Points

### 1. Success Indicator Wait (Most Likely)

IBeam likely waits for one of these after login:
- Specific element on Gateway dashboard
- Redirect to specific URL
- Presence of "authenticated" indicator element

**If IBKR changed this element/URL, IBeam will timeout waiting for it.**

### 2. 2FA Field Wait

If 2FA is enabled and the field selector changed, IBeam will timeout waiting for it.

### 3. Page Load Timeout

IBKR login page may be loading slower, causing `PAGE_LOAD_TIMEOUT` to trigger.

---

## Recommended Fix Approach

### Step 1: Identify Exact Timeout Location

Run this to see where timeout occurs:

```bash
# Watch IBeam logs during login attempt
docker logs -f ibeam_ibeam_1 2>&1 | grep -E "Timeout|waiting for|element|selector|By\.|presence_of|visibility_of"
```

This will show which selector/wait condition is timing out.

### Step 2: Update Selectors Based on Current IBKR Page

Once we know which selector fails, we need to:
1. Inspect current IBKR login page HTML
2. Update selector to match current page structure
3. Test login flow

### Step 3: Increase Timeouts (If Needed)

If selectors are correct but page is slow:
- Increase `IBEAM_PAGE_LOAD_TIMEOUT` in environment
- Increase WebDriverWait timeout in code

---

## Files to Modify (Once We Know the Issue)

**Primary file:** `/srv/ibeam/src/handlers/login_handler.py`

**Secondary files (may need changes):**
- `/srv/ibeam/src/handlers/strategy_handler.py` (Strategy B implementation)
- `/srv/ibeam/src/outline.py` (if selectors are defined there)

**Configuration:**
- IBeam `.env` or `docker-compose.yml` for timeout values

---

## Next Steps

1. **Run diagnostic commands above** to identify:
   - Exact file containing login logic
   - Current selectors being used
   - Where timeout occurs

2. **Share results** so we can provide exact fix

3. **If IBeam source is not in container**, we'll need to:
   - Clone IBeam repo
   - Modify source
   - Rebuild container

---

**Status:** Waiting for diagnostic results  
**Next Action:** Run diagnostic commands to identify failing selector

