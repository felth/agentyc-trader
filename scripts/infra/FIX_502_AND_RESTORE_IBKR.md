# Fix 502 Bad Gateway & Restore IBKR Connection

## Current Problem
- **502 Bad Gateway** at `https://agentyctrader.com`
- This means nginx is running but Next.js server is not responding
- Need to diagnose, fix, and restore IBKR connection flow

---

## Step 1: Diagnose Server Status

```bash
# SSH into droplet
ssh root@<droplet-ip>

# Check if Next.js process is running
ps aux | grep -E "next start|node.*next" | grep -v grep

# Check what's listening on port 3000
sudo lsof -i :3000 || ss -tlnp | grep :3000

# Check systemd service status (if it exists)
sudo systemctl status agentyc-nextjs 2>/dev/null || sudo systemctl status agentyc-trader 2>/dev/null || echo "No systemd service found"

# Check nginx status
sudo systemctl status nginx

# Check nginx error logs
sudo tail -50 /var/log/nginx/error.log

# Check if there are any Next.js logs
sudo tail -100 /var/log/agentyc-next.log 2>/dev/null || echo "No log file found"
```

---

## Step 2: Check Build & Code State

```bash
cd /opt/agentyc-trader

# Check current git state
git status
git log -1 --oneline

# Check if .next build directory exists
ls -la .next/ 2>/dev/null || echo ".next directory missing - needs build"

# Check if node_modules exists
ls -la node_modules/ 2>/dev/null || echo "node_modules missing - needs npm install"
```

---

## Step 3: Stop & Clean Previous Process

```bash
cd /opt/agentyc-trader

# Stop systemd service if it exists
sudo systemctl stop agentyc-nextjs 2>/dev/null || true
sudo systemctl stop agentyc-trader 2>/dev/null || true

# Kill any existing Next.js processes
pkill -f "next start" || pkill -f "node.*next" || true
sleep 2

# Verify nothing is on port 3000
sudo lsof -i :3000 || echo "Port 3000 is free"
```

---

## Step 4: Pull Latest Code & Build

```bash
cd /opt/agentyc-trader

# Pull latest code
git fetch origin
git pull origin main

# Install dependencies (if needed)
npm install

# Clean previous build
rm -rf .next

# Build the app
npm run build

# Check if build succeeded
if [ -d ".next" ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - check errors above"
    exit 1
fi
```

---

## Step 5: Verify Environment Variables

```bash
cd /opt/agentyc-trader

# Check if .env.production exists
if [ -f ".env.production" ]; then
    echo "✅ .env.production exists"
    # Don't print secrets, just verify it's not empty
    if [ -s ".env.production" ]; then
        echo "✅ .env.production is not empty"
    else
        echo "❌ .env.production is empty - needs configuration"
    fi
else
    echo "⚠️ .env.production missing - create it with required env vars"
fi
```

---

## Step 6: Start Next.js Server

### Option A: Using systemd service (recommended)

```bash
# Create/update systemd service
sudo tee /etc/systemd/system/agentyc-nextjs.service > /dev/null <<'EOF'
[Unit]
Description=Agentyc Trader Next.js App
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/agentyc-trader
EnvironmentFile=/opt/agentyc-trader/.env.production
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/agentyc-next.log
StandardError=append:/var/log/agentyc-next.log
User=root

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable agentyc-nextjs
sudo systemctl start agentyc-nextjs
sudo systemctl status agentyc-nextjs --no-pager
```

### Option B: Manual start (if systemd fails)

```bash
cd /opt/agentyc-trader

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Start in background
nohup npm run start > /var/log/agentyc-next.log 2>&1 &

# Wait a moment
sleep 3

# Check if it's running
ps aux | grep -E "next start" | grep -v grep && echo "✅ Server started" || echo "❌ Server failed to start"
```

---

## Step 7: Verify Server is Responding

```bash
# Wait for server to start
sleep 5

# Test locally
curl -I http://127.0.0.1:3000 2>&1 | head -5

# Test the API endpoint
curl -sS http://127.0.0.1:3000/api/ibkr/status | head -20

# Test via nginx (should work now)
curl -I https://agentyctrader.com 2>&1 | head -5
```

---

## Step 8: Verify IBKR Services

```bash
# Check IBKR Bridge
curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health 2>&1

# Check IBKR Gateway (via nginx proxy)
curl -skI https://ibkr.agentyctrader.com/v1/api/iserver/auth/status | head -5

# Check IBeam (if running)
docker ps | grep ibeam || echo "IBeam not running (this is OK - using manual login)"
```

---

## Step 9: Test IBKR Connection Flow

1. **Open browser**: `https://agentyctrader.com`
2. **Check initial state**: Should show "IBKR not connected" banner
3. **Click "Connect IBKR"**: Should open Gateway in new tab
4. **Complete login**: Username, password, 2FA on phone
5. **Return to app**: Click "Check now" button
6. **Verify**: Banner should disappear, status should show "LIVE"

---

## Troubleshooting

### If 502 persists after restart:

```bash
# Check nginx config
sudo nginx -t

# Check nginx upstream config
sudo grep -A 5 "proxy_pass" /etc/nginx/sites-enabled/agentyctrader 2>/dev/null || \
sudo grep -A 5 "proxy_pass" /etc/nginx/sites-available/*

# Should show: proxy_pass http://127.0.0.1:3000;
```

### If build fails:

```bash
# Check Node.js version
node --version  # Should be >= 18

# Check npm version
npm --version

# Clear npm cache and try again
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm run build
```

### If server starts but crashes immediately:

```bash
# Check logs
sudo tail -100 /var/log/agentyc-next.log

# Try running in foreground to see errors
cd /opt/agentyc-trader
export $(cat .env.production | grep -v '^#' | xargs)
npm run start
```

---

## Expected Final State

✅ `https://agentyctrader.com` returns 200 OK (not 502)  
✅ `/api/ibkr/status` returns JSON with `authenticated` field  
✅ "Connect IBKR" button works and shows "Check now" after clicking  
✅ Manual login flow works: Gateway → Login → 2FA → "Check now" → Connected  
✅ Status shows "LIVE" when authenticated  

---

## Quick One-Liner Fix (if you're confident)

```bash
cd /opt/agentyc-trader && \
pkill -f "next start" && \
git pull origin main && \
rm -rf .next && \
npm run build && \
sudo systemctl restart agentyc-nextjs && \
sleep 5 && \
curl -I http://127.0.0.1:3000 && \
echo "✅ Server should be running now"
```

