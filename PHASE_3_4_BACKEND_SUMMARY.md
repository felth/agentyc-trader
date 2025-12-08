# Phase 3-4: Backend Implementation Summary

## Architecture Overview

The multi-brain trading agent backend is fully implemented with production-ready code paths for all four modes (OFF, LEARN, PAPER, LIVE_ASSISTED).

## Core Components

### 1. Memory Layer (`src/lib/memory/agentMemory.ts`)
**Purpose:** Single source of truth for all memory access. Brains never call Supabase/Pinecone directly.

**Key Functions:**
- `getAgentContext(params)` - Loads config, trades, decisions, vector memory, psychology signals
- `storeInMemory(namespace, id, vector, metadata)` - Stores vectors in Pinecone
- `queryMemory(namespace, queryVector, topK, filter)` - Queries Pinecone with namespace filtering

**Data Sources:**
- Supabase: `agent_config`, `trades`, `agent_decisions`
- Pinecone: Corpus (general knowledge), Playbook (trading rules), Trades (historical patterns)

### 2. World State Builder (`src/lib/brains/worldState.ts`)
**Purpose:** Single source of truth for market data, account state, positions.

**Key Functions:**
- `buildWorldState(params)` - Gathers:
  - Market data (OHLCV, price, volatility, trend, regime)
  - IBKR account (equity, positions, orders, daily PnL)
  - Memory context (from agentContext)
  - User state (session, recent losses, time of day)
  - System state (data freshness, IBKR connection)

### 3. Brains

#### Market Brain (`src/lib/brains/marketBrain.ts`)
**Inputs:** WorldState, AgentContext
**Outputs:** Trend regime, directional bias, volatility regime, key levels, entry/stop/target, R:R

**Logic:**
- Trend detection (UP/DOWN/SIDEWAYS) from price action and SMAs
- Volatility assessment (low/normal/high/extreme) from ATR
- Risk-off regime detection
- Entry zone and target calculation based on volatility

#### Risk Brain (`src/lib/brains/riskBrain.ts`)
**Inputs:** WorldState, AgentContext, MarketBrainOutput
**Outputs:** Position size, risk limits, R:R validation, stop placement

**Logic:**
- Position sizing based on max risk per trade
- R:R validation (minimum 1.5:1)
- Daily loss limit checking
- Open positions limit checking
- Symbol whitelist validation
- Position size capping (max 20% of account)

#### Psychology Brain (`src/lib/brains/psychologyBrain.ts`)
**Inputs:** WorldState, AgentContext
**Outputs:** Mental state, recommended action, size multiplier, behavioral warnings

**Logic:**
- Tilt detection (3+ loss streak)
- Overconfidence detection (5+ win streak)
- Fatigue scoring
- FOMO detection (high trading frequency)
- Fear detection (many rejections)
- Psychology mode adjustment (Conservative/Balanced/Aggressive)

### 4. Coordinator (`src/lib/brains/coordinator.ts`)
**Purpose:** Orchestrates all brains and generates final trade proposal

**Key Functions:**
- `coordinate(worldState, agentContext)` - Runs all brains, applies "All Green" rule, generates proposal
- `runAllBrains()` - Parallel execution of all brains
- `applyAllGreenRule()` - Enforces "trade only if all green" logic
- `generateExplanation()` - Human-readable decision explanation

**All Green Rule:**
- If any brain is RED → block trade
- If all brains are GREEN → allow trade
- If any brain is AMBER → allow with caution (reduced size)

### 5. Safety Modules

#### Kill Switch (`src/lib/safety/killSwitch.ts`)
- `isTradingEnabled()` - Checks `agent_config.agent_trading_enabled`
- `setKillSwitch(enabled)` - Updates kill switch state
- Backed by Supabase `agent_config` table

#### Data Integrity (`src/lib/safety/dataIntegrity.ts`)
- `checkDataFreshness(worldState)` - Validates data age
- `isBridgeHealthy()` - Checks IBKR bridge health
- Max age: 1 minute for market data, 30 seconds for account data

#### Safety Checks (`src/lib/safety/safetyChecks.ts`)
- `checkProposal(proposal, worldState, agentContext)` - Full proposal validation
- Checks: kill switch, data freshness, risk limits, symbol whitelist, overnight constraints, daily loss limit
- Returns: `{ allowed: boolean, reasons: string[], flags: string[] }`

#### Audit Logger (`src/lib/safety/auditLogger.ts`)
- `logProposal()` - Logs proposal to `agent_decisions`
- `logApprovedTrade()` - Logs approval and execution result
- `logRejectedTrade()` - Logs rejection with reason
- All logs include: proposal JSON, brain outputs, safety results, execution results

### 6. Validation Modules

#### Paper Trading (`src/lib/validation/paperTrading.ts`)
- `executePaperTrade(proposal)` - Simulates order execution
- Inserts trade into `trades` table with `is_paper=true`
- Applies slippage simulation (0.1% for market orders)
- Returns simulated fill price and quantity

## API Endpoints

### POST /api/agent/propose-trade
**Flow:**
1. Check mode allows proposals (OFF/LEARN blocked)
2. Get agent context (memory layer)
3. Build world state
4. Run coordinator (all brains)
5. Run safety checks
6. Log proposal
7. Return proposal + safety result

**Request:**
```json
{
  "ticker": "SPX",
  "timeframe": "H1"
}
```

**Response:**
```json
{
  "ok": true,
  "proposal": {
    "id": "proposal-...",
    "ticker": "SPX",
    "side": "LONG",
    "entry": { "type": "LIMIT", "price": 5000 },
    "stop_loss": { "price": 4950, "reason": "..." },
    "targets": [{ "price": 5100, "weight": 1.0 }],
    "size": { "units": 10, "notional_usd": 50000, "risk_perc_equity": 0.5 },
    "risk": { "allowed": true, "risk_reward_ratio": 2.0, ... },
    "psychology": { "allowed": true, ... },
    "brains": { "market": {...}, "risk": {...}, "psychology": {...} },
    "meta": { "confidence": 0.75, ... }
  },
  "safety": {
    "allowed": true,
    "reasons": [],
    "flags": []
  }
}
```

### POST /api/agent/approve
**Flow:**
1. Check mode allows approval (OFF/LEARN blocked for execution)
2. Load proposal from database
3. Re-run safety checks
4. Check kill switch (for PAPER/LIVE_ASSISTED)
5. Mode-based execution:
   - LEARN: Log only, no execution
   - PAPER: Call `executePaperTrade()`
   - LIVE_ASSISTED: Call `placeIbkrOrder()` via bridge
6. Log approval and result

**Request:**
```json
{
  "proposalId": "uuid-here"
}
```

**Response:**
```json
{
  "ok": true,
  "executed": true,
  "mode": "paper",
  "result": {
    "filled": true,
    "fillPrice": 5000.50,
    "fillQuantity": 10,
    "simulated": true
  }
}
```

### POST /api/agent/reject
**Flow:**
1. Load proposal from database
2. Update `agent_decisions` with rejection reason
3. Mark `user_action = 'rejected'`

**Request:**
```json
{
  "proposalId": "uuid-here",
  "reason": "User rejected - risk too high"
}
```

## Mode Semantics (Centralized in `src/lib/agent/agentMode.ts`)

### OFF
- `canPropose: false`
- `canApprove: false`
- `canExecute: false`
- `/api/agent/propose-trade` returns 403

### LEARN
- `canPropose: false` (no actionable proposals to user)
- `canApprove: false`
- `canExecute: false`
- Agent can analyze internally, but no proposals shown

### PAPER
- `canPropose: true`
- `canApprove: true`
- `canExecute: true` (simulated)
- Full proposal flow with simulated execution

### LIVE_ASSISTED
- `canPropose: true`
- `canApprove: true`
- `canExecute: true` (real IBKR)
- Full proposal flow with real execution (requires explicit approval)

## Safety Guarantees

1. **Kill Switch**: Enforced for PAPER and LIVE_ASSISTED modes
2. **Mode Enforcement**: All endpoints check mode semantics
3. **Safety Checks**: All proposals validated before execution
4. **Audit Logging**: Every decision logged with full context
5. **Data Integrity**: Stale data detection blocks execution
6. **No Direct IBKR Calls**: All execution goes through agent endpoints

## Database Schema

### agent_config
- Single row (id: `00000000-0000-0000-0000-000000000001`)
- Fields: mode, max_risk_per_trade, daily_loss_limit, allowed_symbols, psychology_mode, agent_trading_enabled, allow_overnight

### agent_decisions
- Full audit log
- Fields: symbol, action, direction, brains (JSONB), confidence, safety (JSONB), user_action, user_reason, proposal (JSONB), result (JSONB), mode

### brain_metrics
- Per-brain health tracking
- Fields: brain_name, state, confidence, reasoning, inputs_snapshot, latency_ms

### system_telemetry
- System-wide metrics
- Fields: metric_type, metric_value (JSONB)

## Integration Points for UI

### Proposal Flow
1. UI calls `POST /api/agent/propose-trade` with ticker
2. Backend returns full `TradeProposal` + `SafetyResult`
3. UI displays proposal with brain breakdown
4. User approves → UI calls `POST /api/agent/approve` with proposalId
5. Backend executes based on mode (PAPER/LIVE_ASSISTED)
6. UI shows result

### Status Flow
1. UI calls `GET /api/agent/status` periodically
2. Backend returns: mode, kill switch, brain states, system health
3. UI updates status indicators

### Settings Flow
1. UI calls `GET /api/agent/config` to load settings
2. User changes settings
3. UI calls `POST /api/agent/config` to save
4. Settings immediately affect Risk Brain and Safety Checks

## Error Handling

All endpoints return structured errors:
```json
{
  "ok": false,
  "error": "Human-readable error message"
}
```

Common errors:
- `Agent is OFF - no proposals or executions allowed` (mode = OFF)
- `Kill switch is ON - trading disabled` (kill switch active)
- `Safety checks failed: [reasons]` (proposal blocked)
- `Symbol SPX is not in allowed list` (whitelist violation)
- `Daily loss limit would be exceeded` (risk limit)

## Performance Considerations

- Brains run in parallel (`Promise.all`)
- World state building is async and caches where possible
- Memory layer queries are batched
- Status endpoints refresh every 5 seconds (configurable)
- Proposal generation typically takes 1-3 seconds

## Testing

All endpoints can be tested with curl (see `PHASE_5_UI_WIRING_SUMMARY.md` for examples).

Key test scenarios:
1. Mode transitions (OFF → LEARN → PAPER → LIVE_ASSISTED)
2. Kill switch toggle
3. Proposal generation for various symbols
4. Approval in each mode
5. Safety check failures
6. Audit log queries

