import React from "react";

type InsightCardProps = {
  title: string;
  insight: string;
};

export function InsightCard({ title, insight }: InsightCardProps) {
  return (
    <section>
      <div className="rounded-3xl px-4 py-3 bg-gradient-to-br from-[#F56300]/35 via-purple-600/20 to-black border border-white/10 backdrop-blur-xl">
        <p className="text-xs text-slate-200 mb-1">{title}</p>
        <p className="text-sm leading-snug">{insight}</p>
      </div>
    </section>
  );
}

