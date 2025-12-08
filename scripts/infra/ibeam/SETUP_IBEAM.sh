#!/bin/bash
# Quick setup script for IBeam on the droplet
# Run this on the droplet as root after pulling the repo

set -e

echo "=== IBeam Setup Script ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (sudo)"
    exit 1
fi

# 1. Install Docker
echo "Step 1: Installing Docker..."
if ! command -v docker &> /dev/null; then
    apt update
    apt install -y docker.io docker-compose-plugin
    systemctl enable --now docker
    usermod -aG docker root
    echo "Docker installed."
else
    echo "Docker already installed."
fi

# 2. Create IBeam workspace
echo ""
echo "Step 2: Creating IBeam workspace..."
mkdir -p /opt/ibeam/outputs
cd /opt/ibeam

# 3. Copy docker-compose.yml
echo ""
echo "Step 3: Copying docker-compose.yml..."
if [ -f "/opt/agentyc-trader/scripts/infra/ibeam/docker-compose.yml" ]; then
    cp /opt/agentyc-trader/scripts/infra/ibeam/docker-compose.yml /opt/ibeam/docker-compose.yml
    echo "docker-compose.yml copied."
else
    echo "ERROR: docker-compose.yml not found in repo. Please ensure repo is cloned to /opt/agentyc-trader"
    exit 1
fi

# 4. Create .env file
echo ""
echo "Step 4: Creating .env file..."
if [ ! -f "/opt/ibeam/.env" ]; then
    cat > /opt/ibeam/.env << 'EOF'
# IBKR credentials
IBEAM_ACCOUNT=liamfeltham
IBEAM_PASSWORD=xuvgyn-Qicgun-mytzy8

# Gateway location inside the container (mounted from host)
IBEAM_GATEWAY_DIR=/srv/clientportal.gw

# Base URL / port IBeam expects for the gateway
IBEAM_GATEWAY_BASE_URL=https://localhost:5000

# Optional: be conservative on retries / lockouts
IBEAM_MAX_FAILED_AUTH=5
IBEAM_MAX_IMMEDIATE_ATTEMPTS=3
IBEAM_OAUTH_TIMEOUT=120
IBEAM_PAGE_LOAD_TIMEOUT=120
IBEAM_MAINTENANCE_INTERVAL=60

# Logging
IBEAM_LOG_LEVEL=INFO
IBEAM_LOG_TO_FILE=True
EOF
    chmod 600 /opt/ibeam/.env
    echo ".env file created with credentials."
else
    echo ".env file already exists, skipping."
fi

# 5. Stop old gateway service
echo ""
echo "Step 5: Stopping old gateway service..."
if systemctl is-active --quiet ibkr-gateway.service; then
    systemctl stop ibkr-gateway.service
    systemctl disable ibkr-gateway.service
    echo "Old gateway service stopped and disabled."
else
    echo "Old gateway service was not running."
fi

# 6. Pull IBeam image
echo ""
echo "Step 6: Pulling IBeam Docker image..."
docker pull voyz/ibeam:latest

# 7. Start IBeam
echo ""
echo "Step 7: Starting IBeam..."
cd /opt/ibeam
docker compose up -d

echo ""
echo "=== Setup Complete ==="
echo ""
echo "IBeam container is starting. Monitor logs with:"
echo "  sudo docker compose -f /opt/ibeam/docker-compose.yml logs -f ibeam"
echo ""
echo "Verify gateway status with:"
echo "  curl -vk https://127.0.0.1:5000/v1/api/iserver/auth/status"
echo ""
echo "Approve the 2FA push on your phone when prompted in the logs!"

