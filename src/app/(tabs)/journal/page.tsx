"use client";

import React from "react";
import { TabPage } from "../../../components/layout/TabPage";
import { JournalTodayCard } from "../../../components/journal/JournalTodayCard";
import { AIReflectionCard } from "../../../components/journal/AIReflectionCard";
import { PatternTagsGrid } from "../../../components/journal/PatternTagsGrid";
import { JournalTimeline } from "../../../components/journal/JournalTimeline";
import { JournalCard } from "../../../components/ui/JournalCard";
import { SectionHeader } from "../../../components/ui/SectionHeader";

const moods = [
  { emoji: "⚡️", label: "Focused" },
  { emoji: "🙂", label: "Balanced" },
  { emoji: "😐", label: "Neutral" }
];

const journalEntries = [
  {
    concept: "Breakout timing — ES 5m",
    notes:
      "Entry felt late. Need confirmation from volume + 1m break. Wait for retest of the level. Good management overall.",
    tags: ["breakout", "volume", "execution"],
    timestamp: "Today · 09:42"
  },
  {
    concept: "NQ fade attempt",
    notes:
      "Should avoid counter-trend fades during NY open. Stick to momentum setups and skip lower conviction plays.",
    tags: ["discipline", "trend"],
    timestamp: "Yesterday · 14:10"
  }
];

const patterns = [
  { label: "Revenge trades", value: "2 this week", status: "warning" as const },
  { label: "Skipped plan", value: "1 instance", status: "negative" as const },
  { label: "Morning prep", value: "Completed 5/5", status: "positive" as const },
  { label: "Screenshots logged", value: "8 added", status: "positive" as const }
];

const timeline = [
  { time: "08:15", summary: "Pre-market ritual complete · mindset notes logged" },
  { time: "09:42", summary: "Journaled ES breakout trade — partial at 1.5R" },
  { time: "12:10", summary: "Noted early exit on NQ fade · add to playbook avoid list" },
  { time: "15:45", summary: "Daily review drafted · sent to accountability group" }
];

export default function JournalTab() {
  return (
    <TabPage>
      <div className="mb-6">
        <JournalTodayCard
          moods={moods}
          preview="Good focus today—stuck to the A setups for the most part. Need to reinforce the rule of waiting for volume confirmation before hitting the breakout. Afternoon energy dipped; consider shorter sessions on Fridays."
        />
      </div>

      <div className="mb-6">
        <AIReflectionCard insight="AI suggests reinforcing your pre-trade checklist. Trades aligned with the higher timeframe and taken during the first 90 minutes performed best. Consider pausing when feeling restless to avoid revenge entries." />
      </div>

      <div className="mb-6">
        <PatternTagsGrid patterns={patterns} title="Patterns & Tags" />
      </div>

      <section className="space-y-2 mb-6">
        <SectionHeader title="Recent Entries" actionText="See all" />
        <div className="space-y-3">
          {journalEntries.map((entry) => (
            <JournalCard key={entry.concept} {...entry} />
          ))}
        </div>
      </section>

      <div>
        <JournalTimeline items={timeline} />
      </div>
    </TabPage>
  );
}

