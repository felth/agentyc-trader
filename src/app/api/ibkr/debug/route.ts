import { NextResponse } from 'next/server';
import { getIbeamStatus } from '@/lib/data/ibkrBridge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Debug endpoint to check raw responses from IBeam and Gateway
 * This is for server-side debugging only and should never be used in the UI
 */
export async function GET() {
  try {
    const gatewayUrl = process.env.NEXT_PUBLIC_IBKR_GATEWAY_URL || process.env.IBKR_GATEWAY_URL || 'https://ibkr.agentyctrader.com';
    
    // Try IBeam status
    let ibeamRaw: any = null;
    try {
      const ibeamRes = await fetch(`${gatewayUrl}/ibeam/status`, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      });
      ibeamRaw = {
        status: ibeamRes.status,
        statusText: ibeamRes.statusText,
        ok: ibeamRes.ok,
        body: await ibeamRes.text().catch(() => ''),
      };
    } catch (err: any) {
      ibeamRaw = { error: err?.message };
    }

    // Try Gateway auth status (should fail without session cookie)
    let gatewayRaw: any = null;
    try {
      const gatewayRes = await fetch(`${gatewayUrl}/v1/api/iserver/auth/status`, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      });
      gatewayRaw = {
        status: gatewayRes.status,
        statusText: gatewayRes.statusText,
        ok: gatewayRes.ok,
        body: await gatewayRes.text().catch(() => ''),
      };
    } catch (err: any) {
      gatewayRaw = { error: err?.message };
    }

    // Also get parsed IBeam status
    const ibeamParsed = await getIbeamStatus();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      gatewayUrl,
      ibeam: {
        raw: ibeamRaw,
        parsed: ibeamParsed,
      },
      gateway: {
        raw: gatewayRaw,
        note: 'This should return 404 Access Denied without session cookie',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

