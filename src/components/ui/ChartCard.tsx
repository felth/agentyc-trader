import React from "react";

type ChartCardProps = {
  label: string;
  children?: React.ReactNode;
};

export function ChartCard({ label, children }: ChartCardProps) {
  return (
    <div className="rounded-3xl bg-white/5 border border-white/5 px-4 py-3 space-y-3">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      <div className="h-28 rounded-2xl bg-black/40 flex items-center justify-center text-xs text-slate-500">
        {children ?? "Chart coming soon"}
      </div>
    </div>
  );
}

