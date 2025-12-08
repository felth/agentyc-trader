#!/bin/bash
# Startup script for Next.js app on droplet
# This ensures .env.production is loaded before starting

set -e

cd /opt/agentyc-trader

# Load environment variables from .env.production
if [ -f .env.production ]; then
    echo "Loading .env.production..."
    export $(cat .env.production | grep -v '^#' | grep -v '^$' | xargs)
    echo "✓ Environment variables loaded"
else
    echo "⚠️  Warning: .env.production not found"
fi

# Verify required env vars are set
if [ -z "$IBKR_BRIDGE_URL" ]; then
    echo "✗ Error: IBKR_BRIDGE_URL is not set"
    exit 1
fi

if [ -z "$IBKR_BRIDGE_KEY" ]; then
    echo "✗ Error: IBKR_BRIDGE_KEY is not set"
    exit 1
fi

echo "Starting Next.js app..."
echo "IBKR_BRIDGE_URL=$IBKR_BRIDGE_URL"
echo "IBKR_BRIDGE_KEY=$IBKR_BRIDGE_KEY"

# Start Next.js with environment variables
npm run start

