// src/lib/agent/tradingContext.ts

import { getIbkrAccount, getIbkrPositions, getIbkrOrders } from "@/lib/data/ibkrBridge";

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
    allowShortSelling: boolean;
  };
};

export async function buildTradingContext(): Promise<TradingContext> {
  const [accountRes, positionsRes, ordersRes] = await Promise.all([
    getIbkrAccount(),
    getIbkrPositions(),
    getIbkrOrders(),
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
      maxSingleTradeRiskUsd: 500,      // safe defaults for now
      maxDailyLossUsd: 2000,
      allowShortSelling: false,
    },
  };
}
