# IBeam Login Fix - Summary & Execution Guide

## Problem Confirmed

✅ **Gateway NOT authenticated** (401 on all endpoints)  
✅ **Login timeout occurs** after form submit  
✅ **Invalid SUCCESS selector**: `TAG_NAME@@Client login succeeds`  
✅ **None of wait conditions** (SUCCESS, TWO_FA, ERROR, etc.) become true  

---

## Solution Strategy

**Remove brittle DOM-based SUCCESS detection**  
→ Wait briefly (20s) for ERROR/2FA only  
→ If none appear, treat as "submitted"  
→ Let `http_handler.get_status()` verify auth (already done in post-authentication)

---

## Files Created

1. **`IBEAM_LOGIN_FIX_PATCH.md`** - Detailed patch documentation
2. **`ibeam_login_fix.py.patch`** - Exact code changes needed
3. **`run_ibeam_timeout_diagnostics.sh`** - Diagnostic script to capture page state
4. **`IBEAM_LOGIN_FIX_SUMMARY.md`** - This file

---

## Execution Steps

### Step 1: Run Diagnostics (Optional but Recommended)

```bash
chmod +x scripts/infra/run_ibeam_timeout_diagnostics.sh
./scripts/infra/run_ibeam_timeout_diagnostics.sh
```

This captures:
- Screenshots from previous login attempts
- Page source HTML
- Recent timeout errors

**Review output** to see what page Selenium is on when timeout occurs.

---

### Step 2: Apply Login Fix Patch

**File to modify:** `/srv/ibeam/src/handlers/login_handler.py`

**Changes needed:**
1. Add `_capture_timeout_diagnostics()` helper function
2. Replace post-submit wait block (lines ~192-203) with new logic

**Option A: Manual Edit (Recommended)**

1. **Backup original:**
   ```bash
   docker exec ibeam_ibeam_1 cp /srv/ibeam/src/handlers/login_handler.py /srv/ibeam/src/handlers/login_handler.py.backup
   ```

2. **View current code:**
   ```bash
   docker exec ibeam_ibeam_1 cat /srv/ibeam/src/handlers/login_handler.py | grep -A 20 "submit_form_el.click()"
   ```

3. **Edit file:**
   ```bash
   # Option: Use docker exec to edit
   docker exec -it ibeam_ibeam_1 sh -c 'vi /srv/ibeam/src/handlers/login_handler.py'
   # Or copy out, edit, copy back:
   docker cp ibeam_ibeam_1:/srv/ibeam/src/handlers/login_handler.py ./login_handler.py
   # [edit locally]
   docker cp ./login_handler.py ibeam_ibeam_1:/srv/ibeam/src/handlers/login_handler.py
   ```

4. **Apply changes** from `ibeam_login_fix.py.patch`:
   - Add diagnostic helper function
   - Replace post-submit wait block with new logic

**Option B: Use Patch File**

If you have `patch` utility and can access container filesystem:

```bash
# Copy patch into container
docker cp scripts/infra/ibeam_login_fix.py.patch ibeam_ibeam_1:/tmp/

# Apply (if patch utility available)
docker exec ibeam_ibeam_1 sh -c 'cd /srv/ibeam/src/handlers && patch -p0 < /tmp/ibeam_login_fix.py.patch'
```

---

### Step 3: Verify strategy_handler Handles SUBMITTED_UNKNOWN

**Check if needed:** Does `strategy_handler._post_authentication()` call `http_handler.get_status()`?

```bash
docker exec ibeam_ibeam_1 grep -A 30 "_post_authentication\|post.*auth" /srv/ibeam/src/handlers/strategy_handler.py
```

**If it already calls `get_status()`**, no change needed.

**If not**, add handling for `SUBMITTED_UNKNOWN` target (see `IBEAM_LOGIN_FIX_PATCH.md` for details).

---

### Step 4: Restart IBeam

```bash
cd /opt/ibeam
docker-compose restart ibeam
```

---

### Step 5: Monitor & Verify

**Watch logs:**
```bash
docker logs -f ibeam_ibeam_1 | grep -E "LOGIN|DIAGNOSTIC|authenticated"
```

**Verify authentication:**
```bash
docker exec ibeam_ibeam_1 sh -lc 'curl -sk https://localhost:5000/v1/api/iserver/auth/status' | jq
```

**Expected result:**
```json
{
  "authenticated": true,
  "connected": true,
  ...
}
```

**NOT:**
```
401 Unauthorized
```

---

## Success Criteria

✅ **IBeam login completes** without timeout  
✅ **Gateway `/iserver/auth/status` returns `authenticated: true`**  
✅ **No repeated login attempts** / auth prompts  
✅ **Diagnostics captured** if timeout occurs (screenshots in `/srv/outputs/timeout_*`)

---

## Key Changes Explained

### Before (Brittle):
```python
# Waits forever (120s) for SUCCESS element that doesn't exist
trigger, target = wait_and_identify_trigger(
    has_text(targets['SUCCESS']),  # Invalid: TAG_NAME@@Client login succeeds
    ...
)
# Times out, login fails
```

### After (Robust):
```python
# Wait only 20s for ERROR/2FA (quick feedback)
# If none appear, treat as submitted
# Let http_handler.get_status() verify auth
# No timeout, login proceeds
```

---

## Rollback (If Needed)

```bash
docker exec ibeam_ibeam_1 cp /srv/ibeam/src/handlers/login_handler.py.backup /srv/ibeam/src/handlers/login_handler.py
docker-compose restart ibeam
```

---

**Status:** Ready for implementation  
**Risk:** Low (changes are minimal and diagnostic-friendly)  
**Next:** Apply patch and test

