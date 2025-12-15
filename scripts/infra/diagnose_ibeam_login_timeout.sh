#!/bin/bash
#
# Diagnostic: Identify IBeam Login Timeout Location
#
# Purpose: Find which selector/wait condition is timing out in IBeam login flow

set -e

CONTAINER_NAME="ibeam_ibeam_1"

echo "========================================="
echo "IBeam Login Timeout Diagnostic"
echo "========================================="
echo ""

# Check container
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Container $CONTAINER_NAME not running"
    exit 1
fi

echo "✓ Container running"
echo ""

# Find IBeam source files
echo "1. Finding IBeam source files..."
echo "---------------------------------------------------"
LOGIN_HANDLER=$(docker exec "$CONTAINER_NAME" find /srv -name "login_handler.py" -type f 2>/dev/null | head -1)
STRATEGY_HANDLER=$(docker exec "$CONTAINER_NAME" find /srv -name "strategy_handler.py" -type f 2>/dev/null | head -1)

if [ -z "$LOGIN_HANDLER" ]; then
    echo "❌ login_handler.py not found"
    echo "   Searching for Python files in /srv..."
    docker exec "$CONTAINER_NAME" find /srv -name "*.py" -type f | head -10
    exit 1
fi

echo "✓ Found login_handler.py: $LOGIN_HANDLER"
if [ -n "$STRATEGY_HANDLER" ]; then
    echo "✓ Found strategy_handler.py: $STRATEGY_HANDLER"
fi
echo ""

# Extract wait conditions and selectors
echo "2. Extracting WebDriverWait conditions..."
echo "---------------------------------------------------"
echo ""
echo "WebDriverWait instances:"
docker exec "$CONTAINER_NAME" grep -n "WebDriverWait\|until(" "$LOGIN_HANDLER" 2>/dev/null | head -30 || echo "No WebDriverWait found"

echo ""
echo "Element selectors (By.ID, By.CSS, etc.):"
docker exec "$CONTAINER_NAME" grep -n "By\." "$LOGIN_HANDLER" 2>/dev/null | head -30 || echo "No By.* selectors found"

echo ""
echo "Expected conditions (presence_of, visibility_of, etc.):"
docker exec "$CONTAINER_NAME" grep -n "presence_of\|visibility_of\|element_to_be_clickable\|text_to_be_present" "$LOGIN_HANDLER" 2>/dev/null | head -30 || echo "No expected conditions found"

echo ""
echo "Timeout values:"
docker exec "$CONTAINER_NAME" grep -n "timeout\|TIMEOUT" "$LOGIN_HANDLER" 2>/dev/null | head -20 || echo "No timeout values found"

echo ""
# Check strategy handler for Strategy B
if [ -n "$STRATEGY_HANDLER" ]; then
    echo "3. Checking Strategy B implementation..."
    echo "---------------------------------------------------"
    docker exec "$CONTAINER_NAME" grep -n "_authentication_strategy_B\|Strategy B" "$STRATEGY_HANDLER" 2>/dev/null | head -10
    echo ""
fi

# Check recent logs for timeout messages
echo "4. Recent timeout errors from logs..."
echo "---------------------------------------------------"
docker logs "$CONTAINER_NAME" 2>&1 | grep -i "timeout\|waiting for" | tail -20 || echo "No timeout messages in recent logs"

echo ""
echo "========================================="
echo "Next Steps:"
echo "========================================="
echo ""
echo "1. Review the selectors above"
echo "2. Check which element is timing out (likely in 'waiting for' logs)"
echo "3. Inspect current IBKR login page to see if selectors match"
echo "4. Update selectors in login_handler.py accordingly"
echo ""

