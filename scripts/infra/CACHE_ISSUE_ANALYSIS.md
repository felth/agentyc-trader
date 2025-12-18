# Cache Issue Analysis - UI Changes Not Showing

## Problem
UI changes to `src/app/page.tsx` are not appearing after code was pushed.

## Root Cause Analysis

### Issue 1: Missing Dynamic Export
**Location:** `src/app/page.tsx`

**Problem:** The page component doesn't have `export const dynamic = 'force-dynamic'` which means Next.js might cache the page.

**Current state:**
```typescript
"use client";

import React, { useEffect, useState, useRef } from "react";
// ... no export const dynamic
```

**Fix needed:**
```typescript
"use client";

export const dynamic = 'force-dynamic'; // Add this

import React, { useEffect, useState, useRef } from "react";
```

---

### Issue 2: Server Not Rebuilt
**Problem:** Code was pushed to git, but the server on the droplet hasn't been rebuilt.

**Next.js production builds:**
- JavaScript bundles are content-hashed (e.g., `_app-abc123.js`)
- Each build generates new bundle filenames
- If server wasn't rebuilt, it's still serving old bundles with old filenames
- Browser requests the new filename → 404 → falls back to cached version

**Required actions on server:**
1. Pull latest code: `git pull origin main`
2. Rebuild: `rm -rf .next && npm run build`
3. Restart server: `sudo systemctl restart agentyc-nextjs` or restart process

---

### Issue 3: Browser Cache
**Problem:** Even with new builds, browsers aggressively cache JavaScript bundles.

**Next.js default behavior:**
- Serves JS bundles with long cache headers (1 year)
- Uses content hashes in filenames to bust cache
- But if server wasn't rebuilt, old filenames still work → browser uses cached version

**Manual fix for testing:**
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
- Clear browser cache
- Open DevTools → Network tab → Disable cache (while DevTools open)

---

### Issue 4: Nginx Cache (if configured)
**Problem:** Nginx might be caching static assets.

**Check if nginx is caching:**
```bash
# Check nginx config for proxy_cache or cache settings
sudo grep -r "proxy_cache\|cache" /etc/nginx/sites-available/agentyctrader*
```

**If caching is enabled, add headers:**
```nginx
location /_next/static {
    proxy_cache_bypass $http_pragma;
    proxy_cache_revalidate on;
    expires 365d;
    add_header Cache-Control "public, immutable";
}
```

But this is usually fine - the issue is likely #2 (server not rebuilt).

---

## Diagnosis Steps

### 1. Check if server has latest code
```bash
cd /opt/agentyc-trader
git log -1 --oneline
# Should show: 82de8cb Fix IBKR UI: Use safety.ibkrConnected/ibkrAuthenticated...
```

### 2. Check if .next directory exists and is fresh
```bash
cd /opt/agentyc-trader
ls -la .next/static/chunks/ | head -5
# Check timestamp - should be recent if rebuilt
```

### 3. Check what JavaScript bundle is being served
In browser DevTools → Network tab:
- Look for requests to `/_next/static/chunks/`
- Check the filename hash
- Compare to what's in `.next/static/chunks/` on server

### 4. Check server logs
```bash
sudo tail -50 /var/log/agentyc-next.log
# Look for build errors or startup issues
```

---

## Solution (In Order)

### Step 1: Add Dynamic Export to Page
**File:** `src/app/page.tsx`

Add at the top (after "use client"):
```typescript
export const dynamic = 'force-dynamic';
```

This ensures Next.js doesn't cache the page component.

### Step 2: Rebuild on Server
```bash
cd /opt/agentyc-trader
git pull origin main
rm -rf .next
npm run build
sudo systemctl restart agentyc-nextjs
# OR if not using systemd:
# pkill -f "next start"
# export $(cat .env.production | grep -v '^#' | xargs)
# nohup npm run start > /var/log/agentyc-next.log 2>&1 &
```

### Step 3: Verify Build
```bash
# Check build succeeded
ls -la .next/static/chunks/ | head -10

# Check server is running
curl -I http://127.0.0.1:3000

# Check new bundles are served
curl -I http://127.0.0.1:3000/_next/static/chunks/main-app-*.js 2>&1 | head -5
```

### Step 4: Clear Browser Cache
- Hard refresh: `Cmd+Shift+R` / `Ctrl+Shift+R`
- Or: DevTools → Network → "Disable cache" → Reload

---

## Quick Test

After rebuild, check the JavaScript bundle hash:

```bash
# On server
ls -la /opt/agentyc-trader/.next/static/chunks/main-app*.js

# In browser DevTools → Network → find main-app-*.js
# Filenames should match
```

If filenames don't match → server wasn't rebuilt properly.

---

## Prevention

For future deployments, ensure:
1. ✅ Code is pushed to git
2. ✅ Server pulls latest code: `git pull origin main`
3. ✅ Old build is removed: `rm -rf .next`
4. ✅ New build is created: `npm run build`
5. ✅ Server is restarted: `sudo systemctl restart agentyc-nextjs`

Add `export const dynamic = 'force-dynamic'` to prevent Next.js caching the page.

