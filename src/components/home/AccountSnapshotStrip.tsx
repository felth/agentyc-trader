"use client";

import Link from "next/link";

type Metric = {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  href?: string;
};

type AccountSnapshotStripProps = {
  metrics: Metric[];
};

export default function AccountSnapshotStrip({ metrics }: AccountSnapshotStripProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === "string") return val;
    return val.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const getValueColor = (val: string | number): string => {
    if (typeof val === "string") return "text-white";
    if (val < 0) return "text-[#FF4D4D]";
    if (val > 0) return "text-[#00FF7F]";
    return "text-white";
  };

  const formatDisplayValue = (val: string | number): string => {
    if (typeof val === "string") return val;
    const formatted = formatValue(Math.abs(val));
    if (val < 0) return `-${formatted}`;
    if (val > 0) return `+${formatted}`;
    return formatted;
  };

  return (
    <section className="px-6 py-4">
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        {metrics.map((metric, idx) => {
          const content = (
            <div 
              className="flex-shrink-0 min-w-[110px] px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5 font-medium">
                {metric.label}
              </p>
              <p className={`text-[18px] font-semibold leading-tight ${getValueColor(metric.value)}`}>
                {formatDisplayValue(metric.value)}
              </p>
            </div>
          );

          return metric.href ? (
            <Link key={idx} href={metric.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={idx}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}

