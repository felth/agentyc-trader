"use client";

import React, { useState } from "react";
import { TabPage } from "../../../components/layout/TabPage";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { JournalCard } from "../../../components/ui/JournalCard";
import { FilterPills } from "../../../components/ui/FilterPills";
import { InsightCard } from "../../../components/ui/InsightCard";
import { TagTile } from "../../../components/ui/TagTile";

const entries = [
  {
    concept: "Breakout timing — ES 5m",
    notes:
      "Entry felt late. Need confirmation from volume + 1m break. Wait for retest of the level. Good management overall.",
    tags: ["breakout", "volume", "execution"],
    timestamp: "Today · 09:42"
  },
  {
    concept: "NQ fade attempt",
    notes: "Should avoid counter-trend fades during NY open. Stick to momentum setups.",
    tags: ["avoid", "trend"],
    timestamp: "Yesterday · 14:10"
  }
];

const tags = ["Momentum", "Risk", "Execution", "Psychology"];

export default function JournalTab() {
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <TabPage>
      <section className="space-y-4">
        <SectionHeader title="Journal" />
        <FilterPills options={["All", "Today", "Week", "Tagged"]} active={activeFilter} onChange={setActiveFilter} />
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TagTile key={tag} label={tag} />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader title="Latest Entries" actionText="See all" />
        <div className="space-y-3">
          {entries.map((entry) => (
            <JournalCard key={entry.concept} {...entry} />
          ))}
        </div>
      </section>

      <InsightCard
        title="AI Insight"
        insight="Your best trades this week aligned with the 15m trend and used partial profit-taking at 1.5R. Consider making this part of your playbook."
      />
    </TabPage>
  );
}

