import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/data/massive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Validate environment variables are set (getQuote will use them)
    const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY;
    const MASSIVE_BASE_URL = process.env.MASSIVE_BASE_URL;

    if (!MASSIVE_API_KEY || !MASSIVE_BASE_URL) {
      return NextResponse.json(
        { ok: false, error: "MASSIVE_API_KEY or MASSIVE_BASE_URL is not set" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") ?? "XAUUSD";

    const data = await getQuote(symbol);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[test/massive] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

