# Session API v2 - Debugging Cookie Extraction

## Current Status

- ✅ Session API v2 is running
- ❌ Still only returning JSESSIONID from logs (fallback)
- ❌ Cookie database extraction not working
- ❌ `/test-gateway` returns "Access Denied"

## Issue

The cookie extraction logic isn't finding the Chrome cookie database in the IBeam container.

## Debugging Steps

### Step 1: Check Debug Endpoint

```bash
curl http://127.0.0.1:5002/debug | jq
```

This shows:
- Whether cookie database was found
- Cache status
- Current state

### Step 2: Manually Find Cookie Database

```bash
# Search for cookie files in IBeam container
docker exec ibeam_ibeam_1 find / -name "Cookies" -type f 2>/dev/null

# Check common Chrome profile locations
docker exec ibeam_ibeam_1 ls -la /root/.config/chromium/Default/ 2>/dev/null
docker exec ibeam_ibeam_1 ls -la /root/.cache/chromium/Default/ 2>/dev/null
docker exec ibeam_ibeam_1 ls -la /root/.local/share/chromium/Default/ 2>/dev/null

# Check if IBeam uses a custom profile location
docker exec ibeam_ibeam_1 env | grep -i chrome
docker exec ibeam_ibeam_1 env | grep -i profile
docker exec ibeam_ibeam_1 env | grep -i user

# Check Selenium data directory
docker exec ibeam_ibeam_1 find /tmp -name "*chrome*" -o -name "*selenium*" 2>/dev/null
docker exec ibeam_ibeam_1 find /tmp -name "Cookies" 2>/dev/null
```

### Step 3: Check IBeam Logs for Profile Path

```bash
docker logs ibeam_ibeam_1 2>&1 | grep -i "profile\|chrome\|user.*data" | head -20
```

### Step 4: Check Session API Logs

```bash
# If running via systemd
sudo journalctl -u ibeam-session-api -n 50 --no-pager

# If running manually, check terminal output
# Look for [DEBUG] messages showing:
# - Which paths are being checked
# - Whether cookie database was found
# - How many cookies were extracted
```

### Step 5: Manual Cookie Extraction Test

Once you find the cookie database path:

```bash
# Copy cookie database out
docker cp ibeam_ibeam_1:/path/to/Cookies /tmp/test_cookies.db

# Try to read it
sqlite3 /tmp/test_cookies.db "SELECT name, value, host_key FROM cookies LIMIT 10;"
```

## Expected Findings

If cookie extraction works, you should see:
- Multiple cookies (JSESSIONID, JSESSIONIDSSO, __utma, etc.)
- Cookies for domains like `127.0.0.1`, `localhost`, or IBKR domains
- `/test-gateway` returns `"ok": true` with account data

## If Cookie Database Not Found

### Alternative Approaches:

1. **Check IBeam Source Code**
   - Where does IBeam store its Chrome profile?
   - Is there an environment variable?
   - Does IBeam expose profile path in logs?

2. **Access Selenium Driver Directly**
   - If IBeam exposes driver, we could call `driver.get_cookies()`
   - Requires IBeam modification or shared memory access

3. **Proxy Mode**
   - Session API acts as proxy
   - Uses Selenium WebDriver to make requests
   - Returns Gateway responses directly

4. **IBeam Modification**
   - Add endpoint to IBeam that returns cookies
   - Simplest long-term solution

## Next Steps

1. Run debug commands above
2. Share results to identify cookie database location
3. Update session-api-v2.py with correct path
4. Test again

