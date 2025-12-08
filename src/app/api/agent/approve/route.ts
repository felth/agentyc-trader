// src/app/api/agent/approve/route.ts
// Trade Approval Endpoint - Executes trade based on mode (LEARN/PAPER/LIVE)

/**
 * Phase 2: Trade approval endpoint with mode-based execution
 * TODO Phase 4: Implement paper trading execution
 * TODO Phase 5: Implement live trading execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { isTradingEnabled } from '@/lib/safety/killSwitch';
import { isPaperMode } from '@/lib/validation/paperTrading';
import { logDecision } from '@/lib/safety/auditLogger';
import { preOrderSafetyCheck } from '@/lib/safety/safetyChecks';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface ApproveTradeRequest {
  proposalId?: string; // Reference to proposal from /propose-trade
  proposal: {
    symbol: string;
    direction: 'BUY' | 'SELL';
    entry: number;
    stop: number;
    target: number;
    size: number;
  };
  userReason?: string;
}

export interface ApproveTradeResponse {
  ok: boolean;
  executed: boolean;
  mode: 'off' | 'learn' | 'paper' | 'live_assisted';
  result?: {
    filled: boolean;
    fillPrice?: number;
    fillQuantity?: number;
    simulated?: boolean;
  };
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ApproveTradeRequest;
    
    // Get current mode
    const { data: config } = await supabase
      .from('agent_config')
      .select('mode, agent_trading_enabled')
      .single();
    
    const mode = (config?.mode || 'off') as 'off' | 'learn' | 'paper' | 'live_assisted';
    const tradingEnabled = config?.agent_trading_enabled ?? false;
    
    // Mode-based execution rules
    if (mode === 'off') {
      return NextResponse.json({
        ok: false,
        executed: false,
        mode,
        error: 'Agent is OFF - no proposals or executions allowed',
      } as ApproveTradeResponse, { status: 403 });
    }
    
    // Safety check: Kill switch (applies to PAPER and LIVE_ASSISTED)
    const killSwitchEnabled = await isTradingEnabled();
    if (!killSwitchEnabled && (mode === 'paper' || mode === 'live_assisted')) {
      return NextResponse.json({
        ok: false,
        executed: false,
        mode,
        error: 'Kill switch is ON - trading disabled',
      } as ApproveTradeResponse, { status: 403 });
    }
    
    // Build trade proposal for safety checks
    const proposal = {
      symbol: body.proposal.symbol,
      side: body.proposal.direction,
      quantity: body.proposal.size,
      orderType: 'LIMIT' as const,
      limitPrice: body.proposal.entry,
      stopPrice: body.proposal.stop,
      entryPrice: body.proposal.entry,
    };
    
    // Run safety checks (for PAPER and LIVE_ASSISTED)
    const safetyResult = await preOrderSafetyCheck(proposal);
    if (!safetyResult.canTrade && (mode === 'paper' || mode === 'live_assisted')) {
      return NextResponse.json({
        ok: false,
        executed: false,
        mode,
        error: `Safety checks failed: ${safetyResult.errors.map(e => e.reason).join(', ')}`,
      } as ApproveTradeResponse, { status: 403 });
    }
    
    // Mode-based execution
    let result: ApproveTradeResponse['result'] = undefined;
    
    if (mode === 'learn') {
      // LEARN mode: No execution, just logging
      result = {
        filled: false,
        simulated: false,
      };
    } else if (mode === 'paper') {
      // PAPER mode: Simulated execution
      // TODO Phase 4: Implement paper trading execution
      // For now, simulate a fill
      result = {
        filled: true,
        fillPrice: body.proposal.entry,
        fillQuantity: body.proposal.size,
        simulated: true,
      };
    } else if (mode === 'live_assisted') {
      // LIVE_ASSISTED mode: Real execution via IBKR
      // TODO Phase 5: Implement live trading execution
      // Must call IBKR bridge to place order
      // For now, reject
      return NextResponse.json({
        ok: false,
        executed: false,
        mode,
        error: 'Live assisted trading execution not yet implemented - Phase 5',
      } as ApproveTradeResponse, { status: 501 });
    }
    
    // Log decision
    await logDecision({
      contextSnapshot: {} as any, // TODO: Get from proposal
      proposedOrder: proposal,
      brainsOutput: {} as any, // TODO: Get from proposal
      coordinatorOutput: {} as any, // TODO: Get from proposal
      userAction: 'approved',
      userNotes: body.userReason,
      confidence: 0, // TODO: Get from proposal
      outcome: result?.filled ? {
        filled: true,
        fillPrice: result.fillPrice,
        fillQuantity: result.fillQuantity,
      } : undefined,
    }).catch(() => {}); // Ignore errors in Phase 2
    
    return NextResponse.json({
      ok: true,
      executed: result?.filled ?? false,
      mode,
      result,
    } as ApproveTradeResponse);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, executed: false, mode: 'off', error: err?.message ?? 'Unknown error' } as ApproveTradeResponse,
      { status: 500 }
    );
  }
}

