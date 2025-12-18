# IBKR iServer Desync Issue - Analysis & Recovery Strategy

## Problem Description

**Two-Tier Session System:**
- **SSO Session (Gateway level):** Authenticated via browser login + 2FA
- **iServer Session (Brokerage level):** Separate session for actual trading/brokerage operations

**Failure Mode:**
- SSO session: ✅ `authenticated: true` (still active)
- iServer session: ❌ `connected: false` (timed out after ~6 min inactivity)
- This is a **desync state** - Gateway thinks you're logged in, but brokerage session expired

**Known Causes:**
- Inactivity timeout (~6 minutes)
- EU/other region resets
- Post-reset desync
- Competing sessions (if `compete: true` needed)

---

## Current Code Analysis

### What We're Currently Checking

**File:** `src/app/api/ibkr/status/route.ts`

**Current logic:**
```typescript
// Only checks authenticated, not connected
const authenticated = gatewayAuth.ok && 
  (gatewayAuth.data?.authenticated === true || 
   gatewayAuth.data?.iserver?.authStatus?.authenticated === true);
```

**Missing:** We're not checking `connected` status separately!

**Expected response from `/iserver/auth/status`:**
```json
{
  "authenticated": true,    // SSO session active
  "connected": false,       // iServer session expired ← NOT CHECKED
  "competing": false,
  "message": "...",
  "iserver": {
    "authStatus": {
      "authenticated": true,
      "connected": false    // ← This is the key field
    }
  }
}
```

---

## Detection Strategy

### 1. Detect Desync State

**Condition:** `authenticated === true` AND `connected === false`

**Where to check:**
- In `/api/ibkr/status` endpoint
- After user completes login (in `handleCheckNow` or visibility handler)
- Periodically (every 5-10 minutes) if we want auto-recovery

### 2. Recovery Endpoint

**Endpoint:** `POST /v1/api/iserver/auth/ssodh/init`

**Payload:**
```json
{
  "compete": false  // or true if competing sessions exist
}
```

**Response:** Should return success and reinitialize iServer session

---

## Implementation Recommendations

### Option 1: Auto-Recovery in Status Check (Recommended)

**Location:** `src/app/api/ibkr/status/route.ts`

**Strategy:**
1. Check both `authenticated` and `connected` in status response
2. If `authenticated=true` but `connected=false` → auto-call `/ssodh/init`
3. Return updated status after recovery attempt

**Pros:**
- Automatic recovery
- Transparent to user
- Works on every status check

**Cons:**
- Extra API call on every status check when desynced
- Might mask other issues

### Option 2: Recovery After Login (Recommended)

**Location:** `src/app/page.tsx` - `handleCheckNow()` function

**Strategy:**
1. After detecting authentication, check `connected` status
2. If `authenticated=true` but `connected=false` → call recovery endpoint
3. Then re-check status

**Pros:**
- Only runs when user actively connects
- User-initiated recovery
- Clear flow

**Cons:**
- Doesn't handle timeout during active session

### Option 3: Periodic Background Recovery

**Location:** Background polling or useEffect

**Strategy:**
1. Every 5-10 minutes, check status
2. If desynced → auto-recover

**Pros:**
- Handles timeout during active use
- Keeps session alive

**Cons:**
- More complex
- Might interfere with user actions

### Option 4: Hybrid Approach (Best)

**Combine Option 1 + Option 2:**
1. **After login:** Always call `/ssodh/init` after detecting authentication (proactive)
2. **In status check:** If desync detected, attempt recovery (reactive)
3. **Return both states:** `authenticated` and `connected` separately in response

---

## Recommended Implementation

### Step 1: Update Status Endpoint to Check Both States

**File:** `src/app/api/ibkr/status/route.ts`

```typescript
// After getting gatewayAuth response
const authenticated = gatewayAuth.data?.authenticated === true;
const connected = gatewayAuth.data?.connected === true || 
                  gatewayAuth.data?.iserver?.authStatus?.connected === true;

// Detect desync
const isDesynced = authenticated && !connected;

// If desynced, attempt recovery
if (isDesynced) {
  try {
    const recoveryUrl = `${gatewayBase}/v1/api/iserver/auth/ssodh/init`;
    await fetch(recoveryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compete: false }),
    });
    // Re-check status after recovery
    // ... re-fetch auth status
  } catch (err) {
    console.error('[ibkr/status] Recovery attempt failed:', err);
  }
}

// Return both states
return {
  ok: true,
  authenticated,
  connected,  // NEW: separate field
  isDesynced, // NEW: flag for UI
  // ... rest
};
```

### Step 2: Add Recovery Endpoint (Optional but Clean)

**New file:** `src/app/api/ibkr/recover/route.ts`

```typescript
export async function POST() {
  const gatewayBase = process.env.IBKR_GATEWAY_URL || 
                      process.env.NEXT_PUBLIC_IBKR_GATEWAY_URL || 
                      'https://ibkr.agentyctrader.com';
  
  try {
    const res = await fetch(`${gatewayBase}/v1/api/iserver/auth/ssodh/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compete: false }),
    });
    
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      data: await res.json().catch(() => null),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message },
      { status: 500 }
    );
  }
}
```

### Step 3: Update UI to Show Connected Status

**File:** `src/app/page.tsx`

```typescript
// Check both authenticated AND connected
const isIbkrConnected = 
  (agentStatus?.safety?.ibkrConnected && agentStatus?.safety?.ibkrAuthenticated) ||
  (ibkrStatus?.gatewayAuthenticated === true && ibkrStatus?.connected === true); // Add connected check

// Show different states
if (ibkrStatus?.isDesynced) {
  // Show "Reconnecting..." or auto-recover
}
```

### Step 4: Call Recovery After Login

**File:** `src/app/page.tsx` - `handleCheckNow()`

```typescript
const handleCheckNow = async () => {
  // ... existing check ...
  
  if (authenticated && data) {
    // Check if connected
    const connected = data.gateway?.data?.connected === true;
    
    if (!connected) {
      // Attempt recovery
      try {
        await fetch('/api/ibkr/recover', { method: 'POST' });
        // Re-check status
        const { authenticated: reAuth, data: reData } = await checkIbkrAuthStatus();
        if (reAuth && reData?.gateway?.data?.connected) {
          // Successfully recovered
        }
      } catch (err) {
        console.error('Recovery failed:', err);
      }
    }
    
    // ... rest of logic
  }
};
```

---

## Key Points

1. **Separate States:** `authenticated` (SSO) vs `connected` (iServer) are different
2. **Detection:** Check both fields, not just `authenticated`
3. **Recovery:** `POST /v1/api/iserver/auth/ssodh/init` reinitializes iServer without re-login
4. **Timing:** Best to call recovery:
   - Immediately after login (proactive)
   - When desync detected (reactive)
5. **UI:** Show both states or combined "fully connected" status

---

## Testing

After implementation, test:
1. Login → Check both `authenticated` and `connected` are true
2. Wait 6+ minutes → Check if `connected` becomes false while `authenticated` stays true
3. Call recovery → Verify `connected` becomes true again
4. UI should reflect both states correctly

---

## Minimal Action (Quick Fix)

If you want the simplest fix:

1. **In `/api/ibkr/status`:** After detecting authentication, always call `/ssodh/init` proactively
2. **Return `connected` field** separately in response
3. **UI checks both** `authenticated && connected` for "fully connected" state

This ensures iServer is always initialized after SSO login, preventing the desync.

