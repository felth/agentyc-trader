import React from "react";
import { SectionHeader } from "../ui/SectionHeader";
import { ProfileQuickLink } from "./ProfileQuickLink";

const DISPLAY_LINKS = [
  {
    label: "Theme",
    description: "Apple Watch Ultra"
  },
  {
    label: "Chart presets",
    description: "Heikin, 5m · 15m"
  },
  {
    label: "Sound & haptics",
    description: "Subtle taps"
  }
];

export function DisplayPrefsSection() {
  return (
    <section className="rounded-3xl bg-white/5 border border-white/5 px-4 py-3 space-y-2">
      <SectionHeader title="Display & Preferences" />
      {DISPLAY_LINKS.map((link) => (
        <ProfileQuickLink key={link.label} {...link} />
      ))}
    </section>
  );
}

