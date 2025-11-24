import { NextRequest, NextResponse } from "next/server";

import { getEconomicCalendar } from "@/lib/data/fmp";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to =
      searchParams.get("to") ??
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const data = await getEconomicCalendar(from, to);

    return NextResponse.json({ ok: true, from, to, data });
  } catch (err: any) {
    console.error("FMP calendar error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}

