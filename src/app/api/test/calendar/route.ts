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

    // Log the dates being used for debugging
    console.log(`[test/calendar] Fetching calendar from ${from} to ${to}`);
    
    // Check if API key is set
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "FMP_API_KEY not set in environment variables" },
        { status: 500 }
      );
    }
    console.log(`[test/calendar] API key exists (length: ${apiKey.length})`);

    const data = await getEconomicCalendar(from, to);

    return NextResponse.json({ ok: true, from, to, count: data.length, data });
  } catch (error: any) {
    console.error("[test/calendar] FMP calendar error:", error);
    return NextResponse.json(
      { 
        ok: false, 
        error: error?.message ?? "Unknown error",
        details: error?.message?.includes("403") 
          ? "403 Forbidden - Check if API key has access to economic calendar endpoint, or if endpoint exists in your subscription tier"
          : undefined
      },
      { status: 500 }
    );
  }
}

