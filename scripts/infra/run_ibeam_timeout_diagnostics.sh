#!/bin/bash
#
# IBeam Login Timeout Diagnostics
# 
# Purpose: Capture screenshots and page state when login timeout occurs
# Run this BEFORE applying the login fix patch

set -e

CONTAINER_NAME="ibeam_ibeam_1"
OUTPUT_DIR="/opt/ibeam_debug"

echo "========================================="
echo "IBeam Login Timeout Diagnostics"
echo "========================================="
echo ""

# Check container
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Container $CONTAINER_NAME not running"
    exit 1
fi

echo "✓ Container running"
echo ""

# Check for existing outputs
echo "1. Checking IBeam outputs directory..."
echo "---------------------------------------------------"
OUTPUTS=$(docker exec "$CONTAINER_NAME" sh -lc 'ls -lah /srv/outputs 2>/dev/null || echo "Directory not found"')
echo "$OUTPUTS"
echo ""

# List recent files in outputs
echo "2. Recent files in /srv/outputs..."
echo "---------------------------------------------------"
docker exec "$CONTAINER_NAME" sh -lc 'find /srv/outputs -type f -printf "%TY-%Tm-%Td %TH:%TM:%TS %p\n" 2>/dev/null | sort -r | head -20' || echo "No files found or directory doesn't exist"
echo ""

# Create debug directory on host
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%F_%H%M%S)
OUTPUT_DEST="$OUTPUT_DIR/outputs_$TIMESTAMP"

echo "3. Copying outputs from container..."
echo "---------------------------------------------------"
if docker exec "$CONTAINER_NAME" test -d /srv/outputs; then
    docker cp "$CONTAINER_NAME:/srv/outputs" "$OUTPUT_DEST"
    echo "✓ Copied to: $OUTPUT_DEST"
    echo ""
    echo "Files copied:"
    ls -lah "$OUTPUT_DEST" | head -20
else
    echo "⚠️  /srv/outputs directory not found in container"
    echo "   Outputs may be in a different location or IBeam hasn't run yet"
fi
echo ""

# Check for screenshot files specifically
echo "4. Looking for screenshot files..."
echo "---------------------------------------------------"
SCREENSHOTS=$(find "$OUTPUT_DEST" -name "*.png" -o -name "*screenshot*" 2>/dev/null | head -10)
if [ -n "$SCREENSHOTS" ]; then
    echo "Found screenshots:"
    echo "$SCREENSHOTS"
    echo ""
    echo "To view latest screenshot:"
    LATEST_SCREENSHOT=$(find "$OUTPUT_DEST" -name "*.png" -type f -printf "%T@ %p\n" 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    if [ -n "$LATEST_SCREENSHOT" ]; then
        echo "  $LATEST_SCREENSHOT"
    fi
else
    echo "No screenshots found"
fi
echo ""

# Check for HTML/page source files
echo "5. Looking for HTML/page source files..."
echo "---------------------------------------------------"
HTML_FILES=$(find "$OUTPUT_DEST" -name "*.html" -o -name "*page_source*" 2>/dev/null | head -10)
if [ -n "$HTML_FILES" ]; then
    echo "Found HTML files:"
    echo "$HTML_FILES"
else
    echo "No HTML files found"
fi
echo ""

# Check recent IBeam logs for timeout messages
echo "6. Recent timeout errors in IBeam logs..."
echo "---------------------------------------------------"
docker logs "$CONTAINER_NAME" 2>&1 | grep -i "timeout\|waiting for\|TimeoutException" | tail -20 || echo "No timeout messages in recent logs"
echo ""

echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "Outputs copied to: $OUTPUT_DEST"
echo ""
echo "Next steps:"
echo "1. Review screenshots to see what page Selenium is on when timeout occurs"
echo "2. Review HTML files to see page structure"
echo "3. Apply login fix patch (see IBEAM_LOGIN_FIX_PATCH.md)"
echo ""

