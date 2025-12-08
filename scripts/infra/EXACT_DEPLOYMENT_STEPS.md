# Exact Deployment Steps for IBKR + IBeam Status Integration

## Prerequisites
- IBeam is running and authenticated (logs show `authenticated=True, connected=True`)
- IBKR Bridge is running on port 8000
- nginx is configured and working
- Next.js app code is in `/opt/agentyc-trader`

## Step-by-Step Commands

### 1. Navigate to app directory
```bash
cd /opt/agentyc-trader
```

### 2. Pull latest code (if needed)
```bash
git pull origin main
```

### 3. Set environment variables in current shell
```bash
export IBKR_BRIDGE_URL="http://127.0.0.1:8000"
export IBKR_BRIDGE_KEY="agentyc-bridge-9u1Px"
export OPENAI_API_KEY="sk-proj-..."  # Your actual key
export PINECONE_API_KEY="pcsk_..."    # Your actual key
# Add any other required env vars from your .env file
```

### 4. Verify services are running
```bash
# Check IBKR Bridge
curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health
# Should return: {"ok":true,"service":"ibkr-bridge","status":"running"}

# Check IBeam health server (404 is OK - means server is running)
curl http://127.0.0.1:5001/
# Should return: 404 HTML (this is GOOD - means IBeam health server is up)
```

### 5. Create .env.production for persistent env vars
```bash
cat > .env.production << 'EOF'
IBKR_BRIDGE_URL=http://127.0.0.1:8000
IBKR_BRIDGE_KEY=agentyc-bridge-9u1Px
OPENAI_API_KEY=sk-proj-...
PINECONE_API_KEY=pcsk_...
# Add other env vars as needed
EOF

# Edit and add your actual API keys
nano .env.production
```

### 6. Stop existing Next.js process
```bash
pkill -f "next start" || echo "No process to kill"
```

### 7. Clean and rebuild
```bash
rm -rf .next
npm install
npm run build
```

### 8. Start Next.js with environment variables
```bash
# Load env vars and start
export $(cat .env.production | grep -v '^#' | xargs)
nohup npm run start > /var/log/agentyc-next.log 2>&1 &
echo "Next.js started (PID: $!)"
```

### 9. Wait for server to start
```bash
sleep 5
```

### 10. Test status endpoint locally
```bash
curl http://127.0.0.1:3000/api/ibkr/status | python3 -m json.tool
```

Expected response:
```json
{
  "ok": true,
  "bridge": {
    "ok": true,
    "service": "ibkr-bridge",
    "status": "running"
  },
  "gateway": {
    "ok": true,
    "status": {
      "running": true,
      "session": true,
      "connected": true,
      "authenticated": true
    }
  },
  "ibeam": {
    "ok": true,
    "status": {
      "running": true,
      "session": true,
      "connected": true,
      "authenticated": true
    }
  }
}
```

### 11. Test via public URL
```bash
curl https://ibkr.agentyctrader.com/api/ibkr/status | python3 -m json.tool
```

### 12. Check logs if needed
```bash
tail -f /var/log/agentyc-next.log
```

## Making it Permanent (Systemd Service)

Create a systemd service to auto-start Next.js on boot:

```bash
sudo nano /etc/systemd/system/agentyc-nextjs.service
```

Add:
```ini
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
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable agentyc-nextjs
sudo systemctl start agentyc-nextjs
sudo systemctl status agentyc-nextjs
```

## Troubleshooting

If status endpoint still shows errors:

1. **Check IBeam is running:**
   ```bash
   cd /opt/ibeam
   docker-compose ps
   docker logs ibeam_ibeam_1 --tail=50
   ```

2. **Check IBKR Bridge is running:**
   ```bash
   sudo systemctl status ibkr-bridge
   curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health
   ```

3. **Check Next.js logs:**
   ```bash
   tail -f /var/log/agentyc-next.log
   ```

4. **Test IBeam health directly:**
   ```bash
   curl -v http://127.0.0.1:5001/
   # 404 is OK - means server is running
   ```

5. **Verify env vars are loaded:**
   ```bash
   # In the Next.js process, env vars should be available
   # Check by looking at error messages in logs
   ```

## Expected UI Behavior

After deployment:
- Home page should show: **IBKR: LIVE**
- Agent page should show: **IBKR: LIVE**
- System Health Footer should show: **IBKR: LIVE**

When IBeam logs show `authenticated=True, connected=True`, the UI should reflect LIVE status automatically.

