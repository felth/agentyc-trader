"use client";

import React from "react";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

type AIReflectionCardProps = {
  insight?: string | null;
};

export function AIReflectionCard({ insight }: AIReflectionCardProps) {
  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="MEMORY" status={insight ? "OK" : "OFF"} />
      
      <h3 className="text-[16px] font-bold text-white mb-4">Agency Reflection</h3>
      
      {insight ? (
        <p className="text-sm text-white/80 leading-relaxed">{insight}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-white/50">
            Agency will summarise your recent journal entries once the journal → memory pipeline is wired.
          </p>
          <span className="inline-block text-xs px-2 py-1 rounded-full bg-white/5 text-white/60">
            Coming soon
          </span>
        </div>
      )}
    </div>
  );
}

