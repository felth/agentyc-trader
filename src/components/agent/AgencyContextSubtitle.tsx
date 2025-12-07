"use client";

import React from "react";

type AgencyContextSubtitleProps = {
  journalEntryCount?: number;
  playbookDocCount?: number;
  corpusDocCount?: number;
};

export default function AgencyContextSubtitle({
  journalEntryCount = 0,
  playbookDocCount = 0,
  corpusDocCount = 0,
}: AgencyContextSubtitleProps) {
  const parts: string[] = [
    "Account",
    "Positions",
    "Today's risk",
    journalEntryCount > 0 ? `Latest journal metrics (${journalEntryCount})` : "Latest journal metrics",
    playbookDocCount > 0 ? `Playbook rules (${playbookDocCount})` : "Playbook rules",
  ];

  return (
    <p className="text-sm text-white/60">
      Context loaded: {parts.join(" • ")}.
    </p>
  );
}

