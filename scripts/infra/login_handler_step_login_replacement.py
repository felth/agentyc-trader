# Exact Replacement Code for login_handler.py
# 
# Location: Inside step_login() method, after submit_form_el.click()
# 
# OLD CODE TO FIND:
# submit_form_el.click()
# trigger, target = wait_and_identify_trigger(
#     has_text(targets['SUCCESS']),
#     is_visible(targets['TWO_FA']),
#     is_visible(targets['TWO_FA_SELECT']),
#     is_visible(targets['TWO_FA_NOTIFICATION']),
#     is_visible(targets['ERROR']),
#     is_clickable(targets['IBKEY_PROMO']),
# )
#
# REPLACE WITH THIS:

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

