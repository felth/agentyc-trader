#!/bin/bash
#
# Step 1: Verify Gateway Authentication Status (Inside IBeam Container)
# 
# Purpose: Confirm Gateway is actually authenticated before chasing cookies.
# This tests Gateway from INSIDE the container where IBeam runs.

set -e

echo "========================================="
echo "Step 1: Verify Gateway Auth (Inside Container)"
echo "========================================="
echo ""

CONTAINER_NAME="ibeam_ibeam_1"

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ ERROR: Container $CONTAINER_NAME is not running"
    echo "Start it with: cd /opt/ibeam && docker-compose up -d"
    exit 1
fi

echo "✓ Container $CONTAINER_NAME is running"
echo ""

# Test 1: Auth status endpoint
echo "Test 1: Gateway Auth Status (/iserver/auth/status)"
echo "---------------------------------------------------"
AUTH_STATUS=$(docker exec "$CONTAINER_NAME" sh -lc 'curl -sk https://localhost:5000/v1/api/iserver/auth/status' 2>&1)
echo "$AUTH_STATUS" | jq '.' 2>/dev/null || echo "$AUTH_STATUS"

# Extract authenticated flag
AUTHENTICATED=$(echo "$AUTH_STATUS" | jq -r '.authenticated // .iserver.authStatus.authenticated // "unknown"' 2>/dev/null || echo "unknown")
CONNECTED=$(echo "$AUTH_STATUS" | jq -r '.connected // .iserver.authStatus.connected // "unknown"' 2>/dev/null || echo "unknown")

echo ""
echo "Auth Status Summary:"
echo "  authenticated: $AUTHENTICATED"
echo "  connected: $CONNECTED"
echo ""

# Test 2: Tickle endpoint
echo "Test 2: Gateway Tickle Endpoint (/tickle)"
echo "---------------------------------------------------"
TICKLE=$(docker exec "$CONTAINER_NAME" sh -lc 'curl -sk https://localhost:5000/v1/api/tickle' 2>&1)
echo "$TICKLE" | jq '.' 2>/dev/null || echo "$TICKLE"
echo ""

# Test 3: Portfolio accounts (the real test)
echo "Test 3: Gateway Portfolio Accounts (/portfolio/accounts)"
echo "---------------------------------------------------"
ACCOUNTS=$(docker exec "$CONTAINER_NAME" sh -lc 'curl -sk https://localhost:5000/v1/api/portfolio/accounts' 2>&1)
echo "$ACCOUNTS" | jq '.' 2>/dev/null || echo "$ACCOUNTS"

# Check if we got account data
ACCOUNT_COUNT=$(echo "$ACCOUNTS" | jq 'length' 2>/dev/null || echo "0")
echo ""
echo "Account Data Summary:"
echo "  account_count: $ACCOUNT_COUNT"
echo ""

# Final verdict
echo "========================================="
echo "VERDICT:"
echo "========================================="

if [ "$AUTHENTICATED" = "true" ] && [ "$CONNECTED" = "true" ]; then
    echo "✅ Gateway is AUTHENTICATED from inside container"
    echo "   → Proceed to Step 2 (extract cookies from Selenium)"
    echo ""
    if [ "$ACCOUNT_COUNT" -gt 0 ]; then
        echo "✅ Account data is accessible"
        echo "   → Gateway session is fully functional"
    else
        echo "⚠️  No account data returned (might be empty account or endpoint issue)"
    fi
else
    echo "❌ Gateway is NOT authenticated"
    echo "   → Fix IBeam login/timeout issues FIRST"
    echo "   → Check IBeam logs: docker logs -f $CONTAINER_NAME"
    echo "   → Do NOT proceed with cookie extraction until auth works"
fi

echo ""

