// src/app/api/agent/propose-trade/route.ts
// Trade Proposal Endpoint - Returns trade proposal with brain breakdown

/**
 * Phase 2: Trade proposal endpoint
 * TODO Phase 3: Integrate with actual brain implementations
 * TODO Phase 4: Add memory context integration
 * TODO Phase 5: Add confidence calibration
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildWorldState } from '@/lib/brains/worldState';
import { coordinate } from '@/lib/brains/coordinator';
import { preOrderSafetyCheck } from '@/lib/safety/safetyChecks';
import { logDecision } from '@/lib/safety/auditLogger';
import type { TradeProposal } from '@/lib/safety/safetyChecks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface ProposeTradeRequest {
  symbol?: string;
  direction?: 'BUY' | 'SELL';
  entryPrice?: number;
  stopPrice?: number;
}

export interface ProposeTradeResponse {
  ok: boolean;
  proposal?: {
    symbol: string;
    direction: 'BUY' | 'SELL';
    entry: number;
    stop: number;
    target: number;
    size: number;
    riskReward: number;
    confidence: number;
  };
  brains?: {
    market: {
      state: 'green' | 'amber' | 'red';
      conviction: string;
      notes: string;
    };
    risk: {
      state: 'green' | 'amber' | 'red';
      conviction: string;
      notes: string;
    };
    psychology: {
      state: 'green' | 'amber' | 'red';
      conviction: string;
      notes: string;
    };
  };
  safety?: {
    checks: Array<{
      check: string;
      passed: boolean;
      reason: string;
    }>;
    canTrade: boolean;
  };
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProposeTradeRequest;
    
    // TODO Phase 3: Build actual world state
    // For now, return placeholder response
    const worldState = await buildWorldState().catch(() => null);
    
    if (!worldState) {
      return NextResponse.json({
        ok: false,
        error: 'World state not yet implemented - Phase 3',
      } as ProposeTradeResponse, { status: 501 });
    }
    
    // TODO Phase 3: Run coordinator with actual brain implementations
    const coordinatorOutput = await coordinate(
      worldState,
      body.symbol,
      body.entryPrice,
      body.stopPrice
    ).catch(() => null);
    
    if (!coordinatorOutput) {
      return NextResponse.json({
        ok: false,
        error: 'Coordinator not yet implemented - Phase 3',
      } as ProposeTradeResponse, { status: 501 });
    }
    
    // Build trade proposal from coordinator output
    const proposal: TradeProposal = {
      symbol: body.symbol || 'UNKNOWN',
      side: body.direction || 'BUY',
      quantity: 0, // TODO: Calculate from risk brain
      orderType: 'LIMIT',
      entryPrice: body.entryPrice,
      stopPrice: body.stopPrice,
    };
    
    // Run safety checks
    const safetyResult = await preOrderSafetyCheck(proposal, worldState);
    
    // Format response
    const response: ProposeTradeResponse = {
      ok: true,
      proposal: {
        symbol: proposal.symbol,
        direction: proposal.side,
        entry: proposal.entryPrice || 0,
        stop: proposal.stopPrice || 0,
        target: 0, // TODO: Calculate from market brain
        size: proposal.quantity,
        riskReward: 0, // TODO: Calculate
        confidence: coordinatorOutput.finalDecision.confidence,
      },
      brains: {
        market: {
          state: coordinatorOutput.brains.market.state,
          conviction: coordinatorOutput.brains.market.reasoning,
          notes: coordinatorOutput.brains.market.reasoning,
        },
        risk: {
          state: coordinatorOutput.brains.risk.state,
          conviction: coordinatorOutput.brains.risk.reasoning,
          notes: coordinatorOutput.brains.risk.reasoning,
        },
        psychology: {
          state: coordinatorOutput.brains.psychology.state,
          conviction: coordinatorOutput.brains.psychology.reasoning,
          notes: coordinatorOutput.brains.psychology.reasoning,
        },
      },
      safety: {
        checks: safetyResult.errors.map(e => ({
          check: e.check,
          passed: false,
          reason: e.reason,
        })),
        canTrade: safetyResult.canTrade,
      },
    };
    
    // Log proposal (no-op in Phase 2)
    await logDecision({
      contextSnapshot: worldState,
      proposedOrder: proposal,
      brainsOutput: coordinatorOutput.brains,
      coordinatorOutput,
      userAction: 'pending',
      confidence: coordinatorOutput.finalDecision.confidence,
    }).catch(() => {}); // Ignore errors in Phase 2
    
    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' } as ProposeTradeResponse,
      { status: 500 }
    );
  }
}

