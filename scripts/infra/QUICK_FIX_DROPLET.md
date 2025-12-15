# Quick Fix for Droplet Issues

## Issue 1: Git Merge Conflict

**Problem:** Untracked file blocking pull

**Fix:**
```bash
cd /opt/agentyc-trader
# Remove or backup the conflicting file
mv scripts/infra/ibeam_login_fix.py.patch scripts/infra/ibeam_login_fix.py.patch.backup 2>/dev/null || rm -f scripts/infra/ibeam_login_fix.py.patch

# Pull again
git pull origin main
```

## Issue 2: docker-compose vs docker compose

**Problem:** You have docker-compose v1.29.2 (legacy), but the script uses `docker compose` (v2 plugin)

**Fix Option A: Use docker compose v2 (if available)**
```bash
# Check if docker compose v2 is available
docker compose version
# If this works, the script will work

# If not, you need to install docker compose plugin or update Docker
```

**Fix Option B: Update script to use docker-compose (v1)**

Or manually update the script commands to use `docker-compose` instead of `docker compose`.

**Quick manual fix:**
```bash
cd /opt/agentyc-trader
sed -i 's/docker compose/docker-compose/g' scripts/infra/apply_ibeam_fix.sh
```

## Complete Fix Commands

```bash
# 1. Fix git conflict
cd /opt/agentyc-trader
mv scripts/infra/ibeam_login_fix.py.patch scripts/infra/ibeam_login_fix.py.patch.backup 2>/dev/null || true
git pull origin main

# 2. Update script for docker-compose v1 (if needed)
sed -i 's/docker compose/docker-compose/g' scripts/infra/apply_ibeam_fix.sh

# 3. Make script executable
chmod +x scripts/infra/apply_ibeam_fix.sh

# 4. Run the script
sudo bash scripts/infra/apply_ibeam_fix.sh
```

