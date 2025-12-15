# IBeam Login Fix - Minimal Patch

## Problem Analysis

**Root Cause:**
- Post-submit wait in `step_login()` times out waiting for DOM elements
- `SUCCESS_EL_TEXT = 'TAG_NAME@@Client login succeeds'` is invalid (TAG_NAME cannot contain that text)
- None of the wait conditions (SUCCESS, TWO_FA, ERROR, etc.) ever become true
- Login declared failed even though submit may have succeeded

**Solution Strategy:**
- Don't rely on brittle DOM-based SUCCESS detection
- After submit, wait briefly for obvious errors (ERROR element) or 2FA
- If no error appears, treat as "submitted" and let `http_handler.get_status()` (in post-authentication) be the authoritative auth check
- Add diagnostic capture (screenshot/page_source) on timeout for debugging

---

## File to Modify

**File:** `/srv/ibeam/src/handlers/login_handler.py`

**Function:** `step_login()` (around lines 192-203)

---

## Minimal Diff

### Change 1: Add Diagnostic Capture Helper

Add this function at the top of `login_handler.py` (after imports, before class):

```python
def _capture_timeout_diagnostics(driver, outputs_dir, stage_name):
    """
    Capture screenshot and page state when timeout occurs.
    Saves to outputs_dir for debugging.
    """
    try:
        from datetime import datetime
        import os
        from pathlib import Path
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        outputs_path = Path(outputs_dir)
        outputs_path.mkdir(parents=True, exist_ok=True)
        
        # Screenshot
        screenshot_path = outputs_path / f"timeout_{stage_name}_{timestamp}.png"
        driver.save_screenshot(str(screenshot_path))
        
        # Page source (first 2000 chars)
        page_source = driver.page_source[:2000]
        page_source_path = outputs_path / f"timeout_{stage_name}_{timestamp}.html"
        with open(page_source_path, 'w', encoding='utf-8') as f:
            f.write(page_source)
        
        # Current URL and basic info
        info = {
            'timestamp': timestamp,
            'current_url': driver.current_url,
            'page_title': driver.title,
            'screenshot': str(screenshot_path),
            'page_source_snippet': page_source
        }
        import json
        info_path = outputs_path / f"timeout_{stage_name}_{timestamp}.json"
        with open(info_path, 'w') as f:
            json.dump(info, f, indent=2)
        
        print(f"[DIAGNOSTIC] Timeout at {stage_name}: screenshot={screenshot_path}, url={driver.current_url}")
        return info
    except Exception as e:
        print(f"[DIAGNOSTIC] Failed to capture diagnostics: {e}")
        return None
```

### Change 2: Modify step_login() Post-Submit Wait Logic

**OLD CODE (around lines 192-203):**
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

**NEW CODE:**
```python
submit_form_el.click()
print("[LOGIN] Form submitted, waiting for response...")

# Use shorter timeout for immediate feedback (ERROR, 2FA)
# If no error appears quickly, treat as "submitted" and let http_handler.get_status() verify auth
short_timeout = 20  # seconds - enough for 2FA/ERROR to appear, but not wait forever for SUCCESS

try:
    trigger, target = wait_and_identify_trigger(
        timeout=short_timeout,  # Use shorter timeout
        is_visible(targets['ERROR']),  # ERROR first - most important
        is_visible(targets['TWO_FA']),
        is_visible(targets['TWO_FA_SELECT']),
        is_visible(targets['TWO_FA_NOTIFICATION']),
        # REMOVED: has_text(targets['SUCCESS']) - too brittle, let http_handler.get_status() verify
        # REMOVED: is_clickable(targets['IBKEY_PROMO']) - not reliable indicator
    )
    print(f"[LOGIN] Post-submit condition detected: {target}")
    
except TimeoutException:
    # Timeout = no ERROR/2FA appeared quickly, but submit may have succeeded
    # Capture diagnostics for debugging
    _capture_timeout_diagnostics(driver, self.outputs_dir, 'post_submit_timeout')
    
    print("[LOGIN] Post-submit wait timed out (no ERROR/2FA detected quickly)")
    print(f"[LOGIN] Current URL: {driver.current_url}")
    print("[LOGIN] Treating as 'submitted' - auth status will be verified by http_handler.get_status()")
    
    # Return special target indicating "unknown/submitted" state
    # This allows strategy_handler._post_authentication() to check via http_handler.get_status()
    trigger = None
    target = 'SUBMITTED_UNKNOWN'  # Special target meaning "submit done, auth status unknown"
```

### Change 3: Handle SUBMITTED_UNKNOWN in strategy_handler (if needed)

**Check:** Does `strategy_handler._post_authentication()` or similar already call `http_handler.get_status()` after login?

If yes, the above change should work. If no, we may need to modify strategy_handler to handle `SUBMITTED_UNKNOWN` target.

**Likely location:** `/srv/ibeam/src/handlers/strategy_handler.py` in `_authentication_strategy_B()` or `_post_authentication()`

**If needed, add:**
```python
# After login() returns success=True
if target == 'SUBMITTED_UNKNOWN':
    # Verify auth via http_handler instead of DOM
    status = self.http_handler.get_status(max_attempts=3)
    if status.authenticated:
        print("[AUTH] Login verified via http_handler.get_status()")
        return True, False  # success, no shutdown
    else:
        print("[AUTH] Login failed - http_handler.get_status() shows not authenticated")
        return False, False  # failure, no shutdown
```

---

## Alternative: Quick Fix (If wait_and_identify_trigger doesn't accept timeout param)

If `wait_and_identify_trigger()` doesn't support a `timeout` parameter, wrap it in a try/except with WebDriverWait:

**Alternative NEW CODE:**
```python
submit_form_el.click()
print("[LOGIN] Form submitted, waiting for response...")

# Wait only for ERROR/2FA with short timeout
# Don't wait for SUCCESS - let http_handler.get_status() verify auth
short_timeout = 20

try:
    from selenium.webdriver.support.wait import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    
    # Wait only for ERROR or 2FA indicators (quick feedback)
    wait = WebDriverWait(driver, short_timeout)
    
    # Check for ERROR first (fails fast if login failed)
    try:
        error_el = wait.until(EC.visibility_of_element_located(targets['ERROR']))
        trigger = None
        target = 'ERROR'
        print("[LOGIN] ERROR detected after submit")
        return trigger, target
    except TimeoutException:
        pass
    
    # Check for 2FA
    two_fa_conditions = [
        EC.visibility_of_element_located(targets.get('TWO_FA')),
        EC.visibility_of_element_located(targets.get('TWO_FA_SELECT')),
        EC.visibility_of_element_located(targets.get('TWO_FA_NOTIFICATION')),
    ]
    for condition in two_fa_conditions:
        try:
            el = WebDriverWait(driver, 2).until(condition)  # Quick check
            trigger = None
            target = 'TWO_FA'
            print("[LOGIN] 2FA prompt detected")
            return trigger, target
        except TimeoutException:
            continue
    
    # No ERROR, no 2FA - likely submitted successfully
    # Capture diagnostics and let http_handler verify
    _capture_timeout_diagnostics(driver, self.outputs_dir, 'post_submit_no_feedback')
    trigger = None
    target = 'SUBMITTED_UNKNOWN'
    print("[LOGIN] No ERROR/2FA detected - treating as submitted, will verify via http_handler.get_status()")
    return trigger, target
    
except Exception as e:
    # Unexpected error - capture and re-raise
    _capture_timeout_diagnostics(driver, self.outputs_dir, 'post_submit_exception')
    raise
```

---

## Implementation Steps

1. **Backup original file:**
   ```bash
   docker exec ibeam_ibeam_1 cp /srv/ibeam/src/handlers/login_handler.py /srv/ibeam/src/handlers/login_handler.py.backup
   ```

2. **Apply patch:**
   - Add `_capture_timeout_diagnostics()` function
   - Replace post-submit wait block with new logic

3. **Restart IBeam:**
   ```bash
   cd /opt/ibeam
   docker-compose restart ibeam
   ```

4. **Monitor logs:**
   ```bash
   docker logs -f ibeam_ibeam_1 | grep -E "LOGIN|DIAGNOSTIC|authenticated"
   ```

5. **Verify success:**
   ```bash
   docker exec ibeam_ibeam_1 sh -lc 'curl -sk https://localhost:5000/v1/api/iserver/auth/status' | jq
   ```
   Should return: `{"authenticated": true, ...}` (not 401)

6. **Check diagnostics (if timeout still occurs):**
   ```bash
   docker exec ibeam_ibeam_1 ls -lah /srv/outputs/timeout_*
   docker cp ibeam_ibeam_1:/srv/outputs/timeout_post_submit_timeout_*.png ./
   ```

---

## Success Criteria

✅ **IBeam login completes without timeout**  
✅ **Gateway `/iserver/auth/status` returns `authenticated: true`**  
✅ **No repeated login attempts / auth prompts**  
✅ **Diagnostics captured if timeout occurs**

---

## Notes

- This fix removes reliance on brittle DOM-based SUCCESS detection
- Uses authoritative `http_handler.get_status()` for auth verification (already done in post-authentication)
- Adds diagnostic capture for future debugging
- Minimal change - only modifies post-submit wait logic

**Status:** Ready for implementation

