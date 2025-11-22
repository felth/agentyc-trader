import { NextRequest, NextResponse } from "next/server";
import { getOrderBook, getTicker } from "@/lib/data/binance";

// Ensure this route uses nodejs runtime for serverless
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // Check env vars first
    const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
    const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;
    const BINANCE_BASE_URL = process.env.BINANCE_BASE_URL;

    if (!BINANCE_API_KEY || !BINANCE_API_SECRET || !BINANCE_BASE_URL) {
      return NextResponse.json(
        { ok: false, error: "Binance API credentials not configured on server" },
        { status: 500 }
      );
    }

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

