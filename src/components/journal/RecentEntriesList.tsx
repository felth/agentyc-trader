"use client";

import React, { useState } from "react";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import type { JournalEntry } from "@/lib/types/journal";

const moods = [
  { emoji: "⚡️", label: "Focused", value: "focused" },
  { emoji: "🙂", label: "Balanced", value: "balanced" },
  { emoji: "😐", label: "Neutral", value: "neutral" },
  { emoji: "😔", label: "Challenged", value: "challenged" },
  { emoji: "🔥", label: "Strong", value: "strong" },
];

type RecentEntriesListProps = {
  entries: JournalEntry[];
};

type FilterType = "All" | "Pre-trade" | "Post-trade" | "Review";

export default function RecentEntriesList({ entries }: RecentEntriesListProps) {
  const [filter, setFilter] = useState<FilterType>("All");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  const filteredEntries = entries.filter(entry => {
    if (filter === "All") return true;
    return entry.tags?.includes(filter.toLowerCase().replace("-", "_")) || false;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) {
      const sameDay = date.toDateString() === now.toDateString();
      return sameDay
        ? `Today · ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`
        : `Yesterday · ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
    }
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getMoodEmoji = (mood: string) => {
    return moods.find(m => m.value === mood)?.emoji || "😐";
  };

  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="JOURNAL" status="OK" />
      
      <h3 className="text-[16px] font-bold text-white mb-4">Recent Entries</h3>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["All", "Pre-trade", "Post-trade", "Review"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? "bg-ultra-accent text-black"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Entries list */}
      {filteredEntries.length === 0 ? (
        <p className="text-sm text-white/50 text-center py-8">
          {filter === "All" ? "No journal entries yet." : `No entries tagged "${filter}".`}
        </p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setSelectedEntry(entry)}
              className="rounded-xl bg-white/5 border border-white/10 p-3 cursor-pointer hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{getMoodEmoji(entry.mood)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">{formatDate(entry.createdAt)}</span>
                    {entry.symbol && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/70">
                        {entry.symbol}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/80 line-clamp-2">
                    {entry.text.length > 100 ? `${entry.text.slice(0, 100)}...` : entry.text}
                  </p>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal/Drawer for full entry */}
      {selectedEntry && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="rounded-2xl bg-[#111111] border border-white/20 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getMoodEmoji(selectedEntry.mood)}</span>
                <div>
                  <p className="text-sm font-bold text-white">{formatDate(selectedEntry.createdAt)}</p>
                  {selectedEntry.symbol && (
                    <p className="text-xs text-white/50">{selectedEntry.symbol}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap mb-4">
              {selectedEntry.text}
            </p>
            {selectedEntry.tags && selectedEntry.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedEntry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

