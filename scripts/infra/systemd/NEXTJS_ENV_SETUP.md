# Next.js Environment Variables in Systemd

## Problem

Next.js `next start` does **NOT** automatically load `.env.production` files. Environment variables must be explicitly loaded into the process environment before starting the server.

## Root Causes

1. **Next.js behavior**: `next start` (production mode) does not auto-load `.env*` files - only `next dev` and `next build` do
2. **Environment inheritance**: Using `bash -lc 'source ...; exec npm start'` can lose env vars when npm spawns child processes
3. **Process spawning**: If `next-server` is spawned without explicit env inheritance, vars don't reach the final process

## Solution Options

### Option 1: Systemd EnvironmentFile (Recommended)

Use systemd's native `EnvironmentFile` directive. This is the cleanest approach.

**Service file**: `scripts/infra/systemd/agentyc-trader.service`

**Deployment**:
```bash
# Copy service file
sudo cp /opt/agentyc-trader/scripts/infra/systemd/agentyc-trader.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start agentyc-trader

# Enable on boot
sudo systemctl enable agentyc-trader

# Check status
sudo systemctl status agentyc-trader
```

**Notes**:
- Systemd's `EnvironmentFile` expects `KEY=value` format (no `export` keyword)
- Comments starting with `#` and empty lines are ignored
- Variables with spaces in values should be quoted: `KEY="value with spaces"`

### Option 2: Wrapper Script (More Reliable for Complex .env Files)

Use a wrapper script that sources the env file and then exec's Next.js directly.

**Service file**: Update `ExecStart` to use the wrapper script:

```ini
ExecStart=/opt/agentyc-trader/scripts/infra/systemd/start-nextjs-with-env.sh
```

**Alternative service file** (`agentyc-trader-wrapper.service`):
```ini
[Unit]
Description=Agentyc Trader Next.js App
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/agentyc-trader
ExecStart=/opt/agentyc-trader/scripts/infra/systemd/start-nextjs-with-env.sh
Restart=on-failure
RestartSec=5
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Verification Commands

Run these commands to verify env vars are in the `next-server` process:

### Command 1: Check /proc/<pid>/environ
```bash
PID_NEXT=$(pgrep -f "next-server.*16\.0\.7" | head -n 1)
sudo tr '\0' '\n' < /proc/"$PID_NEXT"/environ | grep -E '^(IBKR_|NEXT_PUBLIC_IBKR_|SUPABASE_|PINECONE_|OPENAI_)=' || echo "NO_VARS_VISIBLE"
```

**Expected**: Should show all your env vars, NOT "NO_VARS_VISIBLE"

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

**Expected**: All variables should show "✓ ... is present"

### Command 3: Test via API (if available)
```bash
# Test that Next.js can actually access the env vars
curl -s http://127.0.0.1:3001/api/health || echo "Health endpoint not available"
# Or test an endpoint that uses env vars
curl -s http://127.0.0.1:3001/api/ibkr/status | jq '.'
```

**Expected**: API should respond (if endpoint exists) and use env vars correctly

### Automated Verification Script

Run the provided verification script:
```bash
sudo /opt/agentyc-trader/scripts/infra/systemd/verify-nextjs-env.sh
```

## Troubleshooting

### If vars still not visible after using EnvironmentFile:

1. **Check .env.production format**:
   ```bash
   # Should be KEY=value format (no export keyword)
   cat /opt/agentyc-trader/.env.production | head -5
   ```

2. **Check systemd logs**:
   ```bash
   sudo journalctl -u agentyc-trader -n 50 --no-pager
   ```

3. **Verify systemd loaded the file**:
   ```bash
   sudo systemctl show agentyc-trader --property=Environment
   ```

4. **Try wrapper script approach** if EnvironmentFile doesn't work

### If using wrapper script:

1. **Ensure script is executable**:
   ```bash
   sudo chmod +x /opt/agentyc-trader/scripts/infra/systemd/start-nextjs-with-env.sh
   ```

2. **Test script manually**:
   ```bash
   sudo /opt/agentyc-trader/scripts/infra/systemd/start-nextjs-with-env.sh
   # Should start Next.js (Ctrl+C to stop)
   ```

## Key Differences from npm start

**Avoid**: `ExecStart=/usr/bin/bash -lc 'source ...; exec npm start'`

**Why**: `npm start` runs `next start` as a child process, and npm may not preserve all environment variables when spawning.

**Better**: Either:
- Use `EnvironmentFile` + direct `node` execution
- Use wrapper script that exec's `node` directly (bypasses npm)

This ensures env vars are in the process environment before Next.js starts.

