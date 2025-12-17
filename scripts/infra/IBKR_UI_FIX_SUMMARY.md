# IBKR UI Fix Summary - Changes Made

**Date:** 2025-01-17  
**File Modified:** `src/app/page.tsx`

---

## Problem Fixed

UI was incorrectly showing IBKR as disconnected even though backend confirmed:
- `safety.ibkrConnected=true`
- `safety.ibkrAuthenticated=true`
- `authenticated=true` (from `/api/ibkr/status`)

The issue was that UI logic wasn't using these fields correctly.

---

## Changes Made

### 1. Added Agent Status State
```typescript
const [agentStatus, setAgentStatus] = useState<{
  safety: {
    ibkrConnected: boolean;
    ibkrAuthenticated: boolean;
  };
  health: {
    overall: 'healthy' | 'degraded' | 'unhealthy';
  };
} | null>(null);
```

### 2. Added `/api/agent/status` Fetch
```typescript
const [dashboardRes, systemRes, planRes, ibkrRes, agentStatusRes] = await Promise.all([
  // ... existing fetches ...
  fetch("/api/agent/status").then((r) => r.json()), // NEW
]);
```

### 3. Store Agent Status
```typescript
if (agentStatusRes.ok) {
  setAgentStatus({
    safety: {
      ibkrConnected: agentStatusRes.safety?.ibkrConnected === true,
      ibkrAuthenticated: agentStatusRes.safety?.ibkrAuthenticated === true,
    },
    health: {
      overall: agentStatusRes.health?.overall || 'unhealthy',
    },
  });
}
```

### 4. Updated IBKR Connection Logic
**BEFORE:**
```typescript
const ibkrCardStatus =
  ibkrStatus?.bridgeOk && ibkrStatus?.gatewayAuthenticated
    ? "LIVE"
    : ibkrStatus?.bridgeOk || ibkrStatus?.gatewayAuthenticated
    ? "DEGRADED"
    : "ERROR";
```

**AFTER:**
```typescript
// Determine IBKR connection status - use agentStatus.safety OR ibkrStatus.authenticated
// This is separate from overall health
const isIbkrConnected = 
  (agentStatus?.safety?.ibkrConnected && agentStatus?.safety?.ibkrAuthenticated) ||
  (ibkrStatus?.gatewayAuthenticated === true);

// Determine IBKR status for account card
const ibkrCardStatus = isIbkrConnected ? "LIVE" : "ERROR";
```

### 5. Updated Banner Condition
**BEFORE:**
```typescript
{(ibkrStatus === null || !ibkrStatus.bridgeOk || !ibkrStatus.gatewayAuthenticated) && (
```

**AFTER:**
```typescript
{/* Use agentStatus.safety OR ibkrStatus.authenticated - NOT health.overall */}
{!isIbkrConnected && (
```

### 6. Updated System Health Footer
**BEFORE:**
```typescript
<SystemHealthFooter
  items={[
    {
      label: "IBKR",
      status: ibkrStatus?.bridgeOk && ibkrStatus?.gatewayAuthenticated ? "LIVE" : "ERROR",
    },
    // ...
  ]}
/>
```

**AFTER:**
```typescript
<SystemHealthFooter
  items={[
    {
      label: "IBKR",
      // Use agentStatus.safety OR ibkrStatus.authenticated - NOT health.overall
      status: isIbkrConnected ? "LIVE" : "ERROR",
    },
    {
      label: "SYSTEM",
      // Overall health is separate from IBKR connection
      status: agentStatus?.health?.overall === 'healthy' ? "LIVE" :
              agentStatus?.health?.overall === 'degraded' ? "DEGRADED" : "ERROR",
    },
    // ...
  ]}
/>
```

---

## Result

✅ IBKR connection status is now driven by:
- `agentStatus.safety.ibkrConnected && agentStatus.safety.ibkrAuthenticated` (from `/api/agent/status`)
- OR `ibkrStatus.authenticated` (from `/api/ibkr/status`)
- NOT by `health.overall`

✅ Overall health is shown separately as "SYSTEM" badge

✅ IBKR shows "LIVE" even when `health.overall` is "unhealthy"

---

## Testing

After deployment, verify:
1. When IBKR is connected: Banner should NOT show, IBKR status should be "LIVE"
2. When `health.overall` is "unhealthy": IBKR should still show "LIVE", but "SYSTEM" should show "ERROR"
3. When IBKR is disconnected: Banner should show, IBKR status should be "ERROR"

