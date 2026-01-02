import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getGatewayBase() {
  return (
    process.env.IBKR_GATEWAY_BASE ||
    process.env.NEXT_PUBLIC_IBKR_GATEWAY_BASE ||
    "https://ibkr.agentyctrader.com"
  );
}

async function tryPost(url: string) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return { ok: res.ok, status: res.status };
  } catch (e: any) {
    return { ok: false, status: 0, error: String(e?.message || e) };
  }
}

export async function POST() {
  const base = getGatewayBase();
  const a = await tryPost(`${base}/v1/api/logout`);
  const b = await tryPost(`${base}/v1/api/iserver/auth/logout`);

  return NextResponse.json({
    ok: true,
    gatewayBase: base,
    attempts: {
      v1_logout: a,
      iserver_auth_logout: b,
    },
  });
}
