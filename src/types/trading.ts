// Core symbol/timeframe context
export interface SymbolContext {
  symbol: string;            // "XAUUSD"
  timeframe: string;         // "M15" | "H1" | "H4" | "D1"
  timestamp: string;         // ISO string UTC
}

// 1. Order Flow & Microstructure
export interface DomLevel {
  price: number;
  bidSize: number;
  askSize: number;
}

export interface OrderFlowData {
  dom: DomLevel[];           // top 5–10 levels
  volumeImbalance: number;   // -1..1 (negative = sell pressure)
  restingLiquidityAbove: number; // aggregated size above
  restingLiquidityBelow: number; // aggregated size below
  liquidityGaps: { price: number; gapSize: number }[];
}

// 2. Real-Time Volume & Participation
export interface VolumeData {
  barVolume: number;
  volumeDelta: number;       // buys - sells
  cvd: number;               // cumulative volume delta
  tapeSpeed: number;         // ticks per second or similar
}

// 3. Broker Execution Reality
export interface ExecutionStats {
  avgSlippagePips: number;
  maxSlippagePips: number;
  fillRatePct: number;       // 0-100
  rejectionRatePct: number;  // 0-100
  avgSpreadPips: number;
  spreadExpansionNotes: string; // free text summary
}

// 4. Correlation & Intermarket Alignment
export interface CorrelationEntry {
  symbol: string;            // e.g. "DXY", "SPX"
  correlation: number;       // -1..1
}

export interface CorrelationData {
  correlations: CorrelationEntry[];
  portfolioUsdExposurePct: number;   // 0-100
  portfolioBetaToEquities: number;
  notes: string;
}

// 5. Market Regime
export interface MarketRegimeData {
  trendStatus: "TRENDING_UP" | "TRENDING_DOWN" | "RANGING";
  adx: number;
  bollingerWidthPercentile: number;  // 0-100
  volatilityState: "QUIET" | "NORMAL" | "EXPLOSIVE";
}

// 6. Volume Profile & Liquidity Map
export interface VolumeProfileData {
  pocPrice: number;
  valueAreaHigh: number;
  valueAreaLow: number;
  highVolumeNodes: number[]; // price levels
  lowVolumeAreas: number[];  // price levels
}

export interface LiquidityZone {
  direction: "above" | "below";
  price: number;
  type: "swingHigh" | "swingLow" | "cluster";
}

export interface LiquidityMapData {
  zones: LiquidityZone[];
}

// 7. Strategy Confluence Scores
export type CandlePattern = "ENG" | "PIN" | "INSIDE" | "MOMENTUM" | "NONE";

export interface StrategyConfluenceData {
  setupMatchPct: number;         // 0-100
  setupGrade: "A" | "B" | "C" | "None";
  candlePattern: CandlePattern;
  momentumScore: number;         // 0-100
  notes: string;
}

// 8. Behavioural / Biological State
export interface BehaviouralStateData {
  minutesSinceLastBreak: number;
  overtradingFlag: "OK" | "WARNING" | "CRITICAL";
  manualStateTag?: "CALM" | "NEUTRAL" | "STRESSED";
}

// 9. Positioning & Macro Bias (weekly)
export interface PositioningData {
  cotBias: "NET_LONG" | "NET_SHORT" | "NEUTRAL";
  smartMoneyComment: string;
  biasConfidence: number;   // 0-100
}

// Trade / portfolio for agent context
export interface OpenPosition {
  symbol: string;
  direction: "LONG" | "SHORT";
  size: number;              // lots or units
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  unrealizedPnl: number;
}

export interface PortfolioSnapshot {
  balance: number;
  equity: number;
  openPositions: OpenPosition[];
  dailyPnl: number;
  maxDrawdownPct: number;
}

// Market Overview symbols
export interface MarketSymbol {
  symbol: string;
  lastPrice: number;
  changePct: number;
  sessionHigh: number;
  sessionLow: number;
}

// OHLC for active symbol
export interface OHLCData {
  open: number;
  high: number;
  low: number;
  close: number;
  spread?: number;
}

// Agent Insight
export interface AgentInsight {
  symbol: string;
  timeframe: string;
  directionalBias: "BULLISH" | "BEARISH" | "NEUTRAL";
  keyLevels: string[];
  riskNotes: string[];
  advice: string;  // One-line advice
}

// Agent Context Block (complete context sent to agent)
export interface AgentContextBlock {
  symbolContext: SymbolContext;
  marketOverview: {
    benchmarkSymbols: {
      symbol: string;
      price: number;
      pctChange: number;
    }[];
  };
  orderFlow: OrderFlowData;
  volume: VolumeData;
  execution: ExecutionStats;
  correlation: CorrelationData;
  regime: MarketRegimeData;
  volumeProfile: VolumeProfileData;
  liquidityMap: LiquidityMapData;
  strategyConfluence: StrategyConfluenceData;
  behavioural: BehaviouralStateData;
  positioning: PositioningData;
  portfolio: PortfolioSnapshot;
}

// Market Overview Symbol (simplified for Row 1)
export interface MarketSymbol {
  symbol: string;
  lastPrice: number;
  changePct: number;
  sessionHigh: number;
  sessionLow: number;
}

// Macro Calendar Event
export type EventImpact = "HIGH" | "MEDIUM" | "LOW";
export type EventCategory = "ECONOMIC" | "CENTRAL_BANK" | "POLITICAL" | "CORPORATE";

export interface MacroCalendarEvent {
  id: string;
  time: string;              // ISO timestamp
  timeDisplay: string;       // "08:30 ET" or "14:00 GMT"
  country: string;           // "US", "EU", "UK", etc.
  category: EventCategory;
  name: string;              // "Non-Farm Payrolls", "CPI", "FOMC Decision"
  impact: EventImpact;
  currency?: string;         // "USD", "EUR", etc.
  forecast?: string | number; // Forecasted value
  previous?: string | number; // Previous value
  actual?: string | number;   // Actual value (if released)
  description?: string;       // Brief description
}

export interface MacroCalendarData {
  today: MacroCalendarEvent[];
  upcoming: MacroCalendarEvent[]; // Next few days
  timezone: string; // "America/New_York" or "UTC"
}

