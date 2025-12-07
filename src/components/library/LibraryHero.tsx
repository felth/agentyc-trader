"use client";

import React from "react";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

type LibraryHeroProps = {
  corpusCount: number;
  playbookCount: number;
  hybridCount: number;
  memoryStatus: "LIVE" | "DEGRADED" | "ERROR";
  onAddDocument: () => void;
};

export default function LibraryHero({
  corpusCount,
  playbookCount,
  hybridCount,
  memoryStatus,
  onAddDocument,
}: LibraryHeroProps) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-10 lg:pb-12">
      <div className="relative min-h-[50vh] md:min-h-[60vh] rounded-[2rem] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-journal.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="relative h-full flex flex-col px-6 py-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white/90 tracking-tight">AGENTYC</span>
            </div>
            <div className="absolute top-4 right-4">
              <SourceStatusBadge provider="MEMORY" status={memoryStatus} />
            </div>
          </div>

          {/* Content */}
          <div className="mt-auto space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent mb-2">Library</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">Your Knowledge Library</h1>
              <p className="text-sm text-white/70">View everything Agency has learned from your uploads</p>
            </div>

            {/* Memory counts */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">Corpus:</span>
                <span className="text-sm font-bold text-white">{corpusCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">Playbook:</span>
                <span className="text-sm font-bold text-white">{playbookCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">Hybrid:</span>
                <span className="text-sm font-bold text-white">{hybridCount}</span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={onAddDocument}
              className="px-6 py-3 rounded-xl bg-ultra-accent hover:bg-ultra-accentHover text-black text-sm font-bold transition-colors"
            >
              Add Document
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

