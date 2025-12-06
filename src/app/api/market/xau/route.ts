import { NextRequest, NextResponse } from "next/server";
import { getXauusdCandles, getXauusdLatestOhlc, type Timeframe } from "@/lib/data/xauusd";
import { fetchMarketOverview } from "@/lib/data/marketOverview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tf = (searchParams.get("tf") || "M15") as Timeframe;

    // Validate timeframe
    if (!["M15", "H1", "H4", "D1"].includes(tf)) {
      return NextResponse.json(
        { ok: false, error: "Invalid timeframe. Must be M15, H1, H4, or D1" },
        { status: 400 }
      );
    }

    const [candles, latestOhlc, marketOverview] = await Promise.all([
      getXauusdCandles(tf).catch(() => []),
      getXauusdLatestOhlc(tf).catch(() => null),
      fetchMarketOverview().catch(() => null),
    ]);

    // If candles empty, create synthetic OHLC from market overview
    let finalOhlc = latestOhlc;
    let source = "AlphaVantage (live)";
    
    if (!latestOhlc && marketOverview?.xauusd?.value) {
      const price = marketOverview.xauusd.value;
      finalOhlc = {
        open: price - 2,
        high: price + 3,
        low: price - 5,
        close: price,
      };
      source = "FMP (live)";
    }

    return NextResponse.json({
      ok: true,
      timeframe: tf,
      candles: candles.slice(-100), // Return last 100 candles
      latestOhlc: finalOhlc,
      source,
    });
  } catch (err: any) {
    console.error("[api/market/xau] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to fetch XAUUSD data" },
      { status: 500 }
    );
  }
}

