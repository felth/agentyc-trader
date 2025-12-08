// src/app/api/agent/reject/route.ts
// Trade Rejection Endpoint

/**
 * Phase 3: Full rejection endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { logRejectedTrade } from '@/lib/safety/auditLogger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface RejectTradeRequest {
  proposalId: string;
  reason?: string;
}

export interface RejectTradeResponse {
  ok: boolean;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RejectTradeRequest;
    
    if (!body.proposalId) {
      return NextResponse.json({
        ok: false,
        error: 'proposalId is required',
      } as RejectTradeResponse, { status: 400 });
    }

    await logRejectedTrade(body.proposalId, body.reason || 'User rejected');

    return NextResponse.json({
      ok: true,
    } as RejectTradeResponse);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' } as RejectTradeResponse,
      { status: 500 }
    );
  }
}
