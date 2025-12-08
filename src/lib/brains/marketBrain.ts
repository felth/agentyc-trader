// src/lib/brains/marketBrain.ts
// Market Brain - Analyzes market conditions and generates trading signals

/**
 * Phase 3: Full market brain implementation
 * Analyzes price action, trend, volatility, and generates entry/exit signals
 */

import type { WorldState, MarketBrainOutput } from './types';
import type { AgentContext } from '@/lib/memory/agentMemory';

export interface MarketBrainAnalysis {
  bias: 'LONG' | 'SHORT' | 'FLAT';
  conviction: number; // 0-1
  setup_label: string;
  entry_zone: { min: number; max: number };
  targets: Array<{ price: number; probability: number }>;
  invalidation_level: number;
}

/**
 * Analyzes market conditions and generates trading signals
 */
export async function analyzeMarket(
  worldState: WorldState,
  agentContext: AgentContext
): Promise<MarketBrainOutput> {
  const ticker = agentContext.ticker || 'UNKNOWN';
  const price = worldState.market.prices[ticker] || 0;
  const volatility = worldState.market.volatility[ticker] || 0;
  const trend = worldState.market.indicators.trend as { direction: 'UP' | 'DOWN' | 'SIDEWAYS'; strength: number } | undefined;
  const regime = worldState.market.indicators.regime as { label: string; risk_off: boolean; event_risk: boolean } | undefined;
  const sma20 = worldState.market.indicators.sma20 as number | undefined;
  const sma50 = worldState.market.indicators.sma50 as number | undefined;

  if (!price || price <= 0) {
    return {
      state: 'red',
      confidence: 0,
      reasoning: 'No valid price data available',
      timestamp: new Date(),
      data: {
        trendRegime: 'uncertain',
        directionalBias: 'neutral',
        volatilityRegime: 'normal',
        keyLevels: {},
      },
    };
  }

  // Determine trend regime
  let trendRegime: 'bull' | 'bear' | 'chop' | 'uncertain' = 'uncertain';
  if (trend) {
    if (trend.direction === 'UP' && trend.strength > 0.5) {
      trendRegime = 'bull';
    } else if (trend.direction === 'DOWN' && trend.strength > 0.5) {
      trendRegime = 'bear';
    } else if (trend.direction === 'SIDEWAYS' || trend.strength < 0.3) {
      trendRegime = 'chop';
    }
  }

  // Determine volatility regime
  let volatilityRegime: 'low' | 'normal' | 'high' | 'extreme' = 'normal';
  if (volatility < 0.5) {
    volatilityRegime = 'low';
  } else if (volatility > 3) {
    volatilityRegime = 'extreme';
  } else if (volatility > 2) {
    volatilityRegime = 'high';
  }

  // Determine directional bias
  let directionalBias: 'long' | 'short' | 'neutral' = 'neutral';
  let conviction = 0.5;
  let setup_label = 'No clear setup';

  // Trend-following logic
  if (trend && sma20 && sma50) {
    if (price > sma20 && sma20 > sma50 && trend.direction === 'UP') {
      directionalBias = 'long';
      conviction = Math.min(0.5 + trend.strength * 0.3, 0.9);
      setup_label = 'Uptrend continuation';
    } else if (price < sma20 && sma20 < sma50 && trend.direction === 'DOWN') {
      directionalBias = 'short';
      conviction = Math.min(0.5 + trend.strength * 0.3, 0.9);
      setup_label = 'Downtrend continuation';
    }
  }

  // Risk-off regime adjustment
  if (regime?.risk_off) {
    conviction *= 0.7; // Reduce conviction in risk-off
    setup_label = 'Risk-off environment';
  }

  // High volatility adjustment
  if (volatilityRegime === 'extreme') {
    conviction *= 0.6; // Reduce conviction in extreme volatility
    setup_label = 'High volatility - caution';
  }

  // Calculate key levels
  const keyLevels = calculateKeyLevels(price, sma20, sma50, volatility);

  // Calculate entry zone and targets
  const analysis = calculateEntryAndTargets(
    price,
    directionalBias,
    volatility,
    keyLevels
  );

  // Determine brain state
  let state: 'green' | 'amber' | 'red' = 'amber';
  if (conviction > 0.7 && !regime?.risk_off && volatilityRegime !== 'extreme') {
    state = 'green';
  } else if (conviction < 0.4 || regime?.risk_off || volatilityRegime === 'extreme') {
    state = 'red';
  }

  return {
    state,
    confidence: conviction,
    reasoning: `Market analysis: ${setup_label}. Trend: ${trendRegime}, Volatility: ${volatilityRegime}. ${directionalBias.toUpperCase()} bias with ${(conviction * 100).toFixed(0)}% conviction.`,
    timestamp: new Date(),
    data: {
      trendRegime,
      directionalBias,
      volatilityRegime,
      keyLevels,
      riskReward: {
        entry: analysis.entry_zone.min,
        stop: analysis.invalidation_level,
        target: analysis.targets[0]?.price || price * 1.02,
        ratio: analysis.targets[0]?.price && analysis.invalidation_level
          ? Math.abs(analysis.targets[0].price - price) / Math.abs(price - analysis.invalidation_level)
          : 2,
      },
    },
  };
}

/**
 * Calculates key support/resistance levels
 */
function calculateKeyLevels(
  price: number,
  sma20?: number,
  sma50?: number,
  volatility?: number
): { support?: number; resistance?: number; pivot?: number } {
  const levels: { support?: number; resistance?: number; pivot?: number } = {};
  
  if (sma20) {
    if (price > sma20) {
      levels.support = sma20;
    } else {
      levels.resistance = sma20;
    }
  }

  if (sma50) {
    levels.pivot = sma50;
  }

  // Add volatility-based levels
  if (volatility) {
    const volRange = price * (volatility / 100);
    if (!levels.support) {
      levels.support = price - volRange;
    }
    if (!levels.resistance) {
      levels.resistance = price + volRange;
    }
  }

  return levels;
}

/**
 * Calculates entry zone and targets
 */
function calculateEntryAndTargets(
  price: number,
  bias: 'long' | 'short' | 'neutral',
  volatility: number,
  keyLevels: { support?: number; resistance?: number; pivot?: number }
): MarketBrainAnalysis {
  if (bias === 'neutral') {
    return {
      bias: 'FLAT',
      conviction: 0,
      setup_label: 'No clear direction',
      entry_zone: { min: price, max: price },
      targets: [],
      invalidation_level: price,
    };
  }

  const volRange = price * (volatility / 100);
  const isLong = bias === 'long';

  // Entry zone: current price ± small buffer
  const entryBuffer = volRange * 0.1;
  const entry_zone = {
    min: isLong ? price - entryBuffer : price - entryBuffer,
    max: isLong ? price + entryBuffer : price + entryBuffer,
  };

  // Stop loss (invalidation)
  const stopDistance = volRange * 1.5;
  const invalidation_level = isLong
    ? Math.min(price - stopDistance, keyLevels.support || price - stopDistance)
    : Math.max(price + stopDistance, keyLevels.resistance || price + stopDistance);

  // Targets (risk-reward based)
  const targets: Array<{ price: number; probability: number }> = [];
  
  // Target 1: 2:1 R:R
  const target1Distance = Math.abs(price - invalidation_level) * 2;
  targets.push({
    price: isLong ? price + target1Distance : price - target1Distance,
    probability: 0.6,
  });

  // Target 2: 3:1 R:R
  const target2Distance = Math.abs(price - invalidation_level) * 3;
  targets.push({
    price: isLong ? price + target2Distance : price - target2Distance,
    probability: 0.4,
  });

  return {
    bias: isLong ? 'LONG' : 'SHORT',
    conviction: 0.7,
    setup_label: isLong ? 'Long setup' : 'Short setup',
    entry_zone,
    targets,
    invalidation_level,
  };
}
