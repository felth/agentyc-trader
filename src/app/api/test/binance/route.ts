import { NextRequest, NextResponse } from "next/server";
import { getOrderBook, getTicker } from "@/lib/data/binance";

// Ensure this route uses nodejs runtime for serverless
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
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

