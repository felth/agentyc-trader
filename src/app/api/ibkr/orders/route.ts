import { NextResponse } from 'next/server';
import { getIbkrOrders } from '@/lib/data/ibkrBridge';

export async function GET() {
  try {
    const orders = await getIbkrOrders();
    return NextResponse.json({ ok: true, orders });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

