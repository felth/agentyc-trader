# UI Refinement Progress Tracker

## Status: Starting Implementation

This document tracks progress on the comprehensive UI refinement spec.

## Step 0: Shared Primitives & Copy Cleanup

### 0.1 Rename "Agent" to "Agency" ✅ IN PROGRESS
- [x] AgentHintTag: "AGENT •" → "AGENCY •"
- [x] AgentTradePlanCard: "Agent Trade Plan" → "Agency Trade Plan"
- [x] SourceStatusBadge: Added "AGENCY" provider
- [ ] Update all UI text references to "Agent" → "Agency"
- [ ] Update component prop names and types (where UI-facing)

### 0.2 Shared badges for MEMORY and JOURNAL ✅ IN PROGRESS
- [x] Extended SourceStatusBadge to support MEMORY and JOURNAL providers
- [x] Added "OFF" and "TODO" status options
- [ ] Test badge display with new variants

### 0.3 Constants for index names ✅ DONE
- [x] Created `src/lib/constants/memory.ts` with index constants

## Step 1: Home Page Small Tunes
- [ ] Sticky section labels (optional polish)
- [ ] PositionsSnapshot: Clickable tickers → `/symbol/[ticker]`
- [ ] InteractiveWatchlist: Clickable cards → `/symbol/[symbol]`
- [ ] SystemHealthFooter: "Tap for diagnostics" → `/settings?tab=diagnostics`

## Step 2: Agency Page Refactor
- [ ] Create AgencyHero component
- [ ] Create AgencyChatShell component
- [ ] Create AgencyContextColumn component
- [ ] Update `/agent/page.tsx` to use new layout

## Step 3: Trades Page Fix (CRITICAL)
- [x] Fixed API route to unwrap positions array properly
- [ ] Verify positions display correctly
- [ ] Create OpenPositionsTable component
- [ ] Create OrdersPlaceholder component
- [ ] Create HistoryPlaceholder component
- [ ] Ensure all tabs use same data source as Home

## Step 4: Performance Page Updates
- [ ] Update PerformanceHero copy
- [ ] Make EquityDrawdownCard explicit about missing data
- [ ] Update PnLBreakdownCard to show unrealized from current positions
- [ ] Update BehaviorInsightsCard with Journal link

## Step 5: Journal Page Enhancement
- [ ] Create NewEntryCard component
- [ ] Create AIReflectionCard component
- [ ] Create PatternsGrid component
- [ ] Create RecentEntriesList component
- [ ] Wire up journal entry API

## Step 6: Library Page Refactor
- [ ] Create libraryFormat.ts with parseDocumentName helper
- [ ] Add filter chips (All / Corpus / Playbook)
- [ ] Update document list cards with display titles
- [ ] Add search functionality

## Step 7: Settings Page Enhancements
- [ ] Add Memory section with index names
- [ ] Add Diagnostics tab/route
- [ ] Link SystemHealthFooter to diagnostics

## Current Focus

**Immediate Priority:**
1. Complete Step 0.1 (Agent → Agency rename in all UI text)
2. Fix Trades page positions bug (Step 3)
3. Continue with remaining steps

**Next:**
- Step 2: Agency page refactor
- Step 4: Performance page honesty
- Step 5: Journal usability
- Step 6: Library memory browser

