"use client";

import React, { useState } from "react";
import { TabPage } from "../../../components/layout/TabPage";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { TradeCardOpen, TradeCardClosed } from "../../../components/ui/TradeCards";
import { FilterPills } from "../../../components/ui/FilterPills";
import { FloatingActionButton } from "../../../components/ui/FloatingActionButton";

const openTrades = [
  {
    symbol: "XAUUSD",
    direction: "long" as const,
    meta: "+0.6R · 0.5% risk · 1h 12m",
    status: "Running"
  },
  {
    symbol: "NVDA",
    direction: "short" as const,
    meta: "-0.2R · 0.3% risk · 32m",
    status: "Monitoring"
  }
];

const closedTrades = [
  {
    symbol: "EURUSD",
    direction: "long" as const,
    meta: "+1.4R · 0.5% risk · 3h 44m",
    resultLabel: "+1.4R",
    positive: true
  },
  {
    symbol: "SPY",
    direction: "short" as const,
    meta: "-0.6R · 0.4% risk · 28m",
    resultLabel: "-0.6R",
    positive: false
  }
];

const filters = ["All", "Open", "Closed", "Week", "Month"];

export default function TradesTab() {
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <TabPage>
      <section className="space-y-3">
        <SectionHeader title="Open Trades" />
        <div className="space-y-2">
          {openTrades.map((trade) => (
            <TradeCardOpen key={trade.symbol} {...trade} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Closed Trades" />
        <p className="text-xs text-slate-400">Thursday</p>
        <div className="space-y-2">
          {closedTrades.map((trade) => (
            <TradeCardClosed key={trade.symbol} {...trade} />
          ))}
        </div>
      </section>

      <FilterPills options={filters} active={activeFilter} onChange={setActiveFilter} />

      <FloatingActionButton />
    </TabPage>
  );
}

