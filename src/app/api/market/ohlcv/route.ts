import { NextRequest, NextResponse } from "next/server";
import { getOhlcv, getLatestOhlc, type Timeframe } from "@/lib/data/ohlcv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const tf = (searchParams.get("tf") || "M15") as Timeframe;

    if (!symbol) {
      return NextResponse.json(
        { ok: false, error: "Missing required parameter: symbol" },
        { status: 400 }
      );
    }

    // Validate timeframe
    if (!["M15", "H1", "H4", "D1"].includes(tf)) {
      return NextResponse.json(
        { ok: false, error: "Invalid timeframe. Must be M15, H1, H4, or D1" },
        { status: 400 }
      );
    }

    const [{ candles, provider }, latestOhlc] = await Promise.all([
      getOhlcv(symbol, tf),
      getLatestOhlc(symbol, tf).catch(() => null),
    ]);

    return NextResponse.json({
      ok: true,
      symbol,
      timeframe: tf,
      provider,
      candles: candles.slice(-100), // Return last 100 candles
      latestOhlc,
    });
  } catch (err: any) {
    console.error("[api/market/ohlcv] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to fetch OHLCV data" },
      { status: 500 }
    );
  }
}

