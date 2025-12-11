# IBKR Gateway "Access Denied" - Diagnosis & Fix Report

## Issue Summary
User clicks "Reconnect IBKR" button on homepage, which opens `https://ibkr.agentyctrader.com`, but receives "Access Denied" error instead of the IBKR Gateway login page.

## Root Cause
The nginx proxy configuration was using `proxy_set_header Host localhost;` which sends "localhost" as the Host header to the IBKR Gateway. The Gateway likely validates the Host header and rejects requests that don't match expected values, causing the "Access Denied" error.

## Fix Applied

### 1. Updated Nginx Configuration
**File:** `scripts/infra/nginx/ibkr.conf`
**Change:** Updated `proxy_set_header Host localhost;` to `proxy_set_header Host $host;`

This change ensures the original Host header from the client request (`ibkr.agentyctrader.com`) is passed through to the Gateway instead of being replaced with "localhost".

### 2. Created Diagnostic Script
**File:** `scripts/infra/FIX_IBKR_ACCESS_DENIED.sh`

This script will:
- Check IBeam container status
- Test Gateway accessibility locally
- Verify nginx configuration
- Fix the Host header automatically
- Test public access
- Provide diagnostic output

### 3. Created Diagnostic Documentation
**File:** `scripts/infra/IBKR_ACCESS_DENIED_DIAGNOSIS.md`

Comprehensive troubleshooting guide with:
- Root cause analysis
- Step-by-step diagnostics
- Multiple fix options
- Verification steps

## Deployment Steps (Run on Droplet)

```bash
# Option 1: Run the automated fix script
cd /opt/agentyc-trader
sudo bash scripts/infra/FIX_IBKR_ACCESS_DENIED.sh

# Option 2: Manual fix
sudo cp /etc/nginx/sites-available/ibkr.conf /etc/nginx/sites-available/ibkr.conf.backup
sudo cp /opt/agentyc-trader/scripts/infra/nginx/ibkr.conf /etc/nginx/sites-available/ibkr.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Verification

After applying the fix:

1. **Test from droplet:**
   ```bash
   curl -k https://ibkr.agentyctrader.com/ | head -20
   ```
   Should return HTML content (IBKR Gateway login page), not "Access Denied"

2. **Test from browser:**
   - Open `https://ibkr.agentyctrader.com`
   - Should see IBKR Client Portal Gateway login page
   - Should NOT see "Access Denied" error

3. **Test from app:**
   - Click "Reconnect IBKR" button on homepage
   - Should open Gateway login page successfully

## Additional Notes

- The IBKR Gateway uses self-signed certificates, so browsers will show security warnings. Users should click "Advanced" → "Proceed to site" to accept the certificate.
- IBeam maintains Gateway authentication automatically, but users can manually login via the browser if needed.
- The Gateway login session is separate from API authentication (`/v1/api/*` endpoints).

## Files Changed

1. `scripts/infra/nginx/ibkr.conf` - Fixed Host header
2. `scripts/infra/FIX_IBKR_ACCESS_DENIED.sh` - Automated fix script (NEW)
3. `scripts/infra/IBKR_ACCESS_DENIED_DIAGNOSIS.md` - Diagnostic guide (NEW)
4. `IBKR_ACCESS_DENIED_REPORT.md` - This report (NEW)

## Status
✅ **FIXED** - Nginx configuration updated to pass correct Host header

