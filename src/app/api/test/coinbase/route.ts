import { NextRequest, NextResponse } from "next/server";
import { getOrderBook, getTicker, binanceToCoinbaseSymbol } from "@/lib/data/coinbase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Accept both Binance format (BTCUSDT) and Coinbase format (BTC-USD)
    const symbolInput = searchParams.get("symbol") ?? "BTCUSDT";
    const endpoint = searchParams.get("endpoint") ?? "ticker"; // "ticker" or "orderbook"

    // Convert to Coinbase format if needed
    const productId = symbolInput.includes("-") ? symbolInput : binanceToCoinbaseSymbol(symbolInput);

    let data;
    if (endpoint === "orderbook") {
      data = await getOrderBook(productId);
    } else {
      data = await getTicker(productId);
    }

    return NextResponse.json({ 
      ok: true, 
      symbol: symbolInput, 
      productId,
      endpoint, 
      data 
    });
  } catch (err: any) {
    console.error("Coinbase test error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

