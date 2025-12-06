"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import SourceStatusBadge, { type Status } from "@/components/ui/SourceStatusBadge";

type AgentTradePlanCardProps = {
  hasPlan: boolean;
  actionableBullets?: string[]; // Top 3 actionable items
  status: Status; // IDLE or LIVE
  onGeneratePlan?: () => void;
};

export default function AgentTradePlanCard({
  hasPlan,
  actionableBullets = [],
  status,
  onGeneratePlan,
}: AgentTradePlanCardProps) {
  const router = useRouter();

  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-7">
      <SourceStatusBadge provider="AGENT" status={status} />

      <h3 className="text-[16px] font-semibold text-white mb-4">
        Agent Trade Plan
      </h3>

      {!hasPlan ? (
        <div className="space-y-4">
          <p className="text-white/50 text-[14px]">No trade plan generated</p>
          {onGeneratePlan && (
            <button
              onClick={onGeneratePlan}
              className="px-6 py-2.5 bg-[#00FF7F] hover:bg-[#00E670] text-black text-[14px] font-semibold rounded-xl transition-colors duration-150"
            >
              Generate Plan
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {actionableBullets.slice(0, 3).map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-[#00FF7F] text-[16px] leading-none">
                  •
                </span>
                <p className="text-[14px] text-white/80 flex-1">{bullet}</p>
              </div>
            ))}
          </div>

          <Link
            href="/agent?view=plan"
            className="inline-flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors"
          >
            <span>View Full Plan</span>
            <span>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

