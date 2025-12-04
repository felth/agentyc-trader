# IBKR Bridge Deployment on Droplet

## Quick Deployment Commands

Run these commands **ON THE DROPLET** (Ubuntu) via SSH:

### 1. Locate or create the bridge directory

```bash
# Check common locations
ls -la /opt/ibkr-bridge 2>/dev/null || \
ls -la /srv/ibkr-bridge 2>/dev/null || \
ls -la /root/ibkr-bridge 2>/dev/null || \
ls -la ~/ibkr-bridge 2>/dev/null

# If none exist, create it
sudo mkdir -p /opt/ibkr-bridge
sudo chown $USER:$USER /opt/ibkr-bridge
cd /opt/ibkr-bridge
```

### 2. Fetch the latest code from GitHub

```bash
# Option A: Clone the repo (first time)
cd /tmp
git clone https://github.com/felth/agentyc-trader.git agentyc-repo
cd agentyc-repo/scripts/ibkr-bridge
cp app.py /opt/ibkr-bridge/app.py

# Option B: If repo already exists, just update
cd /opt/ibkr-bridge
if [ -d ".git" ]; then
    git pull origin main
else
    # Clone just the scripts/ibkr-bridge directory
    cd /tmp
    rm -rf agentyc-repo
    git clone https://github.com/felth/agentyc-trader.git agentyc-repo
    cp agentyc-repo/scripts/ibkr-bridge/app.py /opt/ibkr-bridge/app.py
fi
```

### 3. Install Python dependencies (if needed)

```bash
pip3 install --user fastapi uvicorn httpx pydantic || \
sudo pip3 install fastapi uvicorn httpx pydantic
```

### 4. Stop existing bridge service

```bash
pkill -f uvicorn || true
sleep 2
```

### 5. Start the bridge service

```bash
cd /opt/ibkr-bridge
nohup python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 > bridge.log 2>&1 &
echo "Bridge PID: $!"
sleep 3
```

### 6. Test the bridge

```bash
# Test health endpoint
curl -s -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health | jq

# Test account endpoint (will call real IBKR Gateway)
curl -s -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/account | jq

# Test IBKR Gateway directly
curl -s http://127.0.0.1:5000/v1/api/iserver/auth/status | jq
```

### 7. Verify IBKR Gateway connection

```bash
# Check if gateway is authenticated
curl -s -k https://localhost:5000/v1/api/iserver/auth/status | jq

# Should show: {"authenticated": true} or {"connected": true}
```

## Troubleshooting

### Check bridge logs
```bash
tail -f /opt/ibkr-bridge/bridge.log
```

### Check if bridge is running
```bash
ps aux | grep uvicorn
```

### Check if port 8000 is in use
```bash
netstat -tlnp | grep 8000
```

### Restart bridge manually
```bash
cd /opt/ibkr-bridge
pkill -f uvicorn
sleep 2
nohup python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 > bridge.log 2>&1 &
```

## Expected Results

After deployment:

1. **Bridge Health Check:**
   ```json
   {
     "ok": true,
     "service": "ibkr-bridge",
     "status": "running"
   }
   ```

2. **Bridge Account Endpoint:**
   Should return real IBKR account data (not mock data):
   ```json
   {
     "ok": true,
     "accountId": "...",
     "balance": ...,
     "equity": ...,
     "unrealizedPnl": ...,
     "buyingPower": ...
   }
   ```

3. **IBKR Gateway Status:**
   Should show authenticated status:
   ```json
   {
     "authenticated": true,
     "connected": true
   }
   ```

