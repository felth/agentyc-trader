// src/lib/agent/tradingContext.ts

import { getIbkrAccount, getIbkrPositions, getIbkrOrders } from "@/lib/data/ibkrBridge";
import { riskLimits } from "./riskConfig";
import { fetchMarketOverview, type MarketOverviewSnapshot } from "@/lib/data/marketOverview";

export type TradingContext = {
  account: {
    accountId: string;
    balance: number;
    equity: number;
    unrealizedPnl: number;
    buyingPower: number;
  };
  positions: {
    symbol: string;
    quantity: number;
    avgPrice: number;
    marketPrice: number;
    unrealizedPnl: number;
  }[];
  orders: {
    id?: string;
    symbol?: string;
    side?: "BUY" | "SELL";
    quantity?: number;
    orderType?: string;
    status?: string;
  }[];
  riskProfile: {
    maxSingleTradeRiskUsd: number;
    maxDailyLossUsd: number;
    maxOpenTrades: number;
  };
  marketOverview: MarketOverviewSnapshot;
};

export async function buildTradingContext(): Promise<TradingContext> {
  // Wrap each IBKR call with error handling so one failure doesn't block others
  const [accountRes, positionsRes, ordersRes, marketOverview] = await Promise.all([
    getIbkrAccount().catch((err) => {
      console.error("[buildTradingContext] Account fetch failed:", err?.message);
      return { ok: false, error: err?.message || "Account fetch failed" };
    }),
    getIbkrPositions().catch((err) => {
      console.error("[buildTradingContext] Positions fetch failed:", err?.message);
      return { ok: false, error: err?.message || "Positions fetch failed" };
    }),
    getIbkrOrders().catch((err) => {
      console.error("[buildTradingContext] Orders fetch failed:", err?.message);
      return { ok: false, error: err?.message || "Orders fetch failed" };
    }),
    fetchMarketOverview().catch(() => ({
      spx: { value: 5500, changePct: 0 },
      ndx: { value: 18000, changePct: 0 },
      dxy: { value: 104.5, changePct: 0 },
      vix: { value: 15, changePct: 0 },
      xauusd: { value: 2380, changePct: 0 },
      btcusd: { value: 95000, changePct: 0 },
    })),
  ]);

  // Use fallback values if IBKR calls failed
  const account = accountRes?.ok ? accountRes : {
    accountId: "UNKNOWN",
    balance: 0,
    equity: 0,
    unrealizedPnl: 0,
    buyingPower: 0,
  };
  
  const positions = positionsRes?.ok && Array.isArray(positionsRes.positions) 
    ? positionsRes.positions 
    : [];
  
  const orders = ordersRes?.ok && Array.isArray(ordersRes.orders) 
    ? ordersRes.orders 
    : [];

  return {
    account: {
      accountId: account.accountId || "UNKNOWN",
      balance: account.balance || 0,
      equity: account.equity || 0,
      unrealizedPnl: account.unrealizedPnl || 0,
      buyingPower: account.buyingPower || 0,
    },
    positions: positions.map((p: any) => ({
      symbol: p.symbol,
      quantity: p.quantity,
      avgPrice: p.avgPrice,
      marketPrice: p.marketPrice,
      unrealizedPnl: p.unrealizedPnl,
    })),
    orders: (orders ?? []).map((o: any) => ({
      id: o.id,
      symbol: o.symbol,
      side: o.side,
      quantity: o.quantity,
      orderType: o.orderType,
      status: o.status,
    })),
    riskProfile: {
      maxSingleTradeRiskUsd: riskLimits.maxSingleTradeRiskUsd,
      maxDailyLossUsd: riskLimits.maxDailyLossUsd,
      maxOpenTrades: riskLimits.maxOpenTrades,
    },
    marketOverview,
  };
}
