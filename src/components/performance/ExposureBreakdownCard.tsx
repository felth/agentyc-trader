"use client";

import Link from "next/link";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

type PositionExposure = {
  symbol: string;
  value: number;
  percentage: number;
};

type ExposureBreakdownCardProps = {
  totalPositions: number;
  totalValue: number;
  buyingPower: number;
  topSymbols: PositionExposure[];
  status: "LIVE" | "DEGRADED" | "ERROR";
};

export default function ExposureBreakdownCard({
  totalPositions,
  totalValue,
  buyingPower,
  topSymbols,
  status,
}: ExposureBreakdownCardProps) {
  return (
    <Link
      href="/performance?tab=exposure"
      className="relative block rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6 cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:border-white/25 active:scale-[0.99]"
    >
      <SourceStatusBadge provider="BROKER" status={status} />
      
      <h2 className="text-[18px] font-bold text-white mb-6">Exposure Breakdown</h2>

      <div className="space-y-6">
        <div>
          <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-2">
            Total Positions
          </p>
          <p className="text-3xl font-bold text-white">{totalPositions}</p>
        </div>

        <div>
          <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-2">
            Total Value
          </p>
          <p className="text-3xl font-bold text-white">
            ${totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div>
          <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-2">
            Buying Power
          </p>
          <p className="text-2xl font-bold text-white">
            ${buyingPower.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        {topSymbols.length > 0 && (
          <div className="pt-4 border-t border-white/10">
            <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-3">
              Top 3 by Exposure
            </p>
            <div className="space-y-2">
              {topSymbols.slice(0, 3).map((pos) => (
                <div key={pos.symbol} className="flex items-center justify-between">
                  <Link
                    href={`/symbol/${pos.symbol}`}
                    className="text-sm font-medium text-white hover:text-orange-500 transition-colors"
                  >
                    {pos.symbol}
                  </Link>
                  <span className="text-sm text-white/70">{pos.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

