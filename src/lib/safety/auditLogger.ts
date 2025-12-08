// src/lib/safety/auditLogger.ts
// Audit Logger - Logs all agent decisions and actions

/**
 * Phase 3: Full audit logger implementation
 */

import { createClient } from '@supabase/supabase-js';
import type { TradeProposal } from './safetyChecks';
import type { BrainConsensus } from '../brains/types';
import type { AgentMode } from '@/lib/agent/agentMode';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Logs a trade proposal
 */
export async function logProposal(
  proposal: TradeProposal,
  brains: BrainConsensus,
  safetyResult: { allowed: boolean; reasons: string[]; flags: string[] }
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('agent_decisions')
      .insert({
        symbol: proposal.ticker,
        action: 'propose',
        direction: proposal.side === 'LONG' ? 'BUY' : 'SELL',
        brains: {
          market: brains.market,
          risk: brains.risk,
          psychology: brains.psychology,
        },
        confidence: proposal.meta.confidence,
        safety: {
          allowed: safetyResult.allowed,
          reasons: safetyResult.reasons,
          flags: safetyResult.flags,
        },
        user_action: 'pending',
        proposal: proposal,
        mode: proposal.mode,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data.id;
  } catch (err) {
    console.error('[auditLogger] Error logging proposal:', err);
    throw err;
  }
}

/**
 * Logs an approved trade
 */
export async function logApprovedTrade(
  proposalId: string,
  proposal: TradeProposal,
  result: {
    executed: boolean;
    filled?: boolean;
    fillPrice?: number;
    fillQuantity?: number;
    simulated?: boolean;
    error?: string;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('agent_decisions')
      .update({
        action: result.simulated ? 'execute' : 'execute',
        user_action: 'approved',
        result: {
          executed: result.executed,
          filled: result.filled,
          fillPrice: result.fillPrice,
          fillQuantity: result.fillQuantity,
          simulated: result.simulated,
          error: result.error,
          outcome: result.filled ? 'OPEN' : 'CANCELLED',
        },
      })
      .eq('id', proposalId);

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('[auditLogger] Error logging approved trade:', err);
    throw err;
  }
}

/**
 * Logs a rejected trade
 */
export async function logRejectedTrade(
  proposalId: string,
  reason: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('agent_decisions')
      .update({
        user_action: 'rejected',
        user_reason: reason,
        result: {
          executed: false,
          outcome: 'CANCELLED',
        },
      })
      .eq('id', proposalId);

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('[auditLogger] Error logging rejected trade:', err);
    throw err;
  }
}

/**
 * Logs a decision (generic)
 */
export async function logDecision(
  decision: {
    symbol?: string;
    action: 'propose' | 'approve' | 'reject' | 'execute';
    direction?: 'BUY' | 'SELL';
    brains?: any;
    confidence?: number;
    safety?: any;
    user_action?: 'approved' | 'rejected' | 'modified' | 'pending';
    user_reason?: string;
    proposal?: any;
    result?: any;
    mode: AgentMode;
  }
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('agent_decisions')
      .insert({
        symbol: decision.symbol,
        action: decision.action,
        direction: decision.direction,
        brains: decision.brains,
        confidence: decision.confidence,
        safety: decision.safety,
        user_action: decision.user_action || 'pending',
        user_reason: decision.user_reason,
        proposal: decision.proposal,
        result: decision.result,
        mode: decision.mode,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data.id;
  } catch (err) {
    console.error('[auditLogger] Error logging decision:', err);
    throw err;
  }
}

/**
 * Logs an error
 */
export async function logError(
  context: string,
  error: Error | string,
  metadata?: any
): Promise<void> {
  try {
    await supabase
      .from('system_telemetry')
      .insert({
        metric_type: 'error',
        metric_value: {
          context,
          error: typeof error === 'string' ? error : error.message,
          stack: typeof error === 'object' && 'stack' in error ? error.stack : undefined,
          metadata,
          timestamp: new Date().toISOString(),
        },
      });
  } catch (err) {
    console.error('[auditLogger] Error logging error:', err);
  }
}
