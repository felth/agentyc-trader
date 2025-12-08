#!/bin/bash
# Startup script for Next.js app on droplet
# This ensures .env.production is loaded before starting

set -e

cd /opt/agentyc-trader

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "✗ Error: .env.production not found"
    exit 1
fi

# Load environment variables from .env.production and export them
# Filter out comments and empty lines, then export each line
set -a  # Automatically export all variables
source <(cat .env.production | grep -v '^#' | grep -v '^$' | sed 's/^/export /')
set +a  # Turn off automatic export

# Verify required env vars are set
if [ -z "$IBKR_BRIDGE_URL" ]; then
    echo "✗ Error: IBKR_BRIDGE_URL is not set in .env.production"
    exit 1
fi

if [ -z "$IBKR_BRIDGE_KEY" ]; then
    echo "✗ Error: IBKR_BRIDGE_KEY is not set in .env.production"
    exit 1
fi

echo "✓ Environment variables loaded from .env.production"
echo "  IBKR_BRIDGE_URL=$IBKR_BRIDGE_URL"

# Start Next.js with environment variables
exec npm run start

