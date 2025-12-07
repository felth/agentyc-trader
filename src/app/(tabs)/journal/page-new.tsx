"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TabPage } from "../../../components/layout/TabPage";
import TodaysReflectionCard from "@/components/journal/TodaysReflectionCard";
import { AIReflectionCard } from "@/components/journal/AIReflectionCard";
import JournalMetricsGrid from "@/components/journal/JournalMetricsGrid";
import RecentEntriesList from "@/components/journal/RecentEntriesList";
import UpgradePlaybookPanel from "@/components/journal/UpgradePlaybookPanel";
import type { JournalEntry, Mood } from "@/lib/types/journal";
import { MemoryIndex, IngestMode } from "@/lib/constants/memory";

export default function JournalTab() {
  const pathname = usePathname();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    try {
      const res = await fetch("/api/journal/entries");
      const data = await res.json();
      if (data.ok) {
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error("Failed to fetch journal entries:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveReflection(data: {
    mood: Mood;
    text: string;
    tags?: string[];
    symbol?: string;
    sendToPlaybook: boolean;
  }) {
    // Save journal entry
    const entryRes = await fetch("/api/journal/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mood: data.mood,
        text: data.text,
        tags: data.tags,
        symbol: data.symbol,
      }),
    });

    if (!entryRes.ok) {
      throw new Error("Failed to save journal entry");
    }

    // If sendToPlaybook is checked, also ingest to memory
    if (data.sendToPlaybook) {
      await fetch("/api/memory/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "journal",
          index: MemoryIndex.PLAYBOOK,
          mode: IngestMode.RULES_ONLY,
          text: data.text, // TODO: Pass through LLM summarizer when available
        }),
      });
    }

    // Refresh entries
    await fetchEntries();
  }

  async function handleIngest(data: {
    text: string;
    index: MemoryIndex;
    mode: IngestMode;
  }) {
    const res = await fetch("/api/memory/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "journal",
        ...data,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to ingest");
    }
  }

  return (
    <TabPage>
      {/* Header */}
      <div className="relative h-48 rounded-[2rem] overflow-hidden group mb-5">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-journal.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
        <div className="relative h-full flex flex-col justify-between px-6 py-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white/90 tracking-tight">{time}</span>
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95">
                <span className="text-base">🔍</span>
              </button>
              <Link
                href="/profile"
                className={`w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center hover:bg-white/10 transition-all ${
                  pathname === "/profile"
                    ? "bg-ultra-accent/20 border-ultra-accent/50"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <span className="text-base">⚙️</span>
              </Link>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Journal</p>
            <h1 className="text-2xl font-bold tracking-tight text-white">Your Reflections</h1>
            <p className="text-sm text-white/70">Track your trading journey</p>
          </div>
        </div>
      </div>

      {/* Section 1: Today's Reflection */}
      <section className="mb-6">
        <TodaysReflectionCard onSave={handleSaveReflection} loading={loading} />
      </section>

      {/* Section 2 & 3: Agency Reflection + Patterns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <AIReflectionCard entries={entries} />
        <JournalMetricsGrid entries={entries} />
      </div>

      {/* Section 4: Recent Entries */}
      <section className="mb-6">
        <RecentEntriesList entries={entries} />
      </section>

      {/* Section 5: Upgrade your Playbook */}
      <section className="mb-6">
        <UpgradePlaybookPanel onIngest={handleIngest} />
      </section>
    </TabPage>
  );
}

