#!/bin/bash
#
# IBeam On-Demand Fix - Automated Script
#
# This script:
# 1. Recovers from docker compose issues
# 2. Extracts and fixes login_handler.py
# 3. Configures .env for on-demand usage
# 4. Applies the fix to running container
# 5. Verifies the setup
#

set -e

IBEAM_DIR="/opt/ibeam"
GATEWAY_DIR="/opt/ibkr-gateway/clientportal"

echo "========================================="
echo "IBeam On-Demand Fix - Automated Setup"
echo "========================================="
echo ""

# Check prerequisites
echo "Step 1: Checking prerequisites..."
echo "---------------------------------------------------"

if [ ! -d "$IBEAM_DIR" ]; then
    echo "❌ ERROR: IBeam directory not found: $IBEAM_DIR"
    exit 1
fi

if [ ! -d "$GATEWAY_DIR" ]; then
    echo "❌ ERROR: Gateway directory not found: $GATEWAY_DIR"
    exit 1
fi

cd "$IBEAM_DIR"

# Check docker compose
if ! command -v docker &> /dev/null; then
    echo "❌ ERROR: docker not found"
    exit 1
fi

# Check for docker compose v2 or docker-compose v1
if docker compose version &>/dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
    DOCKER_COMPOSE_VERSION=$(docker compose version 2>&1 | head -1)
elif docker-compose version &>/dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    DOCKER_COMPOSE_VERSION=$(docker-compose version 2>&1 | head -1)
else
    echo "❌ ERROR: Neither 'docker compose' nor 'docker-compose' found"
    exit 1
fi
echo "✓ Docker compose: $DOCKER_COMPOSE_VERSION (using: $DOCKER_COMPOSE_CMD)"

echo ""

# Step 2: Recover from docker compose issues
echo "Step 2: Cleaning up docker compose state..."
echo "---------------------------------------------------"

$DOCKER_COMPOSE_CMD down --remove-orphans 2>/dev/null || true

# Remove any stale containers
STALE_CONTAINERS=$(docker ps -a --filter "name=ibeam" --format "{{.ID}}" 2>/dev/null || true)
if [ -n "$STALE_CONTAINERS" ]; then
    echo "Removing stale containers..."
    echo "$STALE_CONTAINERS" | xargs -r docker rm -f 2>/dev/null || true
fi

echo "✓ Cleanup complete"
echo ""

# Step 3: Extract login_handler.py
echo "Step 3: Extracting login_handler.py from IBeam image..."
echo "---------------------------------------------------"

EXTRACTED_FILE="$IBEAM_DIR/login_handler_original.py"

if [ -f "$EXTRACTED_FILE" ]; then
    echo "⚠️  Backup file exists, using it..."
else
    echo "Extracting from IBeam image..."
    docker run --rm \
        -v "$GATEWAY_DIR:/srv/clientportal.gw" \
        voyz/ibeam:latest \
        cat /srv/ibeam/src/handlers/login_handler.py > "$EXTRACTED_FILE" 2>/dev/null || {
        echo "❌ ERROR: Failed to extract login_handler.py"
        exit 1
    }
fi

echo "✓ Extracted to: $EXTRACTED_FILE"
echo ""

# Step 4: Apply fix using Python
echo "Step 4: Applying fix to login_handler.py..."
echo "---------------------------------------------------"

FIXED_FILE="$IBEAM_DIR/login_handler_fixed.py"

python3 << 'PYTHON_SCRIPT'
import re
import sys

# Read original file
with open('login_handler_original.py', 'r') as f:
    content = f.read()

# Find the block to replace
old_pattern = r'(submit_form_el\.click\(\)\s+trigger,\s*target\s*=\s*wait_and_identify_trigger\(\s*has_text\(targets\[\'SUCCESS\'\]\),\s*is_visible\(targets\[\'TWO_FA\'\]\),\s*is_visible\(targets\[\'TWO_FA_SELECT\'\]\),\s*is_visible\(targets\[\'TWO_FA_NOTIFICATION\'\]\),\s*is_visible\(targets\[\'ERROR\'\]),\s*is_clickable\(targets\[\'IBKEY_PROMO\'\]),\s*\))'

new_code = '''submit_form_el.click()
print("[LOGIN] Form submitted, waiting for immediate feedback (ERROR/2FA)...")

# Wait only for ERROR/2FA indicators (short timeout)
# Do NOT wait for SUCCESS - it will timeout with invalid selector
# Auth will be verified via http_handler.get_status() in post-authentication
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

short_timeout = 20  # seconds - enough for ERROR/2FA to appear
wait = WebDriverWait(driver, short_timeout)

trigger = None
target = None

# Check for ERROR first (fails fast if login failed)
try:
    error_locator = targets.get('ERROR')
    if error_locator:
        error_el = wait.until(EC.visibility_of_element_located(error_locator))
        print("[LOGIN] ERROR detected after submit")
        trigger = None
        target = 'ERROR'
except TimeoutException:
    pass

# Check for 2FA prompts (if no ERROR)
if target != 'ERROR':
    two_fa_locators = [
        targets.get('TWO_FA'),
        targets.get('TWO_FA_SELECT'),
        targets.get('TWO_FA_NOTIFICATION'),
        targets.get('IBKEY_PROMO'),
    ]
    for locator in two_fa_locators:
        if locator:
            try:
                el = WebDriverWait(driver, 3).until(EC.visibility_of_element_located(locator))
                print(f"[LOGIN] 2FA/notification prompt detected")
                trigger = None
                target = 'TWO_FA' if 'TWO_FA' in str(locator) else 'IBKEY_PROMO'
                break
            except TimeoutException:
                continue

# If no ERROR/2FA detected quickly, treat as "submitted"
# Auth verification happens via http_handler.get_status() in post-authentication
if target is None:
    print("[LOGIN] No ERROR/2FA detected quickly - treating as submitted")
    print("[LOGIN] Auth status will be verified by http_handler.get_status()")
    trigger = None
    target = 'SUBMITTED_UNKNOWN'
'''

# Try to replace
if re.search(old_pattern, content, re.MULTILINE | re.DOTALL):
    content = re.sub(old_pattern, new_code, content, flags=re.MULTILINE | re.DOTALL)
    print("✓ Found and replaced wait_and_identify_trigger block")
else:
    # Try a more flexible pattern
    old_pattern_flexible = r'(submit_form_el\.click\(\)\s+trigger,\s*target\s*=\s*wait_and_identify_trigger\([^)]+has_text\(targets\[\'SUCCESS\'\]\)[^)]+\))'
    if re.search(old_pattern_flexible, content, re.MULTILINE | re.DOTALL):
        content = re.sub(old_pattern_flexible, new_code, content, flags=re.MULTILINE | re.DOTALL)
        print("✓ Found and replaced (flexible pattern)")
    else:
        print("⚠️  WARNING: Could not find exact pattern to replace")
        print("   The file may have been modified already, or pattern is different")
        print("   Attempting manual search...")
        
        # Try to find submit_form_el.click() and replace the next block
        lines = content.split('\n')
        new_lines = []
        i = 0
        replaced = False
        while i < len(lines):
            line = lines[i]
            new_lines.append(line)
            if 'submit_form_el.click()' in line and not replaced:
                # Look ahead for wait_and_identify_trigger
                j = i + 1
                while j < len(lines) and j < i + 15:
                    if 'wait_and_identify_trigger' in lines[j] and 'SUCCESS' in ''.join(lines[j:j+10]):
                        # Found it - replace from submit_form_el.click() to end of wait_and_identify_trigger
                        new_lines.pop()  # Remove the submit_form_el.click() line we just added
                        new_lines.append(new_code)
                        # Skip until we find the closing parenthesis
                        while j < len(lines) and ')' not in lines[j]:
                            j += 1
                        j += 1  # Skip the closing )
                        i = j - 1
                        replaced = True
                        print("✓ Found and replaced (manual search)")
                        break
                    j += 1
            i += 1
        
        if replaced:
            content = '\n'.join(new_lines)
        else:
            print("❌ ERROR: Could not find pattern to replace")
            print("   Please check login_handler_original.py manually")
            sys.exit(1)

# Write fixed file
with open('login_handler_fixed.py', 'w') as f:
    f.write(content)

print("✓ Fixed file created: login_handler_fixed.py")
PYTHON_SCRIPT

if [ ! -f "$FIXED_FILE" ]; then
    echo "❌ ERROR: Failed to create fixed file"
    exit 1
fi

echo "✓ Fix applied successfully"
echo ""

# Step 5: Configure .env
echo "Step 5: Configuring .env file..."
echo "---------------------------------------------------"

ENV_FILE="$IBEAM_DIR/.env"

# Backup existing .env if it exists
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✓ Backed up existing .env"
fi

# Check if credentials exist in .env
if [ -f "$ENV_FILE" ]; then
    IBEAM_USER=$(grep "^IBEAM_USER=" "$ENV_FILE" | cut -d'=' -f2 || echo "")
    IBEAM_PASSWORD=$(grep "^IBEAM_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2 || echo "")
    IBEAM_ACCOUNT=$(grep "^IBEAM_ACCOUNT=" "$ENV_FILE" | cut -d'=' -f2 || echo "")
    IBEAM_REGION=$(grep "^IBEAM_REGION=" "$ENV_FILE" | cut -d'=' -f2 || echo "us")
fi

# Create/update .env with required settings
cat > "$ENV_FILE" << EOF
# ===== Authentication Control =====
START_ACTIVE=true
RESTART_FAILED_SESSIONS=false
MAINTENANCE_INTERVAL=86400

# ===== Credentials =====
${IBEAM_USER:+IBEAM_USER=$IBEAM_USER}
${IBEAM_PASSWORD:+IBEAM_PASSWORD=$IBEAM_PASSWORD}
${IBEAM_ACCOUNT:+IBEAM_ACCOUNT=$IBEAM_ACCOUNT}
IBEAM_REGION=${IBEAM_REGION:-us}

# ===== Gateway Configuration =====
IBEAM_GATEWAY_DIR=/srv/clientportal.gw

# ===== Timeouts =====
IBEAM_PAGE_LOAD_TIMEOUT=60
IBEAM_OAUTH_TIMEOUT=300

# ===== Outputs =====
IBEAM_OUTPUTS_DIR=/srv/outputs
EOF

echo "✓ .env file configured"
echo "   Note: If credentials are missing, please add them manually"
echo ""

# Step 6: Start container and apply fix
echo "Step 6: Starting container and applying fix..."
echo "---------------------------------------------------"

# Start container
$DOCKER_COMPOSE_CMD up -d

# Wait for container to be running
echo "Waiting for container to start..."
sleep 5

# Check if container is running
if ! docker ps | grep -q ibeam; then
    echo "❌ ERROR: Container failed to start"
    $DOCKER_COMPOSE_CMD logs ibeam | tail -20
    exit 1
fi

CONTAINER_NAME=$(docker ps --filter "name=ibeam" --format "{{.Names}}" | head -1)
echo "✓ Container running: $CONTAINER_NAME"

# Copy fixed file into container
echo "Copying fixed login_handler.py into container..."
docker cp "$FIXED_FILE" "$CONTAINER_NAME:/srv/ibeam/src/handlers/login_handler.py"

# Verify file was copied
if docker exec "$CONTAINER_NAME" grep -q "Form submitted, waiting for immediate feedback" /srv/ibeam/src/handlers/login_handler.py 2>/dev/null; then
    echo "✓ Fix verified in container"
else
    echo "⚠️  WARNING: Could not verify fix in container"
fi

# Restart container to use fixed code
echo "Restarting container to apply fix..."
$DOCKER_COMPOSE_CMD restart ibeam

echo "✓ Container restarted with fixed code"
echo ""

# Step 7: Verification
echo "Step 7: Verification..."
echo "---------------------------------------------------"

echo "Container status:"
$DOCKER_COMPOSE_CMD ps

echo ""
echo "Recent logs (last 10 lines):"
$DOCKER_COMPOSE_CMD logs --tail 10 ibeam

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Monitor logs for 2FA prompt:"
echo "   $DOCKER_COMPOSE_CMD logs -f ibeam | grep -E '2FA|notification|waiting'"
echo ""
echo "2. Approve 2FA on your phone when prompted"
echo ""
echo "3. Verify authentication:"
echo "   docker exec $CONTAINER_NAME curl -sk https://localhost:5000/v1/api/iserver/auth/status | jq"
echo ""
echo "4. To disconnect:"
echo "   $DOCKER_COMPOSE_CMD stop ibeam"
echo ""

