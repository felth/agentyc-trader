import { NextResponse } from "next/server";
import { buildDashboardSnapshot } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await buildDashboardSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Dashboard build failed" },
      { status: 500 }
    );
  }
}

