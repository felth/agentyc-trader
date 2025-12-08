# Droplet Environment Variables Setup

## Required Environment Variables

For the Next.js app running on the droplet, set these environment variables:

### 1. IBKR Bridge URL
```bash
export IBKR_BRIDGE_URL="http://127.0.0.1:8000"
export IBKR_BRIDGE_KEY="agentyc-bridge-9u1Px"
```

### 2. API Keys (already set in shell)
```bash
export OPENAI_API_KEY="sk-proj-..."
export PINECONE_API_KEY="pcsk_..."
```

### 3. Other Required Variables
Check `.env.example` or `.env.local` for other required variables like:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PINECONE_INDEX`
- `PINECONE_HOST`

## Permanent Setup Options

### Option A: Systemd Service Environment (Recommended)

Create/edit the systemd service file for Next.js:

```bash
sudo nano /etc/systemd/system/agentyc-nextjs.service
```

Add:
```ini
[Service]
Environment="IBKR_BRIDGE_URL=http://127.0.0.1:8000"
Environment="IBKR_BRIDGE_KEY=agentyc-bridge-9u1Px"
Environment="OPENAI_API_KEY=sk-proj-..."
Environment="PINECONE_API_KEY=pcsk_..."
# Add other env vars as needed
```

Then reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart agentyc-nextjs
```

### Option B: .env.production File

Create `.env.production` in `/opt/agentyc-trader`:

```bash
cd /opt/agentyc-trader
nano .env.production
```

Add:
```
IBKR_BRIDGE_URL=http://127.0.0.1:8000
IBKR_BRIDGE_KEY=agentyc-bridge-9u1Px
OPENAI_API_KEY=sk-proj-...
PINECONE_API_KEY=pcsk_...
```

Then restart the Next.js app.

### Option C: Shell Script Wrapper

Create a startup script that exports env vars before starting Next.js:

```bash
nano /opt/agentyc-trader/start.sh
```

Add:
```bash
#!/bin/bash
export IBKR_BRIDGE_URL="http://127.0.0.1:8000"
export IBKR_BRIDGE_KEY="agentyc-bridge-9u1Px"
export OPENAI_API_KEY="sk-proj-..."
export PINECONE_API_KEY="pcsk_..."
cd /opt/agentyc-trader
npm run start
```

Make executable:
```bash
chmod +x /opt/agentyc-trader/start.sh
```

## Verification

After setting env vars, verify:

```bash
# Check bridge is accessible
curl -H "X-Bridge-Key: agentyc-bridge-9u1Px" http://127.0.0.1:8000/health

# Check IBeam health server
curl http://127.0.0.1:5001/

# Check app status endpoint
curl https://ibkr.agentyctrader.com/api/ibkr/status
```

