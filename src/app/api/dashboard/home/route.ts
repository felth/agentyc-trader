import { NextResponse } from "next/server";
import { buildDashboardSnapshot } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await buildDashboardSnapshot();
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

