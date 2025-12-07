"use client";

import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

export default function AgencyChatPanel() {
  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="AGENTYC" status="OK" />

      <h2 className="text-[18px] font-bold text-white mb-2">Agency Chat</h2>
      <p className="text-[12px] text-white/50 mb-6">
        Context loaded: Account • Positions • Today's risk • Latest journal metrics • Playbook rules.
      </p>

      {/* Placeholder chat area */}
      <div className="h-[400px] flex items-center justify-center text-sm text-white/50 border border-dashed border-white/10 rounded-lg mb-6">
        <div className="text-center max-w-md px-4">
          <p className="mb-2">Chat interface coming soon.</p>
          <p className="text-xs text-white/40">
            Agency will always see the same data shown on Home + Symbol + Trades.
          </p>
        </div>
      </div>

      {/* Prompt buttons */}
      <div className="flex flex-wrap gap-3">
        <button className="px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-[13px] font-medium text-white transition-colors">
          What should I do today?
        </button>
        <button className="px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-[13px] font-medium text-white transition-colors">
          Why did my PnL move?
        </button>
        <button className="px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-[13px] font-medium text-white transition-colors">
          Summarise my open risk.
        </button>
      </div>
    </div>
  );
}

