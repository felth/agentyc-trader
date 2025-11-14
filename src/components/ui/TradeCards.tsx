import React from "react";
import { cn } from "../../lib/cn";

type TradeCommonProps = {
  symbol: string;
  direction: "long" | "short";
  meta: string;
};

type TradeOpenProps = TradeCommonProps & {
  status?: string;
};

export function TradeCardOpen({ symbol, direction, meta, status = "Running" }: TradeOpenProps) {
  const pillClass =
    direction === "long"
      ? "text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300"
      : "text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300";

  return (
    <div className="rounded-3xl bg-white/5 border border-white/5 px-4 py-3 flex justify-between items-start">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{symbol}</p>
          <span className={pillClass}>{direction.toUpperCase()}</span>
        </div>
        <p className="text-xs text-slate-400">{meta}</p>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
        {status}
      </span>
    </div>
  );
}

type TradeClosedProps = TradeCommonProps & {
  resultLabel: string;
  positive?: boolean;
};

export function TradeCardClosed({
  symbol,
  direction,
  meta,
  resultLabel,
  positive = true
}: TradeClosedProps) {
  const pillClass =
    direction === "long"
      ? "text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300"
      : "text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300";

  return (
    <div className="rounded-3xl bg-white/5 border border-white/5 px-4 py-3 flex justify-between items-start">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{symbol}</p>
          <span className={pillClass}>{direction.toUpperCase()}</span>
        </div>
        <p className="text-xs text-slate-400">{meta}</p>
      </div>
      <span
        className={cn(
          "text-xs px-2 py-0.5 rounded-full",
          positive ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
        )}
      >
        {resultLabel}
      </span>
    </div>
  );
}

