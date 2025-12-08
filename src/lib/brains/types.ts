// src/lib/brains/types.ts
// Multi-Brain Trading Agent - Core Types

/**
 * Phase 1: Type definitions for the multi-brain system
 * TODO Phase 2: Add validation logic
 * TODO Phase 3: Add integration with existing agent routes
 * TODO Phase 4: Add UI components
 * TODO Phase 5: Add safety middleware
 * TODO Phase 6: Testing and validation
 */

// Brain state enumeration
export type BrainState = 'green' | 'amber' | 'red';

// Generic brain output structure
export interface BrainOutput<T = unknown> {
  state: BrainState;
  confidence: number; // 0-1 scale
  reasoning: string; // Human-readable explanation
  data?: T; // Brain-specific data
  timestamp: Date;
}

// Market Brain specific output
export interface MarketBrainOutput extends BrainOutput<{
  trendRegime: 'bull' | 'bear' | 'chop' | 'uncertain';
  directionalBias: 'long' | 'short' | 'neutral';
  volatilityRegime: 'low' | 'normal' | 'high' | 'extreme';
  keyLevels: {
    support?: number;
    resistance?: number;
    pivot?: number;
  };
  riskReward?: {
    entry: number;
    stop: number;
    target: number;
    ratio: number;
  };
}> {}

// Risk Brain specific output
export interface RiskBrainOutput extends BrainOutput<{
  allowedSize: number; // Position size in units
  maxLossUsd: number;
  stopDistance: number; // Distance from entry
  takeProfitBands: {
    conservative: number;
    moderate: number;
    aggressive: number;
  };
  leverageCap?: number;
  okToTrade: boolean | 'only_tiny'; // true, false, or 'only_tiny'
  reason: string; // Why trade is allowed/blocked
}> {}

// Psychology Brain specific output
export interface PsychologyBrainOutput extends BrainOutput<{
  mentalState: 'clear' | 'tilt' | 'fomo' | 'fear' | 'overconfident' | 'fatigued';
  recommendedAction: 'proceed' | 'pause' | 'size_down' | 'cool_down';
  coolDownMinutes?: number;
  journalingPrompts?: string[];
  riskFactors: string[]; // List of detected risk factors
}> {}

// Combined brain consensus
export interface BrainConsensus {
  market: MarketBrainOutput;
  risk: RiskBrainOutput;
  psychology: PsychologyBrainOutput;
  overallState: BrainState; // Worst state among all brains
  agreement: 'high' | 'medium' | 'low'; // How much brains agree
  timestamp: Date;
}

// World state - single source of truth for all brains
export interface WorldState {
  // Market data
  market: {
    prices: Record<string, number>; // symbol -> last price
    volumes: Record<string, number>;
    indicators: Record<string, unknown>; // Technical indicators
    volatility: Record<string, number>;
    newsSentiment?: {
      overall: number; // -1 to 1
      recent: Array<{ symbol: string; sentiment: number; timestamp: Date }>;
    };
  };
  
  // Account state
  account: {
    accountId: string;
    balance: number;
    equity: number;
    unrealizedPnl: number;
    buyingPower: number;
    dailyPnL: number;
    openRiskPercent: number; // Current risk as % of account
  };
  
  // Positions
  positions: Array<{
    symbol: string;
    quantity: number;
    avgPrice: number;
    marketPrice: number;
    unrealizedPnl: number;
    exposure: number;
  }>;
  
  // Orders
  orders: Array<{
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    orderType: string;
    status: string;
  }>;
  
  // Memory context (from corpus + playbook)
  memory: {
    corpus: Array<{ concept: string; relevance: number }>; // Relevant corpus entries
    playbook: Array<{ rule: string; relevance: number }>; // Relevant playbook rules
    recentTrades: Array<{ symbol: string; outcome: 'win' | 'loss' | 'breakeven'; timestamp: Date }>;
  };
  
  // User state
  user: {
    journalEntries: Array<{ mood: string; timestamp: Date; tags: string[] }>;
    overrideHistory: Array<{ action: 'approved' | 'rejected'; timestamp: Date }>;
    sessionLength: number; // Minutes since login
    recentLosses: number; // Count of losses in last N trades
    timeOfDay: string; // 'morning' | 'afternoon' | 'evening' | 'night'
  };
  
  // System state
  system: {
    dataFreshness: {
      market: number; // Seconds since last market update
      account: number;
      positions: number;
    };
    ibkrConnected: boolean;
    ibkrAuthenticated: boolean;
  };
  
  timestamp: Date;
}

// Coordinator output
export interface CoordinatorOutput {
  worldState: WorldState;
  brains: BrainConsensus;
  finalDecision: {
    canTrade: boolean;
    reason: string;
    confidence: number;
    requiredChecks: Array<{
      check: string;
      passed: boolean;
      reason: string;
    }>;
  };
  explanation: string; // Human-readable explanation of decision
  timestamp: Date;
}

