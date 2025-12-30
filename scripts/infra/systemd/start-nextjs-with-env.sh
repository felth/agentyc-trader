#!/bin/bash
# Wrapper script that loads .env.production and starts Next.js
# This ensures env vars are in the process environment before exec

set -euo pipefail

cd /opt/agentyc-trader

# Load environment variables
set -a
source /opt/agentyc-trader/.env.production
set +a

# Execute Next.js directly (not through npm) to preserve env vars
exec /usr/bin/node node_modules/.bin/next start --port 3001

