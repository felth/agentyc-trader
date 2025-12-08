"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TradeProposalModal from "@/components/trading/TradeProposalModal";

export default function ActionButtons({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [proposalModalOpen, setProposalModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 mt-4">
        <button
          onClick={() => router.push(`/journal?symbol=${symbol}`)}
          className="w-full bg-[#1A1A1A] text-white text-[16px] font-semibold py-4 rounded-xl hover:bg-[#222] transition-colors"
        >
          Add Note for {symbol}
        </button>

        <button
          onClick={() => setProposalModalOpen(true)}
          className="w-full bg-[#00FF7F] hover:bg-[#00E670] text-black text-[16px] font-semibold py-4 rounded-xl transition-colors"
        >
          Ask Agent for Plan
        </button>

        <button
          onClick={() => router.push(`/agent`)} // Temporary until order ticket UI
          className="w-full bg-white text-black text-[16px] font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity"
        >
          Manual Order Ticket
        </button>
      </div>

      <TradeProposalModal
        isOpen={proposalModalOpen}
        onClose={() => setProposalModalOpen(false)}
        ticker={symbol}
        onProposalComplete={() => {
          // Optionally refresh data or show success message
        }}
      />
    </>
  );
}
