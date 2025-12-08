// src/lib/brains/riskBrain.ts
// Risk Brain - Position sizing, risk limits, stop placement

/**
 * Phase 3: Full risk brain implementation
 * Calculates position sizes, validates risk limits, determines stop placement
 */

import type { WorldState, RiskBrainOutput } from './types';
import type { AgentContext } from '@/lib/memory/agentMemory';
import type { MarketBrainOutput } from './types';

export interface RiskBrainAnalysis {
  allowed: boolean;
  reasons: string[];
  position_size_usd: number;
  risk_reward_ratio: number;
  est_max_loss_usd: number;
  est_max_gain_usd: number;
  conflicts?: string[];
}

/**
 * Analyzes risk and calculates position sizing
 */
export async function analyzeRisk(
  worldState: WorldState,
  agentContext: AgentContext,
  marketOutput: MarketBrainOutput
): Promise<RiskBrainOutput> {
  const ticker = agentContext.ticker || 'UNKNOWN';
  const price = worldState.market.prices[ticker] || 0;
  const accountEquity = worldState.account.equity || 10000; // Default fallback
  const config = agentContext.config;

  if (!price || price <= 0) {
    return {
      state: 'red',
      confidence: 0,
      reasoning: 'No valid price data for risk calculation',
      timestamp: new Date(),
      data: {
        allowedSize: 0,
        maxLossUsd: 0,
        stopDistance: 0,
        takeProfitBands: { conservative: 0, moderate: 0, aggressive: 0 },
        okToTrade: false,
        reason: 'Invalid price data',
      },
    };
  }

  // Get market brain's risk-reward suggestion
  const riskReward = marketOutput.data?.riskReward;
  if (!riskReward) {
    return {
      state: 'red',
      confidence: 0,
      reasoning: 'Market brain did not provide risk-reward data',
      timestamp: new Date(),
      data: {
        allowedSize: 0,
        maxLossUsd: 0,
        stopDistance: 0,
        takeProfitBands: { conservative: 0, moderate: 0, aggressive: 0 },
        okToTrade: false,
        reason: 'Missing market analysis',
      },
    };
  }

  const entry = riskReward.entry;
  const stop = riskReward.stop;
  const target = riskReward.target;
  const stopDistance = Math.abs(entry - stop);
  const targetDistance = Math.abs(target - entry);

  // Calculate risk-reward ratio
  const riskRewardRatio = stopDistance > 0 ? targetDistance / stopDistance : 0;

  // Check if R:R meets minimum threshold
  const minRR = 1.5; // Minimum 1.5:1
  if (riskRewardRatio < minRR) {
    return {
      state: 'red',
      confidence: 0,
      reasoning: `Risk-reward ratio ${riskRewardRatio.toFixed(2)}:1 is below minimum ${minRR}:1`,
      timestamp: new Date(),
      data: {
        allowedSize: 0,
        maxLossUsd: 0,
        stopDistance,
        takeProfitBands: { conservative: target, moderate: target, aggressive: target },
        okToTrade: false,
        reason: `R:R too low: ${riskRewardRatio.toFixed(2)}:1`,
      },
    };
  }

  // Calculate position size based on max risk per trade
  const maxRiskUsd = Math.min(
    config.max_risk_per_trade,
    accountEquity * (config.risk_per_trade_pct / 100)
  );

  // Position size = risk amount / stop distance per unit
  const riskPerUnit = stopDistance;
  const allowedSize = riskPerUnit > 0 ? maxRiskUsd / riskPerUnit : 0;
  const positionSizeUsd = allowedSize * price;

  // Check position size limits
  const maxPositionSize = Math.min(
    config.max_position_size_usd,
    accountEquity * 0.2 // Max 20% of account per position
  );

  if (positionSizeUsd > maxPositionSize) {
    // Scale down to max position size
    const scaledSize = maxPositionSize / price;
    const scaledRisk = scaledSize * riskPerUnit;
    
    return {
      state: 'amber',
      confidence: 0.7,
      reasoning: `Position size capped at ${maxPositionSize.toFixed(0)} USD (${(maxPositionSize / accountEquity * 100).toFixed(1)}% of account)`,
      timestamp: new Date(),
      data: {
        allowedSize: scaledSize,
        maxLossUsd: scaledRisk,
        stopDistance,
        takeProfitBands: {
          conservative: entry + (target - entry) * 0.5,
          moderate: target,
          aggressive: entry + (target - entry) * 1.5,
        },
        okToTrade: 'only_tiny',
        reason: `Size capped at ${maxPositionSize.toFixed(0)} USD`,
      },
    };
  }

  // Check daily loss limit
  const dailyPnL = worldState.account.dailyPnL || 0;
  const remainingDailyLoss = config.daily_loss_limit + dailyPnL; // dailyPnL is negative if loss

  if (remainingDailyLoss < maxRiskUsd) {
    return {
      state: 'red',
      confidence: 0,
      reasoning: `Daily loss limit would be exceeded. Remaining: ${remainingDailyLoss.toFixed(0)} USD, Required: ${maxRiskUsd.toFixed(0)} USD`,
      timestamp: new Date(),
      data: {
        allowedSize: 0,
        maxLossUsd: 0,
        stopDistance,
        takeProfitBands: { conservative: target, moderate: target, aggressive: target },
        okToTrade: false,
        reason: 'Daily loss limit exceeded',
      },
    };
  }

  // Check open positions limit
  const openPositions = worldState.positions.length;
  if (openPositions >= config.max_open_positions) {
    return {
      state: 'amber',
      confidence: 0.5,
      reasoning: `Maximum open positions (${config.max_open_positions}) reached`,
      timestamp: new Date(),
      data: {
        allowedSize: 0,
        maxLossUsd: 0,
        stopDistance,
        takeProfitBands: { conservative: target, moderate: target, aggressive: target },
        okToTrade: false,
        reason: 'Max positions limit',
      },
    };
  }

  // Check symbol whitelist
  if (config.allowed_symbols.length > 0 && !config.allowed_symbols.includes(ticker)) {
    return {
      state: 'red',
      confidence: 0,
      reasoning: `Symbol ${ticker} is not in allowed list`,
      timestamp: new Date(),
      data: {
        allowedSize: 0,
        maxLossUsd: 0,
        stopDistance,
        takeProfitBands: { conservative: target, moderate: target, aggressive: target },
        okToTrade: false,
        reason: 'Symbol not allowed',
      },
    };
  }

  // All checks passed
  const estMaxLoss = allowedSize * riskPerUnit;
  const estMaxGain = allowedSize * targetDistance;

  return {
    state: 'green',
    confidence: Math.min(riskRewardRatio / 3, 1), // Cap confidence at 1.0
    reasoning: `Risk analysis passed. Position size: ${allowedSize.toFixed(2)} units (${positionSizeUsd.toFixed(0)} USD). Max risk: ${estMaxLoss.toFixed(0)} USD. R:R: ${riskRewardRatio.toFixed(2)}:1`,
    timestamp: new Date(),
    data: {
      allowedSize,
      maxLossUsd: estMaxLoss,
      stopDistance,
      takeProfitBands: {
        conservative: entry + (target - entry) * 0.5,
        moderate: target,
        aggressive: entry + (target - entry) * 1.5,
      },
      okToTrade: true,
      reason: 'All risk checks passed',
    },
  };
}
