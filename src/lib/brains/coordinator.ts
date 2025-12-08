// src/lib/brains/coordinator.ts
// Coordinator - Orchestrates all brains and generates trade proposals

/**
 * Phase 3: Full coordinator implementation
 * Runs all brains, applies safety rules, generates trade proposals
 */

import type { WorldState, CoordinatorOutput, BrainConsensus, MarketBrainOutput, RiskBrainOutput, PsychologyBrainOutput } from './types';
import { analyzeMarket } from './marketBrain';
import { analyzeRisk } from './riskBrain';
import { analyzePsychology } from './psychologyBrain';
import type { AgentContext } from '@/lib/memory/agentMemory';
import type { TradeProposal } from '@/lib/safety/safetyChecks';

/**
 * Coordinates all brains and produces final trade proposal
 */
export async function coordinate(
  worldState: WorldState,
  agentContext: AgentContext
): Promise<{ proposal: TradeProposal; coordinatorOutput: CoordinatorOutput }> {
  const ticker = agentContext.ticker || 'UNKNOWN';
  const price = worldState.market.prices[ticker] || 0;

  // Run all brains in parallel
  const [marketOutput, riskOutput, psychologyOutput] = await Promise.all([
    analyzeMarket(worldState, agentContext),
    analyzeMarket(worldState, agentContext).then((m) => analyzeRisk(worldState, agentContext, m)),
    analyzePsychology(worldState, agentContext),
  ]);

  // Build brain consensus
  const brains: BrainConsensus = {
    market: marketOutput,
    risk: riskOutput,
    psychology: psychologyOutput,
    overallState: getWorstState([marketOutput.state, riskOutput.state, psychologyOutput.state]),
    agreement: calculateAgreement(marketOutput, riskOutput, psychologyOutput),
    timestamp: new Date(),
  };

  // Apply "All Green" rule
  const allGreenResult = applyAllGreenRule(brains);

  // Calculate aggregate confidence
  const confidence = (marketOutput.confidence + (riskOutput.data?.okToTrade ? riskOutput.confidence : 0) + psychologyOutput.confidence) / 3;

  // Build trade proposal
  const proposal = buildTradeProposal(
    worldState,
    agentContext,
    marketOutput,
    riskOutput,
    psychologyOutput,
    allGreenResult,
    confidence
  );

  // Generate explanation
  const explanation = generateExplanation(brains, allGreenResult, proposal);

  // Build required checks
  const requiredChecks = [
    {
      check: 'Market Brain',
      passed: marketOutput.state === 'green',
      reason: marketOutput.reasoning,
    },
    {
      check: 'Risk Brain',
      passed: riskOutput.state === 'green' && (riskOutput.data?.okToTrade === true),
      reason: riskOutput.reasoning,
    },
    {
      check: 'Psychology Brain',
      passed: psychologyOutput.state === 'green' && (psychologyOutput.data?.recommendedAction === 'proceed'),
      reason: psychologyOutput.reasoning,
    },
  ];

  const coordinatorOutput: CoordinatorOutput = {
    worldState,
    brains,
    finalDecision: {
      canTrade: allGreenResult.canTrade,
      reason: allGreenResult.reason,
      confidence,
      requiredChecks,
    },
    explanation,
    timestamp: new Date(),
  };

  return { proposal, coordinatorOutput };
}

/**
 * Runs all brains in parallel and collects outputs
 */
export async function runAllBrains(
  worldState: WorldState,
  agentContext: AgentContext
): Promise<BrainConsensus> {
  const [market, risk, psychology] = await Promise.all([
    analyzeMarket(worldState, agentContext),
    analyzeMarket(worldState, agentContext).then((m) => analyzeRisk(worldState, agentContext, m)),
    analyzePsychology(worldState, agentContext),
  ]);

  return {
    market,
    risk,
    psychology,
    overallState: getWorstState([market.state, risk.state, psychology.state]),
    agreement: calculateAgreement(market, risk, psychology),
    timestamp: new Date(),
  };
}

/**
 * Applies "Trade Only If ALL Green" rule
 */
export function applyAllGreenRule(brains: BrainConsensus): {
  canTrade: boolean;
  reason: string;
} {
  const states = [brains.market.state, brains.risk.state, brains.psychology.state];
  
  // If any brain is red, block trade
  if (states.includes('red')) {
    const redBrains = [];
    if (brains.market.state === 'red') redBrains.push('Market');
    if (brains.risk.state === 'red') redBrains.push('Risk');
    if (brains.psychology.state === 'red') redBrains.push('Psychology');
    
    return {
      canTrade: false,
      reason: `Trade blocked: ${redBrains.join(', ')} brain(s) are RED`,
    };
  }

  // If all brains are green, allow trade
  if (states.every(s => s === 'green')) {
    return {
      canTrade: true,
      reason: 'All brains GREEN - trade allowed',
    };
  }

  // If any brain is amber, allow only with caution
  if (states.includes('amber')) {
    const amberBrains = [];
    if (brains.market.state === 'amber') amberBrains.push('Market');
    if (brains.risk.state === 'amber') amberBrains.push('Risk');
    if (brains.psychology.state === 'amber') amberBrains.push('Psychology');
    
    return {
      canTrade: true, // Allow but with reduced size
      reason: `Trade allowed with caution: ${amberBrains.join(', ')} brain(s) are AMBER`,
    };
  }

  return {
    canTrade: false,
    reason: 'Unknown brain state combination',
  };
}

/**
 * Generates human-readable explanation
 */
export function generateExplanation(
  brains: BrainConsensus,
  allGreenResult: { canTrade: boolean; reason: string },
  proposal: TradeProposal
): string {
  const parts: string[] = [];

  parts.push(`Market Brain: ${brains.market.state.toUpperCase()} - ${brains.market.reasoning}`);
  parts.push(`Risk Brain: ${brains.risk.state.toUpperCase()} - ${brains.risk.reasoning}`);
  parts.push(`Psychology Brain: ${brains.psychology.state.toUpperCase()} - ${brains.psychology.reasoning}`);

  parts.push(`\nOverall Decision: ${allGreenResult.canTrade ? 'TRADE ALLOWED' : 'TRADE BLOCKED'}`);
  parts.push(`Reason: ${allGreenResult.reason}`);

  if (proposal) {
    parts.push(`\nProposed Trade: ${proposal.side} ${proposal.size.units} units of ${proposal.ticker}`);
    parts.push(`Entry: ${proposal.entry.price || 'Market'}, Stop: ${proposal.stop_loss.price}, Target: ${proposal.targets[0]?.price || 'N/A'}`);
    parts.push(`Risk: ${proposal.risk.est_max_loss_usd.toFixed(0)} USD, Reward: ${proposal.risk.est_max_gain_usd.toFixed(0)} USD, R:R: ${proposal.risk.risk_reward_ratio.toFixed(2)}:1`);
  }

  return parts.join('\n');
}

/**
 * Builds trade proposal from brain outputs
 */
function buildTradeProposal(
  worldState: WorldState,
  agentContext: AgentContext,
  marketOutput: MarketBrainOutput,
  riskOutput: RiskBrainOutput,
  psychologyOutput: PsychologyBrainOutput,
  allGreenResult: { canTrade: boolean; reason: string },
  confidence: number
): TradeProposal {
  const ticker = agentContext.ticker || 'UNKNOWN';
  const price = worldState.market.prices[ticker] || 0;
  const riskReward = marketOutput.data?.riskReward;
  const riskData = riskOutput.data || { allowedSize: 0, okToTrade: false, reason: 'No risk data', maxLossUsd: 0, stopDistance: 0, takeProfitBands: { conservative: 0, moderate: 0, aggressive: 0 } };
  const psychData = psychologyOutput.data || { recommendedAction: 'proceed' as const, riskFactors: [], mentalState: 'clear' as const };

  // Determine side from market brain
  const side = marketOutput.data?.directionalBias === 'long' ? 'LONG' : 'SHORT';

  // Get entry, stop, targets from market brain
  const entry = riskReward?.entry || price;
  const stop = riskReward?.stop || (side === 'LONG' ? price * 0.98 : price * 1.02);
  const target = riskReward?.target || (side === 'LONG' ? price * 1.02 : price * 0.98);

  // Calculate position size (apply psychology multiplier)
  const baseSize = riskData.allowedSize || 0;
  const psychMultiplier = psychData.recommendedAction === 'size_down' ? 0.75 : 
                          psychData.recommendedAction === 'cool_down' ? 0.5 : 1.0;
  const adjustedSize = Math.max(0, baseSize * psychMultiplier);

  // Calculate risk metrics
  const stopDistance = Math.abs(entry - stop);
  const targetDistance = Math.abs(target - entry);
  const riskRewardRatio = stopDistance > 0 ? targetDistance / stopDistance : 0;
  const estMaxLoss = adjustedSize * stopDistance;
  const estMaxGain = adjustedSize * targetDistance;

  // Build proposal
  const proposal: TradeProposal = {
    id: `proposal-${Date.now()}`,
    mode: agentContext.mode,
    ticker,
    timeframe: agentContext.timeframe || 'H1',
    side,
    entry: {
      type: 'LIMIT' as const,
      price: entry,
      zone: {
        min: entry * 0.999,
        max: entry * 1.001,
      },
    },
    stop_loss: {
      price: stop,
      reason: riskData?.reason || 'Risk-based stop loss',
    },
    targets: [
      {
        price: target,
        weight: 1.0,
        label: 'Primary target',
      },
    ],
    size: {
      units: adjustedSize,
      notional_usd: adjustedSize * price,
      risk_perc_equity: worldState.account.equity > 0 
        ? (estMaxLoss / worldState.account.equity) * 100 
        : 0,
    },
    risk: {
      allowed: allGreenResult.canTrade && riskData?.okToTrade === true,
      reasons: riskData?.okToTrade === false ? [riskData.reason || 'Risk check failed'] : [],
      risk_reward_ratio: riskRewardRatio,
      est_max_loss_usd: estMaxLoss,
      est_max_gain_usd: estMaxGain,
      category: estMaxLoss < 100 ? 'LOW' : estMaxLoss < 500 ? 'MEDIUM' : 'HIGH',
    },
    psychology: {
      allowed: psychData?.recommendedAction === 'proceed' || psychData?.recommendedAction === 'size_down',
      reasons: psychData?.riskFactors || [],
      behaviour_flags: psychData?.riskFactors || [],
      size_multiplier: psychMultiplier,
    },
    brains: {
      market: {
        bias: marketOutput.data?.directionalBias === 'long' ? 'LONG' : marketOutput.data?.directionalBias === 'short' ? 'SHORT' : 'FLAT',
        conviction: marketOutput.confidence,
        setup_label: marketOutput.data?.trendRegime || 'uncertain',
        entry_zone: { min: entry * 0.999, max: entry * 1.001 },
        targets: [{ price: target, probability: 0.6 }],
        invalidation_level: stop,
      },
      risk: {
        allowed: riskData.okToTrade === true,
        reasons: riskData.okToTrade === false ? [riskData.reason || 'Risk check failed'] : [],
        position_size_usd: adjustedSize * price,
        risk_reward_ratio: riskRewardRatio,
        est_max_loss_usd: estMaxLoss,
        est_max_gain_usd: estMaxGain,
      },
      psychology: {
        allowed: psychData.recommendedAction === 'proceed' || psychData.recommendedAction === 'size_down',
        reasons: psychData.riskFactors || [],
        mode: agentContext.config.psychology_mode,
        adjusted_size_multiplier: psychMultiplier,
        behavioural_warnings: psychData.riskFactors || [],
      },
    },
    meta: {
      confidence: confidence,
      created_at: new Date().toISOString(),
      source: 'AGENT_V1',
    },
  };

  return proposal;
}

/**
 * Gets worst state from array of states
 */
function getWorstState(states: Array<'green' | 'amber' | 'red'>): 'green' | 'amber' | 'red' {
  if (states.includes('red')) return 'red';
  if (states.includes('amber')) return 'amber';
  return 'green';
}

/**
 * Calculates agreement level between brains
 */
function calculateAgreement(
  market: MarketBrainOutput,
  risk: RiskBrainOutput,
  psychology: PsychologyBrainOutput
): 'high' | 'medium' | 'low' {
  const states = [market.state, risk.state, psychology.state];
  const allSame = states.every(s => s === states[0]);
  
  if (allSame) return 'high';
  if (states.filter(s => s === states[0]).length >= 2) return 'medium';
  return 'low';
}
