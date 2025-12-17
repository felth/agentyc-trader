# IBKR UI Fix Checkpoint - BEFORE Changes

**Date:** 2025-01-17  
**Git Commit:** `9365220` - "Fix Cache-Control headers: Use NextResponse.json options syntax"  
**Status:** ⚠️ BACKEND WORKING, UI LOGIC INCORRECT

---

## Current Problem

**Backend is healthy and IBKR is authenticated/connected:**
- ✅ `/api/agent/status` returns:
  - `safety.ibkrConnected=true`
  - `safety.ibkrAuthenticated=true`
  - `health.overall="unhealthy"` (this is NOT related to IBKR)
- ✅ `/api/ibkr/status` returns:
  - `authenticated=true`
  - `gateway.data.connected=true`

**UI Issue:**
- UI is incorrectly using `health.overall` or other health metrics to determine IBKR connection status
- This causes UI to show IBKR as disconnected even though backend confirms it's connected

---

## Current UI Logic (BEFORE FIX)

### 1. Main Page (`src/app/page.tsx`)
- Fetches `/api/ibkr/status` and sets `ibkrStatus` state
- Shows IBKR banner based on: `ibkrStatus?.gatewayAuthenticated`
- Passes IBKR status to `AccountRiskCard` and `SystemHealthFooter`
- **Current logic:** Uses only `/api/ibkr/status` response

### 2. Account Risk Card (`src/components/home/AccountRiskCard.tsx`)
- Receives `status` prop: `"LIVE" | "DEGRADED" | "ERROR"`
- Shows IBKR status badge
- **Current logic:** Status comes from `ibkrStatus` in parent

### 3. System Health Footer (`src/components/home/SystemHealthFooter.tsx`)
- Shows health items including IBKR
- **Current logic:** IBKR status from `ibkrStatus?.bridgeOk && ibkrStatus?.gatewayAuthenticated`

### 4. Agent Status Badge (`src/components/ui/AgentStatusBadge.tsx`)
- Fetches `/api/agent/status`
- Shows agent mode and kill switch
- **Current logic:** Does NOT show IBKR status (only mode/kill switch)

---

## What Needs to Change

### Required Fix:
1. **IBKR Connection Status** should be driven by:
   - `agentStatus.safety.ibkrConnected && agentStatus.safety.ibkrAuthenticated` (from `/api/agent/status`)
   - OR `ibkrStatus.authenticated` (from `/api/ibkr/status`)
   - NOT by `health.overall`

2. **Overall Health** should be:
   - A separate badge/indicator
   - Driven by `health.overall` from `/api/agent/status`
   - Can show "System unhealthy" even when IBKR is connected

3. **Components to Update:**
   - `src/app/page.tsx` - Fetch `/api/agent/status` and use `safety.ibkrConnected/ibkrAuthenticated`
   - `src/components/home/SystemHealthFooter.tsx` - Add separate "System Health" item
   - `src/components/home/AccountRiskCard.tsx` - Ensure it uses correct IBKR status

---

## Files That Will Be Modified

1. `src/app/page.tsx`
   - Add fetch for `/api/agent/status`
   - Update IBKR status logic to use `safety.ibkrConnected && safety.ibkrAuthenticated`
   - Add overall health state
   - Update SystemHealthFooter to show both IBKR and System Health separately

2. `src/components/home/SystemHealthFooter.tsx`
   - No changes needed (already accepts items array)

---

## Expected Behavior After Fix

✅ IBKR shows "LIVE" when `safety.ibkrConnected && safety.ibkrAuthenticated` is true  
✅ IBKR shows "LIVE" even if `health.overall` is "unhealthy"  
✅ System Health shows separately (e.g., "System: UNHEALTHY" when `health.overall` is "unhealthy")  
✅ IBKR banner disappears when IBKR is connected (regardless of overall health)  

---

## Rollback Instructions

If fix causes issues, restore from this checkpoint:

```bash
cd /opt/agentyc-trader
git checkout 9365220
git restore src/app/page.tsx
rm -rf .next
npm run build
sudo systemctl restart agentyc-nextjs
```

