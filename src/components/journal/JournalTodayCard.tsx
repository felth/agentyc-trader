import React from "react";
import { SectionHeader } from "../ui/SectionHeader";

type JournalTodayCardProps = {
  preview: string;
  moods: Array<{ label: string; emoji: string }>;
};

export function JournalTodayCard({ preview, moods }: JournalTodayCardProps) {
  return (
    <section>
      <div className="rounded-3xl bg-white/5 border border-white/5 px-4 py-3 space-y-3">
        <SectionHeader title="Today’s Journal" />
        <div className="flex gap-2">
          {moods.map((mood) => (
            <span
              key={mood.label}
              className="px-3 py-1 rounded-full bg-white/10 text-xs text-slate-200 flex items-center gap-2"
            >
              <span className="text-base">{mood.emoji}</span>
              {mood.label}
            </span>
          ))}
        </div>
        <div className="rounded-2xl bg-black/40 border border-white/5 px-3 py-2 text-xs text-slate-300 line-clamp-3">
          {preview}
        </div>
      </div>
    </section>
  );
}

