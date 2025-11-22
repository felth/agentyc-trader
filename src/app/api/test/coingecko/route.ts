import { NextRequest, NextResponse } from "next/server";
import { getMarketOverview } from "@/lib/data/coingecko";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const data = await getMarketOverview();
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("CoinGecko test error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

