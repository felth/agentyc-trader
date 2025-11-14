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
    <div className="flex items-center justify-between rounded-2xl bg-white/3 border border-white/5 px-3 py-2">
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className={cn("font-semibold", positive ? "text-emerald-400" : "text-rose-400")}>
          {positive ? "▲" : "▼"}
        </span>
        <span className={positive ? "text-emerald-400" : "text-rose-400"}>{change}</span>
      </div>
    </div>
  );
}

