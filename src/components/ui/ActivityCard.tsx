import React from "react";

type ActivityCardProps = {
  title: string;
  subtitle: string;
  rightLabel?: string;
  icon?: React.ReactNode;
};

export function ActivityCard({ title, subtitle, rightLabel, icon }: ActivityCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 px-4 py-3 hover:bg-white/8 transition">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F56300]/40 to-cyan-500/30 flex items-center justify-center flex-shrink-0 shadow-lg">
          {icon ?? <span className="text-lg text-white">⇡</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {rightLabel && (
        <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">{rightLabel}</span>
      )}
    </div>
  );
}

