import React from "react";
import { SectionHeader } from "../ui/SectionHeader";
import { ProfileQuickLink } from "./ProfileQuickLink";

const CONNECTION_LINKS = [
  {
    label: "Supabase",
    description: "Last sync 5 min ago"
  },
  {
    label: "Pinecone",
    description: "Vectors: 124"
  },
  {
    label: "OpenAI",
    description: "gpt-5-turbo · vision enabled"
  }
];

export function ConnectionsSection() {
  return (
    <section className="rounded-3xl bg-white/5 border border-white/5 px-4 py-3 space-y-2">
      <SectionHeader title="Connections" />
      {CONNECTION_LINKS.map((link) => (
        <ProfileQuickLink key={link.label} {...link} />
      ))}
    </section>
  );
}

