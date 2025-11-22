// src/app/api/test/calendar/route.ts

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

    return NextResponse.json({ ok: true, from, to, count: data.length, data });
  } catch (error: any) {
    console.error("FMP calendar error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

