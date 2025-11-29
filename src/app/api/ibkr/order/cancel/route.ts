import { NextRequest, NextResponse } from 'next/server';
import { cancelIbkrOrder } from '@/lib/data/ibkrBridge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = body.orderId as string | undefined;

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: 'Missing orderId' },
        { status: 400 }
      );
    }

    await cancelIbkrOrder(orderId);
    return NextResponse.json({ ok: true, cancelled: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

