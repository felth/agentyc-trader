// src/lib/agent/tradeSchema.ts

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
  reason: string;          // Agent's reasoning in 1–2 sentences
  riskNotes: string;       // What is at risk and why it fits limits
};

export type TradePlan = {
  mode: "SIMULATION" | "LIVE_CONFIRM_REQUIRED";
  contextSummary: string;
  suggestedCommands: TradeCommand[];
};

