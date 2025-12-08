// src/app/api/agent/approve/route.ts
// Trade Approval Endpoint - Executes trade based on mode

/**
 * Phase 3: Full approval endpoint with mode-based execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { isTradingEnabled } from '@/lib/safety/killSwitch';
import { executePaperTrade } from '@/lib/validation/paperTrading';
import { logApprovedTrade, logRejectedTrade } from '@/lib/safety/auditLogger';
import { checkProposal } from '@/lib/safety/safetyChecks';
import { placeIbkrOrder } from '@/lib/data/ibkrBridge';
import { canApproveInMode, canExecuteInMode, getExecutionType } from '@/lib/agent/agentMode';
import { createClient } from '@supabase/supabase-js';
import { buildWorldState } from '@/lib/brains/worldState';
import { getAgentContext } from '@/lib/memory/agentMemory';
import type { TradeProposal } from '@/lib/safety/safetyChecks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ApproveTradeRequest {
  proposalId: string;
  proposal?: TradeProposal; // Optional override
  userComment?: string;
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
    orderId?: string;
  };
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ApproveTradeRequest;
    
    if (!body.proposalId) {
      return NextResponse.json({
        ok: false,
        executed: false,
        mode: 'off',
        error: 'proposalId is required',
      } as ApproveTradeResponse, { status: 400 });
    }

    // Get current mode
    const { data: config } = await supabase
      .from('agent_config')
      .select('mode, agent_trading_enabled')
      .single();
    
    const mode = (config?.mode || 'off') as 'off' | 'learn' | 'paper' | 'live_assisted';
    
    // Check if mode allows approval
    if (!canApproveInMode(mode)) {
      return NextResponse.json({
        ok: false,
        executed: false,
        mode,
        error: `Agent is in ${mode.toUpperCase()} mode - approvals not allowed`,
      } as ApproveTradeResponse, { status: 403 });
    }

    // Load proposal from database
    const { data: decision } = await supabase
      .from('agent_decisions')
      .select('*')
      .eq('id', body.proposalId)
      .single();

    if (!decision || !decision.proposal) {
      return NextResponse.json({
        ok: false,
        executed: false,
        mode,
        error: 'Proposal not found',
      } as ApproveTradeResponse, { status: 404 });
    }

    const proposal = (body.proposal || decision.proposal) as TradeProposal;

    // Re-run safety checks
    const agentContext = await getAgentContext({
      ticker: proposal.ticker,
      timeframe: proposal.timeframe,
      mode,
    });

    const worldState = await buildWorldState({
      ticker: proposal.ticker,
      timeframe: proposal.timeframe as any,
      agentContext,
    });

    const safetyResult = await checkProposal(proposal, worldState, agentContext);
    if (!safetyResult.allowed && (mode === 'paper' || mode === 'live_assisted')) {
      return NextResponse.json({
        ok: false,
        executed: false,
        mode,
        error: `Safety checks failed: ${safetyResult.reasons.join(', ')}`,
      } as ApproveTradeResponse, { status: 403 });
    }

    // Check kill switch for PAPER and LIVE_ASSISTED
    const killSwitchEnabled = await isTradingEnabled();
    if (!killSwitchEnabled && (mode === 'paper' || mode === 'live_assisted')) {
      return NextResponse.json({
        ok: false,
        executed: false,
        mode,
        error: 'Kill switch is ON - trading disabled',
      } as ApproveTradeResponse, { status: 403 });
    }

    // Mode-based execution
    let result: ApproveTradeResponse['result'] = undefined;
    
    if (mode === 'learn') {
      // LEARN mode: No execution
      result = {
        filled: false,
        simulated: false,
      };
    } else if (mode === 'paper') {
      // PAPER mode: Simulated execution
      const paperResult = await executePaperTrade(proposal);
      result = {
        filled: paperResult.filled,
        fillPrice: paperResult.fillPrice,
        fillQuantity: paperResult.fillQuantity,
        simulated: true,
      };
    } else if (mode === 'live_assisted') {
      // LIVE_ASSISTED mode: Real IBKR execution
      try {
        const orderResult = await placeIbkrOrder({
          symbol: proposal.ticker,
          side: proposal.side === 'LONG' ? 'BUY' : 'SELL',
          type: proposal.entry.type === 'MARKET' ? 'MKT' : 'LMT',
          qty: proposal.size.units,
          limit_price: proposal.entry.type === 'LIMIT' ? proposal.entry.price : null,
          time_in_force: 'DAY',
        });

        result = {
          filled: orderResult.status === 'Filled' || orderResult.status === 'Submitted',
          fillPrice: proposal.entry.price || undefined,
          fillQuantity: proposal.size.units,
          simulated: false,
          orderId: orderResult.order_id,
        };
      } catch (err: any) {
        await logApprovedTrade(body.proposalId, proposal, {
          executed: false,
          error: err?.message || 'Order placement failed',
        });
        return NextResponse.json({
          ok: false,
          executed: false,
          mode,
          error: `Order placement failed: ${err?.message}`,
        } as ApproveTradeResponse, { status: 500 });
      }
    }

    // Log approval
    await logApprovedTrade(body.proposalId, proposal, {
      executed: result?.filled ?? false,
      filled: result?.filled,
      fillPrice: result?.fillPrice,
      fillQuantity: result?.fillQuantity,
      simulated: result?.simulated,
    });

    return NextResponse.json({
      ok: true,
      executed: result?.filled ?? false,
      mode,
      result,
    } as ApproveTradeResponse);
  } catch (err: any) {
    console.error('[approve] Error:', err);
    return NextResponse.json(
      { ok: false, executed: false, mode: 'off', error: err?.message ?? 'Unknown error' } as ApproveTradeResponse,
      { status: 500 }
    );
  }
}
