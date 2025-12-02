// Centralized risk limits configuration
// All trade plan generation and validation must use these values

export const riskLimits = {
  maxSingleTradeRiskUsd: 500,
  maxDailyLossUsd: 2000,
  maxOpenTrades: 3,
} as const;

export type RiskLimits = typeof riskLimits;

