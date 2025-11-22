import { NextRequest, NextResponse } from "next/server";
import { getOrderBook, getTicker } from "@/lib/data/binance";

// Ensure this route uses nodejs runtime for serverless
// This route only uses public Binance endpoints (no auth required)
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // For public endpoints, we only need BASE_URL (API_KEY/SECRET not required)
    // Default fallback so module can load during build
    const BINANCE_BASE_URL = process.env.BINANCE_BASE_URL || "https://api.binance.com";

    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") ?? "BTCUSDT";
    const endpoint = searchParams.get("endpoint") ?? "ticker"; // "ticker" or "orderbook"

    let data;
    if (endpoint === "orderbook") {
      data = await getOrderBook(symbol);
    } else {
      data = await getTicker(symbol);
    }

    return NextResponse.json({ ok: true, symbol, endpoint, data });
  } catch (err: any) {
    console.error("Binance test error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

