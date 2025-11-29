// src/app/api/agent/trading-context/route.ts

import { NextResponse } from "next/server";

import { getTradingContext } from "@/lib/agent/tradingContext";

export async function GET() {

  try {

    const ctx = await getTradingContext();

    return NextResponse.json({ ok: true, context: ctx });

  } catch (err: any) {
    return NextResponse.json(

      { ok: false, error: err?.message ?? "Failed to build trading context" },

      { status: 500 },

    );

  }

}

