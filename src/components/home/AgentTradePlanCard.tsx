"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import SourceStatusBadge, { type Status } from "@/components/ui/SourceStatusBadge";
import AgentHintTag from "@/components/ui/AgentHintTag";
import TradeProposalModal from "@/components/trading/TradeProposalModal";
import type { ReactNode } from "react";

type AgentTradePlanCardProps = {
  hasPlan: boolean;
  actionableBullets?: string[]; // Top 3 actionable items
  status: Status; // IDLE or LIVE
  onGeneratePlan?: () => void;
  agentHint?: ReactNode;
  riskSeverity?: "OK" | "ELEVATED" | "DANGER";
  imminentHighImpact?: boolean;
  defaultSymbol?: string; // Default symbol for proposal modal
};

export default function AgentTradePlanCard({
  hasPlan,
  actionableBullets = [],
  status,
  onGeneratePlan,
  agentHint,
  riskSeverity = "OK",
  imminentHighImpact = false,
  defaultSymbol,
}: AgentTradePlanCardProps) {
  const router = useRouter();
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(defaultSymbol || 'SPX');

  // Dynamic agent hint based on system state
  const dangerHint =
    imminentHighImpact
      ? <AgentHintTag text="news risk — no new trades" />
      : riskSeverity === "DANGER"
      ? <AgentHintTag text="risk dangerous — reduce exposure" />
      : riskSeverity === "ELEVATED"
      ? <AgentHintTag text="risk elevated — trade lighter" />
      : hasPlan
      ? <AgentHintTag text="plan active" />
      : <AgentHintTag text="plan pending" />;

  const handleGeneratePlan = () => {
    if (defaultSymbol) {
      setSelectedSymbol(defaultSymbol);
      setProposalModalOpen(true);
    } else if (onGeneratePlan) {
      onGeneratePlan();
    } else {
      // Open modal with prompt for symbol
      setProposalModalOpen(true);
    }
  };

  return (
    <>
      <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-7">
        <SourceStatusBadge provider="AGENTYC" status={status} />
        <div className="absolute top-2 left-4 z-10">{dangerHint}</div>

        <div className="pr-20 mb-4">
          <h3 className="text-[16px] font-semibold text-white">
            Agentyc Trade Plan
          </h3>
        </div>

        {!hasPlan ? (
          <div className="space-y-4">
            <p className="text-white/50 text-[14px]">No trade plan generated</p>
            <button
              onClick={handleGeneratePlan}
              className="px-6 py-2.5 bg-[#00FF7F] hover:bg-[#00E670] text-black text-[14px] font-semibold rounded-xl transition-colors duration-150"
            >
              Ask Agent for Plan
            </button>
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

            <div className="flex gap-2">
              <button
                onClick={handleGeneratePlan}
                className="px-4 py-2 bg-[#00FF7F] hover:bg-[#00E670] text-black text-[14px] font-semibold rounded-xl transition-colors"
              >
                New Proposal
              </button>
              <Link
                href="/agent/control"
                className="inline-flex items-center gap-2 px-4 py-2 text-[14px] text-white/60 hover:text-white transition-colors border border-white/20 rounded-xl"
              >
                <span>Control Panel</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      <TradeProposalModal
        isOpen={proposalModalOpen}
        onClose={() => setProposalModalOpen(false)}
        ticker={selectedSymbol}
        onProposalComplete={() => {
          setProposalModalOpen(false);
        }}
      />
    </>
  );
}
