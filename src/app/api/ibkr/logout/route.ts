import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBridgeUrl() {
  return process.env.IBKR_BRIDGE_URL || "http://127.0.0.1:8000";
}

function getBridgeKey() {
  return process.env.IBKR_BRIDGE_KEY || "agentyc-bridge-9u1Px";
}

export async function POST() {
  const bridgeUrl = getBridgeUrl();
  const bridgeKey = getBridgeKey();

  try {
    // Simple proxy to Bridge /logout endpoint
    const res = await fetch(`${bridgeUrl}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bridge-Key": bridgeKey,
      },
    });

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: `Bridge connection error: ${e?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
