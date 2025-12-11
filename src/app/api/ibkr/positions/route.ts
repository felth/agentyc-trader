import { NextResponse } from 'next/server';
import { ibkrRequest } from '@/lib/ibkr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const positions = await ibkrRequest('/portfolio/positions');
  return NextResponse.json(positions);
}
