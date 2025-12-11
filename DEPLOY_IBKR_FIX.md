# Deploy IBKR Connection Fix - Deployment Checklist

## Issue
The "Check IBKR Status" button is still opening `gateway.agentyctrader.com` in a browser instead of checking status via API.

## Root Cause
The production app is serving old compiled JavaScript. The code in the repo is correct, but the server needs to rebuild and restart the Next.js app.

## Code Status ✅
- ✅ `src/app/page.tsx` - Button calls `handleConnectIbkr()` (no `window.open`)
- ✅ `src/app/api/ibkr/status/route.ts` - Returns proper JSON status
- ✅ No other components have `window.open()` for IBKR Gateway
- ✅ Button has `type="button"` and proper event handlers

## Deployment Steps (Run on Droplet)

```bash
# 1. SSH to droplet
ssh root@104.248.42.213

# 2. Navigate to app directory
cd /opt/agentyc-trader

# 3. Pull latest code
git pull origin main

# 4. Verify the changes are there
grep -n "handleConnectIbkr" src/app/page.tsx
# Should show the function definition (around line 149)

# 5. Check that window.open is NOT in the file
grep -n "window.open" src/app/page.tsx
# Should return nothing (or only in comments)

# 6. Build the app
npm run build

# 7. Stop the current Next.js process
# Find the process
ps aux | grep "next start\|next dev" | grep -v grep

# Kill it (replace PID with actual process ID)
kill <PID>
# Or if using pm2/systemd:
# pm2 stop agentyc-trader
# OR
# systemctl stop nextjs-app

# 8. Start Next.js in production mode
# Option A: Direct nohup
cd /opt/agentyc-trader
export $(cat .env.production | grep -v "^#" | grep -v "^$" | xargs)
nohup npm run start > /var/log/agentyc-next.log 2>&1 &

# Option B: Using systemd (if configured)
# systemctl start nextjs-app

# 9. Verify it's running
ps aux | grep "next start" | grep -v grep
# Should show the new process

# 10. Check logs for errors
tail -f /var/log/agentyc-next.log
# Should see "Ready on http://localhost:3001" or similar
```

## Verification

After deployment:

1. **Hard refresh your browser:**
   - Mac: Cmd+Shift+R
   - Windows/Linux: Ctrl+Shift+R
   - This clears cached JavaScript

2. **Test the button:**
   - Click "Check IBKR Status" button
   - Should show "Checking..." and NOT open a new browser tab
   - Should display status message in the UI

3. **Check browser console:**
   - Open DevTools (F12)
   - Look for any errors
   - The button click should trigger a fetch to `/api/ibkr/status`

## If Still Not Working

1. **Check if old JavaScript is cached:**
   ```bash
   # On server, check when .next was last built
   ls -la /opt/agentyc-trader/.next/BUILD_ID
   stat /opt/agentyc-trader/.next
   ```

2. **Check browser cache:**
   - Open DevTools → Network tab
   - Enable "Disable cache"
   - Hard refresh (Cmd+Shift+R)
   - Check if `/api/ibkr/status` is being called

3. **Verify the deployed code:**
   ```bash
   # On server, check the compiled JavaScript
   grep -r "window.open" /opt/agentyc-trader/.next/static/chunks/ 2>/dev/null | grep -i ibkr
   # Should return nothing if fix is deployed
   ```

## Expected Behavior After Fix

✅ Button shows "Checking..." when clicked  
✅ No new browser tab opens  
✅ Status message appears in UI (green for success, amber for error)  
✅ Button text changes based on status  
✅ Network tab shows request to `/api/ibkr/status`

## Rollback (If Needed)

If something breaks:

```bash
cd /opt/agentyc-trader
git log --oneline -5  # Find previous commit
git checkout <previous-commit-hash>
npm run build
# Restart Next.js
```

