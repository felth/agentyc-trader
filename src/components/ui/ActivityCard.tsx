import React from "react";

type ActivityCardProps = {
  title: string;
  subtitle: string;
  rightLabel?: string;
  icon?: React.ReactNode;
};

export function ActivityCard({ title, subtitle, rightLabel, icon }: ActivityCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/5 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#F56300]/30 to-cyan-500/20 flex items-center justify-center">
          {icon ?? <span className="text-sm text-[#F56300]">⇡</span>}
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      {rightLabel && <span className="text-xs text-slate-400">{rightLabel}</span>}
    </div>
  );
}

