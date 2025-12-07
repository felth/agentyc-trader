import { NextResponse } from 'next/server';
import { getIbkrPositions } from '@/lib/data/ibkrBridge';

export async function GET() {
  try {
    const result = await getIbkrPositions();
    // getIbkrPositions returns BridgePositions which has { ok, positions: [] }
    // Unwrap to return positions array directly
    if (result.ok && Array.isArray(result.positions)) {
      return NextResponse.json({ ok: true, positions: result.positions });
    }
    return NextResponse.json({ ok: true, positions: [] });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Unknown error', positions: [] },
      { status: 500 }
    );
  }
}

