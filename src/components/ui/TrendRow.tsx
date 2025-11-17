import React from "react";
import { cn } from "../../lib/cn";

type TrendRowProps = {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
};

export function TrendRow({ label, value, change, positive = true }: TrendRowProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-3 hover:bg-white/8 transition">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
      <div
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0",
          positive
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
        )}
      >
        <span>{positive ? "▲" : "▼"}</span>
        <span>{change}</span>
      </div>
    </div>
  );
}

