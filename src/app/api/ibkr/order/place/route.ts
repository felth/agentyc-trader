import { NextRequest, NextResponse } from 'next/server';
import { placeIbkrOrder, PlaceOrderRequest } from '@/lib/data/ibkrBridge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as PlaceOrderRequest;
    
    if (!body.symbol || !body.side || !body.type || !body.qty) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const data = await placeIbkrOrder(body);
    return NextResponse.json({ ok: true, orderId: data.order_id, status: data.status });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

