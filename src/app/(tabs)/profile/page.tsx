"use client";

import React from "react";
import { TabPage } from "../../../components/layout/TabPage";

export default function ProfileTab() {
  return (
    <TabPage>
      {/* Header */}
      <div className="relative h-36 rounded-[2rem] overflow-hidden group mb-5">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F56300]/25 via-[#F56300]/5 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,99,0,0.15),_transparent_70%)]" />
        <div className="relative h-full flex flex-col justify-between px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Profile</p>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
            <p className="text-sm text-white/70">Manage your account</p>
          </div>
        </div>
      </div>

      {/* User Card */}
      <section className="mb-5">
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ultra-accent/30 to-ultra-accent/10 border border-ultra-accent/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-ultra-accent">LF</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white tracking-tight mb-0.5">Liam</h2>
              <p className="text-sm text-slate-400 font-medium">Account currency: USD</p>
            </div>
            <button className="text-xs text-ultra-accent font-bold hover:text-ultra-accentHover transition-colors">Edit</button>
          </div>
        </div>
      </section>

      {/* Risk Profile */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Risk Profile</h2>
        </div>
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white mb-0.5">Daily Risk Limit</p>
                <p className="text-xs text-slate-400">Maximum risk per day</p>
              </div>
              <span className="text-base font-bold text-ultra-accent">1.0%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-ultra-accent" style={{ width: "65%" }} />
            </div>
            <div className="pt-3 border-t border-white/5">
              <button className="text-xs text-ultra-accent font-bold hover:text-ultra-accentHover transition-colors">Adjust limits</button>
            </div>
          </div>
        </div>
      </section>

      {/* Alerts & Notifications */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Alerts & Notifications</h2>
        </div>
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {[
            { label: "Push alerts", description: "Enabled · 4 categories", action: "Edit" },
            { label: "Email summaries", description: "Daily wrap at 18:00", action: "Change" },
            { label: "Session reminders", description: "Pre-market prep at 08:15", action: "Adjust" },
          ].map((item, idx) => (
            <div key={idx} className={idx < 2 ? "pb-4 border-b border-white/5" : ""}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white mb-0.5">{item.label}</p>
                  <p className="text-xs text-slate-400 font-medium">{item.description}</p>
                </div>
                <button className="text-xs text-ultra-accent font-bold hover:text-ultra-accentHover transition-colors">
                  {item.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Connections */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Connections</h2>
        </div>
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-white mb-0.5">TradingView</p>
              <p className="text-xs text-slate-400 font-medium">Connected</p>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40">
              ACTIVE
            </span>
          </div>
          <button className="text-xs text-ultra-accent font-bold hover:text-ultra-accentHover transition-colors">Manage connections</button>
        </div>
      </section>

      {/* Display Preferences */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Display Preferences</h2>
        </div>
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {[
            { label: "Theme", value: "Dark", action: "Change" },
            { label: "Currency", value: "USD", action: "Edit" },
            { label: "Time Zone", value: "GMT+0", action: "Adjust" },
          ].map((item, idx) => (
            <div key={idx} className={idx < 2 ? "pb-4 border-b border-white/5" : ""}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white mb-0.5">{item.label}</p>
                  <p className="text-xs text-slate-400 font-medium">{item.value}</p>
                </div>
                <button className="text-xs text-ultra-accent font-bold hover:text-ultra-accentHover transition-colors">
                  {item.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </TabPage>
  );
}