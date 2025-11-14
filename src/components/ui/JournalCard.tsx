import React from "react";

type JournalCardProps = {
  concept: string;
  notes: string;
  tags?: string[];
  timestamp?: string;
};

export function JournalCard({ concept, notes, tags = [], timestamp }: JournalCardProps) {
  return (
    <div className="rounded-3xl bg-white/5 border border-white/5 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{concept}</h3>
        {timestamp && <span className="text-xs text-slate-400">{timestamp}</span>}
      </div>
      <p className="text-sm text-slate-300 whitespace-pre-wrap">{notes}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

