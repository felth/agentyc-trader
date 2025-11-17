"use client";

import React from "react";
import { TabPage } from "../../../components/layout/TabPage";

const moods = [
  { emoji: "⚡️", label: "Focused" },
  { emoji: "🙂", label: "Balanced" },
  { emoji: "😐", label: "Neutral" },
];

const journalEntries = [
  {
    concept: "Breakout timing — ES 5m",
    notes: "Entry felt late. Need confirmation from volume + 1m break. Wait for retest of the level. Good management overall.",
    tags: ["breakout", "volume", "execution"],
    timestamp: "Today · 09:42",
  },
  {
    concept: "NQ fade attempt",
    notes: "Should avoid counter-trend fades during NY open. Stick to momentum setups and skip lower conviction plays.",
    tags: ["discipline", "trend"],
    timestamp: "Yesterday · 14:10",
  },
];

const patterns = [
  { label: "Revenge trades", value: "2 this week", status: "warning" as const },
  { label: "Skipped plan", value: "1 instance", status: "negative" as const },
  { label: "Morning prep", value: "Completed 5/5", status: "positive" as const },
  { label: "Screenshots logged", value: "8 added", status: "positive" as const },
];

const timeline = [
  { time: "08:15", summary: "Pre-market ritual complete · mindset notes logged" },
  { time: "09:42", summary: "Journaled ES breakout trade — partial at 1.5R" },
  { time: "12:10", summary: "Noted early exit on NQ fade · add to playbook avoid list" },
  { time: "15:45", summary: "Daily review drafted · sent to accountability group" },
];

export default function JournalTab() {
  return (
    <TabPage>
      {/* Header */}
      <div className="relative h-36 rounded-[2rem] overflow-hidden group mb-5">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F56300]/25 via-[#F56300]/5 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,99,0,0.15),_transparent_70%)]" />
        <div className="relative h-full flex flex-col justify-between px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Journal</p>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Your Reflections</h1>
            <p className="text-sm text-white/70">Track your trading journey</p>
          </div>
        </div>
      </div>

      {/* Today's Journal Card */}
      <section className="mb-5">
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-ultra-accent/20 border border-ultra-accent/30 flex items-center justify-center">
              <span className="text-lg">📓</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Today's Journal</h2>
              <p className="text-xs text-slate-400 mt-0.5">How are you feeling?</p>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            {moods.map((mood) => (
              <button
                key={mood.label}
                className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2.5 hover:bg-black/60 hover:border-white/15 transition-all active:scale-95"
              >
                <div className="text-center">
                  <span className="text-2xl block mb-1">{mood.emoji}</span>
                  <p className="text-[10px] text-slate-400 font-medium">{mood.label}</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            Good focus today—stuck to the A setups for the most part. Need to reinforce the rule of waiting for volume confirmation before hitting the breakout. Afternoon energy dipped; consider shorter sessions on Fridays.
          </p>
        </div>
      </section>

      {/* AI Reflection */}
      <section className="mb-5">
        <div className="rounded-2xl bg-gradient-to-br from-[#F56300]/15 via-[#F56300]/5 to-cyan-500/5 backdrop-blur-2xl border border-white/10 px-5 py-5 shadow-[0_8px_32px_rgba(245,99,0,0.15)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🤖</span>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-white mb-2">AI Reflection</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                AI suggests reinforcing your pre-trade checklist. Trades aligned with the higher timeframe and taken during the first 90 minutes performed best. Consider pausing when feeling restless to avoid revenge entries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Patterns & Tags */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Patterns & Tags</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {patterns.map((pattern) => (
            <div
              key={pattern.label}
              className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-4 py-3 hover:bg-white/[0.06] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            >
              <p className="text-xs text-slate-400 font-medium mb-1.5">{pattern.label}</p>
              <p className="text-sm font-bold text-white tracking-tight mb-1">{pattern.value}</p>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block ${
                  pattern.status === "positive"
                    ? "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40"
                    : pattern.status === "warning"
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                    : "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/40"
                }`}
              >
                {pattern.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Entries */}
      <section className="space-y-3 mb-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Recent Entries</h2>
          <button className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors font-medium">See all</button>
        </div>
        <div className="space-y-3">
          {journalEntries.map((entry, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 hover:bg-white/[0.06] hover:border-white/15 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-base font-bold text-white tracking-tight flex-1">{entry.concept}</h3>
                <span className="text-[10px] text-slate-500 font-medium">{entry.timestamp}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed font-medium mb-3">{entry.notes}</p>
              <div className="flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Today's Timeline</h2>
        </div>
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="space-y-4">
            {timeline.map((item, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-ultra-accent border-2 border-black" />
                  {idx < timeline.length - 1 && <div className="w-0.5 h-full bg-white/5 mt-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-xs font-bold text-ultra-accent mb-1">{item.time}</p>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">{item.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </TabPage>
  );
}