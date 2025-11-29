import { NextResponse } from "next/server";
import { buildTradingContext } from "@/lib/agent/tradingContext";
import { generateTradePlan } from "@/lib/agent/generateTradePlan";

export async function GET() {
  try {
    const context = await buildTradingContext();
    const plan = await generateTradePlan(context);

    return NextResponse.json({ ok: true, plan });
  } catch (err: any) {
    const errorMessage = err?.message || "Unknown error";
    const isNetworkError = errorMessage.includes("connection failed") || errorMessage.includes("fetch failed");
    
    return NextResponse.json(
      { 
        ok: false, 
        error: errorMessage,
        ...(isNetworkError && { 
          hint: "IBKR Bridge may be unreachable. Check IBKR_BRIDGE_URL and network connectivity." 
        })
      },
      { status: 500 }
    );
  }
}
