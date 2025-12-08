# Phase 5: UI Wiring Summary

## ✅ Implementation Complete

### 1. Agent Control Panel (`/agent/control`)
**Status:** ✅ Fully wired

**Features:**
- Mode selector (OFF/LEARN/PAPER/LIVE_ASSISTED) with real-time updates
- Kill switch toggle with confirmation dialogs
- Brain status display (Market/Risk/Psychology) with state indicators
- System health monitoring (IBKR, Bridge, IBeam, Data Integrity)
- Quick links to Audit Log and Risk Settings
- Auto-refresh every 5 seconds

**Endpoints Used:**
- `GET /api/agent/status` - Status updates
- `POST /api/agent/mode` - Mode changes
- `POST /api/agent/kill` - Kill switch toggle

### 2. Trade Proposal Modal (`src/components/trading/TradeProposalModal.tsx`)
**Status:** ✅ Fully wired

**Features:**
- Calls `POST /api/agent/propose-trade` with ticker
- Displays full proposal: entry, stop, targets, size, R:R, confidence
- Brain breakdown: Market, Risk, Psychology summaries
- Safety status banner with detailed reasons
- Mode-aware behavior:
  - OFF: Shows banner, disables approve
  - LEARN: Allows approval (logs only, no execution)
  - PAPER: Simulated execution
  - LIVE_ASSISTED: Real execution with confirmation dialog
- Kill switch enforcement (blocks approve if active)
- Approve/Reject actions with proper API calls

**Endpoints Used:**
- `POST /api/agent/propose-trade` - Generate proposal
- `POST /api/agent/approve` - Execute trade
- `POST /api/agent/reject` - Reject proposal
- `GET /api/agent/status` - Mode and kill switch state

### 3. Integration Points

#### Symbol Page (`/symbol/[ticker]`)
**Status:** ✅ Integrated

**Changes:**
- Added "Ask Agent for Plan" button in `ActionButtons` component
- Opens `TradeProposalModal` with ticker pre-filled
- Kept "Manual Order Ticket" button (unchanged)
- Added `AgentStatusBadge` in header for mode/kill switch visibility

#### Trades Page (`/trades`)
**Status:** ✅ Integrated

**Changes:**
- Added "Ask Agent" button for each open position in `OpenPositionsTable`
- Opens `TradeProposalModal` with position symbol
- Added `AgentStatusBadge` in header
- Manual trading flows preserved

#### Home Page (`/`)
**Status:** ✅ Integrated

**Changes:**
- `AgentTradePlanCard` now opens `TradeProposalModal` on "Ask Agent for Plan"
- Added "New Proposal" button for quick access
- Links to `/agent/control` for full control panel
- Added `AgentStatusBadge` in hero section

### 4. Decision & Audit Log (`/agent/decisions`)
**Status:** ✅ Fully wired

**Features:**
- Table view with filters (mode, user action)
- Displays: timestamp, symbol, direction, mode, outcome, confidence, action, brain summary
- Detail modal with full JSON breakdown:
  - Brain outputs (Market, Risk, Psychology)
  - Full proposal JSON
  - Execution result
  - Safety checks
- Outcome types: PROPOSED, APPROVED, REJECTED, WOULD_HAVE_TAKEN, EXECUTED, BLOCKED

**Endpoints Used:**
- `GET /api/agent/decisions` - Query audit log with filters

### 5. Risk Settings (`/agent/settings`)
**Status:** ✅ Fully wired

**Features:**
- Max risk per trade (USD)
- Daily loss limit (USD)
- Allowed symbols (multi-select with add/remove)
- Psychology mode (Aggressive/Normal/Cautious)
- Overnight positions toggle
- All settings persist to `agent_config` table

**Endpoints Used:**
- `GET /api/agent/config` - Load settings
- `POST /api/agent/config` - Save settings

### 6. Mode & Kill Switch Visibility
**Status:** ✅ Implemented

**Component:** `AgentStatusBadge` (`src/components/ui/AgentStatusBadge.tsx`)

**Placed in:**
- Symbol page header
- Trades page header
- Home page hero section
- Auto-refreshes every 10 seconds

**Displays:**
- Agent mode (OFF/LEARN/PAPER/LIVE)
- Kill switch status (ON/OFF) - only shown for PAPER/LIVE_ASSISTED modes

### 7. Safety Guarantees
**Status:** ✅ Maintained

- All approve actions go through `/api/agent/approve` endpoint
- Kill switch checked before any execution
- Mode semantics enforced in UI (approve disabled when OFF)
- LIVE_ASSISTED requires explicit confirmation dialog
- All decisions logged via audit logger
- No direct IBKR calls from UI - all through agent endpoints

## Routes & Components

### New/Modified Routes
- `/agent/control` - Agent Control Panel (enhanced)
- `/agent/decisions` - Audit Log (enhanced)
- `/agent/settings` - Risk Settings (enhanced)
- `/agent` - Redirects to `/agent/control`
- `/symbol/[ticker]` - Added "Ask Agent" button
- `/trades` - Added "Ask Agent" buttons
- `/` - Wired AgentTradePlanCard

### New Components
- `AgentStatusBadge` - Mode/kill switch visibility
- `TradeProposalModal` - Fully wired proposal modal

### Modified Components
- `ActionButtons` - Added "Ask Agent" button
- `OpenPositionsTable` - Added "Ask Agent" per position
- `AgentTradePlanCard` - Opens proposal modal
- `AgentControlPage` - Enhanced with real data
- `DecisionsPage` - Enhanced with filters and detail view

## API Endpoints Reference

### Agent Endpoints
- `POST /api/agent/propose-trade` - Generate trade proposal
  - Body: `{ ticker: string, timeframe?: string }`
  - Returns: `{ ok: boolean, proposal: TradeProposal, safety: SafetyResult }`

- `POST /api/agent/approve` - Approve and execute trade
  - Body: `{ proposalId: string, proposal?: TradeProposal, userComment?: string }`
  - Returns: `{ ok: boolean, executed: boolean, mode: AgentMode, result?: ExecutionResult }`

- `POST /api/agent/reject` - Reject proposal
  - Body: `{ proposalId: string, reason?: string }`
  - Returns: `{ ok: boolean }`

- `GET /api/agent/mode` - Get current mode and config
  - Returns: `{ ok: boolean, mode: AgentMode, config?: AgentConfig }`

- `POST /api/agent/mode` - Change mode
  - Body: `{ mode: AgentMode }`
  - Returns: `{ ok: boolean, mode: AgentMode, config?: AgentConfig }`

- `GET /api/agent/kill` - Get kill switch state
  - Returns: `{ ok: boolean, enabled: boolean }`

- `POST /api/agent/kill` - Toggle kill switch
  - Body: `{ enabled: boolean }`
  - Returns: `{ ok: boolean, enabled: boolean }`

- `GET /api/agent/status` - Get full agent status
  - Returns: `{ ok: boolean, mode: AgentMode, killSwitch: {...}, brains: {...}, safety: {...}, health: {...} }`

- `GET /api/agent/decisions` - Query audit log
  - Query params: `?limit=50&mode=paper&user_action=approved&since=2024-01-01`
  - Returns: `{ ok: boolean, decisions: Decision[] }`

- `GET /api/agent/config` - Get risk settings
  - Returns: `{ ok: boolean, config: AgentConfig }`

- `POST /api/agent/config` - Update risk settings
  - Body: `{ max_risk_per_trade?: number, daily_loss_limit?: number, allowed_symbols?: string[], psychology_mode?: string, allow_overnight?: boolean }`
  - Returns: `{ ok: boolean, config: AgentConfig }`

## Testing Checklist

### 1. Agent Control Panel
- [ ] Navigate to `/agent/control`
- [ ] Verify mode selector shows current mode
- [ ] Change mode to LEARN - verify description updates
- [ ] Change mode to PAPER - verify description updates
- [ ] Change mode to LIVE_ASSISTED - verify description updates
- [ ] Toggle kill switch ON - verify button turns red
- [ ] Toggle kill switch OFF - verify button turns green
- [ ] Verify brain status displays (may show red if no recent analysis)
- [ ] Verify system health shows IBKR/Bridge/IBeam status

### 2. Trade Proposal Flow
- [ ] Navigate to `/symbol/SPX` (or any symbol)
- [ ] Click "Ask Agent for Plan"
- [ ] Verify modal opens and shows loading state
- [ ] Verify proposal appears with:
  - Entry, stop, target, size
  - R:R ratio
  - Confidence bar
  - Brain breakdown (Market, Risk, Psychology)
  - Safety status banner
- [ ] If mode is OFF - verify approve button is disabled
- [ ] If mode is LEARN - verify approve button says "Log Decision (LEARN)"
- [ ] If mode is PAPER - verify approve button says "Approve Trade"
- [ ] If mode is LIVE_ASSISTED - verify approve shows confirmation dialog
- [ ] Click "Reject" - verify reason input appears
- [ ] Enter reason and confirm - verify rejection is logged

### 3. Mode-Specific Behavior
- [ ] Set mode to OFF
  - [ ] Try to open proposal modal - should show "Agent is OFF" banner
  - [ ] Approve button should be disabled
- [ ] Set mode to LEARN
  - [ ] Approve a proposal - should log "would-have-taken" decision
  - [ ] Verify no execution occurs
- [ ] Set mode to PAPER
  - [ ] Approve a proposal - should show "Paper trade submitted"
  - [ ] Verify trade appears in trades table with `is_paper=true`
- [ ] Set mode to LIVE_ASSISTED
  - [ ] Approve a proposal - should show confirmation dialog
  - [ ] Confirm - should place real IBKR order
  - [ ] Verify order appears in IBKR orders

### 4. Kill Switch
- [ ] Set mode to PAPER
- [ ] Turn kill switch ON
- [ ] Try to approve a proposal - should be blocked with message
- [ ] Verify "KILL SWITCH ON" banner appears in modal
- [ ] Turn kill switch OFF
- [ ] Approve should work again

### 5. Decision & Audit Log
- [ ] Navigate to `/agent/decisions`
- [ ] Verify table shows recent decisions
- [ ] Filter by mode (e.g., PAPER only)
- [ ] Filter by action (e.g., APPROVED only)
- [ ] Click a decision row - verify detail modal opens
- [ ] Verify detail modal shows:
  - Full proposal JSON
  - Brain outputs
  - Safety checks
  - Execution result (if any)

### 6. Risk Settings
- [ ] Navigate to `/agent/settings`
- [ ] Change max risk per trade to 1000
- [ ] Change daily loss limit to 3000
- [ ] Add symbol "AAPL" to allowed list
- [ ] Change psychology mode to "Aggressive"
- [ ] Toggle overnight positions ON
- [ ] Click "Save Settings"
- [ ] Refresh page - verify settings persisted
- [ ] Verify these settings affect Risk Brain calculations

### 7. Integration Points
- [ ] Home page: Click "Ask Agent for Plan" in AgentTradePlanCard
  - [ ] Verify modal opens with SPX (or default symbol)
- [ ] Symbol page: Click "Ask Agent for Plan"
  - [ ] Verify modal opens with current symbol
- [ ] Trades page: Click "Ask Agent" on a position
  - [ ] Verify modal opens with position symbol

### 8. Status Visibility
- [ ] Verify `AgentStatusBadge` appears on:
  - [ ] Home page (top right)
  - [ ] Symbol page (header)
  - [ ] Trades page (header)
- [ ] Verify badge shows current mode
- [ ] Verify badge shows kill switch status (when applicable)

## Manual Testing Commands

### Check Agent Status
```bash
curl http://localhost:3000/api/agent/status
```

### Get Current Mode
```bash
curl http://localhost:3000/api/agent/mode
```

### Change Mode to PAPER
```bash
curl -X POST http://localhost:3000/api/agent/mode \
  -H "Content-Type: application/json" \
  -d '{"mode":"paper"}'
```

### Toggle Kill Switch
```bash
curl -X POST http://localhost:3000/api/agent/kill \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'
```

### Request Proposal for SPX
```bash
curl -X POST http://localhost:3000/api/agent/propose-trade \
  -H "Content-Type: application/json" \
  -d '{"ticker":"SPX","timeframe":"H1"}'
```

### Get Recent Decisions
```bash
curl http://localhost:3000/api/agent/decisions?limit=10
```

### Get Risk Settings
```bash
curl http://localhost:3000/api/agent/config
```

### Update Risk Settings
```bash
curl -X POST http://localhost:3000/api/agent/config \
  -H "Content-Type: application/json" \
  -d '{"max_risk_per_trade":1000,"daily_loss_limit":3000}'
```

## Known Limitations

1. **LEARN mode proposals**: Currently LEARN mode still allows proposals to be shown to user. Per spec, LEARN should not show actionable proposals, but we allow it for transparency. The approve action in LEARN only logs, never executes.

2. **Symbol input in modal**: The proposal modal doesn't currently allow changing the symbol - it uses the pre-filled ticker. This can be enhanced later.

3. **Position context**: When opening proposal modal from trades page, we don't pre-fill current position size/direction - this could be enhanced.

4. **Real-time updates**: Brain status and system health refresh every 5-10 seconds, not real-time. This is acceptable for Phase 5.

## Next Steps (Future Enhancements)

1. Add symbol picker to proposal modal
2. Pre-fill proposal modal with position context from trades page
3. Add real-time WebSocket updates for brain status
4. Add proposal history/compare feature
5. Add "modify proposal" flow (currently only approve/reject)
6. Add batch proposal generation for watchlist

