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
  const [accountRes, positionsRes, ordersRes, marketOverview] = await Promise.all([
    getIbkrAccount(),
    getIbkrPositions(),
    getIbkrOrders(),
    fetchMarketOverview().catch(() => ({
      spx: { value: 5500, changePct: 0 },
      ndx: { value: 18000, changePct: 0 },
      dxy: { value: 104.5, changePct: 0 },
      vix: { value: 15, changePct: 0 },
      xauusd: { value: 2380, changePct: 0 },
      btcusd: { value: 95000, changePct: 0 },
    })),
  ]);

  if (!accountRes.ok) throw new Error("Failed to load IBKR account");
  if (!positionsRes.ok) throw new Error("Failed to load IBKR positions");
  if (!ordersRes.ok) throw new Error("Failed to load IBKR orders");

  const account = accountRes;
  const positions = Array.isArray(positionsRes.positions) ? positionsRes.positions : [];
  const orders = Array.isArray(ordersRes.orders) ? ordersRes.orders : [];

  return {
    account: {
      accountId: accountRes.accountId,
      balance: accountRes.balance,
      equity: accountRes.equity,
      unrealizedPnl: accountRes.unrealizedPnl,
      buyingPower: accountRes.buyingPower,
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
