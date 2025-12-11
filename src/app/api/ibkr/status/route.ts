import { NextResponse } from 'next/server';
import { ibkrRequest } from '@/lib/ibkr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  // Single source of truth: IBKR Bridge
  const authCheck = await ibkrRequest('/gateway/auth-status');

  // Bridge unreachable
  if (!authCheck.ok) {
    return NextResponse.json({
      ok: false,
      gateway: { ok: false, error: authCheck.error },
      bridge: { ok: false, error: authCheck.error },
    });
  }

  const authenticated = authCheck.data?.authenticated ?? false;

  return NextResponse.json({
    ok: authenticated,
    gateway: { 
      ok: authenticated, 
      authenticated: authenticated,
      error: authenticated ? null : 'Not authenticated' 
    },
    bridge: { ok: true, error: null },
  });
}
