import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    return NextResponse.json({
      ok: true,
      preview: {
        estimatedCost: 1740,
        requiredMargin: 870,
        fees: 1.25,
        canExecute: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

