// src/app/api/test/fmp-basic/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // FMP has moved from /api/v3 to /stable endpoints (legacy v3 endpoints deprecated Aug 31, 2025)
    const FMP_BASE_URL = process.env.FMP_BASE_URL || "https://financialmodelingprep.com/stable";
    const FMP_API_KEY = process.env.FMP_API_KEY;

    console.log("[test/fmp-basic] Starting FMP basic test");
    console.log(`[test/fmp-basic] FMP_BASE_URL: ${FMP_BASE_URL}`);
    console.log(`[test/fmp-basic] FMP_API_KEY exists: ${!!FMP_API_KEY}`);
    console.log(`[test/fmp-basic] FMP_API_KEY length: ${FMP_API_KEY?.length || 0}`);

    if (!FMP_API_KEY) {
      console.error("[test/fmp-basic] ERROR: FMP_API_KEY is not set in environment");
      return NextResponse.json(
        { ok: false, error: "FMP_API_KEY is not set in environment variables" },
        { status: 500 }
      );
    }

    // Test with simple profile endpoint (new stable endpoint: /company/profile/)
    const testUrl = `${FMP_BASE_URL}/company/profile/AAPL?apikey=${FMP_API_KEY}`;
    console.log(`[test/fmp-basic] Calling: ${FMP_BASE_URL}/company/profile/AAPL?apikey=***REDACTED***`);

    const res = await fetch(testUrl);

    console.log(`[test/fmp-basic] Response status: ${res.status} ${res.statusText}`);
    console.log(`[test/fmp-basic] Response headers:`, Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error(`[test/fmp-basic] ERROR ${res.status}: ${errorText}`);
      
      return NextResponse.json(
        {
          ok: false,
          error: `FMP API error: ${res.status} ${res.statusText}`,
          details: errorText,
          url: `${FMP_BASE_URL}/company/profile/AAPL?apikey=***REDACTED***`,
        },
        { status: res.status }
      );
    }

    const data = await res.json().catch(async (err) => {
      const text = await res.text().catch(() => "");
      console.error(`[test/fmp-basic] JSON parse error:`, err);
      console.error(`[test/fmp-basic] Response body:`, text);
      throw new Error(`Failed to parse JSON response: ${err.message}. Body: ${text.substring(0, 200)}`);
    });

    console.log(`[test/fmp-basic] SUCCESS: Received data`, typeof data === "object" ? `${Array.isArray(data) ? `array[${data.length}]` : "object"}` : typeof data);

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error("[test/fmp-basic] EXCEPTION:", error);
    console.error("[test/fmp-basic] Stack:", error?.stack);
    
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unknown error",
        stack: error?.stack,
      },
      { status: 500 }
    );
  }
}

