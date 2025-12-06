"use client";

import AgentHintTag from "@/components/ui/AgentHintTag";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

export default function EvidenceTiles({
  symbol,
  strengthScore,
  pattern,
  momentum,
}: {
  symbol: string;
  strengthScore: number; // 0–100
  pattern: string;
  momentum: string;
}) {
  return (
    <div className="relative w-full rounded-3xl bg-[#111111] p-6">
      <SourceStatusBadge provider="DERIVED" status="OK" />

      <div className="absolute top-2 left-4">
        <AgentHintTag text="setup evidence" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Strength */}
        <div className="bg-[#1A1A1A] p-3 rounded-xl text-center">
          <div className="text-[#9EA6AE] text-[12px] uppercase mb-1">
            Strength
          </div>
          <div className="text-white text-[20px] font-bold">
            {strengthScore}%
          </div>
        </div>

        {/* Pattern */}
        <div className="bg-[#1A1A1A] p-3 rounded-xl text-center">
          <div className="text-[#9EA6AE] text-[12px] uppercase mb-1">
            Pattern
          </div>
          <div className="text-white text-[20px] font-bold">
            {pattern}
          </div>
        </div>

        {/* Momentum */}
        <div className="bg-[#1A1A1A] p-3 rounded-xl text-center">
          <div className="text-[#9EA6AE] text-[12px] uppercase mb-1">
            Momentum
          </div>
          <div className="text-white text-[20px] font-bold">
            {momentum}
          </div>
        </div>
      </div>
    </div>
  );
}

