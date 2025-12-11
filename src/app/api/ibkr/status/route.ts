import { NextResponse } from "next/server";
import { ibkrRequest } from "@/lib/ibkr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BridgeHealth = {
  ok?: boolean;
  service?: string;
  status?: string;
  note?: string;
};

export async function GET() {
  try {
    const health = await ibkrRequest<BridgeHealth>("/health");

    const bridgeOk = !!health?.ok;

    return NextResponse.json({
      ok: bridgeOk,
      bridge: {
        ok: bridgeOk,
        error: bridgeOk ? null : "Bridge /health did not return ok: true",
        raw: health,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      bridge: {
        ok: false,
        error:
          err?.message ||
          "IBKR bridge health check failed (could not reach /health)",
      },
    });
  }
}
