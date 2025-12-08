# Multi-Brain Trading Agent - File Structure Plan

## Overview
This plan outlines the file structure for implementing the Multi-Brain Trading Agent system as specified in the architecture document. All new files will be created without overwriting existing code.

## Directory Structure

```
src/
├── lib/
│   ├── brains/
│   │   ├── coordinator.ts          # NEW: Orchestrates all brains
│   │   ├── marketBrain.ts          # NEW: Market pattern detection
│   │   ├── riskBrain.ts            # NEW: Position sizing & risk limits
│   │   ├── psychologyBrain.ts      # NEW: User state & tilt detection
│   │   ├── types.ts                # NEW: Shared brain types
│   │   └── worldState.ts           # NEW: Unified world state builder
│   │
│   ├── safety/
│   │   ├── killSwitch.ts           # NEW: Emergency stop mechanism
│   │   ├── dataIntegrity.ts       # NEW: Data freshness & validation
│   │   ├── safetyChecks.ts        # NEW: Pre-order safety middleware
│   │   └── auditLogger.ts         # NEW: Decision logging
│   │
│   ├── validation/
│   │   ├── paperTrading.ts         # NEW: Paper trading mode
│   │   ├── stressTest.ts          # NEW: Failure injection testing
│   │   ├── bridgeIntegrity.ts     # NEW: IBKR integration validation
│   │   └── calibration.ts         # NEW: Confidence calibration
│   │
│   ├── telemetry/
│   │   ├── metrics.ts             # NEW: System & brain metrics
│   │   ├── driftMonitor.ts        # NEW: Feature drift detection
│   │   └── healthCheck.ts         # NEW: Extended health checks
│   │
│   └── agent/                      # EXISTING - will be extended
│       ├── coordinator.ts          # NEW: Wrapper around brain coordinator
│       └── ... (existing files)
│
├── app/
│   ├── api/
│   │   ├── agent/
│   │   │   ├── propose-trade/     # NEW: Trade proposal endpoint
│   │   │   │   └── route.ts
│   │   │   ├── brains/            # NEW: Individual brain status
│   │   │   │   └── route.ts
│   │   │   ├── coordinator/       # NEW: Full coordinator output
│   │   │   │   └── route.ts
│   │   │   └── ... (existing routes)
│   │   │
│   │   ├── safety/
│   │   │   ├── kill-switch/       # NEW: Kill switch control
│   │   │   │   └── route.ts
│   │   │   └── audit/            # NEW: Audit log queries
│   │   │       └── route.ts
│   │   │
│   │   └── validation/
│   │       ├── paper-mode/       # NEW: Paper trading toggle
│   │       │   └── route.ts
│   │       └── test/             # NEW: Validation test endpoints
│   │           └── route.ts
│   │
│   └── (tabs)/
│       └── agent/
│           └── propose/          # NEW: Trade proposal UI page
│               └── page.tsx
│
├── components/
│   ├── brains/
│   │   ├── BrainStatusCard.tsx   # NEW: Individual brain status display
│   │   ├── BrainConsensus.tsx    # NEW: Shows agreement/disagreement
│   │   └── BrainOutput.tsx       # NEW: Detailed brain output viewer
│   │
│   ├── safety/
│   │   ├── KillSwitchButton.tsx  # NEW: Emergency stop UI
│   │   ├── SafetyStatusBadge.tsx # NEW: Safety state indicator
│   │   └── DataIntegrityAlert.tsx # NEW: Data freshness warnings
│   │
│   ├── trading/
│   │   ├── TradeProposalModal.tsx # NEW: Full trade proposal UI
│   │   ├── BrainExplanation.tsx  # NEW: Shows why each brain says yes/no
│   │   └── ApprovalFlow.tsx      # NEW: Human approval workflow
│   │
│   └── telemetry/
│       ├── MetricsDashboard.tsx  # NEW: System metrics display
│       └── DriftAlert.tsx       # NEW: Feature drift warnings
│
└── types/
    ├── brains.ts                 # NEW: Brain input/output types
    ├── safety.ts                # NEW: Safety system types
    ├── validation.ts             # NEW: Validation layer types
    └── telemetry.ts              # NEW: Metrics & monitoring types
```

## Database Schema (Supabase)

New tables to be created:

```sql
-- Agent trading configuration
CREATE TABLE agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_trading_enabled BOOLEAN DEFAULT false,
  mode TEXT DEFAULT 'paper' CHECK (mode IN ('paper', 'live')),
  max_daily_loss_usd NUMERIC DEFAULT 2000,
  max_single_trade_risk_usd NUMERIC DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent decisions audit log
CREATE TABLE agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  context_snapshot JSONB, -- Full world state snapshot
  proposed_order JSONB,   -- Proposed trade details
  brains_output JSONB,    -- All brain outputs
  coordinator_output JSONB, -- Final coordinator decision
  user_action TEXT CHECK (user_action IN ('approved', 'rejected', 'modified')),
  user_notes TEXT,
  outcome JSONB,          -- Trade outcome (filled after execution)
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Brain health metrics
CREATE TABLE brain_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  brain_name TEXT, -- 'market', 'risk', 'psychology'
  state TEXT,      -- 'green', 'amber', 'red'
  confidence NUMERIC,
  reasoning TEXT,
  inputs_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- System telemetry
CREATE TABLE system_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  metric_type TEXT, -- 'data_integrity', 'brain_consensus', 'drift', etc.
  metric_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## File Details

### Core Brain System

#### `src/lib/brains/types.ts`
- `BrainState` enum: 'green' | 'amber' | 'red'
- `BrainOutput<T>` generic type for brain responses
- `WorldState` interface (unified state object)
- `BrainConsensus` type (all brain outputs combined)

#### `src/lib/brains/worldState.ts`
- `buildWorldState()`: Aggregates market data, account state, memory context, recent trades, user state
- Single source of truth for all brains

#### `src/lib/brains/marketBrain.ts`
- `analyzeMarket(worldState: WorldState): Promise<MarketBrainOutput>`
- Detects: trend regime, volatility, key levels, risk-reward
- Output: state, directional bias, volatility regime, confidence

#### `src/lib/brains/riskBrain.ts`
- `analyzeRisk(worldState: WorldState): Promise<RiskBrainOutput>`
- Calculates: position sizing, stop distance, max loss, leverage caps
- Output: allowed size, stop distance, take profit bands, "OK to trade?"

#### `src/lib/brains/psychologyBrain.ts`
- `analyzePsychology(worldState: WorldState): Promise<PsychologyBrainOutput>`
- Analyzes: journal entries, override history, time-of-day, fatigue
- Output: mental state, recommended cool-down, journaling prompts

#### `src/lib/brains/coordinator.ts`
- `coordinate(worldState: WorldState): Promise<CoordinatorOutput>`
- Orchestrates all brains
- Applies safety rules
- Produces final advice + explanation
- Implements "Trade Only If ALL Green" rule

### Safety System

#### `src/lib/safety/killSwitch.ts`
- `isTradingEnabled(): Promise<boolean>`
- `enableTrading(): Promise<void>`
- `disableTrading(): Promise<void>`
- `cancelAllAgentOrders(): Promise<void>`

#### `src/lib/safety/dataIntegrity.ts`
- `checkDataFreshness(): Promise<DataIntegrityStatus>`
- `validateTimeSeries(data: any[]): boolean`
- `checkIBKRConnection(): Promise<boolean>`

#### `src/lib/safety/safetyChecks.ts`
- `preOrderSafetyCheck(proposal: TradeProposal): Promise<SafetyCheckResult>`
- Middleware that checks: kill switch, data integrity, daily loss limit, psych state
- Returns structured error for UI and logs

#### `src/lib/safety/auditLogger.ts`
- `logDecision(decision: AgentDecision): Promise<void>`
- Stores: context snapshot, proposed order, brain outputs, user action, outcome

### Validation System

#### `src/lib/validation/paperTrading.ts`
- `isPaperMode(): Promise<boolean>`
- `simulateOrder(order: TradeOrder): Promise<SimulatedResult>`
- Paper trading mode implementation

#### `src/lib/validation/stressTest.ts`
- `injectFailure(type: FailureType): Promise<void>`
- `testReconnection(): Promise<boolean>`
- Failure injection for testing

### Telemetry System

#### `src/lib/telemetry/metrics.ts`
- `recordBrainMetrics(brain: string, output: BrainOutput): Promise<void>`
- `getSystemHealth(): Promise<SystemHealth>`
- `getBrainConsensus(): Promise<BrainConsensus>`

#### `src/lib/telemetry/driftMonitor.ts`
- `checkFeatureDrift(): Promise<DriftAlert[]>`
- `monitorConfidenceCalibration(): Promise<CalibrationReport>`

## API Routes

### `/api/agent/propose-trade` (POST)
- Input: `{ symbol?, context? }` (optional - can use current state)
- Output: `{ ok, proposal, brains, coordinator, requiredChecks }`
- Returns full trade proposal with all brain outputs

### `/api/agent/brains` (GET)
- Returns current state of all brains
- Output: `{ market, risk, psychology, consensus }`

### `/api/agent/coordinator` (GET)
- Returns full coordinator output
- Output: `{ worldState, brains, finalDecision, explanation }`

### `/api/safety/kill-switch` (GET/POST)
- GET: Returns current kill switch state
- POST: `{ enabled: boolean }` - Toggle kill switch

### `/api/safety/audit` (GET)
- Query params: `?limit=50&since=timestamp`
- Returns audit log entries

### `/api/validation/paper-mode` (GET/POST)
- GET: Returns current mode
- POST: `{ mode: 'paper' | 'live' }` - Toggle mode

## UI Components

### Trade Proposal Flow
1. User clicks "Propose Trade" or agent auto-proposes
2. `TradeProposalModal` shows:
   - Proposed order details
   - Brain outputs (Market: Green, Risk: OK, Psych: Amber)
   - Coordinator explanation
   - Required safety checks status
3. User approves/rejects/modifies
4. If approved → order sent via IBKR
5. Decision logged to audit table

### Kill Switch
- Large red/green button in top nav
- Shows current state clearly
- Confirmation dialog before toggling
- Immediate effect (checked in order routes)

## Integration Points

### Existing Files to Extend (NOT overwrite)

1. `src/app/api/ibkr/order/place/route.ts`
   - Add safety check middleware at top
   - Check kill switch before any order

2. `src/lib/agent/tradingContext.ts`
   - Extend to include world state builder
   - Add memory context integration

3. `src/app/agent/page.tsx`
   - Add kill switch button
   - Add brain status display
   - Add trade proposal UI

4. `src/lib/agent/riskConfig.ts`
   - Keep existing, add new fields for multi-brain system

## Migration Strategy

1. **Phase 1**: Create all new files (brains, safety, validation, telemetry)
2. **Phase 2**: Create database tables
3. **Phase 3**: Implement coordinator and integrate with existing agent routes
4. **Phase 4**: Add UI components
5. **Phase 5**: Add safety middleware to order routes
6. **Phase 6**: Testing and validation

## Notes

- All new code will be in new files/directories
- Existing agent routes will be extended, not replaced
- Database migrations will be in `supabase/migrations/` (if using Supabase migrations)
- TypeScript types will ensure type safety across the system
- All brain outputs must be explainable (human-readable reasoning)

