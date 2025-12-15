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

type GatewayAuthStatus = {
  authenticated?: boolean;
  connected?: boolean;
  competing?: boolean;
  serverInfo?: {
    serverName?: string;
    serverVersion?: string;
  };
  iserver?: {
    authStatus?: {
      authenticated?: boolean;
    };
  };
};

export async function GET() {
  try {
    // Check Bridge health
    const health = await ibkrRequest<BridgeHealth>("/health");
    const bridgeOk = !!health?.ok;

    // Check Gateway authentication status
    let gatewayOk = false;
    let gatewayAuthenticated = false;
    let gatewayStatus: GatewayAuthStatus | null = null;

    if (bridgeOk) {
      try {
        gatewayStatus = await ibkrRequest<GatewayAuthStatus>("/gateway/auth-status");
        gatewayOk = gatewayStatus !== null;
        gatewayAuthenticated =
          gatewayStatus?.authenticated === true ||
          gatewayStatus?.iserver?.authStatus?.authenticated === true ||
          false;
      } catch (err) {
        // Gateway check failed, but bridge is ok
        gatewayOk = false;
      }
    }

    return NextResponse.json({
      ok: bridgeOk && gatewayAuthenticated,
      bridge: {
        ok: bridgeOk,
        error: bridgeOk ? null : "Bridge /health did not return ok: true",
        raw: health,
      },
      gateway: {
        ok: gatewayOk,
        authenticated: gatewayAuthenticated,
        status: gatewayStatus,
        error: gatewayOk ? null : "Could not check Gateway auth status",
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
      gateway: {
        ok: false,
        authenticated: false,
        error: "Gateway check failed",
      },
    });
  }
}
