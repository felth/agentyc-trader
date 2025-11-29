import { TradingContext } from './tradingContext';
import { TradePlan } from './tradeSchema';

const MAX_SINGLE_TRADE_RISK_USD = 500;
const MAX_DAILY_LOSS_USD = 2000;

export async function generateTradePlan(ctx: TradingContext): Promise<TradePlan> {
  const { account, positions } = ctx;

  // Fallback if account missing
  if (!account?.accountId) {
    return {
      mode: 'RULE_BASED',
      timestamp: new Date().toISOString(),
      accountId: 'UNKNOWN',
      dailyLossLimitUsd: MAX_DAILY_LOSS_USD,
      singleTradeLimitUsd: MAX_SINGLE_TRADE_RISK_USD,
      orders: []
    };
  }

  const acct = account;

  // Very simple rule set for now:
  // - If there are no positions, propose ONE small long in the strongest watchlist symbol (e.g. AAPL)
  // - If there IS an open position, propose "no new trades" (agent is in risk-on mode already)
  const hasOpenPositions = Array.isArray(positions) && positions.length > 0;

  if (hasOpenPositions) {
    return {
      mode: 'RULE_BASED',
      timestamp: new Date().toISOString(),
      accountId: acct.accountId,
      dailyLossLimitUsd: MAX_DAILY_LOSS_USD,
      singleTradeLimitUsd: MAX_SINGLE_TRADE_RISK_USD,
      orders: []
    };
  }

  const riskPerTrade = Math.min(
    MAX_SINGLE_TRADE_RISK_USD,
    acct.buyingPower * 0.005 // 0.5% of BP as an example
  );

  const symbol = 'AAPL'; // placeholder; later we'll pick from watchlist/context
  const entry = 270;     // placeholder level
  const stop = entry - 5;
  const target = entry + 10;

  // Risk per share = entry - stop
  const riskPerShare = entry - stop;
  const size = riskPerShare > 0 ? Math.floor(riskPerTrade / riskPerShare) : 0;

  const orders = size > 0
    ? [
        {
          symbol,
          side: 'BUY' as const,
          size,
          orderType: 'LIMIT' as const,
          entry,
          stopLoss: stop,
          takeProfit: target,
          rationale: 'Rule-based starter plan: single long position with fixed R:R, capped to maxSingleTradeRiskUsd.',
          maxRiskUsd: riskPerTrade
        }
      ]
    : [];

  return {
    mode: 'RULE_BASED',
    timestamp: new Date().toISOString(),
    accountId: acct.accountId,
    dailyLossLimitUsd: MAX_DAILY_LOSS_USD,
    singleTradeLimitUsd: MAX_SINGLE_TRADE_RISK_USD,
    orders
  };
}
