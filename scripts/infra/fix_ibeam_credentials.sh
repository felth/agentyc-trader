#!/bin/bash
# Quick fix script to verify and apply IBeam credentials

cd /opt/ibeam

echo "=== Current .env credentials ==="
grep -E "^IBEAM_(USER|PASSWORD|ACCOUNT)=" .env || echo "WARNING: Credentials not found!"

echo ""
echo "=== Stopping container ==="
docker-compose down

echo ""
echo "=== Recreating container with updated .env ==="
docker-compose up -d --force-recreate

echo ""
echo "=== Waiting 5 seconds for container to start ==="
sleep 5

echo ""
echo "=== Checking credentials inside container ==="
docker exec ibeam_ibeam_1 sh -lc 'echo "USER=$IBEAM_USER"; echo "PASSWORD=${IBEAM_PASSWORD:0:5}..."; echo "ACCOUNT=$IBEAM_ACCOUNT"'

echo ""
echo "=== Following logs (Ctrl+C to stop) ==="
docker-compose logs -f ibeam

