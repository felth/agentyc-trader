#!/bin/bash
# Diagnostic script to check IBeam status

cd /opt/ibeam

echo "=== Container Status ==="
docker-compose ps

echo ""
echo "=== Container Status (docker ps) ==="
docker ps -a | grep ibeam

echo ""
echo "=== Recent Logs (last 30 lines) ==="
docker-compose logs --tail 30 ibeam

echo ""
echo "=== Credentials Check ==="
echo "From .env file:"
grep -E "^IBEAM_(USER|PASSWORD|ACCOUNT)=" .env | sed 's/PASSWORD=.*/PASSWORD=***HIDDEN***/' || echo "No credentials found in .env"

echo ""
echo "=== Environment Variables in Container ==="
CONTAINER=$(docker ps -a --filter "name=ibeam" --format "{{.Names}}" | head -1)
if [ -n "$CONTAINER" ]; then
    docker exec $CONTAINER sh -lc 'echo "USER=$IBEAM_USER"; echo "ACCOUNT=$IBEAM_ACCOUNT"; [ -n "$IBEAM_PASSWORD" ] && echo "PASSWORD is set (hidden)" || echo "PASSWORD is NOT set"'
else
    echo "No ibeam container found"
fi

