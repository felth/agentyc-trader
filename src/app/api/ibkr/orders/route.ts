import { NextResponse } from "next/server";
import { checkIntent, getSkippedResponse } from '@/lib/ibkr/intentGate';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function proxyGET(req: Request, upstreamPath: string) {
  const base = process.env.IBKR_BRIDGE_URL || "http://127.0.0.1:8000";
  const key = process.env.IBKR_BRIDGE_KEY;

  if (!key) {
    return NextResponse.json(
      { ok: false, error: "IBKR_BRIDGE_KEY is not set" },
      { status: 500 }
    );
  }

  const incoming = new URL(req.url);
  const upstream = new URL(upstreamPath, base);
  upstream.search = incoming.search;

  const r = await fetch(upstream.toString(), {
    method: "GET",
    headers: {
      "x-bridge-key": key,
      "accept": "application/json",
    },
    cache: "no-store",
  });

  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") || "application/json",
    },
  });
}

export async function GET(req: Request) {
  // Gate: Require explicit user intent to prevent 2FA spam
  if (!checkIntent(req)) {
    return NextResponse.json(getSkippedResponse());
  }
  return proxyGET(req, "/orders");
}
