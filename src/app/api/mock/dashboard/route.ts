import { NextRequest, NextResponse } from "next/server";
import type { AgentContextBlock } from "@/types/trading";

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

    return NextResponse.json({ ok: true, context });
  } catch (err: any) {
    console.error("Mock dashboard API error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

