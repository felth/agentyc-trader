import React from "react";

type StatTileProps = {
  label: string;
  value: string;
  caption?: string;
  icon?: React.ReactNode;
};

export function StatTile({ label, value, caption, icon }: StatTileProps) {
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 px-4 py-3 space-y-1 hover:bg-white/8 transition">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        {icon && <span className="text-slate-500 text-xs">{icon}</span>}
      </div>
      <div className="text-lg font-semibold tracking-tight text-white">{value}</div>
      {caption && <p className="text-[11px] text-slate-500">{caption}</p>}
    </div>
  );
}

