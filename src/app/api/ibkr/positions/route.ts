import { NextResponse } from 'next/server';
import { getIbkrPositions } from '@/lib/data/ibkrBridge';

export async function GET() {
  try {
    const positions = await getIbkrPositions();
    return NextResponse.json({ ok: true, positions });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

