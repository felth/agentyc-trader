import { NextRequest, NextResponse } from 'next/server';
import { getIbkrPrice } from '@/lib/data/ibkrBridge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbol = (body.symbol as string | undefined)?.toUpperCase();

    if (!symbol) {
      return NextResponse.json(
        { ok: false, error: 'Missing symbol' },
        { status: 400 }
      );
    }

    const data = await getIbkrPrice(symbol);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

