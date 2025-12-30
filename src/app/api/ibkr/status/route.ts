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

    // Force no-cache to prevent server/CDN caching
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (e: any) {
    console.error('[ibkr/status] Error:', e);
    // Always return 200 so UI can handle errors gracefully
    // Don't return 500 - treat errors as "not authenticated" state
    return NextResponse.json(
      { 
        ok: true,  // Changed from false - UI expects ok:true to show banner
        authenticated: false,
        bridge: bridgeHealth,
        gateway: gatewayAuth.ok ? gatewayAuth : { ok: false, error: e?.message ?? 'Unknown error' },
      },
      { 
        status: 200,  // Always return 200, not 500
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}
