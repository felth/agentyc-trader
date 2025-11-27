// src/app/api/test/ibkr/route.ts
import { NextResponse } from "next/server";
import { getBridgeHealth } from "@/lib/data/ibkrBridge";

export async function GET() {
  try {
    const data = await getBridgeHealth();
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

