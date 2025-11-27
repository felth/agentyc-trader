import { NextResponse } from 'next/server';
import { getIbkrHealth } from '@/lib/data/ibkrBridge';

export async function GET() {
  try {
    const data = await getIbkrHealth();
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

