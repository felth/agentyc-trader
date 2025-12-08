#!/bin/bash
# Simple, bulletproof startup script
# This method uses the `env` command to inject vars directly into the process

cd /opt/agentyc-trader

# Check .env.production exists
if [ ! -f .env.production ]; then
    echo "Error: .env.production not found" >&2
    exit 1
fi

# Read .env.production and convert to env command format
# Filter comments and empty lines, then pass to env command
ENV_VARS=$(cat .env.production | grep -v '^#' | grep -v '^$' | tr '\n' ' ')

# Start Next.js with env vars injected
exec env $ENV_VARS npm run start

