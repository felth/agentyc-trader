import { NextResponse } from "next/server";
import { generatePerformanceInsight } from "@/lib/agent/performanceInsight";

export const runtime = "nodejs";

export async function GET() {
  try {
    const insight = await generatePerformanceInsight();
    return NextResponse.json({ ok: true, insight });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to generate performance insight" },
      { status: 500 }
    );
  }
}

