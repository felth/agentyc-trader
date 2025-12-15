#!/bin/bash
# Quick credential verification and fix

cd /opt/ibeam

echo "=== Checking .env file ==="
echo "Credentials found:"
grep -E "^IBEAM_(USER|PASSWORD|ACCOUNT)=" .env || echo "ERROR: No credentials found!"

echo ""
echo "=== Testing if container can see credentials ==="
CONTAINER=$(docker ps -a --filter "name=ibeam" --format "{{.Names}}" | head -1)
if [ -n "$CONTAINER" ]; then
    echo "Container: $CONTAINER"
    docker exec $CONTAINER sh -c 'echo "USER=[$IBEAM_USER]"; echo "ACCOUNT=[$IBEAM_ACCOUNT]"; [ -n "$IBEAM_PASSWORD" ] && echo "PASSWORD=[SET - length: ${#IBEAM_PASSWORD}]" || echo "PASSWORD=[NOT SET]";'
else
    echo "No container running - start it first"
fi

echo ""
echo "=== If credentials are missing, add them like this ==="
echo "nano /opt/ibeam/.env"
echo ""
echo "Add these lines (no quotes, no spaces around =):"
echo "IBEAM_USER=liamfeltham"
echo "IBEAM_PASSWORD=xuvgyn-Qicgun-mytzy8"
echo "IBEAM_ACCOUNT=liamfeltham"

