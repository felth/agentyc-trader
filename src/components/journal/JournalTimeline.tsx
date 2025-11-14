import React from "react";
import { SectionHeader } from "../ui/SectionHeader";

type TimelineItem = {
  time: string;
  summary: string;
};

type JournalTimelineProps = {
  items: TimelineItem[];
};

export function JournalTimeline({ items }: JournalTimelineProps) {
  return (
    <section className="space-y-2">
      <SectionHeader title="Timeline" />
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div
            key={`${item.time}-${index}`}
            className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 flex items-start justify-between gap-3"
          >
            <span className="text-xs text-slate-400">{item.time}</span>
            <p className="text-sm text-slate-200 flex-1 text-right">{item.summary}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

