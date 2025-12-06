import { NextResponse } from "next/server";
import { getTodayEconomicCalendar } from "@/lib/data/economicCalendar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const calendar = await getTodayEconomicCalendar();
    return NextResponse.json({ ok: true, calendar });
  } catch (err: any) {
    console.error("[api/calendar/today] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to fetch economic calendar" },
      { status: 500 }
    );
  }
}

