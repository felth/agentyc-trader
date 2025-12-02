import { TradingContext } from './tradingContext';
import { TradePlan } from './tradeSchema';
import { riskLimits } from './riskConfig';

export async function generateTradePlan(ctx: TradingContext): Promise<TradePlan> {
  const { account, positions, orders: openOrders } = ctx;
  const { maxSingleTradeRiskUsd, maxDailyLossUsd, maxOpenTrades } = riskLimits;

  // Fallback if account missing
  if (!account?.accountId) {
    return {
      mode: 'RULE_BASED',
      timestamp: new Date().toISOString(),
      accountId: 'UNKNOWN',
      dailyLossLimitUsd: maxDailyLossUsd,
      singleTradeLimitUsd: maxSingleTradeRiskUsd,
      orders: []
    };
  }

  const acct = account;

  // Calculate current open positions count and unrealized PnL
  const openPositions = Array.isArray(positions) ? positions : [];
  const currentOpenTrades = openPositions.length;
  const currentUnrealizedPnl = openPositions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

  // Calculate daily drawdown (negative unrealized PnL counts as loss)
  const dailyDrawdown = Math.max(0, -currentUnrealizedPnl);

  // Rule 1: Don't exceed max open trades
  if (currentOpenTrades >= maxOpenTrades) {
    return {
      mode: 'RULE_BASED',
      timestamp: new Date().toISOString(),
      accountId: acct.accountId,
      dailyLossLimitUsd: maxDailyLossUsd,
      singleTradeLimitUsd: maxSingleTradeRiskUsd,
      orders: []
    };
  }

  // Rule 2: Check if daily loss limit would be exceeded
  // For now, if drawdown is already near the limit, don't propose new trades
  const remainingDailyRisk = maxDailyLossUsd - dailyDrawdown;
  if (remainingDailyRisk < maxSingleTradeRiskUsd * 0.5) {
    return {
      mode: 'RULE_BASED',
      timestamp: new Date().toISOString(),
      accountId: acct.accountId,
      dailyLossLimitUsd: maxDailyLossUsd,
      singleTradeLimitUsd: maxSingleTradeRiskUsd,
      orders: []
    };
  }

  // Simple rule-based plan: propose one small position if conditions allow
  // Risk is symmetric for long and short
  const riskPerTrade = Math.min(
    maxSingleTradeRiskUsd,
    remainingDailyRisk * 0.5, // Use at most 50% of remaining daily risk
    acct.buyingPower * 0.005 // 0.5% of buying power as a conservative cap
  );

  // Placeholder logic - later will pick from watchlist/context
  const symbol = 'AAPL';
  const entry = 270;
  const stop = entry - 5;
  const target = entry + 10;

  // Risk per share = entry - stop (same for long or short)
  const riskPerShare = Math.abs(entry - stop);
  const size = riskPerShare > 0 ? Math.floor(riskPerTrade / riskPerShare) : 0;

  // Validate: risk must not exceed single trade limit
  const actualRisk = size * riskPerShare;
  if (actualRisk > maxSingleTradeRiskUsd || size === 0) {
    return {
      mode: 'RULE_BASED',
      timestamp: new Date().toISOString(),
      accountId: acct.accountId,
      dailyLossLimitUsd: maxDailyLossUsd,
      singleTradeLimitUsd: maxSingleTradeRiskUsd,
      orders: []
    };
  }

  // Validate: total risk (new + drawdown) must not exceed daily limit
  const totalRisk = actualRisk + dailyDrawdown;
  if (totalRisk > maxDailyLossUsd) {
    return {
      mode: 'RULE_BASED',
      timestamp: new Date().toISOString(),
      accountId: acct.accountId,
      dailyLossLimitUsd: maxDailyLossUsd,
      singleTradeLimitUsd: maxSingleTradeRiskUsd,
      orders: []
    };
  }

  const orders = [
    {
      symbol,
      side: 'BUY' as const, // Both BUY and SELL are allowed - this is just placeholder logic
      size,
      orderType: 'LIMIT' as const,
      entry,
      stopLoss: stop,
      takeProfit: target,
      rationale: 'Rule-based plan: single position with fixed R:R, respecting risk limits. Both long and short trades are allowed.',
      maxRiskUsd: actualRisk
    }
  ];

  return {
    mode: 'RULE_BASED',
    timestamp: new Date().toISOString(),
    accountId: acct.accountId,
    dailyLossLimitUsd: maxDailyLossUsd,
    singleTradeLimitUsd: maxSingleTradeRiskUsd,
    orders
  };
}
