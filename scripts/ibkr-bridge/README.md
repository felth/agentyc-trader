# IBKR Bridge Server File

This file should be deployed to your droplet at: `/opt/ibkr-bridge/app.py`

## Deployment Instructions:

1. SSH into your droplet:
   ```bash
   ssh user@104.248.42.213
   ```

2. Backup existing file (if exists):
   ```bash
   sudo cp /opt/ibkr-bridge/app.py /opt/ibkr-bridge/app.py.backup
   ```

3. Copy this file to the droplet:
   ```bash
   # From your local machine:
   scp scripts/ibkr-bridge/app.py user@104.248.42.213:/opt/ibkr-bridge/app.py
   ```

4. Restart the service (if using systemd/supervisor):
   ```bash
   sudo systemctl restart ibkr-bridge
   # OR
   sudo supervisorctl restart ibkr-bridge
   ```

## Important Notes:

- BRIDGE_KEY must match Vercel IBKR_BRIDGE_KEY: `agentyc-bridge-9u1Px`
- Update IB_GATEWAY_URL when connecting to real IBKR Gateway
- All endpoints require X-Bridge-Key header for authentication

