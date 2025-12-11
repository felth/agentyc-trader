# IBKR Status Endpoint Specification

## Endpoint: `/api/ibkr/status`

### Implementation Summary

The endpoint has been rewritten to:
1. ✅ Check Gateway directly at `https://127.0.0.1:5000` (non-blocking)
2. ✅ Make Bridge check optional (doesn't fail if `IBKR_BRIDGE_KEY` missing)
3. ✅ Make IBeam health check non-blocking (timeout doesn't fail overall status)
4. ✅ Overall `ok` depends ONLY on gateway being reachable

### Response Format

```typescript
{
  ok: boolean,              // Overall status: true if gateway.ok === true
  bridge: {
    ok: boolean,
    error: string | null
  },
  gateway: {
    ok: boolean,
    error: string | null
  },
  ibeam: {
    ok: boolean,
    error: string | null
  }
}
```

### Example Responses

#### 1. All Good (Gateway OK)
```json
{
  "ok": true,
  "bridge": {
    "ok": true,
    "error": null
  },
  "gateway": {
    "ok": true,
    "error": null
  },
  "ibeam": {
    "ok": true,
    "error": null
  }
}
```

#### 2. Gateway OK, Bridge Not Configured
```json
{
  "ok": true,
  "bridge": {
    "ok": false,
    "error": "IBKR_BRIDGE_KEY not configured yet (informational only)"
  },
  "gateway": {
    "ok": true,
    "error": null
  },
  "ibeam": {
    "ok": false,
    "error": "IBeam health server not responding: timeout"
  }
}
```

#### 3. Gateway Down, IBeam Still Logging
```json
{
  "ok": false,
  "bridge": {
    "ok": false,
    "error": "IBKR_BRIDGE_KEY not configured yet (informational only)"
  },
  "gateway": {
    "ok": false,
    "error": "Gateway connection refused - not running"
  },
  "ibeam": {
    "ok": false,
    "error": "IBeam health server not responding: timeout"
  }
}
```

#### 4. Gateway OK, IBeam Timeout (Non-Critical)
```json
{
  "ok": true,
  "bridge": {
    "ok": false,
    "error": "IBKR_BRIDGE_KEY not configured yet (informational only)"
  },
  "gateway": {
    "ok": true,
    "error": null
  },
  "ibeam": {
    "ok": false,
    "error": "IBeam health server not responding: timeout"
  }
}
```

## Environment Variables

### Required
- None - Gateway check works without any env vars

### Optional (Informational Only)
- `IBKR_BRIDGE_URL` - If set, bridge health is checked (doesn't affect overall `ok`)
- `IBKR_BRIDGE_KEY` - If set, bridge health is checked (doesn't affect overall `ok`)

### Notes
- Gateway check calls `https://127.0.0.1:5000/v1/api/iserver/auth/status` directly
- Gateway uses self-signed certificate - SSL errors are treated as "reachable"
- Overall `ok: true` if and only if `gateway.ok === true`
- Bridge and IBeam status are informational only

## Frontend Behavior

The homepage button:
- ✅ Calls `/api/ibkr/status` (no browser redirect)
- ✅ Shows "Checking..." while waiting
- ✅ Displays green banner if `ok: true`
- ✅ Displays amber banner if `ok: false` with error details
- ✅ Never opens `gateway.agentyctrader.com` in browser

