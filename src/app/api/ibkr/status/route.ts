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
    // IBeam status: running=true means container is up
    // authenticated/connected=true means Gateway is authenticated (from IBeam logs)
    const ibeamStatus = ibeam.ok && 'status' in ibeam && ibeam.status
      ? {
          ok: true,
          status: {
            authenticated: ibeam.status.authenticated ?? true, // Default true if running
            connected: ibeam.status.connected ?? true,
            running: ibeam.status.running ?? true,
            session: ibeam.status.session ?? true,
            competing: ibeam.status.competing,
            server_name: ibeam.status.server_name,
            server_version: ibeam.status.server_version,
          },
        }
      : {
          ok: false,
          error: 'error' in ibeam ? ibeam.error : 'IBeam status unavailable',
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

