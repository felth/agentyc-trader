import { NextResponse } from "next/server";
import { buildDashboardSnapshot } from "@/lib/data/dashboard";
import { checkIntent } from "@/lib/ibkr/intentGate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // Only fetch IBKR data if user has explicit intent (prevents 2FA spam)
    const hasIntent = checkIntent(req);
    const snapshot = await buildDashboardSnapshot(hasIntent);
    return NextResponse.json({ ok: true, snapshot });
  } catch (err: any) {
    console.error("[dashboard/home] Error:", err);
    return NextResponse.json(
      { 
        ok: false, 
        error: err?.message ?? "Dashboard build failed",
        details: process.env.NODE_ENV === "development" ? err?.stack : undefined
      },
      { status: 500 }
    );
  }
}

