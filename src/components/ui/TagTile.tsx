import React from "react";
import { cn } from "../../lib/cn";

type TagTileProps = {
  label: string;
  value?: string;
  status?: "default" | "positive" | "warning" | "negative";
};

const STATUS_STYLES: Record<
  NonNullable<TagTileProps["status"]>,
  { pill: string; value: string }
> = {
  default: {
    pill: "bg-white/5 border-white/10 text-slate-200",
    value: "text-slate-400"
  },
  positive: {
    pill: "bg-emerald-500/15 border-emerald-400/30 text-emerald-200",
    value: "text-emerald-300"
  },
  warning: {
    pill: "bg-amber-500/15 border-amber-400/30 text-amber-200",
    value: "text-amber-300"
  },
  negative: {
    pill: "bg-rose-500/15 border-rose-400/30 text-rose-200",
    value: "text-rose-300"
  }
};

export function TagTile({ label, value, status = "default" }: TagTileProps) {
  const styles = STATUS_STYLES[status];
  return (
    <div
      className={cn(
        "rounded-3xl border px-3 py-2 space-y-1 transition",
        styles.pill
      )}
    >
      <p className="text-xs font-medium">{label}</p>
      {value && <p className={cn("text-[11px]", styles.value)}>{value}</p>}
    </div>
  );
}

