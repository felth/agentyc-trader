import { NextResponse } from 'next/server';
import { getIbkrAccount } from '@/lib/data/ibkrBridge';

export async function GET() {
  try {
    const account = await getIbkrAccount();
    return NextResponse.json({ ok: true, account });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

