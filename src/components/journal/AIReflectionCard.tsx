import React from "react";
import { SectionHeader } from "../ui/SectionHeader";

type AIReflectionCardProps = {
  insight: string;
};

export function AIReflectionCard({ insight }: AIReflectionCardProps) {
  return (
    <section>
      <div className="rounded-3xl bg-white/5 border border-white/5 px-4 py-3 space-y-3">
        <SectionHeader title="AI Reflection" />
        <p className="text-sm leading-snug text-slate-200">{insight}</p>
      </div>
    </section>
  );
}

