"use client";

import React from "react";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import type { JournalEntry } from "@/lib/types/journal";

type AIReflectionCardProps = {
  entries: JournalEntry[];
};

/**
 * Generate deterministic insights from journal entries
 * TODO: Replace with real LLM summarization when available
 */
function generateInsights(entries: JournalEntry[]): string | null {
  if (entries.length === 0) return null;

  const recent = entries.slice(0, 7); // Last 7 entries
  
  const moodCounts: Record<string, number> = {};
  recent.forEach(e => {
    moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
  });

  const mostCommonMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const revengeCount = recent.filter(e => e.tags?.includes("revenge")).length;
  const skippedPlanCount = recent.filter(e => e.tags?.includes("skipped_plan")).length;

  const insights: string[] = [];

  if (mostCommonMood === "challenged" && revengeCount > 0) {
    insights.push("⚠️ Recent entries show challenging periods with revenge trades detected.");
    insights.push("Consider pausing when feeling restless to avoid revenge entries.");
  } else if (mostCommonMood === "focused" || mostCommonMood === "strong") {
    insights.push("✅ Recent mood patterns show strong focus and confidence.");
  } else if (skippedPlanCount > 0) {
    insights.push("📋 Some plan adherence gaps detected. Review your pre-trade checklist.");
  } else {
    insights.push("📊 Behaviour patterns are being tracked from your journal entries.");
  }

  insights.push("Agentyc uses these insights to inform trading decisions and risk management.");

  return insights.join(" ");
}

export function AIReflectionCard({ entries }: AIReflectionCardProps) {
  const insight = generateInsights(entries);

  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="AGENTYC" status={insight ? "OK" : "OFF"} />
      
      <div className="pr-20 mb-2">
        <h3 className="text-[16px] font-bold text-white">Agentyc Reflection</h3>
      </div>
      <p className="text-xs text-white/50 mb-4">
        Behaviour patterns from your last entries.
      </p>
      
      {insight ? (
        <div className="space-y-2">
          {insight.split(". ").filter(Boolean).map((point, idx) => (
            <p key={idx} className="text-sm text-white/80 leading-relaxed">
              {point.trim()}.
            </p>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-white/50">
            Agentyc will summarise your recent journal entries once you start journaling.
          </p>
          <span className="inline-block text-xs px-2 py-1 rounded-full bg-white/5 text-white/60">
            No entries yet
          </span>
        </div>
      )}
    </div>
  );
}

