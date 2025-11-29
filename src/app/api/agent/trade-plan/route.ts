import { NextResponse } from "next/server";
import { buildTradingContext } from "@/lib/agent/tradingContext";
import { generateTradePlan } from "@/lib/agent/generateTradePlan";

export async function GET() {
  try {
    const context = await buildTradingContext();
    const plan = await generateTradePlan(context);

    return NextResponse.json({ ok: true, plan });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
