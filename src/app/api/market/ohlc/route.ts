import { NextRequest, NextResponse } from "next/server";
import { getOhlcv, type Timeframe } from "@/lib/data/ohlcv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Map user-friendly timeframe to internal format
function mapTimeframe(tf: string): Timeframe {
  switch (tf) {
    case "5m":
      return "M15"; // Use M15 as closest match
    case "1h":
      return "H1";
    case "1d":
      return "D1";
    default:
      return "H1";
  }
}

type OHLC = {
  t: number; // timestamp ms
  o: number;
  h: number;
  l: number;
  c: number;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get("ticker")?.toUpperCase();
    const tf = searchParams.get("tf") || "5m";

    if (!ticker) {
      return NextResponse.json(
        {
          status: "ERROR",
          data: [],
        },
        { status: 400 }
      );
    }

    // Convert timeframe format
    const internalTf = mapTimeframe(tf);
    
    // Fetch OHLCV data using existing helper
    const { candles } = await getOhlcv(ticker, internalTf);
    
    // Convert to the format expected by ChartPanel
    const data: OHLC[] = candles
      .slice(-100) // Last 100 candles
      .map((candle) => ({
        t: new Date(candle.timestamp).getTime(),
        o: candle.open,
        h: candle.high,
        l: candle.low,
        c: candle.close,
      }));

    return NextResponse.json({
      status: "LIVE",
      data,
    });
  } catch (err: any) {
    console.error("[api/market/ohlc] Error:", err);
    return NextResponse.json({
      status: "ERROR",
      data: [],
    });
  }
}

