import { NextResponse } from 'next/server';
import { getIbkrHealth, getIbeamStatus } from '@/lib/data/ibkrBridge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const [health, ibeam] = await Promise.all([
      getIbkrHealth().catch((err) => ({
        ok: false,
        error: err?.message ?? 'Health check failed',
      })),
      getIbeamStatus().catch((err) => ({
        ok: false,
        error: err?.message ?? 'IBeam status failed',
      })),
    ]);

    // Map IBeam status to UI-friendly format
    const ibeamStatus = ibeam.ok && ibeam.status
      ? {
          ok: true,
          status: {
            authenticated: ibeam.status.authenticated,
            connected: ibeam.status.connected,
            running: ibeam.status.running,
            session: ibeam.status.session,
            competing: ibeam.status.competing,
            server_name: ibeam.status.server_name,
            server_version: ibeam.status.server_version,
          },
        }
      : {
          ok: false,
          error: ibeam.error ?? 'IBeam status unavailable',
        };

    return NextResponse.json({
      ok: true,
      bridge: health,
      gateway: ibeamStatus, // Keep "gateway" key for backward compatibility
      ibeam: ibeamStatus,   // Also expose as "ibeam" for clarity
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

