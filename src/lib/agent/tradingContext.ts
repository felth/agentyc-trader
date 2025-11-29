// src/lib/agent/tradingContext.ts

import { getIbkrAccount, getIbkrPositions, getIbkrOrders, BridgeAccount, BridgePositions, BridgeOrders } from "@/lib/data/ibkrBridge";

export type TradingContext = {
  account: BridgeAccount;
  positions: BridgePositions;
  orders: BridgeOrders;
  riskProfile: {
    maxPerTrade: number;
    maxDailyLoss: number;
    leverageAllowed: boolean;
    hardBlocks: string[];
  };
};

export async function getTradingContext(): Promise<TradingContext> {
  return {
    account: await getIbkrAccount(),
    positions: await getIbkrPositions(),
    orders: await getIbkrOrders(),
    riskProfile: {
      maxPerTrade: 5000,
      maxDailyLoss: 2000,
      leverageAllowed: false,
      hardBlocks: ["Futures", "Options", "FX"],
    },
  };
}

