# UI Refinement Completion Status

## Implementation Progress

### ✅ Completed Steps

#### Step 0: Shared Primitives & Copy Cleanup
- [x] Extended SourceStatusBadge for MEMORY/JOURNAL/AGENCY
- [x] Created memory constants file
- [x] Updated AgentHintTag to show "AGENCY"
- [x] Started Agent → Agency rename in UI text
- [ ] Complete all Agent → Agency renames

#### Step 1: Home Page Small Tunes
- [x] PositionsSnapshot: Made ticker chips clickable → `/symbol/[ticker]`
- [x] SystemHealthFooter: Updated to link to `/settings?tab=diagnostics`
- [ ] Sticky section labels (optional polish)

#### Step 3: Trades Page Fix
- [x] Created OpenPositionsTable component
- [x] Created OrdersPlaceholder component  
- [x] Created HistoryPlaceholder component
- [ ] Update Trades page to use dashboard snapshot (same as Home)
- [ ] Wire components into page

### ⏳ In Progress

#### Step 2: Agency Page Refactor
- [ ] Create AgencyHero component
- [ ] Create AgencyChatShell component
- [ ] Create AgencyContextColumn component
- [ ] Update page layout

#### Step 4: Performance Page Updates
- [ ] Update PerformanceHero copy
- [ ] Make EquityDrawdownCard explicit about missing data
- [ ] Update PnLBreakdownCard
- [ ] Update BehaviorInsightsCard

#### Step 5: Journal Page Enhancement
- [ ] Create NewEntryCard component
- [ ] Create AIReflectionCard component
- [ ] Create PatternsGrid component
- [ ] Create RecentEntriesList component

#### Step 6: Library Page Refactor
- [ ] Create libraryFormat.ts helper
- [ ] Add filter chips
- [ ] Update document list cards

#### Step 7: Settings Page Enhancements
- [ ] Add Memory section
- [ ] Add Diagnostics route
- [ ] Update Connections section

## Next Actions

1. Complete Trades page refactor (use dashboard snapshot)
2. Continue with remaining steps systematically
3. Test all changes for consistency
