"use client";

import React from "react";
import { TabPage } from "../../../components/layout/TabPage";

const vitals = [
  { label: "Total Trades", value: "5 today", color: "text-white" },
  { label: "Win Rate", value: "60%", color: "text-ultra-positive" },
  { label: "Net R", value: "+1.4R", color: "text-ultra-positive" },
];

export default function PerformanceTab() {
  return (
    <TabPage>
      {/* Header */}
      <div className="relative h-48 rounded-[2rem] overflow-hidden group mb-5">
        {/* Background Image - Add your photo here */}
        {/* <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/hero-performance.jpeg')"
          }}
        /> */}
        
        {/* Gradient fallback */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#F56300]/25 via-[#F56300]/5 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,99,0,0.15),_transparent_70%)]" />
        
        {/* Dark Overlay - Uncomment when adding photo */}
        {/* <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" /> */}
        <div className="relative h-full flex flex-col justify-between px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Performance</p>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Your Stats</h1>
            <p className="text-sm text-white/70">Track your trading progress</p>
          </div>
        </div>
      </div>

      {/* Performance Insight */}
      <section className="mb-5">
        <div className="rounded-2xl bg-gradient-to-br from-[#F56300]/15 via-[#F56300]/5 to-cyan-500/5 backdrop-blur-2xl border border-white/10 px-5 py-5 shadow-[0_8px_32px_rgba(245,99,0,0.15)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">💡</span>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-white mb-2">Performance Insight</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                Momentum setups performed 25% better when aligned with the 4H trend. Reduce size on mean-reversion trades during the afternoon session.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Performance */}
      <section className="space-y-3 mb-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Today's Performance</h2>
        </div>
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Progress</span>
              <span className="text-xs font-bold text-ultra-accent">60%</span>
            </div>
            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-ultra-accent to-ultra-accent/80 shadow-[0_0_12px_rgba(245,99,0,0.5)]"
                style={{ width: "60%" }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-white/5">
            {vitals.map((vital) => (
              <div key={vital.label} className="text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-1.5">{vital.label}</p>
                <p className={`text-lg font-bold tracking-tight ${vital.color}`}>{vital.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly Charts */}
      <section className="space-y-3 mb-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Your Weekly Charts</h2>
          <button className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">View all</button>
        </div>
        <div className="space-y-3">
          {["Equity Curve", "Daily R", "Risk Per Day"].map((label) => (
            <div
              key={label}
              className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-6 hover:bg-white/[0.06] hover:border-white/15 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] active:scale-[0.99]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white tracking-tight">{label}</h3>
                <button className="text-xs text-ultra-accent font-medium hover:text-ultra-accentHover">View</button>
              </div>
              <div className="h-32 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center">
                <p className="text-xs text-slate-500 font-medium">Chart visualization</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </TabPage>
  );
}