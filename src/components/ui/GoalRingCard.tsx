import React from "react";

type GoalRingCardProps = {
  label: string;
  value: string;
  progress: number; // 0-1
  accent?: string;
};

export function GoalRingCard({
  label,
  value,
  progress,
  accent = "#F56300"
}: GoalRingCardProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(Math.max(progress, 0), 1));

  return (
    <div className="flex flex-col items-center justify-center min-w-[110px] h-[140px] rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-3 space-y-2">
      <div className="relative">
        <svg width="100" height="100" className="-rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={accent}
            strokeWidth="10"
            fill="transparent"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: "stroke-dashoffset 0.3s ease"
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold">{value}</span>
        </div>
      </div>
      <p className="text-xs text-slate-300 text-center">{label}</p>
    </div>
  );
}

