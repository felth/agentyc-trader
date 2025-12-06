import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // TODO: Wire to actual system diagnostics
    // - Check IBKR bridge health
    // - Check IBKR gateway auth status
    // - Check market data feeds
    // - Check agent status
    
    return NextResponse.json({
      systemStatus: "GREEN" as const,
      dateDisplay: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
      }),
      timeDisplay: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  } catch {
    return NextResponse.json({
      systemStatus: "RED" as const,
      dateDisplay: "Unknown",
      timeDisplay: "--:--",
    });
  }
}

