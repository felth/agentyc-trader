// src/lib/safety/safetyChecks.ts
// Pre-order Safety Checks - Validates proposals before execution

/**
 * Phase 3: Full safety checks implementation
 */

import type { WorldState } from '../brains/types';
import { isTradingEnabled } from './killSwitch';
import { checkDataFreshness } from './dataIntegrity';
import type { AgentContext } from '@/lib/memory/agentMemory';

export interface TradeProposal {
  id: string;
  mode: 'off' | 'learn' | 'paper' | 'live_assisted';
  ticker: string;
  timeframe: string;
  side: 'LONG' | 'SHORT';
  entry: {
    type: 'LIMIT' | 'MARKET';
    price: number | null;
    zone?: { min: number; max: number };
  };
  stop_loss: {
    price: number;
    reason: string;
  };
  targets: Array<{ price: number; weight: number; label?: string }>;
  size: {
    units: number;
    notional_usd: number;
    risk_perc_equity: number;
  };
  risk: {
    allowed: boolean;
    reasons: string[];
    risk_reward_ratio: number;
    est_max_loss_usd: number;
    est_max_gain_usd: number;
    category: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  psychology: {
    allowed: boolean;
    reasons: string[];
    behaviour_flags: string[];
    size_multiplier: number;
  };
  brains: {
    market: any;
    risk: any;
    psychology: any;
  };
  meta: {
    confidence: number;
    created_at: string;
    source: string;
  };
}

export interface SafetyResult {
  allowed: boolean;
  reasons: string[];
  flags: Array<'DATA_STALE' | 'RISK_LIMIT' | 'SYMBOL_NOT_ALLOWED' | 'OVERNIGHT_BLOCKED' | 'KILL_SWITCH' | 'DAILY_LIMIT'>;
}

/**
 * Checks a proposal for safety before returning to user
 */
export async function checkProposal(
  proposal: TradeProposal,
  worldState: WorldState,
  agentContext: AgentContext
): Promise<SafetyResult> {
  const reasons: string[] = [];
  const flags: SafetyResult['flags'] = [];

  // 1. Check kill switch
  const killSwitchActive = !(await isTradingEnabled());
  if (killSwitchActive && (proposal.mode === 'paper' || proposal.mode === 'live_assisted')) {
    reasons.push('Kill switch is active');
    flags.push('KILL_SWITCH');
  }

  // 2. Check data freshness
  const dataFresh = checkDataFreshness(worldState);
  if (!dataFresh.fresh) {
    reasons.push(`Data is stale: ${dataFresh.reason}`);
    flags.push('DATA_STALE');
  }

  // 3. Check risk limits
  if (!proposal.risk.allowed) {
    reasons.push(...proposal.risk.reasons);
    flags.push('RISK_LIMIT');
  }

  // 4. Check symbol whitelist
  if (agentContext.config.allowed_symbols.length > 0) {
    if (!agentContext.config.allowed_symbols.includes(proposal.ticker)) {
      reasons.push(`Symbol ${proposal.ticker} is not in allowed list`);
      flags.push('SYMBOL_NOT_ALLOWED');
    }
  }

  // 5. Check overnight constraint
  if (!agentContext.config.allow_overnight) {
    const now = new Date();
    const marketClose = new Date(now);
    marketClose.setHours(16, 0, 0, 0); // 4 PM EST
    
    if (now.getHours() >= 15) { // After 3 PM
      reasons.push('Overnight positions not allowed - too close to market close');
      flags.push('OVERNIGHT_BLOCKED');
    }
  }

  // 6. Check daily loss limit
  const dailyPnL = worldState.account.dailyPnL || 0;
  const remainingLoss = agentContext.config.daily_loss_limit + dailyPnL;
  if (remainingLoss < proposal.risk.est_max_loss_usd) {
    reasons.push(`Daily loss limit would be exceeded. Remaining: ${remainingLoss.toFixed(0)} USD`);
    flags.push('DAILY_LIMIT');
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    flags,
  };
}

/**
 * Performs all safety checks before allowing an order (legacy function for backward compatibility)
 */
export async function preOrderSafetyCheck(
  proposal: any,
  worldState?: WorldState
): Promise<{ canTrade: boolean; errors: Array<{ check: string; reason: string }> }> {
  // Legacy compatibility - convert to new format if needed
  const killSwitchActive = !(await isTradingEnabled());
  
  const errors: Array<{ check: string; reason: string }> = [];
  
  if (killSwitchActive) {
    errors.push({ check: 'kill_switch', reason: 'Kill switch is active' });
  }

  if (worldState) {
    const dataFresh = checkDataFreshness(worldState);
    if (!dataFresh.fresh) {
      errors.push({ check: 'data_freshness', reason: dataFresh.reason });
    }
  }

  return {
    canTrade: errors.length === 0,
    errors,
  };
}
