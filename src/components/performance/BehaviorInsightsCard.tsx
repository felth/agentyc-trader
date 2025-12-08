"use client";

import Link from "next/link";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import AgentHintTag from "@/components/ui/AgentHintTag";

type BehaviorMetric = {
  label: string;
  value: number | string;
  type: "POSITIVE" | "NEGATIVE" | "WARNING" | "NEUTRAL";
};

type BehaviorInsightsCardProps = {
  metrics: BehaviorMetric[];
  status: "LIVE" | "DEGRADED" | "ERROR";
};

export default function BehaviorInsightsCard({
  metrics,
  status,
}: BehaviorInsightsCardProps) {
  if (metrics.length === 0) {
    return (
      <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
        <SourceStatusBadge provider="JOURNAL" status="OFF" />
        <h2 className="text-[18px] font-bold text-white mb-4">Behaviour Insights</h2>
        <div className="space-y-3">
          <p className="text-sm text-white/50">
            Behaviour insights will appear here once journaling data is available from the Journal screen.
          </p>
          <Link
            href="/journal"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white font-medium transition-colors"
          >
            Go to Journal →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="DERIVED" status={status} />
      <div className="absolute top-2 left-4 z-10">
        <AgentHintTag text="Agentyc: reduce risk size during revenge-prone sessions" />
      </div>

      <h2 className="text-[18px] font-bold text-white mb-6">Behaviour Insights</h2>

      <div className="space-y-4">
        {metrics.map((metric, idx) => {
          const colorClass =
            metric.type === "POSITIVE"
              ? "text-[#00FF7F]"
              : metric.type === "NEGATIVE"
              ? "text-[#FF4D4D]"
              : metric.type === "WARNING"
              ? "text-[#FFBF00]"
              : "text-white/70";

          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5"
            >
              <span className="text-[14px] text-white/70">{metric.label}</span>
              <span className={`text-[16px] font-semibold ${colorClass}`}>
                {typeof metric.value === "number" ? metric.value : metric.value}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-white/40 mt-4">
        Derived from journal tags and patterns
      </p>
    </div>
  );
}

