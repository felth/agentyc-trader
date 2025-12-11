import { NextResponse } from 'next/server';
import { ibkrRequest } from '@/lib/ibkr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ ok: false, error: 'Missing symbol' }, { status: 400 });
  }

  const data = await ibkrRequest(`/marketdata/snapshot?symbol=${symbol}`);
  return NextResponse.json(data);
}

