import React from "react";
import { SectionHeader } from "../ui/SectionHeader";
import { ProfileQuickLink } from "./ProfileQuickLink";

const RISK_LINKS = [
  {
    label: "Risk Template",
    description: "Dynamic 0.5% – 1% per trade"
  },
  {
    label: "Daily Loss Limit",
    description: "Stop after -2.5R"
  },
  {
    label: "Position Sizing",
    description: "Auto-calc with ATR"
  }
];

export function RiskProfileSection() {
  return (
    <section className="rounded-3xl bg-white/5 border border-white/5 px-4 py-3 space-y-2">
      <SectionHeader title="Risk Profile" />
      {RISK_LINKS.map((link) => (
        <ProfileQuickLink key={link.label} {...link} />
      ))}
    </section>
  );
}

