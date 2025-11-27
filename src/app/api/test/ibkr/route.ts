import { NextRequest, NextResponse } from "next/server";
import { getBridgeHealth } from "@/lib/ibkr/bridge";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const data = await getBridgeHealth();
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("IBKR Bridge test error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}

