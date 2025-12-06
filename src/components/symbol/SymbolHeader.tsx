"use client";

import { useRouter } from "next/navigation";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

export default function SymbolHeader({
  symbol,
  last,
  changePct,
  spread,
  session,
  status,
}: {
  symbol: string;
  last: number;
  changePct: number;
  spread: number;
  session: string;
  status: "LIVE" | "ERROR" | "OK";
}) {
  const router = useRouter();

  const changeColor =
    changePct > 0 ? "#00FF7F" : changePct < 0 ? "#FF4D4D" : "#9EA6AE";

  return (
    <div
      onClick={() => {/* toggle watchlist future */}}
      className="relative w-full rounded-3xl bg-[#111111] p-6 cursor-pointer transition-transform duration-150 hover:scale-[1.01]"
    >
      <SourceStatusBadge provider="FMP" status={status} />

      <div className="flex justify-between items-baseline">
        <div className="text-[32px] font-semibold text-white tracking-tight">
          {symbol}
        </div>
        <div className="text-[15px] text-[#9EA6AE]">
          Session: {session}
        </div>
      </div>

      <div className="mt-2">
        <span className="text-[28px] font-semibold" style={{ color: "#ffffff" }}>
          {last.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <span className="ml-3 text-[18px]" style={{ color: changeColor }}>
          {changePct.toFixed(2)}%
        </span>
      </div>

      <div className="text-[14px] text-[#9EA6AE] mt-2">
        Spread: {spread.toFixed(2)}
      </div>
    </div>
  );
}

