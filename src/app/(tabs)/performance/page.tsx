"use client";

import React from "react";
import { TabPage } from "../../../components/layout/TabPage";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { InsightCard } from "../../../components/ui/InsightCard";
import { ChartCard } from "../../../components/ui/ChartCard";

const vitals = [
  { label: "Total Trades", value: "5 today" },
  { label: "Win Rate", value: "60%" },
  { label: "Net R", value: "+1.4R" }
];

export default function PerformanceTab() {
  return (
    <TabPage>
      <InsightCard
        title="Performance Insight"
        insight="Momentum setups performed 25% better when aligned with the 4H trend. Reduce size on mean-reversion trades during the afternoon session."
      />

      <section className="space-y-2">
        <SectionHeader title="Today’s Performance" />
        <div className="rounded-3xl bg-white/5 border border-white/5 px-4 py-3 space-y-3">
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#F56300]"
              style={{ width: "60%" }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {vitals.map((vital) => (
              <div key={vital.label}>
                <p className="text-slate-400">{vital.label}</p>
                <p className="font-semibold">{vital.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader title="Your Weekly Charts" />
        <div className="space-y-3">
          <ChartCard label="Equity Curve" />
          <ChartCard label="Daily R" />
          <ChartCard label="Risk Per Day" />
        </div>
      </section>
    </TabPage>
  );
}

