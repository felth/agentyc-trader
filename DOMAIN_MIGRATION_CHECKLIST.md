# Domain Migration Checklist - agentyctrader.com → agentyc.app

## Files Changed

### ✅ New Files
- `src/lib/config/app.ts` - App configuration constants (APP_BASE_URL defaults to `https://agentyc.app`)
- `DEPLOYMENT_NOTE.md` - Deployment instructions for droplet
- `DOMAIN_MIGRATION_CHECKLIST.md` - This file

### ✅ Modified Files
- `src/app/layout.tsx` - Added canonical URL, OpenGraph, and Twitter metadata using `https://agentyc.app`

## Changes Summary

### 1. App Configuration
- Created `src/lib/config/app.ts` with:
  - `APP_BASE_URL` constant (defaults to `https://agentyc.app`)
  - Supports override via `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_BASE_URL` env vars
  - `APP_METADATA` object for centralized metadata

### 2. Metadata Updates
- Updated `src/app/layout.tsx` to include:
  - `metadataBase`: `https://agentyc.app`
  - `alternates.canonical`: `https://agentyc.app`
  - OpenGraph tags (title, description, url, siteName)
  - Twitter card metadata

### 3. What Was NOT Changed
- Gateway subdomain URLs (`ibkr.agentyctrader.com`) - infrastructure configuration, left as-is
- All API routes already use relative paths (e.g., `fetch('/api/...')`) so they work on any domain
- No cookies with explicit domains found (all cookies use default/host-only behavior)

## Verification

After deployment, verify:
1. ✅ App loads correctly at `https://agentyc.app`
2. ✅ View page source - `<head>` should contain:
   - `<link rel="canonical" href="https://agentyc.app">`
   - OpenGraph meta tags with `https://agentyc.app`
3. ✅ No references to `agentyctrader.com` in user-facing content (only gateway subdomain in code fallbacks)

