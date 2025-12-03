// Helper to build agent context from dashboard snapshot
// This allows the agent to have access to all dashboard data without extra wiring

import type { DashboardSnapshot } from "../data/dashboard";
import type { TradingContext } from "./tradingContext";

export function buildAgentContextFromDashboard(snapshot: DashboardSnapshot): TradingContext {
  return {
    account: snapshot.account,
    positions: snapshot.positions,
    orders: snapshot.orders,
    riskProfile: {
      maxSingleTradeRiskUsd: 500, // Use from riskConfig later
      maxDailyLossUsd: 2000,
      maxOpenTrades: 3,
    },
    marketOverview: {
      spx: { value: snapshot.marketOverview.tiles.find(t => t.label === "SPX")?.value || 0, changePct: snapshot.marketOverview.tiles.find(t => t.label === "SPX")?.changePct || 0 },
      ndx: { value: snapshot.marketOverview.tiles.find(t => t.label === "NDX")?.value || 0, changePct: snapshot.marketOverview.tiles.find(t => t.label === "NDX")?.changePct || 0 },
      dxy: { value: snapshot.marketOverview.tiles.find(t => t.label === "DXY")?.value || 0, changePct: snapshot.marketOverview.tiles.find(t => t.label === "DXY")?.changePct || 0 },
      vix: { value: snapshot.marketOverview.tiles.find(t => t.label === "VIX")?.value || 0, changePct: snapshot.marketOverview.tiles.find(t => t.label === "VIX")?.changePct || 0 },
      xauusd: { value: snapshot.marketOverview.tiles.find(t => t.label === "XAUUSD")?.value || 0, changePct: snapshot.marketOverview.tiles.find(t => t.label === "XAUUSD")?.changePct || 0 },
      btcusd: { value: snapshot.marketOverview.tiles.find(t => t.label === "BTCUSD")?.value || 0, changePct: snapshot.marketOverview.tiles.find(t => t.label === "BTCUSD")?.changePct || 0 },
    },
  };
}

