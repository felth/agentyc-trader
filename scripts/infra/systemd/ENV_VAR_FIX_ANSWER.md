# Next.js Environment Variables Not Reaching Process - Fix

## 1. Root Causes

### Primary Cause: Next.js `next start` doesn't auto-load `.env.production`
- Next.js only auto-loads `.env*` files during `next dev` and `next build`
- During `next start` (production), env vars must be in the process environment before Next.js starts

### Secondary Cause: Environment lost through npm
- Using `bash -lc 'source ...; exec npm start'` can lose vars when npm spawns child processes
- `npm start` → `next start` → `next-server` chain may not preserve environment if processes spawn without explicit env inheritance

### Why `/proc/<pid>/environ` shows nothing
- If env vars aren't set when the process starts, they won't appear in `/proc/<pid>/environ`
- Even if sourced in a parent shell, if the final `next-server` process doesn't inherit them, they're absent

## 2. Reliable Systemd Solution

### Recommended: Use systemd's `EnvironmentFile` + direct node execution

**Service file**: `/opt/agentyc-trader/scripts/infra/systemd/agentyc-trader.service`

```ini
[Unit]
Description=Agentyc Trader Next.js App
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/agentyc-trader
EnvironmentFile=/opt/agentyc-trader/.env.production
ExecStart=/usr/bin/node node_modules/.bin/next start --port 3001
Restart=on-failure
RestartSec=5
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Key points**:
- `EnvironmentFile` loads vars into systemd's environment
- Direct `node` execution bypasses npm to ensure vars are preserved
- `ExecStart` uses absolute paths for reliability

**Deploy**:
```bash
sudo cp /opt/agentyc-trader/scripts/infra/systemd/agentyc-trader.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable agentyc-trader
sudo systemctl start agentyc-trader
```

### Alternative: Wrapper Script (if EnvironmentFile has issues)

If `.env.production` has complex syntax that systemd can't parse, use the wrapper script:

```ini
ExecStart=/opt/agentyc-trader/scripts/infra/systemd/start-nextjs-with-env.sh
```

The wrapper script sources the env file and exec's node directly.

## 3. Verification Commands

### Command 1: Check env vars in /proc/<pid>/environ
```bash
PID_NEXT=$(pgrep -f "next-server.*16\.0\.7" | head -n 1)
sudo tr '\0' '\n' < /proc/"$PID_NEXT"/environ | grep -E '^(IBKR_|NEXT_PUBLIC_IBKR_|SUPABASE_|PINECONE_|OPENAI_)=' || echo "NO_VARS_VISIBLE"
```

**Expected**: Should show all env vars (NOT "NO_VARS_VISIBLE")

### Command 2: Verify specific required variables
```bash
PID_NEXT=$(pgrep -f "next-server.*16\.0\.7" | head -n 1)
for VAR in IBKR_BRIDGE_URL IBKR_BRIDGE_KEY NEXT_PUBLIC_IBKR_GATEWAY_URL SUPABASE_URL OPENAI_API_KEY PINECONE_API_KEY; do
  if sudo tr '\0' '\n' < /proc/"$PID_NEXT"/environ | grep -q "^${VAR}="; then
    echo "✓ $VAR is present"
  else
    echo "✗ $VAR is MISSING"
  fi
done
```

**Expected**: All should show "✓ ... is present"

### Command 3: Test via Next.js API
```bash
# Verify Next.js can actually access the vars (not just present in /proc)
curl -s http://127.0.0.1:3001/api/ibkr/status | jq '.bridge' || echo "Endpoint test failed"
```

**Expected**: Should return valid JSON with bridge status (confirms vars are accessible to Next.js runtime)

### All-in-One Verification Script
```bash
sudo /opt/agentyc-trader/scripts/infra/systemd/verify-nextjs-env.sh
```

This runs all three checks automatically.

## Why This Works

1. **EnvironmentFile**: Systemd loads `.env.production` into its environment before starting the service
2. **Direct node execution**: Bypassing npm eliminates environment loss through process spawning
3. **ExecStart with absolute paths**: Ensures systemd can find the executables
4. **Process inheritance**: When systemd starts the process, env vars are in the environment from the start

## Troubleshooting

If vars still not visible:

1. **Check .env.production format**: Should be `KEY=value` (no `export`)
2. **Check systemd loaded file**: `sudo systemctl show agentyc-trader --property=Environment`
3. **Check logs**: `sudo journalctl -u agentyc-trader -n 50`
4. **Try wrapper script approach** if EnvironmentFile parsing fails

