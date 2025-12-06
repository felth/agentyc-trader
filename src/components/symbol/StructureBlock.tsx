"use client";

import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import AgentHintTag from "@/components/ui/AgentHintTag";

type Props = {
  trend: "UP" | "DOWN" | "RANGE";
  volatilityPctile: number; // 0–100
  spread: number;
  session: string;
};

export default function StructureBlock({
  trend,
  volatilityPctile,
  spread,
  session,
}: Props) {
  // Vol Regime Label
  let volText =
    volatilityPctile >= 70
      ? "High Volatility"
      : volatilityPctile >= 40
      ? "Medium Volatility"
      : "Low Volatility";

  // Agent Interpretation
  let hintText =
    trend === "UP" && volatilityPctile < 60
      ? "strong bullish impulse"
      : trend === "DOWN" && volatilityPctile < 60
      ? "downtrend continuation"
      : trend === "RANGE"
      ? "range risk — stand aside"
      : "setup quality uncertain";

  return (
    <div
      className="relative w-full rounded-3xl bg-[#111111] p-6 cursor-pointer transition-transform duration-150 hover:scale-[1.01]"
      onClick={() => window.location.assign("/market")}
    >
      <SourceStatusBadge provider="DERIVED" status="OK" />

      <div className="absolute top-2 left-4">
        <AgentHintTag text={hintText} />
      </div>

      <div className="grid grid-cols-2 gap-y-4">
        <div className="text-[#9EA6AE] text-[13px] uppercase">Trend</div>
        <div className="text-white text-[17px] font-semibold">{trend}</div>

        <div className="text-[#9EA6AE] text-[13px] uppercase">Volatility</div>
        <div className="text-white text-[17px] font-semibold">
          {volText} ({volatilityPctile}%)
        </div>

        <div className="text-[#9EA6AE] text-[13px] uppercase">Session</div>
        <div className="text-white text-[17px] font-semibold">{session}</div>

        <div className="text-[#9EA6AE] text-[13px] uppercase">Liquidity</div>
        <div className="text-white text-[17px] font-semibold">
          Spread {spread.toFixed(spread < 1 ? 2 : 1)}
        </div>
      </div>
    </div>
  );
}

