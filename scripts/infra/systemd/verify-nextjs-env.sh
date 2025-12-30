#!/bin/bash
# Verification script to check that Next.js process has environment variables
# Run this after starting the service with: sudo systemctl start agentyc-trader

set -e

echo "=== Verification: Next.js Environment Variables ==="
echo ""

# 1. Find the next-server process PID
PID_NEXT=$(pgrep -f "next-server.*16\.0\.7" | head -n 1)

if [ -z "$PID_NEXT" ]; then
    echo "✗ Error: next-server process not found"
    echo "  Make sure the service is running: sudo systemctl status agentyc-trader"
    exit 1
fi

echo "✓ Found next-server process: PID $PID_NEXT"
echo ""

# 2. Extract and display env vars from /proc/<pid>/environ
echo "=== Command 1: Check /proc/<pid>/environ ==="
echo "Command: sudo tr '\\0' '\\n' < /proc/$PID_NEXT/environ | grep -E '^(IBKR_|NEXT_PUBLIC_IBKR_|SUPABASE_|PINECONE_|OPENAI_)='"
echo ""
VARS_FOUND=$(sudo tr '\0' '\n' < /proc/"$PID_NEXT"/environ | grep -E '^(IBKR_|NEXT_PUBLIC_IBKR_|SUPABASE_|PINECONE_|OPENAI_)=' || echo "")
if [ -n "$VARS_FOUND" ]; then
    echo "$VARS_FOUND" | while IFS= read -r line; do
        KEY=$(echo "$line" | cut -d= -f1)
        VALUE=$(echo "$line" | cut -d= -f2-)
        # Mask sensitive values (show first 4 chars only)
        if [ ${#VALUE} -gt 8 ]; then
            MASKED="${VALUE:0:4}...${VALUE: -4}"
        else
            MASKED="****"
        fi
        echo "  ✓ $KEY=$MASKED"
    done
else
    echo "  ✗ NO_VARS_VISIBLE"
    exit 1
fi
echo ""

# 3. Verify specific required vars are present
echo "=== Command 2: Verify specific required variables ==="
REQUIRED_VARS=("IBKR_BRIDGE_URL" "IBKR_BRIDGE_KEY" "NEXT_PUBLIC_IBKR_GATEWAY_URL" "SUPABASE_URL" "OPENAI_API_KEY" "PINECONE_API_KEY")
ALL_PRESENT=true
for VAR in "${REQUIRED_VARS[@]}"; do
    if sudo tr '\0' '\n' < /proc/"$PID_NEXT"/environ | grep -q "^${VAR}="; then
        echo "  ✓ $VAR is present"
    else
        echo "  ✗ $VAR is MISSING"
        ALL_PRESENT=false
    fi
done
echo ""

if [ "$ALL_PRESENT" = false ]; then
    echo "✗ Error: Some required variables are missing"
    exit 1
fi

# 4. Test via API endpoint (if available)
echo "=== Command 3: Test via Next.js API (if health endpoint exists) ==="
# Try to call a Next.js API endpoint that uses env vars
# This verifies the vars are actually accessible to Next.js, not just in /proc
HEALTH_URL="http://127.0.0.1:3001/api/health"
if curl -s -f "$HEALTH_URL" > /dev/null 2>&1; then
    echo "  ✓ API endpoint responded (env vars likely accessible to Next.js)"
else
    echo "  ⚠ API endpoint not available or not responding (this is OK if endpoint doesn't exist)"
fi
echo ""

echo "=== All verification checks passed ==="
echo "✓ Environment variables are properly loaded in next-server process"

