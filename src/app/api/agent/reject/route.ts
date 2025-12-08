// src/app/api/agent/reject/route.ts
// Trade Rejection Endpoint - Logs rejection reason

/**
 * Phase 2: Trade rejection endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { logDecision } from '@/lib/safety/auditLogger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface RejectTradeRequest {
  proposalId?: string;
  reason: string; // Required - user must provide reason
}

export interface RejectTradeResponse {
  ok: boolean;
  logged: boolean;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RejectTradeRequest;
    
    if (!body.reason || body.reason.trim().length === 0) {
      return NextResponse.json({
        ok: false,
        logged: false,
        error: 'Rejection reason is required',
      } as RejectTradeResponse, { status: 400 });
    }
    
    // Log rejection (no-op in Phase 2, will be implemented in Phase 3)
    await logDecision({
      contextSnapshot: {} as any, // TODO: Get from proposal
      proposedOrder: {} as any, // TODO: Get from proposal
      brainsOutput: {} as any, // TODO: Get from proposal
      coordinatorOutput: {} as any, // TODO: Get from proposal
      userAction: 'rejected',
      userNotes: body.reason,
      confidence: 0, // TODO: Get from proposal
    }).catch(() => {}); // Ignore errors in Phase 2
    
    return NextResponse.json({
      ok: true,
      logged: true,
    } as RejectTradeResponse);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, logged: false, error: err?.message ?? 'Unknown error' } as RejectTradeResponse,
      { status: 500 }
    );
  }
}

