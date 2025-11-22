import { NextRequest, NextResponse } from "next/server";
import type { AgentContextBlock, MacroCalendarData } from "@/types/trading";

export const runtime = "nodejs";

/**
 * Mock API endpoint that returns complete Agent Context Block
 * This will be replaced with real data providers in later phases
 */
export async function GET(req: NextRequest) {
  try {
    const symbol = req.nextUrl.searchParams.get("symbol") || "XAUUSD";
    const timeframe = req.nextUrl.searchParams.get("timeframe") || "H1";

    // Generate mock Agent Context Block
    const context: AgentContextBlock = {
      symbolContext: {
        symbol,
        timeframe,
        timestamp: new Date().toISOString(),
      },
      marketOverview: {
        benchmarkSymbols: [
          { symbol: "SPX", price: 5200, pctChange: -0.3 },
          { symbol: "NDX", price: 18200, pctChange: -0.5 },
          { symbol: "DXY", price: 103.5, pctChange: 0.2 },
          { symbol: "VIX", price: 13.2, pctChange: 5.1 },
          { symbol: "XAUUSD", price: 2385.8, pctChange: 0.8 },
          { symbol: "BTCUSD", price: 95000, pctChange: 1.8 },
        ],
      },
      orderFlow: {
        dom: [
          { price: 2385.1, bidSize: 24, askSize: 12 },
          { price: 2385.0, bidSize: 30, askSize: 8 },
          { price: 2384.9, bidSize: 18, askSize: 15 },
          { price: 2384.8, bidSize: 22, askSize: 10 },
          { price: 2384.7, bidSize: 16, askSize: 20 },
          { price: 2385.2, bidSize: 10, askSize: 25 },
          { price: 2385.3, bidSize: 8, askSize: 28 },
          { price: 2385.4, bidSize: 12, askSize: 22 },
        ],
        volumeImbalance: -0.35,
        restingLiquidityAbove: 320,
        restingLiquidityBelow: 510,
        liquidityGaps: [
          { price: 2392.0, gapSize: 45 },
          { price: 2378.5, gapSize: 38 },
        ],
      },
      volume: {
        barVolume: 1820,
        volumeDelta: -340,
        cvd: -5200,
        tapeSpeed: 45,
      },
      execution: {
        avgSlippagePips: 0.3,
        maxSlippagePips: 1.2,
        fillRatePct: 97,
        rejectionRatePct: 1,
        avgSpreadPips: 0.25,
        spreadExpansionNotes: "Spread widens to 0.6–0.8 pips during NY open and major news events.",
      },
      correlation: {
        correlations: [
          { symbol: "DXY", correlation: -0.72 },
          { symbol: "SPX", correlation: -0.35 },
          { symbol: "BTCUSD", correlation: 0.28 },
        ],
        portfolioUsdExposurePct: 78,
        portfolioBetaToEquities: -0.12,
        notes: "High USD-long exposure; new USD longs increase portfolio concentration risk.",
      },
      regime: {
        trendStatus: "RANGING",
        adx: 14.5,
        bollingerWidthPercentile: 65,
        volatilityState: "NORMAL",
      },
      volumeProfile: {
        pocPrice: 2382.5,
        valueAreaHigh: 2389.0,
        valueAreaLow: 2378.0,
        highVolumeNodes: [2380.5, 2385.0],
        lowVolumeAreas: [2374.0, 2392.0],
      },
      liquidityMap: {
        zones: [
          { direction: "above", price: 2395.0, type: "swingHigh" },
          { direction: "above", price: 2398.5, type: "cluster" },
          { direction: "below", price: 2370.0, type: "swingLow" },
          { direction: "below", price: 2365.5, type: "cluster" },
        ],
      },
      strategyConfluence: {
        setupMatchPct: 82,
        setupGrade: "A",
        candlePattern: "ENG",
        momentumScore: 68,
        notes: "Bullish engulfing off VAH with positive momentum but moderate CVD divergence. Stand aside until clearer signal.",
      },
      behavioural: {
        minutesSinceLastBreak: 140,
        overtradingFlag: "WARNING",
        manualStateTag: "STRESSED",
      },
      positioning: {
        cotBias: "NET_LONG",
        smartMoneyComment: "Large specs increased net long gold positions for the 3rd week.",
        biasConfidence: 72,
      },
      portfolio: {
        balance: 100000,
        equity: 101200,
        dailyPnl: 1200,
        maxDrawdownPct: 3.5,
        openPositions: [
          {
            symbol: "XAUUSD",
            direction: "LONG",
            size: 1.0,
            entryPrice: 2368.0,
            stopLoss: 2356.0,
            takeProfit: 2395.0,
            unrealizedPnl: 1700,
          },
        ],
      },
    };

    // Generate AI summary based on context
    const aiSummary = `Market conditions for ${symbol} are ${context.regime.trendStatus.toLowerCase()}. Your ${context.strategyConfluence.setupGrade}-setup is showing ${context.strategyConfluence.setupMatchPct}% confluence with a bullish engulfing pattern. Volume delta at ${context.volume.volumeDelta} indicates ${context.volume.volumeDelta < 0 ? 'selling pressure' : 'buying pressure'}. Key levels to watch: POC at ${context.volumeProfile.pocPrice.toFixed(2)}, VAH at ${context.volumeProfile.valueAreaHigh.toFixed(2)}. ${context.behavioural.overtradingFlag === 'WARNING' ? '⚠️ Consider taking a break soon—overtrading risk detected.' : 'All systems are green for trading.'}`;

    // Generate mock macro calendar data
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const macroCalendar: MacroCalendarData = {
      today: [
        {
          id: "1",
          time: new Date(today.getTime() + 8.5 * 60 * 60 * 1000).toISOString(), // 08:30 ET
          timeDisplay: "08:30 ET",
          country: "US",
          category: "ECONOMIC",
          name: "Non-Farm Payrolls",
          impact: "HIGH",
          currency: "USD",
          forecast: "200K",
          previous: "187K",
          description: "Employment change excluding farm workers",
        },
        {
          id: "2",
          time: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString(), // 10:00 ET
          timeDisplay: "10:00 ET",
          country: "US",
          category: "ECONOMIC",
          name: "ISM Manufacturing PMI",
          impact: "MEDIUM",
          currency: "USD",
          forecast: "52.3",
          previous: "51.2",
          description: "Purchasing Managers Index",
        },
        {
          id: "3",
          time: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(), // 14:00 ET
          timeDisplay: "14:00 ET",
          country: "US",
          category: "CENTRAL_BANK",
          name: "FOMC Meeting Minutes",
          impact: "HIGH",
          currency: "USD",
          description: "Federal Reserve meeting minutes release",
        },
        {
          id: "4",
          time: new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(), // 12:00 ET
          timeDisplay: "12:00 ET",
          country: "EU",
          category: "ECONOMIC",
          name: "CPI (YoY)",
          impact: "HIGH",
          currency: "EUR",
          forecast: "2.8%",
          previous: "2.9%",
          description: "Consumer Price Index year-over-year",
        },
        {
          id: "5",
          time: new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 09:00 ET
          timeDisplay: "09:00 ET",
          country: "UK",
          category: "ECONOMIC",
          name: "GDP (QoQ)",
          impact: "MEDIUM",
          currency: "GBP",
          forecast: "0.3%",
          previous: "0.2%",
          description: "Gross Domestic Product quarter-over-quarter",
        },
      ],
      upcoming: [],
      timezone: "America/New_York",
    };

    return NextResponse.json({ ok: true, context, aiSummary, macroCalendar });
  } catch (err: any) {
    console.error("Mock dashboard API error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

