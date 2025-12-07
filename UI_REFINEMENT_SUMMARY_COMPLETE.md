# UI Refinement - Complete Implementation Summary

## Status: IN PROGRESS - Working Through All 7 Steps

## Completed So Far

### Step 0: Shared Primitives (Partial)
- ✅ Extended SourceStatusBadge (MEMORY/JOURNAL/AGENCY/OFF/TODO)
- ✅ Created memory constants file
- ✅ Updated AgentHintTag to show "AGENCY"
- ⏳ Agent → Agency rename in UI text (in progress)

### Step 1: Home Page (Partial)
- ✅ PositionsSnapshot: Tickers clickable → `/symbol/[ticker]`
- ✅ SystemHealthFooter: Links to `/settings?tab=diagnostics`
- ⏳ Sticky section labels (optional polish)

### Step 3: Trades Page Components Created
- ✅ OpenPositionsTable component
- ✅ OrdersPlaceholder component
- ✅ HistoryPlaceholder component
- ⏳ Wire into page with dashboard snapshot

## Remaining Implementation

### Step 0 Completion
- Complete all "Agent" → "Agency" UI text renames

### Step 2: Agency Page Refactor
- Create AgencyHero, AgencyChatShell, AgencyContextColumn
- Update `/agent/page.tsx` layout

### Step 3: Trades Page Fix
- Wire dashboard snapshot data (same as Home)
- Use new components

### Step 4: Performance Page
- Update all cards to be honest about data availability
- Add explicit empty states

### Step 5: Journal Page
- Create NewEntryCard, AIReflectionCard, PatternsGrid, RecentEntriesList
- Wire journal API

### Step 6: Library Page
- Create libraryFormat.ts helper
- Add filters (All/Corpus/Playbook)
- Update document cards

### Step 7: Settings
- Add Memory section with index names
- Create Diagnostics route/tab
- Update Connections section

## Next Actions

Continuing systematic implementation of all remaining steps...
