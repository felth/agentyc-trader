import { NextResponse } from 'next/server';
import { ibkrRequest } from '@/lib/ibkr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const acct = await ibkrRequest('/portfolio/account');
  return NextResponse.json(acct);
}
