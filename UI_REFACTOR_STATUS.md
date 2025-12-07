# UI Refactor Implementation Status

## Overview
This document tracks the implementation of the comprehensive UI refactor plan for Agentyc Trader.

## Step 0: Navigation Cleanup ✅ COMPLETE
- [x] BottomNav already has correct 6 tabs (Home, Agentyc, Trades, Performance, Journal, Library)
- [x] Symbol pages already hide bottom nav

## Step 1: Agentyc Page 🔄 IN PROGRESS
### Components Created:
- [x] `AgentycHero.tsx` - Hero section with status chips
- [x] `AgencyChatPanel.tsx` - Chat interface placeholder
- [x] `AccountSnapshotMini.tsx` - Compact account card for sidebar
- [x] `PositionsMiniList.tsx` - Mini positions list
- [x] `TodayCalendarMini.tsx` - Mini calendar widget

### Remaining:
- [ ] Update `/agent/page.tsx` to use new layout (hero + 2-column grid)
- [ ] Wire data fetching for IBKR status, risk severity, etc.
- [ ] Test responsive layout (mobile vs desktop)

## Step 2: Trades Page ⏳ PENDING
- [ ] Update tabs structure
- [ ] Wire Open Positions tab to IBKR data
- [ ] Wire Orders tab
- [ ] Wire History tab

## Step 3: Performance Page ⏳ PENDING
- [ ] Create PerformanceHero component
- [ ] Add Equity & Drawdown chart
- [ ] Create PnL Breakdown card
- [ ] Create Exposure Breakdown card
- [ ] Add Behavior Insights section

## Step 4: Journal Page ⏳ PENDING
- [ ] Create Hero section
- [ ] Build New Entry form with tags
- [ ] Add Agency Reflection card
- [ ] Create Recent Entries list

## Step 5: Library Page ⏳ PENDING
- [ ] Create Hero section
- [ ] Add document list with filters
- [ ] Implement Corpus/Playbook toggles
- [ ] Add document viewer

## Step 6: Settings Page ⏳ PENDING
- [ ] Create Settings page structure
- [ ] Add Account section
- [ ] Add Risk Profile controls
- [ ] Add Agentyc Memory overview
- [ ] Add Notifications toggles
- [ ] Add Display Preferences

## Notes
- All components follow the design rules:
  - SourceStatusBadge on every card
  - AgentHintTag for interpretations
  - No mock data - only real or clear messages
- Implementation order recommended: 0 → 1 → 4 → 5 → 6 → 2 → 3

