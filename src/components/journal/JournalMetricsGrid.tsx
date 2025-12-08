"use client";

import React from "react";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import type { JournalEntry } from "@/lib/types/journal";

type JournalMetricsGridProps = {
  entries: JournalEntry[];
};

export default function JournalMetricsGrid({ entries }: JournalMetricsGridProps) {
  // Derive metrics from entries
  const revengeCount = entries.filter(e => e.tags?.includes("revenge")).length;
  const skippedPlanCount = entries.filter(e => e.tags?.includes("skipped_plan")).length;
  const morningPrepCount = entries.filter(e => e.tags?.includes("morning_prep")).length;
  const screenshotCount = entries.filter(e => e.tags?.includes("screenshot")).length;

  const metrics = [
    {
      label: "Revenge trades",
      value: revengeCount > 0 ? `${revengeCount} this week` : "0",
      status: revengeCount > 0 ? ("warning" as const) : ("neutral" as const),
    },
    {
      label: "Skipped plan",
      value: skippedPlanCount > 0 ? `${skippedPlanCount} instance${skippedPlanCount > 1 ? "s" : ""}` : "0",
      status: skippedPlanCount > 0 ? ("negative" as const) : ("neutral" as const),
    },
    {
      label: "Morning prep",
      value: morningPrepCount > 0 ? `Completed ${morningPrepCount}/5` : "0/5",
      status: morningPrepCount >= 5 ? ("positive" as const) : ("neutral" as const),
    },
    {
      label: "Screenshots logged",
      value: screenshotCount > 0 ? `${screenshotCount} added` : "0",
      status: screenshotCount > 0 ? ("positive" as const) : ("neutral" as const),
    },
  ];

  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="JOURNAL" status="OK" />
      
      <div className="pr-20 mb-4">
        <h3 className="text-[16px] font-bold text-white">Patterns & Metrics</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl bg-white/5 border border-white/10 p-3"
          >
            <p className="text-xs text-white/50 font-medium mb-1">{metric.label}</p>
            <p className="text-sm font-bold text-white mb-2">{metric.value}</p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block ${
                metric.status === "positive"
                  ? "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40"
                  : metric.status === "warning"
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                  : metric.status === "negative"
                  ? "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/40"
                  : "bg-white/5 text-white/40 border border-white/10"
              }`}
            >
              {metric.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

