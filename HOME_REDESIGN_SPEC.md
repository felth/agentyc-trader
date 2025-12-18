# Home Page Redesign Specification
## Premium "Command Center" Experience

**Version:** 1.0  
**Date:** 2025-01-17  
**Status:** Design Spec — Ready for Implementation

---

## Design Principles

1. **Calm Premium:** High-contrast dark UI, generous spacing, minimal noise
2. **Glanceable Truth:** Answer 5 questions in 3 seconds
3. **Progressive Disclosure:** Summary first, details one tap away
4. **Visual Hierarchy:** What matters now is visually dominant
5. **Micro-interactions:** Subtle, purposeful, non-flashy

---

## Information Architecture

### Current Problems
- Too many sections competing for attention
- Account & Risk card is large but doesn't show all key metrics
- Positions shown as chips (hard to scan impact)
- Watchlist/News/Trade Plan compete with critical data
- Section headers are noisy (all-caps, too prominent)

### Proposed Structure

```
┌─────────────────────────────────────┐
│ HERO SECTION (Keep - Liked)         │
│ - Date/Time overlay                 │
│ - Agent Status Badge (top-right)    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ IBKR Connection Banner              │
│ (Only when NOT connected)           │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ SECTION A: Account Snapshot Strip   │ ← NEW: Compact, high-density
│ 6 metrics in horizontal grid        │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ SECTION B: Positions That Matter    │ ← REDESIGN: Top 3-5 by impact
│ Table-style rows, not chips         │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ SECTION C: Risk Guardrails          │ ← NEW: Single safety card
│ Daily limit progress, risk status   │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ SECTION D: Market Regime            │ ← TIGHTEN: Less copy
│ Compact, single-line summary        │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ SECTION E: Next Action              │ ← REDESIGN: Single CTA focus
│ One primary action or "No action"   │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ SECTION F: Secondary (Collapsible)  │ ← PROGRESSIVE: Hide by default
│ Watchlist | Events | News           │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ System Health Footer (Keep)         │
└─────────────────────────────────────┘
```

---

## Section Specifications

### SECTION A: Account Snapshot Strip

**Purpose:** "How much money is at risk right now?" + key account metrics

**Layout:** Horizontal scrollable strip OR 2-row grid (3 items per row)

**Metrics (6 total):**
1. **Net Liquidity** → `/performance` (tappable)
2. **Day P&L** → `/performance` (tappable)
3. **Unrealized P&L** → `/trades` (tappable)
4. **Buying Power** → `/performance` (tappable)
5. **Margin Used** → `/performance` (tappable, calculated: equity - buyingPower)
6. **Open Risk (R)** → `/performance` (tappable)

**Visual Design:**
- Compact: ~80px height
- Each metric: label (10px, uppercase, muted) + value (18px, semibold, white) + optional trend
- No card wrapper — just subtle divider lines or spacing
- Dark background with subtle elevation
- Hover/tap: slight scale (1.02) + highlight

**Component:** `AccountSnapshotStrip`
**File:** `src/components/home/AccountSnapshotStrip.tsx`

**Data Mapping:**
- `dashboard.account.equity` → Net Liquidity
- `dashboard.account.unrealizedPnl` → Day P&L (or calculate daily from trades)
- `dashboard.account.unrealizedPnl` → Unrealized P&L
- `dashboard.account.buyingPower` → Buying Power
- `dashboard.account.equity - dashboard.account.buyingPower` → Margin Used
- `openRiskR` (calculated) → Open Risk (R)

---

### SECTION B: Positions That Matter

**Purpose:** "What positions matter right now?" — Show top 3-5 by absolute exposure or unrealized P&L

**Layout:** Table-style rows (not chips), compact, scannable

**Sort Logic:** By absolute unrealized P&L (most impactful first)

**Row Design:**
```
┌─────────────────────────────────────────────┐
│ Symbol  |  Qty  |  UPL ($)  |  % Move  | 🟡 │
│ XAUUSD  | +2.5  | +$1,234   | +2.1%    |    │
│ SPX     | -1    | -$450     | -1.2%    | ⚠️ │
└─────────────────────────────────────────────┘
```

**Columns:**
1. Symbol (left-aligned, 14px semibold)
2. Quantity (center, 13px, + for long, - for short)
3. Unrealized P&L (right, 14px, green/red)
4. % Move (right, 12px, muted) — calculate: (marketPrice - avgPrice) / avgPrice
5. Risk indicator (optional dot/badge if high risk)

**Empty State:** Premium empty state — "No positions" with subtle illustration/icon

**Footer:** "View all positions" link → `/trades?tab=open`

**Component:** `PositionsTopImpact`
**File:** `src/components/home/PositionsTopImpact.tsx`

**Data Mapping:**
- `dashboard.positions` → Sort by `Math.abs(position.unrealizedPnl)`
- Take top 5
- `position.symbol` → Symbol
- `position.quantity` → Quantity
- `position.unrealizedPnl` → Unrealized P&L
- `(position.marketPrice - position.avgPrice) / position.avgPrice * 100` → % Move

---

### SECTION C: Risk Guardrails

**Purpose:** "Am I safe?" — Single glanceable safety card

**Layout:** Compact card with:
- Daily loss limit progress bar
- Current open risk vs allowed risk
- Kill switch state (if available)

**Visual Design:**
- Horizontal layout
- Progress bar shows: dailyPnl / dailyLossLimit
- Risk indicator: Open Risk (R) with color coding
- Compact: ~100px height

**Component:** `RiskGuardrailsCard`
**File:** `src/components/home/RiskGuardrailsCard.tsx`

**Data Mapping:**
- `dailyPnl` (calculated) → Daily P&L vs limit
- `dailyLossLimit` (from tradePlan or default 2000) → Limit
- `openRiskR` (calculated) → Open Risk indicator
- `agentStatus.killSwitch.enabled` → Kill switch state (if available)

---

### SECTION D: Market Regime

**Purpose:** "What is the market regime?" — Tight, compact summary

**Layout:** Single-line compact card OR 2-column grid (tight)

**Content:**
- Trend regime: **RANGE** (single word, color-coded)
- Volatility: "ATR 45th" (short label)
- Session: "NY" (single word)
- Context: Max 90 chars, single line

**Visual Design:**
- Remove paragraphs
- Single-line summary instead of multi-line
- Remove excessive badges (keep 1-2 max)

**Component:** `MarketRegimeCard` (modify existing)
**File:** `src/components/home/MarketRegimeCard.tsx` (refactor)

**Data Mapping:**
- `trendRegime` (hardcoded "RANGE" for now) → Trend
- `volatilityState` (hardcoded) → Volatility
- `getCurrentSession()` → Session
- `summary` → Shorten to max 90 chars

---

### SECTION E: Next Action

**Purpose:** "What should I do next?" — Single primary CTA

**Layout:** Compact card with ONE primary action

**States:**
1. **No action recommended** → Show "No action" with subtle styling
2. **Agent has plan** → Show top action bullet + "View plan" button
3. **Risk warning** → Show "Reduce exposure" warning + action
4. **Setup forming** → Show "Setup forming" hint

**Visual Design:**
- Primary action button (if action exists)
- Or subtle "No action recommended" text
- Remove "Ask Agent for Plan" secondary (move to Agent page)

**Component:** `NextActionCard`
**File:** `src/components/home/NextActionCard.tsx`

**Data Mapping:**
- `tradePlan?.orders?.[0]` → Primary action
- `riskSeverity` → Risk warning
- `imminentHighImpact` → News risk warning
- If no plan + no warnings → "No action recommended"

---

### SECTION F: Secondary Panels (Progressive Disclosure)

**Purpose:** Watchlist, Events, News — Available but not dominant

**Layout Options:**

**Option 1: Collapsible Sections**
- Default: Collapsed (show header only)
- Tap to expand
- Animated expand/collapse

**Option 2: Single "More" Drawer**
- Button: "More →" at bottom
- Opens drawer/modal with Watchlist, Events, News

**Option 3: Compact Cards**
- Single compact card with preview (3 items max)
- "View all" link → respective pages

**Recommendation:** Option 1 (Collapsible) — most flexible

**Components:** Keep existing, wrap in collapsible wrapper
**Files:** 
- `src/components/home/InteractiveWatchlist.tsx` (wrap)
- `src/components/home/NewsRiskEvents.tsx` (wrap)

---

## Visual Improvements

### Typography Scale
- **Hero/Banner:** 24px-32px (keep existing)
- **Section Headers:** 13px uppercase, muted (reduce from 15px)
- **Metric Labels:** 10px uppercase, tracking-wide, muted
- **Metric Values:** 18px-24px semibold, white
- **Body Text:** 14px regular, white/80
- **Captions:** 12px regular, white/50

### Spacing Rhythm
- **Section Gap:** 24px (reduce from 36px/9 in gap-9)
- **Card Padding:** 20px (reduce from 28px/7)
- **Internal Spacing:** 12px base unit
- **Border Radius:** 16px (reduce from 24px for tighter feel)

### Borders & Elevation
- **Remove:** Heavy borders, multiple border layers
- **Use:** Subtle borders (border-white/10), elevation via blur/shadow
- **Cards:** Single border, subtle backdrop blur
- **Dividers:** Thin lines (1px, white/5)

### Status Labels
- **Standardize:** LIVE, ERROR, IDLE, DEGRADED
- **Size:** 11px uppercase, semibold
- **Colors:** Green (#00FF7F), Red (#FF4D4D), Yellow (#FFBF00), Gray (white/50)
- **Remove:** Inconsistent badge styles

### Empty States
- **Design:** Calm, premium, helpful
- **Content:** Short message (max 40 chars) + subtle icon/illustration
- **Example:** "No positions" with subtle line icon

---

## Component Breakdown

### New Components to Create

1. **`AccountSnapshotStrip`**
   - Location: `src/components/home/AccountSnapshotStrip.tsx`
   - Props: `{ metrics: AccountMetric[], onMetricTap?: (metric: string) => void }`
   - Purpose: Compact horizontal metric strip

2. **`PositionsTopImpact`**
   - Location: `src/components/home/PositionsTopImpact.tsx`
   - Props: `{ positions: Position[], onViewAll?: () => void }`
   - Purpose: Table-style top positions by impact

3. **`RiskGuardrailsCard`**
   - Location: `src/components/home/RiskGuardrailsCard.tsx`
   - Props: `{ dailyPnl: number, dailyLimit: number, openRiskR: number, killSwitchEnabled?: boolean }`
   - Purpose: Compact safety/risk overview

4. **`NextActionCard`**
   - Location: `src/components/home/NextActionCard.tsx`
   - Props: `{ action?: string, riskSeverity?: string, onViewPlan?: () => void }`
   - Purpose: Single primary action CTA

5. **`CollapsibleSection`** (Wrapper)
   - Location: `src/components/ui/CollapsibleSection.tsx`
   - Props: `{ title: string, defaultCollapsed?: boolean, children: ReactNode }`
   - Purpose: Reusable collapsible wrapper

### Components to Modify

1. **`MarketRegimeCard`**
   - Tighten layout, reduce copy, single-line summary

2. **`AccountRiskCard`** → **Remove/Replace**
   - Replace with `AccountSnapshotStrip` + `RiskGuardrailsCard`

3. **`PositionsSnapshot`** → **Replace**
   - Replace with `PositionsTopImpact`

4. **`AgentTradePlanCard`** → **Simplify**
   - Extract "Next Action" → `NextActionCard`
   - Keep detailed plan on Agent page

### Components to Keep (Unchanged)

- `HeroSection` (liked)
- `SystemHealthFooter` (keep)
- `InteractiveWatchlist` (wrap in collapsible)
- `NewsRiskEvents` (wrap in collapsible)

---

## Data Mapping

### Available Data Sources (No New APIs)

**From `dashboard` (DashboardSnapshot):**
- `account.equity` → Net Liquidity
- `account.buyingPower` → Buying Power
- `account.unrealizedPnl` → Day P&L, Unrealized P&L
- `account.equity - account.buyingPower` → Margin Used (calculated)
- `positions[]` → Top positions (sort by impact)
- `positions[].symbol` → Symbol
- `positions[].quantity` → Quantity
- `positions[].unrealizedPnl` → Unrealized P&L
- `positions[].marketPrice`, `positions[].avgPrice` → % Move (calculated)

**From `tradePlan`:**
- `dailyLossLimitUsd` → Daily limit (default 2000)
- `orders[0]` → Primary action

**From `agentStatus`:**
- `safety.ibkrConnected` → Connection status
- `killSwitch.enabled` → Kill switch state

**From calculated:**
- `openRiskR` → Risk in R multiples (already calculated)
- `dailyPnl` → Daily P&L (already calculated)

**Not Available (Show as "—" or hide):**
- Margin Used percentage
- Historical correlations
- Advanced risk metrics

---

## UI Copy Style Guide

### Labels
- **Format:** Uppercase, 10-11px, tracking-wide
- **Tone:** Minimal, factual
- **Examples:** "NET LIQUIDITY", "DAY P&L", "RISK", "POSITIONS"

### Values
- **Format:** Numbers with 2 decimal places for currency, 1-2 for percentages
- **Formatting:** Use locale-aware formatting (`toLocaleString`)
- **Color:** White for neutral, green (#00FF7F) for positive, red (#FF4D4D) for negative

### Status Text
- **Format:** Single word or short phrase (max 3 words)
- **Tone:** Calm, authoritative
- **Examples:** "No action", "Reduce exposure", "Setup forming", "No positions"

### Context/Summary Text
- **Format:** Max 90 chars, single line
- **Tone:** Factual, helpful, not marketing-y
- **Examples:** "Stability. Low volatility. Best setups: pullbacks to support."

### Empty States
- **Format:** Max 40 chars
- **Tone:** Calm, not apologetic
- **Examples:** "No positions", "No action recommended"

### Buttons/CTAs
- **Primary:** Single action verb (max 2 words)
- **Secondary:** "View all", "More", "Details"
- **Tone:** Direct, action-oriented

---

## Implementation Plan (8 Steps)

### STEP 1: Create AccountSnapshotStrip Component
**Files:** `src/components/home/AccountSnapshotStrip.tsx`  
**Changes:** New component  
**Test:** Renders 6 metrics, all tappable  
**Risk:** Low (new component, doesn't affect existing)

### STEP 2: Create PositionsTopImpact Component
**Files:** `src/components/home/PositionsTopImpact.tsx`  
**Changes:** New component  
**Test:** Shows top 5 positions, sort by impact, empty state  
**Risk:** Low (new component)

### STEP 3: Create RiskGuardrailsCard Component
**Files:** `src/components/home/RiskGuardrailsCard.tsx`  
**Changes:** New component  
**Test:** Shows progress bar, risk indicator, kill switch  
**Risk:** Low (new component)

### STEP 4: Create NextActionCard Component
**Files:** `src/components/home/NextActionCard.tsx`  
**Changes:** New component  
**Test:** Shows primary action or "No action"  
**Risk:** Low (new component)

### STEP 5: Refactor MarketRegimeCard (Tighten)
**Files:** `src/components/home/MarketRegimeCard.tsx`  
**Changes:** Reduce padding, tighten layout, shorten summary to 90 chars  
**Test:** Visual matches spec, copy shortened  
**Risk:** Medium (modifies existing, but isolated)

### STEP 6: Create CollapsibleSection Wrapper
**Files:** `src/components/ui/CollapsibleSection.tsx`  
**Changes:** New reusable wrapper  
**Test:** Expands/collapses, smooth animation  
**Risk:** Low (new component)

### STEP 7: Update Home Page Layout (Replace Sections)
**Files:** `src/app/page.tsx`  
**Changes:**
- Replace AccountRiskCard → AccountSnapshotStrip + RiskGuardrailsCard
- Replace PositionsSnapshot → PositionsTopImpact
- Replace AgentTradePlanCard → NextActionCard (extract action)
- Wrap Watchlist/News in CollapsibleSection
- Update section headers (reduce size)
- Update spacing (reduce gaps)

**Test:** 
- All sections render correctly
- Data flows correctly
- Navigation works
- Empty states show

**Risk:** Medium (main page changes, but modular replacements)

### STEP 8: Refine Spacing & Typography
**Files:** 
- `src/app/page.tsx` (spacing adjustments)
- `src/components/home/*.tsx` (typography consistency)

**Changes:** Apply spacing rhythm, typography scale  
**Test:** Visual consistency, matches design spec  
**Risk:** Low (cosmetic)

---

## Step-by-Step Implementation (Detailed)

### Step 1: AccountSnapshotStrip Component

**Create:** `src/components/home/AccountSnapshotStrip.tsx`

```typescript
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Metric = {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  href?: string;
};

type AccountSnapshotStripProps = {
  metrics: Metric[];
};

export default function AccountSnapshotStrip({ metrics }: AccountSnapshotStripProps) {
  const router = useRouter();

  const formatValue = (val: string | number): string => {
    if (typeof val === "string") return val;
    return val.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  return (
    <section className="px-6 py-4">
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6">
        {metrics.map((metric, idx) => {
          const content = (
            <div 
              className="flex-shrink-0 min-w-[100px] px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all active:scale-[0.98]"
            >
              <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">
                {metric.label}
              </p>
              <p className="text-[18px] font-semibold text-white">
                {typeof metric.value === "number" && metric.value < 0 ? "" : ""}
                {formatValue(metric.value)}
              </p>
            </div>
          );

          return metric.href ? (
            <Link key={idx} href={metric.href}>
              {content}
            </Link>
          ) : (
            <div key={idx}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}
```

**Usage in page.tsx:**
```typescript
<AccountSnapshotStrip
  metrics={[
    { label: "Net Liquidity", value: dashboard?.account?.equity || 0, href: "/performance" },
    { label: "Day P&L", value: dailyPnl, href: "/performance" },
    { label: "Unrealized", value: dashboard?.account?.unrealizedPnl || 0, href: "/trades" },
    { label: "Buying Power", value: dashboard?.account?.buyingPower || 0, href: "/performance" },
    { label: "Margin Used", value: (dashboard?.account?.equity || 0) - (dashboard?.account?.buyingPower || 0), href: "/performance" },
    { label: "Risk", value: `${openRiskR.toFixed(1)}R`, href: "/performance" },
  ]}
/>
```

---

### Step 2: PositionsTopImpact Component

**Create:** `src/components/home/PositionsTopImpact.tsx`

```typescript
"use client";

import Link from "next/link";

type Position = {
  symbol: string;
  quantity: number;
  unrealizedPnl: number;
  percentMove: number;
  marketPrice: number;
  avgPrice: number;
};

type PositionsTopImpactProps = {
  positions: Position[];
};

export default function PositionsTopImpact({ positions }: PositionsTopImpactProps) {
  // Sort by absolute unrealized P&L (most impactful first)
  const sorted = [...positions].sort((a, b) => Math.abs(b.unrealizedPnl) - Math.abs(a.unrealizedPnl));
  const top5 = sorted.slice(0, 5);

  if (top5.length === 0) {
    return (
      <section className="px-6 py-4">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-8 text-center">
          <p className="text-white/40 text-[14px]">No positions</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-4">
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
        <div className="divide-y divide-white/5">
          {top5.map((pos) => (
            <Link
              key={pos.symbol}
              href={`/symbol/${pos.symbol}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
            >
              <div className="flex items-center gap-4 flex-1">
                <span className="text-[14px] font-semibold text-white w-20">
                  {pos.symbol}
                </span>
                <span className="text-[13px] text-white/60 w-12 text-center">
                  {pos.quantity > 0 ? `+${pos.quantity}` : pos.quantity}
                </span>
                <span className={`text-[14px] font-medium flex-1 text-right ${
                  pos.unrealizedPnl >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
                }`}>
                  {pos.unrealizedPnl >= 0 ? "+" : ""}
                  ${Math.abs(pos.unrealizedPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[12px] text-white/50 w-16 text-right">
                  {pos.percentMove >= 0 ? "+" : ""}{pos.percentMove.toFixed(1)}%
                </span>
              </div>
            </Link>
          ))}
        </div>
        {positions.length > 5 && (
          <div className="px-4 py-3 border-t border-white/5">
            <Link
              href="/trades?tab=open"
              className="text-[13px] text-white/60 hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              View all {positions.length} positions
              <span>→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
```

**Usage in page.tsx:**
```typescript
<PositionsTopImpact
  positions={
    dashboard?.positions?.map((pos) => ({
      symbol: pos.symbol,
      quantity: pos.quantity,
      unrealizedPnl: pos.unrealizedPnl,
      percentMove: pos.avgPrice > 0 
        ? ((pos.marketPrice - pos.avgPrice) / pos.avgPrice) * 100 
        : 0,
      marketPrice: pos.marketPrice,
      avgPrice: pos.avgPrice,
    })) || []
  }
/>
```

---

### Step 3: RiskGuardrailsCard Component

**Create:** `src/components/home/RiskGuardrailsCard.tsx`

```typescript
"use client";

import Link from "next/link";
import { getRiskSeverity } from "@/lib/riskUtils";

type RiskGuardrailsCardProps = {
  dailyPnl: number;
  dailyLimit: number;
  openRiskR: number;
  killSwitchEnabled?: boolean;
};

export default function RiskGuardrailsCard({
  dailyPnl,
  dailyLimit,
  openRiskR,
  killSwitchEnabled,
}: RiskGuardrailsCardProps) {
  const severity = getRiskSeverity(openRiskR);
  const severityColor =
    severity === "OK" ? "#00FF7F" :
    severity === "ELEVATED" ? "#FFBF00" : "#FF4D4D";
  
  const limitProgress = Math.min(Math.abs(dailyPnl) / dailyLimit, 1);
  const limitColor = limitProgress > 0.8 ? "#FF4D4D" : limitProgress > 0.5 ? "#FFBF00" : "#00FF7F";

  return (
    <section className="px-6 py-4">
      <Link
        href="/performance"
        className="block rounded-2xl bg-white/[0.03] border border-white/5 p-5 hover:bg-white/[0.05] hover:border-white/10 transition-all active:scale-[0.99]"
      >
        <div className="space-y-4">
          {/* Daily Limit Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-white/50">
                Daily Limit
              </p>
              <p className="text-[12px] font-medium text-white/70">
                ${Math.abs(dailyPnl).toLocaleString()} / ${dailyLimit.toLocaleString()}
              </p>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${limitProgress * 100}%`,
                  backgroundColor: limitColor,
                }}
              />
            </div>
          </div>

          {/* Risk Indicator */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-white/50">
              Open Risk
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: severityColor }}
              />
              <p
                className="text-[14px] font-semibold"
                style={{ color: severityColor }}
              >
                {openRiskR.toFixed(1)}R
              </p>
            </div>
          </div>

          {/* Kill Switch (if available) */}
          {killSwitchEnabled !== undefined && (
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/50">
                Kill Switch
              </p>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${killSwitchEnabled ? "bg-[#00FF7F]" : "bg-[#FF4D4D]"}`} />
                <p className="text-[12px] font-medium text-white/70">
                  {killSwitchEnabled ? "ON" : "OFF"}
                </p>
              </div>
            </div>
          )}
        </div>
      </Link>
    </section>
  );
}
```

**Usage in page.tsx:**
```typescript
<RiskGuardrailsCard
  dailyPnl={dailyPnl}
  dailyLimit={dailyLossLimit}
  openRiskR={openRiskR}
  killSwitchEnabled={agentStatus?.killSwitch?.enabled}
/>
```

---

### Step 4: NextActionCard Component

**Create:** `src/components/home/NextActionCard.tsx`

```typescript
"use client";

import Link from "next/link";

type NextActionCardProps = {
  action?: string;
  riskSeverity?: "OK" | "ELEVATED" | "DANGER";
  imminentHighImpact?: boolean;
  onViewPlan?: () => void;
};

export default function NextActionCard({
  action,
  riskSeverity,
  imminentHighImpact,
  onViewPlan,
}: NextActionCardProps) {
  // Determine primary message
  let message = "No action recommended";
  let messageColor = "text-white/50";
  let buttonText: string | null = null;
  let buttonAction: (() => void) | null = null;

  if (imminentHighImpact) {
    message = "News risk — no new trades";
    messageColor = "text-[#FFBF00]";
  } else if (riskSeverity === "DANGER") {
    message = "Reduce exposure";
    messageColor = "text-[#FF4D4D]";
    buttonText = "View positions";
    buttonAction = () => window.location.href = "/trades";
  } else if (riskSeverity === "ELEVATED") {
    message = "Risk elevated — trade lighter";
    messageColor = "text-[#FFBF00]";
  } else if (action) {
    message = action;
    messageColor = "text-white";
    buttonText = "View plan";
    buttonAction = onViewPlan || (() => window.location.href = "/agent");
  }

  return (
    <section className="px-6 py-4">
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">
              Next Action
            </p>
            <p className={`text-[16px] font-semibold ${messageColor}`}>
              {message}
            </p>
          </div>
          {buttonText && buttonAction && (
            <button
              onClick={buttonAction}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-[13px] font-medium rounded-xl transition-colors active:scale-[0.98]"
            >
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
```

**Usage in page.tsx:**
```typescript
<NextActionCard
  action={actionableBullets[0]}
  riskSeverity={riskSeverity}
  imminentHighImpact={imminentHighImpact}
  onViewPlan={() => window.location.href = "/agent"}
/>
```

---

## Visual Design Tokens

### Colors
```typescript
const colors = {
  // Status
  live: "#00FF7F",      // Green
  error: "#FF4D4D",     // Red
  warning: "#FFBF00",   // Yellow/Amber
  idle: "white/50",     // Gray

  // Text
  primary: "white",
  secondary: "white/80",
  muted: "white/50",
  disabled: "white/30",

  // Backgrounds
  card: "white/[0.03]",
  cardHover: "white/[0.06]",
  border: "white/5",
  borderHover: "white/10",
};
```

### Spacing
```typescript
const spacing = {
  sectionGap: "24px",      // Gap between major sections
  cardPadding: "20px",     // Internal card padding
  metricGap: "16px",       // Gap between metrics
  rowGap: "12px",          // Gap between rows
};
```

### Typography
```typescript
const typography = {
  hero: "24px-32px",
  sectionHeader: "13px uppercase tracking-wide",
  metricLabel: "10px uppercase tracking-wide",
  metricValue: "18px-24px font-semibold",
  body: "14px",
  caption: "12px",
};
```

---

## Success Criteria Checklist

- [ ] Home page loads and shows all critical data within 3 seconds
- [ ] Account metrics visible at a glance (6 metrics in strip)
- [ ] Top positions visible (top 5 by impact, table-style)
- [ ] Risk status glanceable (progress bar + risk indicator)
- [ ] Market regime compact (single-line summary)
- [ ] Next action clear (one primary CTA or "No action")
- [ ] Secondary content collapsible (watchlist/events/news)
- [ ] All metrics tappable → navigate to detail pages
- [ ] Empty states premium and calm
- [ ] Visual hierarchy clear (critical data dominant)
- [ ] Typography consistent
- [ ] Spacing rhythm consistent
- [ ] No infrastructure changes
- [ ] No API changes
- [ ] All existing routes work

---

## Rollback Plan

If issues arise:
1. **Step 7 is the main risk** — can revert to old components
2. Keep old components as `.backup` files during migration
3. Use feature flag if needed: `const USE_NEW_HOME = true;`
4. Git commits should be atomic per step for easy rollback

---

## Next Steps After Implementation

1. **User Testing:** Get feedback on new layout
2. **Performance:** Check bundle size, render performance
3. **Refinement:** Adjust spacing/typography based on feedback
4. **Progressive Enhancement:** Add subtle animations if performance allows

---

**Ready for implementation. Start with Step 1 and proceed incrementally.**

