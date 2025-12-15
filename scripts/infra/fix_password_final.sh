#!/bin/bash
# Final password fix - verify and set correctly

cd /opt/ibeam

echo "=== Current password in .env ==="
grep "^IBEAM_PASSWORD=" .env

echo ""
echo "=== Updating password with proper escaping ==="
# Remove old password line
sed -i '/^IBEAM_PASSWORD=/d' .env

# Add new password (no quotes, as-is)
sed -i '/# ===== Credentials =====/a IBEAM_PASSWORD=airbus!Boeing380o' .env

echo "✓ Password updated"

echo ""
echo "=== Verifying .env ==="
cat .env | grep -A 5 "Credentials"

echo ""
echo "=== Stopping container ==="
docker-compose down

echo ""
echo "=== Starting container ==="
docker-compose up -d

echo ""
echo "=== Waiting 5 seconds ==="
sleep 5

echo ""
echo "=== Verifying password in container ==="
CONTAINER=$(docker ps --filter "name=ibeam" --format "{{.Names}}" | head -1)
if [ -n "$CONTAINER" ]; then
    echo "Container: $CONTAINER"
    echo "Checking password..."
    # Try to see if password is set (without showing it)
    docker exec $CONTAINER sh -c 'if [ -n "$IBEAM_PASSWORD" ]; then echo "PASSWORD IS SET (length: ${#IBEAM_PASSWORD})"; echo "First 3 chars: ${IBEAM_PASSWORD:0:3}..."; echo "Last 3 chars: ...${IBEAM_PASSWORD: -3}"; else echo "PASSWORD NOT SET"; fi'
    docker exec $CONTAINER sh -c 'echo "USER=$IBEAM_USER"; echo "ACCOUNT=$IBEAM_ACCOUNT"'
else
    echo "Container not running!"
    docker-compose ps
fi

echo ""
echo "=== Show logs ==="
docker-compose logs --tail 30 ibeam

