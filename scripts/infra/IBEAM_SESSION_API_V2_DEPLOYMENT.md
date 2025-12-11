# IBeam Session API v2 - Real Cookie Extraction

## Problem with v1

The session ID from IBeam logs is **NOT** the Gateway JSESSIONID cookie. The real cookies are stored in Selenium's browser session (Chrome cookie database).

## Solution: v2 Extracts Real Cookies

Version 2 extracts the **actual cookies** from Selenium's Chrome cookie database, not just the session ID.

---

## Deployment Steps

### Step 1: Replace Session API

```bash
cd /opt/ibeam

# Backup old version
mv session-api.py session-api.py.bak 2>/dev/null || true

# Create new version
cat > session-api-v2.py << 'EOF'
# (Paste contents from scripts/ibeam/session-api-v2.py)
EOF

# Or pull from git if available
cd /opt/agentyc-trader
git pull origin main
cp scripts/ibeam/session-api-v2.py /opt/ibeam/session-api-v2.py
```

### Step 2: Install Dependencies

```bash
pip3 install flask requests
```

### Step 3: Test Cookie Extraction

```bash
cd /opt/ibeam
python3 session-api-v2.py
```

In another terminal:
```bash
# Test cookie extraction
curl http://127.0.0.1:5002/session-cookies | jq

# Test Gateway with extracted cookies (automatic test)
curl http://127.0.0.1:5002/test-gateway | jq
```

**Expected:** `/test-gateway` should return `"gateway_status": 200` with account data, not "Access Denied".

### Step 4: Run as Service

**Create systemd service:**

```bash
sudo nano /etc/systemd/system/ibeam-session-api.service
```

```ini
[Unit]
Description=IBeam Session API v2
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/ibeam
ExecStart=/usr/bin/python3 /opt/ibeam/session-api-v2.py
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ibeam-session-api
sudo systemctl start ibeam-session-api
sudo systemctl status ibeam-session-api
```

---

## How v2 Works

### Cookie Extraction Methods (tried in order):

1. **Docker Exec Method** (Primary):
   - Finds Chrome cookie database in IBeam container
   - Copies it out of container
   - Parses SQLite database
   - Extracts cookies for `127.0.0.1:5000`

2. **Local Profile Method** (if running in container):
   - Checks common Chrome profile locations
   - Parses local cookie database

3. **Fallback** (if cookies not found):
   - Uses session ID from logs (less reliable)

### Test Endpoint

The `/test-gateway` endpoint automatically tests extracted cookies:
- Gets cookies
- Calls Gateway `/portfolio/accounts`
- Returns Gateway response
- Verifies cookies work before Bridge uses them

---

## Verification

### 1. Check Cookies Extracted

```bash
curl http://127.0.0.1:5002/session-cookies | jq
```

**Expected:** Should show multiple cookies (not just JSESSIONID), and `cookie_count` > 1.

### 2. Test Gateway Directly

```bash
# Get cookie header
COOKIE=$(curl -s http://127.0.0.1:5002/session-cookies | jq -r '.cookie_header')

# Test Gateway
curl -sk -H "Cookie: $COOKIE" https://127.0.0.1:5000/v1/api/portfolio/accounts | jq
```

**Expected:** Should return account JSON data, NOT "Access Denied".

### 3. Use Test Endpoint

```bash
curl http://127.0.0.1:5002/test-gateway | jq
```

**Expected:**
```json
{
  "ok": true,
  "gateway_status": 200,
  "gateway_response": "[{\"accountId\":\"...\"}]",
  "cookies_used": {...}
}
```

---

## If Cookies Still Not Found

### Debug Steps:

1. **Find cookie database location:**
   ```bash
   docker exec ibeam_ibeam_1 find / -name "Cookies" -type f 2>/dev/null
   ```

2. **Check Chrome profile:**
   ```bash
   docker exec ibeam_ibeam_1 ls -la /root/.config/chromium/Default/ 2>/dev/null
   docker exec ibeam_ibeam_1 ls -la /root/.cache/chromium/Default/ 2>/dev/null
   ```

3. **Manually extract cookies:**
   ```bash
   # Find and copy cookie database
   docker exec ibeam_ibeam_1 find / -name "Cookies" -type f | head -1
   # Use that path in session-api-v2.py
   ```

### Alternative: IBeam Proxy Mode

If cookie extraction is too complex, we can make Session API act as a **proxy**:
- Bridge calls Session API `/proxy/portfolio/accounts`
- Session API uses Selenium to make request
- Returns Gateway response directly

This requires Selenium access in Session API (more complex but guaranteed to work).

---

## Next Steps After Cookies Work

Once `/test-gateway` returns `"ok": true`:

1. Update Bridge `ib_get()` to use Session API cookies
2. Test Bridge `/account` endpoint
3. Verify Next.js receives data

---

**Status:** Ready for deployment  
**Expected Outcome:** Real cookies extracted, Gateway responds with account data

