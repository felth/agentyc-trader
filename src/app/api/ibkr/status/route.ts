import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Check IBKR Gateway status by calling the gateway directly
 * Gateway is at https://127.0.0.1:5000 behind IBeam
 */
async function checkGatewayStatus(): Promise<{ ok: boolean; error: string | null }> {
  try {
    // Try to reach the gateway auth status endpoint
    // Gateway uses self-signed certificate - Node.js fetch will reject by default
    // We use process.env.NODE_TLS_REJECT_UNAUTHORIZED or handle the error gracefully
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    // Use https module with rejectUnauthorized: false for self-signed cert
    const https = await import('https');
    const agent = new https.Agent({
      rejectUnauthorized: false, // Allow self-signed certificates
    });
    
    const response = await fetch('https://127.0.0.1:5000/v1/api/iserver/auth/status', {
      method: 'GET',
      signal: controller.signal,
      // @ts-ignore - agent option may not be in types but works in Node.js
      agent,
      headers: {
        'Accept': 'application/json',
      },
    }).finally(() => clearTimeout(timeoutId));

    // If we get any response (even 401/403), gateway is reachable
    if (response.ok || response.status === 401 || response.status === 403) {
      return { ok: true, error: null };
    }
    
    return { 
      ok: false, 
      error: `Gateway returned ${response.status} ${response.statusText}` 
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown error';
    
    // SSL certificate errors mean gateway is reachable (just self-signed cert)
    if (errorMsg.includes('certificate') || errorMsg.includes('SSL') || errorMsg.includes('TLS')) {
      return { ok: true, error: null };
    }
    
    if (errorMsg.includes('aborted') || errorMsg.includes('timeout')) {
      return { ok: false, error: 'Gateway connection timeout' };
    }
    if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('refused')) {
      return { ok: false, error: 'Gateway connection refused - not running' };
    }
    return { ok: false, error: `Gateway check failed: ${errorMsg}` };
  }
}

/**
 * Check IBKR Bridge status (optional - doesn't block overall status)
 */
async function checkBridgeStatus(): Promise<{ ok: boolean; error: string | null }> {
  // Check if bridge is configured
  if (!process.env.IBKR_BRIDGE_KEY) {
    return { 
      ok: false, 
      error: 'IBKR_BRIDGE_KEY not configured yet (informational only)' 
    };
  }

  if (!process.env.IBKR_BRIDGE_URL) {
    return { 
      ok: false, 
      error: 'IBKR_BRIDGE_URL not configured yet (informational only)' 
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`${process.env.IBKR_BRIDGE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Bridge-Key': process.env.IBKR_BRIDGE_KEY,
      },
      cache: 'no-store',
    }).finally(() => clearTimeout(timeoutId));

    if (response.ok) {
      return { ok: true, error: null };
    }
    
    return { 
      ok: false, 
      error: `Bridge returned ${response.status}` 
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown error';
    if (errorMsg.includes('aborted') || errorMsg.includes('timeout')) {
      return { ok: false, error: 'Bridge connection timeout' };
    }
    return { ok: false, error: `Bridge check failed: ${errorMsg}` };
  }
}

/**
 * Check IBeam status (non-blocking - timeout doesn't fail overall status)
 */
async function checkIbeamStatus(): Promise<{ ok: boolean; error: string | null }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout, non-blocking
    
    const response = await fetch('http://127.0.0.1:5001/', {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    }).finally(() => clearTimeout(timeoutId));

    // Any HTTP response (even 404) means IBeam health server is running
    return { ok: true, error: null };
  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown error';
    // IBeam health server timeout is non-critical - just report it
    return { 
      ok: false, 
      error: `IBeam health server not responding: ${errorMsg}` 
    };
  }
}

export async function GET() {
  // Check all components in parallel (non-blocking)
  const [gateway, bridge, ibeam] = await Promise.all([
    checkGatewayStatus(),
    checkBridgeStatus(),
    checkIbeamStatus(),
  ]);

  // Overall status depends ONLY on gateway being reachable
  const ok = !!gateway.ok;

  return NextResponse.json({
    ok,
    bridge,
    gateway,
    ibeam,
  });
}

