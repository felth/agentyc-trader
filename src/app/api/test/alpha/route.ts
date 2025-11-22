import { NextRequest, NextResponse } from "next/server";
import { getFxIntraday } from "@/lib/data/alphaVantage";

// Ensure this route uses nodejs runtime for serverless
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? "XAU";
    const to = searchParams.get("to") ?? "USD";

    const data = await getFxIntraday(from, to, "15min");
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[test/alpha] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

