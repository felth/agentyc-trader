import { NextResponse } from 'next/server';
import { ibkrRequest } from '@/lib/ibkr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json();

  const order = await ibkrRequest('/iserver/account/orders', {
    method: 'POST',
    body,
  });

  return NextResponse.json(order);
}

