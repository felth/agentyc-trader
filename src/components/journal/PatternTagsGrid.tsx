import React from "react";
import { SectionHeader } from "../ui/SectionHeader";
import { TagTile } from "../ui/TagTile";

type Pattern = {
  label: string;
  value: string;
  status?: "default" | "positive" | "warning" | "negative";
};

type PatternTagsGridProps = {
  patterns: Pattern[];
  title?: string;
};

export function PatternTagsGrid({ patterns, title = "Patterns & Tags" }: PatternTagsGridProps) {
  return (
    <section className="space-y-2">
      <SectionHeader title={title} />
      <div className="grid grid-cols-2 gap-3 mt-3">
        {patterns.map((pattern) => (
          <TagTile key={pattern.label} {...pattern} />
        ))}
      </div>
    </section>
  );
}

