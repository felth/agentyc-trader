#!/bin/bash
# Update IBeam password and restart

cd /opt/ibeam

echo "=== Updating .env with new password ==="

# Backup
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update password in .env (preserving other settings)
if grep -q "^IBEAM_PASSWORD=" .env; then
    sed -i 's|^IBEAM_PASSWORD=.*|IBEAM_PASSWORD=airbus!Boeing380o|' .env
    echo "✓ Password updated in .env"
else
    # Add password line if missing
    sed -i '/# ===== Credentials =====/a IBEAM_PASSWORD=airbus!Boeing380o' .env
    echo "✓ Password added to .env"
fi

echo ""
echo "=== Verifying .env ==="
grep "^IBEAM_" .env | grep -v PASSWORD
grep "^IBEAM_PASSWORD=" .env | sed 's/=.*/=***HIDDEN***/'

echo ""
echo "=== Stopping container ==="
docker-compose down

echo ""
echo "=== Recreating container with new password ==="
docker-compose up -d --force-recreate

echo ""
echo "=== Waiting for container to start ==="
sleep 5

echo ""
echo "=== Verifying password in container ==="
CONTAINER=$(docker ps --filter "name=ibeam" --format "{{.Names}}" | head -1)
if [ -n "$CONTAINER" ]; then
    PWD_LEN=$(docker exec $CONTAINER sh -c 'echo ${#IBEAM_PASSWORD}')
    echo "Password is set (length: $PWD_LEN characters)"
    docker exec $CONTAINER sh -c 'echo "USER=$IBEAM_USER"; echo "ACCOUNT=$IBEAM_ACCOUNT"'
else
    echo "ERROR: Container not running"
    docker-compose ps
    exit 1
fi

echo ""
echo "=== Following logs (Ctrl+C to stop) ==="
docker-compose logs -f ibeam

