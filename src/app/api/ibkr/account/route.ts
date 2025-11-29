import { NextResponse } from 'next/server';
import { getIbkrOverview } from '@/lib/data/ibkrBridge';

export async function GET() {
  try {
    const account = await getIbkrOverview();
    return NextResponse.json({ ok: true, account });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

