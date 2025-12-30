# IBKR Connect Banner Implementation

## Overview
Implemented a persistent IBKR Connect button/banner that always remains visible, solving the issue where the button would flash and disappear after refresh when IBKR is not authenticated.

## Changes Made

### 1. API Route Fix (`src/app/api/ibkr/status/route.ts`)
- **Changed**: Error handler now always returns HTTP 200 (not 500)
- **Changed**: Response always includes `ok: true` so UI can handle errors gracefully
- **Changed**: Errors are treated as "not authenticated" state (`authenticated: false`)
- **Result**: UI never receives 500 errors that would cause the banner to disappear

### 2. New Component (`src/components/IbkrConnectBanner.tsx`)
- **Created**: New client component that always renders the IBKR connection banner
- **Features**:
  - Always visible - never hides based on authentication state
  - Shows "CONNECTED" badge when authenticated
  - Shows "NOT CONNECTED" badge when not authenticated
  - "Connect IBKR" button when not authenticated
  - "Reconnect" button when authenticated
  - "Refresh" button to manually check status
  - Proper error handling - treats all errors as "disconnected"
  - Matches app design system styling

### 3. Profile Page Integration (`src/app/(tabs)/profile/page.tsx`)
- **Added**: `IbkrConnectBanner` component to the Connections section
- **Placed**: At the top of the Connections section for visibility
- **Removed**: Redundant "Primary Broker" connection entry (replaced by banner)

## Behavior

### When Authenticated (`authenticated: true`)
- Shows "CONNECTED" badge
- Displays "Connected to Interactive Brokers" message
- Shows "Reconnect" button (opens SSO login in new tab)
- Shows "Refresh" button to check status

### When Not Authenticated (`authenticated: false` or error)
- Shows "NOT CONNECTED" badge
- Displays "Login required to connect your IBKR account" message
- Shows "Connect IBKR" button (opens SSO login in new tab)
- Shows "Refresh" button to check status
- Banner **never disappears** - always visible

### SSO Login URL
- Uses: `https://ibkr.agentyctrader.com/sso/Login?forwardTo=22&RL=1`
- Opens in new tab with `target="_blank"` and `rel="noreferrer"`

## Key Design Decisions

1. **Always return 200**: API route never returns 500 errors, allowing UI to always render the banner
2. **Defensive error handling**: Component treats any fetch failure or non-200 response as "not authenticated"
3. **Never hide banner**: Component always renders, ensuring users always have a way to connect
4. **Consistent styling**: Uses app's design system (ultra-accent colors, rounded cards, etc.)

## Testing

After implementation, verify:
1. ✅ Banner is always visible on `/profile` page
2. ✅ When authenticated, shows "CONNECTED" badge
3. ✅ When not authenticated (401), shows "NOT CONNECTED" badge and "Connect IBKR" button
4. ✅ Button opens SSO login URL in new tab
5. ✅ "Refresh" button updates status without page reload
6. ✅ Banner does not disappear after refresh when IBKR is not authenticated

## Files Changed
- `src/app/api/ibkr/status/route.ts` - Fixed error handling to always return 200
- `src/components/IbkrConnectBanner.tsx` - New component (created)
- `src/app/(tabs)/profile/page.tsx` - Integrated banner component

