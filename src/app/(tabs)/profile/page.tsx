"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { TabPage } from "../../../components/layout/TabPage";
import { MEMORY_CORPUS_INDEX, MEMORY_PLAYBOOK_INDEX, MEMORY_JOURNAL_INDEX } from "@/lib/constants/memory";
import IbkrConnectBanner from "@/components/IbkrConnectBanner";

function ProfileContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "settings";
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <TabPage>
      {/* Header */}
      <div className="relative h-48 rounded-[2rem] overflow-hidden group mb-5">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/hero-settings.jpeg')"
          }}
        />
        
        {/* Dark Overlay - Multiple layers for depth */}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
        
        {/* Subtle accent gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,99,0,0.1),_transparent_70%)]" />
        <div className="relative h-full flex flex-col justify-between px-6 py-5">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white/90 tracking-tight">{time}</span>
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95">
                <span className="text-base">🔍</span>
              </button>
              <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 relative">
                <span className="text-base">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-ultra-accent rounded-full border border-black" />
              </button>
              <Link
                href="/profile"
                className={[
                  "w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center hover:bg-white/10 transition-all active:scale-95",
                  pathname === "/profile"
                    ? "bg-ultra-accent/20 border-ultra-accent/50"
                    : "bg-white/5 border-white/10"
                ].join(" ")}
                aria-label="Settings"
              >
                <span className="text-base">⚙️</span>
              </Link>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Profile</p>
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
                <p className="text-xs text-slate-400">
              Maximum risk per day. This is the limit used for Today's Account & Risk and Agency's risk hints.
            </p>
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
        
        {/* IBKR Connection Banner - Always visible */}
        <div className="mb-4">
          <IbkrConnectBanner />
        </div>
        
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white mb-0.5">Market Data (FMP)</p>
              <p className="text-xs text-slate-400 font-medium">Live</p>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40">
              ACTIVE
            </span>
          </div>
        </div>
      </section>

      {/* Memory */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Memory</h2>
        </div>
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-3">
          <div>
            <p className="text-xs text-slate-400 mb-1">Corpus index:</p>
            <p className="text-sm font-bold text-white">{MEMORY_CORPUS_INDEX}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Playbook index:</p>
            <p className="text-sm font-bold text-white">{MEMORY_PLAYBOOK_INDEX}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Journal index:</p>
            <p className="text-sm font-bold text-white">{MEMORY_JOURNAL_INDEX}</p>
          </div>
          <p className="text-xs text-slate-400 pt-3 border-t border-white/5">
            Library shows all uploads. Corpus holds long-term knowledge; Playbook holds distilled rules and checklists.
          </p>
        </div>
      </section>

      {/* Display Preferences - Only show on settings tab */}
      {tab === "settings" && (
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
      )}

      {/* Diagnostics Tab */}
      {tab === "diagnostics" && (
        <section className="mb-5">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">System Diagnostics</h2>
          </div>
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-4">
            <div>
              <p className="text-sm font-bold text-white mb-2">System Health</p>
              <p className="text-xs text-white/50 mb-4">
                Diagnostic information for Broker Gateway, Bridge, and DashboardSnapshot status.
              </p>
            </div>
            <div className="space-y-3 pt-3 border-t border-white/5">
              <div>
                <p className="text-xs text-slate-400 mb-1">Broker Bridge</p>
                <p className="text-sm text-white/50">Check bridge health endpoint</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Gateway Auth Status</p>
                <p className="text-sm text-white/50">Broker Gateway authentication state</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Last DashboardSnapshot</p>
                <p className="text-sm text-white/50">Timestamp of last successful snapshot build</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </TabPage>
  );
}

export default function ProfileTab() {
  return (
    <Suspense
      fallback={
        <TabPage>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-sm text-white/50">Loading settings...</p>
            </div>
          </div>
        </TabPage>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}