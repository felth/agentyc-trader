import { NextResponse } from 'next/server';
import { getIbkrHealth, getIbkrGatewayAuthStatus } from '@/lib/data/ibkrBridge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const [health, gateway] = await Promise.all([
      getIbkrHealth().catch((err) => ({
        ok: false,
        error: err?.message ?? 'Health check failed',
      })),
      getIbkrGatewayAuthStatus().catch((err) => ({
        ok: false,
        error: err?.message ?? 'Gateway auth status failed',
      })),
    ]);

    return NextResponse.json({
      ok: true,
      bridge: health,
      gateway,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

