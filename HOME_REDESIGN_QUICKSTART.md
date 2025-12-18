# Home Page Redesign - Quick Start

**Status:** Ready to implement  
**Main Spec:** See `HOME_REDESIGN_SPEC.md`

---

## Overview

Transform Home page from "marketing panel" to "command center" with:
- ✅ All key metrics at a glance (6-metric strip)
- ✅ Top positions by impact (table-style, not chips)
- ✅ Compact risk guardrails
- ✅ Tight market regime summary
- ✅ Single clear next action
- ✅ Progressive disclosure for secondary content

---

## Key Changes Summary

| Current | New | Purpose |
|---------|-----|---------|
| Large AccountRiskCard | AccountSnapshotStrip (compact) | More metrics, less space |
| Positions as chips | PositionsTopImpact (table) | Easier to scan impact |
| No dedicated risk card | RiskGuardrailsCard | Quick safety check |
| Verbose MarketRegimeCard | Tightened version | Less copy, more structure |
| Complex AgentTradePlanCard | NextActionCard | Single clear action |
| Always-visible Watchlist/News | Collapsible sections | Reduce noise |

---

## Implementation Order

**Start with Step 1** (safest, most visible impact):

1. ✅ Create `AccountSnapshotStrip` component
2. ✅ Create `PositionsTopImpact` component  
3. ✅ Create `RiskGuardrailsCard` component
4. ✅ Create `NextActionCard` component
5. ✅ Refactor `MarketRegimeCard` (tighten)
6. ✅ Create `CollapsibleSection` wrapper
7. ✅ Update `page.tsx` (replace sections)
8. ✅ Refine spacing & typography

---

## First Component: AccountSnapshotStrip

**File:** `src/components/home/AccountSnapshotStrip.tsx`

This is the highest-impact change and safest to start with.

**Why First:**
- New component (doesn't break existing)
- High visibility (top of page after hero)
- Immediate value (more metrics, less space)
- Easy to test in isolation

**Implementation:** See `HOME_REDESIGN_SPEC.md` Step 1 for full code.

**Test:** Add to page.tsx temporarily above AccountRiskCard to see both side-by-side, then replace once verified.

---

## Visual Comparison

### Before (Current)
```
┌──────────────────────────────┐
│ Today's Account & Risk       │
│ ┌──────────────────────────┐ │
│ │ Large card (200px+ tall) │ │
│ │ - Net Liquidity          │ │
│ │ - Buying Power           │ │
│ │ - Daily P&L              │ │
│ │ - Open Risk              │ │
│ │ - Positions count        │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

### After (New)
```
┌──────────────────────────────┐
│ [Scrollable metric strip]    │
│ Net Liq  Day P&L  Unrealized │
│ Buying P  Margin  Risk (R)   │
│ (80px tall, 6 metrics)       │
└──────────────────────────────┘
┌──────────────────────────────┐
│ Risk Guardrails              │
│ Daily limit: ████░░ 60%      │
│ Open Risk: 1.2R 🟢           │
│ (100px tall, compact)        │
└──────────────────────────────┘
```

**Result:** More metrics, less vertical space, better scannability.

---

## Critical Success Factors

1. **Data Availability:** All metrics come from existing `dashboard` data (no new APIs)
2. **Modularity:** Each component is isolated and testable
3. **Reversibility:** Old components kept as `.backup` during migration
4. **No Breaking Changes:** All navigation uses existing routes

---

## Ready to Start?

Begin with **Step 1: AccountSnapshotStrip** — see full code in `HOME_REDESIGN_SPEC.md`.

