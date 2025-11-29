export type TradeActionType =
  | "OPEN_LONG"
  | "OPEN_SHORT"
  | "CLOSE_POSITION"
  | "CANCEL_ORDER";

export type TradeCommand = {
  action: TradeActionType;
  symbol: string;
  quantity: number;
  timeInForce: "DAY" | "GTC";
  orderType: "MARKET" | "LIMIT";
  limitPrice?: number;
  reason: string;
  riskNotes: string;
};

export type TradePlanSide = 'BUY' | 'SELL';
export type TradePlanOrderType = 'MARKET' | 'LIMIT';

export interface TradePlanOrder {
  symbol: string;
  side: TradePlanSide;
  size: number;
  orderType: TradePlanOrderType;
  entry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  rationale: string;
  maxRiskUsd: number;
}

export interface TradePlan {
  mode: 'RULE_BASED';
  timestamp: string;
  accountId: string;
  dailyLossLimitUsd: number;
  singleTradeLimitUsd: number;
  orders: TradePlanOrder[];
}
