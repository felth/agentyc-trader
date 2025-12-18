# Deployment Note - Domain Migration to agentyc.app

## Changes Made

This commit updates the codebase to use `https://agentyc.app` as the canonical domain instead of `agentyctrader.com`.

### Files Changed:
- `src/lib/config/app.ts` - New config file with `APP_BASE_URL` constant (default: `https://agentyc.app`)
- `src/app/layout.tsx` - Updated metadata with canonical URL, OpenGraph, and Twitter card meta tags

### What Changed:
1. Added centralized app configuration (`src/lib/config/app.ts`) with `APP_BASE_URL` defaulting to `https://agentyc.app`
2. Updated Next.js metadata in `layout.tsx` to include:
   - `metadataBase`: `https://agentyc.app`
   - `alternates.canonical`: `https://agentyc.app`
   - OpenGraph tags with correct URL
   - Twitter card metadata

### What Stayed the Same:
- Gateway subdomain URLs (`ibkr.agentyctrader.com`) remain unchanged (infrastructure configuration)
- Environment variables can override defaults via `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_BASE_URL`
- All API routes use relative paths (e.g., `fetch('/api/...')`) so they work on any domain

## Deployment Steps (On Droplet)

After pulling this commit, run these commands on the droplet:

```bash
# SSH into droplet
ssh root@<droplet-ip>

# Navigate to app directory
cd /opt/agentyc-trader

# Pull latest code
git pull origin main

# Rebuild Next.js
rm -rf .next
npm run build

# Restart systemd service
sudo systemctl restart agentyc-nextjs

# Verify service is running
sudo systemctl status agentyc-nextjs
```

## Verification

After deployment, verify:
1. App loads at `https://agentyc.app`
2. View page source and check `<head>` for canonical URL pointing to `https://agentyc.app`
3. Check OpenGraph meta tags (use browser dev tools or social media debuggers)

## Environment Variables

Optional: If you need to override the default domain, set in `.env.production`:
```
NEXT_PUBLIC_APP_URL=https://agentyc.app
# or
NEXT_PUBLIC_BASE_URL=https://agentyc.app
```

