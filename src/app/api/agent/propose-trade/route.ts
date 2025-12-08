// src/app/api/agent/propose-trade/route.ts
// Trade Proposal Endpoint - Returns trade proposal with brain breakdown

/**
 * Phase 3: Full trade proposal endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildWorldState } from '@/lib/brains/worldState';
import { coordinate } from '@/lib/brains/coordinator';
import { checkProposal } from '@/lib/safety/safetyChecks';
import { logProposal } from '@/lib/safety/auditLogger';
import { getAgentContext } from '@/lib/memory/agentMemory';
import { canProposeInMode } from '@/lib/agent/agentMode';
import { createClient } from '@supabase/supabase-js';
import type { TradeProposal } from '@/lib/safety/safetyChecks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ProposeTradeRequest {
  ticker: string;
  timeframe?: string;
}

export interface ProposeTradeResponse {
  ok: boolean;
  proposal?: TradeProposal;
  safety?: {
    allowed: boolean;
    reasons: string[];
    flags: string[];
  };
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProposeTradeRequest;
    
    if (!body.ticker) {
      return NextResponse.json({
        ok: false,
        error: 'ticker is required',
      } as ProposeTradeResponse, { status: 400 });
    }

    // Get current mode
    const { data: config } = await supabase
      .from('agent_config')
      .select('mode')
      .single();

    const mode = (config?.mode || 'off') as 'off' | 'learn' | 'paper' | 'live_assisted';

    // Check if mode allows proposals
    if (!canProposeInMode(mode)) {
      return NextResponse.json({
        ok: false,
        error: `Agent is in ${mode.toUpperCase()} mode - proposals not allowed`,
      } as ProposeTradeResponse, { status: 403 });
    }

    // Get agent context
    const agentContext = await getAgentContext({
      ticker: body.ticker,
      timeframe: body.timeframe || 'H1',
      mode,
    });

    // Build world state
    const worldState = await buildWorldState({
      ticker: body.ticker,
      timeframe: (body.timeframe || 'H1') as any,
      agentContext,
    });

    // Run coordinator (runs all brains and generates proposal)
    const { proposal, coordinatorOutput } = await coordinate(worldState, agentContext);

    // Run safety checks
    const safetyResult = await checkProposal(proposal, worldState, agentContext);

    // Log proposal
    const proposalId = await logProposal(proposal, coordinatorOutput.brains, safetyResult);

    // Return response
    return NextResponse.json({
      ok: true,
      proposal: {
        ...proposal,
        id: proposalId,
      },
      safety: safetyResult,
    } as ProposeTradeResponse);
  } catch (err: any) {
    console.error('[propose-trade] Error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' } as ProposeTradeResponse,
      { status: 500 }
    );
  }
}
