import { NextResponse } from 'next/server';
import { getIbkrHealth } from '@/lib/data/ibkrBridge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getGatewayAuthStatus() {
  // Get gateway base URL: server-side preferred, fallback to public
  const gatewayBase = process.env.IBKR_GATEWAY_URL || process.env.NEXT_PUBLIC_IBKR_GATEWAY_URL || 'https://ibkr.agentyctrader.com';
  
  const authStatusUrl = `${gatewayBase}/v1/api/iserver/auth/status`;
  
  try {
    const res = await fetch(authStatusUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (res.status === 200) {
      const data = await res.json();
      return {
        ok: true,
        status: res.status,
        data,
      };
    } else if (res.status === 401) {
      // 401 means Gateway is reachable but not authenticated
      return {
        ok: true,
        status: res.status,
        authenticated: false,
        connected: false,
      };
    } else {
      // Other status codes
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        status: res.status,
        error: `Gateway returned ${res.status} ${res.statusText}: ${text}`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message ?? 'Failed to fetch Gateway auth status',
      url: authStatusUrl,
    };
  }
}

export async function GET() {
  let bridgeHealth: any = { ok: false, error: 'Not checked' };
  let gatewayAuth: any = { ok: false, error: 'Not checked' };
  
  try {
    const results = await Promise.allSettled([
      getIbkrHealth().catch((err) => ({
        ok: false,
        error: err?.message ?? 'Health check failed',
      })),
      getGatewayAuthStatus(),
    ]);

    bridgeHealth = results[0].status === 'fulfilled' ? results[0].value : { ok: false, error: 'Promise rejected' };
    gatewayAuth = results[1].status === 'fulfilled' ? results[1].value : { ok: false, error: 'Promise rejected' };

    // Determine authenticated status from gateway response
    const authenticated = gatewayAuth.ok && 
      (gatewayAuth.data?.authenticated === true || 
       gatewayAuth.data?.iserver?.authStatus?.authenticated === true);

    // ALWAYS include gateway field - even if it fails
    const response = {
      ok: true,
      bridge: bridgeHealth,
      gateway: gatewayAuth,
      authenticated: authenticated || false,
      _debug: {
        gatewayBase: process.env.IBKR_GATEWAY_URL || process.env.NEXT_PUBLIC_IBKR_GATEWAY_URL || 'using default',
      },
    };

    return NextResponse.json(response);
  } catch (e: any) {
    console.error('[ibkr/status] Error:', e);
    return NextResponse.json(
      { 
        ok: false, 
        error: e?.message ?? 'Unknown error',
        bridge: bridgeHealth,
        gateway: gatewayAuth,
      },
      { status: 500 }
    );
  }
}
