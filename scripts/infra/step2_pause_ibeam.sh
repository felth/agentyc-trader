#!/bin/bash
#
# Step 2: Pause IBeam Retries (Stop Auth Prompt Spam)
# 
# Purpose: Prevent IBKR from seeing repeated login attempts while troubleshooting.

set -e

CONTAINER_NAME="ibeam_ibeam_1"
IBEAM_DIR="/opt/ibeam"

echo "========================================="
echo "Step 2: Pause IBeam Retries"
echo "========================================="
echo ""

# Check current status
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo "Current status: IBeam container is RUNNING"
    echo ""
    echo "Options:"
    echo "  1. Stop IBeam completely (Gateway will stop)"
    echo "  2. Keep Gateway running, but stop maintenance loop (requires code change)"
    echo "  3. Increase timeouts to reduce retry frequency"
    echo ""
    read -p "Choose option (1/2/3): " choice
    
    case $choice in
        1)
            echo ""
            echo "Stopping IBeam container..."
            cd "$IBEAM_DIR"
            docker-compose stop ibeam
            echo "✅ IBeam stopped"
            echo ""
            echo "To restart later:"
            echo "  cd $IBEAM_DIR && docker-compose up -d ibeam"
            ;;
        2)
            echo ""
            echo "⚠️  Option 2 requires modifying IBeam code to disable maintenance scheduler"
            echo "   This is complex - recommend Option 1 (stop container) for testing"
            ;;
        3)
            echo ""
            echo "To increase timeouts, edit $IBEAM_DIR/.env or docker-compose.yml:"
            echo ""
            echo "  IBEAM_PAGE_LOAD_TIMEOUT=120"
            echo "  IBEAM_MAINTENANCE_INTERVAL=3600"
            echo ""
            echo "Then restart: docker-compose restart ibeam"
            ;;
        *)
            echo "Invalid choice. Exiting."
            exit 1
            ;;
    esac
else
    echo "IBeam container is NOT running"
    echo ""
    echo "To start it:"
    echo "  cd $IBEAM_DIR && docker-compose up -d ibeam"
fi

echo ""

