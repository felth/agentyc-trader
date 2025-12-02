import { NextResponse } from "next/server";
import { fetchMarketOverview } from "@/lib/data/marketOverview";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await fetchMarketOverview();
    return NextResponse.json({ ok: true, snapshot });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to load market overview" },
      { status: 500 }
    );
  }
}

