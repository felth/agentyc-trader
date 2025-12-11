import { NextResponse } from 'next/server';
import * as https from 'https';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Create an agent that accepts self-signed certificates for local Gateway
const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Check IBKR Gateway status by calling the gateway health endpoint
 * Gateway is at https://127.0.0.1:5000 behind IBeam
 * Uses native https module to handle self-signed certificates (fetch doesn't support agent in Node.js 18+)
 * Health endpoint doesn't require authentication and correctly indicates Gateway is running
 */
async function checkGatewayStatus(): Promise<{ ok: boolean; error: string | null }> {
  return new Promise((resolve) => {
    const url = require('url');
    // Try multiple endpoints - gateway might have different health endpoints
    const endpoints = ['/health', '/gw/health', '/v1/api/iserver/auth/status'];
    let endpointIndex = 0;
    
    function tryNextEndpoint() {
      if (endpointIndex >= endpoints.length) {
        resolve({ ok: false, error: 'Gateway not reachable on any endpoint' });
        return;
      }
      
      const endpoint = endpoints[endpointIndex];
      endpointIndex++;
      const parsedUrl = url.parse(`https://127.0.0.1:5000${endpoint}`);
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 5000,
        path: parsedUrl.path,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        agent: insecureAgent,
        timeout: 3000, // 3 second timeout per endpoint
      };

      const req = https.request(options, (res: any) => {
        const statusCode = res.statusCode || 200;
        
        // Any HTTP response (200-499) means Gateway is running
        // 404/403/401 are acceptable - they mean the service is up
        if (statusCode >= 200 && statusCode < 500) {
          resolve({ ok: true, error: null });
        } else {
          // Try next endpoint
          tryNextEndpoint();
        }
        
        // Drain response data
        res.on('data', () => {});
        res.on('end', () => {});
      });

    req.on('error', (err: any) => {
      const errorMsg = err?.message || 'Unknown error';
      
      if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('refused')) {
        resolve({ ok: false, error: 'Gateway connection refused - not running' });
      } else if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
        resolve({ ok: false, error: 'Gateway connection timeout' });
      } else if (errorMsg.includes('certificate') || errorMsg.includes('SSL') || errorMsg.includes('TLS')) {
        // SSL errors with rejectUnauthorized: false shouldn't happen, but if they do, gateway is reachable
        resolve({ ok: true, error: null });
      } else {
        resolve({ ok: false, error: `Gateway check failed: ${errorMsg}` });
      }
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'Gateway connection timeout' });
    });

    req.end();
  });
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

export async function GET() {
  // Check gateway and bridge in parallel
  // IBeam is hidden - it's an infrastructure detail, not a user-facing service
  // Gateway status is what matters for trading functionality
  const [gateway, bridge] = await Promise.all([
    checkGatewayStatus(),
    checkBridgeStatus(),
  ]);

  // Overall status depends ONLY on gateway being reachable
  const ok = !!gateway.ok;

  return NextResponse.json({
    ok,
    bridge,
    gateway,
  });
}

