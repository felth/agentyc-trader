import { NextResponse } from 'next/server';
import { buildTradingContext } from '@/lib/agent/tradingContext';
import { generateTradePlan } from '@/lib/agent/generateTradePlan';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const ctx = await buildTradingContext();
    const plan = await generateTradePlan(ctx);

    return NextResponse.json({ ok: true, plan });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? 'trade-plan failed (rule-based generator threw an error)'
      },
      { status: 500 }
    );
  }
}
