"use client";

import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import AgentHintTag from "@/components/ui/AgentHintTag";
import { useRouter } from "next/navigation";

export default function CorrelationBlock({
  symbol,
  correlationScore,
}: {
  symbol: string;
  correlationScore: number; // 0.0 – 1.0
}) {
  const router = useRouter();

  const correlated = correlationScore >= 0.6;
  const scoreColor = correlated ? "#FFBF00" : "#00FF7F";

  return (
    <div
      onClick={() => router.push(`/performance?tab=exposure`)}
      className="relative w-full rounded-3xl bg-[#111111] p-6 cursor-pointer transition-transform duration-150 hover:scale-[1.01]"
    >
      <SourceStatusBadge provider="DERIVED" status="OK" />

      {correlated && (
        <div className="absolute top-2 left-4">
          <AgentHintTag text="correlation high — manage exposure" />
        </div>
      )}

      <div className="text-[#9EA6AE] text-[14px] uppercase mb-2">
        Portfolio Correlation
      </div>

      <div className="text-white text-[22px] font-semibold" style={{ color: scoreColor }}>
        {(correlationScore * 100).toFixed(0)}%
      </div>

      <div className="text-[14px] text-[#9EA6AE] mt-1">
        Compared to your current positions
      </div>
    </div>
  );
}

