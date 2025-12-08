# IBeam Setup for Headless IBKR Gateway Authentication

This guide sets up IBeam to automate IBKR Client Portal Gateway authentication, eliminating the need for daily SSH/lynx login.

## Overview

IBeam uses headless Chrome to:
- Automatically fill in IBKR username/password on the Gateway login page
- Wait for you to approve the 2FA push on your phone
- Keep the session authenticated and automatically maintain it
- Handle gateway restarts and re-authentication

## Prerequisites

- DigitalOcean droplet with IP: `104.248.42.213`
- Existing IBKR Gateway installed at `/opt/ibkr-gateway/clientportal`
- Nginx reverse proxy configured for `ibkr.agentyctrader.com`
- IBKR account credentials (ideally a dedicated secondary account for API access)
- SSH access to the droplet

## Phase 2.1 — Prepare Droplet for IBeam

### 1. Install Docker

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker root
```

Verify Docker is running:

```bash
sudo docker --version
sudo docker compose version
sudo systemctl status docker
```

### 2. Backup Current Gateway Configuration

Before making changes, back up your existing gateway setup:

```bash
# Check current gateway service
systemctl cat ibkr-gateway.service

# List gateway directory structure
ls -R /opt/ibkr-gateway

# Create backup
mkdir -p /opt/ibkr-gateway-backup
cp -r /opt/ibkr-gateway/clientportal/root /opt/ibkr-gateway-backup/root-$(date +%Y%m%d)

# Also backup the systemd service file
cp /etc/systemd/system/ibkr-gateway.service /opt/ibkr-gateway-backup/ibkr-gateway.service-$(date +%Y%m%d) 2>/dev/null || true
```

## Phase 2.2 — Install IBeam

### 3. Create IBeam Workspace

```bash
mkdir -p /opt/ibeam
cd /opt/ibeam
```

### 4. Create Environment File

Copy the example and create your .env file:

```bash
cp /opt/agentyc-trader/scripts/infra/ibeam/.env.example /opt/ibeam/.env
chmod 600 /opt/ibeam/.env  # Set restrictive permissions immediately
```

The .env.example file contains the credentials. Verify the contents:

```bash
cat /opt/ibeam/.env
```

You should see:
- `IBEAM_ACCOUNT=liamfeltham`
- `IBEAM_PASSWORD=xuvgyn-Qicgun-mytzy8`

**Security Note:**
- The .env file contains sensitive credentials
- File permissions are set to 600 (owner read/write only)
- The .env file is gitignored and will not be committed to version control
- Consider using Docker secrets for production (advanced)

### 5. Pull IBeam Docker Image

```bash
sudo docker pull voyz/ibeam:latest
```

### 6. Create Docker Compose Configuration

Copy the docker-compose.yml:

```bash
cp /opt/agentyc-trader/scripts/infra/ibeam/docker-compose.yml /opt/ibeam/docker-compose.yml
```

The compose file:
- Mounts `/opt/ibkr-gateway/clientportal` into the container as `/srv/clientportal.gw`
- Exposes port 5000 for the gateway
- Sets up automatic restart policies
- Includes health checks

### 7. Stop Existing Gateway Service (Temporary)

IBeam will manage the gateway, so we need to stop the old systemd service:

```bash
sudo systemctl stop ibkr-gateway.service
sudo systemctl disable ibkr-gateway.service  # Optional: disable auto-start
```

**Note:** Don't delete the service yet—we'll keep it as a backup fallback.

## Phase 2.3 — Switch from Manual Gateway Service to IBeam

### 8. Stop and Disable Old Gateway Service

Stop the existing systemd-managed gateway (IBeam will manage it):

```bash
sudo systemctl stop ibkr-gateway.service
sudo systemctl disable ibkr-gateway.service
```

**Note:** Keep the service file as backup. You can re-enable it if needed:
```bash
sudo systemctl enable ibkr-gateway.service
sudo systemctl start ibkr-gateway.service
```

### 9. Start IBeam Container

```bash
cd /opt/ibeam
sudo docker compose up -d
sudo docker ps
```

Confirm the `ibeam` container is running.

### 10. Verify Gateway + IBeam Locally on Droplet

Check if the gateway is responding (initially will show unauthenticated):

```bash
curl -vk https://127.0.0.1:5000/v1/api/iserver/auth/status
```

Initially you'll see something like:
```json
{"authenticated":false,"connected":false,...}
```

This is expected before IBeam completes authentication.

### 11. Monitor IBeam Logs

Watch the logs to see IBeam's authentication process:

```bash
sudo docker compose logs -f ibeam
```

You should see:
1. IBeam starting the gateway
2. Opening headless Chrome
3. Navigating to the login page
4. Filling in credentials
5. Waiting for 2FA approval

**Action Required:** When you see "Waiting for 2FA approval", approve the push notification on your phone. IBeam will detect the approval and complete authentication.

### 12. Verify Authentication Status

After approving 2FA on your phone, check if IBeam successfully authenticated:

```bash
# From droplet (direct gateway)
curl -vk https://127.0.0.1:5000/v1/api/iserver/auth/status

# Through nginx (public domain)
curl -vk https://ibkr.agentyctrader.com/v1/api/iserver/auth/status

# From your app
# The /api/ibkr/status endpoint should now show gateway as authenticated
```

You should now see `"authenticated": true` in the response.

## Phase 2.4 — Create Systemd Service for IBeam (Optional)

For better integration with systemd, create a service wrapper:

```bash
sudo tee /etc/systemd/system/ibeam.service >/dev/null << 'EOF'
[Unit]
Description=IBeam - Headless IBKR Gateway Authentication
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/ibeam
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ibeam.service
sudo systemctl start ibeam.service
```

## Verification

After setup, verify everything works:

1. **IBeam container is running:**
   ```bash
   sudo docker compose -f /opt/ibeam/docker-compose.yml ps
   ```

2. **Gateway is accessible:**
   ```bash
   curl -vk https://127.0.0.1:5000/v1/api/iserver/auth/status
   ```

3. **Reverse proxy works:**
   ```bash
   curl -vk https://ibkr.agentyctrader.com/v1/api/iserver/auth/status
   ```

4. **App shows authenticated:**
   - Open the Agentyc Trader app
   - Check `/api/ibkr/status` endpoint
   - Should show `gatewayAuthenticated: true`

## Daily Usage

With IBeam running:

1. **Reconnect IBKR in app:**
   - Tap "Reconnect IBKR" in the app
   - Opens `https://ibkr.agentyctrader.com`
   - IBeam automatically fills credentials
   - Approve 2FA push on phone
   - Gateway authenticates automatically

2. **Automatic Maintenance:**
   - IBeam automatically maintains the session
   - If gateway restarts, IBeam re-authenticates
   - Check logs if issues occur: `sudo docker compose -f /opt/ibeam/docker-compose.yml logs -f`

## Troubleshooting

### IBeam fails to authenticate

```bash
# Check logs
sudo docker compose -f /opt/ibeam/docker-compose.yml logs -f ibeam

# Restart IBeam
sudo docker compose -f /opt/ibeam/docker-compose.yml restart

# Verify credentials in .env
cat /opt/ibeam/.env  # (be careful with credentials)
```

### Gateway not starting

```bash
# Check if gateway files are accessible
ls -la /opt/ibkr-gateway/clientportal

# Verify mount in container
sudo docker compose -f /opt/ibeam/docker-compose.yml exec ibeam ls -la /srv/clientportal.gw
```

### Container won't start

```bash
# Check Docker status
sudo systemctl status docker

# Check container logs
sudo docker logs ibeam

# Verify docker-compose.yml syntax
sudo docker compose -f /opt/ibeam/docker-compose.yml config
```

## Security Notes

- **Credentials are stored in `/opt/ibeam/.env`** — treat this file as sensitive
- Set restrictive permissions: `chmod 600 /opt/ibeam/.env`
- Use a dedicated IBKR account for API access (not your main trading account)
- Monitor logs regularly for authentication issues
- Consider Docker secrets for production deployments (future enhancement)

## Rollback Plan

If IBeam doesn't work, you can revert to the old systemd service:

```bash
# Stop IBeam
sudo docker compose -f /opt/ibeam/docker-compose.yml down

# Re-enable old gateway service
sudo systemctl enable ibkr-gateway.service
sudo systemctl start ibkr-gateway.service
```

## Next Steps

After IBeam is running:
- Test "Reconnect IBKR" flow in the app
- Verify automatic session maintenance
- Monitor logs for the first few days
- Document any custom configuration needed

